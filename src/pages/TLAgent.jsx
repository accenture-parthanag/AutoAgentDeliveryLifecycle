import React, { useState } from 'react';

export default function TLAgent() {
  const [activeTab, setActiveTab] = useState('ongoing');

  return (
    <div className="container">
      {/* PAGE HEADER */}
      <div className="border-b pb-md mb-lg">
        <h1>Technical Decomposition</h1>
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          Tech Lead Agent decomposes architecture into atomic tasks, pseudocode, and produces the TDD.
        </p>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-3 mb-lg">
        {[
          { label: 'TDDs Created', value: '2', icon: 'description' },
          { label: 'Tasks Generated', value: '18', icon: 'task_alt' },
          { label: 'Code Modularity', value: '94%', icon: 'check' }
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
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Invoice Processing — TDD Draft</h3>
            <span className="badge warning">Decomposition in Progress</span>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ marginBottom: 'var(--space-md)' }}>Dev Task Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                {[
                  { task: 'Setup data ingestion pipeline', complexity: 'Medium' },
                  { task: 'Implement invoice validation logic', complexity: 'High' },
                  { task: 'Create error recovery handler', complexity: 'High' },
                  { task: 'Build logging & monitoring module', complexity: 'Low' }
                ].map((item, idx) => (
                  <div key={idx} style={{
                    padding: 'var(--space-md)',
                    border: '1px solid var(--outline-variant)',
                    borderLeft: '4px solid var(--primary-container)',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <p style={{ fontWeight: '600' }}>Task {idx + 1}</p>
                      <p className="body-sm">{item.task}</p>
                    </div>
                    <span className="label-bold" style={{
                      color: item.complexity === 'High' ? 'var(--error)' : item.complexity === 'Medium' ? 'var(--on-surface)' : 'var(--on-surface-variant)'
                    }}>
                      {item.complexity}
                    </span>
                  </div>
                ))}
              </div>

              <button className="btn">Review Tasks</button>
              <button className="btn btn-primary" style={{ marginLeft: 'var(--space-sm)' }}>Hand Off to Dev</button>
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div>
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Tasks</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Customer Data Migration</td>
                  <td>8</td>
                  <td>2026-04-30</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer>
        Tech Lead Agent · Technical Decomposition Phase · A-ADLC Platform
      </footer>
    </div>
  );
}
