require('dotenv').config();

const { MongoClient } = require('mongodb');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'agent_automation';

async function checkSdd() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    const project = await db.collection('projects').findOne({});
    
    console.log(`\n📋 Project: ${project.name}`);
    console.log(`${'='.repeat(60)}`);
    
    // Check JSON SDD
    if (project.sddDocument) {
      console.log(`✅ JSON SDD: Stored in MongoDB`);
      console.log(`   Components: ${project.sddDocument.components?.length || 0}`);
      console.log(`   Risks: ${project.sddDocument.risks?.length || 0}`);
      console.log(`   Tech Stack: ${project.sddDocument.techStack ? '✓' : '✗'}`);
    } else {
      console.log(`❌ JSON SDD: Not found`);
    }
    
    console.log();
    
    // Check HTML SDD
    if (project.sddHtmlPath) {
      console.log(`✅ HTML SDD Path: ${project.sddHtmlPath}`);
      if (fs.existsSync(project.sddHtmlPath)) {
        const stats = fs.statSync(project.sddHtmlPath);
        console.log(`   File Size: ${(stats.size / 1024).toFixed(1)} KB`);
        console.log(`   Status: ✓ File exists on disk`);
      } else {
        console.log(`   Status: ⚠️  File referenced but not found on disk`);
      }
    } else {
      console.log(`❌ HTML SDD Path: Not set (old generation without HTML)`);
    }
    
    console.log();
    console.log(`${'='.repeat(60)}`);
    console.log(`📥 Download SDD:`);
    console.log(`   GET /api/projects/${project._id}/sdd-download`);
    console.log();
    
  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    await client.close();
  }
}

checkSdd();
