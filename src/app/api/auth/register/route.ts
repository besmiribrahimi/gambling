import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserByUsername, createUser, DBUser } from "../../../../lib/db";
import { hashPassword, encryptSession } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, discord, roblox, password, guestBalance, guestInventory, guestHistory } = body;

    // Anti-injection check: ensure all parameters are strings
    if (
      typeof username !== "string" ||
      typeof discord !== "string" ||
      typeof roblox !== "string" ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid input. All fields must be text." },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    const trimmedDiscord = discord.trim();
    const trimmedRoblox = roblox.trim();

    if (!trimmedUsername || !trimmedDiscord || !trimmedRoblox || !password) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return NextResponse.json(
        { error: "Username must be between 3 and 20 characters." },
        { status: 400 }
      );
    }

    if (trimmedDiscord.length < 2 || trimmedDiscord.length > 32) {
      return NextResponse.json(
        { error: "Discord username must be between 2 and 32 characters." },
        { status: 400 }
      );
    }

    if (trimmedRoblox.length < 3 || trimmedRoblox.length > 20) {
      return NextResponse.json(
        { error: "Roblox username must be between 3 and 20 characters." },
        { status: 400 }
      );
    }

    if (password.length < 5) {
      return NextResponse.json(
        { error: "Password must be at least 5 characters." },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await findUserByUsername(trimmedUsername);
    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken." },
        { status: 400 }
      );
    }

    const userId = "u_" + Math.random().toString(36).substring(2, 11);
    
    // Every new joining player receives strictly 1,000 War Bonds starting balance
    const startingBalance = 1000;
    const initialInventory = Array.isArray(guestInventory) ? guestInventory : [];
    const initialHistory = Array.isArray(guestHistory) ? guestHistory : [];

    const newUser: DBUser = {
      id: userId,
      username: trimmedUsername,
      discord: trimmedDiscord,
      roblox: trimmedRoblox,
      passwordHash: hashPassword(password),
      balance: startingBalance,
      role: "user",
      isGuest: false,
      inventory: initialInventory,
      history: initialHistory,
      lastClaimTime: null,
      createdAt: new Date().toISOString()
    };

    await createUser(newUser);

    // Set secure session cookie
    const token = encryptSession(userId);
    const cookieStore = await cookies();
    cookieStore.set("cw_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    // Remove password hash from response
    const { passwordHash, ...userResponse } = newUser;

    return NextResponse.json({ success: true, user: userResponse });
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
