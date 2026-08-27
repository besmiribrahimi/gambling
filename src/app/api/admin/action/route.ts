import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSession } from "../../../../lib/auth";
import {
  findUserById,
  updateUser,
  getAllUsers,
  getDatabase,
  getAuditLogs,
  addAuditLog,
  getCasinoLock,
  setCasinoLock,
  hashPassword
} from "../../../../lib/db";

async function getAdminAuthInfo(): Promise<{ isAuthorized: boolean; adminName: string }> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("cw_admin_session");
  if (adminCookie) {
    const payload = decryptSession(adminCookie.value);
    if (payload === "clashwager_admin_authorized") {
      return { isAuthorized: true, adminName: "Master Overseer" };
    }
  }

  const userCookie = cookieStore.get("cw_session");
  if (userCookie) {
    const userId = decryptSession(userCookie.value);
    if (userId) {
      const user = await findUserById(userId);
      if (user && user.role === "admin" && !user.isBanned) {
        return { isAuthorized: true, adminName: user.username };
      }
    }
  }

  return { isAuthorized: false, adminName: "Unknown" };
}

export async function GET() {
  try {
    const { isAuthorized } = await getAdminAuthInfo();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const logs = await getAuditLogs();
    const isCasinoLocked = getCasinoLock();

    return NextResponse.json({
      success: true,
      logs,
      isCasinoLocked
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { isAuthorized, adminName } = await getAdminAuthInfo();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized admin access." }, { status: 401 });
    }

    const body = await request.json();
    const { action, userId, ...payload } = body;

    // 1. Global Casino Emergency Game Lock toggle
    if (action === "toggle-casino-lock") {
      const { locked } = payload;
      const newStatus = setCasinoLock(!!locked);
      await addAuditLog({
        action: newStatus ? "GLOBAL_CASINO_LOCKED" : "GLOBAL_CASINO_UNLOCKED",
        details: newStatus
          ? "Emergency global lock engaged. Game wagers suspended."
          : "Emergency lock released. All games operational.",
        admin: adminName
      });
      return NextResponse.json({ success: true, isCasinoLocked: newStatus });
    }

    // 2. Fetch Audit Logs
    if (action === "get-audit-logs") {
      const logs = await getAuditLogs();
      return NextResponse.json({ success: true, logs });
    }

    // 3. Airdrop to all users (or verified users)
    if (action === "airdrop-all") {
      const { amount, onlyVerified } = payload;
      if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid airdrop amount." }, { status: 400 });
      }

      const allUsers = await getAllUsers();
      let updatedCount = 0;
      for (const u of allUsers) {
        if (!u.isBanned && !u.isLocked) {
          if (onlyVerified && !u.isVerified && u.role !== "admin") continue;

          const newBal = (u.balance || 0) + amount;
          await updateUser(u.id, { balance: newBal });
          updatedCount++;
        }
      }

      await addAuditLog({
        action: "MASS_AIRDROP",
        details: `Disbursed +${amount.toLocaleString()} $ to ${updatedCount} players`,
        admin: adminName
      });

      return NextResponse.json({ success: true, updatedCount, amount });
    }

    // Single User operations require valid userId
    if (typeof action !== "string" || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Invalid action request parameters." },
        { status: 400 }
      );
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "Target player not found." }, { status: 404 });
    }

    // 4. Adjust Balance (Set Exact)
    if (action === "adjust-balance") {
      const { amount } = payload;
      if (typeof amount !== "number" || isNaN(amount)) {
        return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
      }

      const oldBal = user.balance || 0;
      await updateUser(userId, { balance: amount });

      await addAuditLog({
        action: "BALANCE_OVERRIDE",
        details: `Adjusted balance from ${oldBal.toLocaleString()} $ to ${amount.toLocaleString()} $`,
        targetUser: user.username,
        admin: adminName
      });

      return NextResponse.json({ success: true, newBalance: amount });
    }

    // 5. Quick Add / Subtract Balance
    if (action === "quick-add") {
      const { amount } = payload;
      if (typeof amount !== "number" || isNaN(amount)) {
        return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
      }

      const newBal = Math.max(0, (user.balance || 0) + amount);
      await updateUser(userId, { balance: newBal });

      await addAuditLog({
        action: amount >= 0 ? "FUNDS_GRANTED" : "FUNDS_DEDUCTED",
        details: `${amount >= 0 ? "+" : ""}${amount.toLocaleString()} $ applied (New balance: ${newBal.toLocaleString()} $)`,
        targetUser: user.username,
        admin: adminName
      });

      return NextResponse.json({ success: true, newBalance: newBal });
    }

    // 6. Toggle Lock / Freeze Account (Instant Freeze)
    if (action === "toggle-lock") {
      const { isLocked } = payload;
      if (typeof isLocked !== "boolean") {
        return NextResponse.json({ error: "Invalid lock state." }, { status: 400 });
      }

      await updateUser(userId, { isLocked });

      await addAuditLog({
        action: isLocked ? "ACCOUNT_FROZEN" : "ACCOUNT_UNFROZEN",
        details: isLocked
          ? "Account placed under protective security freeze"
          : "Account security freeze released",
        targetUser: user.username,
        admin: adminName
      });

      return NextResponse.json({ success: true, isLocked });
    }

    // 7. Toggle Ban
    if (action === "toggle-ban") {
      const { isBanned } = payload;
      if (typeof isBanned !== "boolean") {
        return NextResponse.json({ error: "Invalid ban state." }, { status: 400 });
      }

      await updateUser(userId, { isBanned });

      await addAuditLog({
        action: isBanned ? "ACCOUNT_BANNED" : "ACCOUNT_UNBANNED",
        details: isBanned ? "Player permanently banned" : "Ban revoked by overseer",
        targetUser: user.username,
        admin: adminName
      });

      return NextResponse.json({ success: true, isBanned });
    }

    // 8. Toggle Verification
    if (action === "toggle-verification") {
      const { isVerified } = payload;
      if (typeof isVerified !== "boolean") {
        return NextResponse.json({ error: "Invalid verification state." }, { status: 400 });
      }

      await updateUser(userId, { isVerified });

      await addAuditLog({
        action: isVerified ? "VERIFICATION_APPROVED" : "VERIFICATION_REVOKED",
        details: isVerified ? "Identity verified (Discord/Roblox confirmed)" : "Verification badge removed",
        targetUser: user.username,
        admin: adminName
      });

      return NextResponse.json({ success: true, isVerified });
    }

    // 9. Set Role (Admin / User)
    if (action === "set-role") {
      const { role } = payload;
      if (role !== "admin" && role !== "user") {
        return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
      }

      await updateUser(userId, { role });

      await addAuditLog({
        action: "ROLE_CHANGED",
        details: `Role updated to ${role.toUpperCase()}`,
        targetUser: user.username,
        admin: adminName
      });

      return NextResponse.json({ success: true, role });
    }

    // 10. Reset Player Stats & Ledger
    if (action === "reset-user-stats") {
      await updateUser(userId, {
        history: [],
        balance: 1000,
        inventory: []
      });

      await addAuditLog({
        action: "USER_STATS_RESET",
        details: "Reset user wager history and restored default 1,000 $ balance",
        targetUser: user.username,
        admin: adminName
      });

      return NextResponse.json({ success: true });
    }

    // 11. Delete User
    if (action === "delete-user") {
      try {
        const db = await getDatabase();
        if (db) {
          await db.collection("users").deleteOne({ id: userId });
        }
      } catch (e) {}

      await addAuditLog({
        action: "USER_PURGED",
        details: `Deleted user profile ${user.username} (${userId})`,
        targetUser: user.username,
        admin: adminName
      });

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
