import { absoluteUrl } from '../config/site'
import { cityLabel, projectPath, serviceLabel } from './projectLabels'

const BLURB_MAX = 100

/** Short teaser only — do not paste the full SEO job description. */
function shortBlurb(notes) {
  const cleaned = String(notes || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return 'Recent results from a Central Valley home.'
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned
  if (firstSentence.length <= BLURB_MAX) return firstSentence
  return `${firstSentence.slice(0, BLURB_MAX - 1).trim()}…`
}

/** Client-side default caption preview (server re-sanitizes before posting). */
export function buildFacebookCaptionPreview({ service, city, notes, slug }) {
  const serviceName = serviceLabel(service)
  const cityName = cityLabel(city)
  const description = shortBlurb(notes)
  const url = slug ? absoluteUrl(projectPath(slug)) : absoluteUrl('/projects/your-new-project')
  return [
    `${serviceName} in ${cityName}, CA`,
    description,
    url,
    '',
    "Mike's Exterior Cleaning Services",
  ].join('\n')
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
