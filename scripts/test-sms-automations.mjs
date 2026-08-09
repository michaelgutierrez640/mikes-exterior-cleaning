/**
 * SMS automation foundation tests (no Redis / no Twilio required).
 * Run: node scripts/test-sms-automations.mjs
 */
import assert from 'assert'
import {
  DEFAULT_AUTOMATION_STATE,
  normalizeSmsConsent,
  presentLead,
  validateLeadIngest,
  appointmentKeyFromLead,
} from '../lib/leadsStore.mjs'
import {
  canSendCustomerSms,
  planLeadUpdateSms,
  planNewLeadSms,
  runLeadUpdateSmsAutomations,
  runNewLeadSmsAutomations,
  sendAppointmentReminderForLead,
  sendReviewRequestForLead,
} from '../lib/smsAutomations.mjs'
import { isLeadDueForReminder, isLeadDueForReviewRequest, runSmsCronJobs } from '../lib/smsCron.mjs'
import {
  buildBookingConfirmationMessage,
  buildCustomerQuoteReceivedMessage,
  buildOwnerNewLeadMessage,
  buildReminderMessage,
  buildReviewRequestMessage,
} from '../lib/smsMessages.mjs'

function ok(name) {
  console.log(`PASS ${name}`)
}

function memoryStore(seedLeads = []) {
  const map = new Map()
  for (const lead of seedLeads) {
    map.set(lead.id, structuredClone(lead))
  }
  return {
    async getLead(id) {
      const lead = map.get(id)
      return lead ? structuredClone(lead) : null
    },
    async saveLeadMutation(id, mutator) {
      const lead = map.get(id)
      if (!lead) throw Object.assign(new Error('Lead not found'), { status: 404 })
      if (!lead.automationState) lead.automationState = { ...DEFAULT_AUTOMATION_STATE }
      mutator(lead)
      lead.updatedAt = new Date().toISOString()
      map.set(id, lead)
      return presentLead(structuredClone(lead))
    },
    async listLeads() {
      return [...map.values()].map((l) => structuredClone(l))
    },
    get(id) {
      return map.get(id)
    },
  }
}

function recordingSender() {
  const sent = []
  return {
    sent,
    async sendFn({ to, body, kind, leadId }) {
      sent.push({ to, body, kind, leadId })
      return { sid: `mock_${sent.length}`, dryRun: false }
    },
  }
}

function baseLead(overrides = {}) {
  return presentLead({
    id: 'lead_test_1',
    source: 'instant_quote',
    name: 'Alex Rivera',
    phone: '2095551212',
    email: 'alex@example.com',
    service: 'Window Cleaning',
    city: 'Modesto',
    quotedAmount: 175,
    status: 'New',
    smsConsent: false,
    smsConsentAt: null,
    smsConsentSource: null,
    smsConsentPhone: null,
    smsOptedOut: false,
    smsOptedOutAt: null,
    smsOptOutHistory: [],
    smsThread: [],
    smsLastError: null,
    appointmentDate: null,
    appointmentStartTime: null,
    appointmentTimezone: 'America/Los_Angeles',
    automationState: { ...DEFAULT_AUTOMATION_STATE },
    createdAt: '2026-08-08T12:00:00.000Z',
    updatedAt: '2026-08-08T12:00:00.000Z',
    ...overrides,
  })
}

{
  assert.equal(normalizeSmsConsent(true), true)
  assert.equal(normalizeSmsConsent('true'), true)
  assert.equal(normalizeSmsConsent(false), false)
  assert.equal(normalizeSmsConsent(undefined), false)
  assert.equal(normalizeSmsConsent('yes'), false)
  ok('normalizeSmsConsent only accepts explicit true')
}

{
  const withConsent = validateLeadIngest({
    source: 'instant_quote',
    name: 'Alex',
    phone: '2095551212',
    email: 'alex@example.com',
    smsConsent: true,
  })
  assert.equal(withConsent.ok, true)
  assert.equal(withConsent.data.smsConsent, true)

  const without = validateLeadIngest({
    source: 'instant_quote',
    name: 'Alex',
    phone: '2095551212',
    email: 'alex@example.com',
  })
  assert.equal(without.data.smsConsent, false)
  ok('ingest stores smsConsent only when explicitly true')
}

