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

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="section-container">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Private</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">Admin · Lead</h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-[1.7] text-white/60">
            View inquiry details, update pipeline status, and add private notes.
          </p>
          <p className="mt-2 break-all font-mono text-[0.75rem] text-royal-200/80">/admin/leads/{leadId}</p>
        </div>
      </section>

      <section className="section-container -mt-6 pb-20">
        <AdminAuthGate>
          {({ signOut, setUnauthorized }) => (
            <div className="space-y-6">
              <AdminNav activeArea="leads" onSignOut={signOut} />
              <LeadDetailPanel leadId={leadId} onUnauthorized={setUnauthorized} />
            </div>
          )}
        </AdminAuthGate>
      </section>
    </>
  )
}
