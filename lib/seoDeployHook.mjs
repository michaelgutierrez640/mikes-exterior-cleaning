/**
 * Production SEO rebuild trigger via Vercel Deploy Hook.
 * Server-side only — never read VERCEL_DEPLOY_HOOK_URL in client code.
 *
 * Sitemap + prerender HTML are generated at build time. Publishing / unpublishing /
 * deleting a Completed Job that changes public SEO output should trigger one
 * Production deploy so Google sees updated sitemap.xml and page shells.
 */
import { getAnalyticsRedis, isAnalyticsStorageConfigured } from './analyticsRedis.mjs'

export const SEO_DEPLOY_STATUS_KEY = 'seo:deploy:status'
export const SEO_DEPLOY_LOCK_KEY = 'seo:deploy:lock'
/** Collapse rapid admin double-taps / retries into a single Production deploy. */
export const SEO_DEPLOY_DEBOUNCE_SECONDS = 90

export const SEO_WARNING_TRIGGER_FAILED =
  'Job saved, but the SEO update could not be triggered.'

/** Same-isolate fallback when Redis lock is unavailable (tests / brief Redis blips). */
let memoryLockUntilMs = 0
let memoryLastStatus = null

function nowIso() {
  return new Date().toISOString()
}

function hookConfigured() {
  return Boolean(String(process.env.VERCEL_DEPLOY_HOOK_URL || '').trim())
}

function emptyStatus() {
  return {
    state: 'idle',
    configured: hookConfigured(),
    lastSuccessAt: null,
    lastAttemptAt: null,
    lastError: null,
    lastReason: null,
  }
}

/** Public fields that affect sitemap entries and prerendered project SEO. */
export function publicSeoFingerprint(project) {
  if (!project || project.status !== 'published') return null
  const photos = Array.isArray(project.photos)
    ? project.photos.map((p) => ({
        url: String(p?.url || '').trim(),
        kind: String(p?.kind || ''),
        posterUrl: String(p?.posterUrl || '').trim(),
      }))
    : []
  return JSON.stringify({
    status: 'published',
    slug: project.slug || '',
    service: project.service || '',
    city: project.city || '',
    propertyType: project.propertyType || '',
    completedAt: project.completedAt || '',
    notes: String(project.notes || ''),
    cover: photos[0]?.url || '',
    media: photos,
    photoCount: photos.length,
  })
}

/**
 * Draft-only edits must not trigger deploys.
 * Trigger when published visibility or published SEO-facing fields change.
 *
 * @param {{ previous?: object|null, next?: object|null, action?: 'save'|'delete' }} args
 */
export function shouldTriggerSeoRebuild({ previous = null, next = null, action = 'save' } = {}) {
  if (action === 'delete') {
    return previous?.status === 'published'
  }
  const before = publicSeoFingerprint(previous)
  const after = publicSeoFingerprint(next)
  if (!before && !after) return false
  return before !== after
}

async function readStoredStatus() {
  if (!isAnalyticsStorageConfigured()) {
    return { ...emptyStatus(), ...(memoryLastStatus || {}) }
  }
  const redis = getAnalyticsRedis()
  try {
    const raw = await redis.get(SEO_DEPLOY_STATUS_KEY)
    if (!raw || typeof raw !== 'object') {
      return { ...emptyStatus(), ...(memoryLastStatus || {}) }
    }
    const status = {
      ...emptyStatus(),
      state: raw.state || 'idle',
      lastSuccessAt: raw.lastSuccessAt || null,
      lastAttemptAt: raw.lastAttemptAt || null,
      lastError: raw.lastError || null,
      lastReason: raw.lastReason || null,
      configured: hookConfigured(),
    }
    memoryLastStatus = status
    return status
  } catch {
    return { ...emptyStatus(), ...(memoryLastStatus || {}) }
  }
}

async function writeStoredStatus(patch) {
  const current = await readStoredStatus()
  const next = {
    ...current,
    ...patch,
    configured: hookConfigured(),
  }
  memoryLastStatus = next
  if (!isAnalyticsStorageConfigured()) return next
  const redis = getAnalyticsRedis()
  try {
    await redis.set(SEO_DEPLOY_STATUS_KEY, {
      state: next.state,
      lastSuccessAt: next.lastSuccessAt,
      lastAttemptAt: next.lastAttemptAt,
      lastError: next.lastError,
      lastReason: next.lastReason,
    })
  } catch {
    // Status persistence must never break the job save path.
  }
  return next
}

function acquireLocalLock() {
  const now = Date.now()
  if (now < memoryLockUntilMs) {
    return false
  }
  memoryLockUntilMs = now + SEO_DEPLOY_DEBOUNCE_SECONDS * 1000
  return true
}

export async function getSeoDeployStatus() {
  return readStoredStatus()
}

/**
 * Safe admin-facing status (never includes the hook URL).
 */
export function toPublicSeoDeployStatus(status, extras = {}) {
  const base = status || emptyStatus()
  return {
    state: base.state || 'idle',
    configured: Boolean(base.configured ?? hookConfigured()),
    lastSuccessAt: base.lastSuccessAt || null,
    lastAttemptAt: base.lastAttemptAt || null,
    lastError: base.lastError || null,
    lastReason: base.lastReason || null,
    ...extras,
  }
}

