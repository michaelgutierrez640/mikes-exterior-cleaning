/**
 * Large, phone-friendly 1–5 star rating. Starts unselected; required for submit.
 * Accessible as a radiogroup with keyboard support.
 */
export default function StarRatingInput({
  value = null,
  onChange,
  name = 'rating',
  id = 'review-rating',
}) {
  const selected = Number.isInteger(value) && value >= 1 && value <= 5 ? value : null
  const labelText = selected ? `${selected} out of 5` : 'No rating selected'

  function select(n) {
    onChange?.(n)
  }

  function onKeyDown(e, n) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      select(Math.min(5, (selected || n) + 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      select(Math.max(1, (selected || n) - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      select(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      select(5)
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      select(n)
    }
  }

  return (
    <div>
      <div
        id={id}
        role="radiogroup"
        aria-label="Star rating"
        aria-required="true"
        className="flex flex-wrap items-center gap-2"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const isOn = selected !== null && n <= selected
          const isChecked = selected === n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={isChecked}
              aria-label={`${n} out of 5`}
              tabIndex={selected === null ? (n === 1 ? 0 : -1) : isChecked ? 0 : -1}
              className={[
                'inline-flex h-14 w-14 items-center justify-center rounded-xl transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-500 focus-visible:ring-offset-2',
                isOn ? 'bg-amber-50 text-amber-500' : 'bg-gray-50 text-gray-300 hover:bg-amber-50/70 hover:text-amber-300',
              ].join(' ')}
              onClick={() => select(n)}
              onKeyDown={(e) => onKeyDown(e, n)}
            >
              <svg className="h-9 w-9" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              </svg>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-base font-semibold text-navy-900" aria-live="polite">
        {labelText}
      </p>
      <input type="hidden" name={name} value={selected ?? ''} readOnly />
    </div>
  )
}
