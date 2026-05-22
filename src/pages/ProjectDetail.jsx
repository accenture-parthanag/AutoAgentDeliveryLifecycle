import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProject, submitJob } from '../api';
import RichTextEditor from '../components/RichTextEditor';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showBugUpload, setShowBugUpload] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugs, setBugs] = useState([]);
  const [showGlossary, setShowGlossary] = useState(false);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tddDispatching, setTddDispatching] = useState(false);
  const [tddStartedAt, setTddStartedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [mermaidRendered, setMermaidRendered] = useState(false);
  const [finalPddDownloading, setFinalPddDownloading] = useState(false);

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

  // Render mermaid diagram - let the library handle it naturally
  useEffect(() => {
    if (!project?.baProcessFlow) return;

    setTimeout(() => {
      try {
        if (window.mermaid?.run) {
          window.mermaid.run();
        } else if (window.mermaid?.contentLoaded) {
          window.mermaid.contentLoaded();
        }
        setMermaidRendered(true);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setMermaidRendered(true);
      }
    }, 100);
  }, [project?.baProcessFlow]);

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
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          {project.description}
        </p>
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
          AASDI Lifecycle Progress
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
                      ? phase.label.replace('In Progress', 'Completed')
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
              {isPddApproved && (
                <Link to={`/change-request/${id}`} style={{ textDecoration: 'none' }}>
                  <button className="btn btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>description</span>
                    Submit Change Request
                  </button>
                </Link>
              )}
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
                  return 'UAT sign-off received. All AASDI phases are complete.';
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
                  return 'Development is complete. The project is ready to proceed to Test Case creation.';
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

      {/* PDD VERSIONS */}
      {project.pddVersions && project.pddVersions.length > 0 && (
        <div className="surface mb-lg">
          <h2 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            PDD Version History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {project.pddVersions.slice().reverse().map((version, idx) => (
              <div key={idx} style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                borderLeft: version.status === 'final' ? '4px solid var(--primary-container)' : '4px solid var(--outline-variant)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>{version.label}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                      {new Date(version.createdAt).toLocaleDateString()} by {version.createdBy}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    backgroundColor: version.status === 'final' ? '#10b981' : version.status === 'under-review' ? '#fbbf24' : '#d1d5db',
                    color: version.status === 'final' ? 'white' : 'black',
                    textTransform: 'capitalize'
                  }}>
                    {version.status}
                  </span>
                </div>
                {version.notes && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                    {version.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHANGE REQUESTS */}
      {project.changeRequests && project.changeRequests.length > 0 && (
        <div className="surface mb-lg">
          <h2 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            Change Request History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {project.changeRequests.map((cr) => (
              <div key={cr.id} style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                borderLeft: cr.status === 'approved' ? '4px solid #10b981' : cr.status === 'rejected' ? '4px solid #ef4444' : '4px solid #fbbf24'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>CR-{cr.id.slice(-8)}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                      Submitted: {new Date(cr.submittedAt).toLocaleDateString()} by {cr.submittedBy}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    backgroundColor: cr.status === 'approved' ? '#10b981' : cr.status === 'rejected' ? '#ef4444' : '#fbbf24',
                    color: 'white',
                    textTransform: 'capitalize'
                  }}>
                    {cr.status}
                  </span>
                </div>
                <p style={{ margin: '8px 0 4px 0', fontSize: '12px' }}>
                  <strong>Reason:</strong> {cr.reason}
                </p>
                {cr.revisionNotes && (
                  <p style={{ margin: '4px 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                    {cr.revisionNotes}
                  </p>
                )}
                {cr.status !== 'pending-ccb' && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                    Reviewed: {new Date(cr.reviewedAt).toLocaleDateString()} by {cr.reviewedBy}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVITY LOG */}
      {project.activityTimeline && project.activityTimeline.length > 0 && (
        <div className="surface mb-lg">
          <h2 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            Activity Log
          </h2>
          <div className="activity-log">
            {project.activityTimeline.slice().reverse().map((log, idx) => (
              <div key={idx} className="activity-log-entry">
                <div className="activity-log-time">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                <div className="activity-log-action">
                  <strong>{log.action}</strong>
                  {log.notes && <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>{log.notes}</div>}
                  {log.reason && <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>{log.reason}</div>}
                </div>
                <div className="activity-log-meta">
                  {log.user}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      <p className="body-md">{gap.question}</p>
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
                      <p className="body-md" style={{ margin: '0 0 12px 0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                        {btResponse.text}
                      </p>
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

      {/* BA PROCESS FLOW */}
      {project.baProcessFlow && (
        <div className="surface mb-lg">
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid var(--outline-variant)',
            paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)'
          }}>
            <h2>Process Flow</h2>
            <span style={{
              fontSize: '11px', fontWeight: '600', padding: '4px 8px',
              backgroundColor: 'var(--outline-variant)', textTransform: 'uppercase'
            }}>
              BA Interpretation
            </span>
          </div>
          <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: 'var(--space-md)' }}>
            The BA Agent's interpretation of the business process described in the PDD.
          </p>
          <div
            id="ba-process-flow-diagram"
            style={{
              border: '1px solid var(--outline-variant)',
              padding: 'var(--space-md)',
              backgroundColor: 'var(--surface-container-low)',
              overflowX: 'auto',
              minHeight: '200px'
            }}
          >
            {project.baProcessFlow && (
              <div className="mermaid">
                {project.baProcessFlow}
              </div>
            )}
            {!project.baProcessFlow && (
              <div style={{ color: 'var(--on-surface-variant)', fontSize: '14px', textAlign: 'center', paddingTop: '60px' }}>
                (No process flow diagram yet)
              </div>
            )}
            {!mermaidRendered && (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px' }}>
                Rendering diagram...
              </p>
            )}
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
          (project.pddVersions?.length || 0),
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
        const computedTestCoverage = uatStatus === 'completed'
          ? 100
          : sitStatus === 'completed'
            ? 90
            : sitStatus === 'in-progress'
              ? 70
              : testCasesStatus === 'completed'
                ? 50
                : testCasesStatus === 'in-progress'
                  ? 25
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
            <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
              {project.scope}
            </p>
          </div>
          <div>
            <h3 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              Success Criteria
            </h3>
            <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
              {project.criteria}
            </p>
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

        // Derive artifacts from phase status
        const derivedArtifacts = [];
        const artifactDate = project.startDate || new Date().toISOString().slice(0, 10);
        if (phaseStatus('pdd-review') !== 'pending') {
          derivedArtifacts.push({
            name: 'Process Definition Document (PDD)',
            type: 'pdf',
            phase: 'PDD Review',
            size: '1.2 MB',
            uploadedDate: artifactDate,
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
            uploadedDate: artifactDate,
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
            uploadedDate: artifactDate,
            uploadedBy: project.btLead || 'BT Lead',
            status: 'approved'
          });
        }
        if (phaseStatus('pdd-approved') === 'completed') {
          derivedArtifacts.push({
            name: 'Approved Final PDD',
            type: 'pdf',
            phase: 'PDD Approved',
            size: '1.4 MB',
            uploadedDate: artifactDate,
            uploadedBy: 'CCB',
            status: 'approved'
          });
        }
        if (project.finalPddPath) {
          derivedArtifacts.push({
            name: 'Final PDD (BA Synthesised)',
            type: 'html',
            phase: 'BA Finalization',
            size: 'HTML',
            uploadedDate: project.finalPddGeneratedAt
              ? new Date(project.finalPddGeneratedAt).toISOString().slice(0, 10)
              : artifactDate,
            uploadedBy: 'BA Agent',
            status: 'approved',
            isFinalPdd: true
          });
        }
        if (phaseStatus('sdd') !== 'pending') {
          derivedArtifacts.push({
            name: 'Solution Design Document (SDD)',
            type: 'pdf',
            phase: 'SDD',
            size: '2.1 MB',
            uploadedDate: artifactDate,
            uploadedBy: 'Architect Agent',
            status: phaseStatus('sdd') === 'completed' ? 'approved' : 'in-progress'
          });
        }
        if (phaseStatus('tdd') !== 'pending') {
          derivedArtifacts.push({
            name: 'Technical Design Document (TDD)',
            type: 'pdf',
            phase: 'TDD',
            size: '1.8 MB',
            uploadedDate: artifactDate,
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
            uploadedDate: artifactDate,
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
            uploadedDate: artifactDate,
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
            uploadedDate: artifactDate,
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
            uploadedDate: artifactDate,
            uploadedBy: project.btLead || 'BT Lead',
            status: phaseStatus('uat') === 'completed' ? 'approved' : 'in-progress'
          });
        }

        const allArtifacts = [...(project.artifacts || []), ...derivedArtifacts];

        const handleDownloadArtifact = async (artifact) => {
          // Special handling for original PDD file download
          if (artifact.name === 'Process Definition Document (PDD)') {
            try {
              const response = await fetch(`/api/projects/${id}/pdd-download`);
              if (!response.ok) {
                throw new Error('Failed to download PDD');
              }
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              // Get filename from Content-Disposition header or use default
              const contentDisposition = response.headers.get('content-disposition');
              const filename = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : `PDD-${project.name}.txt`;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 0);
            } catch (err) {
              alert('Download failed: ' + err.message);
            }
            return;
          }

          // Special handling for Final PDD (real file download)
          if (artifact.isFinalPdd) {
            setFinalPddDownloading(true);
            try {
              const { getFinalPdd } = await import('../api');
              const blob = await getFinalPdd(id);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Final-PDD-${(project.name || 'project').replace(/[^a-z0-9-]/gi, '_')}.html`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 0);
            } catch (err) {
              alert('Download failed: ' + err.message);
            } finally {
              setFinalPddDownloading(false);
            }
            return;
          }

          const safeBase = (artifact.name || 'artifact').replace(/[^a-z0-9-_]+/gi, '_');

          // Build content based on artifact type
          let lines = [
            `Project:       ${project.name}`,
            `Project ID:    ${project.id || 'N/A'}`,
            `Phase:         ${artifact.phase}`,
            `Status:        ${artifact.status}`,
            `Uploaded:      ${artifact.uploadedDate} by ${artifact.uploadedBy}`,
            ''
          ];

          // Add actual content based on artifact type
          console.log('Downloading:', artifact.name);

          if (artifact.name === 'Process Definition Document (PDD)') {
            lines.push('PROCESS DEFINITION DOCUMENT');
            lines.push('============================');
            lines.push('');
            if (project.description) {
              lines.push('DESCRIPTION:');
              lines.push(project.description);
              lines.push('');
            }
            if (project.scope) {
              lines.push('SCOPE:');
              lines.push(project.scope);
              lines.push('');
            }
            if (project.objectives) {
              lines.push('OBJECTIVES:');
              lines.push(project.objectives);
              lines.push('');
            }
            if (project.criteria) {
              lines.push('SUCCESS CRITERIA:');
              lines.push(project.criteria);
              lines.push('');
            }
            console.log('Added PDD content to download');
          } else if (artifact.name === 'BA Gap Analysis Report' && project.baGaps?.length > 0) {
            lines.push('BA REVIEW FINDINGS');
            lines.push('=================');
            lines.push('');
            project.baGaps.forEach((gap, idx) => {
              lines.push(`Question ${idx + 1} (${gap.category || 'General'}) - ${gap.complexity || 'medium'} complexity:`);
              lines.push(`${gap.question}`);
              lines.push('');
            });
            console.log('Added', project.baGaps.length, 'gaps to download');
          } else {
            lines.push('Note: This is a document generated by the AASDI Platform.');
          }

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

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 0);
        };

        // Derive activity timeline from phase status
        const derivedTimeline = [];
        const baseDate = project.startDate ? new Date(project.startDate) : new Date();
        const ts = (offsetDays) => {
          const d = new Date(baseDate);
          d.setDate(d.getDate() + offsetDays);
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
            timestamp: ts(10),
            owner: 'Developer Agent'
          });
        }
        if (phaseStatus('test-cases') !== 'pending') {
          derivedTimeline.push({
            status: phaseStatus('test-cases') === 'completed' ? 'completed' : 'in-progress',
            activity: phaseStatus('test-cases') === 'completed' ? 'Test Cases Created' : 'Test Cases In Progress',
            details: 'QA Agent authoring test cases.',
            phase: 'Test Cases',
            timestamp: ts(13),
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
                    value={bugTitle}
                    onChange={(e) => setBugTitle(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid var(--outline-variant)', fontFamily: 'Inter' }}
                  />
                  <RichTextEditor
                    value={bugDescription}
                    onChange={setBugDescription}
                    placeholder="Bug Description (what was the expected behavior vs actual)"
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
        Project Details · AASDI Platform
      </footer>
    </div>
  );
}
