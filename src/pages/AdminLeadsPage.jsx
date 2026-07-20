import AdminAuthGate from '../components/admin/AdminAuthGate'
import AdminNav from '../components/admin/AdminNav'
import LeadsInbox from '../components/admin/LeadsInbox'
import SeoHead from '../components/seo/SeoHead'
import { absoluteUrl } from '../config/site'

export default function AdminLeadsPage() {
  return (
    <>
      <SeoHead
        title="Admin · Leads | Mike's Exterior"
        description="Private lead inbox for Mike's Exterior Cleaning Services."
        canonical={absoluteUrl('/admin/leads')}
        noindex
      />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="section-container">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Private</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">Admin · Leads</h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-[1.7] text-white/60">
            Website inquiries from Instant Quote, Contact, and Booking — newest first. Customer details stay behind
            admin sign-in.
          </p>
          <p className="mt-2 font-mono text-[0.75rem] text-royal-200/80">/admin/leads</p>
        </div>
      </section>

      <section className="section-container -mt-6 pb-20">
        <AdminAuthGate>
          {({ signOut, setUnauthorized }) => (
            <div className="space-y-6">
              <AdminNav activeArea="leads" onSignOut={signOut} />
              <LeadsInbox onUnauthorized={setUnauthorized} />
            </div>
          )}
        </AdminAuthGate>
      </section>
    </>
  )
}
