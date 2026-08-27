import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptSession } from "../../../../lib/auth";
import { findUserByUsername, hashPassword, addAuditLog } from "../../../../lib/db";

const VALID_MASTER_KEYS = [
  process.env.ADMIN_SECRET_KEY,
  process.env.ADMIN_PASSWORD,
  "macaj",
  "ClashAdmin#2026!EntrenchedSecure",
  "super_long_admin_password_layer_one_987654321_clashwager"
].filter(Boolean) as string[];

const ADMIN_PASS_1 = process.env.ADMIN_PASS_1 || "super_long_admin_password_layer_one_987654321_clashwager";
const ADMIN_PASS_2 = process.env.ADMIN_PASS_2 || "super_long_admin_password_layer_two_123456789_clashwager";
const ADMIN_PASS_3 = process.env.ADMIN_PASS_3 || "macaj";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, secretKey, secretCode, passcode, pass1, pass2, pass3 } = body;

    let isAuthorized = false;
    let authMethod = "Credentials";
    let adminIdentifier = "Overseer";

    // 1. Single Master Secret Code / Passcode PIN (Fast unlock from mobile, tablet, or desktop)
    const suppliedSecret = (secretKey || secretCode || passcode || "")?.toString().trim();
    if (suppliedSecret && VALID_MASTER_KEYS.includes(suppliedSecret)) {
      isAuthorized = true;
      authMethod = "Master Passcode Key";
      adminIdentifier = "Master Overseer";
    }

    // 2. Admin Username + Password authentication (e.g. admin / ClashAdmin#2026!EntrenchedSecure)
    if (!isAuthorized && typeof username === "string" && typeof password === "string" && username.trim()) {
      const cleanUsername = username.trim();
      const user = await findUserByUsername(cleanUsername);
      if (user && user.role === "admin" && !user.isBanned) {
        if (user.passwordHash === hashPassword(password)) {
          isAuthorized = true;
          authMethod = "Admin Account Database";
          adminIdentifier = user.username;
        }
      } else if (cleanUsername.toLowerCase() === "admin" && (password === "ClashAdmin#2026!EntrenchedSecure" || password === "macaj")) {
        // Fallback root credential check
        isAuthorized = true;
        authMethod = "Root Fallback Credentials";
        adminIdentifier = "Root Admin";
      }
    }

    // 3. Multi-layer security passcodes (backwards compatibility)
    if (!isAuthorized && typeof pass1 === "string" && typeof pass2 === "string" && typeof pass3 === "string") {
      if (pass1 === ADMIN_PASS_1 && pass2 === ADMIN_PASS_2 && pass3 === ADMIN_PASS_3) {
        isAuthorized = true;
        authMethod = "Multi-Layer Passcodes";
        adminIdentifier = "Layered Overseer";
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Invalid Overseer authentication credentials. Access denied." },
        { status: 401 }
      );
    }

    // Set 24-hour secure HTTP-only admin cookie
    const token = encryptSession("clashwager_admin_authorized");
    const cookieStore = await cookies();
    cookieStore.set("cw_admin_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/"
    });

    // Record in audit log
    await addAuditLog({
      action: "ADMIN_LOGIN",
      details: `Overseer console unlocked via ${authMethod}`,
      admin: adminIdentifier
    });

    return NextResponse.json({
      success: true,
      authorized: true,
      adminUser: adminIdentifier
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
