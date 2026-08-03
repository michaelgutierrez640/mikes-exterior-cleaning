import AdminAuthGate from '../components/admin/AdminAuthGate'
import AdminNav from '../components/admin/AdminNav'
import CustomerReviewsInbox from '../components/admin/CustomerReviewsInbox'
import SeoHead from '../components/seo/SeoHead'
import { absoluteUrl } from '../config/site'

export default function AdminCustomerReviewsPage() {
  return (
    <>
      <SeoHead
        title="Admin · Customer Reviews | Mike's Exterior"
        description="Private website customer review moderation for Mike's Exterior Cleaning Services."
        canonical={absoluteUrl('/admin/customer-reviews')}
        noindex
      />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="section-container">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Private</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Admin · Customer Reviews
          </h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-[1.7] text-white/60">
            Website customer reviews submitted at /review. Approve, publish, or delete — nothing goes live
            automatically. These are not Google reviews.
          </p>
          <p className="mt-2 font-mono text-[0.75rem] text-royal-200/80">/admin/customer-reviews</p>
        </div>
      </section>

      <section className="section-container -mt-6 pb-20">
        <AdminAuthGate>
          {({ signOut, setUnauthorized }) => (
            <div className="space-y-6">
              <AdminNav activeArea="reviews" onSignOut={signOut} />
              <CustomerReviewsInbox onUnauthorized={setUnauthorized} />
            </div>
          )}
        </AdminAuthGate>
      </section>
    </>
  )
}
