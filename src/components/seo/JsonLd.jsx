import { useEffect } from 'react'

/**
 * Injects JSON-LD schema scripts; removes on unmount when route changes.
 */
export default function JsonLd({ data, id = 'jsonld-schema' }) {
  useEffect(() => {
    const payload = Array.isArray(data) ? data : [data]
    const scripts = payload.map((item, index) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.id = `${id}-${index}`
      script.text = JSON.stringify(item)
      document.head.appendChild(script)
      return script
    })

    return () => {
      scripts.forEach((script) => script.remove())
    }
  }, [data, id])

  return null
}
