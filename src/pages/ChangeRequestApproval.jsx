import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProject, submitJob } from '../api';
import RichTextEditor from '../components/RichTextEditor';

export default function ChangeRequestApproval() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  useEffect(() => {
    getProject(projectId)
      .then(setProject)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleApprove = async () => {
    try {
      setProcessing(true);
      const crId = pendingCR?.id;

      const response = await fetch(`/api/projects/${projectId}/cr-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crId,
          approvalNotes
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      alert('✓ Change Request approved! Proceeding with changes.');
      navigate(`/project/${projectId}`);
    } catch (err) {
      alert('Error approving change request: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!approvalNotes.trim()) {
      alert('Please provide rejection reason in the notes field');
      return;
    }

    try {
      setProcessing(true);
      const crId = pendingCR?.id;

      const response = await fetch(`/api/projects/${projectId}/cr-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crId,
          rejectionReason: approvalNotes
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      alert('✓ Change Request rejected. Last approved PDD will be used to proceed.');
      navigate(`/project/${projectId}`);
    } catch (err) {
      alert('Error rejecting change request: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="container" style={{ padding: 'var(--space-xl)' }}>Loading...</div>;
  if (error) return <div className="container" style={{ padding: 'var(--space-xl)', color: 'var(--negative)' }}>Error: {error}</div>;
  if (!project) return <div className="container" style={{ padding: 'var(--space-xl)' }}>Project not found</div>;

  const pendingCR = project.changeRequests?.find(cr => cr.status === 'pending-ccb');

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)' }}>
        <Link to={`/project/${projectId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-container)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          Back to Project
        </Link>
      </div>

      <div className="border-b pb-md mb-lg">
        <h1>CCB Approval <em>Change Request Review</em></h1>
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          Change Control Board: Review the requested changes and approve or reject
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
              <p style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Current Phase</p>
              <p style={{ fontSize: '16px', fontWeight: '500' }}>
                {project.phases?.find(ph => ph.status === 'in-progress')?.label || 'In Progress'}
              </p>
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

        {/* CHANGE REQUEST DETAILS */}
        {pendingCR && (
          <div className="surface">
            <h3 style={{ marginBottom: 'var(--space-lg)' }}>Requested Changes</h3>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Reason for Change</p>
              <p style={{ fontSize: '14px' }}>{pendingCR.reason || 'Not specified'}</p>
            </div>

            {pendingCR.revisionNotes && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Change Details</p>
                <div style={{
                  padding: 'var(--space-md)',
                  backgroundColor: 'var(--surface-container-low)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 0
                }}>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {pendingCR.revisionNotes}
                  </p>
                </div>
              </div>
            )}

            {pendingCR.pddFileName && (
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Attached PDD</p>
                <p style={{ fontSize: '14px', color: 'var(--primary-container)' }}>
                  📄 {pendingCR.pddFileName}
                </p>
              </div>
            )}
          </div>
        )}

        {/* APPROVAL DECISION */}
        <div className="surface">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>CCB Decision</h3>

          <div className="callout" style={{ marginBottom: 'var(--space-lg)' }}>
            <span className="material-symbols-outlined callout-icon">gavel</span>
            <div className="callout-content">
              <div className="callout-title">Change Control Board Review</div>
              <div className="callout-text">
                If approved, the changes will proceed. If rejected, the last approved PDD will be used to continue development.
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {pendingCR?.status === 'pending-ccb' && 'Approval Notes (Optional)'}
              {pendingCR?.status === 'pending-ccb' && ' or Rejection Reason (Required if rejecting)'}
            </label>
            <RichTextEditor
              value={approvalNotes}
              onChange={setApprovalNotes}
              placeholder="Add any notes about this decision..."
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <button
              className="btn btn-primary"
              onClick={handleApprove}
              disabled={processing}
              style={{ opacity: processing ? 0.5 : 1, cursor: processing ? 'not-allowed' : 'pointer' }}
            >
              {processing ? 'Processing...' : '✓ Approve Change Request'}
            </button>
            <button
              className="btn"
              onClick={handleReject}
              disabled={processing}
              style={{
                opacity: processing ? 0.5 : 1,
                cursor: processing ? 'not-allowed' : 'pointer',
                backgroundColor: 'var(--negative)',
                color: 'white'
              }}
            >
              {processing ? 'Processing...' : '✕ Reject & Revert to Last PDD'}
            </button>
            <Link to={`/project/${projectId}`}>
              <button className="btn">Cancel</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
