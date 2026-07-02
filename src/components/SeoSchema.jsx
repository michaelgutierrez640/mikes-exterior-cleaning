import { useEffect } from 'react'
import { getLocalBusinessSchema } from '../config/seo'

export default function SeoSchema() {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(getLocalBusinessSchema())
    document.head.appendChild(script)
    return () => script.remove()
  }, [])

  return null
}
