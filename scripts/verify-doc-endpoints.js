/**
 * Verify that the SDD and TDD docx builders produce real files using the
 * exact same path the API endpoint takes (read project from Mongo + manifest
 * + call the shared builder).
 */
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { buildSddDocx, buildTddDocx } = require('../server/agents/doc-builders');

const OUT = path.join(__dirname, '..', 'tmp-pdd-analysis', 'verify-downloads');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db(process.env.MONGODB_DB || 'aadlc');
  const project = await db.collection('projects').findOne({});
  console.log(`Project: ${project.name} (${project._id})`);

  // Mimic the SDD endpoint
  const sdd = await buildSddDocx({
    project,
    sdd: project.sddDocument,
    imageManifest: project.sddPddImages || []
  });
  const sddPath = path.join(OUT, sdd.fileName);
  fs.writeFileSync(sddPath, sdd.buffer);
  console.log(`SDD docx: ${sddPath} (${sdd.buffer.length} bytes)`);

  // Mimic the TDD endpoint
  const tdd = await buildTddDocx({
    project,
    tdd: project.tddDocument,
    imageManifest: project.sddPddImages || []
  });
  const tddPath = path.join(OUT, tdd.fileName);
  fs.writeFileSync(tddPath, tdd.buffer);
  console.log(`TDD docx: ${tddPath} (${tdd.buffer.length} bytes)`);

  // Validate they are real zip-based docx files: first bytes should be 'PK'
  for (const p of [sddPath, tddPath]) {
    const fd = fs.openSync(p, 'r');
    const head = Buffer.alloc(4);
    fs.readSync(fd, head, 0, 4, 0);
    fs.closeSync(fd);
    console.log(`  ${path.basename(p)} header: ${head.toString('hex')} (PK\\x03\\x04 expected)`);
  }

  await c.close();
})();
