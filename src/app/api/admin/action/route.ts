import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSession } from "../../../../lib/auth";
import { findUserById, updateUser, getAllUsers, DBUser, getDatabase } from "../../../../lib/db";

async function isAdminAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("cw_admin_session");
  if (adminCookie) {
    const payload = decryptSession(adminCookie.value);
    if (payload === "clashwager_admin_authorized") return true;
  }

  const userCookie = cookieStore.get("cw_session");
  if (userCookie) {
    const userId = decryptSession(userCookie.value);
    if (userId) {
      const user = await findUserById(userId);
      if (user && user.role === "admin" && !user.isBanned) return true;
    }
  }

  return false;
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthorized())) {
      return NextResponse.json({ error: "Unauthorized admin access." }, { status: 401 });
    }

    const body = await request.json();
    const { action, userId, ...payload } = body;

    // Airdrop to all users (does not require a single userId)
    if (action === "airdrop-all") {
      const { amount } = payload;
      if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid airdrop amount." }, { status: 400 });
      }

      const allUsers = await getAllUsers();
      let updatedCount = 0;
      for (const u of allUsers) {
        if (!u.isBanned) {
          const newBal = (u.balance || 0) + amount;
          await updateUser(u.id, { balance: newBal });
          updatedCount++;
        }
      }
      return NextResponse.json({ success: true, updatedCount, amount });
    }

    // Anti-injection: ensure action and userId are strings
    if (typeof action !== "string" || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Invalid action request parameters." },
        { status: 400 }
      );
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    if (action === "adjust-balance") {
      const { amount } = payload;
      if (typeof amount !== "number" || isNaN(amount)) {
        return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
      }

      await updateUser(userId, { balance: amount });
      return NextResponse.json({ success: true, newBalance: amount });
    }

    if (action === "quick-add") {
      const { amount } = payload;
      if (typeof amount !== "number" || isNaN(amount)) {
        return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
      }

      const newBal = Math.max(0, (user.balance || 0) + amount);
      await updateUser(userId, { balance: newBal });
      return NextResponse.json({ success: true, newBalance: newBal });
    }

    if (action === "toggle-ban") {
      const { isBanned } = payload;
      if (typeof isBanned !== "boolean") {
        return NextResponse.json({ error: "Invalid ban state." }, { status: 400 });
      }

      await updateUser(userId, { isBanned });
      return NextResponse.json({ success: true, isBanned });
    }

    if (action === "toggle-verification") {
      const { isVerified } = payload;
      if (typeof isVerified !== "boolean") {
        return NextResponse.json({ error: "Invalid verification state." }, { status: 400 });
      }

      await updateUser(userId, { isVerified });
      return NextResponse.json({ success: true, isVerified });
    }

    if (action === "set-role") {
      const { role } = payload;
      if (role !== "admin" && role !== "user") {
        return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
      }

      await updateUser(userId, { role });
      return NextResponse.json({ success: true, role });
    }

    if (action === "get-user-details") {
      const { passwordHash, ...safeDetails } = user;
      return NextResponse.json({ success: true, user: safeDetails });
    }

    if (action === "delete-user") {
      try {
        const db = await getDatabase();
        if (db) {
          await db.collection("users").deleteOne({ id: userId });
        }
      } catch (e) {}
      return NextResponse.json({ success: true, deletedId: userId });
    }

    return NextResponse.json({ error: "Action not recognized." }, { status: 400 });
  } catch (error) {
    console.error("Admin Action Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
