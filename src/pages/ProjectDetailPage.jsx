import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ProjectPhotoGallery from '../components/projects/ProjectPhotoGallery'
import NotFoundPage from './NotFoundPage'
import { InstantQuoteButton, BookOnlineButton } from '../components/ui/Button'
import { getProjectDetailSeo, getProjectDetailSchemas } from '../config/seo'
import { fetchPublicProject } from '../services/projectsApi'
import {
  cityLabel,
  cityPath,
  formatCompletedDate,
  projectHeading,
  propertyTypeLabel,
  serviceLabel,
  servicePath,
} from '../utils/projectLabels'

export default function ProjectDetailPage() {
  const { slug } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setNotFound(false)
      setProject(null)
      try {
        const data = await fetchPublicProject(slug)
        if (cancelled) return
        if (!data) {
          setNotFound(true)
          return
        }
        setProject(data)
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (slug) load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const pageSeo = useMemo(() => (project ? getProjectDetailSeo(project) : null), [project])
  const schemas = useMemo(() => (project ? getProjectDetailSchemas(project) : []), [project])
  const title = projectHeading(project)

  if (!loading && notFound) {
    return <NotFoundPage />
  }

  return (
    <>
      {pageSeo && <SeoHead {...pageSeo} ogImage={pageSeo.ogImage} />}
      {schemas.length > 0 && <JsonLd data={schemas} id={`project-${slug}`} />}

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-12 sm:pt-32 sm:pb-14">
        <div className="section-container max-w-3xl">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Completed Project</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">
            {loading ? 'Loading…' : title}
          </h1>
          {project && (
            <p className="mt-4 text-[1rem] text-white/65">
              {propertyTypeLabel(project.propertyType)}
              {project.completedAt ? ` · Completed ${formatCompletedDate(project.completedAt)}` : ''}
            </p>
          )}
        </div>
      </section>

      <section className="section-container -mt-6 space-y-10 pb-24">
        {loading && (
          <p className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-[0.875rem] text-gray-500">
            Loading project…
          </p>
        )}

        {!loading && project && (
          <>
            <ProjectPhotoGallery photos={project.photos} />

            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8">
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-[0.75rem] font-semibold tracking-wide text-gray-500 uppercase">Service</dt>
                  <dd className="mt-1 text-[0.9375rem] text-navy-900">{serviceLabel(project.service)}</dd>
                </div>
                <div>
                  <dt className="text-[0.75rem] font-semibold tracking-wide text-gray-500 uppercase">City</dt>
                  <dd className="mt-1 text-[0.9375rem] text-navy-900">{cityLabel(project.city)}</dd>
                </div>
                <div>
                  <dt className="text-[0.75rem] font-semibold tracking-wide text-gray-500 uppercase">Property type</dt>
                  <dd className="mt-1 text-[0.9375rem] text-navy-900">{propertyTypeLabel(project.propertyType)}</dd>
                </div>
                <div>
                  <dt className="text-[0.75rem] font-semibold tracking-wide text-gray-500 uppercase">Completion date</dt>
                  <dd className="mt-1 text-[0.9375rem] text-navy-900">{formatCompletedDate(project.completedAt)}</dd>
                </div>
              </dl>

              {project.notes ? (
                <div className="mt-8 border-t border-black/[0.06] pt-6">
                  <h2 className="font-display text-xl font-semibold text-navy-900">About this job</h2>
                  <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-gray-700">{project.notes}</p>
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 border-t border-black/[0.06] pt-6 sm:flex-row sm:flex-wrap">
                <Link
                  to={servicePath(project.service)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-navy-900 ring-1 ring-black/[0.08]"
                >
                  {serviceLabel(project.service)} service →
                </Link>
                <Link
                  to={cityPath(project.city)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-navy-900 ring-1 ring-black/[0.08]"
                >
                  Exterior cleaning in {cityLabel(project.city)} →
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-navy-900 px-6 py-10 text-center sm:px-10">
              <h2 className="font-display text-2xl font-semibold text-white">Want results like this?</h2>
              <p className="mx-auto mt-3 max-w-xl text-[0.9375rem] text-white/65">
                Get a free Instant Quote for {serviceLabel(project.service).toLowerCase()} in {cityLabel(project.city)} and
                nearby Central Valley cities.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <InstantQuoteButton variant="royal" size="md" className="!rounded-xl" />
                <BookOnlineButton variant="secondary" size="md" className="!rounded-xl" />
                <Link to="/projects" className="btn-ghost btn-md !rounded-xl !text-white/80">
                  All projects
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  )
}
