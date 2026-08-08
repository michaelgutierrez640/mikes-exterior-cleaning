import { useParams } from 'react-router-dom'
import AdminAuthGate from '../components/admin/AdminAuthGate'
import AdminNav from '../components/admin/AdminNav'
import LeadDetailPanel from '../components/admin/LeadDetailPanel'
import SeoHead from '../components/seo/SeoHead'
import { absoluteUrl } from '../config/site'

export default function AdminLeadDetailPage() {
  const { id } = useParams()
  const leadId = decodeURIComponent(String(id || '').trim())

  return (
    <>
      <SeoHead
        title="Admin · Lead detail | Mike's Exterior"
        description="Private lead detail for Mike's Exterior Cleaning Services."
        canonical={absoluteUrl(`/admin/leads/${encodeURIComponent(leadId || '')}`)}
        noindex
      />

      <section className="relative overflow-hidden bg-navy-950 pt-[calc(5.5rem+env(safe-area-inset-top))] pb-6 sm:pt-28 sm:pb-8">
        <div className="section-container">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Private</p>
          <h1 className="font-display mt-2 text-2xl font-semibold text-white sm:mt-3 sm:text-3xl">Lead</h1>
          <p className="mt-1 max-w-xl text-[0.8125rem] leading-snug text-white/55 sm:text-[0.875rem]">
            Update status, appointment, and amounts.
          </p>
        </div>
      </section>

      <section className="section-container -mt-4 pb-8 sm:pb-16">
        <AdminAuthGate>
          {({ signOut, setUnauthorized }) => (
            <div className="space-y-3 sm:space-y-5">
              <AdminNav activeArea="leads" onSignOut={signOut} />
              <LeadDetailPanel leadId={leadId} onUnauthorized={setUnauthorized} />
            </div>
          )}
        </AdminAuthGate>
      </section>
    </>
  )
}
