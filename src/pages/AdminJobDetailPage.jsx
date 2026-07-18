import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SERVICES } from '../config/content'
import { SERVICE_CITIES } from '../config/serviceAreas'
import { absoluteUrl } from '../config/site'
import AdminAuthGate from '../components/admin/AdminAuthGate'
import AdminNav from '../components/admin/AdminNav'
import JobForm from '../components/admin/JobForm'
import JobPhotoGallery from '../components/admin/JobPhotoGallery'
import SeoHead from '../components/seo/SeoHead'
import {
  deleteAdminProject,
  fetchAdminProject,
  updateAdminProject,
} from '../services/adminApi'

function serviceLabel(slug) {
  return SERVICES.find((s) => s.slug === slug)?.title || slug
}

function cityLabel(slug) {
  return SERVICE_CITIES.find((c) => c.slug === slug)?.name || slug
}

function jobTitle(project) {
  if (!project) return 'Job'
  return `${serviceLabel(project.service)} in ${cityLabel(project.city)}`
}

function DetailBody({
  projectId,
  project,
  loading,
  error,
  message,
  busy,
  editing,
  backHref,
  backLabel,
  signOut,
  setUnauthorized,
  setEditing,
  setMessage,
  setProject,
  publishOrUnpublish,
  remove,
}) {
  useEffect(() => {
    if (error === 'Unauthorized') setUnauthorized()
  }, [error, setUnauthorized])

  return (
    <div className="space-y-6">
      <AdminNav activeArea="jobs" onSignOut={signOut} />

      <div className="flex flex-wrap gap-2">
        <Link
          to={backHref}
          className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-navy-900 ring-1 ring-black/[0.08]"
        >
          ← {backLabel}
        </Link>
      </div>

      {message && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-[0.875rem] text-emerald-800" role="status">
          {message}
        </p>
      )}
      {error && error !== 'Unauthorized' && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-[0.875rem] text-gray-500">
          Loading job from Redis…
        </div>
      )}

      {!loading && !project && error !== 'Unauthorized' && (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center">
          <p className="text-[0.875rem] text-gray-600">Job not found for this ID in Redis.</p>
          <p className="mt-2 font-mono text-[0.75rem] text-gray-500">id: {projectId}</p>
          <Link to="/admin/completed-jobs/published" className="btn-royal btn-sm mt-4 inline-flex !rounded-xl">
            Back to Published
          </Link>
        </div>
      )}

      {!loading && project && editing && (
        <JobForm
          mode="edit"
          initialProject={project}
          createProject={async () => {
            throw new Error('Use update on detail page')
          }}
          updateProject={async (jobId, payload) => updateAdminProject(jobId, payload)}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setProject(updated)
            setEditing(false)
            setMessage('Job updated.')
          }}
        />
      )}

      {!loading && project && !editing && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7">
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

            <h2 className="font-display mt-4 text-2xl font-semibold text-navy-900">{jobTitle(project)}</h2>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
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
                <dd className="mt-1 text-[0.9375rem] capitalize text-navy-900">{project.propertyType}</dd>
              </div>
              <div>
                <dt className="text-[0.75rem] font-semibold tracking-wide text-gray-500 uppercase">Completion date</dt>
                <dd className="mt-1 text-[0.9375rem] text-navy-900">{project.completedAt}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[0.75rem] font-semibold tracking-wide text-gray-500 uppercase">Slug</dt>
                <dd className="mt-1 break-all font-mono text-[0.8125rem] text-gray-700">{project.slug}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[0.75rem] font-semibold tracking-wide text-gray-500 uppercase">Job notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-gray-700">
                  {project.notes?.trim() ? project.notes : '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                className="btn-ghost btn-md !min-h-12 w-full !rounded-xl sm:w-auto"
                disabled={busy}
                onClick={() => {
                  setMessage('')
                  setEditing(true)
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn-royal btn-md !min-h-12 w-full !rounded-xl sm:w-auto"
                disabled={busy}
                onClick={async () => {
                  try {
                    await publishOrUnpublish()
                  } catch (err) {
                    if (err.unauthorized) setUnauthorized()
                  }
                }}
              >
                {project.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              <button
                type="button"
                className="min-h-12 w-full rounded-xl border border-red-200 bg-red-50 px-6 text-[0.9375rem] font-semibold text-red-700 sm:w-auto"
                disabled={busy}
                onClick={async () => {
                  try {
                    await remove()
                  } catch (err) {
                    if (err.unauthorized) setUnauthorized()
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-display mb-3 text-xl font-semibold text-navy-900">Photos</h3>
            <JobPhotoGallery photos={project.photos || []} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminJobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      setEditing(false)
      try {
        const data = await fetchAdminProject(id)
        if (cancelled) return
        if (data?.unauthorized) {
          setError('Unauthorized')
          setProject(null)
          return
        }
        setProject(data.project)
      } catch (err) {
        if (cancelled) return
        setProject(null)
        setError(err.message || 'Failed to load job')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const backHref = useMemo(() => {
    if (project?.status === 'draft') return '/admin/completed-jobs/drafts'
    return '/admin/completed-jobs/published'
  }, [project?.status])

  const backLabel = project?.status === 'draft' ? 'Back to Drafts' : 'Back to Published'

  async function publishOrUnpublish() {
    if (!project) return
    if (project.status === 'draft' && !project.photos?.length) {
      setError('Add at least one photo before publishing')
      return
    }
    setBusy(true)
    setError('')
    try {
      const nextStatus = project.status === 'published' ? 'draft' : 'published'
      const updated = await updateAdminProject(project.id, { status: nextStatus })
      setProject(updated)
      setMessage(nextStatus === 'published' ? 'Job published.' : 'Job moved to drafts.')
    } catch (err) {
      setError(err.message || 'Status update failed')
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!project) return
    const ok = window.confirm(
      `Delete this ${project.status} job in ${cityLabel(project.city)}? Photos will be removed from Blob storage. This cannot be undone.`,
    )
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await deleteAdminProject(project.id)
      navigate(backHref, { replace: true })
    } catch (err) {
      setError(err.message || 'Delete failed')
      setBusy(false)
      throw err
    }
  }

  return (
    <>
      <SeoHead
        title={project ? `Admin · ${jobTitle(project)}` : 'Admin · Job detail'}
        description="Private completed-job detail for Mike's Exterior Cleaning Services."
        canonical={absoluteUrl(`/admin/completed-jobs/${id}`)}
        noindex
      />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="section-container">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Private</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">
            {project ? jobTitle(project) : 'Job detail'}
          </h1>
          <p className="mt-2 font-mono text-[0.75rem] text-royal-200/80">/admin/completed-jobs/{id}</p>
        </div>
      </section>

      <section className="section-container -mt-6 pb-24">
        <AdminAuthGate>
          {({ signOut, setUnauthorized }) => (
            <DetailBody
              projectId={id}
              project={project}
              loading={loading}
              error={error}
              message={message}
              busy={busy}
              editing={editing}
              backHref={backHref}
              backLabel={backLabel}
              signOut={signOut}
              setUnauthorized={setUnauthorized}
              setEditing={setEditing}
              setMessage={setMessage}
              setProject={setProject}
              publishOrUnpublish={publishOrUnpublish}
              remove={remove}
            />
          )}
        </AdminAuthGate>
      </section>
    </>
  )
}
