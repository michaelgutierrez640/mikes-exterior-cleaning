/**
 * Validation smoke tests for CRM leads Phase 1 (no Redis required).
 * Run: node scripts/test-leads-store.mjs
 */
import assert from 'assert'
import {
  DEFAULT_AUTOMATION_STATE,
  LEGACY_STATUS_MAP,
  LEAD_STATUSES,
  filterLeads,
  getCanonicalStatus,
  normalizeAppointmentDate,
  normalizeAppointmentStartTime,
  parseMoneyAmount,
  phonesMatch,
  presentLead,
  startTimeFromTimeWindow,
  validateLeadAdminUpdate,
  validateLeadIngest,
} from '../lib/leadsStore.mjs'

function ok(name) {
  console.log(`PASS ${name}`)
}

{
  assert.deepEqual(LEAD_STATUSES, ['New', 'Contacted', 'Booked', 'Completed', 'Lost'])
  assert.equal(getCanonicalStatus('New Lead'), 'New')
  assert.equal(getCanonicalStatus('Estimate Scheduled'), 'Contacted')
  assert.equal(getCanonicalStatus('Estimate Sent'), 'Contacted')
  assert.equal(getCanonicalStatus('Booked'), 'Booked')
  assert.equal(LEGACY_STATUS_MAP['New Lead'], 'New')
  ok('canonical status mapping')
}

{
  const r = validateLeadIngest({
    source: 'instant_quote',
    name: 'Alex',
    phone: '2095551212',
    email: 'alex@example.com',
    address: '123 Main St Modesto',
    quotedAmount: 175,
  })
  assert.equal(r.ok, true)
  assert.equal(r.data.quotedAmount, 175)
  ok('instant quote ingest accepts quotedAmount')
}

{
  const r = validateLeadIngest({
    source: 'booking',
    name: 'Alex',
    phone: '2095551212',
    email: 'alex@example.com',
    address: '123 Main St Modesto',
    preferredDate: '2026-09-01',
    timeWindow: 'morning',
    linkedLeadId: 'lead_abc123',
  })
  assert.equal(r.ok, true)
  assert.equal(r.data.linkedLeadId, 'lead_abc123')
  assert.equal(r.data.appointmentDate, '2026-09-01')
  assert.equal(r.data.appointmentStartTime, '08:00')
  assert.equal(r.data.appointmentStatus, 'requested')
  ok('booking ingest sets requested appointment + linkedLeadId')
}

{
  const r = validateLeadIngest({
    source: 'instant_quote',
    name: 'Bot',
    phone: '2095551212',
    email: 'bot@example.com',
    companyWebsite: 'https://spam.test',
  })
  assert.equal(r.ok, false)
  assert.equal(r.status, 204)
  ok('honeypot rejected')
}

{
  assert.equal(parseMoneyAmount('150.5').value, 150.5)
  assert.equal(parseMoneyAmount('$1,200.00').value, 1200)
  assert.equal(parseMoneyAmount('').value, null)
  assert.equal(parseMoneyAmount(-5).ok, false)
  ok('money parsing')
}

{
  assert.equal(normalizeAppointmentDate('2026-08-20').value, '2026-08-20')
  assert.equal(normalizeAppointmentStartTime('9:30').value, '09:30')
  assert.equal(normalizeAppointmentStartTime('25:00').ok, false)
  assert.equal(startTimeFromTimeWindow('afternoon'), '12:00')
  ok('appointment date/time helpers')
}

{
  const existing = {
    status: 'New Lead',
    appointmentDate: null,
    appointmentStartTime: null,
  }
  const missingAppt = validateLeadAdminUpdate({ status: 'Booked' }, existing)
  assert.equal(missingAppt.ok, false)
  ok('Booked requires appointment date/time')

  const withAppt = validateLeadAdminUpdate(
    {
      status: 'Booked',
      appointmentDate: '2026-08-20',
      appointmentStartTime: '09:00',
      quotedAmount: 200,
      bookedAmount: 200,
      paymentStatus: 'unpaid',
    },
    existing,
  )
  assert.equal(withAppt.ok, true)
  assert.equal(withAppt.patch.status, 'Booked')
  assert.equal(withAppt.patch.quotedAmount, 200)
  ok('Booked accepted with appointment + money fields')
}

{
  const legacy = validateLeadAdminUpdate({ status: 'New Lead' }, { status: 'Contacted' })
  assert.equal(legacy.ok, true)
  assert.equal(legacy.patch.status, 'New')
  ok('legacy status label accepted and mapped on admin update')
}

{
  const presented = presentLead({
    id: 'lead_1',
    status: 'New Lead',
    statusHistory: [{ status: 'New Lead', at: '2026-01-01T00:00:00.000Z', by: 'system' }],
    name: 'Pat',
  })
  assert.equal(presented.status, 'New')
  assert.equal(presented.statusHistory[0].status, 'New')
  assert.equal(presented.appointmentTimezone, 'America/Los_Angeles')
  assert.deepEqual(presented.automationState, DEFAULT_AUTOMATION_STATE)
  assert.equal(presented.quotedAmount, null)
  ok('presentLead normalizes legacy records + automation defaults')
}

{
  const leads = [
    { id: '1', status: 'New Lead', name: 'A', source: 'instant_quote', createdAt: '2026-01-02' },
    { id: '2', status: 'Estimate Sent', name: 'B', source: 'contact', createdAt: '2026-01-01' },
    { id: '3', status: 'Booked', name: 'C', source: 'booking', createdAt: '2026-01-03' },
  ]
  const news = filterLeads(leads, { status: 'New' })
  assert.equal(news.length, 1)
  assert.equal(news[0].id, '1')
  const contacted = filterLeads(leads, { status: 'Contacted' })
  assert.equal(contacted.length, 1)
  assert.equal(contacted[0].id, '2')
  ok('filterLeads matches canonical status against legacy values')
}

{
  assert.equal(phonesMatch('(209) 555-1212', '2095551212'), true)
  assert.equal(phonesMatch('2095551212', '5550000'), false)
  ok('phone match helper')
}

{
  // Ensure unspecified admin fields are not forced into the patch
  const patch = validateLeadAdminUpdate({ note: 'Called customer' }, { status: 'New' })
  assert.equal(patch.ok, true)
  assert.equal(patch.patch.note, 'Called customer')
  assert.equal(patch.patch.status, undefined)
  assert.equal(patch.patch.quotedAmount, undefined)
  ok('admin patch only includes provided fields')
}

console.log('\nAll leads store tests passed.')
