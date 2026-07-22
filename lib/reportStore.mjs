/**
 * Private Redis storage for analytics report settings and delivery history.
 * Aggregate metadata only — never store customer PII.
 */
import crypto from 'crypto'
import { getAnalyticsRedis, isAnalyticsStorageConfigured } from './analyticsRedis.mjs'
import {
  getDueReportPeriods,
  getPreviousMonthRange,
  getPreviousWeekRange,
  nextMonthlySendDate,
  nextWeeklySendDate,
  pacificDateKey,
} from './reportTime.mjs'

export const REPORT_SETTINGS_KEY = 'analytics:report:settings'
export const REPORT_HISTORY_KEY = 'analytics:report:history'
export const REPORT_DELIVERY_PREFIX = 'analytics:report:delivery:'
export const REPORT_LOCK_PREFIX = 'analytics:report:lock:'

const MAX_HISTORY = 100

export const DEFAULT_REPORT_SETTINGS = {
  weeklyEnabled: true,
  monthlyEnabled: true,
  // Recipient display preference only — actual send uses ANALYTICS_REPORT_TO_EMAIL env
  recipientEmailHint: null,
  updatedAt: null,
}

function deliveryKey(periodKey) {
  return `${REPORT_DELIVERY_PREFIX}${periodKey}`
}

function lockKey(periodKey) {
  return `${REPORT_LOCK_PREFIX}${periodKey}`
}

function parseJson(raw, fallback) {
  if (!raw) return fallback
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function isReportStorageConfigured() {
  return isAnalyticsStorageConfigured()
}

export async function getReportSettings() {
  const redis = getAnalyticsRedis()
  if (!redis) return { ...DEFAULT_REPORT_SETTINGS }
  const raw = await redis.get(REPORT_SETTINGS_KEY)
  const stored = parseJson(raw, {})
  return {
    ...DEFAULT_REPORT_SETTINGS,
    ...stored,
    weeklyEnabled: stored.weeklyEnabled !== false,
    monthlyEnabled: stored.monthlyEnabled !== false,
  }
}

/**
 * Persist non-secret preferences only.
 * @param {{ weeklyEnabled?: boolean, monthlyEnabled?: boolean, recipientEmailHint?: string|null }} patch
 */
export async function updateReportSettings(patch = {}) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Report storage not configured')
    err.status = 503
    throw err
  }
  const current = await getReportSettings()
  const next = {
    ...current,
    weeklyEnabled: patch.weeklyEnabled !== undefined ? Boolean(patch.weeklyEnabled) : current.weeklyEnabled,
    monthlyEnabled: patch.monthlyEnabled !== undefined ? Boolean(patch.monthlyEnabled) : current.monthlyEnabled,
    updatedAt: new Date().toISOString(),
  }
  if (patch.recipientEmailHint !== undefined) {
    const hint = patch.recipientEmailHint == null ? null : String(patch.recipientEmailHint).trim().slice(0, 200)
    next.recipientEmailHint = hint || null
  }
  await redis.set(REPORT_SETTINGS_KEY, JSON.stringify(next))
  return next
}

export async function getDeliveryRecord(periodKey) {
  const redis = getAnalyticsRedis()
  if (!redis || !periodKey) return null
  const raw = await redis.get(deliveryKey(periodKey))
  return parseJson(raw, null)
}

/**
 * Acquire a short-lived lock to prevent duplicate concurrent sends.
 * @returns {Promise<boolean>}
 */
export async function acquireReportLock(periodKey, ttlSec = 120) {
  const redis = getAnalyticsRedis()
  if (!redis) return false
  const token = crypto.randomBytes(8).toString('hex')
  const key = lockKey(periodKey)
  // Upstash set with NX
  const result = await redis.set(key, token, { nx: true, ex: ttlSec })
  return result === 'OK' || result === true
}

export async function releaseReportLock(periodKey) {
  const redis = getAnalyticsRedis()
  if (!redis) return
  await redis.del(lockKey(periodKey))
}

export function wasSuccessfullyDelivered(record) {
  return record?.status === 'sent'
}

/**
 * Save delivery/archive record (aggregate only).
 */
