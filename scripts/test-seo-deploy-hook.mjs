#!/usr/bin/env node
/**
 * Unit tests for Production SEO deploy-hook gating + trigger behavior.
 * Does not call a real Vercel hook unless VERCEL_DEPLOY_HOOK_URL is set and
 * SEO_DEPLOY_HOOK_LIVE_TEST=1.
 */
import assert from 'assert'
import {
  SEO_WARNING_TRIGGER_FAILED,
  publicSeoFingerprint,
  resetSeoDeployHookMemoryForTests,
  shouldTriggerSeoRebuild,
  triggerProductionSeoRebuild,
} from '../lib/seoDeployHook.mjs'

const draft = {
  status: 'draft',
  slug: 'window-cleaning-modesto-draft',
  service: 'window-cleaning',
  city: 'modesto',
  propertyType: 'residential',
  completedAt: '2026-08-01',
  notes: 'draft notes',
  photos: [{ url: 'https://example.com/a.jpg' }],
}

const published = {
  ...draft,
  status: 'published',
  slug: 'window-cleaning-modesto-2026-08-01-abc',
}

function section(title) {
  console.log(`\n== ${title}`)
}

section('shouldTriggerSeoRebuild rules')
assert.strictEqual(shouldTriggerSeoRebuild({ previous: null, next: draft, action: 'save' }), false)
assert.strictEqual(shouldTriggerSeoRebuild({ previous: draft, next: { ...draft, notes: 'x' }, action: 'save' }), false)
assert.strictEqual(shouldTriggerSeoRebuild({ previous: draft, next: published, action: 'save' }), true)
assert.strictEqual(shouldTriggerSeoRebuild({ previous: published, next: draft, action: 'save' }), true)
assert.strictEqual(
  shouldTriggerSeoRebuild({
    previous: published,
    next: { ...published, city: 'tracy' },
    action: 'save',
  }),
  true,
)
assert.strictEqual(
  shouldTriggerSeoRebuild({
    previous: published,
    next: { ...published, notes: 'updated public notes' },
    action: 'save',
  }),
  true,
)
assert.strictEqual(
  shouldTriggerSeoRebuild({
    previous: published,
    next: { ...published },
    action: 'save',
  }),
  false,
)
assert.strictEqual(shouldTriggerSeoRebuild({ previous: published, next: null, action: 'delete' }), true)
assert.strictEqual(shouldTriggerSeoRebuild({ previous: draft, next: null, action: 'delete' }), false)
assert.ok(publicSeoFingerprint(published))
assert.strictEqual(publicSeoFingerprint(draft), null)
console.log('PASS gating rules')

section('failed hook (missing env)')
const prevUrl = process.env.VERCEL_DEPLOY_HOOK_URL
delete process.env.VERCEL_DEPLOY_HOOK_URL
const failed = await triggerProductionSeoRebuild({ reason: 'test_missing_env' })
assert.strictEqual(failed.ok, false)
assert.strictEqual(failed.triggered, false)
assert.strictEqual(failed.warning, SEO_WARNING_TRIGGER_FAILED)
assert.strictEqual(failed.seo.state, 'failed')
assert.ok(!JSON.stringify(failed).includes('http'))
console.log('PASS missing hook fails safely with admin warning')

section('successful hook (mocked fetch)')
process.env.VERCEL_DEPLOY_HOOK_URL = 'https://api.vercel.com/v1/integrations/deploy/test-hook-id'
const originalFetch = globalThis.fetch
let fetchCalls = 0
globalThis.fetch = async (url, init) => {
  fetchCalls += 1
  assert.strictEqual(String(url), process.env.VERCEL_DEPLOY_HOOK_URL)
  assert.strictEqual(init?.method, 'POST')
  return { ok: true, status: 201 }
}
try {
  resetSeoDeployHookMemoryForTests()
  const okResult = await triggerProductionSeoRebuild({ reason: `test_success_${Date.now()}` })
  assert.strictEqual(okResult.ok, true)
  assert.strictEqual(okResult.triggered, true)
  assert.strictEqual(okResult.warning, null)
  assert.strictEqual(okResult.seo.state, 'queued')
  assert.ok(okResult.seo.lastSuccessAt)
  assert.ok(!JSON.stringify(okResult).includes('integrations/deploy'))
  console.log('PASS mocked successful trigger', { fetchCalls })

  section('rapid double tap / debounce')
  fetchCalls = 0
  resetSeoDeployHookMemoryForTests()
  const first = await triggerProductionSeoRebuild({ reason: `test_debounce_a_${Date.now()}` })
  const second = await triggerProductionSeoRebuild({ reason: `test_debounce_b_${Date.now()}` })
  assert.strictEqual(first.ok, true)
  assert.strictEqual(first.triggered, true)
  assert.strictEqual(second.ok, true)
  assert.strictEqual(second.deduped, true)
  assert.strictEqual(second.triggered, false)
  assert.strictEqual(fetchCalls, 1)
  console.log('PASS debounce collapsed second trigger')

  section('HTTP failure from hook')
  resetSeoDeployHookMemoryForTests()
  globalThis.fetch = async () => ({ ok: false, status: 500 })
  const boom = await triggerProductionSeoRebuild({ reason: `test_http_fail_${Date.now()}` })
  assert.strictEqual(boom.ok, false)
  assert.strictEqual(boom.warning, SEO_WARNING_TRIGGER_FAILED)
  assert.strictEqual(boom.seo.state, 'failed')
  console.log('PASS failed HTTP hook path')
} finally {
  globalThis.fetch = originalFetch
  resetSeoDeployHookMemoryForTests()
  if (prevUrl === undefined) delete process.env.VERCEL_DEPLOY_HOOK_URL
  else process.env.VERCEL_DEPLOY_HOOK_URL = prevUrl
}

console.log('\nAll seo deploy hook tests passed.')
