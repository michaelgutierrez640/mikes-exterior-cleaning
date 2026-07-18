import { useCallback, useEffect, useState } from 'react'
import {
  createAdminProject,
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
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    setMessage('')
    setError('')
    if (tab === 'new') setFormKey((k) => k + 1)
  }, [tab])

  const load = useCallback(async () => {
    if (tab === 'new') return
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminProjects(tab)
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
  }, [tab, onUnauthorized])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(payload) {
    return createAdminProject(payload)
  }

  async function handleUpdate(id, payload) {
    return updateAdminProject(id, payload)
  }

  function handleSaved(project) {
    setMessage(project.status === 'published' ? 'Job published (admin-only for now).' : 'Draft saved.')
    setFormKey((k) => k + 1)
    onTabChange?.(project.status === 'published' ? 'published' : 'draft')
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

      {tab === 'new' && (
        <JobForm
          key={`new-${formKey}`}
          mode="create"
          createProject={handleCreate}
          updateProject={handleUpdate}
          onSaved={handleSaved}
        />
      )}

      {tab !== 'new' && (
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
                <JobCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
