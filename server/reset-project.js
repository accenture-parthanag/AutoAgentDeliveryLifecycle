const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://admin:helloworld@127.0.0.1:27017/?authSource=admin';
const client = new MongoClient(uri);

async function resetProject() {
  try {
    await client.connect();
    const db = client.db('agent_automation');
    const projects = db.collection('projects');

    const projectId = '6a103a49173f1d4bb854a153';

    const result = await projects.updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          phases: [
            { id: 'pdd-review', label: 'PDD Review (By BA)', icon: 'security', status: 'completed', progress: 100 },
            { id: 'awaiting-bt', label: 'Awaiting BT Response', icon: 'forum', status: 'completed', progress: 100 },
            { id: 'pdd-approved', label: 'PDD Approved', icon: 'check_circle', status: 'completed', progress: 100 },
            { id: 'sdd', label: 'SDD In Progress', icon: 'architecture', status: 'pending', progress: 0 },
            { id: 'tdd', label: 'TDD In Progress', icon: 'account_tree', status: 'pending', progress: 0 },
            { id: 'dev', label: 'Development In Progress', icon: 'code', status: 'pending', progress: 0 },
            { id: 'test-cases', label: 'Test Cases Creation', icon: 'description', status: 'pending', progress: 0 },
            { id: 'sit', label: 'SIT In Progress', icon: 'verified', status: 'pending', progress: 0 },
            { id: 'uat', label: 'UAT Phase', icon: 'check_circle', status: 'pending', progress: 0 }
          ],
          sddDocument: null,
          sddJobId: null,
          tddDocument: null,
          tddJobId: null,
          updatedAt: new Date()
        }
      }
    );

    console.log('✅ Project reset successfully');
    console.log(`Modified ${result.modifiedCount} document(s)`);

    // Now create the SDD job for Architect Agent
    const jobs = db.collection('jobs');
    const jobResult = await jobs.insertOne({
      projectId: projectId,
      stage: 'sdd',
      status: 'pending',
      priority: 3,
      agentType: 'architect',
      context: {
        projectName: 'Graphics Autonumbering'
      },
      result: null,
      claimedAt: null,
      completedAt: null,
      durationMs: null,
      tokenMetrics: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ SDD job created for Architect Agent');
    console.log(`Job ID: ${jobResult.insertedId}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

resetProject();
