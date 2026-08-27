import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSession } from "../../../../lib/auth";
import { getAllUsers } from "../../../../lib/db";

async function isAdminAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("cw_admin_session");
  if (!adminCookie) return false;

  const payload = decryptSession(adminCookie.value);
  return payload === "clashwager_admin_authorized";
}

export async function GET() {
  try {
    if (!(await isAdminAuthorized())) {
      return NextResponse.json({ error: "Unauthorized admin access." }, { status: 401 });
    }

    const users = await getAllUsers();

    const totalUsers = users.length;
    const circulatingBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);

    return NextResponse.json({
      success: true,
      users,
      totalUsers,
      circulatingBalance
    });
  } catch (error) {
    console.error("Admin Users Fetch Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
