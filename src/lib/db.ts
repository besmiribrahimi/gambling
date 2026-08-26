import { MongoClient, Db } from "mongodb";

export interface DBUser {
  id: string;
  username: string;
  discord: string;
  roblox: string;
  passwordHash: string;
  balance: number;
  isBanned?: boolean;
  inventory: Array<{
    id: string;
    name: string;
    rarity: "common" | "rare" | "legendary" | "exotic";
    value: number;
    color: string;
  }>;
  history: Array<{
    id: string;
    type: "bet" | "crash" | "coinflip" | "lootbox";
    description: string;
    amount: number;
    result: "win" | "lose" | "pending";
    payout: number;
    date: string;
  }>;
  lastClaimTime: number | null;
}

const uri = process.env.MONGODB_URI;

let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

async function getDatabase(): Promise<Db> {
  if (!clientPromise) {
    throw new Error(
      "MONGODB_URI is not defined. Please add it to your .env.local file (e.g., MONGODB_URI=mongodb://username:password@vps-ip:27017/gambling)."
    );
  }
  const conn = await clientPromise;
  // Explicitly isolate our data inside the 'gambling' database so we don't interfere with other databases on your VPS
  return conn.db("gambling");
}

export async function findUserByUsername(username: string): Promise<DBUser | null> {
  try {
    const db = await getDatabase();
    const user = await db.collection<DBUser>("users").findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, "i") }
    });
    return user;
  } catch (error) {
    console.error("Failed to find user by username:", error);
    return null;
  }
}

export async function findUserById(id: string): Promise<DBUser | null> {
  try {
    const db = await getDatabase();
    return await db.collection<DBUser>("users").findOne({ id });
  } catch (error) {
    console.error("Failed to find user by ID:", error);
    return null;
  }
}

export async function saveUser(user: DBUser): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.collection<DBUser>("users").replaceOne(
      { id: user.id },
      user,
      { upsert: true }
    );
    return result.acknowledged;
  } catch (error) {
    console.error("Failed to save user:", error);
    return false;
  }
}

export async function updateUser(id: string, updateData: Partial<DBUser>): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.collection<DBUser>("users").updateOne(
      { id },
      { $set: updateData }
    );
    return result.modifiedCount > 0 || result.matchedCount > 0;
  } catch (error) {
    console.error("Failed to update user:", error);
    return false;
  }
}
