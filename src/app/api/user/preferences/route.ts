import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserById, updateUser } from "../../../../lib/db";
import { decryptSession } from "../../../../lib/auth";

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

    const preferences = await request.json();

    const merged = { ...(user.preferences || {}), ...preferences };
    await updateUser(userId, { preferences: merged });

    return NextResponse.json({ success: true, preferences: merged });
  } catch (error) {
    console.error("Preferences API error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
