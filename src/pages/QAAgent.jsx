import React, { useState } from 'react';

export default function QAAgent() {
  const [activeTab, setActiveTab] = useState('ongoing');

  return (
    <div className="container">
      {/* PAGE HEADER */}
      <div className="border-b pb-md mb-lg">
        <h1>Quality Assurance</h1>
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          QA Agent generates test cases, executes validation, and produces the Test Summary Report.
        </p>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-3 mb-lg">
        {[
          { label: 'Tests Generated', value: '142', icon: 'bug_report' },
          { label: 'Pass Rate', value: '98.6%', icon: 'check_circle' },
          { label: 'Bugs Found', value: '8', icon: 'warning' }
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
            onClick={() => setActiveTab('testing')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              borderBottom: activeTab === 'testing' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'testing' ? 'var(--primary)' : 'var(--on-surface-variant)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Testing
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

        {activeTab === 'testing' && (
          <div>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Customer Data Migration — QA Validation</h3>
            <span className="badge warning">Test Execution in Progress</span>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ marginBottom: 'var(--space-md)' }}>Test Categories</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                {[
                  { category: 'Business Logic', count: 32, passed: 32, status: 'passed' },
                  { category: 'Data Validation', count: 28, passed: 28, status: 'passed' },
                  { category: 'Error Handling', count: 24, passed: 23, status: 'failed' },
                  { category: 'Performance', count: 18, passed: 18, status: 'passed' },
                  { category: 'Integration', count: 40, passed: 39, status: 'failed' }
                ].map((test, idx) => (
                  <div key={idx} style={{
                    padding: 'var(--space-md)',
                    border: '1px solid var(--outline-variant)',
                    borderLeft: `4px solid ${test.status === 'passed' ? '#10b981' : 'var(--error)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                      <h4>{test.category}</h4>
                      <span className={`badge ${test.status === 'passed' ? 'success' : 'error'}`}>
                        {test.status}
                      </span>
                    </div>
                    <div style={{ height: '4px', backgroundColor: 'var(--outline-variant)', marginBottom: 'var(--space-sm)' }}>
                      <div style={{
                        height: '100%',
                        width: `${(test.passed / test.count) * 100}%`,
                        backgroundColor: test.status === 'passed' ? '#10b981' : 'var(--error)'
                      }} />
                    </div>
                    <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      {test.passed} / {test.count} passed
                    </p>
                  </div>
                ))}
              </div>

              <button className="btn">View Test Report</button>
              <button className="btn" style={{ marginLeft: 'var(--space-sm)' }}>Report Bug</button>
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div>
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Tests</th>
                  <th>Pass Rate</th>
                  <th>UAT Ready</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Invoice Processing</td>
                  <td>142</td>
                  <td>100%</td>
                  <td><span className="badge success">✓ Yes</span></td>
                </tr>
                <tr>
                  <td>Compliance Reporter</td>
                  <td>96</td>
                  <td>99.2%</td>
                  <td><span className="badge success">✓ Yes</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer>
        QA Agent · Quality Assurance Phase · A-ADLC Platform
      </footer>
    </div>
  );
}
