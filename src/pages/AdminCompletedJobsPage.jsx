import { useNavigate, useLocation } from 'react-router-dom'
import AdminAuthGate from '../components/admin/AdminAuthGate'
import AdminNav from '../components/admin/AdminNav'
import CompletedJobsPanel from '../components/admin/CompletedJobsPanel'
import SeoHead from '../components/seo/SeoHead'
import { absoluteUrl } from '../config/site'

function tabFromPath(pathname) {
  if (pathname.endsWith('/drafts') || pathname.endsWith('/draft')) return { tab: 'draft', pathSeg: 'drafts' }
  if (pathname.endsWith('/published')) return { tab: 'published', pathSeg: 'published' }
  return { tab: 'new', pathSeg: 'new' }
}

const TAB_LABELS = {
  new: 'Add New Job',
  draft: 'Drafts',
  published: 'Published',
}

export default function AdminCompletedJobsPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { tab, pathSeg } = tabFromPath(pathname)

  return (
    <>
      <SeoHead
        title={`Admin · ${TAB_LABELS[tab]} | Mike's Exterior`}
        description="Private completed-jobs manager for Mike's Exterior Cleaning Services."
        canonical={absoluteUrl(`/admin/completed-jobs/${pathSeg}`)}
        noindex
      />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="section-container">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Private</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">Admin · Completed Jobs</h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-[1.7] text-white/60">
            Upload job photos, save drafts, and publish. Tap any job card to open full details and the photo gallery.
          </p>
          <p className="mt-2 font-mono text-[0.75rem] text-royal-200/80">/admin/completed-jobs/{pathSeg}</p>
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
                    next === 'draft'
                      ? '/admin/completed-jobs/drafts'
                      : next === 'published'
                        ? '/admin/completed-jobs/published'
                        : '/admin/completed-jobs/new'
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
