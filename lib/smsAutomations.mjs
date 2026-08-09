/**
 * Lead SMS automation orchestration.
 *
 * Safety rules:
 * - Never throw into lead create/update paths (callers should catch).
 * - Customer SMS requires consent and must not send after STOP/opt-out.
 * - Owner new-lead SMS is independent of customer consent.
 * - Stamp automation timestamps before/at claim time so cron retries cannot duplicate.
 * - Real Twilio sends only when SMS_ENABLED=true and credentials exist; otherwise dry-run.
 */
import {
  DEFAULT_APPOINTMENT_TIMEZONE,
  getCanonicalStatus,
  getLead,
  presentLead,
  saveLeadMutation,
  appointmentKeyFromLead,
  appendSmsThreadToLead,
  createSmsThreadEntry,
} from './leadsStore.mjs'
import {
  getGoogleReviewUrl,
  getOwnerSmsPhone,
  getReviewRequestDelayHours,
  isSmsSendingEnabled,
} from './smsConfig.mjs'
import {
  buildAppointmentUpdatedMessage,
  buildBookingConfirmationMessage,
  buildCustomerQuoteReceivedMessage,
  buildOwnerNewLeadMessage,
  buildReminderMessage,
  buildReviewRequestMessage,
} from './smsMessages.mjs'
import { sendSms } from './smsProvider.mjs'
import { isStopKeyword, isStartKeyword, isHelpKeyword } from './smsKeywords.mjs'

export { isStopKeyword, isStartKeyword, isHelpKeyword }

function nowIso(now) {
  return (now || new Date()).toISOString()
}

export function canSendCustomerSms(lead) {
  if (!lead) return false
  if (lead.smsOptedOut === true) return false
  if (lead.smsConsent !== true) return false
  return true
}

/**
 * Decide which customer/owner SMS actions are due for a new Instant Quote lead.
 * Pure helper for tests — does not send.
 */
export function planNewLeadSms(lead) {
  const actions = []
  if (!lead) return actions
  if (lead.source !== 'instant_quote') return actions

  const state = lead.automationState || {}
  if (!state.ownerNewLeadSmsAt) {
    actions.push({ kind: 'owner_new_lead', requiresCustomerConsent: false })
  }
  if (!state.quoteReceivedSmsAt && canSendCustomerSms(lead)) {
    actions.push({ kind: 'customer_quote_received', requiresCustomerConsent: true })
  }
  return actions
}

/**
 * Decide booking confirm / appointment-change / review-due scheduling from before→after.
 * Pure helper for tests.
 */
export function planLeadUpdateSms(before, after) {
  const actions = []
  if (!after) return actions

  const prevStatus = getCanonicalStatus(before?.status)
  const nextStatus = getCanonicalStatus(after.status)
  const prevKey = appointmentKeyFromLead(before)
  const nextKey = appointmentKeyFromLead(after)
  const state = after.automationState || {}

  const becameBooked = nextStatus === 'Booked' && prevStatus !== 'Booked'
  const stayedBooked = nextStatus === 'Booked' && prevStatus === 'Booked'
  const hasAppointment = Boolean(after.appointmentDate && after.appointmentStartTime)

  if (hasAppointment && canSendCustomerSms(after)) {
    if (becameBooked && !state.bookingConfirmSmsAt) {
      actions.push({
        kind: 'customer_booking_confirm',
        appointmentKey: nextKey,
        requiresCustomerConsent: true,
      })
    } else if (
      stayedBooked &&
      state.bookingConfirmSmsAt &&
      nextKey &&
      prevKey &&
      nextKey !== prevKey &&
      state.bookingConfirmForAppointmentKey !== nextKey
    ) {
      // Appointment moved after an initial confirmation — safe update path (not a duplicate confirm).
      actions.push({
        kind: 'customer_appointment_updated',
        appointmentKey: nextKey,
        requiresCustomerConsent: true,
      })
    } else if (
      becameBooked === false &&
      stayedBooked &&
      !state.bookingConfirmSmsAt &&
      // Edge: already Booked in Redis but confirm never sent (e.g. SMS later enabled) — only when appointment fields just became complete.
      hasAppointment &&
      (!before?.appointmentDate || !before?.appointmentStartTime)
    ) {
      actions.push({
        kind: 'customer_booking_confirm',
        appointmentKey: nextKey,
        requiresCustomerConsent: true,
      })
    }
  }

  const becameCompleted = nextStatus === 'Completed' && prevStatus !== 'Completed'
  if (
    becameCompleted &&
    after.smsConsent === true &&
    after.smsOptedOut !== true &&
    !state.reviewRequestSmsAt &&
    !state.reviewRequestDueAt
  ) {
    actions.push({ kind: 'schedule_review_request', requiresCustomerConsent: true })
  }

  return actions
}

