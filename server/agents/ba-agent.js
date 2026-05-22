require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PDFParse = require('pdf-parse');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

const PROMPT_PATH = path.join(__dirname, '..', '..', 'Prompts', 'ba-agent.md');
let promptTemplate;

function loadPromptTemplate() {
  promptTemplate = fs.readFileSync(PROMPT_PATH, 'utf-8');
  console.log(`✓ Loaded BA prompt template from ${PROMPT_PATH}`);
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
  console.log(`✓ BA Agent connected to MongoDB: ${MONGODB_DB}`);
}

// Call Claude CLI to analyze PDD and generate gaps
function generateGapsWithClaude(projectData, fileContent) {
  const prompt = renderPrompt({
    projectName: projectData.projectName,
    description: projectData.description,
    scope: projectData.scope,
    objectives: projectData.objectives,
    criteria: projectData.criteria,
    fileContent,
  });

  try {
    console.log(`\n📝 BA Agent Prompt:`);
    console.log(`${'='.repeat(60)}`);
    console.log(prompt.substring(0, 300) + '...');
    console.log(`${'='.repeat(60)}`);
    console.log(`\n🔄 Calling Claude CLI...`);

    // Call claude CLI with the prompt via stdin (for large prompts)
    const command = `claude --output-format json`;
    console.log(`\n💻 Executing Claude CLI command (via stdin)...`);
    console.log(`   Prompt size: ${(prompt.length / 1024 / 1024).toFixed(2)} MB`);

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

    // Parse the JSON response
    const payload = JSON.parse(output);
    const responseText = payload.result || payload.response || '';

    console.log(`📊 Response text (first 200 chars): ${responseText.substring(0, 200)}`);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`⚠️  No JSON array found in response. Full response: ${responseText}`);
      throw new Error('No JSON array found in response');
    }

    const gaps = JSON.parse(jsonMatch[0]);
    console.log(`✓ Successfully parsed ${gaps.length} gaps from response`);
    return gaps;
  } catch (err) {
    console.error('❌ Error calling Claude CLI:', err.message);
    console.error(`   Full error: ${err.toString()}`);
    throw new Error('Failed to analyze PDD with Claude: ' + err.message);
  }
}

