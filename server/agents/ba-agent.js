require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PDFParse = require('pdf-parse');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

const PROMPT_PATH = path.join(__dirname, '..', '..', 'Prompts', 'ba-agent.md');
const FINAL_PDD_PROMPT_PATH = path.join(__dirname, '..', '..', 'Prompts', 'ba-agent-final-pdd.md');
let promptTemplate;
let finalPddPromptTemplate;

function loadPromptTemplate() {
  promptTemplate = fs.readFileSync(PROMPT_PATH, 'utf-8');
  finalPddPromptTemplate = fs.readFileSync(FINAL_PDD_PROMPT_PATH, 'utf-8');
  console.log(`✓ Loaded BA prompt templates`);
}

function renderPrompt(vars) {
  return promptTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function renderFinalPddPrompt(vars) {
  return finalPddPromptTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) =>
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

// Helper: Format gaps for Final PDD prompt
function formatBaGaps(baGaps) {
  if (!Array.isArray(baGaps) || baGaps.length === 0) return '(no BA gaps recorded)';
  return baGaps
    .map(g => `Q${g.id} [${g.category} / ${g.complexity}]: ${g.question}`)
    .join('\n');
}

// Helper: Format BT responses for Final PDD prompt
function formatBtResponses(btResponses, baGaps) {
  if (!btResponses || Object.keys(btResponses).length === 0) return '(no BT responses)';
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

// Call Claude CLI to generate final HTML PDD
function generateFinalPddWithClaude(vars) {
  const prompt = renderFinalPddPrompt(vars);

  console.log(`\n📄 Final PDD Prompt size: ${(prompt.length / 1024).toFixed(1)} KB`);
  console.log(`🔄 Calling Claude CLI for Final PDD...`);

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
    console.error(`Claude CLI stderr: ${execErr.stderr?.toString() || 'N/A'}`);
    throw execErr;
  }

  const payload = JSON.parse(output);
  const responseText = payload.result || payload.response || '';

  // Response should start with <!DOCTYPE html>
  const htmlStart = responseText.indexOf('<!DOCTYPE html>');
  if (htmlStart === -1) {
    throw new Error('Claude did not return an HTML document for Final PDD');
  }
  return responseText.slice(htmlStart);
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

    // Extract JSON from response (try object format first, fallback to array for legacy)
    let parsed;
    const objectMatch = responseText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      parsed = JSON.parse(objectMatch[0]);
      const gaps = parsed.questions || parsed;
      const processFlow = parsed.processFlow || null;
      console.log(`✓ Successfully parsed ${gaps.length} gaps and processFlow from response`);
      return { gaps, processFlow };
    } else {
      const arrayMatch = responseText.match(/\[[\s\S]*\]/);
      if (!arrayMatch) {
        console.error(`⚠️  No JSON found in response. Full response: ${responseText}`);
        throw new Error('No JSON found in response');
      }
      const gaps = JSON.parse(arrayMatch[0]);
      console.log(`✓ Successfully parsed ${gaps.length} gaps from legacy array response`);
      return { gaps, processFlow: null };
    }
  } catch (err) {
    console.error('❌ Error calling Claude CLI:', err.message);
    console.error(`   Full error: ${err.toString()}`);
    throw new Error('Failed to analyze PDD with Claude: ' + err.message);
  }
}

