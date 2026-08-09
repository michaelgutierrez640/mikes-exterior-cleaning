/**
 * Pigeon Guard multi-select problem rules.
 * Run: node scripts/test-pigeon-problems.mjs
 */
import assert from 'assert'
import {
  formatProblemsForMessage,
  normalizeStoredProblems,
  toggleProblemSelection,
  validateProblemSelection,
} from '../src/utils/pigeonProblems.js'

function ok(name) {
  console.log(`PASS ${name}`)
}

{
  let selected = []
  selected = toggleProblemSelection(selected, 'Pigeons currently nesting', true)
  selected = toggleProblemSelection(selected, 'Droppings/debris', true)
  selected = toggleProblemSelection(selected, 'Noise under panels', true)
  assert.deepEqual(selected, [
    'Pigeons currently nesting',
    'Droppings/debris',
    'Noise under panels',
  ])
  ok('allows multiple regular problem selections')
}

{
  let selected = toggleProblemSelection([], 'Pigeons currently nesting', true)
  selected = toggleProblemSelection(selected, 'Droppings/debris', true)
  selected = toggleProblemSelection(selected, 'Not sure', true)
  assert.deepEqual(selected, ['Not sure'])
  ok('exclusive choice clears regular selections')
}

{
  let selected = toggleProblemSelection([], 'Preventative installation / no current issue', true)
  selected = toggleProblemSelection(selected, 'Noise under panels', true)
  assert.deepEqual(selected, ['Noise under panels'])
  ok('regular selection clears exclusive choice')
}

{
  const empty = validateProblemSelection([])
  assert.equal(empty.ok, false)
  const good = validateProblemSelection(['Droppings/debris', 'Noise under panels'])
  assert.equal(good.ok, true)
  ok('requires at least one selection')
}

{
  assert.equal(
    formatProblemsForMessage(['A', 'B']),
    'Problems: A | B',
  )
  assert.deepEqual(
    normalizeStoredProblems(undefined, 'Problem: Droppings/debris'),
    ['Droppings/debris'],
  )
  assert.deepEqual(normalizeStoredProblems(['Noise under panels']), ['Noise under panels'])
  assert.deepEqual(normalizeStoredProblems('Not sure'), ['Not sure'])
  ok('formats message and normalizes legacy string storage')
}

console.log('\nAll pigeon problem tests passed.')
