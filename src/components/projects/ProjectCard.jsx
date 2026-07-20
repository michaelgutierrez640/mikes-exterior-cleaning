import { Link } from 'react-router-dom'
import {
  cityLabel,
  formatCompletedDate,
  projectHeading,
  projectPath,
  propertyTypeLabel,
  serviceLabel,
} from '../../utils/projectLabels'
import ProjectOptimizedImage from './ProjectOptimizedImage'

export default function ProjectCard({ project }) {
  if (!project?.slug) return null
  const title = projectHeading(project)
  const href = projectPath(project.slug)
  const cover = project.coverImage

  return (
    <Link
      to={href}
      className="group block overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(10,22,40,0.06)] transition hover:border-royal-300 hover:shadow-[0_8px_24px_rgba(10,22,40,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500"
      aria-label={`View project: ${title}`}
    >
      <ProjectOptimizedImage
        photo={cover}
        role="card"
        alt={cover?.alt || ''}
        className="aspect-[16/10]"
        imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        aspectRatio="16 / 10"
      />
      <div className="space-y-2 p-5">
        <p className="text-[0.75rem] font-semibold tracking-wide text-royal-600 uppercase">
          {serviceLabel(project.service)} · {cityLabel(project.city)}
        </p>
        <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">{title}</h3>
        <p className="text-[0.875rem] text-gray-600">
          {propertyTypeLabel(project.propertyType)}
          {project.completedAt ? ` · ${formatCompletedDate(project.completedAt)}` : ''}
        </p>
        {project.description ? (
          <p className="line-clamp-2 text-[0.875rem] leading-relaxed text-gray-500">{project.description}</p>
        ) : null}
        <p className="pt-1 text-[0.8125rem] font-semibold text-royal-600">View project →</p>
      </div>
    </Link>
  )
}
