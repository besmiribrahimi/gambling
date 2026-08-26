import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptSession } from "../../../../lib/auth";

const ADMIN_PASS_1 = process.env.ADMIN_PASS_1 || "super_long_admin_password_layer_one_987654321_clashwager";
const ADMIN_PASS_2 = process.env.ADMIN_PASS_2 || "super_long_admin_password_layer_two_123456789_clashwager";
const ADMIN_PASS_3 = process.env.ADMIN_PASS_3 || "macaj";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pass1, pass2, pass3 } = body;

    // Anti NoSQL-injection: ensure all inputs are strings
    if (
      typeof pass1 !== "string" ||
      typeof pass2 !== "string" ||
      typeof pass3 !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid credentials format." },
        { status: 400 }
      );
    }

    if (pass1 !== ADMIN_PASS_1 || pass2 !== ADMIN_PASS_2 || pass3 !== ADMIN_PASS_3) {
      return NextResponse.json(
        { error: "Invalid admin authentication passcodes." },
        { status: 401 }
      );
    }

    // Session creation
    const token = encryptSession("clashwager_admin_authorized");
    const cookieStore = await cookies();
    cookieStore.set("cw_admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 4, // 4 hours
      path: "/"
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin Login Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
