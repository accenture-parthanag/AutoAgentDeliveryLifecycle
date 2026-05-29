const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb://admin:helloworld@127.0.0.1:27017/?authSource=admin';
const client = new MongoClient(uri);

async function cleanup() {
  try {
    await client.connect();
    const db = client.db('agent_automation');
    
    // Delete the project
    const projectResult = await db.collection('projects').deleteOne({
      _id: new ObjectId('6a103a49173f1d4bb854a153')
    });
    console.log('✓ Project deleted:', projectResult.deletedCount);
    
    // Delete associated jobs
    const jobsResult = await db.collection('jobs').deleteMany({
      projectId: new ObjectId('6a103a49173f1d4bb854a153')
    });
    console.log('✓ Associated jobs deleted:', jobsResult.deletedCount);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

cleanup();
