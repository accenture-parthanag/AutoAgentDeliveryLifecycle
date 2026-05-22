require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PDFParse = require('pdf-parse');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

const PROMPT_PATH = path.join(__dirname, '..', '..', 'Prompts', 'architect-agent.md');
let promptTemplate;

function loadPromptTemplate() {
  promptTemplate = fs.readFileSync(PROMPT_PATH, 'utf-8');
  console.log(`✓ Loaded Architect prompt template from ${PROMPT_PATH}`);
}

function renderPrompt(vars) {
  return promptTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

let db;

async function connectDb() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(MONGODB_DB);
  console.log(`✓ Architect Agent connected to MongoDB: ${MONGODB_DB}`);
}

function formatBaGaps(baGaps) {
  if (!Array.isArray(baGaps) || baGaps.length === 0) {
    return '(no BA gaps were recorded for this project)';
  }
  return baGaps
    .map(g => `Q${g.id} [${g.category} / ${g.complexity}]: ${g.question}`)
    .join('\n');
}

function formatBtResponses(btResponses, baGaps) {
  if (!btResponses || Object.keys(btResponses).length === 0) {
    return '(BT team has not provided any responses)';
  }
  const gapById = {};
  if (Array.isArray(baGaps)) {
    for (const g of baGaps) gapById[String(g.id)] = g.question;
  }
  return Object.entries(btResponses)
    .map(([gapId, resp]) => {
      const question = gapById[gapId] || '(unknown question)';
      const text = typeof resp === 'string' ? resp : (resp?.text || '(no answer)');
      return `Q${gapId}: ${question}\nA: ${text}`;
    })
    .join('\n\n');
}

async function readPddContent(projectId) {
  const pddJob = await db.collection('jobs').findOne(
    { projectId, stage: 'pdd_review', 'context.pddFilePath': { $exists: true } },
    { sort: { createdAt: -1 } }
  );

  if (!pddJob?.context?.pddFilePath) {
    console.error(`⚠️  No PDD file path found for project ${projectId}`);
    return 'No PDD file available';
  }

  const filePath = pddJob.context.pddFilePath;
  if (!fs.existsSync(filePath)) {
    console.error(`⚠️  PDD file not found on disk: ${filePath}`);
    return 'PDD file not found on disk';
  }

  try {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      const buffer = fs.readFileSync(filePath);
      const pdfData = await PDFParse(buffer);
      console.log(`✓ Extracted ${pdfData.text.length} bytes from PDF (${pdfData.numpages} pages)`);
      return pdfData.text;
    }
    const text = fs.readFileSync(filePath, 'utf-8');
    console.log(`✓ Read ${text.length} bytes from PDD file`);
    return text;
  } catch (readErr) {
    console.error(`⚠️  Error reading PDD file: ${readErr.message}`);
    return `File reading error: ${readErr.message}`;
  }
}

