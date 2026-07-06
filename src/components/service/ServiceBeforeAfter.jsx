import BeforeAfterSlider from '../BeforeAfterSlider'
import { ImagePlaceholder } from '../ui/MediaAsset'
import ScrollReveal from '../ScrollReveal'
import { getBeforeAfterForService, getSecondaryBeforeAfter } from '../../config/servicePageEnhancements'

function PlaceholderPair({ config }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
      <div>
        <span className="mb-3 inline-block rounded-full bg-black/50 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
          Before
        </span>
        <ImagePlaceholder
          title={config.beforeTitle}
          file={config.beforeFile}
          sizeHint={config.sizeHint}
          variant="dark"
          aspectRatio="16/10"
          className="w-full rounded-[1.25rem]"
        />
      </div>
      <div>
        <span className="mb-3 inline-block rounded-full bg-royal-600/90 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
          After
        </span>
        <ImagePlaceholder
          title={config.afterTitle}
          file={config.afterFile}
          sizeHint={config.sizeHint}
          variant="dark"
          aspectRatio="16/10"
          className="w-full rounded-[1.25rem]"
        />
      </div>
    </div>
  )
}

function SliderBlock({ set }) {
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
    />
  )
}

export default function ServiceBeforeAfter({ slug, serviceName, id }) {
  const config = getBeforeAfterForService(slug)
  const secondary = getSecondaryBeforeAfter(slug)

  return (
    <section className="service-section bg-navy-950" aria-labelledby={id}>
      <div className="section-container">
        <ScrollReveal className="section-header max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-royal-400 uppercase">Results</p>
          <h2 id={id} className="font-display mt-4 text-[1.75rem] font-semibold leading-[1.12] text-white sm:text-[2.5rem] lg:text-[2.75rem]">
            {serviceName} Before &amp; After
          </h2>
          <p className="mt-5 text-[1rem] leading-[1.7] text-white/55 sm:text-lg">
            Real transformations from Central Valley properties — drag the slider to compare, or add your project photos to the slots below.
          </p>
        </ScrollReveal>

        <div className="section-content space-y-10 sm:space-y-12">
          {!config && (
            <PlaceholderPair
              config={{
                beforeTitle: `${serviceName} — before`,
                afterTitle: `${serviceName} — after`,
                beforeFile: `public/images/before-after/${slug}-before.jpg`,
                afterFile: `public/images/before-after/${slug}-after.jpg`,
                sizeHint: 'Same angle, same surface — landscape 1600×1000px',
              }}
            />
          )}

          {config?.type === 'slider' && <SliderBlock set={config.set} />}

          {config?.type === 'placeholder' && <PlaceholderPair config={config} />}

          {secondary && (
            <ScrollReveal>
              <SliderBlock set={secondary} />
            </ScrollReveal>
          )}
        </div>
      </div>
    </section>
  )
}
