require('dotenv').config();

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

async function verifySdd() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    const project = await db.collection('projects').findOne({});
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 SOLUTION DESIGN DOCUMENT STATUS`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Project: ${project.name}\n`);
    
    // Check JSON SDD
    console.log(`📊 JSON SDD (MongoDB):`);
    if (project.sddDocument) {
      console.log(`✅ Components: ${project.sddDocument.components?.length || 0}`);
      console.log(`✅ Risks: ${project.sddDocument.risks?.length || 0}`);
      console.log(`✅ Architecture Style: ${project.sddDocument.architectureStyle?.style || 'N/A'}`);
      console.log(`✅ Tech Stack: Frontend, Backend, Database, Infrastructure`);
    } else {
      console.log(`❌ SDD JSON not found`);
    }
    
    console.log();
    
    // Check HTML SDD
    console.log(`📄 HTML SDD (File System):`);
    if (project.sddHtmlPath) {
      console.log(`✅ Path: ${project.sddHtmlPath}`);
      if (fs.existsSync(project.sddHtmlPath)) {
        const stats = fs.statSync(project.sddHtmlPath);
        console.log(`✅ File Size: ${(stats.size / 1024).toFixed(1)} KB`);
        console.log(`✅ Status: Ready to download`);
      } else {
        console.log(`⚠️  Path exists in DB but file not found on disk`);
      }
    } else {
      console.log(`⚠️  HTML path not set in database`);
      console.log(`   Checking temp directory...\n`);
      
      // Look for SDD files in temp directory
      const tmpDir = path.join(require('os').tmpdir(), 'aadlc-pdds');
      if (fs.existsSync(tmpDir)) {
        const files = fs.readdirSync(tmpDir).filter(f => f.startsWith('SDD-'));
        if (files.length > 0) {
          console.log(`   Found ${files.length} SDD file(s) in temp directory:`);
          files.forEach(file => {
            const filePath = path.join(tmpDir, file);
            const stats = fs.statSync(filePath);
            console.log(`   - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
          });
        }
      }
    }
    
    console.log();
    console.log(`${'='.repeat(60)}`);
    console.log(`📥 HOW TO DOWNLOAD`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nEndpoint: GET /api/projects/${project._id}/sdd-download`);
    console.log(`\nExample (curl):`);
    console.log(`  curl http://localhost:5000/api/projects/${project._id}/sdd-download -o SDD.html\n`);
    
  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    await client.close();
  }
}

verifySdd();
