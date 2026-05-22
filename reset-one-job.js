require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'aadlc');

    // Reset the failed job back to pending
    const result = await db.collection('jobs').updateOne(
      { stage: 'pdd_review', status: 'failed' },
      {
        $set: {
          status: 'pending',
          claimedAt: null
        }
      }
    );

    console.log('✓ Job reset to pending');
    console.log('  Modified: ' + result.modifiedCount + ' document(s)');

    // Show the job and project
    const job = await db.collection('jobs').findOne({ stage: 'pdd_review' });
    const project = await db.collection('projects').findOne({});

    if (job) {
      console.log('\n📋 Job State:');
      console.log('  Status: ' + job.status);
      console.log('  Project: ' + job.context?.projectName);
    }

    if (project) {
      console.log('\n📦 Project:');
      console.log('  Name: ' + project.projectName);
      console.log('  Status: ' + project.status);
    }

    await client.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
