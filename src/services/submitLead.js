import { BUSINESS } from '../config/business'

const FORM_ENDPOINT = `https://formsubmit.co/ajax/${BUSINESS.email}`

export async function submitLead({ name, phone, email, address, service, message, subject }) {
  const data = {
    name,
    phone,
    email,
    address,
    service,
    message,
    _subject: subject ?? `Free Quote Request — ${BUSINESS.name}`,
    _template: 'table',
    _captcha: 'false',
  }

  const res = await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error('Submission failed')
  return res.json()
}