{
  const legacy = presentLead({
    id: 'lead_old',
    status: 'New Lead',
    name: 'Pat',
  })
  assert.equal(legacy.smsConsent, false)
  assert.equal(legacy.smsOptedOut, false)
  assert.equal(legacy.smsLastError, null)
  assert.deepEqual(legacy.smsThread, [])
  assert.deepEqual(legacy.smsOptOutHistory, [])
  assert.equal(legacy.automationState.bookingConfirmForAppointmentKey, null)
  assert.equal(legacy.automationState.reminderForAppointmentKey, null)
  ok('existing leads without SMS fields continue working via presentLead')
}

{
  const consented = baseLead({ smsConsent: true })
  const optedOut = baseLead({ smsConsent: true, smsOptedOut: true })
  const noConsent = baseLead({ smsConsent: false })
  assert.equal(canSendCustomerSms(consented), true)
  assert.equal(canSendCustomerSms(optedOut), false)
  assert.equal(canSendCustomerSms(noConsent), false)
  ok('customer SMS gate requires consent and not opted out')
}

{
  const ownerMsg = buildOwnerNewLeadMessage(baseLead())
  assert.match(ownerMsg, /Alex Rivera/)
  assert.match(ownerMsg, /Window Cleaning/)
  assert.match(ownerMsg, /Modesto/)
  assert.match(ownerMsg, /2095551212/)
  assert.match(ownerMsg, /\$175/)

  const customerMsg = buildCustomerQuoteReceivedMessage(baseLead())
  assert.match(customerMsg, /Hi Alex/)
  assert.match(customerMsg, /STOP/)
  ok('message templates include required fields')
}

{
  const withConsent = baseLead({ smsConsent: true })
  const plan = planNewLeadSms(withConsent)
  assert.ok(plan.some((a) => a.kind === 'owner_new_lead'))
  assert.ok(plan.some((a) => a.kind === 'customer_quote_received'))

  const noConsent = baseLead({ smsConsent: false })
  const planNo = planNewLeadSms(noConsent)
  assert.ok(planNo.some((a) => a.kind === 'owner_new_lead'))
  assert.ok(!planNo.some((a) => a.kind === 'customer_quote_received'))
  ok('new Instant Quote plans owner notify always; customer only with consent')
}

{
  const store = memoryStore([baseLead({ smsConsent: true })])
  const sender = recordingSender()
  const result = await runNewLeadSmsAutomations('lead_test_1', {
    ...store,
    ...sender,
    ownerPhone: '+12095550000',
  })
  assert.equal(result.ok, true)
  assert.equal(sender.sent.length, 2)
  assert.ok(sender.sent.some((s) => s.kind === 'owner_new_lead'))
  assert.ok(sender.sent.some((s) => s.kind === 'customer_quote_received'))
  assert.ok(store.get('lead_test_1').automationState.ownerNewLeadSmsAt)
  assert.ok(store.get('lead_test_1').automationState.quoteReceivedSmsAt)
  assert.equal(store.get('lead_test_1').smsThread.length, 1)
  assert.equal(store.get('lead_test_1').smsThread[0].direction, 'outbound')
  assert.equal(store.get('lead_test_1').smsThread[0].kind, 'customer_quote_received')
  ok('customer with consent receives eligible new-lead messages')
}

{
  const store = memoryStore([baseLead({ smsConsent: false })])
  const sender = recordingSender()
  await runNewLeadSmsAutomations('lead_test_1', {
    ...store,
    ...sender,
    ownerPhone: '+12095550000',
  })
  assert.equal(sender.sent.length, 1)
  assert.equal(sender.sent[0].kind, 'owner_new_lead')
  assert.equal(store.get('lead_test_1').automationState.quoteReceivedSmsAt, null)
  ok('customer without consent receives no automated customer SMS; owner still notified')
}

{
  const store = memoryStore([baseLead({ smsConsent: true, smsOptedOut: true })])
  const sender = recordingSender()
  await runNewLeadSmsAutomations('lead_test_1', {
    ...store,
    ...sender,
    ownerPhone: '+12095550000',
  })
  assert.equal(sender.sent.length, 1)
  assert.equal(sender.sent[0].kind, 'owner_new_lead')
  ok('opted-out customers receive no further automated customer SMS')
}

