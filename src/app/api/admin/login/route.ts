import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptSession } from "../../../../lib/auth";
import { findUserByUsername, hashPassword } from "../../../../lib/db";

const ADMIN_PASS_1 = process.env.ADMIN_PASS_1 || "super_long_admin_password_layer_one_987654321_clashwager";
const ADMIN_PASS_2 = process.env.ADMIN_PASS_2 || "super_long_admin_password_layer_two_123456789_clashwager";
const ADMIN_PASS_3 = process.env.ADMIN_PASS_3 || "macaj";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, pass1, pass2, pass3 } = body;

    let isAuthorized = false;

    // Option A: Username + Password authentication (e.g. admin / ClashAdmin#2026!EntrenchedSecure)
    if (typeof username === "string" && typeof password === "string" && username.trim()) {
      const user = await findUserByUsername(username.trim());
      if (user && user.role === "admin" && !user.isBanned) {
        if (user.passwordHash === hashPassword(password)) {
          isAuthorized = true;
        }
      }
    }

    // Option B: Multi-layer security passcodes
    if (!isAuthorized && typeof pass1 === "string" && typeof pass2 === "string" && typeof pass3 === "string") {
      if (pass1 === ADMIN_PASS_1 && pass2 === ADMIN_PASS_2 && pass3 === ADMIN_PASS_3) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Invalid admin authentication credentials." },
        { status: 401 }
      );
    }

    // Session creation: Set 24-hour secure HTTP-only admin cookie
    const token = encryptSession("clashwager_admin_authorized");
    const cookieStore = await cookies();
    cookieStore.set("cw_admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/"
    });

    return NextResponse.json({ success: true, authorized: true });
  } catch (error) {
    console.error("Admin Login Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
