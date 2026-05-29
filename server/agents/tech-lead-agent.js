require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PDFParse = require('pdf-parse');
const mammoth = require('mammoth');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'agent_automation';

const PROMPT_PATH = path.join(__dirname, '..', '..', 'Prompts', 'tech-lead-agent.md');
let promptTemplate;

function loadPromptTemplate() {
  promptTemplate = fs.readFileSync(PROMPT_PATH, 'utf-8');
  console.log(`✓ Loaded Tech Lead prompt template from ${PROMPT_PATH}`);
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
  console.log(`✓ Tech Lead Agent connected to MongoDB: ${MONGODB_DB}`);
}

function formatBaGaps(baGaps) {
  if (!Array.isArray(baGaps) || baGaps.length === 0) {
    return '(no BA gaps recorded)';
  }
  return baGaps
    .map(g => `Q${g.id} [${g.category} / ${g.complexity}]: ${g.question}`)
    .join('\n');
}

function formatBtResponses(btResponses, baGaps) {
  if (!btResponses || Object.keys(btResponses).length === 0) {
    return '(no BT responses recorded)';
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

function formatSdd(sdd) {
  if (!sdd || typeof sdd !== 'object') {
    return '(no SDD found on project — Tech Lead requires a completed SDD)';
  }
  return JSON.stringify(sdd, null, 2);
}

function formatImageManifest(manifest) {
  if (!Array.isArray(manifest) || manifest.length === 0) {
    return '(no images embedded in the PDD)';
  }
  return manifest
    .map(img => `- Image #${img.index}: filename="${img.filename}" contentType=${img.contentType} bytes=${img.bytes} altText="${img.altText || '(none)'}"`)
    .join('\n');
}

async function loadPddPayload(projectId, sddPddImages) {
  const allJobs = await db.collection('jobs').find({ projectId }).toArray();
  const sorted = allJobs.filter(j => j.context?.pddFilePath)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const cr = sorted.find(j => j.stage === 'change-request');
  const pr = sorted.find(j => j.stage === 'pdd_review');
  const filePath = cr?.context?.pddFilePath || pr?.context?.pddFilePath || sorted[0]?.context?.pddFilePath || null;

  if (!filePath || !fs.existsSync(filePath)) {
    return { text: '(no PDD on disk — SDD is authoritative)', imageManifest: sddPddImages || [], filePath: null };
  }
  try {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      const buf = fs.readFileSync(filePath);
      const pdf = await PDFParse(buf);
      return { text: pdf.text, imageManifest: sddPddImages || [], filePath };
    }
    if (filePath.toLowerCase().endsWith('.docx')) {
      const buf = fs.readFileSync(filePath);
      const r = await mammoth.extractRawText({ buffer: buf });
      return { text: r.value, imageManifest: sddPddImages || [], filePath };
    }
    return { text: fs.readFileSync(filePath, 'utf-8'), imageManifest: sddPddImages || [], filePath };
  } catch (e) {
    return { text: `PDD read error: ${e.message}`, imageManifest: sddPddImages || [], filePath };
  }
}

async function generateTddWithClaude(project) {
  if (!project.sddDocument) {
    throw new Error('Project has no sddDocument — Architect agent must run first');
  }

  const pddPayload = await loadPddPayload(project._id.toString(), project.sddPddImages);

  const prompt = renderPrompt({
    projectName: project.name,
    description: project.description,
    scope: project.scope,
    objectives: project.objectives,
    criteria: project.criteria,
    sddDocument: formatSdd(project.sddDocument),
    fileContent: pddPayload.text,
    imageManifest: formatImageManifest(pddPayload.imageManifest),
    baGaps: formatBaGaps(project.baGaps),
    btResponses: formatBtResponses(project.btResponses, project.baGaps),
  });

  try {
    console.log(`\n📝 Tech Lead Agent Prompt:`);
    console.log(`${'='.repeat(60)}`);
    console.log(prompt.substring(0, 300) + '...');
    console.log(`${'='.repeat(60)}`);
    console.log(`   Prompt size: ${(prompt.length / 1024).toFixed(1)} KB`);
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

    const tdd = JSON.parse(jsonMatch[0]);
    console.log(`✓ Successfully parsed TDD with ${tdd.tasks?.length || 0} tasks across ${tdd.modules?.length || 0} modules`);
    return tdd;
  } catch (err) {
    console.error('❌ Error calling Claude CLI:', err.message);
    throw new Error('Failed to generate TDD with Claude: ' + err.message);
  }
}

async function pollAndProcess() {
  try {
    const jobsCollection = db.collection('jobs');
    const projectsCollection = db.collection('projects');

    const pendingCount = await jobsCollection.countDocuments({
      stage: 'tdd',
      status: 'pending'
    });

    if (Math.random() < 0.1) {
      const inProgressCount = await jobsCollection.countDocuments({
        stage: 'tdd',
        status: 'in_progress'
      });
      console.log(`\n📊 Tech Lead Queue Status: pending=${pendingCount} in_progress=${inProgressCount}`);
    }

    if (pendingCount > 0) {
      console.log(`\n✅ Found ${pendingCount} pending TDD job(s) in queue!`);
    }

    const job = await jobsCollection.findOneAndUpdate(
      { stage: 'tdd', status: 'pending' },
      { $set: { status: 'in_progress', claimedAt: new Date() } },
      { returnDocument: 'after' }
    );

    const jobData = job?.value || job;

    if (!jobData) {
      const stuckJobs = await jobsCollection.find({
        stage: 'tdd',
        status: 'in_progress',
        claimedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
      }).toArray();

      if (stuckJobs.length > 0) {
        console.log(`\n⚠️  Found ${stuckJobs.length} stuck TDD job(s), retrying...`);
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
    console.error(`🧭 PROCESSING TDD JOB`);
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

      console.error(`STEP 2: Calling Claude to generate TDD...`);
      const tdd = await generateTddWithClaude(project);
      console.error(`✓ STEP 2 DONE`);

      console.error(`STEP 3: Updating project with TDD...`);
      const updatedPhases = (project.phases || []).map(p =>
        p.id === 'tdd' ? { ...p, status: 'completed', progress: 100 } : p
      );

      const taskTotal = tdd.tasks?.length || 0;

      await projectsCollection.findOneAndUpdate(
        { _id: project._id },
        {
          $set: {
            tddDocument: tdd,
            tddJobId: jobData._id.toString(),
            phases: updatedPhases,
            'keyMetrics.tasksTotal': taskTotal,
            updatedAt: new Date()
          }
        }
      );
      console.error(`✓ STEP 3 DONE: Project updated with TDD (${taskTotal} tasks)`);

      console.error(`STEP 4: Marking job as completed...`);
      await jobsCollection.findOneAndUpdate(
        { _id: jobData._id },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            result: {
              modulesCreated: tdd.modules?.length || 0,
              tasksGenerated: taskTotal,
              openQuestions: tdd.openQuestions?.length || 0
            }
          }
        }
      );
      console.error(`✓ STEP 4 DONE`);

      console.error(`\n🎉 SUCCESS! TDD generated for "${project.name}"`);
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
    console.error('Error in Tech Lead polling loop:', err.message);
  }
}

async function start() {
  try {
    loadPromptTemplate();
    await connectDb();
    console.log(`\n🧭 Tech Lead Agent started`);
    console.log(`   Polling for tdd jobs every 3 seconds...`);
    console.log(`   Press Ctrl+C to stop\n`);

    setInterval(pollAndProcess, 3000);
  } catch (error) {
    console.error('Failed to start Tech Lead Agent:', error);
    process.exit(1);
  }
}

start();
