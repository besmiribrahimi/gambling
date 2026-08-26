import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSession } from "../../../../lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get("cw_admin_session");

    if (!adminCookie) {
      return NextResponse.json({ authorized: false });
    }

    const payload = decryptSession(adminCookie.value);
    if (payload === "clashwager_admin_authorized") {
      return NextResponse.json({ authorized: true });
    }

    return NextResponse.json({ authorized: false });
  } catch (error) {
    return NextResponse.json({ authorized: false });
  }
}
