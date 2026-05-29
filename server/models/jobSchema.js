// Job queue stages - one per Agent Driven Automation phase
const STAGES = {
  PDD_REVIEW: 'pdd_review',
  SDD: 'sdd',
  TDD: 'tdd',
  DEVELOPMENT: 'dev',
  QA_SIT: 'qa_sit',
  QA_UAT: 'qa_uat'
};

// Job status lifecycle
const STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Agent types
const AGENT_TYPES = {
  BA: 'ba',
  ARCHITECT: 'architect',
  TECH_LEAD: 'tech_lead',
  DEV: 'dev',
  QA: 'qa'
};

// Map stages to agent types
const STAGE_TO_AGENT = {
  [STAGES.PDD_REVIEW]: AGENT_TYPES.BA,
  [STAGES.SDD]: AGENT_TYPES.ARCHITECT,
  [STAGES.TDD]: AGENT_TYPES.TECH_LEAD,
  [STAGES.DEVELOPMENT]: AGENT_TYPES.DEV,
  [STAGES.QA_SIT]: AGENT_TYPES.QA,
  [STAGES.QA_UAT]: AGENT_TYPES.QA
};

// Job document template
function createJob(projectId, stage, context, priority = 3) {
  return {
    projectId,
    stage,
    status: STATUS.PENDING,
    priority,
    agentType: STAGE_TO_AGENT[stage],
    context,
    result: null,
    claimedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

module.exports = {
  STAGES,
  STATUS,
  AGENT_TYPES,
  STAGE_TO_AGENT,
  createJob
};
