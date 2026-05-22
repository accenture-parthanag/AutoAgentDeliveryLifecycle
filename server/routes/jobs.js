const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { STATUS, STAGES, createJob } = require('../models/jobSchema');

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

// POST /api/jobs - Submit a new job to the queue
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const { projectId, stage, context, priority } = req.body;

    if (!projectId || !stage || !context) {
      return res.status(400).json({ error: 'Missing required fields: projectId, stage, context' });
    }

    // Handle large binary data (file content) to avoid exceeding MongoDB's 16MB document limit
    const cleanedContext = { ...context };
    let filePath = null;

    if (cleanedContext.pddFileContent) {
      try {
        // Save file to disk and store path reference
        const pddDir = path.join(os.tmpdir(), 'aadlc-pdds');
        if (!fs.existsSync(pddDir)) {
          fs.mkdirSync(pddDir, { recursive: true });
        }

        const fileName = cleanedContext.pddFileName || `pdd-${Date.now()}.txt`;
        filePath = path.join(pddDir, `${projectId}-${Date.now()}-${fileName}`);

        // Decode base64 and write to disk
        const buffer = Buffer.from(cleanedContext.pddFileContent, 'base64');
        fs.writeFileSync(filePath, buffer);

        console.log(`✓ Saved PDD file: ${filePath}`);

        cleanedContext.pddFilePath = filePath;
        delete cleanedContext.pddFileContent;
      } catch (fileErr) {
        console.error('Error saving PDD file:', fileErr.message);
        return res.status(500).json({ error: 'Failed to save PDD file: ' + fileErr.message });
      }
    }

    console.log(`📥 Job received - Stage: ${stage}, ProjectID: ${projectId}`);

    const job = createJob(projectId, stage, cleanedContext, priority);
    const result = await db.collection('jobs').insertOne(job);

    // Special handling for PDD approval
    if (stage === 'pdd-approved') {
      console.log(`🔄 Processing pdd-approved for project ${projectId}`);
      try {
        const project = await db.collection('projects').findOne(
          { _id: new ObjectId(projectId) }
        );

        console.log(`📋 Project found: ${project ? 'yes' : 'no'}, Has phases: ${project?.phases ? 'yes' : 'no'}`);

        if (project && project.phases) {
          const updatedPhases = project.phases.map(p => {
            if (p.id === 'pdd-approved') {
              console.log(`✓ Marking pdd-approved phase as completed`);
              return { ...p, status: 'completed', progress: 100 };
            }
            return p;
          });

          const updateResult = await db.collection('projects').findOneAndUpdate(
            { _id: new ObjectId(projectId) },
            {
              $set: {
                phases: updatedPhases,
                updatedAt: new Date()
              }
            },
            { returnDocument: 'after' }
          );

          console.log(`✓ PDD approved for project ${projectId} - Update result: ${updateResult ? 'success' : 'failed'}`);

          // Write activity log
          await addActivityLog(db, projectId, {
            action: 'BT approved BA-generated Final PDD',
            user: cleanedContext.approvedBy || 'BT Team',
            notes: cleanedContext.approvalNotes || ''
          });
        } else {
          console.error(`✗ Project or phases not found for ${projectId}`);
        }
      } catch (err) {
        console.error(`✗ Error marking PDD as approved: ${err.message}`);
        console.error(err.stack);
      }
    }

    // Special handling for SDD job: mark sdd phase as in-progress when queued
    if (stage === 'sdd') {
      try {
        const project = await db.collection('projects').findOne(
          { _id: new ObjectId(projectId) }
        );

        if (project && project.phases) {
          const sddPhase = project.phases.find(p => p.id === 'sdd');
          if (sddPhase && sddPhase.status === 'pending') {
            const updatedPhases = project.phases.map(p =>
              p.id === 'sdd' ? { ...p, status: 'in-progress', progress: 10 } : p
            );

            await db.collection('projects').findOneAndUpdate(
              { _id: new ObjectId(projectId) },
              { $set: { phases: updatedPhases, updatedAt: new Date() } }
            );

            console.log(`✓ SDD phase marked in-progress for project ${projectId}`);

            // Write activity log
            await addActivityLog(db, projectId, {
              action: 'Architect Agent dispatched for Solution Design',
              user: 'System'
            });
          }
        }
      } catch (err) {
        console.error(`✗ Error marking SDD phase in-progress: ${err.message}`);
      }
    }

    // Special handling for change request jobs
    if (stage === 'change-request') {
      const changeRequest = {
        id: result.insertedId.toString(),
        status: cleanedContext.status || 'pending-ccb',
        reason: cleanedContext.reason,
        revisionNotes: cleanedContext.revisionNotes,
        pddFileName: cleanedContext.pddFileName,
        pddFilePath: cleanedContext.pddFilePath || null,
        submittedAt: cleanedContext.submittedAt,
        submittedBy: cleanedContext.submittedBy
      };

      // Add change request to project's changeRequests array
      await db.collection('projects').findOneAndUpdate(
        { _id: new ObjectId(projectId) },
        { $push: { changeRequests: changeRequest }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      console.log(`✓ Change request created for project ${projectId}`);

      // Write activity log
      await addActivityLog(db, projectId, {
        action: 'BT submitted Change Request (pending CCB approval)',
        user: cleanedContext.submittedBy || 'BT Team',
        reason: cleanedContext.reason
      });
    }

    // Special handling for BT gap responses
    if (stage === 'save-gap-responses' || stage === 'submit-gap-responses') {
      try {
        const btResponses = {};
        const baGaps = cleanedContext.btResponses || {};

        // Convert flat response object to structured format with timestamps
        Object.keys(baGaps).forEach(gapId => {
          btResponses[gapId] = {
            text: baGaps[gapId],
            submittedAt: cleanedContext.respondedAt || cleanedContext.savedAt || new Date().toISOString(),
            isDraft: cleanedContext.isDraft || false,
            submittedBy: cleanedContext.submittedBy || 'BT Team'
          };
        });

        console.log(`📝 Processing BT responses for project ${projectId}:`, Object.keys(btResponses));

        // Update project with BT responses and process flow feedback
        const updateData = {
          btResponses,
          processFlowApproval: cleanedContext.processFlowApproval || null,
          processFlowComments: cleanedContext.processFlowComments || null,
          updatedAt: new Date()
        };

        // Mark awaiting-bt phase as completed if submitting (not saving draft)
        if (stage === 'submit-gap-responses') {
          const project = await db.collection('projects').findOne(
            { _id: new ObjectId(projectId) }
          );

          if (project && project.phases) {
            updateData.phases = project.phases.map(p => {
              if (p.id === 'awaiting-bt') {
                console.log(`✓ Marking awaiting-bt phase as completed`);
                return { ...p, status: 'completed', progress: 100 };
              }
              return p;
            });
          }
        }

        const result = await db.collection('projects').findOneAndUpdate(
          { _id: new ObjectId(projectId) },
          { $set: updateData },
          { returnDocument: 'after' }
        );

        if (result) {
          console.log(`✓ BT responses ${stage === 'submit-gap-responses' ? 'submitted' : 'saved as draft'} for project ${projectId}`);

          if (stage === 'submit-gap-responses') {
            // Write activity log for submission
            await addActivityLog(db, projectId, {
              action: 'BT submitted responses to BA questions and approved Process Flow Diagram',
              user: cleanedContext.submittedBy || 'BT Team'
            });

            try {
              // Fetch the project to get context info and find original pdd_review job for pddFilePath
              const updatedProject = await db.collection('projects').findOne(
                { _id: new ObjectId(projectId) }
              );

              // Find the original pdd_review job to recover the pddFilePath
              const pddJob = await db.collection('jobs').findOne(
                { projectId, stage: 'pdd_review', 'context.pddFilePath': { $exists: true } },
                { sort: { createdAt: -1 } }
              );
              const pddFilePath = pddJob?.context?.pddFilePath || null;

              const finalizeJob = createJob(projectId, 'pdd_finalize', {
                projectName: updatedProject?.name || '',
                description: updatedProject?.description || '',
                scope: updatedProject?.scope || '',
                objectives: updatedProject?.objectives || '',
                criteria: updatedProject?.criteria || '',
                pddFilePath,
                processFlowComments: cleanedContext.processFlowComments || null
              }, 2); // priority 2 = slightly higher than normal

              await db.collection('jobs').insertOne(finalizeJob);
              console.log(`✓ pdd_finalize job auto-queued for project ${projectId}`);
            } catch (finalizeErr) {
              console.error(`✗ Failed to queue pdd_finalize job: ${finalizeErr.message}`);
              // Non-fatal — BT responses are already saved successfully
            }
          } else {
            // Write activity log for draft save
            await addActivityLog(db, projectId, {
              action: 'BT saved draft responses',
              user: cleanedContext.submittedBy || 'BT Team'
            });
          }
        } else {
          console.error(`✗ Failed to update project ${projectId} with responses`);
        }
      } catch (err) {
        console.error(`✗ Error processing BT responses: ${err.message}`);
      }
    }

    res.status(201).json({ _id: result.insertedId, ...job });
  } catch (error) {
    console.error('Error submitting job:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/jobs/:id - Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const job = await db.collection('jobs').findOne({
      _id: new ObjectId(req.params.id)
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/jobs/queue/:stage - List pending jobs for a stage (not claimed yet)
router.get('/queue/:stage', async (req, res) => {
  try {
    const db = getDb();
    const jobs = await db.collection('jobs')
      .find({
        stage: req.params.stage,
        status: STATUS.PENDING
      })
      .sort({ priority: 1, createdAt: 1 })
      .toArray();

    res.json(jobs);
  } catch (error) {
    console.error('Error listing jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/jobs/:id/claim - Agent claims a job (atomic: pending → in_progress)
router.put('/:id/claim', async (req, res) => {
  try {
    const db = getDb();
    const job = await db.collection('jobs').findOneAndUpdate(
      {
        _id: new ObjectId(req.params.id),
        status: STATUS.PENDING  // Only claim if still pending
      },
      {
        $set: {
          status: STATUS.IN_PROGRESS,
          claimedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!job.value) {
      return res.status(409).json({ error: 'Job not found or already claimed' });
    }

    res.json(job.value);
  } catch (error) {
    console.error('Error claiming job:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/jobs/:id/complete - Agent marks job as completed with result
router.put('/:id/complete', async (req, res) => {
  try {
    const db = getDb();
    const { result } = req.body;

    if (!result) {
      return res.status(400).json({ error: 'Missing result field' });
    }

    const job = await db.collection('jobs').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          status: STATUS.COMPLETED,
          result,
          completedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!job.value) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job.value);
  } catch (error) {
    console.error('Error completing job:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/jobs/:id/fail - Agent marks job as failed with reason
router.put('/:id/fail', async (req, res) => {
  try {
    const db = getDb();
    const { reason } = req.body;

    const job = await db.collection('jobs').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          status: STATUS.FAILED,
          result: { error: reason || 'Unknown error' },
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!job.value) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job.value);
  } catch (error) {
    console.error('Error failing job:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
