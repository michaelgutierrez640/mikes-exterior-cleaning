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
import { CallButton, PhoneLink, QuoteButton } from '../components/ui/Button'

const pageSeo = getPrivacyPolicyPageSeo()
const LAST_UPDATED = 'July 25, 2026'

const SECTIONS = [
  {
    id: 'information-we-collect',
    heading: 'Information We Collect',
    paragraphs: [
      'We may collect information you provide when you request a quote, book a service, submit a contact form, or otherwise communicate with us. This may include your name, phone number, email address, property address, service details, quote requests, form responses, and related notes about the work you need.',
      'We may also collect website usage information, such as pages visited, approximate location derived from IP address, device and browser type, and how you interact with our site. This helps us understand site performance and improve the experience for visitors.',
    ],
  },
  {
    id: 'how-we-use-information',
    heading: 'How We Use Information',
    paragraphs: [
      'We may use the information we collect to provide quotes, schedule services, contact customers, respond to inquiries, and deliver customer support.',
      'We may also use information to improve our website, measure advertising performance, understand which services and pages are most useful, and operate and grow our business in a responsible way.',
    ],
  },
  {
    id: 'meta-and-advertising',
    heading: 'Meta and Advertising',
    paragraphs: [
      'Customers may submit information through Facebook or Instagram lead forms when those options are available. When you submit a lead form on Meta platforms, Meta may share the details you provide with us so we can respond to your request.',
      'We may use Meta Pixel, Meta Conversions API, or similar advertising tools to measure ad performance, understand the effectiveness of our advertising, and improve how we reach people who may be interested in our services. These tools may collect or receive information about visits to our website and related actions, subject to Meta\'s policies and your privacy settings on those platforms.',
    ],
  },
  {
    id: 'cookies-and-analytics',
    heading: 'Cookies and Analytics',
    paragraphs: [
      'Our website may use cookies and similar technologies, along with analytics tools such as Vercel Analytics, Google Analytics, or Meta Pixel. These tools help us understand traffic, improve site performance, and measure advertising results.',
      'You can control cookies through your browser settings. Disabling certain cookies may affect how some features of the site work.',
    ],
  },
  {
    id: 'sharing-of-information',
    heading: 'Sharing of Information',
    paragraphs: [
      'We do not sell your personal information.',
      'We may share information with trusted service providers only when needed to operate the website, process leads, provide services, send communications, or comply with legal requirements. Examples may include hosting, email delivery, analytics, advertising measurement, and scheduling or customer-management tools we use to run the business.',
    ],
  },
  {
    id: 'data-security',
    heading: 'Data Security',
    paragraphs: [
      'We take reasonable steps to protect customer information against unauthorized access, loss, or misuse. However, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    id: 'data-retention',
    heading: 'Data Retention',
    paragraphs: [
      'We keep information only as long as reasonably necessary for business operations, customer service, legal obligations, and recordkeeping purposes. When information is no longer needed for these purposes, we take steps to delete or de-identify it where practical.',
    ],
  },
  {
    id: 'your-choices',
    heading: 'Your Choices',
    paragraphs: [
      'You may request access to, correction of, or deletion of personal information we hold about you, subject to applicable law and any information we must retain for legitimate business or legal reasons.',
      'You may also opt out of marketing messages by using the unsubscribe option in an email (when available) or by contacting us directly and asking to be removed from marketing communications. Transactional messages related to quotes, appointments, or services may still be necessary to fulfill your request.',
    ],
  },
  {
    id: 'childrens-privacy',
    heading: "Children's Privacy",
    paragraphs: [
      'Our services are not directed toward children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us so we can take appropriate steps.',
    ],
  },
  {
    id: 'changes-to-this-policy',
    heading: 'Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date shown on this page. We encourage you to review this page periodically for the latest information about our privacy practices.',
    ],
  },
]

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
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70">
              How {BUSINESS.name} collects, uses, and protects information when you visit our website or request our services.
            </p>
            <p className="mt-4 text-[0.9375rem] text-white/55">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </header>

        <div className="service-section bg-white">
          <div className="section-container max-w-3xl">
            <p className="text-lg leading-relaxed text-gray-600">
              {`This Privacy Policy describes how ${BUSINESS.name} ("we," "us," or "our") handles information in connection with our website and exterior cleaning services. By using our website or submitting information to us, you acknowledge this policy.`}
            </p>

            {SECTIONS.map((section) => (
              <ScrollReveal key={section.id} className="mt-12">
                <h2
                  id={section.id}
                  className="font-display text-2xl font-semibold text-navy-900 scroll-mt-28"
                >
                  {section.heading}
                </h2>
                <div className="service-prose mt-5">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 56)}>{p}</p>
                  ))}
                </div>
              </ScrollReveal>
            ))}

            <ScrollReveal className="mt-12">
              <h2 id="contact-us" className="font-display text-2xl font-semibold text-navy-900 scroll-mt-28">
                Contact Us
              </h2>
              <div className="service-prose mt-5">
                <p>
                  If you have questions about this Privacy Policy or want to make a privacy-related request, contact us:
                </p>
              </div>
              <address className="mt-5 not-italic text-[0.9375rem] leading-relaxed text-gray-700">
                <p className="font-semibold text-navy-900">{BUSINESS.name}</p>
                <p className="mt-2">
                  Phone:{' '}
                  <PhoneLink
                    sourceHint="privacy-policy"
                    className="font-medium text-royal-700 hover:text-royal-800"
                  >
                    {BUSINESS.phone}
                  </PhoneLink>
                </p>
                <p className="mt-1">
                  Email:{' '}
                  <a
                    href={BUSINESS.emailHref}
                    className="font-medium break-all text-royal-700 hover:text-royal-800"
                  >
                    {BUSINESS.email}
                  </a>
                </p>
              </address>
            </ScrollReveal>

            <div className="mt-14 rounded-[1.25rem] border border-royal-100 bg-royal-50/50 p-8 text-center">
              <h2 className="font-display text-xl font-semibold text-navy-900">Need Exterior Cleaning Help?</h2>
              <p className="mt-3 text-gray-600">
                Free estimates across Modesto and the Central Valley.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <QuoteButton variant="primary" />
                <CallButton variant="secondary" />
              </div>
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
