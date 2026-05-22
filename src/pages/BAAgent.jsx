import React, { useState } from 'react';

export default function BAAgent() {
  const [activeTab, setActiveTab] = useState('ongoing');

  const gaps = [
    { id: 1, question: 'How should the system handle multi-currency invoices?', status: 'pending' },
    { id: 2, question: 'What is the tolerance threshold for invoice discrepancies?', status: 'pending' },
    { id: 3, question: 'Who approves exceptions, and what is the SLA?', status: 'pending' }
  ];

  return (
    <div className="container">
      {/* PAGE HEADER */}
      <div className="border-b pb-md mb-lg">
        <h1>Requirement Hardening</h1>
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          BA Agent performs logical stress testing, gap analysis, and clarification cycles to produce the Final PDD.
        </p>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-3 mb-lg">
        {[
          { label: 'PDDs Analyzed', value: '3', icon: 'assignment' },
          { label: 'Avg Gaps Found', value: '4.2', icon: 'find_in_page' },
          { label: 'Completion Rate', value: '100%', icon: 'check_circle' }
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
            className={activeTab === 'ongoing' ? 'active' : ''}
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
            className={activeTab === 'completed' ? 'active' : ''}
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
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Supply Chain Optimization</h3>
            <span className="badge success">Gap Analysis In Progress</span>

            <div style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <h4 style={{ marginBottom: 'var(--space-md)' }}>Identified Gaps</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {gaps.map((gap) => (
                  <div key={gap.id} style={{
                    padding: 'var(--space-md)',
                    background: 'var(--surface-container-low)',
                    border: '1px solid var(--outline-variant)',
                    borderLeft: '4px solid var(--primary-container)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                      <p style={{ fontWeight: '600' }}>Question {gap.id}</p>
                      <span className="label-bold">{gap.status}</span>
                    </div>
                    <p className="body-sm">{gap.question}</p>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn">Update Clarifications</button>
            <button className="btn btn-primary" style={{ marginLeft: 'var(--space-sm)' }}>Generate Final PDD</button>
          </div>
        )}

        {activeTab === 'completed' && (
          <div>
            <table>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Date Completed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Invoice Processing</td>
                  <td><span className="badge success">Final PDD Approved</span></td>
                  <td>2026-05-06</td>
                </tr>
                <tr>
                  <td>Customer Data Migration</td>
                  <td><span className="badge success">Final PDD Approved</span></td>
                  <td>2026-04-30</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer>
        BA Agent · Requirement Hardening Phase · AASDI Platform
      </footer>
    </div>
  );
}
