import NotFoundPage from './NotFoundPage'
import { useParams } from 'react-router-dom'
import { BUSINESS } from '../config/business'
import { getBlogArticleSchemas } from '../config/seo'
import { absoluteUrl, DEFAULT_OG_IMAGE } from '../config/site'
import { getArticleBySlug } from '../content/blog'
import { PRIORITY_LOCATION_SLUGS } from '../content/cities/location'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import { CallButton, QuoteButton } from '../components/ui/Button'

export default function ResourceArticlePage() {
  const { slug } = useParams()
  const article = getArticleBySlug(slug)

  if (!article) {
    return <NotFoundPage />
  }

  const canonical = absoluteUrl(`/resources/${slug}`)
  const schemas = getBlogArticleSchemas(article)

  return (
    <>
      <SeoHead
        title={article.meta.title}
        description={article.meta.description}
        keywords={article.meta.keywords}
        canonical={canonical}
        ogType="article"
        ogImage={DEFAULT_OG_IMAGE}
      />
      <JsonLd data={schemas} id={`article-${slug}`} />

      <article>
        <header className="section-padding bg-navy-950 pt-32">
          <div className="section-container max-w-3xl">
            <nav className="mb-6 text-[0.8125rem] text-white/50" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-white/80">Home</Link>
              <span className="mx-2">/</span>
              <Link to="/resources" className="hover:text-white/80">Resources</Link>
              <span className="mx-2">/</span>
              <span className="text-white/70 line-clamp-1">{article.title}</span>
            </nav>
            <p className="text-[0.6875rem] font-bold tracking-[0.15em] text-royal-400 uppercase">{article.category}</p>
            <h1 className="font-display mt-4 text-[1.875rem] font-semibold leading-[1.14] text-white sm:text-4xl">{article.title}</h1>
            <p className="mt-4 text-[0.9375rem] text-white/60">{article.readTime} · Published {article.publishedAt}</p>
          </div>
        </header>

        <div className="service-section bg-white">
          <div className="section-container max-w-3xl">
            <p className="text-lg leading-relaxed text-gray-600">{article.excerpt}</p>

            {article.sections.map((section) => (
              <ScrollReveal key={section.heading} className="mt-12">
                <h2 className="font-display text-2xl font-semibold text-navy-900">{section.heading}</h2>
                <div className="service-prose mt-5">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 48)}>{p}</p>
                  ))}
                </div>
              </ScrollReveal>
            ))}

            <div className="mt-14 rounded-[1.25rem] border border-royal-100 bg-royal-50/50 p-8 text-center">
              <h2 className="font-display text-xl font-semibold text-navy-900">Ready for Professional Results?</h2>
              <p className="mt-3 text-gray-600">{BUSINESS.name} serves the Central Valley with free estimates.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <QuoteButton variant="primary" />
                <CallButton variant="secondary" />
              </div>
            </div>

            <nav className="mt-12 border-t border-gray-100 pt-8" aria-label="Related links">
              <h2 className="text-sm font-bold tracking-wide text-gray-500 uppercase">Related Pages</h2>
              <ul className="mt-4 flex flex-wrap gap-3">
                {article.relatedServiceSlug && (
                  <li>
                    <Link to={`/services/${article.relatedServiceSlug}`} className="font-semibold text-royal-600 hover:text-royal-700">
                      View service →
                    </Link>
                  </li>
                )}
                {article.relatedCitySlug && PRIORITY_LOCATION_SLUGS.includes(article.relatedCitySlug) && (
                  <li>
                    <Link to={`/service-areas/${article.relatedCitySlug}`} className="font-semibold text-royal-600 hover:text-royal-700">
                      {article.relatedCitySlug.charAt(0).toUpperCase() + article.relatedCitySlug.slice(1)} service area →
                    </Link>
                  </li>
                )}
                <li>
                  <Link to="/resources" className="font-semibold text-gray-600 hover:text-navy-900">All resources →</Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </article>
    </>
  )
}
