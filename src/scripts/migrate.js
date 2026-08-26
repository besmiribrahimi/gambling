const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

// 1. Read .env.local manually to get MONGODB_URI
const envPath = path.join(__dirname, "..", "..", ".env.local");
let uri = process.env.MONGODB_URI;

if (!uri && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/^MONGODB_URI\s*=\s*(.+)$/m);
  if (match) {
    uri = match[1].trim();
  }
}

if (!uri) {
  console.error("Error: MONGODB_URI not found in environment or .env.local");
  console.log("Please make sure you have defined MONGODB_URI in your .env.local file.");
  process.exit(1);
}

// 2. Read local db.json
const dbPath = path.join(__dirname, "..", "..", "data", "db.json");
if (!fs.existsSync(dbPath)) {
  console.log("No local database file found at data/db.json. Nothing to migrate.");
  process.exit(0);
}

let dbData;
try {
  dbData = JSON.parse(fs.readFileSync(dbPath, "utf8"));
} catch (e) {
  console.error("Error reading data/db.json:", e.message);
  process.exit(1);
}

const users = dbData.users || [];

if (users.length === 0) {
  console.log("Local database has no users. Nothing to migrate.");
  process.exit(0);
}

async function migrate() {
  console.log(`Found ${users.length} user(s) in local db.json.`);
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected successfully!");
    const db = client.db("gambling");
    const usersCollection = db.collection("users");

    console.log("Migrating users...");
    for (const user of users) {
      console.log(`Migrating user: ${user.username} (${user.id})...`);
      // Use replaceOne with upsert to prevent duplicates if run multiple times
      await usersCollection.replaceOne({ id: user.id }, user, { upsert: true });
    }

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.close();
  }
}

migrate();
