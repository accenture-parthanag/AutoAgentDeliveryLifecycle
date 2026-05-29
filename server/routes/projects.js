const { Router } = require('express');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db');
const { generateApprovedPdd } = require('../agents/pdd-generator');
const { buildSddDocx, buildTddDocx } = require('../agents/doc-builders');

const router = Router();

const PROJECT_ROOT = path.join(__dirname, '..', '..');

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// GET /api/projects/:id/approved-pdd - Generate & stream the Approved Final PDD
router.get('/:id/approved-pdd', async (req, res) => {
  try {
    const { buffer, fileName } = await generateApprovedPdd(req.params.id);
    res.setHeader('Content-Type', DOCX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  } catch (error) {
    console.error('Error generating approved PDD:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/sdd - Generate & stream the System Design Document (docx)
router.get('/:id/sdd', async (req, res) => {
  try {
    const db = getDb();
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(req.params.id)
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.sddDocument) {
      return res.status(409).json({
        error: 'No SDD has been generated yet for this project. Run the Architect agent first.'
      });
    }

    const { buffer, fileName } = await buildSddDocx({
      project,
      sdd: project.sddDocument,
      imageManifest: project.sddPddImages || []
    });

    res.setHeader('Content-Type', DOCX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  } catch (error) {
    console.error('Error generating SDD docx:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/tdd - Generate & stream the Technical Design Document (docx)
router.get('/:id/tdd', async (req, res) => {
  try {
    const db = getDb();
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(req.params.id)
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.tddDocument) {
      return res.status(409).json({
        error: 'No TDD has been generated yet for this project. Run the Tech Lead agent first.'
      });
    }

    const { buffer, fileName } = await buildTddDocx({
      project,
      tdd: project.tddDocument,
      imageManifest: project.sddPddImages || []
    });

    res.setHeader('Content-Type', DOCX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  } catch (error) {
    console.error('Error generating TDD docx:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve a registered artifact path: supports absolute paths (Windows or POSIX)
// and repo-relative paths. Returns { absPath, error } where error is set on
// validation/missing-file failures.
function resolveArtifactPath(rawPath) {
  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    return { error: { status: 400, message: 'Artifact has no path on file' } };
  }
  const isAbsolute =
    path.isAbsolute(rawPath) || /^[A-Za-z]:[\\/]/.test(rawPath);

  let absPath;
  if (isAbsolute) {
    absPath = path.resolve(rawPath);
  } else {
    const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
    absPath = path.resolve(PROJECT_ROOT, normalized);
    if (!absPath.startsWith(PROJECT_ROOT)) {
      return { error: { status: 400, message: 'Invalid artifact path' } };
    }
  }

  if (!fs.existsSync(absPath)) {
    return {
      error: {
        status: 404,
        message: `Artifact file not found on disk at ${rawPath}.`
      }
    };
  }
  return { absPath };
}

function streamArtifact(res, absPath, { contentType }) {
  const fileName = path.basename(absPath);
  const stat = fs.statSync(absPath);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', String(stat.size));
  fs.createReadStream(absPath).pipe(res);
}

// GET /api/projects/:id/test-cases-csv - Stream the registered Test Case Suite CSV
router.get('/:id/test-cases-csv', async (req, res) => {
  try {
    const db = getDb();
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(req.params.id)
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tcArtifact = (project.artifacts || []).find(a =>
      a && typeof a.path === 'string' && a.phase === 'Test Cases'
    );
    if (!tcArtifact) {
      return res.status(409).json({
        error: 'No Test Case Suite has been registered yet. Run the QA agent to generate test cases first.'
      });
    }

    const { absPath, error } = resolveArtifactPath(tcArtifact.path);
    if (error) return res.status(error.status).json({ error: error.message });

    streamArtifact(res, absPath, { contentType: 'text/csv; charset=utf-8' });
  } catch (error) {
    console.error('Error streaming test cases CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/source-code - Stream the registered Source Code Package zip
router.get('/:id/source-code', async (req, res) => {
  try {
    const db = getDb();
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(req.params.id)
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const scArtifact = (project.artifacts || []).find(a =>
      a && typeof a.path === 'string' && a.phase === 'Development'
    );
    if (!scArtifact) {
      return res.status(409).json({
        error: 'No Source Code Package has been registered yet. Run the Developer agent first.'
      });
    }

    const { absPath, error } = resolveArtifactPath(scArtifact.path);
    if (error) return res.status(error.status).json({ error: error.message });

    streamArtifact(res, absPath, { contentType: 'application/zip' });
  } catch (error) {
    console.error('Error streaming source code package:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects - List all projects
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    let projects = await db.collection('projects').find({}).toArray();

    // Ensure all projects have pdd-approved phase
    for (let project of projects) {
      const hasPddApprovedPhase = project.phases?.some(p => p.id === 'pdd-approved');
      if (!hasPddApprovedPhase && project.phases) {
        const newPhases = [];
        for (let i = 0; i < project.phases.length; i++) {
          newPhases.push(project.phases[i]);
          if (project.phases[i].id === 'awaiting-bt') {
            newPhases.push({
              id: 'pdd-approved',
              label: 'PDD Approved',
              icon: 'check_circle',
              status: 'pending',
              progress: 0
            });
          }
        }

        // Update the project with the new phases
        await db.collection('projects').findOneAndUpdate(
          { _id: project._id },
          { $set: { phases: newPhases, updatedAt: new Date() } }
        );

        project.phases = newPhases;
        console.log(`✓ Added missing pdd-approved phase to project ${project._id}`);
      }
    }

    res.json(projects);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { name, description, scope, objectives, criteria, btLead, startDate, targetDate } = req.body;

    const project = {
      name,
      description,
      scope,
      objectives,
      criteria,
      btLead,
      status: 'In Progress',
      startDate,
      targetDate,
      techStack: req.body.techStack || 'python',
      complexity: req.body.complexity || 'medium',
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
      pddVersions: 0,
      btResponses: {},
      changeRequests: [],
      keyMetrics: { tasksCompleted: 0, tasksTotal: 0, codeQuality: 0, testCoverage: 0 },
      artifacts: [],
      activityTimeline: [],
      bugs: [],
      humanReviewTimings: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('projects').insertOne(project);
    res.status(201).json({ _id: result.insertedId, ...project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    let project = await db.collection('projects').findOne({
      _id: new ObjectId(req.params.id)
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Ensure pdd-approved phase exists (for projects created before this phase was added)
    const hasPddApprovedPhase = project.phases?.some(p => p.id === 'pdd-approved');
    if (!hasPddApprovedPhase && project.phases) {
      // Insert pdd-approved phase between awaiting-bt and sdd
      const newPhases = [];
      for (let i = 0; i < project.phases.length; i++) {
        newPhases.push(project.phases[i]);
        if (project.phases[i].id === 'awaiting-bt') {
          newPhases.push({
            id: 'pdd-approved',
            label: 'PDD Approved',
            icon: 'check_circle',
            status: project.phases[i].status === 'completed' ? 'pending' : 'pending',
            progress: 0
          });
        }
      }

      // Update the project with the new phases
      await db.collection('projects').findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: { phases: newPhases, updatedAt: new Date() } }
      );

      project.phases = newPhases;
      console.log(`✓ Added missing pdd-approved phase to project ${req.params.id}`);
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const update = { ...req.body, updatedAt: new Date() };

    const result = await db.collection('projects').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/projects/:id/cr-approve - CCB approves a change request
router.post('/:id/cr-approve', async (req, res) => {
  try {
    const db = getDb();
    const { crId, approvalNotes, reviewStartedAt, reviewCompletedAt } = req.body;

    const updates = {
      $set: {
        'changeRequests.$.status': 'approved',
        'changeRequests.$.approvalNotes': approvalNotes,
        'changeRequests.$.reviewedAt': new Date(),
        'changeRequests.$.reviewedBy': 'CCB (Change Control Board)',
        updatedAt: new Date()
      }
    };

    if (reviewStartedAt && reviewCompletedAt) {
      const started = new Date(reviewStartedAt);
      const completed = new Date(reviewCompletedAt);
      updates.$push = {
        humanReviewTimings: {
          reviewType: 'cr-approval',
          reviewStartedAt: started,
          reviewCompletedAt: completed,
          durationMs: completed - started,
          reviewedBy: 'CCB (Change Control Board)',
          crId
        }
      };
    }

    const result = await db.collection('projects').findOneAndUpdate(
      { _id: new ObjectId(req.params.id), 'changeRequests.id': crId },
      updates,
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    console.log(`✓ Change request ${crId} approved for project ${req.params.id}`);
    res.json(result);
  } catch (error) {
    console.error('Error approving change request:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/projects/:id/cr-reject - CCB rejects a change request
router.post('/:id/cr-reject', async (req, res) => {
  try {
    const db = getDb();
    const { crId, rejectionReason, reviewStartedAt, reviewCompletedAt } = req.body;

    const updates = {
      $set: {
        'changeRequests.$.status': 'rejected',
        'changeRequests.$.rejectionReason': rejectionReason,
        'changeRequests.$.reviewedAt': new Date(),
        'changeRequests.$.reviewedBy': 'CCB (Change Control Board)',
        updatedAt: new Date()
      }
    };

    if (reviewStartedAt && reviewCompletedAt) {
      const started = new Date(reviewStartedAt);
      const completed = new Date(reviewCompletedAt);
      updates.$push = {
        humanReviewTimings: {
          reviewType: 'cr-approval',
          reviewStartedAt: started,
          reviewCompletedAt: completed,
          durationMs: completed - started,
          reviewedBy: 'CCB (Change Control Board)',
          crId
        }
      };
    }

    const result = await db.collection('projects').findOneAndUpdate(
      { _id: new ObjectId(req.params.id), 'changeRequests.id': crId },
      updates,
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    console.log(`✓ Change request ${crId} rejected for project ${req.params.id}`);
    res.json(result);
  } catch (error) {
    console.error('Error rejecting change request:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/projects/:id/metrics - Get project metrics
router.get('/:id/metrics', async (req, res) => {
  try {
    const db = getDb();
    const roiBaselines = require('../config/roiBaselines.json');
    const projectId = req.params.id;

    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const jobs = await db.collection('jobs').find({
      projectId,
      status: 'completed'
    }).toArray();

    const agentJobs = jobs
      .filter(j => ['pdd_review', 'sdd', 'tdd', 'dev', 'qa_sit', 'qa_uat'].includes(j.stage))
      .map(j => ({
        jobId: j._id,
        stage: j.stage,
        agentType: j.agentType,
        claimedAt: j.claimedAt,
        completedAt: j.completedAt,
        durationMs: j.durationMs || (j.completedAt && j.claimedAt
          ? new Date(j.completedAt) - new Date(j.claimedAt)
          : null),
        tokenMetrics: j.tokenMetrics || null
      }));

    const tokenTotals = agentJobs.reduce((acc, j) => {
      if (!j.tokenMetrics) return acc;
      acc.inputTokens += j.tokenMetrics.inputTokens || 0;
      acc.outputTokens += j.tokenMetrics.outputTokens || 0;
      acc.costUsd += j.tokenMetrics.costUsd || 0;
      return acc;
    }, { inputTokens: 0, outputTokens: 0, costUsd: 0 });

    const humanReviewTimings = project.humanReviewTimings || [];

    const totalAgentDurationMs = agentJobs.reduce((s, j) => s + (j.durationMs || 0), 0);
    const totalHumanReviewMs = humanReviewTimings.reduce((s, r) => s + (r.durationMs || 0), 0);
    const totalTasks = project.tddDocument?.tasks?.length || project.keyMetrics?.tasksTotal || 0;
    const completedPhases = (project.phases || []).filter(p => p.status === 'completed').length;
    const totalPhases = (project.phases || []).length;
    const changeRequestCount = (project.changeRequests || []).length;
    const approvedCrCount = (project.changeRequests || []).filter(c => c.status === 'approved').length;
    const gapCount = (project.baGaps || []).length;

    const techStack = project.techStack || 'python';
    const complexity = project.complexity || 'medium';
    const baselineConfig = roiBaselines.techStacks[techStack] || roiBaselines.techStacks.python;
    const complexityMultiplier = roiBaselines.complexityMultipliers[complexity] || 1.0;

    const agentBaselineMs = Object.values(baselineConfig.agentPhaseBaselineHours).reduce((s, h) => s + (h * 60 * 60 * 1000), 0);
    const humanBaselineMs = Object.values(baselineConfig.humanReviewBaselineHours).reduce((s, h) => s + (h * 60 * 60 * 1000), 0);
    const scaledAgentBaselineMs = agentBaselineMs * complexityMultiplier;
    const scaledHumanBaselineMs = humanBaselineMs * complexityMultiplier;

    const timeSavedMs = (scaledAgentBaselineMs - totalAgentDurationMs) + (scaledHumanBaselineMs - totalHumanReviewMs);

    res.json({
      projectId,
      projectName: project.name,
      techStack,
      complexity,
      agentJobs,
      tokenTotals,
      humanReviewTimings,
      roiMetrics: {
        totalAgentDurationMs,
        totalHumanReviewMs,
        timeSavedMs: Math.max(0, timeSavedMs),
        agentPhaseCount: agentJobs.length,
        humanReviewCount: humanReviewTimings.length,
        automationCoverageRatio: totalPhases ? completedPhases / totalPhases : 0,
        changeRequestRate: totalTasks > 0 ? changeRequestCount / totalTasks : null,
        reworkRate: changeRequestCount > 0 ? approvedCrCount / changeRequestCount : 0,
        gapDensity: project.description
          ? gapCount / Math.max(1, Math.round(project.description.length / 100))
          : null
      }
    });
  } catch (err) {
    console.error('Error fetching project metrics:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
