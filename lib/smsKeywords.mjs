/** Shared SMS keyword matching for Twilio inbound webhooks. */

export function isStopKeyword(body) {
  const t = String(body || '')
    .trim()
    .toUpperCase()
  return t === 'STOP' || t === 'STOPALL' || t === 'UNSUBSCRIBE' || t === 'CANCEL' || t === 'END' || t === 'QUIT'
}

export function isStartKeyword(body) {
  const t = String(body || '')
    .trim()
    .toUpperCase()
  return t === 'START' || t === 'YES' || t === 'UNSTOP'
}

export function isHelpKeyword(body) {
  const t = String(body || '')
    .trim()
    .toUpperCase()
  return t === 'HELP' || t === 'INFO'
}
