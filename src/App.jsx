import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './index.css';
import { getProjects, getQueueJobs } from './api';
import Dashboard from './pages/Dashboard';
import PDDWorkflow from './pages/PDDWorkflow';
import ProjectDetail from './pages/ProjectDetail';
import GapResponse from './pages/GapResponse';
import ChangeRequestForm from './pages/ChangeRequestForm';
import ChangeRequestApproval from './pages/ChangeRequestApproval';
import PDDApproval from './pages/PDDApproval';
import BAAgent from './pages/BAAgent';
import ArchAgent from './pages/ArchAgent';
import TLAgent from './pages/TLAgent';
import DevAgent from './pages/DevAgent';
import QAAgent from './pages/QAAgent';

function AppContent() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarProjects, setSidebarProjects] = useState([]);
  const [outstandingRequests, setOutstandingRequests] = useState({});

  useEffect(() => {
    getProjects().then(setSidebarProjects).catch(() => setSidebarProjects([]));
  }, []);

  useEffect(() => {
    if (location.pathname !== '/') return;

    const stages = ['pdd_review', 'sdd', 'tdd', 'dev', 'qa_sit', 'qa_uat'];
    const fetchRequests = async () => {
      const requests = {};
      for (const stage of stages) {
        try {
          const jobs = await getQueueJobs(stage);
          requests[stage] = jobs.length;
        } catch (err) {
          requests[stage] = 0;
        }
      }
      setOutstandingRequests(requests);
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const isProjectRoute = location.pathname.startsWith('/project/');

  const getCurrentProject = () => {
    const match = location.pathname.match(/\/project\/(.+)$/);
    if (match) {
      const projectId = match[1];
      return sidebarProjects.find(p => p._id === projectId);
    }
    return null;
  };

  const currentProject = getCurrentProject();

  const projectsItems = [
    { path: '/', label: 'Projects', icon: 'folder_open' }
  ];

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div className="sidebar-section">
            <div className="sidebar-title">A-ADLC Hub</div>
            <div className="sidebar-subtitle">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-container)', display: 'inline-block' }}></span>
              v1.2 Agentic Lifecycle
            </div>
          </div>

          {/* CONTEXT-AWARE CONTENT */}
          {location.pathname === '/' ? (
            <>
              {/* DASHBOARD VIEW: OVERVIEW & AGENT UTILIZATION */}
              <div className="sidebar-section">
                <div className="label-bold" style={{ paddingLeft: 'var(--space-md)', marginBottom: 'var(--space-sm)', color: 'var(--on-surface-variant)', fontSize: '10px' }}>
                  OVERVIEW
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)' }}>
                  {[
                    { label: 'Total Projects', value: sidebarProjects.length },
                    { label: 'Active', value: sidebarProjects.filter(p => {
                      const currentPhase = p.phases?.find(ph => ph.status === 'in-progress');
                      return currentPhase !== undefined;
                    }).length },
                    { label: 'Completed', value: sidebarProjects.filter(p => p.phases?.every(ph => ph.status === 'completed')).length }
                  ].map((stat, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)' }}>
                      <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>{stat.label}</span>
                      <span className="label-bold" style={{ fontFamily: 'JetBrains Mono', color: 'var(--primary-container)' }}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sidebar-section">
                <div className="label-bold" style={{ paddingLeft: 'var(--space-md)', marginBottom: 'var(--space-sm)', color: 'var(--on-surface-variant)', fontSize: '10px' }}>
                  OUTSTANDING REQUESTS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)' }}>
                  {[
                    { stage: 'pdd_review', label: 'PDD Review' },
                    { stage: 'sdd', label: 'Solution Design' },
                    { stage: 'tdd', label: 'Technical Design' },
                    { stage: 'dev', label: 'Development' },
                    { stage: 'qa_sit', label: 'QA SIT' },
                    { stage: 'qa_uat', label: 'QA UAT' }
                  ].map((item) => (
                    <div key={item.stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)' }}>
                      <span className="body-sm" style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>{item.label}</span>
                      <span className="label-bold" style={{ fontFamily: 'JetBrains Mono', color: outstandingRequests[item.stage] > 0 ? 'var(--primary-container)' : 'var(--on-surface-variant)' }}>
                        {outstandingRequests[item.stage] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sidebar-section">
                <div className="label-bold" style={{ paddingLeft: 'var(--space-md)', marginBottom: 'var(--space-sm)', color: 'var(--on-surface-variant)', fontSize: '10px' }}>
                  RECENT PROJECTS
                </div>
                <nav className="sidebar-nav">
                  {sidebarProjects.slice(0, 2).map((project) => (
                    <li key={project._id}>
                      <Link
                        to={`/project/${project._id}`}
                        style={{
                          backgroundColor: 'transparent',
                          color: 'var(--on-surface-variant)',
                          borderLeftColor: 'transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface)' }}>{project.name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Phase: {project.phases?.[0]?.label || 'Not Started'}</span>
                      </Link>
                    </li>
                  ))}
                </nav>
              </div>
            </>
          ) : isProjectRoute && currentProject ? (
            <>
              {/* PROJECT DETAIL VIEW: PROJECT STATUS & NEXT ACTION */}
              <div className="sidebar-section">
                <div className="label-bold" style={{ paddingLeft: 'var(--space-md)', marginBottom: 'var(--space-sm)', color: 'var(--on-surface-variant)', fontSize: '10px' }}>
                  PROJECT STATUS
                </div>
                <div style={{ paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)' }}>
                  <div style={{ backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', padding: 'var(--space-md)', borderRadius: '4px', marginBottom: 'var(--space-md)' }}>
                    <div className="body-sm" style={{ fontWeight: '600', color: 'var(--on-surface)', marginBottom: '8px' }}>
                      {currentProject.name}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
                        <span style={{ color: 'var(--on-surface-variant)' }}>Progress</span>
                        <span style={{ fontWeight: '600', color: 'var(--primary-container)', fontFamily: 'JetBrains Mono' }}>{currentProject.progress}%</span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: 'var(--outline-variant)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${currentProject.progress}%`, backgroundColor: 'var(--primary-container)' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--on-surface)' }}>Phase:</span> {currentProject.currentPhase}
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--on-surface)' }}>Target:</span> {currentProject.targetDate}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="label-bold" style={{ paddingLeft: 'var(--space-md)', marginBottom: 'var(--space-sm)', color: 'var(--on-surface-variant)', fontSize: '10px' }}>
                  NEXT ACTION
                </div>
                <div style={{ paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#ffa500', fontSize: '20px', flexShrink: 0 }}>assignment</span>
                    <div>
                      <div className="body-sm" style={{ fontWeight: '600', color: 'var(--on-surface)', marginBottom: '4px' }}>
                        Assigned to: {currentProject.nextOwner}
                      </div>
                      <div className="body-sm" style={{ fontSize: '11px', color: 'var(--on-surface-variant)', lineHeight: '1.4' }}>
                        {currentProject.nextAction}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : location.pathname === '/new-project' ? (
            <>
              {/* PDD WORKFLOW VIEW: WORKFLOW HELP & TIPS */}
              <div className="sidebar-section">
                <div className="label-bold" style={{ paddingLeft: 'var(--space-md)', marginBottom: 'var(--space-sm)', color: 'var(--on-surface-variant)', fontSize: '10px' }}>
                  WORKFLOW HELP
                </div>
                <div style={{ paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: '20px', flexShrink: 0 }}>info</span>
                    <div>
                      <div className="body-sm" style={{ fontWeight: '600', color: 'var(--on-surface)', marginBottom: '4px' }}>Complete All Steps</div>
                      <div className="body-sm" style={{ fontSize: '11px', color: 'var(--on-surface-variant)', lineHeight: '1.4' }}>
                        Submit project info, respond to BA gaps, upload revised PDD, and get approval.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="label-bold" style={{ paddingLeft: 'var(--space-md)', marginBottom: 'var(--space-sm)', color: 'var(--on-surface-variant)', fontSize: '10px' }}>
                  CURRENT STEP TIPS
                </div>
                <div style={{ paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)' }}>
                  <div style={{ backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', padding: 'var(--space-sm)', borderRadius: '4px' }}>
                    <div className="body-sm" style={{ fontWeight: '600', color: 'var(--on-surface)', marginBottom: '8px' }}>
                      📄 Document Guidelines
                    </div>
                    <ul style={{ fontSize: '11px', color: 'var(--on-surface-variant)', lineHeight: '1.6', marginLeft: '16px' }}>
                      <li>Include scope and objectives</li>
                      <li>Use clear formatting</li>
                      <li>Define success criteria</li>
                      <li>Specify technical requirements</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="label-bold" style={{ paddingLeft: 'var(--space-md)', marginBottom: 'var(--space-sm)', color: 'var(--on-surface-variant)', fontSize: '10px' }}>
                  COMMON QUESTIONS
                </div>
                <div style={{ paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)' }}>
                  <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                      <div style={{ fontWeight: '600', color: 'var(--on-surface)', marginBottom: '2px' }}>Q: File formats?</div>
                      <div style={{ color: 'var(--on-surface-variant)' }}>PDF, Word, Excel supported</div>
                    </div>
                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                      <div style={{ fontWeight: '600', color: 'var(--on-surface)', marginBottom: '2px' }}>Q: How long to review?</div>
                      <div style={{ color: 'var(--on-surface-variant)' }}>~2 seconds for BA analysis</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--on-surface)', marginBottom: '2px' }}>Q: Revisions needed?</div>
                      <div style={{ color: 'var(--on-surface-variant)' }}>Answer gaps and upload v2</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

        </div>

        {/* NAVIGATION */}
        <div>
          {/* PROJECTS NAV LINK */}
          <div className="sidebar-section" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <nav className="sidebar-nav">
              {projectsItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={isActive(item.path) ? 'active' : ''}
                    style={{
                      backgroundColor: isActive(item.path) ? 'var(--surface-container-high)' : 'transparent',
                      color: isActive(item.path) ? 'var(--primary)' : 'var(--on-surface-variant)',
                      borderLeftColor: isActive(item.path) ? 'var(--primary)' : 'transparent'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </nav>
          </div>

        <div className="sidebar-section">
          <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-md)' }}>
            <a href="#" style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>gavel</span>
              Governance
            </a>
            <a href="#" style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>copyright</span>
              About
            </a>
          </div>
        </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="main-wrapper">
        {/* TOP HEADER */}
        <header>
          <div className="header-left">
            <button className="btn-icon" style={{ display: 'none' }} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="header-title">A-ADLC Agentic Lifecycle</div>
          </div>
          <div className="header-right">
            <button className="btn-icon">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="btn-icon">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <button className="btn-icon" style={{ border: '1px solid var(--outline-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>account_circle</span>
            </button>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-project" element={<PDDWorkflow />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/gap-response/:projectId" element={<GapResponse />} />
            <Route path="/change-request/:projectId" element={<ChangeRequestForm />} />
            <Route path="/change-request" element={<ChangeRequestForm />} />
            <Route path="/cr-approval/:projectId" element={<ChangeRequestApproval />} />
            <Route path="/pdd-approval/:projectId" element={<PDDApproval />} />
            <Route path="/ba-agent" element={<BAAgent />} />
            <Route path="/arch-agent" element={<ArchAgent />} />
            <Route path="/tl-agent" element={<TLAgent />} />
            <Route path="/dev-agent" element={<DevAgent />} />
            <Route path="/qa-agent" element={<QAAgent />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
