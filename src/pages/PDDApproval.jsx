import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProject, submitJob } from '../api';

export default function PDDApproval() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  useEffect(() => {
    getProject(projectId)
      .then(setProject)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleApprove = async () => {
    if (!confirmCheckbox) {
      alert('Please confirm that this is the final version of the PDD');
      return;
    }

    try {
      setSubmitting(true);

      // Update project to mark PDD approved phase as completed
      await submitJob(projectId, 'pdd-approved', {
        projectId,
        approvalNotes,
        approvedAt: new Date().toISOString(),
        approvedBy: 'BT Team'
      });

      alert('✓ PDD has been approved and is ready for Architecture phase!');
      navigate(`/project/${projectId}`);
    } catch (err) {
      alert('Error approving PDD: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container" style={{ padding: 'var(--space-xl)' }}>Loading...</div>;
  if (error) return <div className="container" style={{ padding: 'var(--space-xl)', color: 'var(--negative)' }}>Error: {error}</div>;
  if (!project) return <div className="container" style={{ padding: 'var(--space-xl)' }}>Project not found</div>;

  const pddApprovedPhase = project.phases?.find(p => p.id === 'pdd-approved');
  const alreadyApproved = pddApprovedPhase?.status === 'completed';

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)' }}>
        <Link to={`/project/${projectId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-container)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          Back to Project
        </Link>
      </div>

      <div className="border-b pb-md mb-lg">
        <h1>BT Approval <em>Final PDD</em></h1>
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          Business Transformation team: Confirm that the PDD is complete and ready for the Architecture phase
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* PROJECT SUMMARY */}
        <div className="surface">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Project Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-lg)' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Project Name</p>
              <p style={{ fontSize: '16px', fontWeight: '500' }}>{project.name}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Status</p>
              <p style={{ fontSize: '16px', fontWeight: '500' }}>{project.status}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Start Date</p>
              <p style={{ fontSize: '16px', fontWeight: '500' }}>{project.startDate || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Target Date</p>
              <p style={{ fontSize: '16px', fontWeight: '500' }}>{project.targetDate || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* BA FEEDBACK SUMMARY */}
        {project.baGaps && project.baGaps.length > 0 && (
          <div className="surface">
            <h3 style={{ marginBottom: 'var(--space-lg)' }}>BA Feedback Summary</h3>
            <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--on-surface-variant)' }}>
              BA Agent identified <strong>{project.baGaps.length} gaps/clarifications</strong> that should be addressed in this PDD version:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {project.baGaps.map((gap, idx) => (
                <div key={gap.id} style={{
                  padding: 'var(--space-sm)',
                  backgroundColor: 'var(--surface-container-low)',
                  borderLeft: '3px solid var(--primary-container)'
                }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Q{idx + 1}: {gap.category}</p>
                  <p style={{ fontSize: '13px', margin: 0 }}>{gap.question.substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* APPROVAL FORM */}
        <div className="surface">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Final Approval Confirmation</h3>

          {alreadyApproved ? (
            <>
              <div className="callout" style={{ marginBottom: 'var(--space-lg)', borderLeft: '3px solid #10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)' }}>
                <span className="material-symbols-outlined callout-icon" style={{ color: '#10b981' }}>task_alt</span>
                <div className="callout-content">
                  <div className="callout-title">PDD Already Approved</div>
                  <div className="callout-text">
                    This PDD has already been approved and the project is ready for the Architecture phase. No further approval action is needed.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button
                  className="btn btn-primary"
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#10b981' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px', verticalAlign: 'middle' }}>check_circle</span>
                  Final PDD Approved
                </button>
                <Link to={`/project/${projectId}`}>
                  <button className="btn">Back to Project</button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="callout" style={{ marginBottom: 'var(--space-lg)' }}>
                <span className="material-symbols-outlined callout-icon">check_circle</span>
                <div className="callout-content">
                  <div className="callout-title">Ready for Architecture Phase</div>
                  <div className="callout-text">
                    By approving this PDD, you confirm that it is complete, all BA feedback has been addressed, and it's ready for the Architecture team to begin designing the solution.
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Approval Notes (Optional)</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any final notes or comments about this PDD approval..."
                  rows="3"
                />
              </div>

              <div style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                marginBottom: 'var(--space-lg)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                  <input
                    type="checkbox"
                    checked={confirmCheckbox}
                    onChange={(e) => setConfirmCheckbox(e.target.checked)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  I confirm that this is the final version of the PDD and is ready for Architecture phase
                </label>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleApprove}
                  disabled={submitting || !confirmCheckbox}
                  style={{ opacity: (submitting || !confirmCheckbox) ? 0.5 : 1, cursor: (submitting || !confirmCheckbox) ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Approving...' : 'Approve Final PDD'}
                </button>
                <Link to={`/project/${projectId}`}>
                  <button className="btn">Cancel</button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
