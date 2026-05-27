require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function wait() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('aadlc');
  
  for (let i = 0; i < 30; i++) {
    const job = await db.collection('jobs').findOne({ _id: new ObjectId('6a13d23a6b9d5979f447577b') });
    process.stdout.write('.');
    
    if (job.status !== 'in_progress') {
      console.log(`\n✅ JOB ${job.status.toUpperCase()}`);
      
      if (job.status === 'completed') {
        const project = await db.collection('projects').findOne({});
        console.log(`HTML Path: ${project.sddHtmlPath}`);
        const fs = require('fs');
        if (project.sddHtmlPath && fs.existsSync(project.sddHtmlPath)) {
          console.log(`Size: ${(fs.statSync(project.sddHtmlPath).size / 1024).toFixed(1)} KB`);
        }
      } else if (job.status === 'failed') {
        console.log(`Reason: ${job.reason}`);
      }
      
      await client.close();
      return;
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\nTimeout');
  await client.close();
}

wait();