async function recordSmsError(leadId, error, deps) {
  if (!leadId || !error) return
  try {
    await (deps.saveLeadMutation || saveLeadMutation)(leadId, (lead) => {
      lead.smsLastError = String(error).slice(0, 240)
    })
  } catch (err) {
    console.error('[sms] failed to persist smsLastError', { leadId, error: err?.message || err })
  }
}

/**
 * Claim an automation slot atomically (stamp before send) to make retries idempotent.
 * @returns {{ claimed: boolean, lead?: object, reason?: string }}
 */
async function claimAutomation(leadId, kind, claimFn, deps) {
  const mutate = deps.saveLeadMutation || saveLeadMutation
  let claimed = false
  let reason = 'already_sent'
  const lead = await mutate(leadId, (current) => {
    const result = claimFn(current)
    if (!result?.claim) {
      reason = result?.reason || 'skipped'
      return
    }
    claimed = true
    reason = 'claimed'
  })
  return { claimed, lead, reason }
}

async function sendAndTrack({ leadId, kind, to, body, deps }) {
  const send = deps.sendSms || sendSms
  const result = await send({ to, body, kind, leadId }, deps)
  if (!result.ok && !result.skipped) {
    await recordSmsError(leadId, result.error || 'send_failed', deps)
  } else if (result.ok && leadId) {
    try {
      await (deps.saveLeadMutation || saveLeadMutation)(leadId, (lead) => {
        if (lead.smsLastError) lead.smsLastError = null
      })
    } catch {
      /* ignore */
    }

    // Persist customer-facing outbound transcripts (not owner notifications).
    const isCustomerFacing = kind !== 'owner_new_lead'
    const isRecordable =
      result.ok &&
      !result.skipped &&
      (typeof deps.sendFn === 'function' || (!result.dryRun && result.sid && result.sid !== 'dry_run'))
    if (isCustomerFacing && isRecordable) {
      try {
        await (deps.saveLeadMutation || saveLeadMutation)(leadId, (lead) => {
          if (!Array.isArray(lead.smsThread)) lead.smsThread = []
          appendSmsThreadToLead(
            lead,
            createSmsThreadEntry({
              direction: 'outbound',
              body,
              at: nowIso(deps.now),
              kind,
              sid: result.sid || null,
              status: result.dryRun ? 'dry_run' : 'sent',
              phone: lead.phone || to,
            }),
          )
        })
      } catch (err) {
        console.error('[sms] failed to store outbound transcript', {
          leadId,
          kind,
          error: err?.message || err,
        })
      }
    }
  }
  return result
}

function canExecuteSends(deps = {}) {
  // Tests inject sendFn. Production requires SMS_ENABLED=true + Twilio config.
  if (typeof deps.sendFn === 'function') return true
  if (deps.forceExecute === true) return true
  return isSmsSendingEnabled()
}

export async function runNewLeadSmsAutomations(leadId, deps = {}) {
  const load = deps.getLead || getLead
  const raw = await load(leadId)
  if (!raw) return { ok: false, reason: 'lead_not_found' }
  const lead = presentLead(raw)
  const plan = planNewLeadSms(lead)

  if (!canExecuteSends(deps)) {
    console.info('[sms] new-lead skipped (SMS not activated)', {
      leadId,
      planned: plan.map((a) => a.kind),
      smsConsent: lead.smsConsent === true,
    })
    return {
      ok: true,
      skipped: true,
      reason: 'sms_disabled',
      sendingEnabled: false,
      planned: plan.map((a) => a.kind),
      results: [],
    }
  }

  const results = []

  for (const action of plan) {
    if (action.kind === 'owner_new_lead') {
      const ownerTo = deps.ownerPhone || getOwnerSmsPhone()
      if (!ownerTo) {
        results.push({ kind: action.kind, ok: false, skipped: true, reason: 'owner_phone_missing' })
        continue
      }
      const claim = await claimAutomation(
        leadId,
        action.kind,
        (current) => {
          current.automationState = current.automationState || {}
          if (current.automationState.ownerNewLeadSmsAt) {
            return { claim: false, reason: 'already_sent' }
          }
          current.automationState.ownerNewLeadSmsAt = nowIso(deps.now)
          return { claim: true }
        },
        deps,
      )
      if (!claim.claimed) {
        results.push({ kind: action.kind, ok: true, skipped: true, reason: claim.reason })
        continue
      }
      const body = buildOwnerNewLeadMessage(claim.lead || lead)
      const sent = await sendAndTrack({ leadId, kind: action.kind, to: ownerTo, body, deps })
      results.push({ kind: action.kind, ...sent })
      continue
    }

    if (action.kind === 'customer_quote_received') {
      if (!canSendCustomerSms(lead)) {
        results.push({ kind: action.kind, ok: true, skipped: true, reason: 'no_consent_or_opted_out' })
        continue
      }
      const claim = await claimAutomation(
        leadId,
        action.kind,
        (current) => {
          if (!canSendCustomerSms(current)) return { claim: false, reason: 'no_consent_or_opted_out' }
          current.automationState = current.automationState || {}
          if (current.automationState.quoteReceivedSmsAt) {
            return { claim: false, reason: 'already_sent' }
          }
          current.automationState.quoteReceivedSmsAt = nowIso(deps.now)
          return { claim: true }
        },
        deps,
      )
      if (!claim.claimed) {
        results.push({ kind: action.kind, ok: true, skipped: true, reason: claim.reason })
        continue
      }
      const body = buildCustomerQuoteReceivedMessage(claim.lead || lead)
      const sent = await sendAndTrack({
        leadId,
        kind: action.kind,
        to: (claim.lead || lead).phone,
        body,
        deps,
      })
      results.push({ kind: action.kind, ...sent })
    }
  }

  return {
    ok: true,
    sendingEnabled: deps.forceDryRun === true ? false : isSmsSendingEnabled(),
    results,
  }
}

