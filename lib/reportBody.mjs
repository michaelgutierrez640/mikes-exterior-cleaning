/**
 * Safe email body helpers for analytics reports.
 * Never log full HTML/text or customer-level fields.
 */

/** Minimum lengths that indicate a real rendered report (not an empty send). */
export const MIN_HTML_CHARS = 200
export const MIN_TEXT_CHARS = 40

/**
 * Strip null bytes and other C0 controls that can truncate MIME/Gmail rendering.
 * Keeps tab / LF / CR.
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeEmailBody(value) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}

/**
 * @param {{ html?: unknown, text?: unknown }} bodies
 * @returns {{ html: string, text: string, htmlChars: number, textChars: number }}
 */
export function normalizeEmailBodies(bodies = {}) {
  const html = sanitizeEmailBody(bodies.html)
  const text = sanitizeEmailBody(bodies.text)
  return {
    html,
    text,
    htmlChars: html.length,
    textChars: text.length,
  }
}

/**
 * Reject blank / trivially empty bodies before calling Resend.
 * @param {{ html?: unknown, text?: unknown }} bodies
 * @returns {{ ok: true, html: string, text: string, htmlChars: number, textChars: number } | { ok: false, error: string, htmlChars: number, textChars: number }}
 */
export function assertSendableEmailBodies(bodies = {}) {
  const normalized = normalizeEmailBodies(bodies)
  const { html, text, htmlChars, textChars } = normalized

  if (!htmlChars && !textChars) {
    return {
      ok: false,
      error: 'Report email body is empty (html and text are both blank). Send aborted.',
      htmlChars,
      textChars,
    }
  }
  if (htmlChars < MIN_HTML_CHARS && textChars < MIN_TEXT_CHARS) {
    return {
      ok: false,
      error: `Report email body too small to send (html=${htmlChars} chars, text=${textChars} chars). Send aborted.`,
      htmlChars,
      textChars,
    }
  }
  if (!htmlChars) {
    return {
      ok: false,
      error: 'Report HTML body is empty. Send aborted.',
      htmlChars,
      textChars,
    }
  }
  if (!textChars) {
    return {
      ok: false,
      error: 'Report plain-text body is empty. Send aborted.',
      htmlChars,
      textChars,
    }
  }

  return { ok: true, html, text, htmlChars, textChars }
}

/**
 * Private admin diagnostics — aggregate only, no secrets / no customer PII / no body content.
 * @param {{ type: string, range: object, payload: object, subject: string, html: string, text: string, from?: string }} input
 */
export function buildReportDiagnostics(input) {
  const bodies = normalizeEmailBodies({ html: input.html, text: input.text })
  const storage = input.payload?.storage || {}
  const from = String(input.from || '').trim()

  return {
    type: input.type,
    periodKey: input.range?.periodKey || null,
    periodLabel: input.range?.label || input.payload?.range?.label || null,
    subjectChars: sanitizeEmailBody(input.subject).length,
    htmlChars: bodies.htmlChars,
    textChars: bodies.textChars,
    bodiesReady: bodies.htmlChars >= MIN_HTML_CHARS && bodies.textChars >= MIN_TEXT_CHARS,
    reportDataLoaded: {
      analytics: Boolean(storage.analytics),
      leads: Boolean(storage.leads),
      projects: Boolean(storage.projects),
    },
    metricsAvailable: {
      uniqueVisitors: Boolean(input.payload?.uniqueVisitors?.available),
      pageViews: Boolean(input.payload?.pageViews?.available),
      totalLeads: Boolean(input.payload?.totalLeads?.available),
      instantQuoteStarts: Boolean(input.payload?.instantQuoteStarts?.available),
    },
    fromAddress: from || null,
    fromExpected: 'reports@reports.mikesexteriorcleaning.com',
    fromMatchesExpected: !from || from.toLowerCase().includes('reports@reports.mikesexteriorcleaning.com'),
  }
}
