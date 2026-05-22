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
  const [processFlowApproval, setProcessFlowApproval] = useState('');
  const [processFlowComments, setProcessFlowComments] = useState('');
  const [mermaidRendered, setMermaidRendered] = useState(false);

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
  const diagramApprovalValid = processFlowApproval !== '';
  const canSubmit = allAnswered && diagramApprovalValid;

  const handleSaveDraft = async () => {
    try {
      setSubmitting(true);
      await submitJob(projectId, 'save-gap-responses', {
        projectId,
        btResponses: responses,
        processFlowApproval,
        processFlowComments,
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

    if (!diagramApprovalValid) {
      alert('Please approve or comment on the Process Flow Diagram');
      return;
    }

    try {
      setSubmitting(true);
      await submitJob(projectId, 'submit-gap-responses', {
        projectId,
        btResponses: responses,
        processFlowApproval,
        processFlowComments,
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

  // Render Mermaid diagram when process flow becomes available
  useEffect(() => {
    if (!project?.baProcessFlow) return;
    const container = document.getElementById('process-flow-diagram');
    if (!container || !window.mermaid) return;

    const diagramId = `mermaid-${Date.now()}`;
    window.mermaid.render(diagramId, project.baProcessFlow)
      .then(({ svg }) => {
        container.innerHTML = svg;
        setMermaidRendered(true);
      })
      .catch(err => {
        console.error('Mermaid render error:', err);
        container.innerHTML = `<pre style="font-size:12px;color:#666;white-space:pre-wrap">${project.baProcessFlow}</pre>`;
        setMermaidRendered(true);
      });
  }, [project?.baProcessFlow]);

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
          Respond to BA Agent questions and approve the Process Flow Diagram
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
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Process Flow Diagram Review</h3>

          {!project?.baProcessFlow ? (
            <div className="callout" style={{ marginBottom: 'var(--space-lg)' }}>
              <span className="material-symbols-outlined callout-icon">schedule</span>
              <div className="callout-content">
                <div className="callout-title">Waiting for diagram...</div>
                <div className="callout-text">
                  The BA Agent is generating the Process Flow Diagram based on your requirements. Please check back in a moment.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
                  Process Flow Diagram
                </p>
                <div id="process-flow-diagram" style={{ overflowX: 'auto', minHeight: '300px' }}>
                  {!mermaidRendered && <p style={{ color: 'var(--on-surface-variant)' }}>Rendering diagram...</p>}
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
                  Your Review *
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="processFlowApproval"
                      value="approve"
                      checked={processFlowApproval === 'approve'}
                      onChange={(e) => setProcessFlowApproval(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Approve</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="processFlowApproval"
                      value="approve-with-comments"
                      checked={processFlowApproval === 'approve-with-comments'}
                      onChange={(e) => setProcessFlowApproval(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Approve with Comments</span>
                  </label>
                </div>
              </div>

              {processFlowApproval === 'approve-with-comments' && (
                <div className="form-group">
                  <label className="form-label">Your Comments</label>
                  <textarea
                    value={processFlowComments}
                    onChange={(e) => setProcessFlowComments(e.target.value)}
                    placeholder="Provide any feedback on the Process Flow Diagram for the BA Agent to incorporate..."
                    rows="3"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <button
            className="btn"
            onClick={handleSaveDraft}
            disabled={submitting}
            style={{ opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>save</span>
            Save Draft
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            style={{ opacity: (submitting || !canSubmit) ? 0.5 : 1, cursor: (submitting || !canSubmit) ? 'not-allowed' : 'pointer' }}
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
