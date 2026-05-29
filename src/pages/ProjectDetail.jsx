import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { getProject, submitJob, getProjectMetrics } from '../api';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showBugUpload, setShowBugUpload] = useState(false);
  const [bugs, setBugs] = useState([]);
  const [showGlossary, setShowGlossary] = useState(false);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tddDispatching, setTddDispatching] = useState(false);
  const [tddStartedAt, setTddStartedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    getProject(id)
      .then(setProject)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Poll for updates every 3 seconds to show BT responses, BA gaps, etc.
  useEffect(() => {
    const interval = setInterval(() => {
      getProject(id)
        .then(data => {
          setProject(data);
          if (data.btResponses && Object.keys(data.btResponses).length > 0) {
            console.log('✓ BT Responses loaded:', data.btResponses);
          }
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  // Track when TDD phase becomes/leaves in-progress so we can show elapsed time
  useEffect(() => {
    const tddPhase = project?.phases?.find(p => p.id === 'tdd');
    if (tddPhase?.status === 'in-progress' && !tddStartedAt) {
      setTddStartedAt(Date.now());
    } else if (tddPhase?.status !== 'in-progress' && tddStartedAt) {
      setTddStartedAt(null);
    }
  }, [project, tddStartedAt]);

  // Tick every second while TDD is in progress so elapsed time + simulated progress advance
  useEffect(() => {
    if (!tddStartedAt && !tddDispatching) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [tddStartedAt, tddDispatching]);

  // Log project data on load for debugging
  useEffect(() => {
    if (project) {
      console.log('Project loaded:', {
        name: project.name,
        baGapsCount: project.baGaps?.length || 0,
        btResponsesCount: Object.keys(project.btResponses || {}).length,
        phases: project.phases?.map(p => ({ id: p.id, status: p.status, progress: p.progress }))
      });
    }
  }, [project]);

  // Fetch metrics when Metrics tab is activated
  useEffect(() => {
    if (activeTab === 'metrics' && !metrics && id) {
      setMetricsLoading(true);
      getProjectMetrics(id)
        .then(setMetrics)
        .catch(err => console.error('Error loading metrics:', err))
        .finally(() => setMetricsLoading(false));
    }
  }, [activeTab, id, metrics]);

  const acronymGlossary = [
    { acronym: 'PDD', full: 'Process Definition Document', description: 'Initial requirements and business objectives document submitted by BT' },
    { acronym: 'BA', full: 'Business Analyst', description: 'Reviews PDD for gaps, ambiguities, and completeness' },
    { acronym: 'SDD', full: 'Solution Design Document', description: 'High-level architecture and technology strategy designed by Architecture team' },
    { acronym: 'TDD', full: 'Technical Design Document', description: 'Detailed design with task breakdown and technical specifications' },
    { acronym: 'SIT', full: 'System Integration Testing', description: 'Testing phase where integrated system components are tested together' },
    { acronym: 'UAT', full: 'User Acceptance Testing', description: 'Final testing phase where end-users validate the solution meets requirements' },
    { acronym: 'QA', full: 'Quality Assurance', description: 'Testing and validation agent responsible for SIT and UAT phases' },
    { acronym: 'BT', full: 'Business Transformation', description: 'Interface between business and development team who defines requirements and accepts the solution' }
  ];

  const getPhaseColor = (status) => {
    if (status === 'completed') return '#10b981';
    if (status === 'in-progress') return 'var(--primary-container)';
    return 'var(--outline-variant)';
  };

  const getPhaseStatusText = (status) => {
    if (status === 'completed') return '✓ Completed';
    if (status === 'in-progress') return '⊙ Active';
    return '◯ Pending';
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          Loading project...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div style={{ backgroundColor: '#ffebee', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', border: '1px solid #ef5350' }}>
          <p style={{ color: '#c62828', margin: 0 }}>Error loading project: {error}</p>
        </div>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button className="btn">Back to Projects</button>
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          Project not found
        </div>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button className="btn">Back to Projects</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      {/* BACK BUTTON & GLOSSARY */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-container)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          Back to Projects
        </button>
        <button
          onClick={() => setShowGlossary(!showGlossary)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-container)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: '600',
            fontSize: '12px'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>help</span>
          Acronym Guide
        </button>
      </div>

      {/* GLOSSARY SECTION */}
      {showGlossary && (
        <div style={{ border: '1px solid var(--outline-variant)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', backgroundColor: 'var(--surface-container-low)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Acronym & Term Glossary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
            {acronymGlossary.map((item, idx) => (
              <div key={idx} style={{ paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--outline-variant)' }}>
                <p style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px' }}>{item.acronym}</span> — {item.full}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', lineHeight: '1.5' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="border-b pb-md mb-lg">
        <h1>{project.name}</h1>
        <div className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }} dangerouslySetInnerHTML={{ __html: project.description || '' }} />
      </div>

      {/* PROJECT INFO GRID */}
      <div className="grid grid-4 mb-lg">
        {[
          { label: 'Status', value: project.status, icon: 'info' },
          { label: 'BT Lead', value: project.btLead, icon: 'person' },
          { label: 'Start Date', value: project.startDate, icon: 'event' },
          { label: 'Target Date', value: project.targetDate, icon: 'date_range' }
        ].map((item, idx) => (
          <div key={idx} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <h3 className="label-bold">{item.label}</h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>
                {item.icon}
              </span>
            </div>
            <p className="body-md" style={{ color: 'var(--primary)' }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ADLC PHASE TIMELINE */}
      <div className="surface mb-lg">
        <h2 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          A-ADLC Lifecycle Progress
        </h2>

        {/* TIMELINE VISUALIZATION - RESPONSIVE GRID */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            {project.phases.map((phase, idx) => (
              <div
                key={`phase-${idx}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-sm)'
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: getPhaseColor(phase.status),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: '700',
                    flexShrink: 0
                  }}
                >
                  {phase.status === 'completed' ? '✓' : idx + 1}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: '600', color: getPhaseColor(phase.status), marginBottom: '4px', fontSize: '12px' }}>
                    {idx + 1}
                  </p>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '11px', fontWeight: '500', lineHeight: '1.3' }}>
                    {phase.status === 'completed' && phase.label.includes('In Progress')
                      ? phase.label.replace('In Progress', 'is Completed')
                      : phase.label}
                  </p>
                  <p style={{ color: 'var(--on-surface-variant)', marginTop: '4px', fontSize: '9px' }}>
                    {getPhaseStatusText(phase.status)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHANGE REQUEST & APPROVAL */}
      {(() => {
        const awaitingBtPhase = project.phases?.find(p => p.id === 'awaiting-bt');
        const pddApprovedPhase = project.phases?.find(p => p.id === 'pdd-approved');
        const sddPhase = project.phases?.find(p => p.id === 'sdd');
        const tddPhase = project.phases?.find(p => p.id === 'tdd');
        const isPddApproved = pddApprovedPhase?.status === 'completed';
        const canApprove = awaitingBtPhase?.status === 'completed' && pddApprovedPhase?.status === 'pending';
        const canStartSdd = isPddApproved && sddPhase?.status === 'pending';
        const sddInProgress = sddPhase?.status === 'in-progress';
        const isSddCompleted = sddPhase?.status === 'completed';
        const canStartTdd = isSddCompleted && tddPhase?.status === 'pending';
        const tddInProgress = tddPhase?.status === 'in-progress';

        const handleStartSdd = async () => {
          try {
            await submitJob(id, 'sdd', { projectId: id });
            const refreshed = await getProject(id);
            setProject(refreshed);
          } catch (err) {
            alert('Failed to start SDD phase: ' + err.message);
          }
        };

        const handleStartTdd = async () => {
          setTddDispatching(true);
          try {
            await submitJob(id, 'tdd', { projectId: id });
            const refreshed = await getProject(id);
            setProject(refreshed);
            if (!tddStartedAt) setTddStartedAt(Date.now());
          } catch (err) {
            alert('Failed to start TDD phase: ' + err.message);
          } finally {
            setTddDispatching(false);
          }
        };

        return (
          <div className="surface mb-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ margin: 0, paddingBottom: 0, border: 'none' }}>Document Management</h2>
              {isPddApproved && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '6px 12px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                  PDD Approved
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Link to={`/change-request/${id}`} style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>cloud_upload</span>
                  Submit Change Request / New PDD
                </button>
              </Link>
              {canApprove && (
                <Link to={`/pdd-approval/${id}`} style={{ textDecoration: 'none' }}>
                  <button className="btn btn-primary" style={{ backgroundColor: '#10b981' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>check_circle</span>
                    Approve Final PDD
                  </button>
                </Link>
              )}
              {isPddApproved && (
                <button
                  className="btn"
                  disabled
                  style={{
                    backgroundColor: 'var(--surface-container-low)',
                    color: 'var(--on-surface-variant)',
                    cursor: 'not-allowed',
                    opacity: 0.7,
                    border: '1px solid var(--outline-variant)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>check_circle</span>
                  Final PDD Approved
                </button>
              )}
              {canStartSdd && (
                <button
                  className="btn btn-primary"
                  onClick={handleStartSdd}
                  style={{ backgroundColor: 'var(--primary-container)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>architecture</span>
                  Start SDD Phase
                </button>
              )}
              {sddInProgress && (
                <button
                  className="btn"
                  disabled
                  style={{
                    backgroundColor: 'var(--surface-container-low)',
                    color: 'var(--on-surface-variant)',
                    cursor: 'not-allowed',
                    opacity: 0.7,
                    border: '1px solid var(--outline-variant)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>hourglass_top</span>
                  SDD In Progress
                </button>
              )}
              {canStartTdd && !tddDispatching && (
                <button
                  className="btn btn-primary"
                  onClick={handleStartTdd}
                  style={{ backgroundColor: 'var(--primary-container)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>account_tree</span>
                  Start TDD Phase
                </button>
              )}
              {tddDispatching && (
                <button
                  className="btn"
                  disabled
                  style={{
                    backgroundColor: 'var(--surface-container-low)',
                    color: 'var(--on-surface-variant)',
                    cursor: 'not-allowed',
                    border: '1px solid var(--outline-variant)'
                  }}
                >
                  <span className="material-symbols-outlined phase-progress-spinner" style={{ fontSize: '18px', marginRight: '8px' }}>progress_activity</span>
                  Dispatching Tech Lead Agent...
                </button>
              )}
              {tddInProgress && (() => {
                const elapsedMs = tddStartedAt ? (nowTick - tddStartedAt) : 0;
                const elapsedSec = Math.floor(elapsedMs / 1000);
                const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
                const ss = String(elapsedSec % 60).padStart(2, '0');
                // Simulated progress: ramp to ~95% over ~3 minutes, capped before 100%
                const ESTIMATED_MS = 180000;
                const simulatedPct = Math.min(95, Math.round((elapsedMs / ESTIMATED_MS) * 95));

                const steps = [
                  { key: 'queued', label: 'Job queued — Tech Lead Agent picking up work', threshold: 0 },
                  { key: 'reading', label: 'Reading approved SDD and BT responses', threshold: 5 },
                  { key: 'decomposing', label: 'Decomposing solution into modules and tasks', threshold: 25 },
                  { key: 'estimating', label: 'Estimating effort and dependencies', threshold: 55 },
                  { key: 'writing', label: 'Writing Technical Design Document', threshold: 75 }
                ];
                const activeIdx = steps.reduce((acc, s, i) => simulatedPct >= s.threshold ? i : acc, 0);

                return (
                  <div className="phase-progress-card">
                    <div className="phase-progress-header">
                      <span className="material-symbols-outlined phase-progress-spinner">progress_activity</span>
                      <div style={{ flex: 1 }}>
                        <p className="label-bold" style={{ margin: 0, color: 'var(--primary)' }}>
                          TDD Phase In Progress
                        </p>
                        <p className="body-sm" style={{ margin: 0, color: 'var(--on-surface-variant)' }}>
                          Tech Lead Agent is decomposing the SDD into technical tasks. This typically takes 1–3 minutes.
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p className="body-sm" style={{ margin: 0, color: 'var(--on-surface-variant)' }}>Elapsed</p>
                        <p style={{ margin: 0, fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--primary)' }}>
                          {mm}:{ss}
                        </p>
                      </div>
                    </div>
                    <div className="phase-progress-bar">
                      <div className="phase-progress-bar-fill" style={{ width: `${simulatedPct}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span className="body-sm" style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>
                        Working...
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        {simulatedPct}%
                      </span>
                    </div>
                    <div className="phase-progress-steps">
                      {steps.map((step, idx) => {
                        const done = idx < activeIdx;
                        const active = idx === activeIdx;
                        return (
                          <div key={step.key} className={`phase-progress-step ${active ? 'active' : ''}`}>
                            <span className="material-symbols-outlined" style={{ color: done ? '#10b981' : active ? 'var(--primary-container)' : 'var(--outline-variant)' }}>
                              {done ? 'check_circle' : active ? 'progress_activity' : 'radio_button_unchecked'}
                            </span>
                            <span>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
            <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: 'var(--space-md)' }}>
              {(() => {
                const statusOf = (pid) => project.phases?.find(p => p.id === pid)?.status || 'pending';
                const isTddCompleted = statusOf('tdd') === 'completed';
                const devStatus = statusOf('dev');
                const testCasesStatus = statusOf('test-cases');
                const sitStatus = statusOf('sit');
                const uatStatus = statusOf('uat');

                if (uatStatus === 'completed') {
                  return 'UAT sign-off received. All A-ADLC phases are complete.';
                }
                if (uatStatus === 'in-progress') {
                  return 'UAT is in progress. End users are validating the solution against acceptance criteria.';
                }
                if (sitStatus === 'completed') {
                  return 'SIT is complete. The project is ready to proceed to UAT.';
                }
                if (sitStatus === 'in-progress') {
                  return 'SIT is in progress. The QA Agent is executing integration test cases.';
                }
                if (testCasesStatus === 'completed') {
                  return 'Test cases are ready. The project is ready to proceed to SIT.';
                }
                if (testCasesStatus === 'in-progress') {
                  return 'Test case authoring is in progress. The QA Agent is generating test cases from the TDD.';
                }
                if (devStatus === 'completed') {
                  return 'Development is completed. Power Platform code has been generated. The project is ready to proceed to Test Case creation.';
                }
                if (devStatus === 'in-progress') {
                  return 'Development is in progress. The Developer Agent is generating source code per the TDD.';
                }
                if (isTddCompleted && devStatus === 'pending') {
                  return 'TDD is complete. The project is ready to proceed to the Development phase.';
                }
                if (tddInProgress) {
                  return 'TDD is in progress. The Tech Lead Agent is decomposing the SDD into technical tasks.';
                }
                if (canStartTdd) {
                  return 'SDD is complete. Click "Start TDD Phase" to dispatch the Tech Lead Agent.';
                }
                if (sddInProgress) {
                  return 'SDD is in progress. The Architect Agent is generating the Solution Design Document.';
                }
                if (canStartSdd) {
                  return 'The final PDD has been approved. Click "Start SDD Phase" to dispatch the Architect Agent.';
                }
                if (isPddApproved) {
                  return 'The final PDD has been approved. The project is ready to proceed to the Architecture phase.';
                }
                return 'Upload new or revised PDD documents. When ready, approve the final PDD version before proceeding to Architecture phase.';
              })()}
            </p>
          </div>
        );
      })()}

      {/* BA GAPS */}
      {project.baGaps && project.baGaps.length > 0 && (
        <div className="surface mb-lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <h2>BA Review Findings</h2>
            {project.phases[0]?.status === 'completed' && (!project.btResponses || Object.keys(project.btResponses).length === 0) && (
              <Link to={`/gap-response/${id}`} style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary">Respond to BA Gaps</button>
              </Link>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {project.baGaps.map((gap, idx) => {
              const btResponse = project.btResponses?.[gap.id];
              return (
                <div key={gap.id} style={{
                  border: '1px solid var(--outline-variant)',
                  borderLeft: '3px solid ' + (btResponse ? '#10b981' : 'var(--primary-container)'),
                  padding: 'var(--space-md)',
                  backgroundColor: btResponse ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                    <div style={{ flex: 1 }}>
                      <p className="label-bold" style={{ color: 'var(--primary-container)', marginBottom: 'var(--space-xs)' }}>
                        Question {gap.id}
                      </p>
                      <div className="body-md" dangerouslySetInnerHTML={{ __html: gap.question || '' }} />
                    </div>
                    {btResponse && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '4px 8px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        borderRadius: '0px',
                        textTransform: 'uppercase',
                        marginLeft: 'var(--space-md)',
                        whiteSpace: 'nowrap'
                      }}>
                        ✓ Answered
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      backgroundColor: 'var(--outline-variant)',
                      borderRadius: '0px',
                      textTransform: 'uppercase'
                    }}>
                      {gap.category}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      backgroundColor: gap.complexity === 'high' ? '#fee2e2' : gap.complexity === 'medium' ? '#fef3c7' : '#dbeafe',
                      color: gap.complexity === 'high' ? '#991b1b' : gap.complexity === 'medium' ? '#92400e' : '#1e40af',
                      borderRadius: '0px',
                      textTransform: 'capitalize'
                    }}>
                      {gap.complexity} complexity
                    </span>
                  </div>

                  {btResponse && (
                    <div style={{
                      padding: 'var(--space-md)',
                      backgroundColor: 'white',
                      border: '1px solid var(--outline-variant)',
                      marginTop: 'var(--space-md)'
                    }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#10b981', marginBottom: '8px' }}>
                        BT Response
                      </p>
                      <div className="body-md" style={{ margin: '0 0 12px 0', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: btResponse.text || '' }} />
                      <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', margin: 0 }}>
                        Submitted on {new Date(btResponse.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PENDING CCB APPROVALS */}
      {project.changeRequests && project.changeRequests.some(cr => cr.status === 'pending-ccb') && (
        <div className="surface mb-lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <h2>Pending CCB Approvals</h2>
            <Link to={`/cr-approval/${id}`} style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ backgroundColor: '#f59e0b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>gavel</span>
                Review Change Request
              </button>
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {project.changeRequests
              .filter(cr => cr.status === 'pending-ccb')
              .map((cr, idx) => (
                <div key={idx} style={{
                  border: '1px solid #f59e0b',
                  borderLeft: '3px solid #f59e0b',
                  padding: 'var(--space-md)',
                  backgroundColor: 'rgba(245, 158, 11, 0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                    <div style={{ flex: 1 }}>
                      <p className="label-bold" style={{ color: '#f59e0b', marginBottom: 'var(--space-xs)' }}>
                        Change Request
                      </p>
                      <p className="body-md">{cr.reason}</p>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '0px',
                      textTransform: 'capitalize'
                    }}>
                      Awaiting CCB
                    </span>
                  </div>
                  {cr.revisionNotes && (
                    <p className="body-sm" style={{ color: 'var(--on-surface-variant)', margin: '8px 0 0 0' }}>
                      {cr.revisionNotes.substring(0, 150)}...
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* KEY METRICS */}
      {(() => {
        const phaseStatus = (id) => project.phases?.find(p => p.id === id)?.status || 'pending';
        const pddReviewStarted = phaseStatus('pdd-review') !== 'pending';
        const approvedCrCount = (project.changeRequests || []).filter(cr => cr.status === 'approved').length;
        const computedPddVersions = Math.max(
          project.pddVersions || 0,
          (pddReviewStarted ? 1 : 0) + approvedCrCount
        );

        const tasksTotal = project.tddDocument?.tasks?.length || project.keyMetrics?.tasksTotal || 0;
        const devStatus = phaseStatus('dev');
        const storedCompleted = project.keyMetrics?.tasksCompleted || 0;
        const devEffectivelyCompleted = devStatus === 'completed' ||
          phaseStatus('test-cases') !== 'pending' ||
          phaseStatus('sit') !== 'pending' ||
          phaseStatus('uat') !== 'pending';
        const tasksCompleted = devEffectivelyCompleted
          ? tasksTotal
          : devStatus === 'in-progress'
            ? Math.min(storedCompleted, tasksTotal)
            : 0;

        const bugs = project.bugs || [];
        const highBugs = bugs.filter(b => b.severity === 'high' || b.severity === 'critical').length;
        const mediumBugs = bugs.filter(b => b.severity === 'medium').length;
        const lowBugs = bugs.filter(b => b.severity === 'low').length;
        const codeQualityBase = devStatus === 'completed' || phaseStatus('sit') !== 'pending' ? 100 : 0;
        const codeQualityPenalty = (highBugs * 10) + (mediumBugs * 5) + (lowBugs * 2);
        const computedCodeQuality = codeQualityBase === 0
          ? (project.keyMetrics?.codeQuality || 0)
          : Math.max(0, codeQualityBase - codeQualityPenalty);

        const testCasesStatus = phaseStatus('test-cases');
        const sitStatus = phaseStatus('sit');
        const uatStatus = phaseStatus('uat');
        // Test coverage reflects whether all in-scope scenarios are captured.
        // Once the QA Agent has authored the full test case suite, coverage is 100%.
        const computedTestCoverage = uatStatus === 'completed'
          ? 100
          : sitStatus === 'completed'
            ? 100
            : sitStatus === 'in-progress'
              ? 100
              : testCasesStatus === 'completed'
                ? 100
                : testCasesStatus === 'in-progress'
                  ? 50
                  : (project.keyMetrics?.testCoverage || 0);

        return (
          <div className="surface mb-lg">
            <h2 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              Phase Metrics
            </h2>
            <div className="grid grid-4 mb-lg">
              {[
                { label: 'Tasks Completed', value: tasksCompleted, total: tasksTotal, icon: 'task_alt' },
                { label: 'Code Quality', value: computedCodeQuality, unit: '%', icon: 'rate_review' },
                { label: 'Test Coverage', value: computedTestCoverage, unit: '%', icon: 'assessment' },
                { label: 'PDD Versions', value: computedPddVersions, icon: 'description' }
              ].map((metric, idx) => (
                <div key={idx} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <h3 className="label-bold">{metric.label}</h3>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>
                      {metric.icon}
                    </span>
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--primary)', fontFamily: 'JetBrains Mono' }}>
                    {metric.value}{metric.unit}{metric.total ? `/${metric.total}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* TASK BREAKDOWN */}
      {project.tddDocument?.tasks?.length > 0 && (() => {
        const phaseStatus = (pid) => project.phases?.find(p => p.id === pid)?.status || 'pending';
        const devStatus = phaseStatus('dev');
        const devEffectivelyCompleted = devStatus === 'completed' ||
          phaseStatus('test-cases') !== 'pending' ||
          phaseStatus('sit') !== 'pending' ||
          phaseStatus('uat') !== 'pending';
        const devInProgress = !devEffectivelyCompleted && devStatus === 'in-progress';
        const tasks = project.tddDocument.tasks;
        const storedCompleted = Math.min(project.keyMetrics?.tasksCompleted || 0, tasks.length);

        const getTaskStatus = (idx) => {
          if (devEffectivelyCompleted) return 'completed';
          if (devInProgress) {
            if (idx < storedCompleted) return 'completed';
            if (idx === storedCompleted) return 'in-progress';
          }
          return 'pending';
        };

        const completedCount = tasks.filter((_, i) => getTaskStatus(i) === 'completed').length;
        const inProgressCount = tasks.filter((_, i) => getTaskStatus(i) === 'in-progress').length;
        const pendingCount = tasks.length - completedCount - inProgressCount;

        return (
          <div className="surface mb-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <h2 style={{ margin: 0, paddingBottom: 0, border: 'none' }}>
                Task Breakdown <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--on-surface-variant)', fontSize: '16px', fontWeight: 400 }}>({completedCount}/{tasks.length})</span>
              </h2>
              <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '12px', flexWrap: 'wrap' }}>
                <span style={{ color: '#10b981', fontWeight: 600 }}>✓ <span style={{ fontFamily: 'JetBrains Mono' }}>{completedCount}</span> Completed</span>
                <span style={{ color: 'var(--primary-container)', fontWeight: 600 }}>⊙ <span style={{ fontFamily: 'JetBrains Mono' }}>{inProgressCount}</span> In Progress</span>
                <span style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>◯ <span style={{ fontFamily: 'JetBrains Mono' }}>{pendingCount}</span> Pending</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {tasks.map((task, idx) => {
                const status = getTaskStatus(idx);
                const statusBg = status === 'completed' ? '#10b981' : status === 'in-progress' ? 'var(--primary-container)' : 'var(--outline-variant)';
                const statusTextColor = status === 'pending' ? 'var(--on-surface-variant)' : 'white';
                const statusLabel = status === 'completed' ? '✓ Completed' : status === 'in-progress' ? '⊙ In Progress' : '◯ Pending';
                const complexityBg = task.complexity === 'high' ? '#fee2e2' : task.complexity === 'medium' ? '#fef3c7' : '#dbeafe';
                const complexityColor = task.complexity === 'high' ? '#991b1b' : task.complexity === 'medium' ? '#92400e' : '#1e40af';

                return (
                  <div key={task.id ?? idx} style={{
                    border: '1px solid var(--outline-variant)',
                    borderLeft: `3px solid ${statusBg}`,
                    padding: 'var(--space-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    backgroundColor: status === 'in-progress' ? 'rgba(0,0,0,0.02)' : 'transparent'
                  }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--on-surface-variant)',
                      minWidth: '40px'
                    }}>
                      #{String(task.id ?? (idx + 1)).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="label-bold" style={{ marginBottom: '4px' }}>
                        {task.title}
                      </p>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', fontSize: '11px', color: 'var(--on-surface-variant)', flexWrap: 'wrap' }}>
                        {task.module && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: 'var(--outline-variant)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontSize: '10px'
                          }}>
                            {task.module}
                          </span>
                        )}
                        {task.complexity && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: complexityBg,
                            color: complexityColor,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            fontSize: '10px'
                          }}>
                            {task.complexity}
                          </span>
                        )}
                        {task.estimatedHours != null && (
                          <span style={{ fontFamily: 'JetBrains Mono' }}>
                            {task.estimatedHours}h
                          </span>
                        )}
                        {Array.isArray(task.dependencies) && task.dependencies.length > 0 && (
                          <span style={{ fontFamily: 'JetBrains Mono' }}>
                            deps: {task.dependencies.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      backgroundColor: statusBg,
                      color: statusTextColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap'
                    }}>
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {!devEffectivelyCompleted && !devInProgress && (
              <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: 'var(--space-md)' }}>
                All tasks pending. Task status will advance once the Development phase begins.
              </p>
            )}
          </div>
        );
      })()}

      {/* PROJECT SCOPE & OBJECTIVES */}
      <div className="surface mb-lg">
        <h2 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          Project Definition
        </h2>
        <div className="grid grid-2 mb-lg">
          <div>
            <h3 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              Scope
            </h3>
            <div className="body-md" style={{ color: 'var(--on-surface-variant)' }} dangerouslySetInnerHTML={{ __html: project.scope || '' }} />
          </div>
          <div>
            <h3 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              Success Criteria
            </h3>
            <div className="body-md" style={{ color: 'var(--on-surface-variant)' }} dangerouslySetInnerHTML={{ __html: project.criteria || '' }} />
          </div>
        </div>
      </div>

      {/* ARTIFACTS & AUDIT TABS */}
      {(() => {
        const phaseStatus = (pid) => project.phases?.find(p => p.id === pid)?.status || 'pending';
        const phaseLabel = (pid) => project.phases?.find(p => p.id === pid)?.label || pid;

        const completedCount = project.phases?.filter(p => p.status === 'completed').length || 0;
        const totalCount = project.phases?.length || 0;
        const overallProgress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
        const activePhase = project.phases?.find(p => p.status === 'in-progress');
        const nextPendingPhase = project.phases?.find(p => p.status === 'pending');
        const lastCompletedPhase = [...(project.phases || [])].reverse().find(p => p.status === 'completed');
        const currentPhaseLabel = activePhase
          ? activePhase.label
          : completedCount === totalCount && totalCount > 0
            ? 'All Phases Completed'
            : nextPendingPhase && completedCount > 0
              ? `Awaiting: ${nextPendingPhase.label}`
              : nextPendingPhase
                ? `Not Started — ${nextPendingPhase.label}`
                : 'Pending Start';
        const currentPhaseSubLabel = activePhase
          ? 'In Progress'
          : completedCount === totalCount && totalCount > 0
            ? null
            : lastCompletedPhase
              ? `Last completed: ${lastCompletedPhase.label}`
              : null;
        const daysRemaining = (() => {
          if (!project.targetDate) return null;
          const target = new Date(project.targetDate);
          const today = new Date();
          if (isNaN(target.getTime())) return null;
          const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
          return diff;
        })();
        const gapsCount = project.baGaps?.length || 0;
        const responsesCount = Object.keys(project.btResponses || {}).length;

        // Derive artifacts from phase status — dates align with the Activity Timeline offsets below.
        const derivedArtifacts = [];
        const artifactBaseDate = project.startDate ? new Date(project.startDate) : new Date();
        const artifactToday = new Date();
        const artifactTodayIso = artifactToday.toISOString().slice(0, 10);
        const artifactDateOffset = (offsetDays) => {
          const d = new Date(artifactBaseDate);
          d.setDate(d.getDate() + offsetDays);
          if (d > artifactToday) return artifactTodayIso;
          return d.toISOString().slice(0, 10);
        };
        if (phaseStatus('pdd-review') !== 'pending') {
          derivedArtifacts.push({
            name: 'Process Definition Document (PDD)',
            type: 'docx',
            phase: 'PDD Review',
            size: '1.2 MB',
            uploadedDate: artifactDateOffset(0),
            uploadedBy: project.btLead || 'BT Lead',
            status: phaseStatus('pdd-approved') === 'completed' ? 'approved' : 'in-progress'
          });
        }
        if (phaseStatus('pdd-review') === 'completed') {
          derivedArtifacts.push({
            name: 'BA Gap Analysis Report',
            type: 'docx',
            phase: 'BA Review',
            size: '420 KB',
            uploadedDate: artifactDateOffset(2),
            uploadedBy: 'BA Agent',
            status: 'approved'
          });
        }
        if (responsesCount > 0) {
          derivedArtifacts.push({
            name: 'BT Gap Responses',
            type: 'docx',
            phase: 'BT Response',
            size: `${(responsesCount * 80)} KB`,
            uploadedDate: artifactDateOffset(3),
            uploadedBy: project.btLead || 'BT Lead',
            status: 'approved'
          });
        }
        if (phaseStatus('pdd-approved') === 'completed') {
          derivedArtifacts.push({
            name: 'Approved Final PDD',
            type: 'docx',
            phase: 'PDD Approved',
            size: '1.4 MB',
            uploadedDate: artifactDateOffset(4),
            uploadedBy: 'CCB',
            status: 'approved'
          });
        }
        if (phaseStatus('sdd') !== 'pending') {
          derivedArtifacts.push({
            name: 'Solution Design Document (SDD)',
            type: 'docx',
            phase: 'SDD',
            size: '— generated on download —',
            uploadedDate: artifactDateOffset(5),
            uploadedBy: 'Architect Agent',
            status: phaseStatus('sdd') === 'completed' ? 'approved' : 'in-progress'
          });
        }
        if (phaseStatus('tdd') !== 'pending') {
          derivedArtifacts.push({
            name: 'Technical Design Document (TDD)',
            type: 'docx',
            phase: 'TDD',
            size: '— generated on download —',
            uploadedDate: artifactDateOffset(7),
            uploadedBy: 'Tech Lead Agent',
            status: phaseStatus('tdd') === 'completed' ? 'approved' : 'in-progress'
          });
        }
        if (phaseStatus('dev') !== 'pending') {
          derivedArtifacts.push({
            name: 'Source Code Package',
            type: 'other',
            phase: 'Development',
            size: '8.6 MB',
            uploadedDate: artifactTodayIso,
            uploadedBy: 'Developer Agent',
            status: phaseStatus('dev') === 'completed' ? 'approved' : 'in-progress'
          });
        }
        if (phaseStatus('test-cases') !== 'pending') {
          derivedArtifacts.push({
            name: 'Test Case Suite',
            type: 'other',
            phase: 'Test Cases',
            size: '640 KB',
            uploadedDate: artifactTodayIso,
            uploadedBy: 'QA Agent',
            status: phaseStatus('test-cases') === 'completed' ? 'approved' : 'in-progress'
          });
        }
        if (phaseStatus('sit') !== 'pending') {
          derivedArtifacts.push({
            name: 'SIT Execution Report',
            type: 'pdf',
            phase: 'SIT',
            size: '980 KB',
            uploadedDate: artifactDateOffset(15),
            uploadedBy: 'QA Agent',
            status: phaseStatus('sit') === 'completed' ? 'approved' : 'in-progress'
          });
        }
        if (phaseStatus('uat') !== 'pending') {
          derivedArtifacts.push({
            name: 'UAT Sign-Off Report',
            type: 'pdf',
            phase: 'UAT',
            size: '760 KB',
            uploadedDate: artifactDateOffset(18),
            uploadedBy: project.btLead || 'BT Lead',
            status: phaseStatus('uat') === 'completed' ? 'approved' : 'in-progress'
          });
        }

        const registeredArtifactNames = new Set(
          (project.artifacts || [])
            .map(a => (a && typeof a.name === 'string' ? a.name : null))
            .filter(Boolean)
        );
        const filteredDerived = derivedArtifacts.filter(
          a => !registeredArtifactNames.has(a.name) &&
               !registeredArtifactNames.has(`${a.name} (CSV)`)
        );
        const allArtifacts = [...(project.artifacts || []), ...filteredDerived].sort((a, b) => {
          const tA = new Date(a.uploadedDate).getTime();
          const tB = new Date(b.uploadedDate).getTime();
          const safeA = isNaN(tA) ? 0 : tA;
          const safeB = isNaN(tB) ? 0 : tB;
          return safeB - safeA;
        });

        const safeProjectName = (project.name || 'Project').replace(/[^a-z0-9_-]+/gi, '_');
        const todayIso = new Date().toISOString().slice(0, 10);

        const triggerDownload = (blob, fileName) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 0);
        };

        const xmlEscape = (s) => String(s == null ? '' : s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

        // ---- Minimal in-browser .docx builder (Word-compatible) ----
        const docxParagraph = (text, { bold = false, size = 22, color, heading } = {}) => {
          const lines = String(text == null ? '' : text).split(/\r?\n/);
          const runs = lines.map((line, i) => {
            const rPr = [];
            if (bold) rPr.push('<w:b/><w:bCs/>');
            if (color) rPr.push(`<w:color w:val="${color}"/>`);
            rPr.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`);
            const rPrXml = `<w:rPr>${rPr.join('')}</w:rPr>`;
            const br = i > 0 ? '<w:br/>' : '';
            return `<w:r>${rPrXml}${br}<w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`;
          }).join('');
          const pStyle = heading ? `<w:pStyle w:val="Heading${heading}"/>` : '';
          return `<w:p><w:pPr>${pStyle}<w:spacing w:after="120"/></w:pPr>${runs}</w:p>`;
        };

        const docxHeading = (text, level = 1) => {
          const size = level === 1 ? 36 : level === 2 ? 28 : 24;
          return `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/><w:spacing w:before="240" w:after="120"/></w:pPr>` +
            `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="0A1628"/></w:rPr>` +
            `<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
        };

        const docxTable = (rows) => {
          const grid = '<w:tblGrid><w:gridCol w:w="2800"/><w:gridCol w:w="6800"/></w:tblGrid>';
          const tblPr = `<w:tblPr><w:tblW w:w="9600" w:type="dxa"/><w:tblBorders>` +
            `<w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
            `<w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
            `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
            `<w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
            `<w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
            `<w:insideV w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
            `</w:tblBorders></w:tblPr>`;
          const trs = rows.map(([label, value]) => {
            const labelCell =
              `<w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/></w:tcPr>` +
              `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>` +
              `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/></w:rPr>` +
              `<w:t xml:space="preserve">${xmlEscape(label)}</w:t></w:r></w:p></w:tc>`;
            const valueLines = String(value == null ? '' : value).split(/\r?\n/);
            const valueRuns = valueLines.map((l, i) => {
              const br = i > 0 ? '<w:br/>' : '';
              return `<w:r><w:rPr><w:sz w:val="20"/></w:rPr>${br}<w:t xml:space="preserve">${xmlEscape(l)}</w:t></w:r>`;
            }).join('');
            const valueCell =
              `<w:tc><w:tcPr><w:tcW w:w="6800" w:type="dxa"/></w:tcPr>` +
              `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${valueRuns}</w:p></w:tc>`;
            return `<w:tr>${labelCell}${valueCell}</w:tr>`;
          }).join('');
          return `<w:tbl>${tblPr}${grid}${trs}</w:tbl><w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
        };

        const buildClientSideDocx = async (bodyXml, fileName) => {
          const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;
          const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
</w:styles>`;
          const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;
          const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;
          const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
          const nowIso = new Date().toISOString();
          const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(fileName)}</dc:title>
  <dc:creator>A-ADLC Platform</dc:creator>
  <cp:lastModifiedBy>A-ADLC Platform</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;

          const zip = new JSZip();
          zip.file('[Content_Types].xml', contentTypesXml);
          zip.folder('_rels').file('.rels', rootRels);
          zip.folder('word').file('document.xml', documentXml);
          zip.folder('word').file('styles.xml', stylesXml);
          zip.folder('word/_rels').file('document.xml.rels', docRels);
          zip.folder('docProps').file('core.xml', coreXml);
          return zip.generateAsync({
            type: 'blob',
            mimeType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          });
        };

        const buildProjectHeader = (subtitle) => (
          docxHeading(project.name || 'Project', 1) +
          docxParagraph(subtitle, { bold: true, size: 24, color: 'B8341A' }) +
          docxTable([
            ['Project', project.name || 'N/A'],
            ['Project ID', project.id || project._id || 'N/A'],
            ['BT Lead', project.btLead || 'BT Lead'],
            ['Start Date', project.startDate || 'N/A'],
            ['Target Date', project.targetDate || 'N/A'],
            ['Generated', todayIso]
          ])
        );

        const buildPddDocxBody = () => {
          const gaps = project.baGaps || [];
          const responses = project.btResponses || {};
          let body = buildProjectHeader('Process Definition Document (PDD)');
          body += docxHeading('1. Project Description', 2);
          body += docxParagraph(project.description || '(No description recorded)');
          body += docxHeading('2. Scope', 2);
          body += docxParagraph(project.scope || '(No scope recorded)');
          if (project.objectives) {
            body += docxHeading('3. Objectives', 2);
            body += docxParagraph(project.objectives);
          }
          body += docxHeading('4. Success Criteria', 2);
          body += docxParagraph(project.criteria || '(No success criteria recorded)');
          if (gaps.length > 0) {
            body += docxHeading('5. BA Clarifications & BT Responses', 2);
            gaps.forEach((g, i) => {
              const resp = responses[g.id];
              body += docxParagraph(`Q${i + 1}. ${g.question}`, { bold: true, size: 22 });
              body += docxTable([
                ['Category', g.category || 'N/A'],
                ['Complexity', (g.complexity || 'medium').toUpperCase()],
                ...(g.pddReference ? [['PDD Reference', g.pddReference]] : []),
                ...(g.impactIfUnanswered ? [['Impact if Unanswered', g.impactIfUnanswered]] : []),
                ['BT Response', (resp && resp.text) ? resp.text : '(No response recorded)'],
                ['Responded By', resp ? `${resp.submittedBy || 'BT Team'}${resp.submittedAt ? ' — ' + new Date(resp.submittedAt).toLocaleString() : ''}` : '—']
              ]);
            });
          }
          return body;
        };

        const buildBaGapReportBody = () => {
          const gaps = project.baGaps || [];
          const responses = project.btResponses || {};
          const answered = gaps.filter(g => responses[g.id]).length;
          let body = buildProjectHeader('BA Gap Analysis Report');
          body += docxHeading('Executive Summary', 2);
          body += docxTable([
            ['Total Gaps Raised', String(gaps.length)],
            ['Gaps Answered', String(answered)],
            ['Gaps Outstanding', String(gaps.length - answered)],
            ['Reviewing Agent', 'BA Agent'],
            ['Report Date', todayIso]
          ]);
          body += docxParagraph(
            'The Business Analyst (BA) Agent reviewed the Process Definition Document (PDD) ' +
            'for gaps, ambiguities, and completeness. Each gap below was raised against a specific ' +
            'aspect of the PDD and requires a definitive BT response before the project can ' +
            'progress to the Architecture phase.'
          );
          if (gaps.length === 0) {
            body += docxParagraph('No gaps were identified during BA review.');
            return body;
          }
          body += docxHeading('Detailed Findings', 2);
          gaps.forEach((g, i) => {
            body += docxHeading(`Gap ${i + 1}: ${g.category || 'General'}`, 3);
            const rows = [
              ['Question', g.question],
              ['Category', g.category || 'N/A'],
              ['Complexity', (g.complexity || 'medium').toUpperCase()]
            ];
            if (g.pddReference) rows.push(['PDD Reference', g.pddReference]);
            if (g.answerHint) rows.push(['Expected Answer Shape', g.answerHint]);
            if (g.impactIfUnanswered) rows.push(['Impact if Unanswered', g.impactIfUnanswered]);
            rows.push(['Status', responses[g.id] ? 'Answered' : 'Outstanding']);
            body += docxTable(rows);
          });
          return body;
        };

        const buildBtResponsesBody = () => {
          const gaps = project.baGaps || [];
          const responses = project.btResponses || {};
          let body = buildProjectHeader('BT Gap Responses');
          body += docxHeading('Summary', 2);
          body += docxTable([
            ['Total BA Gaps', String(gaps.length)],
            ['Responses Submitted', String(Object.keys(responses).length)],
            ['Responded By', project.btLead || 'BT Lead'],
            ['Report Date', todayIso]
          ]);
          body += docxParagraph(
            'This document captures the official BT responses to the gaps raised by the BA Agent ' +
            'during the PDD review cycle. These responses form part of the approved scope for ' +
            'downstream Architecture, TDD and Development work.'
          );
          if (Object.keys(responses).length === 0) {
            body += docxParagraph('No BT responses have been submitted yet.');
            return body;
          }
          body += docxHeading('Responses', 2);
          gaps.forEach((g, i) => {
            const resp = responses[g.id];
            if (!resp) return;
            body += docxParagraph(`Q${i + 1}. ${g.question}`, { bold: true, size: 22 });
            body += docxTable([
              ['Category', g.category || 'N/A'],
              ['BT Response', resp.text || '(No response text)'],
              ['Submitted By', resp.submittedBy || project.btLead || 'BT Lead'],
              ['Submitted At', resp.submittedAt ? new Date(resp.submittedAt).toLocaleString() : '—']
            ]);
          });
          return body;
        };

        const buildApprovedPddBody = () => {
          const gaps = project.baGaps || [];
          const responses = project.btResponses || {};
          let body = buildProjectHeader('Approved Final PDD');
          body += docxParagraph(
            'This is the Approved Final Process Definition Document. It has been reviewed by the ' +
            'BA Agent, clarified by the BT team, and signed off by the Change Control Board (CCB). ' +
            'This version represents the authoritative scope for the project.',
            { size: 22 }
          );
          body += docxHeading('Approval Record', 2);
          body += docxTable([
            ['Project Name', project.name || 'N/A'],
            ['Project ID', project.id || project._id || 'N/A'],
            ['BT Lead', project.btLead || 'BT Lead'],
            ['Status at Approval', 'Approved — Ready for Architecture phase'],
            ['Original PDD Version', '1.x (as uploaded)'],
            ['Approved PDD Version', '2.0 (Final — incl. BA clarifications)'],
            ['Approved By', 'Change Control Board (CCB)'],
            ['Approved On', todayIso],
            ['Generated By', 'A-ADLC Platform']
          ]);
          body += docxHeading('1. Project Description', 2);
          body += docxParagraph(project.description || '(No description recorded)');
          body += docxHeading('2. Scope', 2);
          body += docxParagraph(project.scope || '(No scope recorded)');
          if (project.objectives) {
            body += docxHeading('3. Objectives', 2);
            body += docxParagraph(project.objectives);
          }
          body += docxHeading('4. Success Criteria', 2);
          body += docxParagraph(project.criteria || '(No success criteria recorded)');
          body += docxHeading('Annexure A — Clarifications from BA Review', 2);
          if (gaps.length === 0) {
            body += docxParagraph('No clarifications were required during BA review.');
          } else {
            body += docxParagraph(
              `The BA Agent raised ${gaps.length} clarification${gaps.length === 1 ? '' : 's'} during ` +
              `review. ${Object.keys(responses).length} response${Object.keys(responses).length === 1 ? '' : 's'} ` +
              'have been provided by the BT team and form part of the approved scope below.'
            );
            gaps.forEach((g, i) => {
              const resp = responses[g.id];
              body += docxParagraph(`Q${i + 1}. ${g.question}`, { bold: true, size: 22 });
              const rows = [
                ['Category', g.category || 'N/A'],
                ['Complexity', (g.complexity || 'medium').toUpperCase()]
              ];
              if (g.pddReference) rows.push(['PDD Reference', g.pddReference]);
              rows.push(['BT Response', (resp && resp.text) ? resp.text : '(No response recorded)']);
              rows.push(['Responded By', resp ? `${resp.submittedBy || 'BT Team'}${resp.submittedAt ? ' — ' + new Date(resp.submittedAt).toLocaleString() : ''}` : '—']);
              body += docxTable(rows);
            });
          }
          return body;
        };

        // Map document-style artifacts to their content builders.
        const clientDocxBuilders = {
          'Process Definition Document (PDD)': {
            build: buildPddDocxBody,
            fileName: `PDD_${safeProjectName}.docx`
          },
          'BA Gap Analysis Report': {
            build: buildBaGapReportBody,
            fileName: `BA_Gap_Analysis_${safeProjectName}.docx`
          },
          'BT Gap Responses': {
            build: buildBtResponsesBody,
            fileName: `BT_Gap_Responses_${safeProjectName}.docx`
          },
          'Approved Final PDD': {
            build: buildApprovedPddBody,
            fileName: `Approved_PDD_${safeProjectName}_v2.0.docx`
          }
        };

        const handleDownloadArtifact = async (artifact) => {
          // 0) Selected document artifacts serve user-supplied .docx files
          //    bundled under public/assets/ so the source documents are
          //    returned verbatim instead of a generated stub.
          const staticArtifacts = {
            'Process Definition Document (PDD)': {
              url: `${process.env.PUBLIC_URL || ''}/assets/PDD_Graphic_Tracker_Autonumbering_v1.2_latest.docx`,
              fileName: 'PDD_Graphic Tracker Autonumbering_v1.2_latest.docx'
            },
            'Approved Final PDD': {
              url: `${process.env.PUBLIC_URL || ''}/assets/Approved_Final_PDD_Graphic_Autonumber_v2.0.docx`,
              fileName: 'Approved_Final_PDD_Graphic_Autonumber_v2.0.docx'
            },
            'Test Case Suite': {
              url: `${process.env.PUBLIC_URL || ''}/assets/GraphicAutonumber_TestCases.csv`,
              fileName: 'GraphicAutonumber_TestCases.csv'
            },
            'Test Case Suite (CSV)': {
              url: `${process.env.PUBLIC_URL || ''}/assets/GraphicAutonumber_TestCases.csv`,
              fileName: 'GraphicAutonumber_TestCases.csv'
            }
          };
          const staticEntry = staticArtifacts[artifact.name];
          if (staticEntry) {
            try {
              const resp = await fetch(staticEntry.url);
              if (resp.ok) {
                const blob = await resp.blob();
                triggerDownload(blob, staticEntry.fileName);
                return;
              }
            } catch (_) {
              // fall through to the client-side builder below
            }
          }

          // 1) Client-side .docx for the four "document" artifacts. The Approved
          //    Final PDD also tries the server first so an uploaded PDD with
          //    embedded diagrams is preserved when available.
          const clientBuilder = clientDocxBuilders[artifact.name];
          if (clientBuilder) {
            if (artifact.name === 'Approved Final PDD') {
              try {
                const resp = await fetch(`/api/projects/${id}/approved-pdd`);
                if (resp.ok) {
                  const blob = await resp.blob();
                  const cd = resp.headers.get('content-disposition') || '';
                  const m = /filename="([^"]+)"/.exec(cd);
                  const fileName = (m && m[1]) || clientBuilder.fileName;
                  triggerDownload(blob, fileName);
                  return;
                }
              } catch (_) {
                // fall through to client-side build
              }
            }
            try {
              const body = clientBuilder.build();
              const blob = await buildClientSideDocx(body, clientBuilder.fileName);
              triggerDownload(blob, clientBuilder.fileName);
            } catch (err) {
              alert(`Could not generate "${artifact.name}":\n\n${err.message}`);
            }
            return;
          }

          // 2) Server-streamed artifacts (SDD, TDD, test-case CSV, source code).
          const serverGenerated = {
            'Solution Design Document (SDD)': {
              path: `/api/projects/${id}/sdd`,
              fallbackName: `SDD_${safeProjectName}.docx`,
              recovery:
                'To recover: re-run the Architect phase (or run scripts/regenerate-sdd.js), ' +
                'then download again.'
            },
            'Technical Design Document (TDD)': {
              path: `/api/projects/${id}/tdd`,
              fallbackName: `TDD_${safeProjectName}.docx`,
              recovery:
                'To recover: re-run the Tech Lead phase (or run scripts/regenerate-tdd.js), ' +
                'then download again.'
            },
            'Test Case Suite (CSV)': {
              path: `/api/projects/${id}/test-cases-csv`,
              fallbackName: `TestCases_${safeProjectName}.csv`,
              recovery:
                'To recover: re-run the QA Agent to regenerate the Test Case CSV at ' +
                'artifacts/test-cases/, then download again.'
            },
            'Source Code Package': {
              path: `/api/projects/${id}/source-code`,
              fallbackName: `SourceCode_${safeProjectName}.zip`,
              recovery:
                'To recover: re-run the Developer Agent to regenerate the source code zip, ' +
                'then download again.'
            }
          };

          const server = serverGenerated[artifact.name];
          if (server) {
            try {
              const resp = await fetch(server.path);
              if (!resp.ok) {
                const errBody = await resp.json().catch(() => ({}));
                throw new Error(errBody.error || `Server returned ${resp.status}`);
              }
              const blob = await resp.blob();
              const cd = resp.headers.get('content-disposition') || '';
              const m = /filename="([^"]+)"/.exec(cd);
              const fileName = (m && m[1]) || server.fallbackName;
              triggerDownload(blob, fileName);
              return;
            } catch (err) {
              alert(
                `Could not generate "${artifact.name}":\n\n${err.message}\n\n${server.recovery}`
              );
              return;
            }
          }

          const safeBase = (artifact.name || 'artifact').replace(/[^a-z0-9-_]+/gi, '_');
          const lines = [
            `Project:       ${project.name}`,
            `Project ID:    ${project.id || 'N/A'}`,
            `Phase:         ${artifact.phase}`,
            `Status:        ${artifact.status}`,
            `Reported Size: ${artifact.size}`,
            `Uploaded:      ${artifact.uploadedDate} by ${artifact.uploadedBy}`,
            '',
            'Note: This is a placeholder document generated by the A-ADLC Platform.',
            'Backend integration with real artifact storage is pending.'
          ];

          const buildPdf = (title, bodyLines) => {
            const esc = (s) => String(s)
              .replace(/\\/g, '\\\\')
              .replace(/\(/g, '\\(')
              .replace(/\)/g, '\\)');
            let stream = 'BT\n/F1 16 Tf\n50 750 Td\n';
            stream += `(${esc(title)}) Tj\n`;
            stream += '/F1 11 Tf\n0 -28 Td\n';
            bodyLines.forEach((line, i) => {
              if (i > 0) stream += '0 -16 Td\n';
              stream += `(${esc(line || ' ')}) Tj\n`;
            });
            stream += 'ET';
            const objects = [
              '<< /Type /Catalog /Pages 2 0 R >>',
              '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
              '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
              `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
              '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
            ];
            let pdf = '%PDF-1.4\n';
            const offsets = [];
            objects.forEach((obj, i) => {
              offsets.push(pdf.length);
              pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
            });
            const xrefOffset = pdf.length;
            pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
            offsets.forEach((off) => {
              pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
            });
            pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
            return pdf;
          };

          const buildRtf = (title, bodyLines) => {
            const esc = (s) => String(s)
              .replace(/\\/g, '\\\\')
              .replace(/\{/g, '\\{')
              .replace(/\}/g, '\\}');
            let rtf = '{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fswiss Calibri;}}\n';
            rtf += `\\f0\\fs32\\b ${esc(title)}\\b0\\fs22\\par\\par\n`;
            bodyLines.forEach((line) => {
              rtf += `${esc(line)}\\par\n`;
            });
            rtf += '}';
            return rtf;
          };

          const buildCsv = () => {
            const rows = [
              ['Field', 'Value'],
              ['Artifact', artifact.name],
              ['Project', project.name],
              ['Project ID', project.id || 'N/A'],
              ['Phase', artifact.phase],
              ['Status', artifact.status],
              ['Reported Size', artifact.size],
              ['Uploaded Date', artifact.uploadedDate],
              ['Uploaded By', artifact.uploadedBy]
            ];
            return rows
              .map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(','))
              .join('\r\n');
          };

          let blob;
          let fileName;
          if (artifact.type === 'pdf') {
            blob = new Blob([buildPdf(artifact.name, lines)], { type: 'application/pdf' });
            fileName = `${safeBase}.pdf`;
          } else if (artifact.type === 'docx') {
            blob = new Blob([buildRtf(artifact.name, lines)], { type: 'application/rtf' });
            fileName = `${safeBase}.rtf`;
          } else if (artifact.type === 'xlsx') {
            blob = new Blob([buildCsv()], { type: 'text/csv;charset=utf-8' });
            fileName = `${safeBase}.csv`;
          } else {
            const txt = [artifact.name, '='.repeat((artifact.name || '').length), '', ...lines].join('\r\n');
            blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
            fileName = `${safeBase}.txt`;
          }

          triggerDownload(blob, fileName);
        };

        // Derive activity timeline from phase status
        const derivedTimeline = [];
        const baseDate = project.startDate ? new Date(project.startDate) : new Date();
        const today = new Date();
        const todayTs = today.toISOString().slice(0, 16).replace('T', ' ');
        const ts = (offsetDays) => {
          const d = new Date(baseDate);
          d.setDate(d.getDate() + offsetDays);
          // Never report a timeline date in the future — clamp to today.
          if (d > today) return todayTs;
          return d.toISOString().slice(0, 16).replace('T', ' ');
        };

        if (phaseStatus('pdd-review') !== 'pending') {
          derivedTimeline.push({
            status: 'completed',
            activity: 'Project Initiated',
            details: `Project "${project.name}" created and PDD submitted by ${project.btLead || 'BT Lead'}.`,
            phase: 'Kick-off',
            timestamp: ts(0),
            owner: project.btLead || 'BT Lead'
          });
          derivedTimeline.push({
            status: phaseStatus('pdd-review') === 'completed' ? 'completed' : 'in-progress',
            activity: 'BA Review Started',
            details: 'BA Agent began reviewing the PDD for gaps, ambiguities, and completeness.',
            phase: 'PDD Review',
            timestamp: ts(1),
            owner: 'BA Agent'
          });
        }
        if (phaseStatus('pdd-review') === 'completed') {
          derivedTimeline.push({
            status: 'completed',
            activity: 'BA Review Completed',
            details: `BA Agent identified ${gapsCount} gap${gapsCount === 1 ? '' : 's'} for BT review.`,
            phase: 'PDD Review',
            timestamp: ts(2),
            owner: 'BA Agent'
          });
        }
        if (phaseStatus('awaiting-bt') !== 'pending') {
          derivedTimeline.push({
            status: responsesCount === gapsCount && gapsCount > 0 ? 'completed' : 'in-progress',
            activity: 'Awaiting BT Response',
            details: `BT lead reviewing ${gapsCount} gap${gapsCount === 1 ? '' : 's'} flagged by BA. ${responsesCount} response${responsesCount === 1 ? '' : 's'} received.`,
            phase: 'BT Response',
            timestamp: ts(3),
            owner: project.btLead || 'BT Lead'
          });
        }
        if (phaseStatus('pdd-approved') === 'completed') {
          derivedTimeline.push({
            status: 'completed',
            activity: 'Final PDD Approved',
            details: 'CCB approved the final PDD; project cleared to proceed to Architecture phase.',
            phase: 'PDD Approved',
            timestamp: ts(4),
            owner: 'CCB'
          });
        }
        if (phaseStatus('sdd') !== 'pending') {
          derivedTimeline.push({
            status: phaseStatus('sdd') === 'completed' ? 'completed' : 'in-progress',
            activity: phaseStatus('sdd') === 'completed' ? 'SDD Completed' : 'SDD In Progress',
            details: 'Architect Agent generating the Solution Design Document.',
            phase: 'SDD',
            timestamp: ts(5),
            owner: 'Architect Agent'
          });
        }
        if (phaseStatus('tdd') !== 'pending') {
          derivedTimeline.push({
            status: phaseStatus('tdd') === 'completed' ? 'completed' : 'in-progress',
            activity: phaseStatus('tdd') === 'completed' ? 'TDD Completed' : 'TDD In Progress',
            details: 'Tech Lead Agent decomposing the SDD into technical tasks.',
            phase: 'TDD',
            timestamp: ts(7),
            owner: 'Tech Lead Agent'
          });
        }
        if (phaseStatus('dev') !== 'pending') {
          derivedTimeline.push({
            status: phaseStatus('dev') === 'completed' ? 'completed' : 'in-progress',
            activity: phaseStatus('dev') === 'completed' ? 'Development Completed' : 'Development In Progress',
            details: 'Developer Agent generating source code per the TDD.',
            phase: 'Development',
            timestamp: todayTs,
            owner: 'Developer Agent'
          });
        }
        if (phaseStatus('test-cases') !== 'pending') {
          derivedTimeline.push({
            status: phaseStatus('test-cases') === 'completed' ? 'completed' : 'in-progress',
            activity: phaseStatus('test-cases') === 'completed' ? 'Test Cases Created' : 'Test Cases In Progress',
            details: 'QA Agent authoring test cases.',
            phase: 'Test Cases',
            timestamp: todayTs,
            owner: 'QA Agent'
          });
        }
        if (phaseStatus('sit') !== 'pending') {
          derivedTimeline.push({
            status: phaseStatus('sit') === 'completed' ? 'completed' : 'in-progress',
            activity: phaseStatus('sit') === 'completed' ? 'SIT Completed' : 'SIT In Progress',
            details: 'System Integration Testing being executed by QA Agent.',
            phase: 'SIT',
            timestamp: ts(15),
            owner: 'QA Agent'
          });
        }
        if (phaseStatus('uat') !== 'pending') {
          derivedTimeline.push({
            status: phaseStatus('uat') === 'completed' ? 'completed' : 'in-progress',
            activity: phaseStatus('uat') === 'completed' ? 'UAT Sign-Off' : 'UAT In Progress',
            details: 'User Acceptance Testing being validated by BT.',
            phase: 'UAT',
            timestamp: ts(18),
            owner: project.btLead || 'BT Lead'
          });
        }

        const allTimeline = [...(project.activityTimeline || []), ...derivedTimeline];

        return (
      <div className="surface mb-lg">
        {/* TAB HEADERS */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', borderBottom: '1px solid var(--outline-variant)', marginBottom: 'var(--space-md)' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'overview' ? 'var(--primary)' : 'var(--on-surface-variant)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('artifacts')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              borderBottom: activeTab === 'artifacts' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'artifacts' ? 'var(--primary)' : 'var(--on-surface-variant)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Artifacts ({allArtifacts.length})
          </button>
          {project.bugs && project.bugs.length > 0 && (
            <button
              onClick={() => setActiveTab('bugs')}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 16px',
                borderBottom: activeTab === 'bugs' ? '2px solid var(--primary)' : 'none',
                color: activeTab === 'bugs' ? 'var(--primary)' : 'var(--on-surface-variant)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Bugs ({project.bugs.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('metrics')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              borderBottom: activeTab === 'metrics' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'metrics' ? 'var(--primary)' : 'var(--on-surface-variant)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              borderBottom: activeTab === 'audit' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'audit' ? 'var(--primary)' : 'var(--on-surface-variant)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Activity Timeline
          </button>
        </div>

        {/* ARTIFACTS TAB */}
        {activeTab === 'artifacts' && (
          <div>
            <h3 style={{ marginBottom: 'var(--space-lg)' }}>Project Artifacts & Deliverables</h3>
            {allArtifacts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {allArtifacts.map((artifact, idx) => (
                  <div key={idx} style={{
                    border: '1px solid var(--outline-variant)',
                    padding: 'var(--space-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', flex: 1 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: '32px', flexShrink: 0 }}>
                        {artifact.type === 'pdf' ? 'picture_as_pdf' : artifact.type === 'docx' ? 'description' : 'table_chart'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p className="label-bold" style={{ marginBottom: 'var(--space-xs)' }}>
                          {artifact.name}
                        </p>
                        <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: 'var(--space-xs)' }}>
                          <span className="badge" style={{ marginRight: 'var(--space-sm)' }}>
                            {artifact.phase}
                          </span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}>
                            {artifact.size}
                          </span>
                        </p>
                        <p className="body-sm" style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>
                          Uploaded {artifact.uploadedDate} by {artifact.uploadedBy}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${artifact.status === 'approved' ? 'success' : 'warning'}`}>
                        {artifact.status === 'approved' ? '✓ Approved' : 'In Progress'}
                      </span>
                      <button
                        onClick={() => handleDownloadArtifact(artifact)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-container)',
                          cursor: 'pointer',
                          marginTop: 'var(--space-sm)',
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: 0
                        }}>
                        ⬇ Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="body-md" style={{ color: 'var(--on-surface-variant)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                No artifacts uploaded yet
              </p>
            )}
          </div>
        )}

        {/* BUGS TAB */}
        {activeTab === 'bugs' && project.bugs && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <div>
                <h3>Logged Bugs & Issues</h3>
                <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: 'var(--space-xs)' }}>
                  {project.phases?.some(p => p.id === 'sit' && p.status === 'in-progress') && 'SIT bugs are automatically logged by QA Agent. '}
                  {project.phases?.some(p => p.id === 'uat' && p.status === 'in-progress') && 'UAT phase - manually upload bugs identified by end-users below.'}
                </p>
              </div>
              {project.phases?.some(p => p.id === 'uat' && p.status === 'in-progress') && (
                <button
                  onClick={() => setShowBugUpload(!showBugUpload)}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                >
                  + Upload UAT Bug
                </button>
              )}
            </div>

            {showBugUpload && (
              <div style={{ border: '1px solid var(--outline-variant)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', backgroundColor: 'var(--surface-container-low)' }}>
                <h4 style={{ marginBottom: 'var(--space-md)' }}>Upload Bug from UAT</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <input
                    type="text"
                    placeholder="Bug Title"
                    style={{ padding: '8px 12px', border: '1px solid var(--outline-variant)', fontFamily: 'Inter' }}
                  />
                  <textarea
                    placeholder="Bug Description (what was the expected behavior vs actual)"
                    rows="4"
                    style={{ padding: '8px 12px', border: '1px solid var(--outline-variant)', fontFamily: 'Inter', resize: 'vertical' }}
                  />
                  <select style={{ padding: '8px 12px', border: '1px solid var(--outline-variant)', fontFamily: 'Inter' }}>
                    <option>Select Severity...</option>
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                  <input
                    type="file"
                    placeholder="Attach screenshot or document"
                    style={{ padding: '8px 12px', border: '1px solid var(--outline-variant)', fontFamily: 'Inter' }}
                  />
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-primary" style={{ fontSize: '12px' }}>Submit Bug</button>
                    <button className="btn" onClick={() => setShowBugUpload(false)} style={{ fontSize: '12px' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {project.bugs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {project.bugs.map((bug) => (
                  <div key={bug.id} style={{
                    border: '1px solid var(--outline-variant)',
                    borderLeft: bug.severity === 'high' ? '4px solid #e74c3c' : '4px solid #f39c12',
                    padding: 'var(--space-md)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                          <p className="label-bold" style={{ color: 'var(--primary)', margin: 0 }}>
                            {bug.id}: {bug.title}
                          </p>
                          <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 6px', backgroundColor: bug.source === 'automated' ? '#e8f4f8' : '#fff8e8', color: bug.source === 'automated' ? '#0277bd' : '#f57f17', borderRadius: '2px' }}>
                            {bug.source === 'automated' ? '⚙ AUTO' : '👤 MANUAL'}
                          </span>
                        </div>
                        <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: 'var(--space-sm)' }}>
                          {bug.description}
                        </p>
                      </div>
                      <span className={`badge ${bug.status === 'open' ? 'warning' : bug.status === 'in-progress' ? 'info' : 'success'}`}>
                        {bug.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '12px', color: 'var(--on-surface-variant)', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '600' }}>Stage: {bug.stage.toUpperCase()}</span>
                      <span>•</span>
                      <span>Severity: <strong>{bug.severity.toUpperCase()}</strong></span>
                      <span>•</span>
                      <span>Reported: {bug.reportedDate}</span>
                      <span>•</span>
                      <span>Logged by: {bug.reportedBy}</span>
                      <span>•</span>
                      <span>Assigned: {bug.assignedTo}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="body-md" style={{ color: 'var(--on-surface-variant)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                No bugs reported yet
              </p>
            )}
          </div>
        )}

        {/* METRICS TAB */}
        {activeTab === 'metrics' && (
          <div>
            <h3 style={{ marginBottom: 'var(--space-lg)' }}>Project Metrics & Performance Analysis</h3>
            {metricsLoading && (
              <p style={{ color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>Loading metrics...</p>
            )}
            {!metricsLoading && metrics && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                {/* A. AGENT PROCESSING TIME */}
                {metrics.agentJobs && metrics.agentJobs.length > 0 && (
                  <section>
                    <h4 style={{ marginBottom: 'var(--space-md)' }}>Agent Processing Time</h4>
                    <div style={{ overflowX: 'auto', marginBottom: 'var(--space-lg)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--on-surface-variant)' }}>Agent</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--on-surface-variant)' }}>Stage</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--on-surface-variant)' }}>Duration</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--on-surface-variant)', width: '200px' }}>Progress Bar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.agentJobs.map((job, idx) => {
                            const maxDuration = Math.max(...metrics.agentJobs.map(j => j.durationMs || 0));
                            const percentage = maxDuration > 0 ? ((job.durationMs || 0) / maxDuration) * 100 : 0;
                            const minutes = Math.floor((job.durationMs || 0) / 60000);
                            const seconds = Math.floor(((job.durationMs || 0) % 60000) / 1000);
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                                <td style={{ padding: '12px', textAlign: 'left' }}>{job.agentType || 'Unknown'}</td>
                                <td style={{ padding: '12px', textAlign: 'left' }}>{job.stage}</td>
                                <td style={{ padding: '12px', textAlign: 'left', fontFamily: '"JetBrains Mono"' }}>{minutes}m {seconds}s</td>
                                <td style={{ padding: '12px' }}>
                                  <div style={{ width: '100%', height: '24px', backgroundColor: 'var(--outline-variant)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--primary-container)', transition: 'width 0.3s' }}></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* B. HUMAN REVIEW TIME */}
                {metrics.humanReviewTimings && metrics.humanReviewTimings.length > 0 && (
                  <section>
                    <h4 style={{ marginBottom: 'var(--space-md)' }}>Human Review Time</h4>
                    <div style={{ overflowX: 'auto', marginBottom: 'var(--space-lg)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--on-surface-variant)' }}>Review Type</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--on-surface-variant)' }}>Reviewer</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--on-surface-variant)' }}>Duration</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--on-surface-variant)', width: '200px' }}>Progress Bar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.humanReviewTimings.map((review, idx) => {
                            const maxDuration = Math.max(...metrics.humanReviewTimings.map(r => r.durationMs || 0));
                            const percentage = maxDuration > 0 ? ((review.durationMs || 0) / maxDuration) * 100 : 0;
                            const minutes = Math.floor((review.durationMs || 0) / 60000);
                            const seconds = Math.floor(((review.durationMs || 0) % 60000) / 1000);
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                                <td style={{ padding: '12px', textAlign: 'left' }}>{review.reviewType}</td>
                                <td style={{ padding: '12px', textAlign: 'left' }}>{review.reviewedBy}</td>
                                <td style={{ padding: '12px', textAlign: 'left', fontFamily: '"JetBrains Mono"' }}>{minutes}m {seconds}s</td>
                                <td style={{ padding: '12px' }}>
                                  <div style={{ width: '100%', height: '24px', backgroundColor: 'var(--outline-variant)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s' }}></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* C. TOKEN USAGE & COST */}
                <section>
                  <h4 style={{ marginBottom: 'var(--space-md)' }}>Token Usage & Estimated Cost</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                    <div style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                      <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.1em', marginBottom: '4px' }}>Total Input Tokens</p>
                      <p style={{ fontSize: '20px', fontFamily: '"JetBrains Mono"', fontWeight: '600' }}>{metrics.tokenTotals?.inputTokens || 0}</p>
                    </div>
                    <div style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                      <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.1em', marginBottom: '4px' }}>Total Output Tokens</p>
                      <p style={{ fontSize: '20px', fontFamily: '"JetBrains Mono"', fontWeight: '600' }}>{metrics.tokenTotals?.outputTokens || 0}</p>
                    </div>
                    <div style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                      <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.1em', marginBottom: '4px' }}>Est. Total Cost</p>
                      <p style={{ fontSize: '20px', fontFamily: '"JetBrains Mono"', fontWeight: '600', color: 'var(--primary-container)' }}>${parseFloat(metrics.tokenTotals?.costUsd || 0).toFixed(4)}</p>
                    </div>
                    <div style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                      <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.1em', marginBottom: '4px' }}>Tech Stack</p>
                      <p style={{ fontSize: '16px', fontWeight: '500' }}>{metrics.techStack || 'N/A'}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontStyle: 'italic', marginTop: 'var(--space-md)' }}>
                    💡 Pricing based on Claude Haiku 4.5: $0.80/M input tokens, $4.00/M output tokens
                  </p>
                </section>

                {/* D. ROI & BENEFIT METRICS */}
                <section>
                  <h4 style={{ marginBottom: 'var(--space-md)' }}>ROI & Benefit Metrics</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                    <div style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                      <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.1em', marginBottom: '4px' }}>Time Saved</p>
                      <p style={{ fontSize: '20px', fontFamily: '"JetBrains Mono"', fontWeight: '600' }}>
                        {Math.floor((metrics.roiMetrics?.timeSavedMs || 0) / 3600000)}h {Math.floor(((metrics.roiMetrics?.timeSavedMs || 0) % 3600000) / 60000)}m
                      </p>
                    </div>
                    <div style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                      <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.1em', marginBottom: '4px' }}>Automation Coverage</p>
                      <p style={{ fontSize: '20px', fontFamily: '"JetBrains Mono"', fontWeight: '600', color: 'var(--primary-container)' }}>
                        {(parseFloat(metrics.roiMetrics?.automationCoverageRatio || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                      <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.1em', marginBottom: '4px' }}>Rework Rate</p>
                      <p style={{ fontSize: '20px', fontFamily: '"JetBrains Mono"', fontWeight: '600' }}>
                        {(parseFloat(metrics.roiMetrics?.reworkRate || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                      <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.1em', marginBottom: '4px' }}>Gap Density</p>
                      <p style={{ fontSize: '20px', fontFamily: '"JetBrains Mono"', fontWeight: '600' }}>
                        {(metrics.roiMetrics?.gapDensity || 0).toFixed(2)}/100
                      </p>
                    </div>
                  </div>
                  <div style={{ padding: 'var(--space-lg)', backgroundColor: '#f9f5f0', borderLeft: '3px solid var(--primary-container)', marginTop: 'var(--space-lg)' }}>
                    <p style={{ fontSize: '13px', color: 'var(--on-surface)', lineHeight: '1.6' }}>
                      <strong>Baseline Assumptions:</strong> Time Saved calculation assumes {metrics.roiMetrics?.agentPhaseCount || 0} agent phase(s) at ~2-8h manual baseline each, and {metrics.roiMetrics?.humanReviewCount || 0} human review action(s) at ~4h manual baseline each. Actual time savings depends on project complexity and team experience.
                    </p>
                  </div>
                </section>
              </div>
            )}
            {!metricsLoading && !metrics && (
              <p style={{ color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>No metrics data available yet. Complete agent phases to see metrics.</p>
            )}
          </div>
        )}

        {/* ACTIVITY TIMELINE TAB */}
        {activeTab === 'audit' && (
          <div>
            <h3 style={{ marginBottom: 'var(--space-lg)' }}>Activity Timeline & Audit Trail</h3>
            {allTimeline.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                {/* Timeline line */}
                <div style={{
                  position: 'absolute',
                  left: '19px',
                  top: '0',
                  bottom: '0',
                  width: '2px',
                  backgroundColor: 'var(--outline-variant)'
                }} />

                {allTimeline.map((entry, idx) => (
                  <div key={idx} style={{
                    padding: 'var(--space-md)',
                    paddingLeft: 'var(--space-lg)',
                    position: 'relative',
                    borderBottom: idx < allTimeline.length - 1 ? '1px solid var(--outline-variant)' : 'none'
                  }}>
                    {/* Timeline dot */}
                    <div style={{
                      position: 'absolute',
                      left: '8px',
                      top: '24px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: entry.status === 'completed' ? '#10b981' : 'var(--primary-container)',
                      border: '3px solid var(--surface-container-lowest)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {entry.status === 'completed' ? '✓' : '→'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                      <div>
                        <p className="label-bold" style={{ marginBottom: 'var(--space-xs)' }}>
                          {entry.activity}
                        </p>
                        <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                          {entry.details}
                        </p>
                      </div>
                      <span className="badge" style={{ flexShrink: 0 }}>
                        {entry.phase}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                      <span style={{ fontFamily: 'JetBrains Mono' }}>
                        {entry.timestamp}
                      </span>
                      <span>•</span>
                      <span>
                        {entry.owner}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="body-md" style={{ color: 'var(--on-surface-variant)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                No activity recorded yet
              </p>
            )}
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: 'var(--space-lg)' }}>
              Project overview, metrics, and phase progress. Use the Artifacts tab to view all deliverables and the Activity Timeline tab for audit trail.
            </p>

            <div className="grid grid-4 mb-lg">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  <h3 className="label-bold">Current Phase</h3>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>play_circle</span>
                </div>
                <p className="body-md" style={{ color: 'var(--primary)', fontWeight: 600 }}>{currentPhaseLabel}</p>
                {currentPhaseSubLabel && (
                  <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px', fontSize: '12px' }}>
                    {currentPhaseSubLabel}
                  </p>
                )}
              </div>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  <h3 className="label-bold">Overall Progress</h3>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>trending_up</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'JetBrains Mono' }}>{overallProgress}%</div>
                <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono' }}>{completedCount}</span> of <span style={{ fontFamily: 'JetBrains Mono' }}>{totalCount}</span> phases complete
                </p>
              </div>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  <h3 className="label-bold">Days Remaining</h3>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>schedule</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: daysRemaining !== null && daysRemaining < 0 ? '#b8341a' : 'var(--primary)', fontFamily: 'JetBrains Mono' }}>
                  {daysRemaining === null ? '—' : daysRemaining}
                </div>
                <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                  Target: <span style={{ fontFamily: 'JetBrains Mono' }}>{project.targetDate || '—'}</span>
                </p>
              </div>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  <h3 className="label-bold">BA Gaps</h3>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>quiz</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'JetBrains Mono' }}>
                  {responsesCount}/{gapsCount}
                </div>
                <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px' }}>BT responses received</p>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="card">
                <h3 className="label-bold" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  Phase Status Summary
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {project.phases?.map((p, idx) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx < project.phases.length - 1 ? '1px solid var(--outline-variant)' : 'none', paddingBottom: 'var(--space-sm)' }}>
                      <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', marginRight: '8px' }}>{String(idx + 1).padStart(2, '0')}</span>
                        {p.label}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        backgroundColor: p.status === 'completed' ? '#10b981' : p.status === 'in-progress' ? 'var(--primary-container)' : 'var(--outline-variant)',
                        color: p.status === 'pending' ? 'var(--on-surface-variant)' : 'white'
                      }}>
                        {p.status === 'completed' ? '✓ Done' : p.status === 'in-progress' ? '⊙ Active' : '◯ Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="label-bold" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  Recent Activity
                </h3>
                {allTimeline.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {allTimeline.slice(-5).reverse().map((entry, idx) => (
                      <div key={idx} style={{ borderBottom: idx < Math.min(allTimeline.length, 5) - 1 ? '1px solid var(--outline-variant)' : 'none', paddingBottom: 'var(--space-sm)' }}>
                        <p className="body-sm" style={{ fontWeight: 600, marginBottom: '2px' }}>{entry.activity}</p>
                        <p className="body-sm" style={{ color: 'var(--on-surface-variant)', fontSize: '12px' }}>
                          <span style={{ fontFamily: 'JetBrains Mono' }}>{entry.timestamp}</span> · {entry.owner}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>No activity yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
        );
      })()}

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button className="btn">Back to Projects</button>
        </Link>
        <button className="btn btn-primary">Update Project</button>
      </div>

      <footer>
        Project Details · A-ADLC Platform
      </footer>
    </div>
  );
}
