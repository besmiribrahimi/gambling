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
  process.exit(1);
}

async function run() {
  console.log("Connecting to MongoDB database...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    // Explicitly target the gambling DB for isolation
    const db = client.db("gambling");
    const usersCollection = db.collection("users");

    const targetBalance = 9999999999999999999; // Floats to approx 1e19 in JS

    console.log(`Setting all user balances to ${targetBalance}...`);
    const result = await usersCollection.updateMany({}, { $set: { balance: targetBalance } });

    console.log(`Success! Updated balance of ${result.matchedCount} user account(s) to 9999999999999999999 War Bonds.`);
  } catch (error) {
    console.error("Failed to adjust balances:", error);
  } finally {
    await client.close();
  }
}

run();
