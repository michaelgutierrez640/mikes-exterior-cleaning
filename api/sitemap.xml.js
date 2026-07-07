import { buildSitemapXml } from '../lib/sitemap.mjs'

export default function handler(_request, response) {
  const xml = buildSitemapXml()
  response.setHeader('Content-Type', 'application/xml; charset=UTF-8')
  response.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600')
  response.status(200).send(xml)
}
