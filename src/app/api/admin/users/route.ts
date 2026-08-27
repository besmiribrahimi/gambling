import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSession } from "../../../../lib/auth";
import { getAllUsers, findUserById, getCasinoLock } from "../../../../lib/db";

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

export async function GET() {
  try {
    if (!(await isAdminAuthorized())) {
      return NextResponse.json({ error: "Unauthorized admin access." }, { status: 401 });
    }

    const users = await getAllUsers();
    const isCasinoLocked = getCasinoLock();

    const totalUsers = users.length;
    const circulatingBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
    const verifiedCount = users.filter((u) => u.isVerified || u.role === "admin").length;
    const pendingCount = users.filter((u) => !u.isVerified && u.role !== "admin").length;
    const lockedCount = users.filter((u) => u.isLocked).length;
    const bannedCount = users.filter((u) => u.isBanned).length;

    const safeUsers = users.map(({ passwordHash, ...safe }) => safe);

    return NextResponse.json({
      success: true,
      users: safeUsers,
      totalUsers,
      circulatingBalance,
      verifiedCount,
      pendingCount,
      lockedCount,
      bannedCount,
      isCasinoLocked
    });
  } catch (error) {
    console.error("Admin Users Fetch Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
