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

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthorized())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    if (!uri) {
      return NextResponse.json({ error: "Database URI not defined." }, { status: 500 });
    }

    const body = await request.json();
    const { action, userId, ...payload } = body;

    // Anti NoSQL-injection: ensure parameters are strings
    if (typeof action !== "string" || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Invalid action request parameters." },
        { status: 400 }
      );
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("gambling");
    const usersCollection = db.collection("users");

    // Check user existence
    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
      await client.close();
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    if (action === "adjust-balance") {
      const { amount } = payload;
      if (typeof amount !== "number" || isNaN(amount)) {
        await client.close();
        return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
      }

      await usersCollection.updateOne({ id: userId }, { $set: { balance: amount } });
      await client.close();
      return NextResponse.json({ success: true, newBalance: amount });
    }

    if (action === "toggle-ban") {
      const { isBanned } = payload;
      if (typeof isBanned !== "boolean") {
        await client.close();
        return NextResponse.json({ error: "Invalid ban state." }, { status: 400 });
      }

      await usersCollection.updateOne({ id: userId }, { $set: { isBanned } });
      await client.close();
      return NextResponse.json({ success: true, isBanned });
    }

    if (action === "add-wager") {
      const { type, description, amount, result, payout } = payload;
      
      if (
        typeof type !== "string" ||
        typeof description !== "string" ||
        typeof amount !== "number" ||
        typeof result !== "string" ||
        typeof payout !== "number"
      ) {
        await client.close();
        return NextResponse.json({ error: "Invalid wager payload fields." }, { status: 400 });
      }

      const newWager = {
        id: "tx_" + Math.random().toString(36).substr(2, 9),
        type,
        description,
        amount,
        result,
        payout,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString()
      };

      await usersCollection.updateOne(
        { id: userId },
        { $push: { history: { $each: [newWager], $position: 0 } } } as any
      );
      
      await client.close();
      return NextResponse.json({ success: true, newWager });
    }

    await client.close();
    return NextResponse.json({ error: "Action not recognized." }, { status: 400 });
  } catch (error) {
    console.error("Admin Action Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
