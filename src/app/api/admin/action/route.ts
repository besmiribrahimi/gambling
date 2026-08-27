import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSession } from "../../../../lib/auth";
import { findUserById, updateUser, DBUser } from "../../../../lib/db";

async function isAdminAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("cw_admin_session");
  if (!adminCookie) return false;

  const payload = decryptSession(adminCookie.value);
  return payload === "clashwager_admin_authorized";
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthorized())) {
      return NextResponse.json({ error: "Unauthorized admin access." }, { status: 401 });
    }

    const body = await request.json();
    const { action, userId, ...payload } = body;

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

    if (action === "toggle-ban") {
      const { isBanned } = payload;
      if (typeof isBanned !== "boolean") {
        return NextResponse.json({ error: "Invalid ban state." }, { status: 400 });
      }

      await updateUser(userId, { isBanned });
      return NextResponse.json({ success: true, isBanned });
    }

    if (action === "set-role") {
      const { role } = payload;
      if (role !== "admin" && role !== "user") {
        return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
      }

      await updateUser(userId, { role });
      return NextResponse.json({ success: true, role });
    }

    if (action === "add-wager") {
      const { type, description, amount, result, payout } = payload;
      
      if (
        typeof type !== "string" ||
        typeof description !== "string" ||
        typeof amount !== "number" ||
        typeof result !== "string" ||
        typeof payout !== "number"
      ) {
        return NextResponse.json({ error: "Invalid wager payload fields." }, { status: 400 });
      }

      const newWager: DBUser["history"][0] = {
        id: "tx_" + Math.random().toString(36).substring(2, 11),
        type: type as DBUser["history"][0]["type"],
        description,
        amount,
        result: result as "win" | "lose" | "pending",
        payout,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString()
      };

      const updatedHistory = [newWager, ...(user.history || [])];
      await updateUser(userId, { history: updatedHistory });

      return NextResponse.json({ success: true, newWager });
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
