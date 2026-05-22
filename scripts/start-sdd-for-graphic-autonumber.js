require('dotenv').config();
const { MongoClient } = require('mongodb');
const { createJob } = require('../server/models/jobSchema');

const PROJECT_NAME_QUERY = process.argv[2] || 'Graphic Autonumber';

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'aadlc';
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const project = await db.collection('projects').findOne({
    name: { $regex: new RegExp(`^${PROJECT_NAME_QUERY}$`, 'i') }
  });

  if (!project) {
    console.error(`Project not found: "${PROJECT_NAME_QUERY}"`);
    await client.close();
    process.exit(1);
  }

  const projectId = project._id.toString();
  console.log(`Found project: ${project.name} (${projectId})`);

  const pddApproved = project.phases?.find(p => p.id === 'pdd-approved');
  const sdd = project.phases?.find(p => p.id === 'sdd');

  if (pddApproved?.status !== 'completed') {
    console.error('Aborting: PDD Approved phase is not completed yet.');
    await client.close();
    process.exit(1);
  }

  if (sdd?.status !== 'pending') {
    console.error(`Aborting: SDD phase status is "${sdd?.status}", expected "pending".`);
    await client.close();
    process.exit(1);
  }

  const existing = await db.collection('jobs').findOne({
    projectId,
    stage: 'sdd',
    status: { $in: ['pending', 'in_progress'] }
  });
  if (existing) {
    console.log(`An SDD job already exists for this project (${existing._id}, status=${existing.status}). Skipping job insert.`);
  } else {
    const job = createJob(projectId, 'sdd', { projectId }, 3);
    const result = await db.collection('jobs').insertOne(job);
    console.log(`Inserted SDD job: ${result.insertedId}`);
  }

  const updatedPhases = project.phases.map(p =>
    p.id === 'sdd' ? { ...p, status: 'in-progress', progress: 10 } : p
  );

  await db.collection('projects').findOneAndUpdate(
    { _id: project._id },
    { $set: { phases: updatedPhases, updatedAt: new Date() } }
  );
  console.log('SDD phase marked as in-progress.');

  await client.close();
  console.log('Done. The Architect Agent will pick up the job on its next poll (every 3s).');
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
