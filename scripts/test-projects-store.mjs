/**
 * Lightweight validation smoke tests for completed-jobs store (no Redis/Blob required).
 * Run: node scripts/test-projects-store.mjs
 */
import assert from 'assert'
import {
  buildProjectSlug,
  validateProjectInput,
} from '../lib/projectsStore.mjs'

function ok(name) {
  console.log(`PASS ${name}`)
}

{
  const r = validateProjectInput({
    service: 'window-cleaning',
    city: 'manteca',
    propertyType: 'residential',
    completedAt: '2026-07-18',
    notes: 'Union Ranch patio doors',
    photos: [{ url: 'https://blob.example/a.jpg', label: 'after' }],
    status: 'draft',
  })
  assert.equal(r.ok, true)
  assert.equal(r.data.photos[0].label, 'after')
  ok('create draft with photo')
}

{
  const r = validateProjectInput({
    service: 'window-cleaning',
    city: 'manteca',
    propertyType: 'residential',
    completedAt: '2026-07-18',
    notes: '',
    photos: [],
    status: 'published',
  })
  assert.equal(r.ok, false)
  ok('reject publish without photos')
}

{
  const r = validateProjectInput({ service: 'not-a-service' }, { partial: true })
  assert.equal(r.ok, false)
  ok('reject invalid service')
}

{
  const r = validateProjectInput(
    {
      photos: [{ url: 'http://insecure.example/a.jpg', label: 'before' }],
    },
    { partial: true },
  )
  assert.equal(r.ok, false)
  ok('reject non-https photo urls')
}

{
  const slug = buildProjectSlug({
    service: 'window-cleaning',
    city: 'manteca',
    completedAt: '2026-07-18',
    id: 'abcdef12-3456-7890',
  })
  assert.match(slug, /window-cleaning-manteca-2026-07-18-abcdef12/)
  ok('slug generation')
}

console.log('All projectsStore validation checks passed.')