// Process a pdd_finalize job - generate final HTML PDD
async function processFinalPddJob(jobData) {
  const jobsCollection = db.collection('jobs');
  const projectsCollection = db.collection('projects');

  try {
    const project = await projectsCollection.findOne({
      _id: new ObjectId(jobData.projectId)
    });
    if (!project) throw new Error(`Project not found: ${jobData.projectId}`);

    console.error(`\n${'='.repeat(60)}`);
    console.error(`📄 PROCESSING pdd_finalize JOB`);
    console.error(`   Job ID: ${jobData._id}`);
    console.error(`   Project: ${project.name}`);
    console.error(`${'='.repeat(60)}`);

    // Read original PDD file
    let pddContent = 'Original PDD content not available';
    const pddFilePath = jobData.context.pddFilePath;
    if (pddFilePath && fs.existsSync(pddFilePath)) {
      if (pddFilePath.toLowerCase().endsWith('.pdf')) {
        const buffer = fs.readFileSync(pddFilePath);
        const pdfData = await PDFParse(buffer);
        pddContent = pdfData.text;
      } else {
        pddContent = fs.readFileSync(pddFilePath, 'utf-8');
      }
    }

    // Build prompt variables
    const vars = {
      projectName: project.name || jobData.context.projectName || '',
      description: project.description || jobData.context.description || '',
      scope: project.scope || jobData.context.scope || '',
      objectives: project.objectives || jobData.context.objectives || '',
      criteria: project.criteria || jobData.context.criteria || '',
      pddContent,
      processFlowDiagram: project.baProcessFlow || '(no process flow diagram available)',
      processFlowComments: jobData.context.processFlowComments || '(no comments)',
      baGapsFormatted: formatBaGaps(project.baGaps),
      btResponsesFormatted: formatBtResponses(project.btResponses, project.baGaps)
    };

    console.error(`Generating Final PDD with Claude...`);
    const htmlContent = generateFinalPddWithClaude(vars);

    // Write HTML to disk
    const pddDir = path.join(require('os').tmpdir(), 'aadlc-pdds');
    if (!fs.existsSync(pddDir)) fs.mkdirSync(pddDir, { recursive: true });
    const fileName = `final-pdd-${jobData.projectId}-${Date.now()}.html`;
    const filePath = path.join(pddDir, fileName);
    fs.writeFileSync(filePath, htmlContent, 'utf-8');
    console.error(`✓ Final PDD written to: ${filePath}`);

    // Update project with finalPddPath and mark version as final
    const updatedVersions = (project.pddVersions || []).map(v =>
      v.status === 'under-review' ? { ...v, status: 'final', finalPddPath: filePath } : v
    );

    await projectsCollection.findOneAndUpdate(
      { _id: project._id },
      {
        $set: {
          finalPddPath: filePath,
          finalPddGeneratedAt: new Date(),
          pddVersions: updatedVersions,
          updatedAt: new Date()
        },
        $push: {
          activityTimeline: {
            action: 'BA Agent generated Final PDD',
            user: 'BA Agent',
            timestamp: new Date()
          }
        }
      }
    );

    // Mark job completed
    await jobsCollection.findOneAndUpdate(
      { _id: jobData._id },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          result: { finalPddPath: filePath, fileSizeBytes: htmlContent.length }
        }
      }
    );

    console.error(`🎉 Final PDD generated successfully!`);
    console.error(`${'='.repeat(60)}`);
  } catch (err) {
    console.error(`\n❌ Error in pdd_finalize: ${err.message}`);
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
      ).catch(() => {});
    } catch (dbErr) {
      console.error(`Failed to mark job as failed: ${dbErr.message}`);
    }
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
      console.log(`   No pending pdd_review job found. Checking for stuck pdd_review jobs...`);
      // Check for stuck pdd_review jobs (in_progress for too long)
      const stuckJobs = await jobsCollection.find({
        stage: 'pdd_review',
        status: 'in_progress',
        claimedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // Stuck for 5+ minutes
      }).toArray();

      if (stuckJobs.length > 0) {
        console.log(`\n⚠️  Found ${stuckJobs.length} stuck pdd_review job(s), retrying...`);
        for (const stuckJob of stuckJobs) {
          await jobsCollection.updateOne(
            { _id: stuckJob._id },
            { $set: { status: 'pending', claimedAt: null } }
          );
        }
      }

      // Now check for pdd_finalize jobs
      console.log(`\n🔎 Checking for pdd_finalize jobs...`);
      const finalizeJob = await jobsCollection.findOneAndUpdate(
        { stage: 'pdd_finalize', status: 'pending' },
        { $set: { status: 'in_progress', claimedAt: new Date() } },
        { returnDocument: 'after' }
      );

      const finalizeJobData = finalizeJob?.value || finalizeJob;
      if (finalizeJobData) {
        console.log(`\n✅ Found and claimed pdd_finalize job: ${finalizeJobData._id}`);
        await processFinalPddJob(finalizeJobData);
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
      const { gaps, processFlow } = generateGapsWithClaude(jobData.context, fileContent);
      console.error(`✓ STEP 3 DONE: Got ${gaps.length} gaps`);

      console.error(`STEP 4: Updating project with gaps and process flow...`);

      // Create initial PDD version if not yet created
      let pddVersions = project.pddVersions || [];
      if (pddVersions.length === 0) {
        // This is the first version
        pddVersions.push({
          version: 1,
          label: 'v1.0',
          pddFileName: jobData.context.pddFileName || 'pdd.pdf',
          pddFilePath: jobData.context.pddFilePath || null,
          status: 'under-review',
          createdAt: new Date(),
          createdBy: 'BT Team',
          notes: 'Initial submission'
        });
      }

      const projectUpdateResult = await projectsCollection.findOneAndUpdate(
        { _id: project._id },
        {
          $set: {
            baGaps: gaps,
            baProcessFlow: processFlow,
            baReviewJobId: jobData._id.toString(),
            pddVersions,
            'phases.0.status': 'completed',
            updatedAt: new Date()
          },
          $push: {
            activityTimeline: {
              action: 'BT submitted PDD for BA review (version: v1.0)',
              user: 'BT Team',
              timestamp: new Date()
            }
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
              gapIds: gaps.map(g => g.id),
              hasProcessFlow: !!processFlow
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
    console.log(`   Polling for pdd_review and pdd_finalize jobs every 3 seconds...`);
    console.log(`   Press Ctrl+C to stop\n`);

    // Poll every 3 seconds
    setInterval(pollAndProcess, 3000);
  } catch (error) {
    console.error('Failed to start BA Agent:', error);
    process.exit(1);
  }
}

start();
