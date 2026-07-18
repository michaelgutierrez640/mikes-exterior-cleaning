import { ADMIN_COOKIE, getAdminPassword, json, signAdminToken } from '../../lib/adminAuth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const configured = getAdminPassword()
  if (!configured) {
    return json(res, 503, { error: 'Admin password not configured' })
  }

  const provided = String(req.body?.password || '')
  if (!provided || provided !== configured) {
    return json(res, 401, { error: 'Invalid password' })
  }

  const token = signAdminToken({ v: 1, iat: Date.now() }, configured)
  const maxAge = 60 * 60 * 24 * 7 // 7 days
  const secure =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'
  const cookie = [
    `${ADMIN_COOKIE}=${token}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ')

  res.setHeader('Set-Cookie', cookie)
  return json(res, 200, { ok: true })
}
