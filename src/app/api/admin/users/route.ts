import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSession } from "../../../../lib/auth";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

async function isAdminAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("cw_admin_session");
  if (!adminCookie) return false;

  const payload = decryptSession(adminCookie.value);
  return payload === "clashwager_admin_authorized";
}

export async function GET() {
  try {
    if (!(await isAdminAuthorized())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    if (!uri) {
      return NextResponse.json({ error: "Database URI not defined." }, { status: 500 });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("gambling");
    const usersCollection = db.collection("users");

    // Fetch users (exclude password hashes for security)
    const users = await usersCollection.find({}, { projection: { passwordHash: 0 } }).toArray();

    const totalUsers = users.length;
    const circulatingBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);

    await client.close();

    return NextResponse.json({
      success: true,
      users,
      totalUsers,
      circulatingBalance
    });
  } catch (error) {
    console.error("Admin Users Fetch Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