export async function runLeadUpdateSmsAutomations(before, after, deps = {}) {
  if (!after?.id) return { ok: false, reason: 'missing_lead' }
  const leadId = after.id
  const plan = planLeadUpdateSms(before, after)

  // Review scheduling is Redis-only (no Twilio) — always allowed so Completed jobs
  // get a dueAt even before SMS_ENABLED is flipped on.
  const scheduleActions = plan.filter((a) => a.kind === 'schedule_review_request')
  const sendActions = plan.filter((a) => a.kind !== 'schedule_review_request')
  const results = []

  for (const action of scheduleActions) {
    const delayHours = deps.reviewDelayHours ?? getReviewRequestDelayHours()
    const dueAt = new Date((deps.now || new Date()).getTime() + delayHours * 3600 * 1000).toISOString()
    await (deps.saveLeadMutation || saveLeadMutation)(leadId, (current) => {
      current.automationState = current.automationState || {}
      if (current.automationState.reviewRequestSmsAt || current.automationState.reviewRequestDueAt) {
        return
      }
      if (current.smsConsent !== true) return
      current.automationState.reviewRequestDueAt = dueAt
    })
    results.push({ kind: action.kind, ok: true, dueAt })
  }

  if (sendActions.length && !canExecuteSends(deps)) {
    console.info('[sms] lead-update sends skipped (SMS not activated)', {
      leadId,
      planned: sendActions.map((a) => a.kind),
    })
    return {
      ok: true,
      skipped: true,
      reason: 'sms_disabled',
      planned: plan.map((a) => a.kind),
      results,
    }
  }

  for (const action of sendActions) {
    if (action.kind === 'customer_booking_confirm' || action.kind === 'customer_appointment_updated') {
      if (!canSendCustomerSms(after)) {
        results.push({ kind: action.kind, ok: true, skipped: true, reason: 'no_consent_or_opted_out' })
        continue
      }
      const appointmentKey = action.appointmentKey || appointmentKeyFromLead(after)
      const claim = await claimAutomation(
        leadId,
        action.kind,
        (current) => {
          if (!canSendCustomerSms(current)) return { claim: false, reason: 'no_consent_or_opted_out' }
          if (getCanonicalStatus(current.status) !== 'Booked') return { claim: false, reason: 'not_booked' }
          if (!current.appointmentDate || !current.appointmentStartTime) {
            return { claim: false, reason: 'missing_appointment' }
          }
          current.automationState = current.automationState || {}
          const state = current.automationState
          const key = appointmentKeyFromLead(current)

          if (action.kind === 'customer_booking_confirm') {
            if (state.bookingConfirmSmsAt) return { claim: false, reason: 'already_sent' }
            state.bookingConfirmSmsAt = nowIso(deps.now)
            state.bookingConfirmForAppointmentKey = key
            state.lastAppointmentKey = key
            return { claim: true }
          }

          // appointment updated
          if (!state.bookingConfirmSmsAt) return { claim: false, reason: 'no_initial_confirm' }
          if (!key || state.bookingConfirmForAppointmentKey === key) {
            return { claim: false, reason: 'same_appointment' }
          }
          state.appointmentChangeSmsAt = nowIso(deps.now)
          state.bookingConfirmForAppointmentKey = key
          state.lastAppointmentKey = key
          // Reminder must be re-eligible for the new slot
          state.reminderSmsAt = null
          state.reminderForAppointmentKey = null
          return { claim: true }
        },
        deps,
      )
      if (!claim.claimed) {
        results.push({ kind: action.kind, ok: true, skipped: true, reason: claim.reason })
        continue
      }
      const lead = claim.lead || after
      const body =
        action.kind === 'customer_booking_confirm'
          ? buildBookingConfirmationMessage(lead)
          : buildAppointmentUpdatedMessage(lead)
      const sent = await sendAndTrack({ leadId, kind: action.kind, to: lead.phone, body, deps })
      results.push({ kind: action.kind, appointmentKey, ...sent })
    }
  }

  return { ok: true, results }
}

