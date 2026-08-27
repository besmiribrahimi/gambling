const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const uri = "mongodb+srv://momaisgaypierreisking_db_user:a2QuY6ujb4vGdqOk@lazone.f0yjvpx.mongodb.net/gambling?retryWrites=true&w=majority&appName=lazone";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const NEW_STRONG_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ClashAdmin#2026!EntrenchedSecure";

async function updatePassword() {
  console.log("Updating Admin account with strong security credentials...");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("gambling");
    const usersCollection = db.collection("users");

    const newHash = hashPassword(NEW_STRONG_ADMIN_PASSWORD);
    const result = await usersCollection.updateOne(
      { username: "admin" },
      { 
        $set: { 
          passwordHash: newHash,
          role: "admin",
          updatedAt: new Date().toISOString()
        } 
      },
      { upsert: true }
    );

    console.log("✅ Admin password successfully updated to strong security standard!");
    console.log(`Username: admin`);
    console.log(`Password: ${NEW_STRONG_ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("Error updating admin password:", error);
  } finally {
    await client.close();
  }
}

updatePassword();
