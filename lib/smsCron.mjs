/**
 * Daily SMS automation jobs (24h reminders + delayed review requests).
 * Designed to run from the existing Hobby cron slot alongside analytics reports.
 *
 * Reminder semantics: appointments scheduled for "tomorrow" in America/Los_Angeles
 * receive one reminder on the daily cron (~8am PT). Idempotent via reminderSmsAt.
 */
import {
  addDaysToDateKey,
  getCanonicalStatus,
  listLeads,
  presentLead,
  todayDateKey,
} from './leadsStore.mjs'
import { sendAppointmentReminderForLead, sendReviewRequestForLead } from './smsAutomations.mjs'

export function reminderAppointmentDateKey(now = new Date()) {
  return addDaysToDateKey(todayDateKey(now), 1)
}

export function isLeadDueForReminder(lead, tomorrowKey) {
  if (!lead) return false
  if (lead.deletedAt) return false
  if (getCanonicalStatus(lead.status) !== 'Booked') return false
  if (lead.smsOptedOut === true) return false
  if (lead.smsConsent !== true) return false
  if (String(lead.appointmentDate || '') !== String(tomorrowKey)) return false
  const state = lead.automationState || {}
  const key = `${lead.appointmentDate}|${lead.appointmentStartTime}|${lead.appointmentTimezone || 'America/Los_Angeles'}`
  if (state.reminderSmsAt && (state.reminderForAppointmentKey === key || !state.reminderForAppointmentKey)) {
    return false
  }
  return Boolean(lead.appointmentDate && lead.appointmentStartTime)
}

export function isLeadDueForReviewRequest(lead, now = new Date()) {
  if (!lead) return false
  if (lead.deletedAt) return false
  if (getCanonicalStatus(lead.status) !== 'Completed') return false
  if (lead.smsOptedOut === true) return false
  if (lead.smsConsent !== true) return false
  const state = lead.automationState || {}
  if (state.reviewRequestSmsAt) return false
  if (!state.reviewRequestDueAt) return false
  const due = Date.parse(state.reviewRequestDueAt)
  if (Number.isNaN(due)) return false
  return due <= (now instanceof Date ? now.getTime() : Date.parse(now))
}

/**
 * Process due reminders and review requests.
 * Safe to retry — each send claims its automation stamp first.
 */
export async function runSmsCronJobs(deps = {}) {
  const now = deps.now || new Date()
  const tomorrowKey = deps.tomorrowKey || reminderAppointmentDateKey(now)
  const list = deps.listLeads || listLeads
  const all = await list({ inboxView: 'all', limit: 1000 })
  const leads = (all || []).map((l) => presentLead(l))

  const reminderResults = []
  const reviewResults = []

  for (const lead of leads) {
    if (isLeadDueForReminder(lead, tomorrowKey)) {
      try {
        const result = await sendAppointmentReminderForLead(lead, deps)
        reminderResults.push({ id: lead.id, ...result })
      } catch (err) {
        console.error('[sms-cron] reminder error', { id: lead.id, error: err?.message || err })
        reminderResults.push({ id: lead.id, ok: false, error: err?.message || 'reminder_failed' })
      }
    }

    if (isLeadDueForReviewRequest(lead, now)) {
      try {
        const result = await sendReviewRequestForLead(lead, deps)
        reviewResults.push({ id: lead.id, ...result })
      } catch (err) {
        console.error('[sms-cron] review error', { id: lead.id, error: err?.message || err })
        reviewResults.push({ id: lead.id, ok: false, error: err?.message || 'review_failed' })
      }
    }
  }

  const summary = {
    ok: true,
    tomorrowKey,
    remindersConsidered: reminderResults.length,
    remindersSent: reminderResults.filter((r) => r.ok && !r.skipped && !r.dryRun).length,
    remindersDryRun: reminderResults.filter((r) => r.dryRun).length,
    remindersSkipped: reminderResults.filter((r) => r.skipped).length,
    reviewsConsidered: reviewResults.length,
    reviewsSent: reviewResults.filter((r) => r.ok && !r.skipped && !r.dryRun).length,
    reviewsDryRun: reviewResults.filter((r) => r.dryRun).length,
    reviewsSkipped: reviewResults.filter((r) => r.skipped).length,
  }

  console.info('[sms-cron]', summary)
  return { ...summary, reminderResults, reviewResults }
}
