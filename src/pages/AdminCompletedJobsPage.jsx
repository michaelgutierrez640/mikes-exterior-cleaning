import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AdminAuthGate from '../components/admin/AdminAuthGate'
import AdminNav from '../components/admin/AdminNav'
import CompletedJobsPanel from '../components/admin/CompletedJobsPanel'
import SeoHead from '../components/seo/SeoHead'
import { absoluteUrl } from '../config/site'

const TAB_ALIASES = {
  new: 'new',
  drafts: 'draft',
  draft: 'draft',
  published: 'published',
}

const TAB_LABELS = {
  new: 'Add New Job',
  draft: 'Drafts',
  published: 'Published',
}

export default function AdminCompletedJobsPage() {
  const { tab: tabParam } = useParams()
  const navigate = useNavigate()
  const tab = TAB_ALIASES[tabParam]

  if (!tab) {
    return <Navigate to="/admin/completed-jobs/new" replace />
  }

  return (
    <>
      <SeoHead
        title={`Admin · ${TAB_LABELS[tab]} | Mike's Exterior`}
        description="Private completed-jobs manager for Mike's Exterior Cleaning Services."
        canonical={absoluteUrl(`/admin/completed-jobs/${tabParam === 'draft' ? 'drafts' : tabParam}`)}
        noindex
      />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="section-container">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Private</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">Admin · Completed Jobs</h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-[1.7] text-white/60">
            Upload job photos, save drafts, and publish. Phase 1 is admin-only (not on the public site yet).
          </p>
          <p className="mt-2 font-mono text-[0.75rem] text-royal-200/80">/admin/completed-jobs/{tabParam}</p>
        </div>
      </section>

      <section className="section-container -mt-6 pb-20">
        <AdminAuthGate>
          {({ signOut, setUnauthorized }) => (
            <div className="space-y-6">
              <AdminNav activeArea="jobs" onSignOut={signOut} />
              <CompletedJobsPanel
                tab={tab}
                onTabChange={(next) => {
                  const path =
                    next === 'draft' ? '/admin/completed-jobs/drafts' : next === 'published' ? '/admin/completed-jobs/published' : '/admin/completed-jobs/new'
                  navigate(path)
                }}
                onUnauthorized={setUnauthorized}
              />
            </div>
          )}
        </AdminAuthGate>
      </section>
    </>
  )
}
