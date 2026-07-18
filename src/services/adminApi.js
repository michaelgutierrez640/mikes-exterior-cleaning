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
  const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
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
  const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
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
