/**
 * Optional transactional SMS consent — never pre-checked, never required for a quote.
 */
export default function SmsConsentCheckbox({ id, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[0.8125rem] leading-relaxed text-gray-600">
      <input
        id={id}
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-royal-600 focus:ring-royal-500"
      />
      <span>
        Text me appointment updates from Mike&apos;s Exterior Cleaning Services.
        Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out.
        <span className="mt-1 block text-gray-400">
          Optional — not required to receive a quote.
        </span>
      </span>
    </label>
  )
}
