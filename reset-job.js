require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'aadlc');

    // Find the stuck job
    const result = await db.collection('jobs').updateOne(
      {
        stage: 'pdd_review',
        status: 'in_progress'
      },
      {
        $set: {
          status: 'pending',
          claimedAt: null
        }
      }
    );

    console.log('✓ Job reset to pending');
    console.log('  Modified: ' + result.modifiedCount + ' document(s)');

    // Show current state
    const job = await db.collection('jobs').findOne({ stage: 'pdd_review' });
    if (job) {
      console.log('\n📋 Current Job State:');
      console.log('  ID: ' + job._id);
      console.log('  Status: ' + job.status);
      console.log('  Stage: ' + job.stage);
      console.log('  Project: ' + job.context?.projectName);
    }

    await client.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
