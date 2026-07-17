/** Maps service slugs to related resource article slugs for internal linking. */
export const SERVICE_RELATED_ARTICLES = {
  'window-cleaning': [
    'how-often-clean-windows-modesto-ca',
    'hard-water-stains-central-valley-windows',
    'why-hire-professional-window-cleaners',
    'two-story-window-cleaning-safety',
  ],
  'residential-window-cleaning': [
    'how-often-clean-windows-modesto-ca',
    'spring-pollen-window-cleaning-central-valley',
    'exterior-cleaning-home-curb-appeal-value',
  ],
  'pressure-washing': [
    'best-time-pressure-wash-driveways-stanislaus-county',
    'pressure-washing-vs-soft-wash-central-valley',
  ],
  'solar-panel-cleaning': ['solar-panel-cleaning-california-dust-pollen'],
  'gutter-cleaning': [
    'gutter-cleaning-before-rainy-season-modesto',
    'gutter-overflow-damage-prevention-ripon',
  ],
}

export function getRelatedArticlesForService(serviceSlug) {
  return SERVICE_RELATED_ARTICLES[serviceSlug] ?? []
}
