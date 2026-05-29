const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');

const router = Router();

// GET /api/analytics/rollup - Leadership rollup aggregation
router.get('/rollup', async (req, res) => {
  try {
    const db = getDb();
    const roiBaselines = require('../config/roiBaselines.json');

    // Aggregate jobs by agent type
    const agentBreakdown = await db.collection('jobs').aggregate([
      {
        $match: { status: 'completed', stage: { $in: ['pdd_review', 'sdd', 'tdd', 'dev', 'qa_sit', 'qa_uat'] } }
      },
      {
        $group: {
          _id: '$agentType',
          jobCount: { $sum: 1 },
          totalDurationMs: { $sum: { $ifNull: ['$durationMs', 0] } },
          totalInputTokens: { $sum: { $ifNull: ['$tokenMetrics.inputTokens', 0] } },
          totalOutputTokens: { $sum: { $ifNull: ['$tokenMetrics.outputTokens', 0] } },
          totalCostUsd: { $sum: { $ifNull: ['$tokenMetrics.costUsd', 0] } }
        }
      },
      {
        $project: {
          agentType: '$_id',
          _id: 0,
          jobCount: 1,
          totalDurationMs: 1,
          avgDurationMs: { $divide: ['$totalDurationMs', '$jobCount'] },
          totalInputTokens: 1,
          totalOutputTokens: 1,
          totalCostUsd: 1
        }
      },
      { $sort: { agentType: 1 } }
    ]).toArray();

    // Get all projects for rollup
    const projects = await db.collection('projects').find({}).toArray();

    let totalProjectCount = projects.length;
    let totalAgentDurationMs = 0;
    let totalHumanReviewMs = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalEstimatedCostUsd = 0;
    let totalChangeRequests = 0;
    let totalApprovedCRs = 0;
    let totalCompletedPhases = 0;
    let totalPhases = 0;
    let projectCompletionTimes = [];

    const automationCoverageByProject = projects.map(p => {
      const completedPhases = (p.phases || []).filter(ph => ph.status === 'completed').length;
      const total = (p.phases || []).length;
      totalCompletedPhases += completedPhases;
      totalPhases += total;

      const changeReqCount = (p.changeRequests || []).length;
      const approvedCount = (p.changeRequests || []).filter(c => c.status === 'approved').length;
      totalChangeRequests += changeReqCount;
      totalApprovedCRs += approvedCount;

      const humanReviewMs = (p.humanReviewTimings || []).reduce((s, r) => s + (r.durationMs || 0), 0);
      totalHumanReviewMs += humanReviewMs;

      if (p.updatedAt && p.createdAt) {
        projectCompletionTimes.push(new Date(p.updatedAt) - new Date(p.createdAt));
      }

      return {
        projectId: p._id.toString(),
        projectName: p.name,
        completedPhases,
        totalPhases: total,
        ratio: total > 0 ? (completedPhases / total * 100).toFixed(1) : 0
      };
    });

    // Get all agent jobs for total metrics
    const allJobs = await db.collection('jobs').find({
      status: 'completed',
      stage: { $in: ['pdd_review', 'sdd', 'tdd', 'dev', 'qa_sit', 'qa_uat'] }
    }).toArray();

    allJobs.forEach(job => {
      if (job.durationMs) totalAgentDurationMs += job.durationMs;
      if (job.tokenMetrics) {
        totalInputTokens += job.tokenMetrics.inputTokens || 0;
        totalOutputTokens += job.tokenMetrics.outputTokens || 0;
        totalEstimatedCostUsd += job.tokenMetrics.costUsd || 0;
      }
    });

    const avgTimeToCompletionMs = projectCompletionTimes.length > 0
      ? projectCompletionTimes.reduce((a, b) => a + b, 0) / projectCompletionTimes.length
      : 0;

    const overallReworkRate = totalChangeRequests > 0
      ? (totalApprovedCRs / totalChangeRequests * 100).toFixed(1)
      : 0;

    res.json({
      projectCount: totalProjectCount,
      totalAgentDurationMs,
      totalHumanReviewMs,
      totalEstimatedCostUsd: totalEstimatedCostUsd.toFixed(4),
      totalInputTokens,
      totalOutputTokens,
      avgTimeToCompletionMs,
      overallReworkRate,
      automationCoverageByProject,
      agentBreakdown,
      summary: {
        totalChangeRequests,
        totalApprovedCRs,
        totalCompletedPhases,
        totalPhases,
        automationCoverageRatio: totalPhases > 0 ? (totalCompletedPhases / totalPhases * 100).toFixed(1) : 0
      }
    });
  } catch (err) {
    console.error('Error fetching analytics rollup:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
