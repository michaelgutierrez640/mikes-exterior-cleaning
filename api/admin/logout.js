function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.status(status).json(payload)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  res.setHeader(
    'Set-Cookie',
    ['mikes_admin=', 'Max-Age=0', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Secure'].join('; '),
  )
  res.setHeader('Cache-Control', 'no-store')
  return json(res, 200, { ok: true })
}

