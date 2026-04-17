// Dynamic API base - uses relative path in production (same domain)
// Fallbacks for local dev; Replit will auto-detect from window.location
function getApiBase(): string {
  if (typeof window === 'undefined') return ''
  
  const env = process.env.NEXT_PUBLIC_API_URL
  
  // If explicitly set, use it
  if (env) return env
  
  // Otherwise use relative path (works when frontend/backend on same origin)
  const isHttps = window.location.protocol === 'https:'
  const protocol = isHttps ? 'https:' : 'http:'
  const host = window.location.host
  
  // In local dev, API is on different port
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `${protocol}//localhost:3001`
  }
  
  // For production/Replit, use relative path (same origin)
  return ''
}

const API_BASE = getApiBase()

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('zyra_token') : null
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  const json: ApiResponse<T> = await response.json()

  if (!json.success) {
    throw new Error(json.error || 'API request failed')
  }

  return json.data as T
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    fetchApi<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name?: string) =>
    fetchApi<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  me: () => fetchApi<{ user: any; profile: any }>('/api/auth/me'),

  logout: () => fetchApi('/api/auth/logout', { method: 'POST' }),
}

// Users
export const users = {
  list: () => fetchApi<any[]>('/api/users'),
  get: (id: string) => fetchApi<any>(`/api/users/${id}`),
}

// Organizations
export const orgs = {
  list: () => fetchApi<any[]>('/api/orgs'),
  get: (id: string) => fetchApi<any>(`/api/orgs/${id}`),
  create: (name: string, slug?: string) =>
    fetchApi('/api/orgs', { method: 'POST', body: JSON.stringify({ name, slug }) }),
  addMember: (orgId: string, userId: string, role?: string) =>
    fetchApi(`/api/orgs/${orgId}/members`, { method: 'POST', body: JSON.stringify({ userId, role }) }),
  removeMember: (orgId: string, userId: string) =>
    fetchApi(`/api/orgs/${orgId}/members/${userId}`, { method: 'DELETE' }),
}

// Activities
export const activities = {
  list: (orgId?: string) => fetchApi<any[]>(`/api/activities${orgId ? `?orgId=${orgId}` : ''}`),
  log: (action: string, entityType: string, entityId?: string, description?: string) =>
    fetchApi('/api/activities', {
      method: 'POST',
      body: JSON.stringify({ action, entityType, entityId, description }),
    }),
}

// Profiles
export const profiles = {
  update: (data: any) =>
    fetchApi('/api/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// Assets
export const assets = {
  list: () => fetchApi<any[]>('/api/assets'),
  create: (data: any) =>
    fetchApi('/api/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Scans
export const scans = {
  list: (orgId?: string) => fetchApi<any[]>(`/api/scan${orgId ? `?orgId=${orgId}` : ''}`),
  create: (type: string, assetId?: string) =>
    fetchApi('/api/scan', { method: 'POST', body: JSON.stringify({ type, assetId }) }),
  run: (id: string) => fetchApi(`/api/scan/${id}/run`, { method: 'POST' }),
  get: (id: string) => fetchApi<any>(`/api/scan/${id}`),
}

// Pricing
export const pricing = {
  plans: () => fetchApi<any[]>('/api/pricing/plans'),
  myPlan: () => fetchApi<any>('/api/pricing/my-plan'),
  checkout: (planId: string) =>
    fetchApi<{ sessionId: string; url: string }>('/api/pricing/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
}

// Threats
export const threats = {
  list: () => fetchApi<any[]>('/api/threats'),
}

// Incidents
export const incidents = {
  list: () => fetchApi<any[]>('/api/incidents'),
}

// Payments
export const payments = {
  list: () => fetchApi<any[]>('/api/payments'),
  createCheckout: (priceId: string) =>
    fetchApi<{ url: string }>('/api/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    }),
}

// API Keys
export const apiKeys = {
  list: () => fetchApi<any[]>('/api/keys'),
  create: (name?: string, expiresInDays?: number) =>
    fetchApi<{ key: string; prefix: string }>('/api/keys', {
      method: 'POST',
      body: JSON.stringify({ name, expiresInDays }),
    }),
  revoke: (id: string) => fetchApi(`/api/keys/${id}`, { method: 'DELETE' }),
}

// Password Reset
export const password = {
  requestReset: (email: string) =>
    fetchApi('/api/password/reset-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  confirmReset: (token: string, newPassword: string) =>
    fetchApi('/api/password/reset-confirm', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
  change: (currentPassword: string, newPassword: string) =>
    fetchApi('/api/password/change', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}

// Notifications
export const notifications = {
  list: () => fetchApi<any[]>('/api/notifications'),
  unread: () => fetchApi<{ count: number }>('/api/notifications/unread'),
  markRead: (id: string) => fetchApi(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => fetchApi('/api/notifications/read-all', { method: 'PATCH' }),
  delete: (id: string) => fetchApi(`/api/notifications/${id}`, { method: 'DELETE' }),
}

// Jobs / Task Queue
export const jobs = {
  list: () => fetchApi<any[]>('/api/jobs'),
  get: (id: string) => fetchApi<any>(`/api/jobs/${id}`),
  create: (type: string, payload?: any) =>
    fetchApi('/api/jobs', { method: 'POST', body: JSON.stringify({ type, payload }) }),
  run: (id: string) => fetchApi(`/api/jobs/${id}/run`, { method: 'POST' }),
}

// Save token helper
export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('zyra_token', token)
  }
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('zyra_token')
  }
}

// AI Copilot chat
export const copilot = {
  chat: (question: string) =>
    fetchApi<{ answer: string; action?: string; data?: any }>('/api/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
}

// Learning & insights
export const learning = {
  logQuestion: (question: string, answered = true, action?: string) =>
    fetchApi('/api/learning/log-question', {
      method: 'POST',
      body: JSON.stringify({ question, answered, action }),
    }),
  getPopular: () =>
    fetchApi<{ popular: { question: string; count: number }[] }>('/api/learning/popular'),
  getInsights: () =>
    fetchApi<{ insights: any }>('/api/learning/insights'),
  getAutoGuide: () =>
    fetchApi<{ guide: any }>('/api/learning/auto-guide'),
}

// Shadow AI Scanner
export const shadowAI = {
  scan: (assets?: string[]) =>
    fetchApi<{ findings: any[]; summary: any }>('/api/shadow-ai/scan', {
      method: 'POST',
      body: JSON.stringify({ assets }),
    }),
  getFindings: () =>
    fetchApi<{ findings: any[] }>('/api/shadow-ai/findings'),
  remediate: (findingId: string, action: 'block' | 'monitor' | 'whitelist') =>
    fetchApi<{ message: string }>('/api/shadow-ai/remediate', {
      method: 'POST',
      body: JSON.stringify({ findingId, action }),
    }),
}