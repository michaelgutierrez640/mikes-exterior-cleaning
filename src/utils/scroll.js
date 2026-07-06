const HEADER_OFFSET = 88

export function scrollToContact(e) {
  if (e) e.preventDefault()
  const el = document.getElementById('contact')
  if (!el) return

  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
  window.scrollTo({ top, behavior: 'smooth' })
}

export function scrollToHash(hash) {
  const id = hash?.replace('#', '')
  if (!id) return
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
  window.scrollTo({ top, behavior: 'smooth' })
}
