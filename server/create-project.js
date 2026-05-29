const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { MongoClient, ObjectId } = require('mongodb');

const pddPath = 'C:\\Users\\partha.nag\\Downloads\\PDD_Graphic Tracker Autonumbering_v1.2_latest.docx';

async function createProject() {
  try {
    // Extract DOCX content
    const buffer = fs.readFileSync(pddPath);
    const result = await mammoth.extractRawText({ buffer });
    const pddText = result.value;

    console.log('✓ Extracted PDD text:', pddText.substring(0, 200) + '...');

    // Connect to MongoDB
    const uri = 'mongodb://admin:helloworld@127.0.0.1:27017/?authSource=admin';
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('agent_automation');

    // Create new project
    const newProject = {
      name: 'Graphic Tracker Autonumbering',
      description: 'Automate graphic reference numbering and tracking in document processing workflows',
      scope: 'Implement automated solution for tracking and autonumbering graphic references in technical documentation',
      objectives: 'Reduce manual effort in graphic numbering, improve consistency, and enable real-time tracking',
      criteria: 'Solution must handle multiple file formats, maintain version history, and integrate with existing document management systems',
      btLead: 'BT Team',
      techStack: 'Python',
      complexity: 'medium',
      pddFile: pddPath,
      pddContent: pddText,
      phases: [
        { id: 'pdd-review', label: 'PDD Review (By BA)', icon: 'security', status: 'pending', progress: 0 },
        { id: 'awaiting-bt', label: 'Awaiting BT Response', icon: 'forum', status: 'pending', progress: 0 },
        { id: 'pdd-approved', label: 'PDD Approved', icon: 'check_circle', status: 'pending', progress: 0 },
        { id: 'sdd', label: 'SDD In Progress', icon: 'architecture', status: 'pending', progress: 0 },
        { id: 'tdd', label: 'TDD In Progress', icon: 'account_tree', status: 'pending', progress: 0 },
        { id: 'dev', label: 'Development In Progress', icon: 'code', status: 'pending', progress: 0 },
        { id: 'test-cases', label: 'Test Cases Creation', icon: 'description', status: 'pending', progress: 0 },
        { id: 'sit', label: 'SIT In Progress', icon: 'verified', status: 'pending', progress: 0 },
        { id: 'uat', label: 'UAT Phase', icon: 'check_circle', status: 'pending', progress: 0 }
      ],
      baGaps: [],
      btResponses: {},
      humanReviewTimings: [],
      changeRequests: [],
      pddVersions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result2 = await db.collection('projects').insertOne(newProject);
    const projectId = result2.insertedId.toString();

    console.log('✓ New project created');
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Name: ${newProject.name}`);

    // Create initial PDD review job for BA Agent
    const jobResult = await db.collection('jobs').insertOne({
      projectId: result2.insertedId,
      stage: 'pdd_review',
      status: 'pending',
      priority: 1,
      agentType: 'ba',
      context: {
        projectName: newProject.name,
        description: newProject.description,
        scope: newProject.scope,
        objectives: newProject.objectives,
        criteria: newProject.criteria,
        pddFilePath: pddPath
      },
      result: null,
      claimedAt: null,
      completedAt: null,
      durationMs: null,
      tokenMetrics: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✓ PDD review job created for BA Agent');
    console.log(`   Job ID: ${jobResult.insertedId.toString()}`);

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createProject();
