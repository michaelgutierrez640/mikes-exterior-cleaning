/**
 * Pigeon Guard conversion tracking param helpers (no browser / no network).
 * Run: node scripts/test-pigeon-tracking.mjs
 */
import assert from 'assert'
import {
  PIGEON_PATH,
  PIGEON_SERVICE,
  buildPigeonTrackingParams,
  normalizeCityForTracking,
  normalizePigeonProblemsForTracking,
} from '../src/utils/pigeonTracking.js'

function ok(name) {
  console.log(`PASS ${name}`)
}

{
  assert.equal(PIGEON_SERVICE, 'pigeon_guard')
  assert.equal(PIGEON_PATH, '/services/pigeon-guard')
  ok('canonical service + path constants')
}

{
  assert.equal(
    normalizePigeonProblemsForTracking([
      'Noise under panels',
      'Droppings/debris',
      'Pigeons currently nesting',
      'Droppings/debris',
    ]),
    'droppings,nesting,noise',
  )
  assert.equal(normalizePigeonProblemsForTracking(['Not sure']), 'not_sure')
  assert.equal(
    normalizePigeonProblemsForTracking(['Preventative installation / no current issue']),
    'preventative',
  )
  assert.equal(normalizePigeonProblemsForTracking(['free text secret']), undefined)
  assert.equal(normalizePigeonProblemsForTracking([]), undefined)
  ok('problems normalize to safe keys only')
}

{
  assert.equal(normalizeCityForTracking('Modesto'), 'Modesto')
  assert.equal(normalizeCityForTracking('  San Jose  '), 'San Jose')
  assert.equal(normalizeCityForTracking('user@email.com'), undefined)
  assert.equal(normalizeCityForTracking('2095551212'), undefined)
  assert.equal(normalizeCityForTracking('123 Main St'), undefined)
  ok('city tracking rejects contact-like values')
}

{
  const params = buildPigeonTrackingParams({
    city: 'Modesto',
    problems: ['Droppings/debris', 'Noise under panels'],
    sourceHint: 'pigeon_guard_form',
    utm: {
      utmSource: 'facebook',
      utmMedium: 'paid',
      utmCampaign: 'pigeon-guard-spring',
    },
  })
  assert.deepEqual(params, {
    service: 'pigeon_guard',
    page_path: '/services/pigeon-guard',
    utm_source: 'facebook',
    utm_medium: 'paid',
    utm_campaign: 'pigeon-guard-spring',
    source_hint: 'pigeon_guard_form',
    city: 'Modesto',
    problems: 'droppings,noise',
  })
  assert.equal('name' in params, false)
  assert.equal('phone' in params, false)
  assert.equal('email' in params, false)
  assert.equal('address' in params, false)
  ok('build params include UTMs/city/problems and never PII fields')
}

{
  const raw = JSON.stringify(
    buildPigeonTrackingParams({
      city: 'Tracy',
      problems: ['Pigeons currently nesting'],
      sourceHint: 'x',
      utm: { utmSource: 'google' },
    }),
  )
  assert.doesNotMatch(raw, /phone|email|address|notes|@|209/i)
  ok('serialized params contain no PII markers')
}

console.log('\nAll pigeon tracking tests passed.')
