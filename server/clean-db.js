const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://admin:helloworld@127.0.0.1:27017/?authSource=admin';
const dbName = process.env.MONGODB_DB || 'agent_automation';
const client = new MongoClient(uri);

async function cleanDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(dbName);

    console.log(`📦 Database: ${dbName}\n`);

    // Get all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (collectionNames.length === 0) {
      console.log('✓ Database is already empty (no collections)');
      return;
    }

    console.log(`Found ${collectionNames.length} collection(s):\n`);

    // Delete all documents from each collection
    let totalDeleted = 0;
    for (const collName of collectionNames) {
      const collection = db.collection(collName);
      const count = await collection.countDocuments();

      if (count > 0) {
        const result = await collection.deleteMany({});
        totalDeleted += result.deletedCount;
        console.log(`  ✓ ${collName}: ${result.deletedCount} document(s) deleted`);
      } else {
        console.log(`  ✓ ${collName}: empty`);
      }
    }

    console.log(`\n✅ Cleanup complete: ${totalDeleted} total document(s) deleted\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    process.exit(0);
  }
}

cleanDatabase();
