const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://momaisgaypierreisking_db_user:a2QuY6ujb4vGdqOk@lazone.f0yjvpx.mongodb.net/gambling?retryWrites=true&w=majority&appName=lazone";

async function testConnection() {
  console.log("Testing connection to MongoDB Atlas (lazone)...");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    const start = Date.now();
    await client.connect();
    const duration = Date.now() - start;
    console.log(`✅ SUCCESS! Connected to MongoDB Atlas in ${duration}ms!`);

    const db = client.db("gambling");
    const collections = await db.listCollections().toArray();
    console.log("Active collections:", collections.map(c => c.name));

    // Ping test
    const pingResult = await db.command({ ping: 1 });
    console.log("Ping response:", pingResult);
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
  } finally {
    await client.close();
  }
}

testConnection();
