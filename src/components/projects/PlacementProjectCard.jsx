import { Link } from 'react-router-dom'
import {
  cityLabel,
  formatCompletedDate,
  projectHeading,
  projectPath,
  serviceLabel,
} from '../../utils/projectLabels'

/**
 * Placement card for service/city embeds — cover, title, caption, city, date, View Project.
 */
export default function PlacementProjectCard({ project }) {
  if (!project?.slug) return null
  const title = projectHeading(project)
  const href = projectPath(project.slug)
  const cover = project.coverImage

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
      <Link to={href} className="relative aspect-[16/10] block bg-navy-950/5" aria-label={`View project: ${title}`}>
        {cover?.url ? (
          <img
            src={cover.url}
            alt={cover.alt || title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[0.875rem] text-gray-400">No photo</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-lg font-semibold text-navy-900">
          <Link to={href} className="hover:text-royal-700">
            {title}
          </Link>
        </h3>
        {project.description ? (
          <p className="line-clamp-2 text-[0.875rem] leading-relaxed text-gray-600">{project.description}</p>
        ) : (
          <p className="text-[0.875rem] text-gray-500">
            {serviceLabel(project.service)} project in {cityLabel(project.city)}.
          </p>
        )}
        <p className="text-[0.8125rem] text-gray-500">
          <span className="font-medium text-navy-900">{cityLabel(project.city)}</span>
          {project.completedAt ? ` · ${formatCompletedDate(project.completedAt)}` : ''}
        </p>
        <div className="mt-auto pt-3">
          <Link
            to={href}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-royal-600 px-4 text-[0.875rem] font-semibold text-white transition hover:bg-royal-700"
          >
            View Project
          </Link>
        </div>
      </div>
    </article>
  )
}
