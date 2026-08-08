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

export async function fetchReportAdminStatus() {
  const res = await fetch('/api/admin/metrics?view=reports', {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return { unauthorized: true }
  if (!res.ok) {
    const data = await parseJson(res)
    throw new Error(data.error || 'Failed to load report settings')
  }
  return res.json()
}

export async function fetchReportPreview(periodKey) {
  const res = await fetch(`/api/admin/metrics?view=report-preview&periodKey=${encodeURIComponent(periodKey)}`, {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return { unauthorized: true }
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data.error || 'Failed to load report preview')
  return data
}

export async function postReportAction(payload) {
  const res = await fetch('/api/admin/metrics', {
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
  if (!res.ok) {
    const err = new Error(data.error || 'Report action failed')
    err.diagnostics = data.diagnostics || null
    throw err
  }
  return data
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
  return {
    project: data.project,
    facebook: data.facebook || null,
    seo: data.seo || null,
    seoWarning: data.seoWarning || null,
  }
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
  return {
    project: data.project,
    facebook: data.facebook || null,
    seo: data.seo || null,
    seoWarning: data.seoWarning || null,
    blob: data.blob || null,
  }
}

export async function fetchAdminFacebookStatus() {
  const res = await fetch('/api/admin/projects?resource=facebook', {
    headers: { Accept: 'application/json' },
  })
  const data = await parseJson(res)
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.unauthorized = true
    throw err
  }
  if (!res.ok) throw new Error(data.error || 'Failed to check Facebook connection')
  return data
}

export async function retryAdminFacebookPost(id) {
  const res = await fetch(`/api/admin/projects?resource=facebook&id=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ action: 'retry' }),
  })
  const data = await parseJson(res)
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.unauthorized = true
    throw err
  }
  if (!res.ok) throw new Error(data.error || 'Facebook retry failed')
  return data
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

export async function fetchAdminSeoDeployStatus() {
  const res = await fetch('/api/admin/projects?resource=seo-deploy', {
    headers: { Accept: 'application/json' },
  })
  const data = await parseJson(res)
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.unauthorized = true
    throw err
  }
  if (!res.ok) throw new Error(data.error || 'Failed to load SEO update status')
  return data.seo || null
}

export async function fetchAdminOurWorkGallery() {
  const res = await fetch('/api/admin/projects?resource=our-work-gallery', {
    headers: { Accept: 'application/json' },
  })
  const data = await parseJson(res)
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.unauthorized = true
    throw err
  }
  if (!res.ok) throw new Error(data.error || 'Failed to load Our Work gallery')
  return data
}

export async function removeAdminOurWorkStaticPhoto(src) {
  const res = await fetch('/api/admin/projects?resource=our-work-gallery', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ src }),
  })
  const data = await parseJson(res)
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.unauthorized = true
    throw err
  }
  if (!res.ok) throw new Error(data.error || 'Failed to remove gallery photo')
  return data
}

function buildLeadsQuery(filters = {}) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status) params.set('status', filters.status)
  if (filters.source) params.set('source', filters.source)
  if (filters.service) params.set('service', filters.service)
  if (filters.city) params.set('city', filters.city)
  if (filters.followUp) params.set('followUp', filters.followUp)
  if (filters.inboxView) params.set('inboxView', filters.inboxView)
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

function buildReviewsQuery(filters = {}) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status) params.set('status', filters.status)
  if (filters.published !== undefined && filters.published !== '') {
    params.set('published', String(filters.published))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchAdminWebsiteReviews(filters = {}) {
  const res = await fetch(`/api/reviews${buildReviewsQuery(filters)}`, {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 401) return { unauthorized: true }
  if (!res.ok) {
    const data = await parseJson(res)
    throw new Error(data.error || 'Failed to load customer reviews')
  }
  return res.json()
}

export async function updateAdminWebsiteReview(id, payload) {
  const res = await fetch(`/api/reviews?id=${encodeURIComponent(id)}`, {
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
  if (!res.ok) throw new Error(data.error || 'Failed to update review')
  return data.review
}

export async function deleteAdminWebsiteReview(id) {
  const res = await fetch(`/api/reviews?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
  const data = await parseJson(res)
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.unauthorized = true
    throw err
  }
  if (!res.ok) throw new Error(data.error || 'Failed to delete review')
  return data
}
