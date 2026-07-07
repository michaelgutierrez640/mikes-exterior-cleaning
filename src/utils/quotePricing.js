import {
  CLEANING_TYPE_OPTIONS,
  GUTTER_LENGTH_OPTIONS,
  PANEL_COUNT_OPTIONS,
  QUOTE_SERVICES,
  SQFT_OPTIONS,
  STORY_OPTIONS,
  WINDOW_COUNT_OPTIONS,
  getServiceById,
} from '../config/quoteServices'

function findOption(options, value) {
  return options.find((o) => o.value === value)
}

function storyMultiplier(stories) {
  return findOption(STORY_OPTIONS, stories)?.multiplier ?? 1
}

function roundToNearest(value, nearest = 5) {
  return Math.round(value / nearest) * nearest
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function estimateWindowCleaning(answers) {
  const windowOption = findOption(WINDOW_COUNT_OPTIONS, answers.windowCount)
  if (!windowOption) return null

  const perWindowLow = 8
  const perWindowHigh = 12
  const typeMultiplier = answers.cleaningType === 'both' ? 1.5 : 1
  const stories = storyMultiplier(answers.stories)

  let low = windowOption.count * perWindowLow * typeMultiplier * stories
  let high = windowOption.count * perWindowHigh * typeMultiplier * stories

  low = Math.max(low, 120)
  high = Math.max(high, 160)

  const typeLabel = CLEANING_TYPE_OPTIONS.find((o) => o.value === answers.cleaningType)?.label ?? ''
  const storyLabel = STORY_OPTIONS.find((o) => o.value === answers.stories)?.label ?? ''

  return {
    serviceId: 'window-cleaning',
    serviceName: 'Window Cleaning',
    low: roundToNearest(low),
    high: roundToNearest(high),
    summary: `${windowOption.label} · ${typeLabel} · ${storyLabel}`,
  }
}

function estimatePressureWashing(answers) {
  const sqftOption = findOption(SQFT_OPTIONS, answers.sqft)
  if (!sqftOption) return null

  const rateBySurface = {
    driveway: { low: 0.15, high: 0.22 },
    siding: { low: 0.18, high: 0.28 },
    both: { low: 0.2, high: 0.3 },
  }
  const rates = rateBySurface[answers.surface] ?? rateBySurface.driveway
  const stories = storyMultiplier(answers.stories)

  let low = sqftOption.sqft * rates.low * stories
  let high = sqftOption.sqft * rates.high * stories

  low = Math.max(low, 150)
  high = Math.max(high, 195)

  const surfaceLabel = { driveway: 'Driveway / patio', siding: 'House siding', both: 'Driveway & siding' }[answers.surface] ?? ''
  const storyLabel = STORY_OPTIONS.find((o) => o.value === answers.stories)?.label ?? ''

  return {
    serviceId: 'pressure-washing',
    serviceName: 'Pressure Washing',
    low: roundToNearest(low),
    high: roundToNearest(high),
    summary: `${sqftOption.label} · ${surfaceLabel} · ${storyLabel}`,
  }
}

function estimateGutterCleaning(answers) {
  const lengthOption = findOption(GUTTER_LENGTH_OPTIONS, answers.linearFeet)
  if (!lengthOption) return null

  const perFootLow = 1.25
  const perFootHigh = 2.25
  const stories = storyMultiplier(answers.stories)

  let low = lengthOption.feet * perFootLow * stories
  let high = lengthOption.feet * perFootHigh * stories

  low = Math.max(low, 140)
  high = Math.max(high, 180)

  const storyLabel = STORY_OPTIONS.find((o) => o.value === answers.stories)?.label ?? ''

  return {
    serviceId: 'gutter-cleaning',
    serviceName: 'Gutter Cleaning',
    low: roundToNearest(low),
    high: roundToNearest(high),
    summary: `${lengthOption.label} · ${storyLabel}`,
  }
}

function estimateSolarPanelCleaning(answers) {
  const panelOption = findOption(PANEL_COUNT_OPTIONS, answers.panelCount)
  if (!panelOption) return null

  const perPanelLow = 8
  const perPanelHigh = 16
  const stories = storyMultiplier(answers.stories)
  const roofMultiplier = stories > 1 ? 1.15 : 1

  let low = panelOption.count * perPanelLow * roofMultiplier
  let high = panelOption.count * perPanelHigh * roofMultiplier

  low = Math.max(low, 120)
  high = Math.max(high, 160)

  const storyLabel = STORY_OPTIONS.find((o) => o.value === answers.stories)?.label ?? ''

  return {
    serviceId: 'solar-panel-cleaning',
    serviceName: 'Solar Panel Cleaning',
    low: roundToNearest(low),
    high: roundToNearest(high),
    summary: `${panelOption.label} · ${storyLabel}`,
  }
}

const ESTIMATORS = {
  'window-cleaning': estimateWindowCleaning,
  'pressure-washing': estimatePressureWashing,
  'gutter-cleaning': estimateGutterCleaning,
  'solar-panel-cleaning': estimateSolarPanelCleaning,
}

export function isServiceComplete(serviceId, answers) {
  const serviceAnswers = answers[serviceId]
  if (!serviceAnswers) return false

  switch (serviceId) {
    case 'window-cleaning':
      return Boolean(serviceAnswers.windowCount)
    case 'pressure-washing':
      return Boolean(serviceAnswers.sqft)
    case 'gutter-cleaning':
      return Boolean(serviceAnswers.linearFeet)
    case 'solar-panel-cleaning':
      return Boolean(serviceAnswers.panelCount)
    default:
      return false
  }
}

export function calculateQuote(selectedServices, answers) {
  const lineItems = selectedServices
    .map((serviceId) => {
      const estimator = ESTIMATORS[serviceId]
      if (!estimator || !isServiceComplete(serviceId, answers)) return null
      return estimator(answers[serviceId])
    })
    .filter(Boolean)

  if (!lineItems.length) {
    return {
      lineItems: [],
      totalLow: 0,
      totalHigh: 0,
      bundleDiscount: 0,
      isComplete: false,
      formattedTotal: '$0',
      formattedRange: '$0 – $0',
    }
  }

  const rawLow = lineItems.reduce((sum, item) => sum + item.low, 0)
  const rawHigh = lineItems.reduce((sum, item) => sum + item.high, 0)
  const bundleDiscount = lineItems.length >= 2 ? 0.1 : 0

  const totalLow = roundToNearest(rawLow * (1 - bundleDiscount))
  const totalHigh = roundToNearest(rawHigh * (1 - bundleDiscount))

  return {
    lineItems,
    totalLow,
    totalHigh,
    bundleDiscount,
    isComplete: selectedServices.every((id) => isServiceComplete(id, answers)),
    formattedTotal: `${formatCurrency(totalLow)} – ${formatCurrency(totalHigh)}`,
    formattedRange: `${formatCurrency(totalLow)} – ${formatCurrency(totalHigh)}`,
  }
}

export function buildQuoteSummaryText(selectedServices, answers, quote) {
  const lines = [
    '--- Instant Quote Calculator ---',
    '',
    'Selected Services:',
    ...selectedServices.map((id) => {
      const service = getServiceById(id)
      const item = quote.lineItems.find((l) => l.serviceId === id)
      return `• ${service?.name ?? id}${item ? ` — ${item.summary} (${formatCurrency(item.low)}–${formatCurrency(item.high)})` : ''}`
    }),
    '',
    `Estimated Total: ${quote.formattedRange}`,
    quote.bundleDiscount ? '(Includes 10% multi-service bundle savings)' : '',
    '',
    'Service Details:',
  ]

  selectedServices.forEach((id) => {
    const service = getServiceById(id)
    const serviceAnswers = answers[id]
    if (!service || !serviceAnswers) return
    lines.push(`\n${service.name}:`)
    Object.entries(serviceAnswers).forEach(([key, value]) => {
      lines.push(`  - ${key}: ${value}`)
    })
  })

  return lines.filter(Boolean).join('\n')
}

export { formatCurrency, QUOTE_SERVICES }
