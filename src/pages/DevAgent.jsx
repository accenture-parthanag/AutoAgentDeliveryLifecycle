import React, { useState } from 'react';

export default function DevAgent() {
  const [activeTab, setActiveTab] = useState('ongoing');

  return (
    <div className="container">
      {/* PAGE HEADER */}
      <div className="border-b pb-md mb-lg">
        <h1>Build & Validation</h1>
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          Developer Agent writes modular code, performs unit testing, and produces the source code package.
        </p>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-3 mb-lg">
        {[
          { label: 'Tasks Completed', value: '12/18', icon: 'done_all' },
          { label: 'Code Quality', value: '94%', icon: 'rate_review' },
          { label: 'Test Coverage', value: '87%', icon: 'assessment' }
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
            In Progress
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
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Invoice Processing Bot — Development</h3>
            <span className="badge warning">66% Complete</span>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ marginBottom: 'var(--space-md)' }}>Current Sprint: Core Modules</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                {[
                  { module: 'InvoiceValidator', status: 'completed', tests: 24 },
                  { module: 'CurrencyConverter', status: 'completed', tests: 16 },
                  { module: 'LedgerWriter', status: 'in-progress', tests: 8 },
                  { module: 'ErrorRecovery', status: 'in-progress', tests: 12 }
                ].map((item, idx) => (
                  <div key={idx} style={{
                    padding: 'var(--space-md)',
                    border: '1px solid var(--outline-variant)',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <p style={{ fontWeight: '600' }}>{item.module}</p>
                      <span className={`badge ${item.status === 'completed' ? 'success' : 'warning'}`}>
                        {item.status}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                        {item.tests} unit tests
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn">View Code Repository</button>
              <button className="btn btn-primary" style={{ marginLeft: 'var(--space-sm)' }}>Submit for QA</button>
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div>
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Modules</th>
                  <th>Coverage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Customer Data Migration</td>
                  <td>6</td>
                  <td>92%</td>
                  <td><span className="badge success">Ready for QA</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer>
        Developer Agent · Code Generation Phase · A-ADLC Platform
      </footer>
    </div>
  );
}
