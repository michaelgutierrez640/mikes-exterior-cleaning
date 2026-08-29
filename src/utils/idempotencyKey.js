/**
 * Client-side idempotency keys for lead creates (retry-safe CRM ingest).
 * Server stores keys under Redis with a 7-day TTL (see lib/leadsStore.mjs).
 */
export function createIdempotencyKey(prefix = 'lead') {
  const safePrefix = String(prefix || 'lead').replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'lead'
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${safePrefix}_${crypto.randomUUID()}`
    }
  } catch {
    // fall through
  }
  return `${safePrefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
