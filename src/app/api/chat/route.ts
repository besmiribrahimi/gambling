import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSession } from "../../../lib/auth";
import {
  findUserById,
  getChatMessages,
  saveChatMessage,
  deleteChatMessage,
  clearAllChatMessages,
  getCasinoLock
} from "../../../lib/db";

async function getChatUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cw_session");
  const adminCookie = cookieStore.get("cw_admin_session");

  let isAdminSession = false;
  if (adminCookie) {
    const payload = decryptSession(adminCookie.value);
    if (payload === "clashwager_admin_authorized") isAdminSession = true;
  }

  if (sessionCookie && sessionCookie.value) {
    const userId = decryptSession(sessionCookie.value);
    if (userId) {
      const user = await findUserById(userId);
      if (user) {
        return { user, isAdmin: user.role === "admin" || isAdminSession };
      }
    }
  }

  return { user: null, isAdmin: isAdminSession };
}

// GET /api/chat - Fetch real chat messages
export async function GET() {
  try {
    const messages = await getChatMessages(50);
    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error("Chat fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// POST /api/chat - Send a real message
export async function POST(request: Request) {
  try {
    const isCasinoLocked = getCasinoLock();
    if (isCasinoLocked) {
      return NextResponse.json(
        { error: "Chat and wagers temporarily suspended for maintenance." },
        { status: 503 }
      );
    }

    const { user, isAdmin } = await getChatUser();

    if (user && user.isBanned) {
      return NextResponse.json(
        { error: "Your account is banned." },
        { status: 403 }
      );
    }

    if (user && user.isLocked) {
      return NextResponse.json(
        { error: "Your account is temporarily frozen by overseers." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { text, vipTier, vipColor, guestName } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const cleanText = text.trim().substring(0, 240);

    // Determine sender identity
    let senderName = "Guest";
    let role: "admin" | "user" = "user";
    let isVerified = false;
    let userVipTier = vipTier || "Bronze";
    let userVipColor = vipColor || "#cd7f32";
    let userAvatar = "⚡";

    if (user) {
      senderName = user.username;
      role = user.role || "user";
      isVerified = !!user.isVerified;
      userAvatar = user.preferences?.avatar || (user.role === "admin" ? "👑" : "⚡");
    } else if (guestName && typeof guestName === "string" && guestName.trim()) {
      senderName = guestName.trim().substring(0, 20);
    }

    if (isAdmin) {
      role = "admin";
      userAvatar = "👑";
    }

    const savedMsg = await saveChatMessage({
      userId: user?.id,
      sender: senderName,
      avatar: userAvatar,
      role,
      isVerified,
      vipTier: userVipTier,
      vipColor: userVipColor,
      text: cleanText
    });

    return NextResponse.json({
      success: true,
      message: savedMsg
    });
  } catch (error) {
    console.error("Chat send error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// DELETE /api/chat - Admin moderation (delete single message or clear)
export async function DELETE(request: Request) {
  try {
    const { isAdmin } = await getChatUser();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, clearAll } = body;

    if (clearAll) {
      await clearAllChatMessages();
      return NextResponse.json({ success: true, cleared: true });
    }

    if (messageId && typeof messageId === "string") {
      await deleteChatMessage(messageId);
      return NextResponse.json({ success: true, deletedId: messageId });
    }

    return NextResponse.json({ error: "Invalid delete parameters." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
