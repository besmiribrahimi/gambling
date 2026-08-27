import { MongoClient, Db } from "mongodb";
import { hashPassword } from "./auth";

export interface UserPreferences {
  avatar?: string;
  bio?: string;
  soundVolume?: number;
  soundMuted?: boolean;
  highPerformanceMode?: boolean;
  oddsFormat?: "decimal" | "american" | "fractional";
  defaultBetPresets?: number[];
  dailyWagerLimit?: number | null;
  dailyLossLimit?: number | null;
}

export interface DBUser {
  id: string;
  username: string;
  discord: string;
  roblox: string;
  passwordHash: string;
  balance: number;
  role: "admin" | "user";
  isGuest?: boolean;
  isBanned?: boolean;
  preferences?: UserPreferences;
  inventory: Array<{
    id: string;
    name: string;
    rarity: "common" | "rare" | "legendary" | "exotic";
    value: number;
    color: string;
  }>;
  history: Array<{
    id: string;
    type: "bet" | "crash" | "coinflip" | "lootbox" | "mines" | "slots" | "plinko" | "blackjack";
    description: string;
    amount: number;
    result: "win" | "lose" | "pending";
    payout: number;
    date: string;
  }>;
  lastClaimTime: number | null;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

// In-Memory fallback store if MongoDB URI is not configured yet or VPS database is offline
const inMemoryUsers: Map<string, DBUser> = new Map();

// Seed initial default admin into in-memory store
const defaultAdminUser: DBUser = {
  id: "admin_root_001",
  username: "admin",
  discord: "Admin#0001",
  roblox: "TrenchAdmin",
  passwordHash: hashPassword("ClashAdmin#2026!EntrenchedSecure"),
  balance: 100000,
  role: "admin",
  isGuest: false,
  inventory: [],
  history: [],
  lastClaimTime: null,
  createdAt: new Date().toISOString(),
  preferences: {
    avatar: "👑",
    bio: "Chief Executive Admin of ClashWager & VPS Database Overseer"
  }
};
inMemoryUsers.set(defaultAdminUser.id, defaultAdminUser);

const uri = process.env.MONGODB_URI;

let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  if (process.env.NODE_ENV === "development") {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 4000,
        maxPoolSize: 15
      });
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 20
    });
    clientPromise = client.connect();
  }
}

export async function getDatabase(): Promise<Db | null> {
  if (!clientPromise) {
    return null;
  }
  try {
    const conn = await clientPromise;
    const db = conn.db("gambling");
    
    // Seed default admin in Mongo if not already created
    const existingAdmin = await db.collection<DBUser>("users").findOne({ username: "admin" });
    if (!existingAdmin) {
      await db.collection<DBUser>("users").insertOne(defaultAdminUser);
    }

    return db;
  } catch (err) {
    console.warn("MongoDB connection to VPS failed, falling back to local vault:", err);
    return null;
  }
}

export async function checkDatabaseHealth(): Promise<{ isConnected: boolean; mode: "vps_mongodb" | "in_memory_vault"; latencyMs: number; userCount: number }> {
  const start = Date.now();
  try {
    const db = await getDatabase();
    if (db) {
      const count = await db.collection("users").countDocuments();
      return {
        isConnected: true,
        mode: "vps_mongodb",
        latencyMs: Date.now() - start,
        userCount: count
      };
    }
  } catch (e) {}

  return {
    isConnected: false,
    mode: "in_memory_vault",
    latencyMs: Date.now() - start,
    userCount: inMemoryUsers.size
  };
}

export async function findUserByUsername(username: string): Promise<DBUser | null> {
  const cleanName = username.trim();
  try {
    const db = await getDatabase();
    if (db) {
      const user = await db.collection<DBUser>("users").findOne({
        username: { $regex: new RegExp(`^${cleanName}$`, "i") }
      });
      if (user) return user;
    }
  } catch (error) {
    console.error("Database query failed:", error);
  }

  // Fallback to in-memory vault
  for (const u of inMemoryUsers.values()) {
    if (u.username.toLowerCase() === cleanName.toLowerCase()) {
      return u;
    }
  }
  return null;
}

export async function findUserById(id: string): Promise<DBUser | null> {
  try {
    const db = await getDatabase();
    if (db) {
      const user = await db.collection<DBUser>("users").findOne({ id });
      if (user) return user;
    }
  } catch (error) {
    console.error("Database query failed:", error);
  }

  return inMemoryUsers.get(id) || null;
}

export async function getAllUsers(): Promise<Omit<DBUser, "passwordHash">[]> {
  try {
    const db = await getDatabase();
    if (db) {
      const users = await db.collection<DBUser>("users")
        .find({}, { projection: { passwordHash: 0 } })
        .toArray();
      return users as unknown as Omit<DBUser, "passwordHash">[];
    }
  } catch (error) {
    console.error("Database getAllUsers query failed:", error);
  }

  // Fallback in-memory
  const safeList: Omit<DBUser, "passwordHash">[] = [];
  for (const u of inMemoryUsers.values()) {
    const { passwordHash, ...safe } = u;
    safeList.push(safe);
  }
  return safeList;
}

export async function saveUser(user: DBUser): Promise<boolean> {
  inMemoryUsers.set(user.id, user);
  try {
    const db = await getDatabase();
    if (db) {
      const result = await db.collection<DBUser>("users").replaceOne(
        { id: user.id },
        user,
        { upsert: true }
      );
      return result.acknowledged;
    }
    return true;
  } catch (error) {
    console.error("Failed to save user in MongoDB:", error);
    return true; // Fallback succeeded
  }
}

export async function updateUser(id: string, updateData: Partial<DBUser>): Promise<boolean> {
  const existing = inMemoryUsers.get(id);
  if (existing) {
    inMemoryUsers.set(id, { ...existing, ...updateData, updatedAt: new Date().toISOString() });
  }

  try {
    const db = await getDatabase();
    if (db) {
      const result = await db.collection<DBUser>("users").updateOne(
        { id },
        { $set: { ...updateData, updatedAt: new Date().toISOString() } }
      );
      return result.modifiedCount > 0 || result.matchedCount > 0;
    }
    return existing !== undefined;
  } catch (error) {
    console.error("Failed to update user in MongoDB:", error);
    return existing !== undefined;
  }
}
