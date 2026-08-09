/**
 * Optional transactional SMS consent — never pre-checked, never required for a quote/purchase.
 * Disclosure text is A2P 10DLC campaign sample language.
 */
import { Link } from 'react-router-dom'

export const SMS_CONSENT_DISCLOSURE =
  "By checking this box, I agree to receive appointment confirmations, service updates, and follow-up text messages from Mike's Exterior Cleaning Services. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase."

export default function SmsConsentCheckbox({ id, checked, onChange }) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 text-[0.75rem] leading-relaxed text-navy-900/85 sm:text-[0.8125rem]"
      >
        <input
          id={id}
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-[0.15em] h-[1.05rem] w-[1.05rem] shrink-0 appearance-auto rounded-[0.2rem] border-2 border-navy-800/75 bg-white text-royal-700 accent-royal-700 shadow-[inset_0_0_0_1px_rgba(10,22,40,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
        />
        <span className="min-w-0 pt-px">{SMS_CONSENT_DISCLOSURE}</span>
      </label>
      <p className="pl-[calc(1.05rem+0.75rem)] text-[0.75rem] leading-snug text-navy-900/70">
        <Link
          to="/privacy-policy"
          className="font-medium text-royal-700 underline underline-offset-[3px] decoration-royal-700/70 hover:text-royal-800 hover:decoration-royal-800"
        >
          Privacy Policy
        </Link>
        <span aria-hidden="true" className="mx-1.5 text-navy-900/35">
          ·
        </span>
        <Link
          to="/terms"
          className="font-medium text-royal-700 underline underline-offset-[3px] decoration-royal-700/70 hover:text-royal-800 hover:decoration-royal-800"
        >
          Terms of Service
        </Link>
      </p>
    </div>
  )
}
