import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, getAnalyticsRollup } from '../api';

export default function Dashboard() {
  const [showGlossary, setShowGlossary] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    getProjects()
      .then(data => {
        const transformed = data.map(p => {
          // Find current phase (first non-completed phase)
          const currentPhaseObj = p.phases?.find(ph => ph.status !== 'completed') || p.phases?.[p.phases.length - 1];
          const pddApprovedPhase = p.phases?.find(ph => ph.id === 'pdd-approved');
          return {
            id: p._id,
            name: p.name,
            currentPhase: currentPhaseObj?.label || 'Not Started',
            phaseBadge: currentPhaseObj?.status || 'pending',
            progress: currentPhaseObj?.progress || 0,
            pddStatus: pddApprovedPhase?.status === 'completed' ? 'approved' : 'pending',
            lastUpdated: new Date(p.updatedAt).toISOString().split('T')[0],
            btCollaborator: p.btLead,
            pddVersions: p.pddVersions || 0,
            changeRequests: p.changeRequests || []
          };
        });
        setProjects(transformed);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getAnalyticsRollup()
      .then(setAnalytics)
      .catch(err => console.error('Error loading analytics:', err))
      .finally(() => setAnalyticsLoading(false));
  }, []);

  const totalProjects = projects.length;
  const activeDevCount = projects.filter(p => p.phaseBadge === 'in-progress').length;
  const pddReviewCount = projects.filter(p =>
    p.currentPhase === 'PDD Review (By BA)' ||
    p.currentPhase === 'Awaiting BT Response' ||
    p.currentPhase === 'PDD Approved'
  ).length;
  const completedCount = projects.filter(p => p.phaseBadge === 'completed').length;
  const ccbApprovalsCount = projects.filter(p =>
    p.changeRequests && p.changeRequests.some(cr => cr.status === 'pending-ccb')
  ).length;

  return (
    <div className="container">
      {/* PAGE HEADER */}
      <div className="border-b pb-md mb-lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
          <div>
            <h1>Projects</h1>
            <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
              View all automation projects and their progress through the A-ADLC lifecycle. Click on any project to see detailed phase progress.
            </p>
          </div>
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
              fontSize: '12px',
              whiteSpace: 'nowrap'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>help</span>
            Acronym Guide
          </button>
        </div>
      </div>

      {/* LOADING/ERROR STATE */}
      {error && (
        <div style={{ backgroundColor: '#ffebee', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', border: '1px solid #ef5350' }}>
          <p style={{ color: '#c62828', margin: 0 }}>Error loading projects: {error}</p>
        </div>
      )}
      {loading && (
        <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          Loading projects...
        </div>
      )}

      {/* ACRONYM GUIDE - TOGGLE */}
      {showGlossary && (
        <div style={{ border: '1px solid var(--outline-variant)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', backgroundColor: 'var(--surface-container-low)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Acronym & Term Glossary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
            {[
              { acronym: 'PDD', full: 'Process Definition Document', description: 'Initial requirements and business objectives document submitted by BT' },
              { acronym: 'BA', full: 'Business Analyst', description: 'Reviews PDD for gaps, ambiguities, and completeness' },
              { acronym: 'SDD', full: 'Solution Design Document', description: 'High-level architecture and technology strategy designed by Architecture team' },
              { acronym: 'TDD', full: 'Technical Design Document', description: 'Detailed design with task breakdown and technical specifications' },
              { acronym: 'SIT', full: 'System Integration Testing', description: 'Testing phase where integrated system components are tested together' },
              { acronym: 'UAT', full: 'User Acceptance Testing', description: 'Final testing phase where end-users validate the solution meets requirements' },
              { acronym: 'QA', full: 'Quality Assurance', description: 'Testing and validation agent responsible for SIT and UAT phases' },
              { acronym: 'BT', full: 'Business Transformation', description: 'Interface between business and development team who defines requirements and accepts the solution' }
            ].map((item, idx) => (
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

      {/* METRICS GRID - 4 COLUMNS */}
      <div className="grid grid-4 mb-lg">
        {[
          { label: 'Total Projects', value: totalProjects, icon: 'folder_open' },
          { label: 'Active Development', value: activeDevCount, icon: 'engineering' },
          { label: 'Awaiting PDD Review', value: pddReviewCount, icon: 'manage_search' },
          { label: 'Pending CCB Approvals', value: ccbApprovalsCount, icon: 'gavel' }
        ].map((metric, idx) => (
          <div key={idx} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <h3 className="label-bold">{metric.label}</h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>
                {metric.icon}
              </span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--primary)', fontFamily: 'JetBrains Mono' }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* LEADERSHIP ANALYTICS - 4 COLUMNS */}
      {!analyticsLoading && analytics && (
        <div className="grid grid-4 mb-lg">
          {[
            { label: 'Total Est. AI Cost', value: `$${parseFloat(analytics.totalEstimatedCostUsd || 0).toFixed(4)}`, icon: 'payments' },
            { label: 'Total Time Saved', value: `${Math.floor((analytics.totalAgentDurationMs || 0) / 3600000)}h ${Math.floor(((analytics.totalAgentDurationMs || 0) % 3600000) / 60000)}m`, icon: 'schedule' },
            { label: 'Avg Completion Time', value: `${Math.floor((analytics.avgTimeToCompletionMs || 0) / 3600000)}h ${Math.floor(((analytics.avgTimeToCompletionMs || 0) % 3600000) / 60000)}m`, icon: 'timer' },
            { label: 'Rework Rate', value: `${parseFloat(analytics.overallReworkRate || 0).toFixed(1)}%`, icon: 'undo' }
          ].map((metric, idx) => (
            <div key={idx} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                <h3 className="label-bold">{metric.label}</h3>
                <span className="material-symbols-outlined" style={{ color: '#10b981' }}>
                  {metric.icon}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', fontFamily: 'JetBrains Mono' }}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PROJECTS TABLE */}
      <div className="surface mb-lg">
        <h2 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          All Projects
        </h2>
        <table>
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Current Phase</th>
              <th>Progress</th>
              <th>PDD Versions</th>
              <th>Last Updated</th>
              <th>BT Lead</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <Link to={`/project/${project.id}`} style={{ color: 'var(--primary-container)', textDecoration: 'none', fontWeight: '500' }}>
                    {project.name}
                  </Link>
                </td>
                <td>
                  <span className={`badge ${project.phaseBadge}`}>
                    {project.currentPhase}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                    <div style={{ width: '80px', height: '4px', backgroundColor: 'var(--outline-variant)' }}>
                      <div style={{ width: `${project.progress}%`, height: '100%', backgroundColor: project.phaseBadge === 'success' ? '#10b981' : 'var(--primary-container)' }} />
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: '600', minWidth: '35px', textAlign: 'right' }}>
                      {project.progress}%
                    </span>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: '600', color: 'var(--primary-container)' }}>
                    v{project.pddVersions}
                  </span>
                </td>
                <td className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  {project.lastUpdated}
                </td>
                <td className="body-sm">{project.btCollaborator}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AGENT PERFORMANCE ROLLUP */}
      {!analyticsLoading && analytics && analytics.agentBreakdown && analytics.agentBreakdown.length > 0 && (
        <div className="surface mb-lg">
          <h2 style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            Agent Performance Rollup
          </h2>
          <table>
            <thead>
              <tr>
                <th>Agent Type</th>
                <th style={{ textAlign: 'center' }}>Jobs Run</th>
                <th style={{ textAlign: 'right' }}>Avg Duration</th>
                <th style={{ textAlign: 'right' }}>Total Duration</th>
                <th style={{ textAlign: 'right' }}>Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {analytics.agentBreakdown.map((agent, idx) => {
                const avgMinutes = Math.floor((agent.avgDurationMs || 0) / 60000);
                const avgSeconds = Math.floor(((agent.avgDurationMs || 0) % 60000) / 1000);
                const totalMinutes = Math.floor((agent.totalDurationMs || 0) / 60000);
                const totalSeconds = Math.floor(((agent.totalDurationMs || 0) % 60000) / 1000);
                return (
                  <tr key={idx}>
                    <td>{agent.agentType}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'JetBrains Mono', fontWeight: '600' }}>{agent.jobCount}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: '13px' }}>{avgMinutes}m {avgSeconds}s</td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: '13px' }}>{totalMinutes}m {totalSeconds}s</td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: '600', color: 'var(--primary-container)' }}>${parseFloat(agent.totalCostUsd || 0).toFixed(4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* QUICK START GRID */}
      <div className="grid grid-2 mb-lg">
        <div className="card">
          <h3>Create New Project</h3>
          <p className="body-sm mt-md" style={{ color: 'var(--on-surface-variant)', marginBottom: 'var(--space-md)' }}>
            Start a new automation project by submitting a Product Definition Document (PDD) with requirements.
          </p>
          <Link to="/new-project" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              <span className="material-symbols-outlined" style={{ marginRight: '4px', fontSize: '18px' }}>add</span>
              New Project
            </button>
          </Link>
        </div>

        <div className="card">
          <h3>Track Pipeline</h3>
          <p className="body-sm mt-md" style={{ color: 'var(--on-surface-variant)', marginBottom: 'var(--space-md)' }}>
            Monitor all active projects through approval gates, agent work, and delivery phases.
          </p>
          <button className="btn">View Details</button>
        </div>
      </div>

      <footer>
        Projects · A-ADLC Platform
      </footer>
    </div>
  );
}
