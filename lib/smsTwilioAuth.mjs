/**
 * Twilio request signature validation (HMAC-SHA1).
 * Production inbound webhooks must present a valid X-Twilio-Signature.
 */
import crypto from 'crypto'
import { getTwilioConfig } from './smsConfig.mjs'

export function isProductionRuntime() {
  return (
    String(process.env.VERCEL_ENV || '').trim() === 'production' ||
    String(process.env.NODE_ENV || '').trim() === 'production'
  )
}

/**
 * Build the public webhook URL Twilio signed.
 * Prefer an explicit env override, otherwise reconstruct from forwarded host headers.
 */
export function resolveTwilioWebhookUrl(req, { path = '/api/sms/inbound', envKey = 'TWILIO_INBOUND_WEBHOOK_URL' } = {}) {
  const configured = String(process.env[envKey] || '').trim()
  if (configured) return configured

  const proto = String(req.headers?.['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim()
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '')
    .split(',')[0]
    .trim()
  if (!host) return ''
  return `${proto}://${host}${path}`
}

/**
 * Twilio signs: URL + concatenated sorted POST params as key+value pairs (no delimiters).
 * @returns {boolean}
 */
export function computeTwilioSignature(authToken, url, params = {}) {
  const data = Object.keys(params || {})
    .sort()
    .reduce((acc, key) => `${acc}${key}${params[key] == null ? '' : String(params[key])}`, String(url || ''))
  return crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64')
}

export function signaturesMatch(expected, provided) {
  const a = Buffer.from(String(expected || ''), 'utf8')
  const b = Buffer.from(String(provided || ''), 'utf8')
  if (!a.length || a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Validate an inbound Twilio webhook.
 * - Production: requires auth token + valid signature (never accept unverified).
 * - Non-production: validates when token is configured; otherwise skips with a warning.
 */
export function verifyTwilioWebhookSignature(req, params, { url, path = '/api/sms/inbound', envKey } = {}) {
  const { authToken } = getTwilioConfig()
  const signature = String(req.headers?.['x-twilio-signature'] || '').trim()
  const resolvedUrl = url || resolveTwilioWebhookUrl(req, { path, envKey })
  const production = isProductionRuntime()

  if (!authToken) {
    if (production) {
      return {
        ok: false,
        status: 403,
        error: 'Twilio auth token not configured',
        reason: 'missing_auth_token',
      }
    }
    console.warn('[sms] Twilio signature check skipped (no auth token outside production)')
    return { ok: true, skipped: true, reason: 'missing_auth_token_non_production' }
  }

  if (!signature) {
    return { ok: false, status: 403, error: 'Missing Twilio signature', reason: 'missing_signature' }
  }
  if (!resolvedUrl) {
    return { ok: false, status: 403, error: 'Unable to resolve webhook URL', reason: 'missing_url' }
  }

  const expected = computeTwilioSignature(authToken, resolvedUrl, params)
  if (!signaturesMatch(expected, signature)) {
    return { ok: false, status: 403, error: 'Invalid Twilio signature', reason: 'bad_signature' }
  }

  return { ok: true, skipped: false, url: resolvedUrl }
}