export async function saveDeliveryRecord(record) {
  const redis = getAnalyticsRedis()
  if (!redis) {
    const err = new Error('Report storage not configured')
    err.status = 503
    throw err
  }

  const periodKey = record.periodKey
  const payload = {
    id: record.id || `rpt_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
    type: record.type,
    periodKey,
    startDate: record.startDate,
    endDate: record.endDate,
    label: record.label,
    status: record.status, // sent | failed | preview | skipped
    sentAt: record.sentAt || null,
    recipient: record.recipient || null,
    providerMessageId: record.providerMessageId || null,
    failureReason: record.failureReason ? String(record.failureReason).slice(0, 500) : null,
    subject: record.subject ? String(record.subject).slice(0, 200) : null,
    // Safe HTML/text preview without customer PII (already aggregate)
    htmlPreview: record.htmlPreview ? String(record.htmlPreview).slice(0, 200000) : null,
    textPreview: record.textPreview ? String(record.textPreview).slice(0, 50000) : null,
    htmlChars:
      Number.isFinite(Number(record.htmlChars))
        ? Number(record.htmlChars)
        : record.htmlPreview
          ? String(record.htmlPreview).length
          : null,
    textChars:
      Number.isFinite(Number(record.textChars))
        ? Number(record.textChars)
        : record.textPreview
          ? String(record.textPreview).length
          : null,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await redis.set(deliveryKey(periodKey), JSON.stringify(payload))
  await redis.zadd(REPORT_HISTORY_KEY, { score: Date.now(), member: periodKey })
  // Trim old history members (best-effort)
  await redis.zremrangebyrank(REPORT_HISTORY_KEY, 0, -(MAX_HISTORY + 1))
  return payload
}

export async function listDeliveryHistory(limit = 40) {
  const redis = getAnalyticsRedis()
  if (!redis) return []
  const keys = await redis.zrange(REPORT_HISTORY_KEY, 0, limit - 1, { rev: true })
  const list = Array.isArray(keys) ? keys : []
  const records = await Promise.all(list.map((k) => getDeliveryRecord(k)))
  return records.filter(Boolean).map((r) => ({
    id: r.id,
    type: r.type,
    periodKey: r.periodKey,
    startDate: r.startDate,
    endDate: r.endDate,
    label: r.label,
    status: r.status,
    sentAt: r.sentAt,
    recipient: r.recipient,
    providerMessageId: r.providerMessageId,
    failureReason: r.failureReason,
    subject: r.subject,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    hasPreview: Boolean(r.htmlPreview || r.textPreview),
    htmlChars: r.htmlChars ?? null,
    textChars: r.textChars ?? null,
  }))
}

export async function getDeliveryPreview(periodKey) {
  const record = await getDeliveryRecord(periodKey)
  if (!record) return null
  return {
    periodKey: record.periodKey,
    type: record.type,
    label: record.label,
    status: record.status,
    subject: record.subject,
    htmlPreview: record.htmlPreview,
    textPreview: record.textPreview,
    htmlChars: record.htmlChars ?? (record.htmlPreview ? String(record.htmlPreview).length : null),
    textChars: record.textChars ?? (record.textPreview ? String(record.textPreview).length : null),
    sentAt: record.sentAt,
    failureReason: record.failureReason,
  }
}

/** Public admin status (never exposes secrets). */
export async function getReportAdminStatus(now = new Date()) {
  const settings = await getReportSettings()
  const due = getDueReportPeriods(now)
  const lastWeekly = await findLastByType('weekly')
  const lastMonthly = await findLastByType('monthly')

  const envTo = Boolean(process.env.ANALYTICS_REPORT_TO_EMAIL?.trim())
  const envFrom = Boolean(process.env.ANALYTICS_REPORT_FROM_EMAIL?.trim())
  const envResend = Boolean(process.env.RESEND_API_KEY?.trim())
  const envCron = Boolean(process.env.CRON_SECRET?.trim())

  return {
    todayPacific: pacificDateKey(now),
    settings: {
      weeklyEnabled: settings.weeklyEnabled,
      monthlyEnabled: settings.monthlyEnabled,
      recipientEmailHint: settings.recipientEmailHint,
      updatedAt: settings.updatedAt,
    },
    envConfigured: {
      toEmail: envTo,
      fromEmail: envFrom,
      resendApiKey: envResend,
      cronSecret: envCron,
      redis: isReportStorageConfigured(),
    },
    // Masked recipient from env for display only
    recipientDisplay: maskEmail(process.env.ANALYTICS_REPORT_TO_EMAIL?.trim() || settings.recipientEmailHint),
    lastWeeklyReport: lastWeekly,
    lastMonthlyReport: lastMonthly,
    nextWeeklySendDate: nextWeeklySendDate(now),
    nextMonthlySendDate: nextMonthlySendDate(now),
    nextWeeklyPeriod: getPreviousWeekRange(
      // Preview of what Monday would cover if today isn't Monday — still show previous complete week as reference
      now,
    ),
    nextMonthlyPeriod: getPreviousMonthRange(now),
    dueToday: {
      weekly: due.weekly?.periodKey || null,
      monthly: due.monthly?.periodKey || null,
    },
  }
}

async function findLastByType(type) {
  const history = await listDeliveryHistory(40)
  return history.find((r) => r.type === type && r.status === 'sent') || history.find((r) => r.type === type) || null
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return null
  const [user, domain] = email.split('@')
  if (user.length <= 2) return `**@${domain}`
  return `${user.slice(0, 2)}***@${domain}`
}
