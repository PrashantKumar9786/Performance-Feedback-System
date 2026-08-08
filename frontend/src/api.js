const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const authApi = {
  login: (email, password) =>
    api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => api('/auth/me'),
};

export const feedbackApi = {
  team: () => api('/feedback/team'),
  parameters: () => api('/feedback/parameters'),
  myHistory: () => api('/feedback/my-history'),
  getSubmission: (employeeId) => api(`/feedback/submission/${employeeId}`),
  submit: (payload) =>
    api('/feedback/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const hrApi = {
  completion: (cycleId) =>
    api(`/hr/completion${cycleId ? `?cycleId=${cycleId}` : ''}`),
  cycles: () => api('/hr/cycles'),
  directory: () => api('/hr/directory'),
};
