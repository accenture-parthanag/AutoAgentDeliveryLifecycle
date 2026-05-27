const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { generateApprovedPdd } = require('../agents/pdd-generator');
const { buildSddDocx, buildTddDocx } = require('../agents/doc-builders');

const router = Router();

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
    res.json(result);
  } catch (error) {
    console.error('Error rejecting change request:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
