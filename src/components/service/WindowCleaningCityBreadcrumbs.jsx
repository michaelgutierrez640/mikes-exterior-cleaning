import { Link } from 'react-router-dom'

export default function WindowCleaningCityBreadcrumbs({ cityName }) {
  return (
    <nav className="text-[0.8125rem] leading-relaxed text-white/55 sm:text-sm" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link to="/" className="transition-colors hover:text-white/90">
            Home
          </Link>
        </li>
        <li className="text-white/35" aria-hidden="true">
          /
        </li>
        <li>
          <Link to="/services/window-cleaning" className="transition-colors hover:text-white/90">
            Window Cleaning
          </Link>
        </li>
        <li className="text-white/35" aria-hidden="true">
          /
        </li>
        <li>
          <span className="text-white/85" aria-current="page">
            {cityName}
          </span>
        </li>
      </ol>
    </nav>
  )
}
