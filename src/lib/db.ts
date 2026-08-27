import { MongoClient, Db } from "mongodb";
import crypto from "crypto";

export interface DBUser {
  id: string;
  username: string;
  discord: string;
  roblox: string;
  passwordHash: string;
  balance: number;
  role: "admin" | "user";
  isGuest: boolean;
  isBanned?: boolean;
  preferences?: {
    avatar?: string;
    bio?: string;
    oddsFormat?: "decimal" | "american" | "fractional";
    masterVolume?: number;
    dailyWagerLimit?: number;
  };
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

// In-Memory fallback store if MongoDB URI is not configured or offline
const inMemoryUsers: Map<string, DBUser> = new Map();

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const defaultAdminUser: DBUser = {
  id: "admin_root_001",
  username: "admin",
  discord: "Admin#0001",
  roblox: "TrenchAdmin",
  passwordHash: hashPassword("ClashAdmin#2026!EntrenchedSecure"),
  balance: 100000,
  role: "admin",
  isGuest: false,
  inventory: [
    { id: "skin_init_1", name: "AWP | Dragon Lore", rarity: "exotic", value: 2800, color: "#ffaa00" }
  ],
  history: [
    {
      id: "tx_init_001",
      type: "bet",
      description: "Admin Master Vault Genesis Credit",
      amount: 0,
      result: "win",
      payout: 100000,
      date: new Date().toLocaleTimeString() + " " + new Date().toLocaleDateString()
    }
  ],
  lastClaimTime: null,
  createdAt: new Date().toISOString(),
  preferences: {
    avatar: "👑",
    bio: "Chief Executive Admin of ClashWager & VPS Database Overseer"
  }
};
inMemoryUsers.set(defaultAdminUser.id, defaultAdminUser);

let cachedClient: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (cachedClient) {
    return cachedClient;
  }

  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 20
    });
    await client.connect();
    cachedClient = client;
    return client;
  } catch (err) {
    console.warn("MongoDB Atlas connection error, falling back to local vault:", err);
    cachedClient = null;
    return null;
  }
}

export async function getDatabase(): Promise<Db | null> {
  try {
    const client = await getMongoClient();
    if (!client) return null;
    const db = client.db("gambling");

    // Seed default admin in Mongo if not already created
    const usersCol = db.collection<DBUser>("users");
    const existingAdmin = await usersCol.findOne({ username: "admin" });
    if (!existingAdmin) {
      await usersCol.insertOne(defaultAdminUser);
    }

    return db;
  } catch (err) {
    cachedClient = null;
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
  } catch (err) {
    console.warn("Error finding user in Mongo, checking in-memory:", err);
  }

  for (const user of inMemoryUsers.values()) {
    if (user.username.toLowerCase() === cleanName.toLowerCase()) {
      return user;
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
  } catch (err) {
    console.warn("Error finding user by ID in Mongo, checking in-memory:", err);
  }

  return inMemoryUsers.get(id) || null;
}

export async function createUser(user: DBUser): Promise<DBUser> {
  try {
    const db = await getDatabase();
    if (db) {
      await db.collection<DBUser>("users").insertOne(user);
      return user;
    }
  } catch (err) {
    console.warn("Error creating user in Mongo, falling back to in-memory:", err);
  }

  inMemoryUsers.set(user.id, user);
  return user;
}

export async function updateUser(id: string, updates: Partial<DBUser>): Promise<DBUser | null> {
  try {
    const db = await getDatabase();
    if (db) {
      const result = await db.collection<DBUser>("users").findOneAndUpdate(
        { id },
        { $set: { ...updates, updatedAt: new Date().toISOString() } },
        { returnDocument: "after" }
      );
      if (result) return result;
    }
  } catch (err) {
    console.warn("Error updating user in Mongo, checking in-memory:", err);
  }

  const existing = inMemoryUsers.get(id);
  if (existing) {
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    inMemoryUsers.set(id, updated);
    return updated;
  }
  return null;
}

export async function getAllUsers(): Promise<DBUser[]> {
  try {
    const db = await getDatabase();
    if (db) {
      return await db.collection<DBUser>("users").find({}).sort({ balance: -1 }).toArray();
    }
  } catch (err) {
    console.warn("Error fetching all users in Mongo:", err);
  }

  return Array.from(inMemoryUsers.values()).sort((a, b) => b.balance - a.balance);
}

export const saveUser = createUser;

