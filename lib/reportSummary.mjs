/**
 * Deterministic plain-language summary for analytics reports (no external AI).
 */

function num(metric) {
  if (!metric?.available || metric.value == null) return null
  return Number(metric.value) || 0
}

function topKey(metric) {
  if (!metric?.available || !Array.isArray(metric.value) || !metric.value.length) return null
  return metric.value[0]
}

/**
 * @param {object} payload from buildReportPayload
 * @param {'weekly'|'monthly'} type
 */
export function buildPlainLanguageSummary(payload, type = 'weekly') {
  const lines = []
  const visitors = num(payload.uniqueVisitors)
  const pageViews = num(payload.pageViews)
  const leads = num(payload.totalLeads)
  const quoteStarts = num(payload.instantQuoteStarts)
  const quoteDone = num(payload.instantQuoteCompletions)
  const phone = num(payload.phoneClicks)

  const visitorCmp = payload.comparisons?.uniqueVisitors
  const leadCmp = payload.comparisons?.totalLeads
  const pageCmp = payload.comparisons?.pageViews

  if (visitors === null && leads === null && pageViews === null) {
    return ['Analytics and CRM data were unavailable for this reporting period.']
  }

  if (visitors === 0 && pageViews === 0) {
    lines.push('No website traffic was recorded for this period.')
  } else if (visitorCmp?.available && visitorCmp.direction === 'increased' && leadCmp?.available && leadCmp.direction === 'decreased') {
    lines.push('Traffic increased compared with the prior period, while new leads declined.')
  } else if (visitorCmp?.available && visitorCmp.direction === 'decreased' && leadCmp?.available && leadCmp.direction === 'increased') {
    lines.push('Traffic decreased compared with the prior period, while new leads increased.')
  } else if (visitorCmp?.available && visitorCmp.direction === 'increased') {
    lines.push(`Unique visitors ${visitorCmp.direction} versus the prior period (${visitorCmp.displayDiff}).`)
  } else if (visitorCmp?.available && visitorCmp.direction === 'decreased') {
    lines.push(`Unique visitors ${visitorCmp.direction} versus the prior period (${visitorCmp.displayDiff}).`)
  } else if (visitors != null) {
    lines.push(`The site recorded ${visitors} unique visitor${visitors === 1 ? '' : 's'} in this period.`)
  }

  if (quoteStarts != null && quoteDone != null) {
    if (quoteStarts > 0 && quoteDone === 0) {
      lines.push('Instant Quote starts were recorded, but no quote completions occurred in this period.')
    } else if (
      payload.comparisons?.instantQuoteStarts?.available &&
      payload.comparisons.instantQuoteStarts.direction === 'increased' &&
      payload.comparisons?.instantQuoteCompletions?.available &&
      payload.comparisons.instantQuoteCompletions.direction !== 'increased'
    ) {
      lines.push('Quote starts increased, but completions did not increase in step.')
    }
  }

  const topPage = topKey(payload.topPages)
  if (topPage?.key) {
    lines.push(`The most-viewed public path was ${topPage.key} (${topPage.count} views).`)
  }

  const topSource = topKey(payload.trafficSources)
  if (topSource?.key) {
    if (topSource.key === 'Direct') {
      lines.push('Direct traffic was the largest traffic source.')
    } else {
      lines.push(`${topSource.key} was the largest traffic source.`)
    }
  }

  if (leads === 0) {
    lines.push('No new CRM leads were recorded in this period.')
  } else if (leads != null) {
    const topService = topKey(payload.leadsByService)
    const topCity = topKey(payload.leadsByCity)
    let leadLine = `${leads} new CRM lead${leads === 1 ? '' : 's'} recorded`
    if (topService?.key && topService.key !== 'unspecified') {
      leadLine += `, most often for ${topService.key}`
    }
    if (topCity?.key && topCity.key !== 'unspecified') {
      leadLine += ` in ${topCity.key}`
    }
    leadLine += '.'
    lines.push(leadLine)
  }

  if (phone != null && phone > 0) {
    lines.push(`Phone-button clicks totaled ${phone} (tap-to-call events, not unique callers).`)
  }

  if (quoteStarts != null && quoteDone != null && quoteStarts === 0) {
    lines.push('No Instant Quote starts were recorded in this period.')
  }

  if (type === 'monthly') {
    const improvements = Object.entries(payload.comparisons || {})
      .filter(([, c]) => c?.available && c.direction === 'increased' && typeof c.diff === 'number')
      .sort((a, b) => Math.abs(b[1].diff) - Math.abs(a[1].diff))
    const declines = Object.entries(payload.comparisons || {})
      .filter(([, c]) => c?.available && c.direction === 'decreased' && typeof c.diff === 'number')
      .sort((a, b) => Math.abs(b[1].diff) - Math.abs(a[1].diff))

    const labels = {
      uniqueVisitors: 'unique visitors',
      pageViews: 'page views',
      totalLeads: 'new leads',
      conversionRate: 'lead conversion rate',
      phoneClicks: 'phone clicks',
      instantQuoteStarts: 'quote starts',
      instantQuoteCompletions: 'quote completions',
      projectsPublished: 'published projects',
    }

    if (improvements[0]) {
      const [key] = improvements[0]
      lines.push(`Strongest improvement: ${labels[key] || key}.`)
    }
    if (declines[0]) {
      const [key] = declines[0]
      lines.push(`Area needing attention: ${labels[key] || key}.`)
    }
  }

  if (pageCmp?.available && !lines.some((l) => l.includes('page'))) {
    // keep summary concise — skip extra page line if already dense
  }

  if (!lines.length) {
    lines.push('Report generated for the selected period with limited comparable activity.')
  }

  // Cap length; no causation claims added above.
  return lines.slice(0, 8)
}
