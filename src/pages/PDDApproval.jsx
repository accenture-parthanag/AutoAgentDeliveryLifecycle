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
  const [uploadingNewVersion, setUploadingNewVersion] = useState(false);
  const [newPddFile, setNewPddFile] = useState(null);
  const [newPddNotes, setNewPddNotes] = useState('');

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

  const handleUploadNewVersion = async () => {
    if (!newPddFile) {
      alert('Please select a PDD file to upload');
      return;
    }

    try {
      setUploadingNewVersion(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = reader.result.split(',')[1];

        const response = await fetch(`/api/projects/${projectId}/new-pdd-version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pddFileName: newPddFile.name,
            pddFileContent: base64Content,
            versionNotes: newPddNotes,
            submittedBy: 'BT Team'
          })
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        alert('✓ New PDD version uploaded! BA Agent will review it now.');
        navigate(`/project/${projectId}`);
      };
      reader.readAsDataURL(newPddFile);
    } catch (err) {
      alert('Error uploading new version: ' + err.message);
    } finally {
      setUploadingNewVersion(false);
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

        {/* PDD VERSION HISTORY */}
        {project.pddVersions && project.pddVersions.length > 0 && (
          <div className="surface">
            <h3 style={{ marginBottom: 'var(--space-lg)' }}>PDD Version History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {project.pddVersions.slice().reverse().map((version, idx) => (
                <div key={idx} style={{
                  padding: 'var(--space-md)',
                  backgroundColor: 'var(--surface-container-low)',
                  border: '1px solid var(--outline-variant)',
                  borderLeft: version.status === 'final' ? '4px solid var(--primary-container)' : '4px solid var(--outline-variant)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
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

        {/* UPLOAD NEW VERSION (Before Approval) */}
        {!alreadyApproved && (
          <div className="surface">
            <h3 style={{ marginBottom: 'var(--space-lg)' }}>Upload New Version (Optional)</h3>
            <div className="callout" style={{ marginBottom: 'var(--space-lg)' }}>
              <span className="material-symbols-outlined callout-icon">info</span>
              <div className="callout-content">
                <div className="callout-title">Not happy with the BA-generated version?</div>
                <div className="callout-text">
                  You can upload a new PDD version here. This will restart the BA review process with your updated document.
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">PDD Document</label>
              <div className="form-hint">Upload a revised PDD document if needed. Uploading will restart the BA review process.</div>
              <div
                className="file-upload-zone"
                onClick={() => document.getElementById('new-pdd-input').click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('drag-over');
                  if (e.dataTransfer.files.length > 0) {
                    setNewPddFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary-container)' }}>cloud_upload</span>
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <p style={{ fontWeight: '500' }}>Drag and drop or click to upload</p>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>PDF, Word, or other document format</p>
                </div>
                {newPddFile && (
                  <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--primary-container)', fontWeight: '500' }}>
                    ✓ {newPddFile.name}
                  </p>
                )}
              </div>
              <input
                id="new-pdd-input"
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files.length > 0) {
                    setNewPddFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Version Notes</label>
              <textarea
                value={newPddNotes}
                onChange={(e) => setNewPddNotes(e.target.value)}
                placeholder="Brief summary of changes in this new version..."
                rows="3"
              />
            </div>

            {newPddFile && (
              <button
                className="btn btn-primary"
                onClick={handleUploadNewVersion}
                disabled={uploadingNewVersion}
                style={{ marginBottom: 'var(--space-lg)', opacity: uploadingNewVersion ? 0.5 : 1, cursor: uploadingNewVersion ? 'not-allowed' : 'pointer' }}
              >
                {uploadingNewVersion ? 'Uploading...' : 'Upload New Version'}
              </button>
            )}
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
                    This PDD has been approved and the project is ready for the Architecture phase. You can now create a Change Request if business requirements change.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#10b981' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px', verticalAlign: 'middle' }}>check_circle</span>
                  Final PDD Approved
                </button>
                <Link to={`/change-request/${projectId}`}>
                  <button className="btn btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>description</span>
                    Create Change Request
                  </button>
                </Link>
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
