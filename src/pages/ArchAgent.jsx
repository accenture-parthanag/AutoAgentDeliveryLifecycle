import React, { useState } from 'react';

export default function ArchAgent() {
  const [activeTab, setActiveTab] = useState('ongoing');

  return (
    <div className="container">
      {/* PAGE HEADER */}
      <div className="border-b pb-md mb-lg">
        <h1>Architecture & Strategy</h1>
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          Architect Agent defines solution design, selects technology stack, and creates the SDD.
        </p>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-3 mb-lg">
        {[
          { label: 'Total Designs', value: '2', icon: 'architecture' },
          { label: 'Tech Stacks', value: '3', icon: 'settings' },
          { label: 'Scalability', value: '8.6/10', icon: 'trending_up' }
        ].map((metric, idx) => (
          <div key={idx} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--outline-variant)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <h3 className="label-bold">{metric.label}</h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>
                {metric.icon}
              </span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--primary)' }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="surface mb-lg">
        <div style={{ display: 'flex', gap: 'var(--space-md)', borderBottom: '1px solid var(--outline-variant)', marginBottom: 'var(--space-md)' }}>
          <button
            onClick={() => setActiveTab('ongoing')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              borderBottom: activeTab === 'ongoing' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'ongoing' ? 'var(--primary)' : 'var(--on-surface-variant)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Ongoing
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              borderBottom: activeTab === 'completed' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'completed' ? 'var(--primary)' : 'var(--on-surface-variant)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Completed
          </button>
        </div>

        {activeTab === 'ongoing' && (
          <div>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Customer Data Migration — SDD Draft</h3>
            <span className="badge warning">Architecture Design in Progress</span>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ marginBottom: 'var(--space-md)' }}>Tech Stack Analysis</h4>
              <div style={{
                padding: 'var(--space-md)',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                marginBottom: 'var(--space-lg)'
              }}>
                <p style={{ fontWeight: '600', color: 'var(--primary-container)', marginBottom: 'var(--space-sm)' }}>
                  Recommended: Python + Apache Airflow
                </p>
                <p className="body-sm" style={{ marginBottom: 'var(--space-sm)' }}>
                  <strong>Why:</strong> Superior JSON handling, native parallel processing, cost-effective for 10K+ records/day.
                </p>
                <p className="body-sm">
                  <strong>Alternatives:</strong> RPA rejected (licensing at scale), Low-code lacks error recovery granularity.
                </p>
              </div>

              <h4 style={{ marginBottom: 'var(--space-md)' }}>Component Architecture</h4>
              <div style={{
                padding: 'var(--space-lg)',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                marginBottom: 'var(--space-lg)',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ padding: 'var(--space-md)', background: 'var(--primary-fixed)', border: '1px solid var(--primary-container)' }}>
                      <p className="label-bold">Data Ingestion</p>
                    </div>
                  </div>
                  <div style={{ color: 'var(--on-surface-variant)' }}>→</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ padding: 'var(--space-md)', background: 'var(--primary-fixed)', border: '1px solid var(--primary-container)' }}>
                      <p className="label-bold">Processing</p>
                    </div>
                  </div>
                  <div style={{ color: 'var(--on-surface-variant)' }}>→</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ padding: 'var(--space-md)', background: 'var(--primary-fixed)', border: '1px solid var(--primary-container)' }}>
                      <p className="label-bold">Target System</p>
                    </div>
                  </div>
                </div>
              </div>

              <button className="btn">Review Design</button>
              <button className="btn btn-primary" style={{ marginLeft: 'var(--space-sm)' }}>Approve SDD</button>
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div>
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Tech Stack</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Invoice Processing</td>
                  <td><span className="badge">Python</span></td>
                  <td>2026-05-06</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer>
        Architect Agent · Solution Architecture Phase · AASDI Platform
      </footer>
    </div>
  );
}
