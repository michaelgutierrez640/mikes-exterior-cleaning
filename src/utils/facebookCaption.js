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
