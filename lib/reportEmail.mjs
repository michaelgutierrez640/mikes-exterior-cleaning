/**
 * Branded HTML + plain-text email bodies for analytics reports.
 * Aggregate metrics only — never include customer PII.
 */
import { directionArrow } from './reportCompare.mjs'

const NAVY = '#0a1628'
const ROYAL = '#2563eb'
const GRAY = '#4b5563'
const LIGHT = '#f8fafc'

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmt(metric) {
  if (!metric?.available || metric.value == null) return 'Unavailable'
  return String(metric.value)
}

function fmtPctRate(metric) {
  if (!metric?.available || metric.value == null) return 'Unavailable'
  return `${Math.round(Number(metric.value) * 1000) / 10}%`
}

/** Quote completion rate: never invent % when there were zero starts. */
export function fmtQuoteCompletionRate(startsMetric, rateMetric) {
  if (!startsMetric?.available || !rateMetric?.available) return 'Unavailable'
  const starts = Number(startsMetric.value) || 0
  if (starts === 0) return 'n/a (no quote starts)'
  if (rateMetric.value == null) return 'n/a (no quote starts)'
  return `${Math.round(Number(rateMetric.value) * 1000) / 10}%`
}

function fmtCmp(cmp) {
  if (!cmp?.available) return '—'
  const arrow = directionArrow(cmp.direction)
  const pct = cmp.percentLabel || 'n/a'
  return `${arrow} ${cmp.displayDiff} (${pct}) · ${cmp.direction}`
}

function listRows(metric, limit = 5) {
  if (!metric?.available) return [['Unavailable', '']]
  const rows = Array.isArray(metric.value) ? metric.value.slice(0, limit) : []
  if (!rows.length) return [['None recorded', '0']]
  return rows.map((r) => [r.key, String(r.count)])
}

function deviceRows(metric) {
  if (!metric?.available || !metric.value) return [['Unavailable', '']]
  const entries = Object.entries(metric.value)
  if (!entries.length) return [['None recorded', '0']]
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => [k, String(v)])
}

/**
 * @param {{ type: 'weekly'|'monthly', payload: object, summaryLines: string[], adminUrl: string, businessName: string }} opts
 */
export function buildReportEmail(opts) {
  const { type, payload, summaryLines, adminUrl, businessName } = opts
  const title = type === 'weekly' ? 'Weekly Website Report' : 'Monthly Website Review'
  const rangeLabel = payload.range?.label || ''
  const subject = `${title} · ${rangeLabel} · ${businessName}`

  const html = buildHtml({
    title,
    rangeLabel,
    payload,
    summaryLines,
    adminUrl,
    businessName,
    type,
  })
  const text = buildText({
    title,
    rangeLabel,
    payload,
    summaryLines,
    adminUrl,
    businessName,
    type,
  })

  return { subject, html, text }
}