export async function sendAppointmentReminderForLead(lead, deps = {}) {
  const leadId = lead?.id
  if (!leadId) return { ok: false, reason: 'missing_lead' }
  if (getCanonicalStatus(lead.status) !== 'Booked') {
    return { ok: true, skipped: true, reason: 'not_booked' }
  }
  if (!canSendCustomerSms(lead)) {
    return { ok: true, skipped: true, reason: 'no_consent_or_opted_out' }
  }
  if (!canExecuteSends(deps)) {
    return { ok: true, skipped: true, reason: 'sms_disabled', kind: 'customer_reminder' }
  }
  const key = appointmentKeyFromLead(lead)
  const claim = await claimAutomation(
    leadId,
    'customer_reminder',
    (current) => {
      if (!canSendCustomerSms(current)) return { claim: false, reason: 'no_consent_or_opted_out' }
      if (getCanonicalStatus(current.status) !== 'Booked') return { claim: false, reason: 'not_booked' }
      current.automationState = current.automationState || {}
      const state = current.automationState
      const currentKey = appointmentKeyFromLead(current)
      if (state.reminderSmsAt && state.reminderForAppointmentKey === currentKey) {
        return { claim: false, reason: 'already_sent' }
      }
      if (state.reminderSmsAt && !state.reminderForAppointmentKey) {
        return { claim: false, reason: 'already_sent' }
      }
      state.reminderSmsAt = nowIso(deps.now)
      state.reminderForAppointmentKey = currentKey
      return { claim: true }
    },
    deps,
  )
  if (!claim.claimed) return { ok: true, skipped: true, reason: claim.reason, kind: 'customer_reminder' }
  const body = buildReminderMessage(claim.lead || lead)
  const sent = await sendAndTrack({
    leadId,
    kind: 'customer_reminder',
    to: (claim.lead || lead).phone,
    body,
    deps,
  })
  return { kind: 'customer_reminder', appointmentKey: key, ...sent }
}

export async function sendReviewRequestForLead(lead, deps = {}) {
  const leadId = lead?.id
  if (!leadId) return { ok: false, reason: 'missing_lead' }
  if (getCanonicalStatus(lead.status) !== 'Completed') {
    return { ok: true, skipped: true, reason: 'not_completed' }
  }
  if (!canSendCustomerSms(lead)) {
    return { ok: true, skipped: true, reason: 'no_consent_or_opted_out' }
  }
  const reviewUrl = deps.reviewUrl ?? getGoogleReviewUrl()
  if (!reviewUrl) {
    return { ok: true, skipped: true, reason: 'review_url_missing' }
  }
  if (!canExecuteSends(deps)) {
    return { ok: true, skipped: true, reason: 'sms_disabled', kind: 'customer_review_request' }
  }

  const claim = await claimAutomation(
    leadId,
    'customer_review_request',
    (current) => {
      if (!canSendCustomerSms(current)) return { claim: false, reason: 'no_consent_or_opted_out' }
      if (getCanonicalStatus(current.status) !== 'Completed') return { claim: false, reason: 'not_completed' }
      current.automationState = current.automationState || {}
      if (current.automationState.reviewRequestSmsAt) {
        return { claim: false, reason: 'already_sent' }
      }
      current.automationState.reviewRequestSmsAt = nowIso(deps.now)
      return { claim: true }
    },
    deps,
  )
  if (!claim.claimed) return { ok: true, skipped: true, reason: claim.reason, kind: 'customer_review_request' }
  const body = buildReviewRequestMessage(claim.lead || lead, reviewUrl)
  const sent = await sendAndTrack({
    leadId,
    kind: 'customer_review_request',
    to: (claim.lead || lead).phone,
    body,
    deps,
  })
  return { kind: 'customer_review_request', ...sent }
}

export { appointmentKeyFromLead, DEFAULT_APPOINTMENT_TIMEZONE }
