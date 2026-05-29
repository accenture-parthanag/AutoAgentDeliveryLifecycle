const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb://admin:helloworld@127.0.0.1:27017/?authSource=admin';
const client = new MongoClient(uri);

async function reset() {
  try {
    await client.connect();
    const db = client.db('agent_automation');
    
    const result = await db.collection('jobs').updateOne(
      { _id: new ObjectId('6a192bedf71dbdd0f01da8f0') },
      { $set: { status: 'pending', claimedAt: null, failedAt: null, reason: null, errorDetails: null } }
    );
    
    console.log('✓ Job updated, modified:', result.modifiedCount);
    
    const job = await db.collection('jobs').findOne({ _id: new ObjectId('6a192bedf71dbdd0f01da8f0') });
    console.log('Job status:', job.status);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

reset();
