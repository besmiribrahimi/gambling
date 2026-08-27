const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const uri = "mongodb+srv://momaisgaypierreisking_db_user:a2QuY6ujb4vGdqOk@lazone.f0yjvpx.mongodb.net/gambling?retryWrites=true&w=majority&appName=lazone";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function seed() {
  console.log("Seeding MongoDB Atlas with initial Admin and collections...");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("gambling");
    const usersCollection = db.collection("users");

    // Check if admin exists
    const existing = await usersCollection.findOne({ username: "admin" });
    if (!existing) {
      const adminUser = {
        id: "admin_root_001",
        username: "admin",
        discord: "Admin#0001",
        roblox: "TrenchAdmin",
        passwordHash: hashPassword("admin12345"),
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

      await usersCollection.insertOne(adminUser);
      console.log("✅ Seeded default Admin user [admin] with 100,000 War Bonds!");
    } else {
      console.log("ℹ️ Admin user already exists in Atlas database.");
    }

    const count = await usersCollection.countDocuments();
    console.log(`Total users currently in Atlas MongoDB: ${count}`);
  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    await client.close();
  }
}

seed();