// Poll for pending jobs
async function pollAndProcess() {
  try {
    const jobsCollection = db.collection('jobs');
    const projectsCollection = db.collection('projects');

    // Diagnostic: Check total jobs in database
    const totalJobs = await jobsCollection.countDocuments({});
    const pendingCount = await jobsCollection.countDocuments({
      stage: 'pdd_review',
      status: 'pending'
    });

    const inProgressCount = await jobsCollection.countDocuments({
      stage: 'pdd_review',
      status: 'in_progress'
    });

    // Log status every 10 polls (every 30 seconds)
    if (Math.random() < 0.1) {
      console.log(`\n📊 Queue Status:`);
      console.log(`   Total jobs: ${totalJobs}`);
      console.log(`   Pending pdd_review: ${pendingCount}`);
      console.log(`   In Progress pdd_review: ${inProgressCount}`);
    }

    if (pendingCount > 0) {
      console.log(`\n✅ Found ${pendingCount} pending job(s) in queue!`);
    }

    // Find a pending pdd_review job
    console.log(`\n🔎 Attempting to claim a pending job...`);
    const job = await jobsCollection.findOneAndUpdate(
      { stage: 'pdd_review', status: 'pending' },
      { $set: { status: 'in_progress', claimedAt: new Date() } },
      { returnDocument: 'after' }
    );

    console.error(`DEBUG: findOneAndUpdate result:`, JSON.stringify(job, null, 2));

    const jobData = job?.value || job;
    console.log(`   Job claim result: ${jobData ? 'SUCCESS' : 'NO_JOB_FOUND'}`);
    if (jobData) {
      console.log(`   Claimed job ID: ${jobData._id}`);
    }

    if (!jobData) {
      console.log(`   No pending job found. Checking for stuck jobs...`);
      // Check for stuck jobs (in_progress for too long)
      const stuckJobs = await jobsCollection.find({
        stage: 'pdd_review',
        status: 'in_progress',
        claimedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // Stuck for 5+ minutes
      }).toArray();

      if (stuckJobs.length > 0) {
        console.log(`\n⚠️  Found ${stuckJobs.length} stuck job(s), retrying...`);
        for (const stuckJob of stuckJobs) {
          await jobsCollection.updateOne(
            { _id: stuckJob._id },
            { $set: { status: 'pending', claimedAt: null } }
          );
        }
      }

      return;
    }

    console.log(`\n✅ Job claimed successfully, proceeding to process...`);
    console.error(`\n${'='.repeat(60)}`);
    console.error(`📋 PROCESSING JOB STARTED`);
    console.error(`   Job ID: ${jobData._id}`);
    console.error(`   Project ID: ${jobData.projectId}`);
    console.error(`   Project: ${jobData.context.projectName}`);
    console.error(`   Stage: ${jobData.stage}`);
    console.error(`   PDD File Path: ${jobData.context.pddFilePath || 'NOT SET'}`);
    console.error(`${'='.repeat(60)}`);

    console.error(`\n>> ENTERING PROCESSING LOGIC <<`);

    try {
      console.error(`STEP 1: Looking up project...`);
      const project = await projectsCollection.findOne({
        _id: new ObjectId(jobData.projectId)
      });

      if (!project) {
        throw new Error(`Project not found with ID: ${jobData.projectId}`);
      }
      console.error(`✓ STEP 1 DONE: Project found`);

      console.error(`STEP 2: Reading and extracting PDD file...`);
      let fileContent = 'No file content provided';
      if (jobData.context.pddFilePath) {
        const filePath = jobData.context.pddFilePath;
        console.error(`  Checking file: ${filePath}`);
        if (fs.existsSync(filePath)) {
          try {
            // Check if it's a PDF file
            if (filePath.toLowerCase().endsWith('.pdf')) {
              console.error(`  Extracting text from PDF...`);
              const fileBuffer = fs.readFileSync(filePath);
              const pdfData = await PDFParse(fileBuffer);
              fileContent = pdfData.text;
              console.error(`✓ STEP 2 DONE: Extracted ${fileContent.length} bytes from PDF (${pdfData.numpages} pages)`);
            } else {
              // For non-PDF files, read as text
              fileContent = fs.readFileSync(filePath, 'utf-8');
              console.error(`✓ STEP 2 DONE: Read ${fileContent.length} bytes`);
            }
          } catch (readErr) {
            console.error(`⚠️  Error reading file: ${readErr.message}`);
            fileContent = `File reading error: ${readErr.message}`;
          }
        } else {
          console.error(`⚠️  File not found at: ${filePath}`);
          fileContent = 'PDD file not found on disk';
        }
      } else {
        console.error(`⚠️  No pddFilePath in context. Keys: ${Object.keys(jobData.context).join(', ')}`);
      }

      console.error(`STEP 3: Calling Claude API...`);
      const gaps = generateGapsWithClaude(jobData.context, fileContent);
      console.error(`✓ STEP 3 DONE: Got ${gaps.length} gaps`);

      console.error(`STEP 4: Updating project with gaps...`);
      const projectUpdateResult = await projectsCollection.findOneAndUpdate(
        { _id: project._id },
        {
          $set: {
            baGaps: gaps,
            baReviewJobId: jobData._id.toString(),
            'phases.0.status': 'completed',
            updatedAt: new Date()
          }
        }
      );
      console.error(`✓ STEP 4 DONE: Project updated`);

      console.error(`STEP 5: Marking job as completed...`);
      const jobCompleteResult = await jobsCollection.findOneAndUpdate(
        { _id: jobData._id },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            result: {
              gapsGenerated: gaps.length,
              gapIds: gaps.map(g => g.id)
            }
          }
        }
      );
      console.error(`✓ STEP 5 DONE: Job marked completed`);

      console.error(`\n🎉 SUCCESS! Processed ${gaps.length} gaps`);
      console.error(`${'='.repeat(60)}`);
    } catch (err) {
      console.error(`\n❌ ❌ ❌ ERROR IN PROCESSING ❌ ❌ ❌`);
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
    console.error('Error in polling loop:', err.message);
  }
}

// Main agent loop
async function start() {
  try {
    loadPromptTemplate();
    await connectDb();
    console.log(`\n🤖 BA Agent started`);
    console.log(`   Polling for pdd_review jobs every 3 seconds...`);
    console.log(`   Press Ctrl+C to stop\n`);

    // Poll every 3 seconds
    setInterval(pollAndProcess, 3000);
  } catch (error) {
    console.error('Failed to start BA Agent:', error);
    process.exit(1);
  }
}

start();
