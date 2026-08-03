/**
 * Notify Mike when a website customer review is waiting for approval.
 * Uses existing Resend env vars when configured. Never fails the customer submit.
 * Does not log review body or credentials.
 */

const BUSINESS_NAME = "Mike's Exterior Cleaning Services"
const ADMIN_REVIEWS_URL = 'https://www.mikesexteriorcleaning.com/admin/customer-reviews'
const REVIEW_PAGE_URL = 'https://www.mikesexteriorcleaning.com/review'

function getNotifyConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || ''
  const to =
    process.env.REVIEW_NOTIFY_TO_EMAIL?.trim() ||
    process.env.ANALYTICS_REPORT_TO_EMAIL?.trim() ||
    ''
  const from = process.env.ANALYTICS_REPORT_FROM_EMAIL?.trim() || ''
  return { apiKey, to, from }
}

/**
 * @param {{ id: string, name: string, createdAt?: string|null }} review
 * @returns {Promise<{ sent: boolean, skipped?: boolean, reason?: string }>}
 */
export async function notifyPendingWebsiteReview(review) {
  const { apiKey, to, from } = getNotifyConfig()
  if (!apiKey || !to || !from) {
    console.info('[reviews] notify skipped — email not configured')
    return { sent: false, skipped: true, reason: 'email_not_configured' }
  }

  const name = String(review?.name || 'Customer').slice(0, 80)
  const id = String(review?.id || '').slice(0, 80)
  const subject = `Website customer review waiting for approval — ${BUSINESS_NAME}`
  const text = [
    'A new website customer review was submitted and is waiting for your approval.',
    '',
    `Name: ${name}`,
    id ? `Review id: ${id}` : null,
    review?.createdAt ? `Submitted: ${review.createdAt}` : null,
    '',
    `Review these in Admin: ${ADMIN_REVIEWS_URL}`,
    `Customer review link: ${REVIEW_PAGE_URL}`,
    '',
    'This review will NOT appear on the website until you approve and publish it.',
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
    <p>A new <strong>website customer review</strong> was submitted and is waiting for your approval.</p>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    ${id ? `<p><strong>Review id:</strong> ${escapeHtml(id)}</p>` : ''}
    <p><a href="${ADMIN_REVIEWS_URL}">Open Customer Reviews in Admin</a></p>
    <p><a href="${REVIEW_PAGE_URL}">Customer review page link</a></p>
    <p>This review will <strong>not</strong> appear on the website until you approve and publish it.</p>
  `.trim()

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    })
    if (!res.ok) {
      console.error('[reviews] notify failed', res.status)
      return { sent: false, reason: 'resend_error' }
    }
    return { sent: true }
  } catch (err) {
    console.error('[reviews] notify error:', err?.message || err)
    return { sent: false, reason: 'network_error' }
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
