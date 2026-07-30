import { absoluteUrl } from '../config/site'
import { cityLabel, projectPath, serviceLabel } from './projectLabels'

/** Client-side default caption preview (server re-sanitizes before posting). */
export function buildFacebookCaptionPreview({ service, city, notes, slug }) {
  const serviceName = serviceLabel(service)
  const cityName = cityLabel(city)
  const description = String(notes || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280)
  const url = slug ? absoluteUrl(projectPath(slug)) : absoluteUrl('/projects/your-new-project')
  return [
    `${serviceName} in ${cityName}, CA`,
    description || null,
    url,
    '',
    "Mike's Exterior Cleaning Services",
  ]
    .filter((line) => line !== null)
    .join('\n')
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
