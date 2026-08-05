import { absoluteUrl } from '../config/site'
import { cityLabel, projectPath, serviceLabel } from './projectLabels'

const BLURB_MAX = 100
const PROJECT_URL_PATTERN =
  /(?:https?:\/\/(?:www\.)?mikesexteriorcleaning\.com)?\/projects\/[A-Za-z0-9._~-]*/gi

function stripProjectUrls(text) {
  return String(text || '')
    .replace(PROJECT_URL_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Short teaser only — do not paste the full SEO job description. */
function shortBlurb(notes) {
  const cleaned = stripProjectUrls(notes)
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return 'Recent results from a Central Valley home.'
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned
  if (firstSentence.length <= BLURB_MAX) return firstSentence
  return `${firstSentence.slice(0, BLURB_MAX - 1).trim()}…`
}

/**
 * Client-side default caption preview (server re-sanitizes before posting).
 * Never uses /projects/your-new-project. The real saved slug URL is added
 * only when a slug already exists; otherwise the server appends it after save.
 */
export function buildFacebookCaptionPreview({ service, city, notes, slug }) {
  const serviceName = serviceLabel(service)
  const cityName = cityLabel(city)
  const description = shortBlurb(notes)
  const cleanSlug = String(slug || '').trim()
  const hasRealSlug = Boolean(cleanSlug) && cleanSlug !== 'your-new-project'
  const lines = [
    `${serviceName} in ${cityName}, CA`,
    description,
  ]
  if (hasRealSlug) {
    lines.push(absoluteUrl(projectPath(cleanSlug)))
  }
  lines.push('')
  lines.push("Mike's Exterior Cleaning Services")
  if (!hasRealSlug) {
    lines.push('(Project link added automatically after publish)')
  }
  return lines.join('\n')
}

export function facebookStatusLabel(status) {
  switch (String(status || 'not_posted')) {
    case 'posted':
      return 'Posted to Facebook'
    case 'pending':
      return 'Facebook post pending'
    case 'failed':
      return 'Facebook posting failed'
    default:
      return 'Not posted to Facebook'
  }
}

export function canShowFacebookPublishCheckbox(project) {
  if (!project) return true // new job
  if (project.facebookPostId) return false
  if (project.facebookPostStatus === 'posted') return false
  return true
}