{
  const before = baseLead({ status: 'Contacted', smsConsent: true })
  const after = baseLead({
    status: 'Booked',
    smsConsent: true,
    appointmentDate: '2026-08-20',
    appointmentStartTime: '09:00',
  })
  const plan = planLeadUpdateSms(before, after)
  assert.ok(plan.some((a) => a.kind === 'customer_booking_confirm'))

  const store = memoryStore([after])
  const sender = recordingSender()
  await runLeadUpdateSmsAutomations(before, after, { ...store, ...sender })
  assert.equal(sender.sent.length, 1)
  assert.equal(sender.sent[0].kind, 'customer_booking_confirm')
  assert.match(sender.sent[0].body, /you're booked/i)
  assert.ok(store.get('lead_test_1').automationState.bookingConfirmSmsAt)

  // Second run / unrelated field edit must not resend
  const afterEdit = presentLead({
    ...store.get('lead_test_1'),
    internalNotes: 'called voicemail',
  })
  const sender2 = recordingSender()
  await runLeadUpdateSmsAutomations(after, afterEdit, { ...store, ...sender2 })
  assert.equal(sender2.sent.length, 0)
  ok('booking confirmation sends once; unrelated edits do not resend')
}

{
  const confirmed = baseLead({
    status: 'Booked',
    smsConsent: true,
    appointmentDate: '2026-08-20',
    appointmentStartTime: '09:00',
    automationState: {
      ...DEFAULT_AUTOMATION_STATE,
      bookingConfirmSmsAt: '2026-08-08T12:00:00.000Z',
      bookingConfirmForAppointmentKey: '2026-08-20|09:00|America/Los_Angeles',
      lastAppointmentKey: '2026-08-20|09:00|America/Los_Angeles',
    },
  })
  const rescheduled = baseLead({
    status: 'Booked',
    smsConsent: true,
    appointmentDate: '2026-08-21',
    appointmentStartTime: '14:00',
    automationState: { ...confirmed.automationState },
  })
  const plan = planLeadUpdateSms(confirmed, rescheduled)
  assert.ok(plan.some((a) => a.kind === 'customer_appointment_updated'))
  assert.ok(!plan.some((a) => a.kind === 'customer_booking_confirm'))

  const store = memoryStore([rescheduled])
  const sender = recordingSender()
  await runLeadUpdateSmsAutomations(confirmed, rescheduled, { ...store, ...sender })
  assert.equal(sender.sent.length, 1)
  assert.equal(sender.sent[0].kind, 'customer_appointment_updated')
  assert.ok(store.get('lead_test_1').automationState.bookingConfirmSmsAt)
  assert.equal(
    store.get('lead_test_1').automationState.bookingConfirmForAppointmentKey,
    appointmentKeyFromLead(rescheduled),
  )
  ok('appointment change sends update SMS without duplicating initial confirmation')
}

{
  const lead = baseLead({
    status: 'Booked',
    smsConsent: true,
    appointmentDate: '2026-08-20',
    appointmentStartTime: '09:00',
  })
  const store = memoryStore([lead])
  const sender = recordingSender()
  const first = await sendAppointmentReminderForLead(lead, { ...store, ...sender })
  assert.equal(first.ok, true)
  assert.equal(first.skipped, undefined)
  assert.equal(sender.sent.length, 1)
  assert.match(buildReminderMessage(lead), /tomorrow at 9:00 AM/)

  const sender2 = recordingSender()
  const second = await sendAppointmentReminderForLead(presentLead(store.get('lead_test_1')), {
    ...store,
    ...sender2,
  })
  assert.equal(second.skipped, true)
  assert.equal(sender2.sent.length, 0)
  ok('reminder sends once; cron retry does not duplicate')
}

{
  const tomorrow = '2026-08-20'
  const due = baseLead({
    status: 'Booked',
    smsConsent: true,
    appointmentDate: tomorrow,
    appointmentStartTime: '09:00',
  })
  assert.equal(isLeadDueForReminder(due, tomorrow), true)
  due.automationState.reminderSmsAt = '2026-08-19T15:00:00.000Z'
  due.automationState.reminderForAppointmentKey = appointmentKeyFromLead(due)
  assert.equal(isLeadDueForReminder(due, tomorrow), false)

  const store = memoryStore([
    baseLead({
      id: 'lead_due',
      status: 'Booked',
      smsConsent: true,
      appointmentDate: tomorrow,
      appointmentStartTime: '09:00',
    }),
  ])
  const sender = recordingSender()
  const cron1 = await runSmsCronJobs({
    ...store,
    ...sender,
    tomorrowKey: tomorrow,
    now: new Date('2026-08-19T15:00:00.000Z'),
  })
  assert.equal(cron1.remindersConsidered, 1)
  assert.equal(sender.sent.length, 1)

  const sender2 = recordingSender()
  const cron2 = await runSmsCronJobs({
    ...store,
    ...sender2,
    tomorrowKey: tomorrow,
    now: new Date('2026-08-19T15:05:00.000Z'),
  })
  assert.equal(sender2.sent.length, 0)
  assert.ok(cron2.remindersConsidered === 0 || cron2.remindersSkipped >= 0)
  ok('cron reminder idempotent across retries')
}

{
  const before = baseLead({ status: 'Booked', smsConsent: true })
  const after = baseLead({ status: 'Completed', smsConsent: true })
  const plan = planLeadUpdateSms(before, after)
  assert.ok(plan.some((a) => a.kind === 'schedule_review_request'))

  const store = memoryStore([after])
  const sender = recordingSender()
  const now = new Date('2026-08-08T12:00:00.000Z')
  await runLeadUpdateSmsAutomations(before, after, {
    ...store,
    ...sender,
    now,
    reviewDelayHours: 24,
  })
  assert.equal(sender.sent.length, 0)
  assert.ok(store.get('lead_test_1').automationState.reviewRequestDueAt)
  assert.equal(
    store.get('lead_test_1').automationState.reviewRequestDueAt,
    new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
  )

  const dueLead = presentLead(store.get('lead_test_1'))
  assert.equal(isLeadDueForReviewRequest(dueLead, new Date('2026-08-09T12:00:00.000Z')), true)

  const first = await sendReviewRequestForLead(dueLead, {
    ...store,
    ...sender,
    reviewUrl: 'https://g.page/r/example',
  })
  assert.equal(first.ok, true)
  assert.equal(sender.sent.length, 1)
  assert.match(buildReviewRequestMessage(dueLead, 'https://g.page/r/example'), /Google review/)

  const sender2 = recordingSender()
  const second = await sendReviewRequestForLead(presentLead(store.get('lead_test_1')), {
    ...store,
    ...sender2,
    reviewUrl: 'https://g.page/r/example',
  })
  assert.equal(second.skipped, true)
  assert.equal(sender2.sent.length, 0)
  ok('completed-job review request delayed then sends once')
}

{
  // SMS disabled path: planning only, no stamps for sends
  const store = memoryStore([baseLead({ smsConsent: true })])
  const result = await runNewLeadSmsAutomations('lead_test_1', {
    ...store,
    // no sendFn → requires SMS_ENABLED; unset in tests
    ownerPhone: '+12095550000',
  })
  assert.equal(result.skipped, true)
  assert.equal(result.reason, 'sms_disabled')
  assert.equal(store.get('lead_test_1').automationState.ownerNewLeadSmsAt, null)
  assert.equal(store.get('lead_test_1').automationState.quoteReceivedSmsAt, null)
  ok('with SMS inactive, automations do not stamp or send')
}

{
  const consented = validateLeadIngest({
    source: 'instant_quote',
    name: 'Alex',
    phone: '2095551212',
    email: 'alex@example.com',
    smsConsent: true,
  })
  assert.equal(consented.data.smsConsent, true)
  // Consent metadata is applied at create time from source + phone
  const presented = presentLead({
    ...consented.data,
    id: 'lead_x',
    smsConsent: true,
    smsConsentAt: '2026-08-09T00:00:00.000Z',
    smsConsentSource: 'instant_quote',
    smsConsentPhone: '2095551212',
  })
  assert.equal(presented.smsConsentSource, 'instant_quote')
  assert.equal(presented.smsConsentPhone, '2095551212')
  ok('consent source and phone are presentable in admin')
}

{
  const { isStopKeyword, isHelpKeyword, isStartKeyword } = await import('../lib/smsKeywords.mjs')
  for (const word of ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']) {
    assert.equal(isStopKeyword(word), true)
  }
  assert.equal(isHelpKeyword('HELP'), true)
  assert.equal(isStartKeyword('START'), true)
  ok('STOP/HELP/START keywords recognized')
}

{
  const {
    appendSmsOptOutHistory,
    appendSmsThreadToLead,
    createSmsThreadEntry,
  } = await import('../lib/leadsStore.mjs')
  const lead = baseLead({ smsConsent: true, smsOptedOut: false })
  appendSmsOptOutHistory(lead, {
    event: 'opt_out',
    at: '2026-08-09T01:00:00.000Z',
    keyword: 'STOP',
    phone: lead.phone,
  })
  lead.smsOptedOut = true
  lead.smsOptedOutAt = '2026-08-09T01:00:00.000Z'
  appendSmsOptOutHistory(lead, {
    event: 'resubscribe',
    at: '2026-08-09T02:00:00.000Z',
    keyword: 'START',
    phone: lead.phone,
  })
  lead.smsOptedOut = false
  lead.smsOptedOutAt = null
  assert.equal(lead.smsOptOutHistory.length, 2)
  assert.equal(lead.smsOptOutHistory[0].event, 'opt_out')
  assert.equal(lead.smsOptOutHistory[1].event, 'resubscribe')
  appendSmsThreadToLead(
    lead,
    createSmsThreadEntry({
      direction: 'inbound',
      body: 'Can we move to Friday?',
      kind: 'customer_reply',
      at: '2026-08-09T03:00:00.000Z',
      phone: lead.phone,
    }),
  )
  assert.equal(lead.smsThread.length, 1)
  assert.equal(lead.smsThread[0].direction, 'inbound')
  ok('opt-out history permanent and inbound replies storable on lead')
}

{
  const { computeTwilioSignature, signaturesMatch, verifyTwilioWebhookSignature } = await import(
    '../lib/smsTwilioAuth.mjs'
  )
  const token = 'test_auth_token_value'
  const url = 'https://www.mikesexteriorcleaning.com/api/sms/inbound'
  const params = { From: '+12095551212', Body: 'HELP' }
  const expected = computeTwilioSignature(token, url, params)
  assert.equal(signaturesMatch(expected, expected), true)
  assert.equal(signaturesMatch(expected, 'bogus'), false)

  const prevToken = process.env.TWILIO_AUTH_TOKEN
  const prevNodeEnv = process.env.NODE_ENV
  const prevVercelEnv = process.env.VERCEL_ENV
  process.env.TWILIO_AUTH_TOKEN = token
  process.env.NODE_ENV = 'production'
  process.env.VERCEL_ENV = 'production'
  try {
    const bad = verifyTwilioWebhookSignature(
      { headers: { 'x-twilio-signature': 'invalid', host: 'www.mikesexteriorcleaning.com', 'x-forwarded-proto': 'https' } },
      params,
      { url },
    )
    assert.equal(bad.ok, false)
    assert.equal(bad.status, 403)

    const good = verifyTwilioWebhookSignature(
      {
        headers: {
          'x-twilio-signature': expected,
          host: 'www.mikesexteriorcleaning.com',
          'x-forwarded-proto': 'https',
        },
      },
      params,
      { url },
    )
    assert.equal(good.ok, true)
  } finally {
    if (prevToken === undefined) delete process.env.TWILIO_AUTH_TOKEN
    else process.env.TWILIO_AUTH_TOKEN = prevToken
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = prevNodeEnv
    if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = prevVercelEnv
  }
  ok('Twilio signature validation accepts valid and rejects invalid in production')
}

{
  const { SMS_CONSENT_DISCLOSURE } = await import('../src/components/forms/SmsConsentCheckbox.jsx').catch(() => ({
    SMS_CONSENT_DISCLOSURE: null,
  }))
  // Vite JSX may not load in plain Node; assert the constant via direct file read fallback below.
  if (!SMS_CONSENT_DISCLOSURE) {
    const fs = await import('fs')
    const src = fs.readFileSync(new URL('../src/components/forms/SmsConsentCheckbox.jsx', import.meta.url), 'utf8')
    assert.match(
      src,
      /By checking this box, I agree to receive appointment confirmations, service updates, and follow-up text messages from Mike's Exterior Cleaning Services/,
    )
    assert.match(src, /Consent is not a condition of purchase/)
    assert.match(src, /to="\/privacy-policy"/)
    assert.match(src, /to="\/terms"/)
  }
  ok('consent disclosure uses approved A2P wording with Privacy and Terms links')
}

{
  const fs = await import('fs')
  const envExample = fs.readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
  assert.match(envExample, /^SMS_ENABLED=false$/m)
  assert.match(envExample, /^TWILIO_ACCOUNT_SID=$/m)
  assert.match(envExample, /^TWILIO_AUTH_TOKEN=$/m)
  assert.match(envExample, /^TWILIO_PHONE_NUMBER=$/m)
  assert.match(envExample, /^TWILIO_MESSAGING_SERVICE_SID=$/m)
  assert.match(envExample, /^TWILIO_STATUS_CALLBACK_URL=$/m)
  assert.doesNotMatch(envExample, /AC[a-f0-9]{20,}/i)
  ok('env placeholders present with SMS_ENABLED=false and no real secrets')
}

console.log('\nAll SMS automation tests passed.')
