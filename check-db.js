require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'agent_automation');

    const jobCount = await db.collection('jobs').countDocuments({});
    const projectCount = await db.collection('projects').countDocuments({});

    console.log('📊 Current Database State:');
    console.log('   Projects: ' + projectCount);
    console.log('   Jobs: ' + jobCount);

    if (jobCount > 0) {
      const jobs = await db.collection('jobs').find({}).toArray();
      console.log('\n📋 Jobs:');
      jobs.forEach(job => {
        console.log('   - ID: ' + job._id);
        console.log('     Stage: ' + job.stage + ', Status: ' + job.status);
        console.log('     Project: ' + (job.context?.projectName || 'N/A'));
        if (job.context?.pddFilePath) {
          console.log('     File Path: ' + job.context.pddFilePath);
        }
      });
    }

    await client.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
