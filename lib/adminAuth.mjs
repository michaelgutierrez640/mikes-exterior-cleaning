import crypto from 'crypto'

export const ADMIN_COOKIE = 'mikes_admin'

export function getAdminPassword() {
  return process.env.ADMIN_DASHBOARD_PASSWORD?.trim() || ''
}

export function parseCookies(header = '') {
  const out = {}
  String(header)
    .split(';')
    .forEach((part) => {
      const [k, ...rest] = part.trim().split('=')
      if (!k) return
      out[k] = decodeURIComponent(rest.join('=') || '')
    })
  return out
}

function signBody(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url')
}

export function signAdminToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${signBody(body, secret)}`
}

export function verifyAdminToken(token, secret) {
  if (!token || !secret) return false
  const [body, sig] = String(token).split('.')
  if (!body || !sig) return false
  const expected = signBody(body, secret)
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(sig)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return payload?.v === 1
  } catch {
    return false
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function requireAdmin(req) {
  const secret = getAdminPassword()
  if (!secret) {
    return { ok: false, status: 503, error: 'Admin password not configured' }
  }
  const cookies = parseCookies(req.headers?.cookie || '')
  if (!verifyAdminToken(cookies[ADMIN_COOKIE], secret)) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

export function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json(payload)
}
