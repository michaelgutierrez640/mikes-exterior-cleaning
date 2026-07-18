import { Link } from 'react-router-dom'
import { SERVICES } from '../../config/content'
import { SERVICE_CITIES } from '../../config/serviceAreas'

function serviceLabel(slug) {
  return SERVICES.find((s) => s.slug === slug)?.title || slug
}

function cityLabel(slug) {
  return SERVICE_CITIES.find((c) => c.slug === slug)?.name || slug
}

export default function JobCard({ project }) {
  const cover = project.photos?.[0]
  const projectId = String(project?.id || '').trim()
  const href = `/admin/completed-jobs/${encodeURIComponent(projectId)}`
  const title = `${serviceLabel(project.service)} in ${cityLabel(project.city)}`

  if (!projectId) {
    return (
      <article className="rounded-2xl border border-red-200 bg-red-50 p-5 text-[0.875rem] text-red-700">
        Job is missing an id and cannot be opened.
      </article>
    )
  }

  return (
    <Link
      to={href}
      className="group block overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(10,22,40,0.06)] transition hover:border-royal-300 hover:shadow-[0_8px_24px_rgba(10,22,40,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500 active:scale-[0.995]"
      aria-label={`Open job: ${title}`}
    >
      <div className="relative aspect-[16/10] bg-navy-950/5">
        {cover?.url ? (
          <img src={cover.url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center text-[0.875rem] text-gray-400">No photos</div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide uppercase ${
              project.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
            }`}
          >
            {project.status}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/75 to-transparent px-4 py-3">
          <p className="text-[0.8125rem] font-semibold text-white">Tap to open · {project.photos?.length || 0} photos</p>
        </div>
      </div>
      <div className="space-y-2 p-5">
        <h3 className="font-display text-lg font-semibold text-navy-900 group-hover:text-royal-700">{title}</h3>
        <p className="text-[0.875rem] text-gray-600">
          {cityLabel(project.city)} · {project.propertyType} · {project.completedAt}
        </p>
        {project.notes && <p className="line-clamp-2 text-[0.875rem] text-gray-500">{project.notes}</p>}
        <p className="pt-1 text-[0.8125rem] font-semibold text-royal-600">View details →</p>
      </div>
    </Link>
  )
}
