import { Link } from 'react-router-dom'
import { BUSINESS } from '../config/business'
import { getTermsPageSeo, getTermsPageSchemas } from '../config/seo'
import { DEFAULT_OG_IMAGE } from '../config/site'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import { PhoneLink } from '../components/ui/Button'

const pageSeo = getTermsPageSeo()
const LAST_UPDATED = 'August 9, 2026'

function Section({ id, heading, children }) {
  return (
    <ScrollReveal className="mt-12">
      <h2 id={id} className="font-display text-2xl font-semibold text-navy-900 scroll-mt-28">
        {heading}
      </h2>
      <div className="service-prose mt-5">{children}</div>
    </ScrollReveal>
  )
}

export default function TermsOfServicePage() {
  const schemas = getTermsPageSchemas()

  return (
    <>
      <SeoHead {...pageSeo} ogImage={DEFAULT_OG_IMAGE} />
      <JsonLd data={schemas} id="terms-of-service-schema" />

      <article>
        <header className="section-padding bg-navy-950 pt-32">
          <div className="section-container max-w-3xl">
            <nav className="mb-6 text-[0.8125rem] text-white/50" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-white/80">
                Home
              </Link>
              <span className="mx-2" aria-hidden="true">
                /
              </span>
              <span className="text-white/80">Terms of Service</span>
            </nav>
            <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-4 text-[0.9375rem] text-white/55">Last updated: {LAST_UPDATED}</p>
          </div>
        </header>

        <div className="service-section bg-white">
          <div className="section-container max-w-3xl">
            <div className="service-prose">
              <p>
                These Terms of Service (&quot;Terms&quot;) govern your use of the {BUSINESS.name} website and related
                quote, booking, and messaging features. By using our website or requesting services, you agree to
                these Terms.
              </p>
            </div>

            <Section id="services" heading="Services">
              <p>
                {BUSINESS.name} provides exterior cleaning services such as window cleaning, gutter cleaning, solar
                panel cleaning, pressure washing, and related services in our service area. Website quotes are
                estimates and may be confirmed or adjusted after an on-site review.
              </p>
            </Section>

            <Section id="website-use" heading="Website Use">
              <p>
                You may use this website to learn about our services, request quotes, book appointments, and contact
                us. You agree not to misuse the site, submit false information, attempt to disrupt the service, or
                use automated means to abuse forms or messaging features.
              </p>
            </Section>

            <Section id="quotes-and-bookings" heading="Quotes and Bookings">
              <p>
                Instant Quote results and online booking requests are requests for service, not guaranteed
                appointments, until confirmed by {BUSINESS.name}. Pricing, availability, and scope may change based
                on property conditions and scheduling.
              </p>
            </Section>

            <Section id="sms-terms" heading="Text Messages (SMS)">
              <p>
                If you opt in, you may receive transactional text messages from {BUSINESS.name} about appointment
                confirmations, service updates, reminders, and related follow-up. Message frequency varies. Message
                and data rates may apply.
              </p>
              <p>
                Consent to receive texts is optional and is not a condition of purchase or of receiving a quote.
                Reply <strong>STOP</strong> to opt out or <strong>HELP</strong> for help. You may also manage
                preferences by contacting us using the information below.
              </p>
              <p>
                Additional details about how we handle mobile information are described in our{' '}
                <Link to="/privacy-policy">Privacy Policy</Link>.
              </p>
            </Section>

            <Section id="limitation" heading="Limitation of Liability">
              <p>
                To the fullest extent permitted by law, {BUSINESS.name} is not liable for indirect, incidental, or
                consequential damages arising from website use, quote estimates, scheduling, or messaging features.
                Service work is subject to the terms agreed at the time of booking or performance.
              </p>
            </Section>

            <Section id="changes" heading="Changes">
              <p>
                We may update these Terms periodically. The revised Terms will be posted on this page with an
                updated &quot;Last updated&quot; date.
              </p>
            </Section>

            <Section id="contact" heading="Contact">
              <p>Questions about these Terms:</p>
              <address className="not-italic">
                <p className="font-semibold text-navy-900 !mb-2">{BUSINESS.name}</p>
                <p className="!mb-1">
                  Phone:{' '}
                  <PhoneLink sourceHint="terms" className="font-medium text-royal-700 hover:text-royal-800">
                    {BUSINESS.phone}
                  </PhoneLink>
                </p>
                <p className="!mb-0">
                  Email:{' '}
                  <a
                    href={BUSINESS.emailHref}
                    className="font-medium break-all text-royal-700 hover:text-royal-800"
                  >
                    {BUSINESS.email}
                  </a>
                </p>
              </address>
            </Section>
          </div>
        </div>
      </article>
    </>
  )
}
