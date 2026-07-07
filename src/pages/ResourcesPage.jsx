import { Link } from 'react-router-dom'
import { getBlogIndexSeo, getOrganizationSchema, getWebSiteSchema, getBreadcrumbSchema } from '../config/seo'
import { absoluteUrl, DEFAULT_OG_IMAGE } from '../config/site'
import { BLOG_ARTICLES } from '../content/blog'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import { QuoteButton } from '../components/ui/Button'

const pageSeo = getBlogIndexSeo()

export default function ResourcesPage() {
  const schemas = [
    getOrganizationSchema(),
    getWebSiteSchema(),
    getBreadcrumbSchema([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Resources', url: pageSeo.canonical },
    ]),
  ]

  return (
    <>
      <SeoHead {...pageSeo} ogImage={DEFAULT_OG_IMAGE} />
      <JsonLd data={schemas} id="resources-schema" />

      <section className="section-padding bg-navy-950 pt-32" aria-labelledby="resources-heading">
        <div className="section-container">
          <nav className="mb-6 text-[0.8125rem] text-white/50" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white/80">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white/80">Resources</span>
          </nav>
          <h1 id="resources-heading" className="font-display max-w-3xl text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Exterior Cleaning Resources
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70">
            Expert guides for Modesto and Central Valley homeowners — window cleaning, pressure washing, gutters, solar panels, and curb appeal.
          </p>
        </div>
      </section>

      <section className="service-section bg-section-services" aria-labelledby="articles-heading">
        <div className="section-container">
          <ScrollReveal className="section-header max-w-2xl">
            <h2 id="articles-heading" className="section-title">Latest Guides</h2>
            <p className="section-subtitle">Local advice from Mike&apos;s Exterior Cleaning Services — based in Modesto, serving Stanislaus and San Joaquin counties.</p>
          </ScrollReveal>
          <div className="section-content grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_ARTICLES.map((article, i) => (
              <ScrollReveal key={article.slug} stagger={i + 1}>
                <Link to={`/resources/${article.slug}`} className="card group flex h-full flex-col p-6 sm:p-7 hover:shadow-lg">
                  <p className="text-[0.6875rem] font-bold tracking-[0.15em] text-royal-600 uppercase">{article.category}</p>
                  <h3 className="mt-3 font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">{article.title}</h3>
                  <p className="mt-3 flex-1 text-[0.9375rem] leading-[1.65] text-gray-600">{article.excerpt}</p>
                  <p className="mt-4 text-[0.8125rem] text-gray-400">{article.readTime} · {article.publishedAt}</p>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="service-section bg-white text-center">
        <div className="section-container max-w-xl">
          <h2 className="font-display text-2xl font-semibold text-navy-900">Need Professional Help?</h2>
          <p className="mt-4 text-gray-600">Free estimates across Modesto, Salida, Riverbank, Ceres, Turlock, Ripon, and Oakdale.</p>
          <div className="mt-8 flex justify-center">
            <QuoteButton variant="royal" />
          </div>
        </div>
      </section>
    </>
  )
}
