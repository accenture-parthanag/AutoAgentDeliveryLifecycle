require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'aadlc');

  const project = await db.collection('projects').findOne({});
  if (!project) {
    console.log('No projects in database.');
    await client.close();
    return;
  }

  console.log('=== PROJECT ===');
  console.log('_id        :', project._id.toString());
  console.log('name       :', project.name);
  console.log('description:', project.description);
  console.log('scope      :', project.scope);
  console.log('objectives :', project.objectives);
  console.log('criteria   :', project.criteria);
  console.log('updatedAt  :', project.updatedAt);
  console.log('phases     :', JSON.stringify(project.phases, null, 2));
  console.log('\nbaGaps count       :', (project.baGaps || []).length);
  console.log('btResponses keys   :', Object.keys(project.btResponses || {}));

  console.log('\n=== EXISTING sddDocument ===');
  console.log(JSON.stringify(project.sddDocument, null, 2));

  console.log('\n=== ALL JOBS FOR THIS PROJECT ===');
  const jobs = await db.collection('jobs')
    .find({ projectId: project._id.toString() })
    .sort({ createdAt: 1 })
    .toArray();
  for (const j of jobs) {
    console.log(`- ${j._id} | stage=${j.stage} | status=${j.status} | file=${j.context?.pddFilePath || ''}`);
    if (j.reason) console.log(`  reason: ${j.reason}`);
  }

  const outDir = path.join(__dirname, '..', 'tmp-pdd-analysis');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'project-dump.json'),
    JSON.stringify(project, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(outDir, 'jobs-dump.json'),
    JSON.stringify(jobs, null, 2),
    'utf-8'
  );
  console.log('\nWrote project-dump.json and jobs-dump.json to', outDir);

  await client.close();
})();
