import { Link, NavLink } from 'react-router-dom'

const PRIMARY = [
  { to: '/admin/dashboard', label: 'Analytics', end: true, area: 'analytics' },
  { to: '/admin/leads', label: 'Leads', end: false, matchPrefix: '/admin/leads', area: 'leads' },
  {
    to: '/admin/completed-jobs/new',
    label: 'Completed Jobs',
    end: false,
    matchPrefix: '/admin/completed-jobs',
    area: 'jobs',
  },
]

const JOB_TABS = [
  { to: '/admin/completed-jobs/new', label: 'Add New Job' },
  { to: '/admin/completed-jobs/drafts', label: 'Drafts' },
  { to: '/admin/completed-jobs/published', label: 'Published' },
]

function linkClass({ isActive }) {
  return [
    'inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-center text-[0.8125rem] font-semibold sm:flex-none sm:px-4 sm:text-[0.875rem]',
    isActive ? 'bg-royal-600 text-white shadow-sm' : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15',
  ].join(' ')
}

function jobTabClass({ isActive }) {
  return [
    'inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-center text-[0.8125rem] font-semibold sm:flex-none sm:min-w-[8.5rem]',
    isActive
      ? 'bg-navy-900 text-white'
      : 'bg-white text-navy-900 ring-1 ring-black/[0.08] hover:bg-gray-50',
  ].join(' ')
}

/**
 * High-visibility admin navigation for desktop and mobile.
 */
export default function AdminNav({ activeArea = 'analytics', onSignOut }) {
  const jobsActive = activeArea === 'jobs'

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-navy-950 p-3 shadow-[0_8px_30px_rgba(10,22,40,0.18)] sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/90 uppercase">Admin menu</p>
          {onSignOut && (
            <button type="button" className="text-[0.8125rem] font-semibold text-white/70 hover:text-white" onClick={onSignOut}>
              Sign out
            </button>
          )}
        </div>
        <nav className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" aria-label="Admin primary">
          {PRIMARY.map((item) => {
            if (item.matchPrefix) {
              const isActive = activeArea === item.area
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    'inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-center text-[0.8125rem] font-semibold sm:flex-none sm:px-4 sm:text-[0.875rem]',
                    isActive ? 'bg-royal-600 text-white shadow-sm' : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              )
            }
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {jobsActive && (
        <nav className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" aria-label="Completed Jobs sections">
          {JOB_TABS.map((item) => (
            <NavLink key={item.to} to={item.to} end className={jobTabClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
