import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProject, submitJob, getProjects } from '../api';

export default function ChangeRequestForm() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [loading, setLoading] = useState(!!projectId);
  const [submitting, setSubmitting] = useState(false);
  const [pddFile, setPddFile] = useState(null);
  const [changeReason, setChangeReason] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      return;
    }

    setLoading(true);
    getProject(selectedProjectId)
      .then(setProject)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      alert('Please select a project');
      return;
    }

    if (!changeReason) {
      alert('Please select a reason for change');
      return;
    }

    if (!changeNotes && !pddFile) {
      alert('Please provide change notes or upload a PDD document');
      return;
    }

    try {
      setSubmitting(true);

      if (pddFile) {
        // Read file as base64 if provided
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Content = reader.result.split(',')[1];

          await submitJob(selectedProjectId, 'change-request', {
            projectId: selectedProjectId,
            pddFileName: pddFile.name,
            pddFileContent: base64Content,
            reason: changeReason,
            revisionNotes: changeNotes,
            status: 'pending-ccb',
            submittedAt: new Date().toISOString(),
            submittedBy: 'BT Team'
          });

          alert('✓ Change Request submitted to CCB for approval!');
          navigate(`/project/${selectedProjectId}`);
        };
        reader.readAsDataURL(pddFile);
      } else {
        // Submit without file if only change notes provided
        await submitJob(selectedProjectId, 'change-request', {
          projectId: selectedProjectId,
          pddFileName: null,
          pddFileContent: null,
          reason: changeReason,
          revisionNotes: changeNotes,
          status: 'pending-ccb',
          submittedAt: new Date().toISOString(),
          submittedBy: 'BT Team'
        });

        alert('✓ Change Request submitted to CCB for approval!');
        navigate(`/project/${selectedProjectId}`);
      }
    } catch (err) {
      alert('Error submitting change request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const changeReasons = [
    { value: 'ba-feedback-response', label: 'Response to BA Feedback' },
    { value: 'scope-change', label: 'Project Scope Change' },
    { value: 'requirement-update', label: 'Business Requirement Update' },
    { value: 'stakeholder-input', label: 'Stakeholder/Customer Input' },
    { value: 'compliance-update', label: 'Compliance/Regulatory Update' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-container)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          Back to Dashboard
        </Link>
      </div>

      <div className="border-b pb-md mb-lg">
        <h1>Change Request <em>Submit to CCB</em></h1>
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          Submit change details for Change Control Board (CCB) review and approval
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <div className="surface">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Select Project</h3>

          <div className="form-group">
            <label className="form-label">Project *</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ padding: '10px', border: '1px solid var(--outline-variant)', borderRadius: '0px', fontFamily: 'Geist, sans-serif', fontSize: '14px' }}
            >
              <option value="">Choose a project...</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {project && (
            <div className="callout" style={{ marginTop: 'var(--space-md)' }}>
              <span className="material-symbols-outlined callout-icon">info</span>
              <div className="callout-content">
                <div className="callout-title">{project.name}</div>
                <div className="callout-text">
                  Status: <strong>{project.status}</strong> • Phase: <strong>
                    {project.phases?.find(p => p.status === 'in-progress' || p.status === 'completed')?.label || 'PDD Review'}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedProjectId && (
          <>
            <div className="surface">
              <h3 style={{ marginBottom: 'var(--space-lg)' }}>Change Details</h3>

              <div className="form-group">
                <label className="form-label">Reason for Change *</label>
                <select
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  style={{ padding: '10px', border: '1px solid var(--outline-variant)', borderRadius: '0px', fontFamily: 'Geist, sans-serif', fontSize: '14px' }}
                >
                  <option value="">Select a reason...</option>
                  {changeReasons.map(reason => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Change Notes & Details</label>
                <textarea
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  placeholder="Describe what changed in this PDD version..."
                  rows="4"
                />
              </div>
            </div>

            <div className="surface">
              <h3 style={{ marginBottom: 'var(--space-lg)' }}>Upload New PDD (Optional)</h3>

              <div className="form-group">
                <label className="form-label">PDD Document</label>
                <div className="form-hint">Upload a new or revised PDD document (optional - only if you have an updated PDD)</div>
                <div
                  className="file-upload-zone"
                  onClick={() => document.getElementById('pdd-file-input').click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    if (e.dataTransfer.files.length > 0) {
                      setPddFile(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary-container)' }}>cloud_upload</span>
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <p style={{ fontWeight: '500' }}>Drag and drop or click to upload</p>
                    <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>PDF, Word, or other document format</p>
                  </div>
                  {pddFile && (
                    <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--primary-container)', fontWeight: '500' }}>
                      ✓ {pddFile.name} ({(pddFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <input
                  id="pdd-file-input"
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files.length > 0) {
                      setPddFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !pddFile || !changeReason}
                style={{ opacity: (submitting || !pddFile || !changeReason) ? 0.5 : 1, cursor: (submitting || !pddFile || !changeReason) ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Submitting...' : 'Submit Change Request'}
              </button>
              <Link to={`/project/${selectedProjectId}`}>
                <button className="btn">Cancel</button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
