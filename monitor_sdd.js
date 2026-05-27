require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

let pollCount = 0;
const maxPolls = 120;

async function monitorSdd() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    const project = await db.collection('projects').findOne({});
    const jobId = new ObjectId('6a13ce07b3578a103482f2c6');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`⏳ MONITORING ARCHITECT AGENT PROCESSING`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Job ID: ${jobId}`);
    console.log(`Project: ${project.name}\n`);
    
    const checkStatus = async () => {
      const job = await db.collection('jobs').findOne({ _id: jobId });
      
      if (!job) {
        console.log(`❌ Job not found`);
        return false;
      }
      
      pollCount++;
      const elapsed = (pollCount * 2).toFixed(0);
      const dots = '.'.repeat((pollCount % 4) + 1);
      process.stdout.write(`\r⏳ Polling... ${dots} (${elapsed}s) Status: ${job.status}`);
      
      if (job.status === 'pending' || job.status === 'in_progress') {
        return true;
      } else if (job.status === 'completed') {
        console.log(`\n✅ JOB COMPLETED!\n`);
        
        const updatedProject = await db.collection('projects').findOne({});
        
        if (updatedProject.sddHtmlPath) {
          console.log(`${'='.repeat(60)}`);
          console.log(`📄 HTML SDD GENERATED`);
          console.log(`${'='.repeat(60)}`);
          console.log(`File Path: ${updatedProject.sddHtmlPath}`);
          
          if (fs.existsSync(updatedProject.sddHtmlPath)) {
            const stats = fs.statSync(updatedProject.sddHtmlPath);
            console.log(`File Size: ${(stats.size / 1024).toFixed(1)} KB`);
            console.log(`Status: ✓ File ready for download\n`);
          }
        }
        
        if (updatedProject.sddDocument) {
          console.log(`📊 SDD JSON DATA`);
          console.log(`${'='.repeat(60)}`);
          console.log(`Components: ${updatedProject.sddDocument.components?.length || 0}`);
          console.log(`Risks: ${updatedProject.sddDocument.risks?.length || 0}`);
          console.log(`Architecture: ${updatedProject.sddDocument.architectureStyle?.style || 'N/A'}`);
          console.log(`Tech Stack: ${updatedProject.sddDocument.techStack ? '✓' : '✗'}\n`);
        }
        
        console.log(`${'='.repeat(60)}`);
        console.log(`📥 DOWNLOAD SDD`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Endpoint: GET /api/projects/${project._id}/sdd-download\n`);
        
        return false;
      } else if (job.status === 'failed') {
        console.log(`\n❌ JOB FAILED\n`);
        console.log(`Error: ${job.reason}`);
        console.log(`Details: ${job.errorDetails}\n`);
        return false;
      }
    };
    
    const interval = setInterval(async () => {
      if (pollCount >= maxPolls) {
        clearInterval(interval);
        console.log(`\n\n⏱️  Timeout: Job still processing after 4 minutes`);
        console.log(`The Architect Agent is working on your SDD.`);
        console.log(`Check back in a moment.\n`);
      } else {
        const shouldContinue = await checkStatus();
        if (!shouldContinue) {
          clearInterval(interval);
        }
      }
    }, 2000);
    
    await checkStatus();
    
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
  }
}

monitorSdd();
