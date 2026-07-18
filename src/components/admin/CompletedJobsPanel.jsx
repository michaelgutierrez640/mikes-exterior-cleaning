import { useCallback, useEffect, useState } from 'react'
import {
  createAdminProject,
  deleteAdminProject,
  fetchAdminProjects,
  updateAdminProject,
} from '../../services/adminApi'
import JobCard from './JobCard'
import JobForm from './JobForm'

export default function CompletedJobsPanel({ tab = 'new', onTabChange, onUnauthorized }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    setEditing(null)
    setMessage('')
    setError('')
    if (tab === 'new') setFormKey((k) => k + 1)
  }, [tab])

  const load = useCallback(async () => {
    if (tab === 'new' && !editing) return
    setLoading(true)
    setError('')
    try {
      const status = editing ? 'all' : tab
      const data = await fetchAdminProjects(status === 'new' ? 'all' : status)
      if (data?.unauthorized) {
        onUnauthorized?.()
        return
      }
      setProjects(data.projects || [])
    } catch (err) {
      setError(err.message || 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [tab, editing, onUnauthorized])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(payload) {
    return createAdminProject(payload)
  }

  async function handleUpdate(id, payload) {
    return updateAdminProject(id, payload)
  }

  function go(nextTab) {
    onTabChange?.(nextTab)
  }

  function handleSaved(project) {
    setMessage(project.status === 'published' ? 'Job published (admin-only for now).' : 'Draft saved.')
    setEditing(null)
    setFormKey((k) => k + 1)
    go(project.status === 'published' ? 'published' : 'draft')
  }

  async function publish(project) {
    if (!project.photos?.length) {
      setError('Add at least one photo before publishing')
      return
    }
    setBusyId(project.id)
    setError('')
    try {
      await updateAdminProject(project.id, { status: 'published' })
      setMessage('Job published.')
      await load()
    } catch (err) {
      if (err.unauthorized) onUnauthorized?.()
      else setError(err.message || 'Publish failed')
    } finally {
      setBusyId(null)
    }
  }

  async function unpublish(project) {
    setBusyId(project.id)
    setError('')
    try {
      await updateAdminProject(project.id, { status: 'draft' })
      setMessage('Job moved back to drafts.')
      await load()
    } catch (err) {
      if (err.unauthorized) onUnauthorized?.()
      else setError(err.message || 'Unpublish failed')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(project) {
    const ok = window.confirm(
      `Delete this ${project.status} job in ${project.city}? Photos will be removed from Blob storage. This cannot be undone.`,
    )
    if (!ok) return
    setBusyId(project.id)
    setError('')
    try {
      await deleteAdminProject(project.id)
      setMessage('Job deleted.')
      if (editing?.id === project.id) {
        setEditing(null)
        go('draft')
      }
      await load()
    } catch (err) {
      if (err.unauthorized) onUnauthorized?.()
      else setError(err.message || 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-[0.875rem] text-emerald-800" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      {(tab === 'new' || editing) && (
        <JobForm
          key={editing ? `edit-${editing.id}` : `new-${formKey}`}
          mode={editing ? 'edit' : 'create'}
          initialProject={editing}
          createProject={handleCreate}
          updateProject={handleUpdate}
          onCancel={
            editing
              ? () => {
                  setEditing(null)
                  go('draft')
                }
              : undefined
          }
          onSaved={handleSaved}
        />
      )}

      {tab !== 'new' && !editing && (
        <div>
          {loading ? (
            <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-[0.875rem] text-gray-500">
              Loading jobs…
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-[0.875rem] text-gray-500">
              No {tab === 'draft' ? 'drafts' : 'published jobs'} yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <JobCard
                  key={project.id}
                  project={project}
                  busyId={busyId}
                  onEdit={(p) => {
                    setMessage('')
                    setError('')
                    setEditing(p)
                  }}
                  onPublish={publish}
                  onUnpublish={unpublish}
                  onDelete={remove}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
