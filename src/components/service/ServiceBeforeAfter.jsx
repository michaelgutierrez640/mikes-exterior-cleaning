import { useEffect, useState } from 'react'
import BeforeAfterSlider from '../BeforeAfterSlider'
import ScrollReveal from '../ScrollReveal'
import {
  getBeforeAfterForService,
  getSecondaryBeforeAfter,
} from '../../config/servicePageEnhancements'
import { fetchPublishedBeforeAfterPairs } from '../../services/projectsApi'

function toSliderSet(set) {
  if (!set?.before || !set?.after) return null
  return {
    id: set.id || `${set.before}-${set.after}`,
    before: set.before,
    after: set.after,
    beforeWebp: set.beforeWebp,
    afterWebp: set.afterWebp,
    beforeSrcSet: set.beforeSrcSet,
    afterSrcSet: set.afterSrcSet,
    label: set.label,
    aspectClass: set.aspectClass || 'aspect-[16/10]',
  }
}

function collectConfiguredSets(slug) {
  const sets = []
  const primary = getBeforeAfterForService(slug)
  if (primary?.type === 'slider' && primary.set) {
    const mapped = toSliderSet(primary.set)
    if (mapped) sets.push(mapped)
  }
  const secondary = getSecondaryBeforeAfter(slug)
  if (secondary) {
    const mapped = toSliderSet(secondary)
    if (mapped) sets.push(mapped)
  }
  return sets
}

function SliderBlock({ set, onInvalid }) {
  return (
    <BeforeAfterSlider
      before={set.before}
      after={set.after}
      beforeWebp={set.beforeWebp}
      afterWebp={set.afterWebp}
      beforeSrcSet={set.beforeSrcSet}
      afterSrcSet={set.afterSrcSet}
      label={set.label}
      aspectClass={set.aspectClass || 'aspect-[16/10]'}
      onValidityChange={(valid) => {
        if (!valid) onInvalid?.(set.id)
      }}
    />
  )
}

/**
 * Public Before & After for service pages.
 * Renders only when approved image pairs exist and both images load.
 * Never shows developer placeholders, file paths, or empty image slots.
 */
export default function ServiceBeforeAfter({ slug, serviceName, id }) {
  const [sets, setSets] = useState(() => collectConfiguredSets(slug))
  const [invalidIds, setInvalidIds] = useState(() => new Set())
  const [ready, setReady] = useState(() => collectConfiguredSets(slug).length > 0)

  useEffect(() => {
    let cancelled = false
    const configured = collectConfiguredSets(slug)
    setInvalidIds(new Set())
    setSets(configured)
    setReady(configured.length > 0)

    ;(async () => {
      try {
        const jobPairs = await fetchPublishedBeforeAfterPairs(slug)
        if (cancelled) return
        const mapped = jobPairs.map(toSliderSet).filter(Boolean)
        const byId = new Map()
        // Prefer Completed Jobs pairs first, then approved static sets.
        for (const set of [...mapped, ...configured]) {
          if (!byId.has(set.id)) byId.set(set.id, set)
        }
        const next = [...byId.values()]
        setSets(next)
        setReady(true)
      } catch {
        if (cancelled) return
        setSets(configured)
        setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [slug])

  const visibleSets = sets.filter((set) => !invalidIds.has(set.id))

  if (!ready || visibleSets.length === 0) return null

  return (
    <section className="service-section bg-navy-950" aria-labelledby={id}>
      <div className="section-container">
        <ScrollReveal className="section-header max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-royal-400 uppercase">Results</p>
          <h2
            id={id}
            className="font-display mt-4 text-[1.75rem] font-semibold leading-[1.12] text-white sm:text-[2.5rem] lg:text-[2.75rem]"
          >
            {serviceName} Before &amp; After
          </h2>
          <p className="mt-5 text-[1rem] leading-[1.7] text-white/55 sm:text-lg">
            Real transformations from Central Valley properties — drag the slider to compare.
          </p>
        </ScrollReveal>

        <div className="section-content space-y-10 sm:space-y-12">
          {visibleSets.map((set, index) => (
            <ScrollReveal key={set.id} stagger={index}>
              <SliderBlock
                set={set}
                onInvalid={(setId) => {
                  setInvalidIds((prev) => {
                    if (prev.has(setId)) return prev
                    const next = new Set(prev)
                    next.add(setId)
                    return next
                  })
                }}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
