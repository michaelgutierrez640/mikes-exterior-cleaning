/**
 * Admin API helpers for /admin/dashboard.
 * Uses HttpOnly cookie-based auth from /api/admin/login.
 */

export async function adminLogin(password) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
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

export async function fetchDashboardMetrics() {
  const res = await fetch('/api/admin/metrics', {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return { unauthorized: true }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to load dashboard metrics')
  }
  return res.json()
}

