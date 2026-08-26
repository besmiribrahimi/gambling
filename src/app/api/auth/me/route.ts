import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserById } from "../../../../lib/db";
import { decryptSession } from "../../../../lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("cw_session");

    if (!sessionCookie) {
      return NextResponse.json({ loggedIn: false });
    }

    const userId = decryptSession(sessionCookie.value);
    if (!userId) {
      return NextResponse.json({ loggedIn: false });
    }

    const user = await findUserById(userId);

    if (!user || user.isBanned) {
      const cookieStore = await cookies();
      cookieStore.delete("cw_session");
      return NextResponse.json({ loggedIn: false });
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
