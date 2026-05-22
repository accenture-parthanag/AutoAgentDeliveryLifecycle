require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'aadlc');

    const result = await db.collection('projects').updateOne(
      { _id: new ObjectId('6a02e14a417f58f358305883') },
      {
        $set: {
          'phases.0.status': 'completed'
        }
      }
    );

    console.log('✓ Project phase updated to completed');
    console.log('  Modified: ' + result.modifiedCount + ' document(s)');

    await client.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