/**
 * Trigger one Production rebuild. Never throws to callers — returns a result object.
 * Never logs or returns the deploy hook URL.
 */
export async function triggerProductionSeoRebuild({ reason = 'public_seo_change' } = {}) {
  const attemptedAt = nowIso()

  if (!hookConfigured()) {
    const status = await writeStoredStatus({
      state: 'failed',
      lastAttemptAt: attemptedAt,
      lastError: 'Deploy hook not configured',
      lastReason: reason,
    })
    console.warn('[seoDeployHook] skipped: VERCEL_DEPLOY_HOOK_URL not configured')
    return {
      ok: false,
      triggered: false,
      deduped: false,
      warning: SEO_WARNING_TRIGGER_FAILED,
      seo: toPublicSeoDeployStatus(status, { skipped: true, reason: 'not_configured' }),
    }
  }

  let locked = false
  if (isAnalyticsStorageConfigured()) {
    const redis = getAnalyticsRedis()
    try {
      const acquired = await redis.set(SEO_DEPLOY_LOCK_KEY, reason, {
        nx: true,
        ex: SEO_DEPLOY_DEBOUNCE_SECONDS,
      })
      locked = Boolean(acquired)
      if (!acquired) {
        const status = await readStoredStatus()
        console.info('[seoDeployHook] deduped within debounce window', { reason })
        return {
          ok: true,
          triggered: false,
          deduped: true,
          warning: null,
          seo: toPublicSeoDeployStatus(
            {
              ...status,
              state: status.state === 'failed' ? 'queued' : status.state || 'queued',
            },
            { deduped: true, reason },
          ),
        }
      }
    } catch (err) {
      console.warn('[seoDeployHook] redis lock unavailable, using memory lock', err?.message || err)
    }
  }
  if (!locked && !acquireLocalLock(reason)) {
    const status = await readStoredStatus()
    console.info('[seoDeployHook] deduped via memory lock', { reason })
    return {
      ok: true,
      triggered: false,
      deduped: true,
      warning: null,
      seo: toPublicSeoDeployStatus(
        {
          ...status,
          state: status.state === 'failed' ? 'queued' : status.state || 'queued',
        },
        { deduped: true, reason },
      ),
    }
  }
  if (locked) {
    // Keep memory lock aligned so same-isolate retries also debounce.
    memoryLockUntilMs = Date.now() + SEO_DEPLOY_DEBOUNCE_SECONDS * 1000
  }

  try {
    const hookUrl = String(process.env.VERCEL_DEPLOY_HOOK_URL || '').trim()
    const res = await fetch(hookUrl, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      const status = await writeStoredStatus({
        state: 'failed',
        lastAttemptAt: attemptedAt,
        lastError: `Deploy hook HTTP ${res.status}`,
        lastReason: reason,
      })
      console.warn('[seoDeployHook] trigger failed', { status: res.status, reason })
      return {
        ok: false,
        triggered: false,
        deduped: false,
        warning: SEO_WARNING_TRIGGER_FAILED,
        seo: toPublicSeoDeployStatus(status),
      }
    }

    const status = await writeStoredStatus({
      state: 'queued',
      lastAttemptAt: attemptedAt,
      lastSuccessAt: attemptedAt,
      lastError: null,
      lastReason: reason,
    })
    console.info('[seoDeployHook] Production SEO rebuild queued', { reason })
    return {
      ok: true,
      triggered: true,
      deduped: false,
      warning: null,
      seo: toPublicSeoDeployStatus(status, { queued: true, reason }),
    }
  } catch (err) {
    const status = await writeStoredStatus({
      state: 'failed',
      lastAttemptAt: attemptedAt,
      lastError: 'Deploy hook request failed',
      lastReason: reason,
    })
    console.warn('[seoDeployHook] trigger error', { reason, message: err?.message || 'request failed' })
    return {
      ok: false,
      triggered: false,
      deduped: false,
      warning: SEO_WARNING_TRIGGER_FAILED,
      seo: toPublicSeoDeployStatus(status),
    }
  }
}

/** Test-only helper to clear in-memory debounce state. */
export function resetSeoDeployHookMemoryForTests() {
  memoryLockUntilMs = 0
  memoryLastStatus = null
}

/**
 * Run after a successful job mutation. Never throws.
 */
export async function maybeTriggerSeoRebuildAfterJobChange({ previous, next, action = 'save' }) {
  if (!shouldTriggerSeoRebuild({ previous, next, action })) {
    const status = await getSeoDeployStatus()
    return {
      ok: true,
      triggered: false,
      deduped: false,
      warning: null,
      seo: toPublicSeoDeployStatus(status, { skipped: true, reason: 'no_public_seo_change' }),
    }
  }

  const reason =
    action === 'delete'
      ? 'job_deleted'
      : previous?.status !== 'published' && next?.status === 'published'
        ? 'job_published'
        : previous?.status === 'published' && next?.status !== 'published'
          ? 'job_unpublished'
          : 'published_job_updated'

  return triggerProductionSeoRebuild({ reason })
}
