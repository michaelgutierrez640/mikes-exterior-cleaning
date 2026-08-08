/**
 * SMS automation configuration (server-side only).
 * Never import this from Vite/client code — owner phone and Twilio secrets must stay private.
 */

export const SMS_BUSINESS_NAME = "Mike's Exterior Cleaning Services"
export const DEFAULT_REVIEW_DELAY_HOURS = 24

/** Explicit opt-in required; unset/false means disabled (no real Twilio sends). */
export function isSmsEnabled() {
  return String(process.env.SMS_ENABLED || '').trim().toLowerCase() === 'true'
}

export function getTwilioConfig() {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim()
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim()
  const fromNumber = String(process.env.TWILIO_PHONE_NUMBER || '').trim()
  return { accountSid, authToken, fromNumber }
}

export function hasTwilioConfig(config = getTwilioConfig()) {
  return Boolean(config.accountSid && config.authToken && config.fromNumber)
}

/** Real customer/owner SMS only when explicitly enabled AND Twilio is configured. */
export function isSmsSendingEnabled() {
  return isSmsEnabled() && hasTwilioConfig()
}

/** Mike's private notification number — never expose via VITE_ or public API. */
export function getOwnerSmsPhone() {
  return String(process.env.SMS_OWNER_PHONE || process.env.OWNER_SMS_TO || '').trim()
}

export function getReviewRequestDelayHours() {
  const raw = String(process.env.SMS_REVIEW_DELAY_HOURS || '').trim()
  if (!raw) return DEFAULT_REVIEW_DELAY_HOURS
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 24 * 30) return DEFAULT_REVIEW_DELAY_HOURS
  return n
}

/**
 * Official Google review link used by the site (same env the footer/badge use).
 * Server prefers dedicated GOOGLE_REVIEW_URL, then the public Vite var if present in the runtime.
 */
export function getGoogleReviewUrl() {
  return (
    String(process.env.GOOGLE_REVIEW_URL || '').trim() ||
    String(process.env.VITE_GOOGLE_REVIEWS_URL || '').trim() ||
    ''
  )
}

export function getSmsConfigSummary() {
  const twilio = getTwilioConfig()
  return {
    smsEnabled: isSmsEnabled(),
    sendingEnabled: isSmsSendingEnabled(),
    twilioConfigured: hasTwilioConfig(twilio),
    ownerPhoneConfigured: Boolean(getOwnerSmsPhone()),
    reviewUrlConfigured: Boolean(getGoogleReviewUrl()),
    reviewDelayHours: getReviewRequestDelayHours(),
  }
}
