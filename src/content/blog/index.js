import BLOG_ARTICLES from './articles'

export { BLOG_ARTICLES }

export function getArticleBySlug(slug) {
  return BLOG_ARTICLES.find((a) => a.slug === slug) ?? null
}

export function getArticlesByCategory(category) {
  return BLOG_ARTICLES.filter((a) => a.category === category)
}
