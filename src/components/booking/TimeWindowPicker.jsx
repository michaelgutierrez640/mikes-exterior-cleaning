import { TIME_WINDOWS } from '../../config/booking'

export default function TimeWindowPicker({ value, customTime, onChange, onCustomTimeChange, error, customError }) {
  return (
    <fieldset>
      <legend className="mb-3 block text-[0.8125rem] font-medium text-gray-600">
        Preferred time window <span className="text-amber-500">*</span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {TIME_WINDOWS.map((window) => {
          const selected = value === window.id
          return (
            <label
              key={window.id}
              className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3.5 transition-all duration-200 ${
                selected
                  ? 'border-royal-400 bg-royal-50/60 ring-1 ring-royal-200'
                  : 'border-gray-200 bg-white hover:border-royal-200 hover:bg-royal-50/30'
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="time-window"
                  value={window.id}
                  checked={selected}
                  onChange={() => onChange(window.id)}
                  className="h-4 w-4 border-gray-300 text-royal-600 focus:ring-royal-500"
                />
                <span className="text-[0.9375rem] font-medium text-navy-900">{window.label}</span>
              </span>
              {window.time && (
                <span className="mt-1 pl-7 text-[0.8125rem] text-gray-500">{window.time}</span>
              )}
            </label>
          )
        })}
      </div>

      {value === 'custom' && (
        <div className="mt-4">
          <label htmlFor="booking-custom-time" className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
            Your preferred time <span className="text-amber-500">*</span>
          </label>
          <input
            id="booking-custom-time"
            type="text"
            value={customTime}
            onChange={(e) => onCustomTimeChange(e.target.value)}
            placeholder="e.g. Weekday after 5:30 PM"
            className={`input-light ${customError ? 'border-red-300 focus:border-red-400' : ''}`}
            aria-invalid={Boolean(customError)}
            aria-describedby={customError ? 'booking-custom-time-error' : undefined}
          />
          {customError && (
            <p id="booking-custom-time-error" className="mt-1.5 text-[0.75rem] text-red-600" role="alert">
              {customError}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-[0.75rem] text-red-600" role="alert">{error}</p>
      )}
    </fieldset>
  )
}
