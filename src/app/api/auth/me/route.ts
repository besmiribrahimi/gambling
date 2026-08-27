import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserById } from "../../../../lib/db";
import { decryptSession } from "../../../../lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("cw_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ loggedIn: false });
    }

    const userId = decryptSession(sessionCookie.value);
    if (!userId) {
      return NextResponse.json({ loggedIn: false });
    }

    const user = await findUserById(userId);

    if (!user) {
      // Don't aggressively delete cookie on transient DB hiccups
      return NextResponse.json({ loggedIn: false });
    }

    if (user.isBanned) {
      cookieStore.delete("cw_session");
      cookieStore.delete("cw_admin_session");
      return NextResponse.json({ loggedIn: false, error: "Account banned." });
    }

    const { passwordHash, ...userResponse } = user;

    return NextResponse.json({ loggedIn: true, user: userResponse });
  } catch (error) {
    console.error("Auth Me API error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
