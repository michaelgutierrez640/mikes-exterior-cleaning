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
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[0.8125rem] leading-relaxed text-gray-600">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-royal-600 focus:ring-royal-500"
        />
        <span>{SMS_CONSENT_DISCLOSURE}</span>
      </label>
      <p className="pl-7 text-[0.75rem] text-gray-400">
        <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-gray-600">
          Privacy Policy
        </Link>
        <span aria-hidden="true"> · </span>
        <Link to="/terms" className="underline underline-offset-2 hover:text-gray-600">
          Terms of Service
        </Link>
      </p>
    </div>
  )
}
