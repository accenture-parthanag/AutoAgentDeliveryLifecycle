const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { createJob } = require('../models/jobSchema');

const router = Router();

// Helper: Write activity log entry
async function addActivityLog(db, projectId, entry) {
  try {
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $push: { activityTimeline: { ...entry, timestamp: new Date() } } }
    );
  } catch (err) {
    console.error('Error writing activity log:', err.message);
  }
}

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
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { name, description, scope, objectives, criteria, btLead, startDate, targetDate, pddFileName, pddFileContent } = req.body;

    const project = {
      name,
      description,
      scope,
      objectives,
      criteria,
      btLead,
      status: 'In Progress',
      startDate: startDate || new Date().toISOString().split('T')[0],
      targetDate,
      phases: [
        { id: 'pdd-review', label: 'PDD Review (By BA)', icon: 'security', status: 'in-progress', progress: 10 },
        { id: 'awaiting-bt', label: 'Awaiting BT Response', icon: 'forum', status: 'pending', progress: 0 },
        { id: 'pdd-approved', label: 'PDD Approved', icon: 'check_circle', status: 'pending', progress: 0 },
        { id: 'sdd', label: 'SDD In Progress', icon: 'architecture', status: 'pending', progress: 0 },
        { id: 'tdd', label: 'TDD In Progress', icon: 'account_tree', status: 'pending', progress: 0 },
        { id: 'dev', label: 'Development In Progress', icon: 'code', status: 'pending', progress: 0 },
        { id: 'test-cases', label: 'Test Cases Creation', icon: 'description', status: 'pending', progress: 0 },
        { id: 'sit', label: 'SIT In Progress', icon: 'verified', status: 'pending', progress: 0 },
        { id: 'uat', label: 'UAT Phase', icon: 'check_circle', status: 'pending', progress: 0 }
      ],
      pddVersions: [],
      btResponses: {},
      changeRequests: [],
      keyMetrics: { tasksCompleted: 0, tasksTotal: 0, codeQuality: 0, testCoverage: 0 },
      artifacts: [],
      activityTimeline: [],
      bugs: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('projects').insertOne(project);
    const projectId = result.insertedId.toString();

    console.log(`✓ Project created: ${projectId}`);

    // Handle PDD file submission if provided
    if (pddFileName && pddFileContent) {
      try {
        const pddDir = path.join(os.tmpdir(), 'aadlc-pdds');
        if (!fs.existsSync(pddDir)) {
          fs.mkdirSync(pddDir, { recursive: true });
        }

        const filePath = path.join(pddDir, `${projectId}-${Date.now()}-${pddFileName}`);
        const buffer = Buffer.from(pddFileContent, 'base64');
        fs.writeFileSync(filePath, buffer);

        console.log(`✓ Saved initial PDD file: ${filePath}`);

        // Add initial version to pddVersions array
        const initialVersion = {
          version: 1,
          label: 'v1.0',
          pddFileName,
          pddFilePath: filePath,
          status: 'under-review',
          createdAt: new Date(),
          createdBy: 'BT Team',
          notes: 'Initial submission'
        };

        await db.collection('projects').updateOne(
          { _id: new ObjectId(projectId) },
          { $set: { pddVersions: [initialVersion] } }
        );

        console.log(`✓ Added initial version v1.0 to pddVersions`);

        // Create pdd_review job for BA agent
        const job = createJob(projectId, 'pdd_review', {
          projectId,
          pddFileName,
          pddFilePath: filePath
        });

        await db.collection('jobs').insertOne(job);
        console.log(`✓ Created pdd_review job for BA agent`);

        // Write activity log
        await addActivityLog(db, projectId, {
          action: 'BT submitted PDD for BA review (version: v1.0)',
          user: 'BT Team',
          notes: `Initial PDD submission: ${pddFileName}`
        });

        console.log(`✓ Activity log entry written`);
      } catch (fileErr) {
        console.error('Error handling PDD submission:', fileErr.message);
        // Don't fail the project creation, just log the error
      }
    }

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
    const { crId, approvalNotes } = req.body;

    const result = await db.collection('projects').findOneAndUpdate(
      { _id: new ObjectId(req.params.id), 'changeRequests.id': crId },
      {
        $set: {
          'changeRequests.$.status': 'approved',
          'changeRequests.$.approvalNotes': approvalNotes,
          'changeRequests.$.reviewedAt': new Date(),
          'changeRequests.$.reviewedBy': 'CCB (Change Control Board)',
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    console.log(`✓ Change request ${crId} approved for project ${req.params.id}`);

    // Write activity log
    await addActivityLog(db, req.params.id, {
      action: 'Change Request approved by CCB — BA review will restart with new PDD',
      user: 'CCB (Change Control Board)',
      notes: approvalNotes || ''
    });

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
    const { crId, rejectionReason } = req.body;

    const result = await db.collection('projects').findOneAndUpdate(
      { _id: new ObjectId(req.params.id), 'changeRequests.id': crId },
      {
        $set: {
          'changeRequests.$.status': 'rejected',
          'changeRequests.$.rejectionReason': rejectionReason,
          'changeRequests.$.reviewedAt': new Date(),
          'changeRequests.$.reviewedBy': 'CCB (Change Control Board)',
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    console.log(`✓ Change request ${crId} rejected for project ${req.params.id}`);

    // Write activity log
    await addActivityLog(db, req.params.id, {
      action: 'Change Request rejected by CCB — last approved PDD will be used',
      user: 'CCB (Change Control Board)',
      reason: rejectionReason || 'Not specified'
    });

    res.json(result);
  } catch (error) {
    console.error('Error rejecting change request:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/projects/:id/final-pdd - Download the generated Final PDD HTML document
router.get('/:id/final-pdd', async (req, res) => {
  try {
    const db = getDb();
    const fs = require('fs');

    const project = await db.collection('projects').findOne({
      _id: new ObjectId(req.params.id)
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!project.finalPddPath) {
      return res.status(404).json({ error: 'Final PDD has not been generated yet' });
    }
    if (!fs.existsSync(project.finalPddPath)) {
      return res.status(410).json({ error: 'Final PDD file no longer exists on disk' });
    }

    const safeFileName = `Final-PDD-${(project.name || 'project').replace(/[^a-z0-9-]/gi, '_')}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    fs.createReadStream(project.finalPddPath).pipe(res);
  } catch (error) {
    console.error('Error serving final PDD:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/new-pdd-version - BT uploads a new version of the PDD
router.post('/:id/new-pdd-version', async (req, res) => {
  try {
    const db = getDb();
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const { pddFileName, pddFileContent, versionNotes, submittedBy } = req.body;

    if (!pddFileName || !pddFileContent) {
      return res.status(400).json({ error: 'Missing pddFileName or pddFileContent' });
    }

    const project = await db.collection('projects').findOne({
      _id: new ObjectId(req.params.id)
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save file to disk
    let filePath = null;
    try {
      const pddDir = path.join(os.tmpdir(), 'aadlc-pdds');
      if (!fs.existsSync(pddDir)) {
        fs.mkdirSync(pddDir, { recursive: true });
      }

      filePath = path.join(pddDir, `${req.params.id}-${Date.now()}-${pddFileName}`);
      const buffer = Buffer.from(pddFileContent, 'base64');
      fs.writeFileSync(filePath, buffer);

      console.log(`✓ Saved new PDD version file: ${filePath}`);
    } catch (fileErr) {
      console.error('Error saving PDD file:', fileErr.message);
      return res.status(500).json({ error: 'Failed to save PDD file: ' + fileErr.message });
    }

    // Calculate new version number
    const currentVersions = project.pddVersions || [];
    const newVersionNumber = currentVersions.length + 1;
    const versionLabel = `v${newVersionNumber}.0`;

    // Mark previous version as superseded
    const updatedVersions = currentVersions.map(v => ({
      ...v,
      status: v.status === 'final' ? 'final' : 'superseded'
    }));

    // Add new version
    updatedVersions.push({
      version: newVersionNumber,
      label: versionLabel,
      pddFileName,
      pddFilePath: filePath,
      status: 'under-review',
      createdAt: new Date(),
      createdBy: submittedBy || 'BT Team',
      notes: versionNotes || ''
    });

    // Reset BA-related phases and clear BA data
    const resetPhases = project.phases.map(p => {
      if (['pdd-review', 'awaiting-bt', 'pdd-approved'].includes(p.id)) {
        return { ...p, status: 'pending', progress: 0 };
      }
      return p;
    });

    // Update project
    const updateResult = await db.collection('projects').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          pddVersions: updatedVersions,
          phases: resetPhases,
          btResponses: {},
          baGaps: null,
          baProcessFlow: null,
          processFlowApproval: null,
          processFlowComments: null,
          finalPddPath: null,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!updateResult) {
      return res.status(404).json({ error: 'Failed to update project' });
    }

    // Queue pdd_review job for new version
    try {
      const pddReviewJob = createJob(req.params.id, 'pdd_review', {
        pddFileName,
        pddFilePath: filePath,
        projectId: req.params.id
      }, 3); // Higher priority for new versions

      await db.collection('jobs').insertOne(pddReviewJob);
      console.log(`✓ pdd_review job queued for new PDD version ${versionLabel}`);
    } catch (jobErr) {
      console.error('Error queuing pdd_review job:', jobErr.message);
      return res.status(500).json({ error: 'Failed to queue BA review job' });
    }

    // Write activity log
    await addActivityLog(db, req.params.id, {
      action: `BT uploaded new PDD version (${versionLabel}) — BA review restarted`,
      user: submittedBy || 'BT Team',
      notes: versionNotes || ''
    });

    console.log(`✓ New PDD version ${versionLabel} created and queued for review`);
    res.json(updateResult);
  } catch (error) {
    console.error('Error creating new PDD version:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