function buildHtml({ title, rangeLabel, payload, summaryLines, adminUrl, businessName, type }) {
  const c = payload.comparisons || {}
  const kpi = [
    ['Unique visitors', fmt(payload.uniqueVisitors), fmtCmp(c.uniqueVisitors)],
    ['Page views', fmt(payload.pageViews), fmtCmp(c.pageViews)],
    ['Projects published', fmt(payload.projectsPublished), fmtCmp(c.projectsPublished)],
    ['Visitor→CRM lead rate', fmtPctRate(payload.conversionRate), fmtCmp(c.conversionRate)],
  ]

  const funnelRows = [
    ['Quote starts', fmt(payload.instantQuoteStarts), fmtCmp(c.instantQuoteStarts)],
    ['Quote completions', fmt(payload.instantQuoteCompletions), fmtCmp(c.instantQuoteCompletions)],
    [
      'Completion rate',
      fmtQuoteCompletionRate(payload.instantQuoteStarts, payload.instantQuoteCompletionRate),
      fmtCmp(c.instantQuoteCompletionRate),
    ],
  ]

  const leadRows = [
    [
      'Phone clicks (tap-to-call events — not unique callers)',
      fmt(payload.phoneClicks),
      fmtCmp(c.phoneClicks),
    ],
    [
      'Contact form submissions (events)',
      fmt(payload.contactFormSubmissions),
      fmtCmp(c.contactFormSubmissions),
    ],
    [
      'Booking requests (events)',
      fmt(payload.bookingRequests),
      fmtCmp(c.bookingRequests),
    ],
    [
      'Total CRM leads (form submissions — not unique customers)',
      fmt(payload.totalLeads),
      fmtCmp(c.totalLeads),
    ],
  ]

  const topPages = listRows(payload.topPages)
  const sources = listRows(payload.trafficSources)
  const leadServices = listRows(payload.leadsByService)
  const leadCities = listRows(payload.leadsByCity)
  const devices = deviceRows(payload.deviceTypes)
  const refs = listRows(payload.referringDomains)

  const summaryHtml = summaryLines
    .map((line) => `<li style="margin:0 0 8px;color:${GRAY};font-size:15px;line-height:1.5;">${esc(line)}</li>`)
    .join('')

  function kpiGrid(rows) {
    return rows
      .map(
        ([label, value, cmp]) => `
      <td style="width:50%;padding:10px;vertical-align:top;">
        <div style="background:${LIGHT};border-radius:12px;padding:14px 16px;">
          <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;font-weight:700;">${esc(label)}</div>
          <div style="font-size:26px;font-weight:700;color:${NAVY};margin-top:6px;">${esc(value)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:6px;">${esc(cmp)}</div>
        </div>
      </td>`,
      )
      .reduce((acc, cell, i) => {
        if (i % 2 === 0) acc.push([cell])
        else acc[acc.length - 1].push(cell)
        return acc
      }, [])
      .map((pair) => `<tr>${pair.join('')}${pair.length === 1 ? '<td></td>' : ''}</tr>`)
      .join('')
  }

  function tableBlock(heading, rows) {
    const body = rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:${NAVY};font-size:14px;">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:${GRAY};font-size:14px;text-align:right;">${esc(v)}</td></tr>`,
      )
      .join('')
    return `
      <h3 style="margin:28px 0 10px;font-size:16px;color:${NAVY};">${esc(heading)}</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>`
  }

  function sectionGrid(heading, note, rows) {
    return `
      <h2 style="margin:28px 0 6px;font-size:18px;color:${NAVY};">${esc(heading)}</h2>
      ${note ? `<p style="margin:0 0 10px;font-size:13px;color:#6b7280;line-height:1.45;">${esc(note)}</p>` : ''}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${kpiGrid(rows)}</table>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:${NAVY};padding:28px 24px;">
          <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#93c5fd;font-weight:700;">${esc(businessName)}</div>
          <div style="font-size:24px;font-weight:700;color:#ffffff;margin-top:8px;">${esc(title)}</div>
          <div style="font-size:14px;color:#cbd5e1;margin-top:8px;">Reporting period: ${esc(rangeLabel)}</div>
          ${type === 'weekly' || type === 'monthly' ? `<div style="font-size:12px;color:#94a3b8;margin-top:6px;">Compared with the prior ${type === 'weekly' ? 'week' : 'month'}</div>` : ''}
        </td></tr>
        <tr><td style="padding:24px;">
          <h2 style="margin:0 0 12px;font-size:18px;color:${NAVY};">Key metrics</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${kpiGrid(kpi)}</table>

          ${sectionGrid(
            'Quote funnel',
            'Starts are counted once per visitor session when the Instant Quote calculator opens. Completions are successful Instant Quote submissions.',
            funnelRows,
          )}

          ${sectionGrid(
            'Leads & calls',
            'These are event and form counts — not unique customers. The same person can click call more than once or submit more than one form.',
            leadRows,
          )}

          <h2 style="margin:28px 0 10px;font-size:18px;color:${NAVY};">Summary</h2>
          <ul style="margin:0;padding-left:18px;">${summaryHtml}</ul>

          ${tableBlock('Top pages', topPages)}
          ${tableBlock('Traffic sources', sources)}
          ${tableBlock('Referring domains', refs)}
          ${tableBlock('Device types', devices)}
          ${tableBlock('Leads by service', leadServices)}
          ${tableBlock('Leads by city', leadCities)}

          <table role="presentation" width="100%" style="margin-top:32px;">
            <tr><td align="center">
              <a href="${esc(adminUrl)}" style="display:inline-block;background:${ROYAL};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 22px;border-radius:10px;">Open admin analytics</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">Private aggregate report for ${esc(businessName)}. No customer names, emails, phone numbers, or notes are included. Preview/admin traffic is excluded from Production analytics.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildText({ title, rangeLabel, payload, summaryLines, adminUrl, businessName, type }) {
  const c = payload.comparisons || {}
  const lines = [
    `${businessName}`,
    title,
    `Reporting period: ${rangeLabel}`,
    `Compared with the prior ${type === 'weekly' ? 'week' : 'month'}`,
    '',
    'KEY METRICS',
    `- Unique visitors: ${fmt(payload.uniqueVisitors)} | ${fmtCmp(c.uniqueVisitors)}`,
    `- Page views: ${fmt(payload.pageViews)} | ${fmtCmp(c.pageViews)}`,
    `- Projects published: ${fmt(payload.projectsPublished)} | ${fmtCmp(c.projectsPublished)}`,
    `- Visitor→CRM lead rate: ${fmtPctRate(payload.conversionRate)} | ${fmtCmp(c.conversionRate)}`,
    '',
    'QUOTE FUNNEL',
    `- Quote starts: ${fmt(payload.instantQuoteStarts)} | ${fmtCmp(c.instantQuoteStarts)}`,
    `- Quote completions: ${fmt(payload.instantQuoteCompletions)} | ${fmtCmp(c.instantQuoteCompletions)}`,
    `- Completion rate: ${fmtQuoteCompletionRate(payload.instantQuoteStarts, payload.instantQuoteCompletionRate)} | ${fmtCmp(c.instantQuoteCompletionRate)}`,
    '',
    'LEADS & CALLS (event/form counts — not unique customers)',
    `- Phone clicks (tap-to-call events): ${fmt(payload.phoneClicks)} | ${fmtCmp(c.phoneClicks)}`,
    `- Contact form submissions (events): ${fmt(payload.contactFormSubmissions)} | ${fmtCmp(c.contactFormSubmissions)}`,
    `- Booking requests (events): ${fmt(payload.bookingRequests)} | ${fmtCmp(c.bookingRequests)}`,
    `- Total CRM leads (form submissions): ${fmt(payload.totalLeads)} | ${fmtCmp(c.totalLeads)}`,
    '',
    'SUMMARY',
    ...summaryLines.map((l) => `- ${l}`),
    '',
    'TOP PAGES',
    ...listRows(payload.topPages).map(([k, v]) => `- ${k}: ${v}`),
    '',
    'TRAFFIC SOURCES',
    ...listRows(payload.trafficSources).map(([k, v]) => `- ${k}: ${v}`),
    '',
    'LEADS BY SERVICE',
    ...listRows(payload.leadsByService).map(([k, v]) => `- ${k}: ${v}`),
    '',
    'LEADS BY CITY',
    ...listRows(payload.leadsByCity).map(([k, v]) => `- ${k}: ${v}`),
    '',
    `Admin analytics: ${adminUrl}`,
    '',
    'Private aggregate report. No customer personal information included.',
    'Preview and admin activity are excluded from Production analytics.',
  ]
  return lines.join('\n')
}
