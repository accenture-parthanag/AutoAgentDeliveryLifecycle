require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

async function monitorSdd() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    const project = await db.collection('projects').findOne({});
    const jobId = new ObjectId('6a13cf843fad8a8e348a9176');
    
    console.log(`Monitoring job: ${jobId}\n`);
    
    let pollCount = 0;
    const checkJob = async () => {
      const job = await db.collection('jobs').findOne({ _id: jobId });
      pollCount++;
      
      if (!job) {
        console.log(`Job not found`);
        return;
      }
      
      process.stdout.write(`\r⏳ ${job.status}... (${pollCount * 2}s)`);
      
      if (job.status === 'completed' || job.status === 'failed') {
        console.log(`\n✅ Done!\n`);
        
        // Check final project state
        const updated = await db.collection('projects').findOne({});
        console.log(`HTML Path Set: ${updated.sddHtmlPath ? '✅ YES' : '❌ NO'}`);
        
        if (updated.sddHtmlPath && fs.existsSync(updated.sddHtmlPath)) {
          const stats = fs.statSync(updated.sddHtmlPath);
          console.log(`HTML File Exists: ✅ YES (${(stats.size / 1024).toFixed(1)} KB)\n`);
          console.log(`✨ SDD HTML ready for download!`);
        } else if (updated.sddHtmlPath) {
          console.log(`HTML Path in DB but file not found on disk`);
        }
        
        return;
      }
      
      setTimeout(checkJob, 2000);
    };
    
    await checkJob();
    
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

monitorSdd();
