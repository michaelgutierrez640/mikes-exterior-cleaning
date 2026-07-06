import { Link } from 'react-router-dom'

export default function ServiceBreadcrumbs({ serviceName, variant = 'dark' }) {
  const isDark = variant === 'dark'
  const linkClass = isDark
    ? 'transition-colors hover:text-white/90 text-white/55'
    : 'transition-colors hover:text-royal-700 text-gray-500'
  const currentClass = isDark ? 'text-white/85' : 'text-navy-900 font-medium'
  const sepClass = isDark ? 'text-white/35' : 'text-gray-300'

  return (
    <nav className="text-[0.8125rem] leading-relaxed sm:text-sm" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link to="/" className={linkClass}>
            Home
          </Link>
        </li>
        <li className={sepClass} aria-hidden="true">
          /
        </li>
        <li>
          <a href="/#services" className={linkClass}>
            Services
          </a>
        </li>
        <li className={sepClass} aria-hidden="true">
          /
        </li>
        <li>
          <span className={currentClass} aria-current="page">
            {serviceName}
          </span>
        </li>
      </ol>
    </nav>
  )
}
