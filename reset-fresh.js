require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'aadlc');

    console.log('🗑️  Deleting all jobs and projects...');

    // Drop all collections
    await db.collection('jobs').deleteMany({});
    await db.collection('projects').deleteMany({});

    console.log('✓ Database cleared completely');
    console.log('\n📊 New state:');
    const jobCount = await db.collection('jobs').countDocuments({});
    const projectCount = await db.collection('projects').countDocuments({});
    console.log('   Projects: ' + projectCount);
    console.log('   Jobs: ' + jobCount);

    console.log('\n✅ Ready to start fresh. Submit a new PDD from the frontend.');

    await client.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
