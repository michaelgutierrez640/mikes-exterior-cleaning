import { ADMIN_COOKIE, json } from '../../lib/adminAuth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const secure =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'
  res.setHeader(
    'Set-Cookie',
    [`${ADMIN_COOKIE}=`, 'Max-Age=0', 'Path=/', 'HttpOnly', 'SameSite=Lax', secure ? 'Secure' : null]
      .filter(Boolean)
      .join('; '),
  )
  return json(res, 200, { ok: true })
}
