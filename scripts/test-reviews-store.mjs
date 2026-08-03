/**
 * Validation smoke tests for website customer reviews (no Redis required).
 * Run: node scripts/test-reviews-store.mjs
 */
import assert from 'assert'
import {
  filterReviews,
  normalizeDuplicateKey,
  parseStarRating,
  toPublicReview,
  validateReviewAdminUpdate,
  validateReviewIngest,
} from '../lib/reviewsStore.mjs'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

function ok(name) {
  console.log(`PASS ${name}`)
}

{
  const r = validateReviewIngest({
    name: 'Jane',
    rating: 5,
    reviewText: 'Great window cleaning job!',
  })
  assert.equal(r.ok, true)
  assert.equal(r.data.name, 'Jane')
  assert.equal(r.data.rating, 5)
  assert.equal(r.data.displayPermission, true)
  ok('accept valid review with star rating')
}

{
  const r = validateReviewIngest({
    name: 'Jane',
    reviewText: 'Great window cleaning job!',
  })
  assert.equal(r.ok, false)
  ok('reject without star rating')
}

{
  const r = validateReviewIngest({
    name: 'Jane',
    rating: 0,
    reviewText: 'Great window cleaning job!',
  })
  assert.equal(r.ok, false)
  ok('reject rating below 1')
}

{
  const r = validateReviewIngest({
    name: 'Jane',
    rating: 6,
    reviewText: 'Great window cleaning job!',
  })
  assert.equal(r.ok, false)
  ok('reject rating above 5')
}

{
  assert.equal(parseStarRating('3').ok, true)
  assert.equal(parseStarRating('3').value, 3)
  ok('parse string star rating')
}

{
  const r = validateReviewIngest({
    name: '',
    rating: 4,
    reviewText: 'Great window cleaning job!',
  })
  assert.equal(r.ok, false)
  ok('reject missing name')
}

{
  const r = validateReviewIngest({
    name: 'Jane',
    rating: 4,
    reviewText: 'short',
  })
  assert.equal(r.ok, false)
  ok('reject too-short review')
}

{
  const r = validateReviewIngest({
    name: 'Bot',
    rating: 5,
    reviewText: 'Great window cleaning job!',
    companyWebsite: 'https://spam.example',
  })
  assert.equal(r.ok, false)
  assert.equal(r.status, 204)
  ok('honeypot rejected with silent status')
}

{
  const r = validateReviewIngest({
    name: '<script>alert(1)</script>',
    rating: 5,
    reviewText: 'Great window cleaning job!',
  })
  assert.equal(r.ok, false)
  ok('reject script-like name')
}

{
  const r = validateReviewIngest({
    name: 'Jane',
    rating: 5,
    reviewText: 'Call me at 209-555-1212 after you clean my windows please!',
  })
  assert.equal(r.ok, true)
  assert.match(r.data.reviewText, /\[redacted\]/)
  ok('sanitize phone numbers from review text')
}

{
  const a = normalizeDuplicateKey('Jane Doe', 'Great job!')
  const b = normalizeDuplicateKey(' jane  doe ', 'great   job!')
  assert.equal(a, b)
  ok('duplicate key normalizes whitespace and case')
}

{
  const r = validateReviewAdminUpdate({ status: 'approved' })
  assert.equal(r.ok, true)
  assert.equal(r.data.status, 'approved')
  ok('admin can approve')
}

{
  const r = validateReviewAdminUpdate({ status: 'rejected', published: true })
  assert.equal(r.ok, false)
  ok('cannot publish rejected in same update')
}

{
  const r = validateReviewAdminUpdate({
    reviewText: 'Fixed spelling — excellent work on the windows.',
  })
  assert.equal(r.ok, true)
  ok('admin can correct spelling in review text')
}

{
  const pending = {
    id: 'rev_1',
    name: 'A',
    rating: 5,
    reviewText: 'Pending review text here',
    status: 'pending',
    published: false,
    displayPermission: true,
    createdAt: '2026-08-01T00:00:00.000Z',
  }
  const approvedUnpublished = {
    ...pending,
    id: 'rev_2',
    status: 'approved',
    published: false,
  }
  const live = {
    ...pending,
    id: 'rev_3',
    status: 'approved',
    published: true,
  }
  const filtered = filterReviews([pending, approvedUnpublished, live], {
    status: 'approved',
    published: true,
  })
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].id, 'rev_3')
  ok('only approved+published appear in published filter')
}

{
  const publicItem = toPublicReview({
    id: 'rev_9',
    name: 'Sam',
    rating: 4,
    reviewText: 'Wonderful service',
    status: 'approved',
    published: true,
    email: 'secret@example.com',
    createdAt: '2026-08-01T00:00:00.000Z',
  })
  assert.equal(publicItem.source, 'website')
  assert.equal(publicItem.rating, 4)
  assert.equal(publicItem.email, undefined)
  ok('public review shape includes rating and omits private fields')
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const seoSrc = readFileSync(join(here, '../src/config/seo.js'), 'utf8')
  assert.match(seoSrc, /export function getReviewPageSchemas/)
  assert.match(seoSrc, /no Review \/ AggregateRating schema/)
  const fnBody = seoSrc.slice(seoSrc.indexOf('export function getReviewPageSchemas'))
  const untilNext = fnBody.slice(0, fnBody.indexOf('\nexport function getInstantQuotePageSeo'))
  assert.doesNotMatch(untilNext, /'@type': 'Review'/)
  assert.doesNotMatch(untilNext, /AggregateRating/)
  ok('review page schemas exclude Review / AggregateRating')
}

console.log('All reviewsStore validation checks passed.')
