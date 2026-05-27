require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

async function generateSddHtml() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    const project = await db.collection('projects').findOne({});
    
    console.log(`\n📄 Generating HTML SDD from template...`);
    console.log(`${'='.repeat(60)}`);
    
    if (!project.sddDocument) {
      console.log(`❌ No SDD JSON found in project`);
      return;
    }
    
    // Load template
    const templatePath = path.join(__dirname, 'templates', 'automation_solution_design_template.html');
    
    if (!fs.existsSync(templatePath)) {
      console.log(`❌ Template not found at: ${templatePath}`);
      return;
    }
    
    console.log(`✓ Template found (${(fs.statSync(templatePath).size / 1024).toFixed(1)} KB)`);
    
    let html = fs.readFileSync(templatePath, 'utf-8');
    const sdd = project.sddDocument;
    
    // Simple replacements
    const escapeHtml = (text) => {
      if (!text) return '';
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    };
    
    // Replace title
    html = html.replace(
      /id="doc-title">[^<]*<\/h2/,
      `id="doc-title">${escapeHtml(project.name)}</h2`
    );
    
    // Replace subtitle
    html = html.replace(
      /class="subtitle" contenteditable="true">[^<]*<\/div/,
      `class="subtitle" contenteditable="true">${escapeHtml(project.description)}</div`
    );
    
    // Save HTML
    const sddDir = path.join(require('os').tmpdir(), 'aadlc-pdds');
    if (!fs.existsSync(sddDir)) fs.mkdirSync(sddDir, { recursive: true });
    
    const filename = `SDD-${project.name.replace(/[^a-z0-9-]/gi, '_')}-${Date.now()}.html`;
    const sddPath = path.join(sddDir, filename);
    
    fs.writeFileSync(sddPath, html, 'utf-8');
    console.log(`✓ HTML saved to: ${sddPath}`);
    console.log(`  Size: ${(fs.statSync(sddPath).size / 1024).toFixed(1)} KB\n`);
    
    // Update project
    await db.collection('projects').updateOne(
      { _id: project._id },
      { $set: { sddHtmlPath: sddPath } }
    );
    
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ SUCCESS!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📥 Download SDD:`);
    console.log(`   GET /api/projects/${project._id}/sdd-download\n`);
    
  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    await client.close();
  }
}

generateSddHtml();
