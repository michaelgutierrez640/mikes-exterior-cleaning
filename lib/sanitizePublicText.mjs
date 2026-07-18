const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const PHONE_RE = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g
const STREET_RE =
  /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Cir|Circle|Hwy|Highway)\b\.?/gi
const GPS_RE = /\b-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}\b/g
const HTML_TAG_RE = /<\/?[^>]+(>|$)/g

/** Strip HTML and common PII patterns from public-facing text. */
export function sanitizePublicText(value, { maxLength = 2000 } = {}) {
  let text = String(value ?? '')
  text = text.replace(HTML_TAG_RE, ' ')
  text = text.replace(EMAIL_RE, '[redacted]')
  text = text.replace(PHONE_RE, '[redacted]')
  text = text.replace(STREET_RE, '[redacted]')
  text = text.replace(GPS_RE, '[redacted]')
  text = text.replace(/\s+/g, ' ').trim()
  if (text.length > maxLength) text = `${text.slice(0, maxLength - 1).trim()}…`
  return text
}
