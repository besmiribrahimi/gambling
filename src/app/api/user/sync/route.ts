import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateUser, findUserById } from "../../../../lib/db";
import { decryptSession } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("cw_session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const userId = decryptSession(sessionCookie.value);
    if (!userId) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const user = await findUserById(userId);
    if (!user || user.isBanned) {
      return NextResponse.json(
        { error: "Unauthorized access or account is banned." },
        { status: 403 }
      );
    }

    const { balance, inventory, history, lastClaimTime } = await request.json();

    const success = await updateUser(userId, { balance, inventory, history, lastClaimTime });

    if (!success) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync API error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
