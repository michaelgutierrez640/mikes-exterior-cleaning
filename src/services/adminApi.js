/**
 * Admin API helpers for /admin/dashboard.
 * Uses HttpOnly cookie-based auth from /api/admin/login.
 */

async function parseJson(res) {
  return res.json().catch(() => ({}))
}

export async function adminLogin(password) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const data = await parseJson(res)
    throw new Error(data.error || 'Login failed')
  }
  return true
}

export async function adminLogout() {
  await fetch('/api/admin/logout', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })
}

export async function fetchAdminSession() {
  const res = await fetch('/api/admin/session', {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return { unauthorized: true }
  if (!res.ok) {
    const data = await parseJson(res)
    throw new Error(data.error || 'Failed to verify admin session')
  }
  return res.json()
}

export async function fetchDashboardMetrics() {
  const res = await fetch('/api/admin/metrics', {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return { unauthorized: true }
  if (!res.ok) {
    const data = await parseJson(res)
    throw new Error(data.error || 'Failed to load dashboard metrics')
  }
  return res.json()
}

export async function fetchAdminProjects(status = 'all') {
  const res = await fetch(`/api/admin/projects?status=${encodeURIComponent(status)}`, {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return { unauthorized: true }
  if (!res.ok) {
    const data = await parseJson(res)
    throw new Error(data.error || 'Failed to load jobs')
  }
  return res.json()
}

export async function fetchAdminProject(id) {
  const projectId = encodeURIComponent(String(id || '').trim())
  // Prefer query-param lookup on the stable /api/admin/projects route (avoids dynamic [id] rewrite issues)
  const res = await fetch(`/api/admin/projects?id=${projectId}`, {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return { unauthorized: true }
  const data = await parseJson(res)
  if (!res.ok) {
    const err = new Error(data.error || 'Failed to load job')
    err.status = res.status
    err.requestedId = data.requestedId
    err.redisKey = data.redisKey
    throw err
  }
  return data
}

export async function createAdminProject(payload) {
  const res = await fetch('/api/admin/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.unauthorized = true
    throw err
  }
  if (!res.ok) throw new Error(data.error || 'Failed to save job')
  return data.project
}

export async function updateAdminProject(id, payload) {
  const res = await fetch(`/api/admin/projects?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.unauthorized = true
    throw err
  }
  if (!res.ok) throw new Error(data.error || 'Failed to update job')
  return data.project
}

export async function deleteAdminProject(id) {
  const res = await fetch(`/api/admin/projects?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
  const data = await parseJson(res)
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.unauthorized = true
    throw err
  }
  if (!res.ok) throw new Error(data.error || 'Failed to delete job')
  return data
}

function buildLeadsQuery(filters = {}) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status) params.set('status', filters.status)
  if (filters.source) params.set('source', filters.source)
  if (filters.service) params.set('service', filters.service)
  if (filters.city) params.set('city', filters.city)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchAdminLeads(filters = {}) {
  const res = await fetch(`/api/leads${buildLeadsQuery(filters)}`, {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return { unauthorized: true }
  if (!res.ok) {
    const data = await parseJson(res)
    throw new Error(data.error || 'Failed to load leads')
  }
  return res.json()
}

export async function fetchAdminLead(id) {
  const leadId = encodeURIComponent(String(id || '').trim())
  const res = await fetch(`/api/leads?id=${leadId}`, {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return { unauthorized: true }
  const data = await parseJson(res)
  if (!res.ok) {
    const err = new Error(data.error || 'Failed to load lead')
    err.status = res.status
    throw err
  }
  return data
}

export async function updateAdminLead(id, payload) {
  const res = await fetch(`/api/leads?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.unauthorized = true
    throw err
  }
  if (!res.ok) throw new Error(data.error || 'Failed to update lead')
  return data.lead
}
