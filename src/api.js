const BASE = '/api';

async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getProjects() {
  return apiCall('/projects');
}

export async function getProject(id) {
  return apiCall(`/projects/${id}`);
}

export async function createProject(data) {
  return apiCall('/projects', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateProject(id, data) {
  return apiCall(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function submitJob(projectId, stage, context) {
  return apiCall('/jobs', {
    method: 'POST',
    body: JSON.stringify({ projectId, stage, context, priority: 3 })
  });
}

export async function claimJob(jobId) {
  return apiCall(`/jobs/${jobId}/claim`, {
    method: 'PUT'
  });
}

export async function completeJob(jobId, result) {
  return apiCall(`/jobs/${jobId}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ result })
  });
}

export async function failJob(jobId, reason) {
  return apiCall(`/jobs/${jobId}/fail`, {
    method: 'PUT',
    body: JSON.stringify({ reason })
  });
}

export async function getQueueJobs(stage) {
  return apiCall(`/jobs/queue/${stage}`);
}

export async function getJob(jobId) {
  return apiCall(`/jobs/${jobId}`);
}

export async function getProjectMetrics(id) {
  return apiCall(`/projects/${id}/metrics`);
}

export async function getAnalyticsRollup() {
  return apiCall('/analytics/rollup');
}
