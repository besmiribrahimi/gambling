import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSession, encryptSession } from "../../../../lib/auth";
import { findUserById } from "../../../../lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get("cw_admin_session");
    const userCookie = cookieStore.get("cw_session");

    // 1. Check direct admin cookie
    if (adminCookie) {
      const payload = decryptSession(adminCookie.value);
      if (payload === "clashwager_admin_authorized") {
        return NextResponse.json({ authorized: true });
      }
    }

    // 2. Check logged-in user role from DB
    if (userCookie) {
      const userId = decryptSession(userCookie.value);
      if (userId) {
        const user = await findUserById(userId);
        if (user && user.role === "admin" && !user.isBanned) {
          // Set admin session cookie
          const adminToken = encryptSession("clashwager_admin_authorized");
          cookieStore.set("cw_admin_session", adminToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 24 hours
            path: "/"
          });

          return NextResponse.json({ authorized: true, adminUser: user.username });
        }
      }
    }

    return NextResponse.json({ authorized: false });
  } catch (error) {
    return NextResponse.json({ authorized: false });
  }
}
