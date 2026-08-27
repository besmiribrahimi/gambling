import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserById, updateUser } from "../../../../lib/db";
import { decryptSession } from "../../../../lib/auth";

export async function GET() {
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

    const { passwordHash, ...safeUser } = user;
    return NextResponse.json({ success: true, profile: safeUser });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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
    const { discord, roblox, avatar, bio } = body;

    const updateData: Record<string, unknown> = {};
    if (typeof discord === "string") updateData.discord = discord.trim();
    if (typeof roblox === "string") updateData.roblox = roblox.trim();
    
    // Preferences updates
    const currentPrefs = user.preferences || {};
    if (typeof avatar === "string") currentPrefs.avatar = avatar;
    if (typeof bio === "string") currentPrefs.bio = bio.slice(0, 150);

    updateData.preferences = currentPrefs;

    await updateUser(userId, updateData);

    const updatedUser = await findUserById(userId);
    const { passwordHash, ...safeUser } = updatedUser || user;

    return NextResponse.json({ success: true, profile: safeUser });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
