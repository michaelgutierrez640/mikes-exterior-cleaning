import {
  CLEANING_TYPE_OPTIONS,
  GUTTER_LENGTH_OPTIONS,
  PANEL_COUNT_OPTIONS,
  PRESSURE_SURFACE_OPTIONS,
  QUOTE_SERVICES,
  SQFT_OPTIONS,
  STORY_OPTIONS,
  WINDOW_COUNT_OPTIONS,
} from '../../config/quoteServices'

function FieldGroup({ label, children, id }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[0.8125rem] font-medium text-gray-600">
        {label}
      </label>
      {children}
    </div>
  )
}

function SelectField({ id, value, onChange, options, placeholder }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-light"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function RadioGroup({ name, value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`cursor-pointer rounded-full border px-4 py-2.5 text-[0.8125rem] font-medium transition-all duration-300 ${
            value === opt.value
              ? 'border-royal-400 bg-royal-50 text-royal-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-royal-200'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

function WindowCleaningFields({ answers, onChange }) {
  return (
    <div className="space-y-5">
      <FieldGroup label="Number of windows" id="wc-windowCount">
        <SelectField
          id="wc-windowCount"
          value={answers.windowCount}
          onChange={(v) => onChange('windowCount', v)}
          options={WINDOW_COUNT_OPTIONS}
          placeholder="Select window count..."
        />
      </FieldGroup>
      <FieldGroup label="Interior or exterior?" id="wc-cleaningType">
        <RadioGroup
          name="wc-cleaningType"
          value={answers.cleaningType}
          onChange={(v) => onChange('cleaningType', v)}
          options={CLEANING_TYPE_OPTIONS}
        />
      </FieldGroup>
      <FieldGroup label="Number of stories" id="wc-stories">
        <RadioGroup
          name="wc-stories"
          value={answers.stories}
          onChange={(v) => onChange('stories', v)}
          options={STORY_OPTIONS}
        />
      </FieldGroup>
    </div>
  )
}

function PressureWashingFields({ answers, onChange }) {
  return (
    <div className="space-y-5">
      <FieldGroup label="What needs cleaning?" id="pw-surface">
        <RadioGroup
          name="pw-surface"
          value={answers.surface}
          onChange={(v) => onChange('surface', v)}
          options={PRESSURE_SURFACE_OPTIONS}
        />
      </FieldGroup>
      <FieldGroup label="Approximate square footage" id="pw-sqft">
        <SelectField
          id="pw-sqft"
          value={answers.sqft}
          onChange={(v) => onChange('sqft', v)}
          options={SQFT_OPTIONS}
          placeholder="Select approximate area..."
        />
      </FieldGroup>
      <FieldGroup label="Number of stories" id="pw-stories">
        <RadioGroup
          name="pw-stories"
          value={answers.stories}
          onChange={(v) => onChange('stories', v)}
          options={STORY_OPTIONS}
        />
      </FieldGroup>
    </div>
  )
}

function GutterCleaningFields({ answers, onChange }) {
  return (
    <div className="space-y-5">
      <FieldGroup label="Linear feet of gutters" id="gc-linearFeet">
        <SelectField
          id="gc-linearFeet"
          value={answers.linearFeet}
          onChange={(v) => onChange('linearFeet', v)}
          options={GUTTER_LENGTH_OPTIONS}
          placeholder="Select gutter length..."
        />
      </FieldGroup>
      <FieldGroup label="Number of stories" id="gc-stories">
        <RadioGroup
          name="gc-stories"
          value={answers.stories}
          onChange={(v) => onChange('stories', v)}
          options={STORY_OPTIONS}
        />
      </FieldGroup>
    </div>
  )
}

function SolarPanelFields({ answers, onChange }) {
  return (
    <div className="space-y-5">
      <FieldGroup label="Number of solar panels" id="sp-panelCount">
        <SelectField
          id="sp-panelCount"
          value={answers.panelCount}
          onChange={(v) => onChange('panelCount', v)}
          options={PANEL_COUNT_OPTIONS}
          placeholder="Select panel count..."
        />
      </FieldGroup>
      <FieldGroup label="Roof height" id="sp-stories">
        <RadioGroup
          name="sp-stories"
          value={answers.stories}
          onChange={(v) => onChange('stories', v)}
          options={STORY_OPTIONS}
        />
      </FieldGroup>
    </div>
  )
}

const FIELD_COMPONENTS = {
  'window-cleaning': WindowCleaningFields,
  'pressure-washing': PressureWashingFields,
  'gutter-cleaning': GutterCleaningFields,
  'solar-panel-cleaning': SolarPanelFields,
}

export default function QuoteServiceQuestions({ selectedServices, answers, onChange, error }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-navy-900 sm:text-2xl">Tell us about your property</h2>
      <p className="mt-2 text-[0.9375rem] text-gray-500">Answer a few quick questions — your estimate updates instantly.</p>

      <div className="mt-6 space-y-6">
        {selectedServices.map((serviceId) => {
          const service = QUOTE_SERVICES.find((s) => s.id === serviceId)
          const Fields = FIELD_COMPONENTS[serviceId]
          if (!service || !Fields) return null

          return (
            <div
              key={serviceId}
              className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6"
            >
              <h3 className="flex items-center gap-2 font-semibold text-navy-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-royal-100 text-[0.75rem] font-bold text-royal-700">
                  {selectedServices.indexOf(serviceId) + 1}
                </span>
                {service.name}
              </h3>
              <div className="mt-5">
                <Fields
                  answers={answers[serviceId] ?? {}}
                  onChange={(field, value) => onChange(serviceId, field, value)}
                />
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
