import {
  getRecentEvents,
  getStorageStats,
  isStorageReady,
  maskEventForDebug,
} from '../../lib/analyticsStore.mjs'

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.status(status).json(payload)
}

function getPassword() {
  return process.env.ADMIN_DASHBOARD_PASSWORD?.trim() || ''
}

function isAuthorized(req) {
  const secret = getPassword()
  if (!secret) return false

  const queryPassword = typeof req.query?.password === 'string' ? req.query.password : ''
  const headerPassword = typeof req.headers['x-admin-password'] === 'string' ? req.headers['x-admin-password'] : ''
  return queryPassword === secret || headerPassword === secret
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, { error: 'Method not allowed' })
  }

  if (!isAuthorized(req)) {
    res.setHeader('Cache-Control', 'no-store')
    return json(res, 401, { error: 'Unauthorized' })
  }

  if (!isStorageReady()) {
    res.setHeader('Cache-Control', 'no-store')
    return json(res, 503, {
      error: 'Analytics storage not configured',
      requiredEnv: [
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
        '(or KV_REST_API_URL + KV_REST_API_TOKEN from Vercel KV / Upstash integration)',
      ],
    })
  }

  const [stats, recent] = await Promise.all([getStorageStats(), getRecentEvents(25)])

  res.setHeader('Cache-Control', 'no-store')
  return json(res, 200, {
    ok: true,
    storage: 'upstash-redis',
    ...stats,
    recentEvents: recent.map(maskEventForDebug),
  })
}
