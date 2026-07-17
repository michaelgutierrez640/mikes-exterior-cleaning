import { Link } from 'react-router-dom'
import { getArticleBySlug } from '../../content/blog'
import { getRelatedArticlesForService } from '../../config/relatedResources'
import ScrollReveal from '../ScrollReveal'

export default function ServiceRelatedArticles({ serviceSlug, id }) {
  const slugs = getRelatedArticlesForService(serviceSlug)
  const articles = slugs.map((slug) => getArticleBySlug(slug)).filter(Boolean)

  if (!articles.length) return null

  return (
    <section className="service-section bg-section-services" aria-labelledby={id}>
      <div className="section-container max-w-3xl">
        <ScrollReveal className="section-header">
          <p className="section-label">Resources</p>
          <h2 id={id} className="section-title">Helpful Guides</h2>
        </ScrollReveal>
        <ul className="section-content mt-6 space-y-3">
          {articles.map((article, i) => (
            <ScrollReveal key={article.slug} stagger={i + 1}>
              <li>
                <Link
                  to={`/resources/${article.slug}`}
                  className="group flex items-start justify-between gap-4 rounded-xl border border-black/[0.06] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(10,22,40,0.04)] transition-shadow hover:shadow-md"
                >
                  <span>
                    <span className="block font-semibold text-navy-900 group-hover:text-royal-700">{article.title}</span>
                    <span className="mt-1 block text-[0.875rem] text-gray-500">{article.excerpt}</span>
                  </span>
                  <span className="shrink-0 text-[0.875rem] font-semibold text-royal-600">Read →</span>
                </Link>
              </li>
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