function generateSddWithClaude(project, fileContent) {
  const prompt = renderPrompt({
    projectName: project.name,
    description: project.description,
    scope: project.scope,
    objectives: project.objectives,
    criteria: project.criteria,
    fileContent,
    baGaps: formatBaGaps(project.baGaps),
    btResponses: formatBtResponses(project.btResponses, project.baGaps),
  });

  try {
    console.log(`\n📝 Architect Agent Prompt:`);
    console.log(`${'='.repeat(60)}`);
    console.log(prompt.substring(0, 300) + '...');
    console.log(`${'='.repeat(60)}`);
    console.log(`   Prompt size: ${(prompt.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`\n🔄 Calling Claude CLI...`);

    const command = `claude --output-format json`;
    let output;
    try {
      output = execSync(command, {
        input: prompt,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (execErr) {
      console.error(`Claude CLI exit code: ${execErr.status}`);
      console.error(`Claude CLI stderr: ${execErr.stderr?.toString() || 'N/A'}`);
      console.error(`Claude CLI stdout: ${execErr.stdout?.toString() || 'N/A'}`);
      throw execErr;
    }
    console.log(`✓ Claude CLI returned response`);

    const payload = JSON.parse(output);
    const responseText = payload.result || payload.response || '';

    console.log(`📊 Response text (first 200 chars): ${responseText.substring(0, 200)}`);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`⚠️  No JSON object found in response. Full response: ${responseText}`);
      throw new Error('No JSON object found in response');
    }

    const sdd = JSON.parse(jsonMatch[0]);
    console.log(`✓ Successfully parsed SDD with ${sdd.components?.length || 0} components`);
    return sdd;
  } catch (err) {
    console.error('❌ Error calling Claude CLI:', err.message);
    throw new Error('Failed to generate SDD with Claude: ' + err.message);
  }
}

async function pollAndProcess() {
  try {
    const jobsCollection = db.collection('jobs');
    const projectsCollection = db.collection('projects');

    const pendingCount = await jobsCollection.countDocuments({
      stage: 'sdd',
      status: 'pending'
    });

    if (Math.random() < 0.1) {
      const inProgressCount = await jobsCollection.countDocuments({
        stage: 'sdd',
        status: 'in_progress'
      });
      console.log(`\n📊 Architect Queue Status: pending=${pendingCount} in_progress=${inProgressCount}`);
    }

    if (pendingCount > 0) {
      console.log(`\n✅ Found ${pendingCount} pending SDD job(s) in queue!`);
    }

    const job = await jobsCollection.findOneAndUpdate(
      { stage: 'sdd', status: 'pending' },
      { $set: { status: 'in_progress', claimedAt: new Date() } },
      { returnDocument: 'after' }
    );

    const jobData = job?.value || job;

    if (!jobData) {
      const stuckJobs = await jobsCollection.find({
        stage: 'sdd',
        status: 'in_progress',
        claimedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
      }).toArray();

      if (stuckJobs.length > 0) {
        console.log(`\n⚠️  Found ${stuckJobs.length} stuck SDD job(s), retrying...`);
        for (const stuckJob of stuckJobs) {
          await jobsCollection.updateOne(
            { _id: stuckJob._id },
            { $set: { status: 'pending', claimedAt: null } }
          );
        }
      }
      return;
    }

    console.error(`\n${'='.repeat(60)}`);
    console.error(`🏛️  PROCESSING SDD JOB`);
    console.error(`   Job ID: ${jobData._id}`);
    console.error(`   Project ID: ${jobData.projectId}`);
    console.error(`${'='.repeat(60)}`);

    try {
      console.error(`STEP 1: Looking up project...`);
      const project = await projectsCollection.findOne({
        _id: new ObjectId(jobData.projectId)
      });

      if (!project) {
        throw new Error(`Project not found with ID: ${jobData.projectId}`);
      }
      console.error(`✓ STEP 1 DONE: Project "${project.name}" found`);

      console.error(`STEP 2: Loading PDD content...`);
      const fileContent = await readPddContent(jobData.projectId);
      console.error(`✓ STEP 2 DONE`);

      console.error(`STEP 3: Calling Claude to generate SDD...`);
      const sdd = generateSddWithClaude(project, fileContent);
      console.error(`✓ STEP 3 DONE`);

      console.error(`STEP 4: Updating project with SDD...`);
      const updatedPhases = (project.phases || []).map(p =>
        p.id === 'sdd' ? { ...p, status: 'completed', progress: 100 } : p
      );

      await projectsCollection.findOneAndUpdate(
        { _id: project._id },
        {
          $set: {
            sddDocument: sdd,
            sddJobId: jobData._id.toString(),
            phases: updatedPhases,
            updatedAt: new Date()
          }
        }
      );
      console.error(`✓ STEP 4 DONE: Project updated with SDD`);

      console.error(`STEP 5: Marking job as completed...`);
      await jobsCollection.findOneAndUpdate(
        { _id: jobData._id },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            result: {
              componentsDesigned: sdd.components?.length || 0,
              risksIdentified: sdd.risks?.length || 0
            }
          }
        }
      );
      console.error(`✓ STEP 5 DONE`);

      console.error(`\n🎉 SUCCESS! SDD generated for "${project.name}"`);
      console.error(`${'='.repeat(60)}`);
    } catch (err) {
      console.error(`\n❌ ERROR IN PROCESSING`);
      console.error(`Message: ${err.message}`);
      console.error(`Stack: ${err.stack}`);

      try {
        await jobsCollection.findOneAndUpdate(
          { _id: jobData._id },
          {
            $set: {
              status: 'failed',
              failedAt: new Date(),
              reason: err.message,
              errorDetails: err.stack
            }
          }
        );
        console.error(`✓ Job marked as FAILED in database`);
      } catch (dbErr) {
        console.error(`✗ Failed to mark job as failed: ${dbErr.message}`);
      }
    }
  } catch (err) {
    console.error('Error in Architect polling loop:', err.message);
  }
}

async function start() {
  try {
    loadPromptTemplate();
    await connectDb();
    console.log(`\n🏛️  Architect Agent started`);
    console.log(`   Polling for sdd jobs every 3 seconds...`);
    console.log(`   Press Ctrl+C to stop\n`);

    setInterval(pollAndProcess, 3000);
  } catch (error) {
    console.error('Failed to start Architect Agent:', error);
    process.exit(1);
  }
}

start();
