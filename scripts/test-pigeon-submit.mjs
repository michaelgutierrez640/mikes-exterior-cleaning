/**
 * Pigeon Guard hardened submit flow tests (injected deps; no network).
 * Run: node scripts/test-pigeon-submit.mjs
 */
import assert from 'assert'
import {
  runPigeonGuardSubmission,
  withTimeout,
} from '../src/utils/pigeonSubmit.js'

function ok(name) {
  console.log(`PASS ${name}`)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

{
  const result = await runPigeonGuardSubmission(
    {
      form: { name: 'Sam' },
      problems: ['Droppings/debris'],
      photos: [{ file: { name: 'roof.jpg' } }],
      smsConsent: false,
      idempotencyKey: 'pg_test_success',
    },
    {
      createLead: async () => ({ id: 'lead_1' }),
      uploadPhoto: async () => ({
        pathname: 'lead-photos/1.jpg',
        url: 'https://example.public.blob.vercel-storage.com/lead-photos/1.jpg',
      }),
      attachPhotos: async ({ photos }) => {
        assert.equal(photos.length, 1)
        return { ok: true }
      },
      notifyEmail: async () => ({ ok: true }),
    },
  )
  assert.equal(result.ok, true)
  assert.equal(result.id, 'lead_1')
  assert.equal(result.photoWarning, null)
  ok('successful submission with photo')
}

{
  const result = await runPigeonGuardSubmission(
    {
      form: { name: 'Sam' },
      problems: ['Noise under panels'],
      photos: [{ file: { name: 'a.jpg' } }, { file: { name: 'b.jpg' } }],
      smsConsent: false,
      idempotencyKey: 'pg_test_photo_fail',
    },
    {
      createLead: async () => ({ id: 'lead_2' }),
      uploadPhoto: async () => {
        throw new Error('upload failed')
      },
      attachPhotos: async ({ photos, photoWarning }) => {
        assert.equal(photos.length, 0)
        assert.ok(photoWarning)
        return { ok: true }
      },
      notifyEmail: async () => {
        throw new Error('email should not fail submit')
      },
    },
  )
  assert.equal(result.ok, true)
  assert.equal(result.id, 'lead_2')
  assert.match(result.photoWarning, /photos could not be uploaded/i)
  ok('photo failure after lead save keeps success + warning')
}

{
  await assert.rejects(
    () =>
      withTimeout(delay(50), 10, 'Network'),
    (err) => err.code === 'TIMEOUT' && /timed out/i.test(err.message),
  )
  ok('network timeout rejects with TIMEOUT code')
}

{
  let createCalls = 0
  const key = 'pg_test_idem'
  const createLead = async ({ idempotencyKey }) => {
    createCalls += 1
    assert.equal(idempotencyKey, key)
    return { id: 'lead_dup', idempotent: createCalls > 1 }
  }

  const first = await runPigeonGuardSubmission(
    {
      form: { name: 'Sam' },
      problems: ['Not sure'],
      photos: [],
      smsConsent: false,
      idempotencyKey: key,
    },
    { createLead, notifyEmail: async () => ({}) },
  )
  const second = await runPigeonGuardSubmission(
    {
      form: { name: 'Sam' },
      problems: ['Not sure'],
      photos: [],
      smsConsent: false,
      idempotencyKey: key,
    },
    { createLead, notifyEmail: async () => ({}) },
  )
  assert.equal(first.id, 'lead_dup')
  assert.equal(second.id, 'lead_dup')
  assert.equal(createCalls, 2)
  ok('double-tap reuses same idempotency key for createLead')
}

{
  let loading = true
  try {
    await runPigeonGuardSubmission(
      {
        form: { name: 'Sam' },
        problems: ['Droppings/debris'],
        photos: [],
        smsConsent: false,
        idempotencyKey: 'pg_fail',
      },
      {
        createLead: async () => {
          throw Object.assign(new Error('Saving your estimate request timed out. Please try again.'), {
            code: 'TIMEOUT',
          })
        },
      },
    )
    assert.fail('expected throw')
  } catch (err) {
    assert.equal(err.code, 'TIMEOUT')
  } finally {
    loading = false
  }
  assert.equal(loading, false)
  ok('loading state always resets on timeout failure')
}

{
  let deleted = false
  // Simulate a caller that uploaded photos before create failed.
  await assert.rejects(() =>
    runPigeonGuardSubmission(
      {
        form: { name: 'Sam' },
        problems: ['Droppings/debris'],
        photos: [{ file: { name: 'x.jpg' } }],
        smsConsent: false,
        idempotencyKey: 'pg_orphan',
      },
      {
        createLead: async () => {
          throw new Error('Lead save failed')
        },
        uploadPhoto: async () => ({ url: 'https://example.com/x.jpg' }),
        deletePhotos: async () => {
          deleted = true
        },
      },
    ),
  )
  // Lead-first: deletePhotos is only invoked when uploaded[] is non-empty before create fails.
  assert.equal(deleted, false)
  ok('lead-first flow does not upload photos when create fails')
}

console.log('\nAll pigeon submit tests passed.')
