import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProject, submitJob } from '../api';

function getTemplateResponse(gap) {
  const templates = {
    'Business Logic': `Clarifying the business logic for this requirement: [Provide detailed explanation of how this process should work, including any business rules, decision trees, or conditional logic]`,
    'Data Validation': `Data validation requirements: [Specify validation rules, data formats, acceptable ranges, mandatory fields, and error handling procedures]`,
    'Process Governance': `Process governance details: [Define responsibilities, approval workflows, escalation procedures, and governance checkpoints]`,
    'Integration': `Integration specifications: [Describe system interfaces, APIs, data mapping, integration points, and technical connectivity requirements]`,
    'Risk Management': `Risk mitigation approach: [Address potential risks, mitigation strategies, contingency plans, and monitoring mechanisms]`,
    'Performance': `Performance requirements: [Define performance SLAs, throughput targets, response times, capacity requirements, and optimization strategies]`
  };

  return templates[gap.category] || `Response to: ${gap.question}`;
}

export default function GapResponse() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [revisedPddFile, setRevisedPddFile] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  useEffect(() => {
    getProject(projectId)
      .then(p => {
        setProject(p);
        // Initialize responses with template text
        const initialResponses = {};
        if (p.baGaps && p.baGaps.length > 0) {
          p.baGaps.forEach(gap => {
            initialResponses[gap.id] = getTemplateResponse(gap);
          });
        }
        setResponses(initialResponses);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleResponseChange = (gapId, value) => {
    setResponses(prev => ({
      ...prev,
      [gapId]: value
    }));
  };

  const allAnswered = project?.baGaps?.every(g => responses[g.id]?.trim());

  const handleSaveDraft = async () => {
    try {
      setSubmitting(true);
      // Save as draft without submitting
      await submitJob(projectId, 'save-gap-responses', {
        projectId,
        btResponses: responses,
        revisionNotes,
        isDraft: true,
        savedAt: new Date().toISOString()
      });

      alert('✓ Your draft responses have been saved successfully!');
    } catch (err) {
      alert('Error saving draft: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      alert('Please respond to all gaps before submitting');
      return;
    }

    try {
      setSubmitting(true);
      // Submit job to mark BA review as complete with responses
      await submitJob(projectId, 'submit-gap-responses', {
        projectId,
        btResponses: responses,
        revisedPddFileName: revisedPddFile?.name || null,
        revisedPddFileSize: revisedPddFile?.size || null,
        revisionNotes,
        isDraft: false,
        respondedAt: new Date().toISOString(),
        submittedBy: 'BT Team'
      });

      alert('✓ Your responses have been submitted successfully!');
      navigate(`/project/${projectId}`);
    } catch (err) {
      alert('Error submitting responses: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container" style={{ padding: 'var(--space-xl)' }}>Loading...</div>;
  if (error) return <div className="container" style={{ padding: 'var(--space-xl)', color: 'var(--negative)' }}>Error: {error}</div>;
  if (!project || !project.baGaps) return <div className="container" style={{ padding: 'var(--space-xl)' }}>No gaps found</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)' }}>
        <Link to={`/project/${projectId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-container)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          Back to Project
        </Link>
      </div>

      <div className="border-b pb-md mb-lg">
        <h1>{project.name}</h1>
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          Respond to BA Agent questions and submit a revised PDD document
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {project.baGaps.map((gap) => (
          <div key={gap.id} className="surface">
            <div style={{ marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--outline-variant)' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-container)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Question {gap.id}
              </p>
              <h3 style={{ marginBottom: 'var(--space-sm)' }}>{gap.question}</h3>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '4px 8px',
                  backgroundColor: 'var(--outline-variant)',
                  borderRadius: '0px',
                  textTransform: 'uppercase'
                }}>
                  {gap.category}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '4px 8px',
                  backgroundColor: gap.complexity === 'high' ? '#fee2e2' : gap.complexity === 'medium' ? '#fef3c7' : '#dbeafe',
                  color: gap.complexity === 'high' ? '#991b1b' : gap.complexity === 'medium' ? '#92400e' : '#1e40af',
                  borderRadius: '0px',
                  textTransform: 'capitalize'
                }}>
                  {gap.complexity} complexity
                </span>
              </div>
            </div>

            {(gap.pddReference || gap.answerHint || gap.impactIfUnanswered) && (
              <div style={{
                padding: 'var(--space-md)',
                marginBottom: 'var(--space-md)',
                backgroundColor: 'var(--surface-container-low)',
                borderLeft: '3px solid var(--primary-container)'
              }}>
                {gap.pddReference && (
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                    <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>PDD Reference:</strong>{' '}
                    {gap.pddReference}
                  </p>
                )}
                {gap.answerHint && (
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                    <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Expected Answer:</strong>{' '}
                    {gap.answerHint}
                  </p>
                )}
                {gap.impactIfUnanswered && (
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Impact if Unanswered:</strong>{' '}
                    {gap.impactIfUnanswered}
                  </p>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">BT Response *</label>
              <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
                Template pre-filled below. Edit to provide your specific response.
              </div>
              <textarea
                value={responses[gap.id] || ''}
                onChange={(e) => handleResponseChange(gap.id, e.target.value)}
                rows="6"
                style={{ fontFamily: 'Geist, sans-serif', fontSize: '14px' }}
              />
            </div>
          </div>
        ))}

        <div className="surface">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Revised PDD Document (Optional)</h3>
          <div className="callout">
            <span className="material-symbols-outlined callout-icon">info</span>
            <div className="callout-content">
              <div className="callout-title">Upload now or submit via Change Request later</div>
              <div className="callout-text">You can upload a revised PDD here, or submit it later through the Change Request Form. Either way works.</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Upload Revised PDD (V2)</label>
            <div className="form-hint">Optional. Upload your updated PDD document addressing all BA feedback. You can also submit this later.</div>
            <div
              className="file-upload-zone"
              onClick={() => document.getElementById('revised-pdd-input').click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');
                if (e.dataTransfer.files.length > 0) {
                  setRevisedPddFile(e.dataTransfer.files[0]);
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary-container)' }}>cloud_upload</span>
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <p style={{ fontWeight: '500' }}>Drag and drop or click to upload</p>
                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>PDF, Word, or other document format</p>
              </div>
              {revisedPddFile && (
                <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--primary-container)', fontWeight: '500' }}>
                  ✓ {revisedPddFile.name}
                </p>
              )}
            </div>
            <input
              id="revised-pdd-input"
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  setRevisedPddFile(e.target.files[0]);
                }
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Revision Notes</label>
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Brief summary of changes made to address BA feedback..."
              rows="3"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <button
            className="btn"
            onClick={handleSaveDraft}
            disabled={submitting}
            style={{ opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>save</span>
            Save Draft Response
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !allAnswered}
            style={{ opacity: (submitting || !allAnswered) ? 0.5 : 1, cursor: (submitting || !allAnswered) ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Processing...' : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>send</span>
                Submit Response
              </>
            )}
          </button>
          <Link to={`/project/${projectId}`}>
            <button className="btn">Cancel</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
