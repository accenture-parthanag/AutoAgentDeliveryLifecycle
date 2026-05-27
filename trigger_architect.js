require('dotenv').config({ path: process.cwd() + '/.env' });

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

async function triggerArchitectAgent() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log(`\n📊 Checking MongoDB: ${MONGODB_DB}`);
    console.log(`${'='.repeat(60)}`);
    
    // Get all projects
    const projects = await db.collection('projects').find({}).toArray();
    console.log(`✓ Found ${projects.length} project(s)\n`);
    
    if (projects.length === 0) {
      console.log('❌ No projects found in database.');
      return;
    }
    
    // Process the first (and only) project
    const project = projects[0];
    console.log(`📋 Project Name: ${project.name}`);
    console.log(`   Project ID: ${project._id}`);
    console.log(`   BA Gaps: ${project.baGaps?.length || 0}`);
    console.log(`   BT Responses: ${Object.keys(project.btResponses || {}).length}`);
    console.log(`   SDD Already Generated: ${!!project.sddDocument ? 'YES' : 'NO'}\n`);
    
    // Check if BA Agent has completed (baGaps should exist)
    if (!project.baGaps || project.baGaps.length === 0) {
      console.log('⚠️  WARNING: BA Agent has not completed gap analysis yet.');
      console.log('   The project needs baGaps before Architect Agent can proceed.');
      console.log('   Make sure the BA Agent has finished processing.');
      return;
    }
    
    console.log(`${'='.repeat(60)}`);
    console.log(`🏛️  TRIGGERING ARCHITECT AGENT`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Check if an SDD job already exists for this project
    const existingJob = await db.collection('jobs').findOne({
      projectId: project._id.toString(),
      stage: 'sdd'
    });
    
    if (existingJob) {
      console.log(`ℹ️  Existing SDD job found: ${existingJob._id}`);
      console.log(`   Status: ${existingJob.status}`);
      if (existingJob.status === 'completed') {
        console.log(`   ✓ Job already completed`);
      } else if (existingJob.status === 'in_progress') {
        console.log(`   ⏳ Job is in progress, will retry if stuck after 5 minutes`);
      } else if (existingJob.status === 'pending') {
        console.log(`   ⏳ Job is pending, will be picked up by next poll`);
      } else if (existingJob.status === 'failed') {
        console.log(`   ❌ Job failed: ${existingJob.reason}`);
        console.log(`   Creating new job to retry...\n`);
        // Create new job to retry
        await createSddJob(db, project);
      }
      return;
    }
    
    // Create new SDD job
    await createSddJob(db, project);
    
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  } finally {
    await client.close();
  }
}

async function createSddJob(db, project) {
  // Create SDD job
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
  
  console.log(`✅ SDD Job Created`);
  console.log(`   Job ID: ${result.insertedId}`);
  console.log(`   Project: ${project.name}`);
  console.log(`   Stage: sdd`);
  console.log(`   Status: pending\n`);
  
  console.log(`${'='.repeat(60)}`);
  console.log(`⏳ WAITING FOR ARCHITECT AGENT`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nThe Architect Agent polls for SDD jobs every 3 seconds.`);
  console.log(`Your job will be processed shortly.\n`);
  console.log(`Watch for these logs:`);
  console.log(`  ✓ PROCESSING SDD JOB`);
  console.log(`  ✓ Successfully parsed SDD with N components`);
  console.log(`  ✓ Saved HTML SDD to: /tmp/aadlc-pdds/SDD-*.html\n`);
}

triggerArchitectAgent();
