const { MongoClient } = require('mongodb');

let cachedDb = null;

async function connectDb() {
  if (cachedDb) return cachedDb;

  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'agent_automation';

  if (!mongoUri) {
    throw new Error('MONGODB_URI not defined in .env');
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  cachedDb = client.db(dbName);

  console.log(`Connected to MongoDB: ${dbName}`);
  return cachedDb;
}

function getDb() {
  if (!cachedDb) {
    throw new Error('Database not connected. Call connectDb() first.');
  }
  return cachedDb;
}

module.exports = { connectDb, getDb };
