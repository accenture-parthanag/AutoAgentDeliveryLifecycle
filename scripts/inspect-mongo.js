require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'aadlc';
  if (!uri) { console.error('Missing MONGODB_URI in .env'); process.exit(1); }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const projects = await db.collection('projects').find({}).toArray();
    console.log(`PROJECTS: ${projects.length}`);
    for (const p of projects) {
      console.log('\n=== PROJECT ===');
      console.log('_id:', p._id.toString());
      console.log('name:', p.name);
      console.log('description:', p.description);
      console.log('scope:', p.scope);
      console.log('objectives:', p.objectives);
      console.log('criteria:', p.criteria);
      console.log('btLead:', p.btLead);
      console.log('status:', p.status);
      console.log('startDate:', p.startDate, 'targetDate:', p.targetDate);
      console.log('phases:', JSON.stringify(p.phases?.map(x => ({ id: x.id, status: x.status })), null, 2));
      console.log('baGaps count:', p.baGaps?.length || 0);
      if (p.baGaps) {
        for (const g of p.baGaps) {
          console.log(`  Q${g.id} [${g.category} | ${g.complexity}]: ${g.question}`);
        }
      }
      console.log('btResponses keys:', Object.keys(p.btResponses || {}));
      if (p.btResponses) {
        for (const [gid, resp] of Object.entries(p.btResponses)) {
          const txt = typeof resp === 'object' ? resp.text : resp;
          console.log(`  A${gid}: ${(txt || '').substring(0, 300)}${(txt || '').length > 300 ? '...' : ''}`);
        }
      }
      console.log('changeRequests:', (p.changeRequests || []).length);
      console.log('createdAt:', p.createdAt, 'updatedAt:', p.updatedAt);
    }

    const jobs = await db.collection('jobs').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    console.log(`\n=== RECENT JOBS (${jobs.length}) ===`);
    for (const j of jobs) {
      console.log(`${j._id}  stage=${j.stage}  status=${j.status}  projectId=${j.projectId}  pddFilePath=${j.context?.pddFilePath || ''}`);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await client.close();
  }
})();
