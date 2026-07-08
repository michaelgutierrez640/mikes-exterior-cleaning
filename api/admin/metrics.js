import crypto from 'crypto'
import { computeDashboardMetrics } from '../../lib/analyticsStore.mjs'

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.status(status).json(payload)
}

function getPassword() {
  return process.env.ADMIN_DASHBOARD_PASSWORD?.trim() || ''
}

function parseCookies(header = '') {
  const out = {}
  header.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=')
    if (!k) return
    out[k] = decodeURIComponent(rest.join('=') || '')
  })
  return out
}

function verify(token, secret) {
  if (!token || !secret) return false
  const [body, sig] = token.split('.')
  if (!body || !sig) return false
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (expected !== sig) return false
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return payload?.v === 1
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const secret = getPassword()
  if (!secret) {
    res.setHeader('Cache-Control', 'no-store')
    return json(res, 503, { error: 'Admin password not configured' })
  }

  const cookies = parseCookies(req.headers.cookie || '')
  const ok = verify(cookies.mikes_admin, secret)
  if (!ok) {
    res.setHeader('Cache-Control', 'no-store')
    return json(res, 401, { error: 'Unauthorized' })
  }

  res.setHeader('Cache-Control', 'no-store')
  return json(res, 200, computeDashboardMetrics())
}

