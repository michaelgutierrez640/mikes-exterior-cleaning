import { SERVICES } from '../../config/content'
import { SERVICE_CITIES } from '../../config/serviceAreas'

function serviceLabel(slug) {
  return SERVICES.find((s) => s.slug === slug)?.title || slug
}

function cityLabel(slug) {
  return SERVICE_CITIES.find((c) => c.slug === slug)?.name || slug
}

export default function JobCard({ project, busyId, onEdit, onPublish, onUnpublish, onDelete }) {
  const cover = project.photos?.[0]
  const isBusy = busyId === project.id

  return (
    <article className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_3px_rgba(10,22,40,0.06)]">
      <div className="aspect-[16/10] bg-navy-950/5">
        {cover?.url ? (
          <img src={cover.url} alt={cover.alt || ''} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[0.875rem] text-gray-400">No photos</div>
        )}
      </div>
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide uppercase ${
              project.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
            }`}
          >
            {project.status}
          </span>
          <span className="text-[0.75rem] text-gray-400">{project.photos?.length || 0} photos</span>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-navy-900">{serviceLabel(project.service)}</h3>
          <p className="mt-1 text-[0.875rem] text-gray-600">
            {cityLabel(project.city)} · {project.propertyType} · {project.completedAt}
          </p>
        </div>
        {project.notes && <p className="line-clamp-3 text-[0.875rem] text-gray-500">{project.notes}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="btn-secondary btn-sm !rounded-xl" disabled={isBusy} onClick={() => onEdit(project)}>
            Edit
          </button>
          {project.status === 'draft' ? (
            <button type="button" className="btn-royal btn-sm !rounded-xl" disabled={isBusy} onClick={() => onPublish(project)}>
              Publish
            </button>
          ) : (
            <button type="button" className="btn-secondary btn-sm !rounded-xl" disabled={isBusy} onClick={() => onUnpublish(project)}>
              Unpublish
            </button>
          )}
          <button
            type="button"
            className="btn-ghost btn-sm !rounded-xl text-red-600"
            disabled={isBusy}
            onClick={() => onDelete(project)}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}
