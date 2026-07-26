import { Link } from 'react-router-dom'
import { BUSINESS } from '../config/business'
import {
  getPrivacyPolicyPageSeo,
  getPrivacyPolicyPageSchemas,
} from '../config/seo'
import { DEFAULT_OG_IMAGE } from '../config/site'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ScrollReveal from '../components/ScrollReveal'
import { PhoneLink } from '../components/ui/Button'

const pageSeo = getPrivacyPolicyPageSeo()
const LAST_UPDATED = 'July 25, 2026'

/** Display casing requested for the privacy contact block (same mailbox as BUSINESS.email). */
const PRIVACY_CONTACT_EMAIL = 'Mikesexteriorcleaning209@gmail.com'

function Section({ id, heading, children }) {
  return (
    <ScrollReveal className="mt-12">
      <h2
        id={id}
        className="font-display text-2xl font-semibold text-navy-900 scroll-mt-28"
      >
        {heading}
      </h2>
      <div className="service-prose mt-5">{children}</div>
    </ScrollReveal>
  )
}

export default function PrivacyPolicyPage() {
  const schemas = getPrivacyPolicyPageSchemas()

  return (
    <>
      <SeoHead {...pageSeo} ogImage={DEFAULT_OG_IMAGE} />
      <JsonLd data={schemas} id="privacy-policy-schema" />

      <article>
        <header className="section-padding bg-navy-950 pt-32">
          <div className="section-container max-w-3xl">
            <nav className="mb-6 text-[0.8125rem] text-white/50" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-white/80">Home</Link>
              <span className="mx-2" aria-hidden="true">/</span>
              <span className="text-white/80">Privacy Policy</span>
            </nav>
            <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-[0.9375rem] text-white/55">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </header>

        <div className="service-section bg-white">
          <div className="section-container max-w-3xl">
            <div className="service-prose">
              <p>
                {BUSINESS.name} respects your privacy. This Privacy Policy explains what information we may
                collect, how we may use it, and the choices available to you when you visit our website,
                request a quote, or submit information through one of our advertisements.
              </p>
            </div>

            <Section id="information-we-may-collect" heading="Information We May Collect">
              <p>We may collect information that you voluntarily provide, including:</p>
              <ul>
                <li>Your name</li>
                <li>Phone number</li>
                <li>Email address</li>
                <li>Property city or service address</li>
                <li>Requested service</li>
                <li>Property and roof-access details</li>
                <li>Solar-panel count</li>
                <li>Photos or information you provide for an estimate</li>
                <li>Messages and form responses</li>
              </ul>
              <p>
                We may also receive limited technical information when you use our website, such as browser
                type, device type, referring page, pages visited, and general website interaction data.
              </p>
            </Section>

            <Section id="how-we-use-information" heading="How We Use Information">
              <p>We may use the information we collect to:</p>
              <ul>
                <li>Respond to inquiries</li>
                <li>Prepare and provide estimates</li>
                <li>Confirm service eligibility and pricing</li>
                <li>Schedule and perform services</li>
                <li>Contact customers regarding requested services</li>
                <li>Provide customer support</li>
                <li>Maintain business records</li>
                <li>Improve our website and advertising</li>
                <li>Prevent fraud, misuse, or security issues</li>
                <li>Comply with applicable legal obligations</li>
              </ul>
            </Section>

            <Section id="facebook-and-instagram-lead-forms" heading="Facebook and Instagram Lead Forms">
              <p>
                When you submit information through a Facebook or Instagram lead form, Meta may provide that
                information to {BUSINESS.name} so we can respond to your request.
              </p>
              <p>
                Information submitted through Meta is also subject to Meta&apos;s own privacy terms and policies.
              </p>
            </Section>

            <Section id="cookies-analytics-and-advertising-tools" heading="Cookies, Analytics, and Advertising Tools">
              <p>
                Our website may use cookies or similar technologies for basic website functionality, analytics,
                and advertising measurement.
              </p>
              <p>
                These tools may collect limited information about website visits and interactions. The specific
                tools used may change over time.
              </p>
            </Section>

            <Section id="how-we-share-information" heading="How We Share Information">
              <p>We do not sell personal information for money.</p>
              <p>
                We may share information with service providers that help us operate our website, communicate
                with customers, manage leads, provide analytics, or perform other necessary business functions.
              </p>
              <p>We may also disclose information when reasonably necessary to:</p>
              <ul>
                <li>Comply with applicable law or legal process</li>
                <li>Protect our rights, customers, property, or safety</li>
                <li>Investigate fraud, misuse, or security concerns</li>
                <li>Complete a business transfer, merger, or sale if one occurs</li>
              </ul>
            </Section>

            <Section id="data-retention" heading="Data Retention">
              <p>
                We retain information only for as long as reasonably necessary to respond to inquiries, provide
                services, maintain appropriate business records, resolve disputes, and meet legal or operational
                obligations.
              </p>
            </Section>

            <Section id="data-security" heading="Data Security">
              <p>
                We take reasonable measures intended to protect the information we maintain. However, no website,
                electronic transmission, or storage system can be guaranteed to be completely secure.
              </p>
            </Section>

            <Section id="your-choices" heading="Your Choices">
              <p>You may contact us to:</p>
              <ul>
                <li>Ask what personal information we have about you</li>
                <li>Request a correction</li>
                <li>Request deletion, subject to legal or legitimate business exceptions</li>
                <li>Ask us to stop sending promotional communications</li>
              </ul>
              <p>We may need to verify your identity before completing certain requests.</p>
            </Section>

            <Section id="california-privacy-rights" heading="California Privacy Rights">
              <p>
                California residents may have rights regarding their personal information under applicable
                California privacy laws.
              </p>
              <p>
                These rights may include requesting information about personal information collected, requesting
                correction or deletion, and opting out of certain uses or disclosures when applicable.
              </p>
              <p>
                Not every California privacy law applies to every small business. {BUSINESS.name} will respond to
                verified privacy requests as required by applicable law.
              </p>
            </Section>

            <Section id="childrens-privacy" heading={"Children's Privacy"}>
              <p>
                Our website and services are intended for adults seeking property-cleaning services. We do not
                knowingly collect personal information from children under 13.
              </p>
            </Section>

            <Section id="third-party-links" heading="Third-Party Links">
              <p>
                Our website may contain links to third-party websites or services. We are not responsible for the
                privacy practices or content of those third parties.
              </p>
            </Section>

            <Section id="changes-to-this-policy" heading="Changes to This Policy">
              <p>
                We may update this Privacy Policy periodically. The revised policy will be posted on this page
                with an updated &quot;Last updated&quot; date.
              </p>
            </Section>

            <Section id="contact-us" heading="Contact Us">
              <p>For privacy questions or requests, contact:</p>
              <address className="not-italic">
                <p className="font-semibold text-navy-900 !mb-2">{BUSINESS.name}</p>
                <p className="!mb-1">
                  Phone:{' '}
                  <PhoneLink
                    sourceHint="privacy-policy"
                    className="font-medium text-royal-700 hover:text-royal-800"
                  >
                    {BUSINESS.phone}
                  </PhoneLink>
                </p>
                <p className="!mb-0">
                  Email:{' '}
                  <a
                    href={BUSINESS.emailHref}
                    className="font-medium break-all text-royal-700 hover:text-royal-800"
                  >
                    {PRIVACY_CONTACT_EMAIL}
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
