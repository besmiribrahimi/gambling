import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserByUsername } from "../../../../lib/db";
import { hashPassword, encryptSession } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Anti-injection: strict type checks to ensure login inputs are strings
    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Invalid input. Username and password must be text." },
        { status: 400 }
      );
    }

    if (!username.trim() || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const user = await findUserByUsername(username.trim());
    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: "Your account has been banned by the Administrator." },
        { status: 403 }
      );
    }

    const hashedInput = hashPassword(password);
    if (user.passwordHash !== hashedInput) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Set secure user session cookie
    const token = encryptSession(user.id);
    const cookieStore = await cookies();
    cookieStore.set("cw_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    // If logging in as an admin account, grant admin session automatically as well
    if (user.role === "admin") {
      const adminToken = encryptSession("clashwager_admin_authorized");
      cookieStore.set("cw_admin_session", adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 4, // 4 hours
        path: "/"
      });
    }

    const { passwordHash, ...userResponse } = user;

    return NextResponse.json({ success: true, user: userResponse });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
