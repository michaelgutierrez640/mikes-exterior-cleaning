import crypto from 'crypto'

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.status(status).json(payload)
}

function getPassword() {
  return process.env.ADMIN_DASHBOARD_PASSWORD?.trim() || ''
}

function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const configured = getPassword()
  if (!configured) {
    res.setHeader('Cache-Control', 'no-store')
    return json(res, 503, { error: 'Admin password not configured' })
  }

  const provided = String(req.body?.password || '')
  if (!provided || provided !== configured) {
    res.setHeader('Cache-Control', 'no-store')
    return json(res, 401, { error: 'Invalid password' })
  }

  const token = sign(
    {
      v: 1,
      iat: Date.now(),
    },
    configured,
  )

  const maxAge = 60 * 60 * 24 * 7 // 7 days
  const cookie = [
    `mikes_admin=${token}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
  ].join('; ')

  res.setHeader('Set-Cookie', cookie)
  res.setHeader('Cache-Control', 'no-store')
  return json(res, 200, { ok: true })
}

