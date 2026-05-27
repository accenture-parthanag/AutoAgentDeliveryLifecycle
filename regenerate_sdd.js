require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

async function regenerateSdd() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    const project = await db.collection('projects').findOne({});
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 REGENERATING SDD WITH HTML TEMPLATE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nProject: ${project.name}`);
    console.log(`Project ID: ${project._id}\n`);
    
    // Delete old SDD job records for this project
    const deleteResult = await db.collection('jobs').deleteMany({
      projectId: project._id.toString(),
      stage: 'sdd'
    });
    
    console.log(`Cleaned up ${deleteResult.deletedCount} old SDD job(s)`);
    
    // Clear the old SDD HTML path from project
    await db.collection('projects').updateOne(
      { _id: project._id },
      { $unset: { sddHtmlPath: '' } }
    );
    
    console.log(`Cleared old SDD paths from project\n`);
    
    // Create new SDD job with latest code
    const sddJob = {
      projectId: project._id.toString(),
      stage: 'sdd',
      status: 'pending',
      context: {
        projectName: project.name,
        description: project.description,
        scope: project.scope,
        objectives: project.objectives,
        criteria: project.criteria
      },
      createdAt: new Date(),
      claimedAt: null,
      completedAt: null
    };
    
    const result = await db.collection('jobs').insertOne(sddJob);
    
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ NEW SDD JOB CREATED`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Job ID: ${result.insertedId}`);
    console.log(`Status: pending`);
    console.log(`Stage: sdd\n`);
    
    console.log(`⏳ Waiting for Architect Agent...`);
    console.log(`   Agent polls every 3 seconds`);
    console.log(`\n✓ When complete, you'll see:`);
    console.log(`  - PROCESSING SDD JOB`);
    console.log(`  - Successfully parsed SDD with N components`);
    console.log(`  - Saved HTML SDD to: /tmp/aadlc-pdds/SDD-*.html`);
    console.log(`  - Project updated with SDD (JSON + HTML)`);
    console.log(`\n📥 Then download via:`);
    console.log(`   GET /api/projects/${project._id}/sdd-download\n`);
    
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  } finally {
    await client.close();
  }
}

regenerateSdd();
