import { BEFORE_AFTER_SETS } from './imagePlacement'

/** Trust badges shown on every service page. */
export const SERVICE_TRUST_BADGES = [
  {
    id: 'licensed',
    label: 'Licensed',
    description: 'Fully licensed for exterior cleaning work across the Central Valley.',
  },
  {
    id: 'insured',
    label: 'Insured',
    description: 'Comprehensive liability coverage on every residential and commercial job.',
  },
  {
    id: 'guarantee',
    label: 'Satisfaction Guaranteed',
    description: 'Not thrilled with the results? We make it right — no questions asked.',
  },
  {
    id: 'local',
    label: 'Locally Owned',
    description: 'Modesto-based owner-operated business — not a national franchise.',
  },
]

/**
 * Per-service page enhancements: before/after, DIY comparison, checklists, maintenance.
 * @type {Record<string, object>}
 */
export const SERVICE_ENHANCEMENTS = {
  'window-cleaning': {
    beforeAfterSetId: 'img-0947',
    beforeAfterPlaceholder: null,
    diyComparison: {
      title: 'Professional Window Cleaning vs. DIY',
      intro:
        'Spray bottles and paper towels work in a pinch, but they rarely deliver the clarity Central Valley homeowners expect — especially after pollen season and hard-water spotting.',
      diyTitle: 'DIY Window Cleaning',
      proTitle: "Mike's Professional Service",
      rows: [
        {
          diy: 'Streaks and lint from paper towels and drugstore cleaners',
          pro: 'Purified water and pro squeegee technique for optically clear glass',
        },
        {
          diy: 'Ladder risk on second-story and hard-to-reach panes',
          pro: 'Extension poles, stabilizers, and insured technicians at height',
        },
        {
          diy: 'Tracks, screens, and frames often skipped',
          pro: 'Full detail on sills, tracks, screens, and French doors',
        },
        {
          diy: 'Hard water stains worsen with improper scrubbing',
          pro: 'Targeted treatment for Central Valley mineral deposits',
        },
        {
          diy: 'Full Saturday lost on a two-story home',
          pro: 'Most homes completed in a few hours with uniform results',
        },
      ],
    },
    checklist: {
      title: 'What Our Window Cleaning Includes',
      items: [
        'Free on-site estimate and window count',
        'Interior and/or exterior glass cleaning',
        'Professional scrub and squeegee on every pane',
        'Sill, frame, and track wipe-down',
        'Screen cleaning and careful reinstallation',
        'Hard water spot assessment and treatment',
        'Landscaping and floor protection',
        'Final walkthrough quality inspection',
      ],
    },
    maintenanceTips: {
      title: 'Keeping Your Windows Clear Between Visits',
      tips: [
        {
          title: 'Adjust Sprinklers Away from Glass',
          text: 'Irrigation overspray is the leading cause of hard water stains on Modesto windows. Point heads away from glass and fix leaks promptly.',
        },
        {
          title: 'Dust Screens Seasonally',
          text: 'Pollen and valley dust collect on screens and transfer to glass when windows open. A quick screen brush between professional visits slows buildup.',
        },
        {
          title: 'Wipe Condensation on Tracks',
          text: 'Moisture in window tracks breeds mold and grime. Dry tracks after heavy dew or rain to keep channels clean longer.',
        },
        {
          title: 'Schedule Before Peak Seasons',
          text: 'Book spring and pre-holiday cleans early. Recurring clients in Riverbank, Oakdale, and Manteca get priority scheduling.',
        },
      ],
    },
    whyChooseBlurb:
      'From sparkling sliding doors to second-story transoms, we deliver streak-free results backed by a 5.0 Google rating and 44 verified reviews across Modesto and the Central Valley.',
    reviewKeywords: ['window', 'shutter', 'interior', 'exterior', 'screen', 'sparkling', 'clean'],
  },

  'pressure-washing': {
    beforeAfterSetId: 'walkway-pressure',
    beforeAfterPlaceholder: null,
    secondaryBeforeAfterId: 'driveway-pressure',
    diyComparison: {
      title: 'Professional Pressure Washing vs. DIY',
      intro:
        'Renting a pressure washer from the hardware store is tempting — until uneven results, etched concrete, or stripped paint teach an expensive lesson.',
      diyTitle: 'DIY Pressure Washing',
      proTitle: "Mike's Professional Service",
      rows: [
        {
          diy: 'One pressure setting risks gouging soft wood or etching concrete',
          pro: 'Surface-specific PSI, flow rate, and soft-wash detergents',
        },
        {
          diy: 'Streaky, inconsistent passes on large driveways',
          pro: 'Commercial surface cleaners for uniform, stripe-free results',
        },
        {
          diy: 'Overspray damages plants, paint, and window seals',
          pro: 'Property protection, masking, and controlled technique',
        },
        {
          diy: 'Mold and algae often grow back within weeks',
          pro: 'Proper detergents and technique for longer-lasting cleanliness',
        },
        {
          diy: 'Hours of setup, cleanup, and equipment rental costs',
          pro: 'Fully equipped crew — you relax while we restore surfaces',
        },
      ],
    },
    checklist: {
      title: 'What Our Pressure Washing Includes',
      items: [
        'Free estimate with surface assessment',
        'Driveways, walkways, and patios',
        'House washing and soft-wash siding',
        'Pool decks, fences, and retaining walls',
        'Pre-treatment of oil, mildew, and algae',
        'Landscape and property protection',
        'Controlled runoff and cleanup',
        'Post-service walkthrough',
      ],
    },
    maintenanceTips: {
      title: 'Maintaining Clean Surfaces After Pressure Washing',
      tips: [
        {
          title: 'Address Oil Spills Quickly',
          text: 'Fresh automotive drips on driveways are far easier to treat than stains baked in by Central Valley sun. Use absorbent materials and schedule a touch-up if needed.',
        },
        {
          title: 'Trim Overhanging Branches',
          text: 'Shade plus moisture feeds algae on north-facing concrete. Trimming branches increases sun exposure and slows regrowth.',
        },
        {
          title: 'Keep Gutters Flowing',
          text: 'Overflowing gutters stain siding and splash dirt onto walkways below. Pair pressure washing with gutter cleaning for longer-lasting curb appeal.',
        },
        {
          title: 'Plan Annual or Seasonal Washes',
          text: 'Most Modesto driveways benefit from one to two professional washes per year — more for properties near farmland or heavy tree cover.',
        },
      ],
    },
    whyChooseBlurb:
      'We match equipment and technique to each surface — restoring driveways, patios, and siding across Stanislaus and San Joaquin counties without the damage DIY pressure washing causes.',
    reviewKeywords: ['pressure', 'driveway', 'concrete', 'patio', 'wash', 'quote', 'timely'],
  },

  'solar-panel-cleaning': {
    beforeAfterSetId: null,
    beforeAfterPlaceholder: {
      label: 'Solar Panel Cleaning — Before & After',
      beforeTitle: 'Solar panels before cleaning',
      afterTitle: 'Solar panels after cleaning',
      beforeFile: 'public/images/before-after/solar-before.jpg',
      afterFile: 'public/images/before-after/solar-after.jpg',
      sizeHint: 'Same roof angle, same panel array — landscape 1600×1000px',
      aspectClass: 'aspect-[16/10]',
    },
    diyComparison: {
      title: 'Professional Solar Cleaning vs. DIY',
      intro:
        'Dirty panels lose efficiency, but climbing on a roof with a hose risks your safety, your warranty, and your array.',
      diyTitle: 'DIY Solar Panel Cleaning',
      proTitle: "Mike's Professional Service",
      rows: [
        {
          diy: 'Roof falls and ladder injuries are a serious risk',
          pro: 'Trained, insured technicians with proper roof access equipment',
        },
        {
          diy: 'Tap water minerals leave spotting that reduces output',
          pro: 'Purified water and soft brushes safe for panel coatings',
        },
        {
          diy: 'High pressure can void manufacturer warranties',
          pro: 'Manufacturer-safe methods — no harsh pressure or abrasives',
        },
        {
          diy: 'Partial cleaning leaves inconsistent energy production',
          pro: 'Full-array cleaning for uniform efficiency gains',
        },
        {
          diy: 'Difficult to verify results without monitoring data',
          pro: 'Visibly cleaner panels and improved production potential',
        },
      ],
    },
    checklist: {
      title: 'What Our Solar Panel Cleaning Includes',
      items: [
        'Free estimate and array assessment',
        'Roof-safe access and fall protection',
        'Deionized or purified water rinse',
        'Soft brush agitation for baked-on dust',
        'Bird dropping and pollen removal',
        'Frame and edge debris clearing',
        'No harsh chemicals or high pressure',
        'Post-clean visual inspection',
      ],
    },
    maintenanceTips: {
      title: 'Maximizing Solar Output Between Cleanings',
      tips: [
        {
          title: 'Monitor Production Drops',
          text: 'A sudden dip on your inverter app after pollen season often means panels need cleaning — especially on flat or low-slope arrays.',
        },
        {
          title: 'Keep Nearby Trees Trimmed',
          text: 'Shade and leaf litter compound efficiency losses. Trimming overhangs reduces debris accumulation on panels.',
        },
        {
          title: 'Avoid Sprinkler Overspray',
          text: 'Hard water on panels creates mineral film that blocks sunlight. Adjust irrigation so it never hits your array.',
        },
        {
          title: 'Schedule Before Summer Peak',
          text: 'Clean panels before the highest-production months so you capture maximum savings on your utility bill.',
        },
      ],
    },
    whyChooseBlurb:
      'Deb and dozens of other Central Valley homeowners trust us for solar panel and shutter cleaning — safe roof work, purified water, and a spotless array without risking your warranty.',
    reviewKeywords: ['solar', 'panel', 'shutter', 'roof'],
  },

  'gutter-cleaning': {
    beforeAfterSetId: null,
    beforeAfterPlaceholder: {
      label: 'Gutter Cleaning — Before & After',
      beforeTitle: 'Clogged gutters before cleaning',
      afterTitle: 'Clean gutters after service',
      beforeFile: 'public/images/before-after/gutter-before.jpg',
      afterFile: 'public/images/before-after/gutter-after.jpg',
      sizeHint: 'Same gutter run, same angle — landscape 1600×1000px',
      aspectClass: 'aspect-[16/10]',
    },
    diyComparison: {
      title: 'Professional Gutter Cleaning vs. DIY',
      intro:
        'Clearing gutters from a ladder is one of the most common — and preventable — causes of home maintenance injuries.',
      diyTitle: 'DIY Gutter Cleaning',
      proTitle: "Mike's Professional Service",
      rows: [
        {
          diy: 'Ladder falls while reaching into clogged channels',
          pro: 'Insured crews with proper ladder and roofline technique',
        },
        {
          diy: 'Compressed debris pushed into downspouts',
          pro: 'Full debris removal with downspout flushing',
        },
        {
          diy: 'Mold, pests, and wet sludge handled without protection',
          pro: 'Professional bagging, disposal, and sanitary cleanup',
        },
        {
          diy: 'Easy to miss hidden clogs and sagging sections',
          pro: 'Inspection for pitch problems, leaks, and damage',
        },
        {
          diy: 'Messy gutters splash siding and landscaping',
          pro: 'Protected work areas and thorough post-service cleanup',
        },
      ],
    },
    checklist: {
      title: 'What Our Gutter Cleaning Includes',
      items: [
        'Free estimate and gutter line assessment',
        'Hand removal of leaves, needles, and debris',
        'Downspout flushing and clog clearing',
        'Muck and sludge bagged and hauled away',
        'Fascia and soffit splash inspection',
        'Minor re-pitch recommendations if needed',
        'Roof edge blow-off where applicable',
        'Final flow test with running water',
      ],
    },
    maintenanceTips: {
      title: 'Protecting Your Gutters Between Cleanings',
      tips: [
        {
          title: 'Install Gutter Guards If Needed',
          text: 'Heavy tree cover in Oakdale and Ripon properties may benefit from guards. We can advise during your cleaning visit.',
        },
        {
          title: 'Check Downspouts After Storms',
          text: 'Winter rains in the Central Valley flush debris into downspouts. Quick checks after storms prevent overflow damage.',
        },
        {
          title: 'Keep Roof Valleys Clear',
          text: 'Debris from roof valleys washes directly into gutters. Annual roof blow-off paired with gutter cleaning prevents clogs.',
        },
        {
          title: 'Book Before Rainy Season',
          text: 'Schedule gutter cleaning in late fall before heavy rains — especially if your last cleaning was over a year ago.',
        },
      ],
    },
    whyChooseBlurb:
      'Overflowing gutters damage fascia, foundation, and landscaping. We clear every run, flush every downspout, and leave your drainage system ready for Central Valley storms.',
    reviewKeywords: ['gutter', 'roof', 'professional', 'conscientious', 'courteous'],
  },

  'residential-window-cleaning': {
    beforeAfterSetId: null,
    beforeAfterPlaceholder: {
      label: 'Residential Window Cleaning — Before & After',
      beforeTitle: 'Home windows before cleaning',
      afterTitle: 'Home windows after cleaning',
      beforeFile: 'public/images/before-after/img-0947-before.jpg',
      afterFile: 'public/images/before-after/img-0947-after.jpg',
      sizeHint: 'Same home exterior — landscape 1600×1000px',
      aspectClass: 'aspect-[16/10]',
    },
    diyComparison: {
      title: 'Professional Residential Cleaning vs. DIY',
      intro:
        'Home window cleaning on ladders with store-bought sprays risks streaks, injury, and hours of frustration.',
      diyTitle: 'DIY / Homeowner Approach',
      proTitle: "Mike's Residential Service",
      rows: [
        {
          diy: 'Paper towels and spray bottles leave lint and streaks',
          pro: 'Professional squeegees and purified water for streak-free glass',
        },
        {
          diy: 'Ladder falls on two-story homes',
          pro: 'Insured crew with extension poles and proper height equipment',
        },
        {
          diy: 'Tracks and sills skipped or half-cleaned',
          pro: 'Complete service — glass, frames, sills, and tracks',
        },
        {
          diy: 'Hard water stains baked in from sprinkler overspray',
          pro: 'Targeted treatment for Central Valley mineral deposits',
        },
        {
          diy: 'Entire Saturday lost on mediocre results',
          pro: 'Whole-home cleaning in a few hours with guaranteed quality',
        },
      ],
    },
    checklist: {
      title: 'What Our Residential Window Cleaning Includes',
      items: [
        'Free home walkthrough and quote',
        'Interior and exterior residential glass',
        'Single-story and two-story homes',
        'Water-fed pole work for height',
        'Screen removal, cleaning, and reinstall',
        'Streak-free detailing on every pane',
        'Frame, sill, and track wipe-down',
        'Recurring home maintenance plans available',
      ],
    },
    maintenanceTips: {
      title: 'Keeping Home Windows Clear Between Visits',
      tips: [
        {
          title: 'Set a Seasonal Schedule',
          text: 'Most Central Valley homes benefit from exterior cleaning in spring, summer, and fall when dust and pollen peak.',
        },
        {
          title: 'Adjust Sprinkler Heads',
          text: 'Irrigation overspray on glass creates hard water stains. Point heads away from windows between professional visits.',
        },
        {
          title: 'Clean After Construction',
          text: 'New developments in Tracy and Manteca generate concrete dust — schedule a post-construction clean promptly.',
        },
        {
          title: 'Bundle With Pressure Washing',
          text: 'Pair window cleaning with driveway and patio washing for a fully refreshed home exterior.',
        },
      ],
    },
    whyChooseBlurb:
      'Central Valley homeowners rely on us for punctual, professional residential window service that keeps their homes bright, safe, and spotless.',
    reviewKeywords: ['professional', 'window', 'residential', 'home', 'recommend', 'property', 'courteous'],
  },
}

export function getServiceEnhancements(slug) {
  return SERVICE_ENHANCEMENTS[slug] ?? null
}

export function getBeforeAfterForService(slug) {
  const config = SERVICE_ENHANCEMENTS[slug]
  if (!config) return null

  if (config.beforeAfterSetId) {
    const set = BEFORE_AFTER_SETS.find((s) => s.id === config.beforeAfterSetId)
    if (set) return { type: 'slider', set }
  }

  if (config.beforeAfterPlaceholder) {
    return { type: 'placeholder', ...config.beforeAfterPlaceholder }
  }

  return null
}

export function getSecondaryBeforeAfter(slug) {
  const config = SERVICE_ENHANCEMENTS[slug]
  if (!config?.secondaryBeforeAfterId) return null
  return BEFORE_AFTER_SETS.find((s) => s.id === config.secondaryBeforeAfterId) ?? null
}
