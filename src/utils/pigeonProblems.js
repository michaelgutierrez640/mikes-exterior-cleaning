/**
 * Pigeon Guard problem multi-select rules (landing form).
 */

export const REGULAR_PROBLEMS = [
  { value: 'Pigeons currently nesting', label: 'Pigeons currently nesting' },
  { value: 'Droppings/debris', label: 'Droppings/debris' },
  { value: 'Noise under panels', label: 'Noise under panels' },
]

export const EXCLUSIVE_PROBLEMS = [
  { value: 'Preventative installation / no current issue', label: 'Preventative installation / no current issue' },
  { value: 'Not sure', label: 'Not sure' },
]

export const ALL_PROBLEM_OPTIONS = [...REGULAR_PROBLEMS, ...EXCLUSIVE_PROBLEMS]

export const REGULAR_PROBLEM_VALUES = REGULAR_PROBLEMS.map((o) => o.value)
export const EXCLUSIVE_PROBLEM_VALUES = EXCLUSIVE_PROBLEMS.map((o) => o.value)
export const ALL_PROBLEM_VALUES = ALL_PROBLEM_OPTIONS.map((o) => o.value)

export function isExclusiveProblem(value) {
  return EXCLUSIVE_PROBLEM_VALUES.includes(value)
}

/**
 * Toggle a problem option with exclusive/regular mutual exclusion.
 * @param {string[]} current
 * @param {string} value
 * @param {boolean} checked
 * @returns {string[]}
 */
export function toggleProblemSelection(current, value, checked) {
  const selected = Array.isArray(current) ? [...current] : []
  if (!ALL_PROBLEM_VALUES.includes(value)) return selected

  if (!checked) {
    return selected.filter((v) => v !== value)
  }

  if (isExclusiveProblem(value)) {
    return [value]
  }

  const withoutExclusive = selected.filter((v) => !isExclusiveProblem(v))
  if (!withoutExclusive.includes(value)) withoutExclusive.push(value)
  return withoutExclusive
}

export function validateProblemSelection(problems) {
  if (!Array.isArray(problems) || problems.length === 0) {
    return { ok: false, error: 'Select at least one option' }
  }
  const unique = [...new Set(problems)]
  for (const value of unique) {
    if (!ALL_PROBLEM_VALUES.includes(value)) {
      return { ok: false, error: 'Invalid problem selection' }
    }
  }
  const exclusives = unique.filter(isExclusiveProblem)
  const regulars = unique.filter((v) => !isExclusiveProblem(v))
  if (exclusives.length > 1) {
    return { ok: false, error: 'Choose only one exclusive option' }
  }
  if (exclusives.length === 1 && regulars.length > 0) {
    return { ok: false, error: 'Exclusive options cannot be mixed with other problems' }
  }
  return { ok: true, value: unique }
}

/** Normalize stored lead problems (array or legacy single string). */
export function normalizeStoredProblems(problems, message = '') {
  if (Array.isArray(problems) && problems.length) {
    return problems.map((p) => String(p).trim()).filter(Boolean)
  }
  if (typeof problems === 'string' && problems.trim()) {
    return [problems.trim()]
  }
  const m = String(message || '')
  const match = m.match(/^Problem:\s*(.+)$/m)
  if (match?.[1]) {
    const raw = match[1].trim()
    if (raw.includes(' | ')) return raw.split(' | ').map((s) => s.trim()).filter(Boolean)
    if (raw) return [raw]
  }
  return []
}

export function formatProblemsForMessage(problems) {
  const list = Array.isArray(problems) ? problems.filter(Boolean) : []
  if (!list.length) return 'Problem: (not specified)'
  return `Problems: ${list.join(' | ')}`
}
