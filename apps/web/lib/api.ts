const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

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
  list: () => fetchApi<any[]>('/api/scan'),
  create: (data: any) =>
    fetchApi('/api/scan', {
      method: 'POST',
      body: JSON.stringify(data),
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