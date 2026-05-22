import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createProject, submitJob, getProject } from '../api';
import mammoth from 'mammoth';
import RichTextEditor from '../components/RichTextEditor';

function categoryToClass(category) {
  return category.toLowerCase().replace(/\s+/g, '-');
}

export default function PDDWorkflow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [projectInfo, setProjectInfo] = useState({ name: '', description: '', scope: '', objectives: '', criteria: '' });
  const [pddFile, setPddFile] = useState(null);
  const [pddVersions, setPddVersions] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [responses, setResponses] = useState({});
  const [revisedPddFile, setRevisedPddFile] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [projectId, setProjectId] = useState(null);

  // Poll project for BA gaps when on step 2
  useEffect(() => {
    if (step !== 2 || !projectId) return;

    const pollInterval = setInterval(async () => {
      try {
        const project = await getProject(projectId);
        if (project.baGaps && project.baGaps.length > 0) {
          setGaps(project.baGaps);
          setIsAnalyzing(false);
        }
      } catch (err) {
        console.error('Error polling project:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [step, projectId]);

  const handleStepOneSubmit = async () => {
    if (!projectInfo.name || !projectInfo.description || !projectInfo.scope || !projectInfo.objectives || !projectInfo.criteria || !pddFile) {
      alert('Please fill all required fields and upload PDD document');
      return;
    }

    try {
      const newProject = await createProject({
        name: projectInfo.name,
        description: projectInfo.description,
        scope: projectInfo.scope,
        objectives: projectInfo.objectives,
        criteria: projectInfo.criteria,
        btLead: 'BT Requestor',
        startDate: new Date().toISOString().split('T')[0],
        targetDate: ''
      });

      setProjectId(newProject._id);

      // Read entire file as base64 to preserve images, screenshots, formatting
      const fileContent = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(pddFile);
      });

      await submitJob(newProject._id, 'pdd_review', {
        projectName: newProject.name,
        description: newProject.description,
        scope: newProject.scope,
        objectives: newProject.objectives,
        criteria: newProject.criteria,
        pddVersion: 1,
        pddFileName: pddFile.name,
        pddFileContent: fileContent
      });

      const version1 = {
        version: 1,
        date: new Date().toLocaleDateString(),
        fileName: pddFile.name,
        fileSize: pddFile.size,
        notes: 'Initial submission',
        status: 'under-review'
      };

      setPddVersions([version1]);
      setRevisedPddFile(pddFile);
      setStep(2);
      setIsAnalyzing(true);
      setGaps([]);
    } catch (err) {
      alert('Error creating project: ' + err.message);
    }
  };

  const handleStepTwoNext = () => {
    setStep(3);
  };

  const handleGapResponse = (gapId, field, value) => {
    setResponses(prev => ({
      ...prev,
      [gapId]: { ...prev[gapId], [field]: value }
    }));
  };

  const allGapsAnswered = gaps.every(g => responses[g.id]?.answer?.trim());

  const handleStepThreeSubmit = () => {
    if (!allGapsAnswered || !revisedPddFile) {
      alert('Please answer all gaps and upload revised PDD document');
      return;
    }

    const version2 = {
      version: 2,
      date: new Date().toLocaleDateString(),
      fileName: revisedPddFile.name,
      fileSize: revisedPddFile.size,
      notes: revisionNotes || 'Updated based on BA feedback',
      status: 'approved'
    };

    setPddVersions([...pddVersions, version2]);

    const updatedGaps = gaps.map(g => ({
      ...g,
      status: 'answered',
      baFeedback: 'Approved — sufficient detail provided'
    }));

    setGaps(updatedGaps);
    setStep(4);
  };

  const handleReset = () => {
    setStep(1);
    setProjectInfo({ name: '', description: '', scope: '', objectives: '', criteria: '' });
    setPddFile(null);
    setPddVersions([]);
    setGaps([]);
    setResponses({});
    setRevisedPddFile(null);
    setRevisionNotes('');
    setProjectId(null);
  };

  const handleProceedToArch = async () => {
    if (projectId) {
      try {
        await submitJob(projectId, 'sdd', { projectId });
      } catch (err) {
        console.error('Error submitting SDD job:', err);
      }
    }
    navigate('/arch-agent');
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-container)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          Back to Projects
        </Link>
      </div>

      <div className="border-b pb-md mb-lg">
        <h1>Product Definition Document (PDD) Workflow</h1>
        <p className="body-lg mt-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '600px' }}>
          Submit your product definition, respond to BA Agent questions, and get your PDD approved for Architecture phase.
        </p>
      </div>

      <div className="stepper" style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-xl)',
        width: '100%'
      }}>
        {[
          { step: 1, label: 'PROJECT INFO' },
          { step: 2, label: 'BA REVIEW' },
          { step: 3, label: 'GAP RESPONSE' },
          { step: 4, label: 'APPROVAL' }
        ].map((s, idx) => (
          <React.Fragment key={s.step}>
            <div className="step" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              flex: '0 0 auto',
              width: '100px'
            }}>
              <div className="step-node" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className={`step-circle ${step >= s.step ? 'completed' : ''} ${step === s.step ? 'active' : ''}`}>
                  {step > s.step ? '✓' : s.step}
                </div>
                <span className={`step-label ${step === s.step ? 'active' : ''}`} style={{
                  marginTop: '12px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}>
                  {s.label}
                </span>
              </div>
            </div>

            {idx < 3 && (
              <div className={`step-connector ${step > s.step ? 'completed' : ''}`} style={{
                flex: '1',
                height: '2px',
                backgroundColor: step > s.step ? 'var(--primary)' : 'var(--outline-variant)',
                marginTop: '20px',
                marginLeft: '-10px',
                marginRight: '-10px'
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="surface">
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>01 / Project Information</h2>

          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              type="text"
              value={projectInfo.name}
              onChange={(e) => setProjectInfo({ ...projectInfo, name: e.target.value })}
              placeholder="e.g., Invoice Processing Automation"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <RichTextEditor
              value={projectInfo.description}
              onChange={(value) => setProjectInfo({ ...projectInfo, description: value })}
              placeholder="Brief description of the project..."
            />
          </div>

          <h2 style={{ marginBottom: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>02 / Business Requirements</h2>

          <div className="form-group">
            <label className="form-label">Scope *</label>
            <RichTextEditor
              value={projectInfo.scope}
              onChange={(value) => setProjectInfo({ ...projectInfo, scope: value })}
              placeholder="Define the scope of this project..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Business Objectives *</label>
            <RichTextEditor
              value={projectInfo.objectives}
              onChange={(value) => setProjectInfo({ ...projectInfo, objectives: value })}
              placeholder="What are the primary business objectives?"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Success Criteria *</label>
            <RichTextEditor
              value={projectInfo.criteria}
              onChange={(value) => setProjectInfo({ ...projectInfo, criteria: value })}
              placeholder="How will we measure success?"
            />
          </div>

          <h2 style={{ marginBottom: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>03 / Process Definition Document</h2>

          <div className="form-group">
            <label className="form-label">Upload PDD Document *</label>
            <div className="form-hint">Upload your complete PDD document (PDF, Word, Excel, or other formats). BA Agent will analyze this for logical gaps and ambiguities.</div>
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
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary-container)', marginBottom: '12px' }}>
                cloud_upload
              </span>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {pddFile ? pddFile.name : 'Click or drag your PDD document here'}
              </div>
              <div className="form-hint" style={{ color: 'var(--on-surface-variant)' }}>
                {pddFile ? `${(pddFile.size / 1024).toFixed(2)} KB` : 'PDF, Word, Excel, or other document formats'}
              </div>
            </div>
            <input
              id="pdd-file-input"
              type="file"
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  setPddFile(e.target.files[0]);
                }
              }}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
            <button className="btn btn-primary" onClick={handleStepOneSubmit}>
              Submit for BA Review
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="surface">
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>02 / BA Agent Review</h2>

          {isAnalyzing ? (
            <div className="callout">
              <span className="material-symbols-outlined callout-icon">hourglass_empty</span>
              <div className="callout-content">
                <div className="callout-title">BA Agent is analyzing your PDD...</div>
                <div className="callout-text">Please wait while we identify potential gaps and ambiguities.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="callout">
                <span className="material-symbols-outlined callout-icon">info</span>
                <div className="callout-content">
                  <div className="callout-title">BA Agent Review Complete</div>
                  <div className="callout-text">
                    BA Agent has reviewed your PDD and identified <strong>{gaps.length} gaps</strong> that require clarification.
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-lg)' }}>
                {gaps.map((gap, idx) => (
                  <div key={gap.id} className="gap-card">
                    <div className="gap-header">
                      <div className="gap-number">Q{idx + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div className="gap-badges">
                          <span className={`gap-badge ${categoryToClass(gap.category)}`}>
                            {gap.category}
                          </span>
                          <span className={`gap-complexity ${gap.complexity}`}>
                            {gap.complexity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="gap-question">{gap.question}</div>
                    <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Status: <strong>Pending Response</strong></div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                <button className="btn btn-primary" onClick={handleStepTwoNext}>
                  Proceed to Gap Response
                </button>
                <button className="btn" onClick={() => setStep(1)}>
                  Back to Edit
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="surface">
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>03 / Respond to BA Gaps</h2>

          <div className="callout">
            <span className="material-symbols-outlined callout-icon">edit_note</span>
            <div className="callout-content">
              <div className="callout-title">Answer All Questions</div>
              <div className="callout-text">
                Progress: <strong>{Object.keys(responses).filter(k => responses[k]?.answer?.trim()).length} of {gaps.length}</strong> gaps answered
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            {gaps.map((gap, idx) => (
              <div key={gap.id} className={`gap-card ${responses[gap.id]?.answer ? 'answered' : ''}`}>
                <div className="gap-header">
                  <div className="gap-number">Q{idx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div className="gap-badges">
                      <span className={`gap-badge ${categoryToClass(gap.category)}`}>
                        {gap.category}
                      </span>
                      <span className={`gap-complexity ${gap.complexity}`}>
                        {gap.complexity}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="gap-question">{gap.question}</div>

                <div className="gap-response-area">
                  <label className="form-label">Your Response *</label>
                  <RichTextEditor
                    value={responses[gap.id]?.answer || ''}
                    onChange={(value) => handleGapResponse(gap.id, 'answer', value)}
                    placeholder="Provide your response..."
                  />

                  <label className="form-label">Confidence Level</label>
                  <select
                    value={responses[gap.id]?.confidence || ''}
                    onChange={(e) => handleGapResponse(gap.id, 'confidence', e.target.value)}
                    style={{ width: '100%', padding: 'var(--space-sm)', border: '1px solid var(--outline-variant)' }}
                  >
                    <option value="">Select confidence level...</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>Updated PDD</h3>

          <div className="form-group">
            <label className="form-label">Upload Revised PDD Document *</label>
            <div className="form-hint">Upload the updated PDD document based on your responses above.</div>
            <div
              className="file-upload-zone"
              onClick={() => document.getElementById('revised-pdd-file-input').click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');
                if (e.dataTransfer.files.length > 0) {
                  setRevisedPddFile(e.dataTransfer.files[0]);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary-container)', marginBottom: '12px' }}>
                cloud_upload
              </span>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {revisedPddFile ? revisedPddFile.name : 'Click or drag your revised PDD document here'}
              </div>
              <div className="form-hint" style={{ color: 'var(--on-surface-variant)' }}>
                {revisedPddFile ? `${(revisedPddFile.size / 1024).toFixed(2)} KB` : 'PDF, Word, Excel, or other document formats'}
              </div>
            </div>
            <input
              id="revised-pdd-file-input"
              type="file"
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  setRevisedPddFile(e.target.files[0]);
                }
              }}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Revision Notes (Optional)</label>
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Describe what changed in this revision..."
              rows="3"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
            <button className="btn btn-primary" onClick={handleStepThreeSubmit} disabled={!allGapsAnswered || !revisedPddFile}>
              Submit Updated PDD
            </button>
            <button className="btn" onClick={() => setStep(2)}>
              Back to Review
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="surface">
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>04 / Final Approval</h2>

          <div className="callout">
            <span className="material-symbols-outlined callout-icon">task_alt</span>
            <div className="callout-content">
              <div className="callout-title">PDD Approved!</div>
              <div className="callout-text">
                BA Agent has reviewed your responses. PDD v{pddVersions.length} approved — ready to proceed to Architecture.
              </div>
            </div>
          </div>

          <h3 style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>Version History</h3>

          <div className="version-timeline">
            {pddVersions.map((version, idx) => (
              <div key={version.version} className={`version-card ${idx === pddVersions.length - 1 ? 'current' : ''}`}>
                <div className="version-card-header">
                  <div>
                    <div className="label-bold">Version {version.version}</div>
                    <div className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                      {version.date}
                    </div>
                  </div>
                  <div>
                    <span className="badge" style={{ backgroundColor: version.status === 'approved' ? '#10b981' : '#ffa500', color: 'white', padding: '4px 12px', borderRadius: '2px', fontSize: '11px', fontWeight: '600' }}>
                      {version.status === 'approved' ? '✓ Approved' : 'Under Review'}
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 'var(--space-sm)', display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-container)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
                  </div>
                  <div>
                    <div className="body-sm" style={{ fontWeight: '600', color: 'var(--on-surface)' }}>{version.fileName}</div>
                    <div className="body-sm" style={{ color: 'var(--on-surface-variant)', fontSize: '11px', marginTop: '2px' }}>
                      {(version.fileSize / 1024).toFixed(2)} KB
                    </div>
                    <div className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: 'var(--space-sm)' }}>
                      {version.notes}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
            <button className="btn btn-primary" onClick={handleProceedToArch}>
              Proceed to Architecture Phase
            </button>
            <button className="btn" onClick={handleReset}>
              Start New Project
            </button>
          </div>
        </div>
      )}

      <footer style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--outline-variant)' }}>
        PDD Workflow · AASDI Platform
      </footer>
    </div>
  );
}
