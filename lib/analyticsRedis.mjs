import { Redis } from '@upstash/redis'

/** @type {Redis | null} */
let client = null

export function isAnalyticsStorageConfigured() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return Boolean(url && token)
}

export function getAnalyticsRedis() {
  if (client) return client
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  client = new Redis({ url, token })
  return client
}

export const EVENTS_KEY = 'analytics:events'
export const VISITORS_ALL_KEY = 'analytics:visitors:all'
export const MAX_EVENTS = 5000

export function visitorsDayKey(ts = Date.now()) {
  return `analytics:visitors:day:${new Date(ts).toISOString().slice(0, 10)}`
}
