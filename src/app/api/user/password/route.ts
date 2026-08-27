import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserById, updateUser } from "../../../../lib/db";
import { hashPassword, decryptSession } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("cw_session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const userId = decryptSession(sessionCookie.value);
    if (!userId) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const user = await findUserById(userId);
    if (!user || user.isBanned) {
      return NextResponse.json({ error: "User not found or banned." }, { status: 404 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required." }, { status: 400 });
    }

    if (newPassword.length < 5) {
      return NextResponse.json({ error: "New password must be at least 5 characters." }, { status: 400 });
    }

    if (user.passwordHash !== hashPassword(currentPassword)) {
      return NextResponse.json({ error: "Current password does not match." }, { status: 401 });
    }

    const newHash = hashPassword(newPassword);
    await updateUser(userId, { passwordHash: newHash });

    return NextResponse.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("Password change API error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
