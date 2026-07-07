import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_ANSWERS } from '../../config/quoteServices'
import { calculateQuote, isServiceComplete } from '../../utils/quotePricing'
import {
  trackQuoteEstimateViewed,
  trackQuoteServiceSelected,
  trackQuoteStarted,
  trackQuoteStepCompleted,
} from '../../utils/analytics'
import QuoteConfirmation from './QuoteConfirmation'
import QuoteContactForm from './QuoteContactForm'
import QuoteServiceQuestions from './QuoteServiceQuestions'
import QuoteServiceSelector from './QuoteServiceSelector'
import QuoteStepIndicator from './QuoteStepIndicator'
import QuoteSummary from './QuoteSummary'

const STEPS = ['services', 'details', 'contact', 'confirm']

export default function InstantQuoteCalculator() {
  const [step, setStep] = useState('services')
  const [selectedServices, setSelectedServices] = useState([])
  const [answers, setAnswers] = useState({ ...DEFAULT_ANSWERS })
  const [contact, setContact] = useState(null)
  const [error, setError] = useState('')
  const [animating, setAnimating] = useState(false)

  const quote = useMemo(
    () => calculateQuote(selectedServices, answers),
    [selectedServices, answers],
  )

  useEffect(() => {
    trackQuoteStarted()
  }, [])

  useEffect(() => {
    if (quote.isComplete && quote.totalLow > 0) {
      trackQuoteEstimateViewed(quote.totalLow, quote.totalHigh)
    }
  }, [quote.isComplete, quote.totalLow, quote.totalHigh])

  const goToStep = useCallback((nextStep) => {
    setAnimating(true)
    setError('')
    setTimeout(() => {
      setStep(nextStep)
      setAnimating(false)
    }, 180)
  }, [])

  const handleToggleService = (serviceId) => {
    setSelectedServices((prev) => {
      const isSelected = prev.includes(serviceId)
      const next = isSelected ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
      trackQuoteServiceSelected(serviceId, !isSelected)
      return next
    })
    setError('')
  }

  const handleAnswerChange = (serviceId, field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], [field]: value },
    }))
    setError('')
  }

  const handleServicesNext = () => {
    if (!selectedServices.length) {
      setError('Please select at least one service to continue.')
      return
    }
    trackQuoteStepCompleted('services', selectedServices)
    goToStep('details')
  }

  const handleDetailsNext = () => {
    const incomplete = selectedServices.filter((id) => !isServiceComplete(id, answers))
    if (incomplete.length) {
      setError('Please complete all service details before continuing.')
      return
    }
    trackQuoteStepCompleted('details', selectedServices)
    goToStep('contact')
  }

  const handleSuccess = (contactData) => {
    setContact(contactData)
    trackQuoteStepCompleted('contact', selectedServices)
    goToStep('confirm')
  }

  const currentStepIndex = STEPS.indexOf(step)

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-10 xl:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        {step !== 'confirm' && <QuoteStepIndicator currentStep={step} />}

        <div
          className={`transition-all duration-300 ${animating ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}
        >
          {step === 'services' && (
            <QuoteServiceSelector
              selected={selectedServices}
              onToggle={handleToggleService}
              error={error}
            />
          )}

          {step === 'details' && (
            <QuoteServiceQuestions
              selectedServices={selectedServices}
              answers={answers}
              onChange={handleAnswerChange}
              error={error}
            />
          )}

          {step === 'contact' && (
            <QuoteContactForm
              selectedServices={selectedServices}
              answers={answers}
              quote={quote}
              onSuccess={handleSuccess}
            />
          )}

          {step === 'confirm' && (
            <QuoteConfirmation
              quote={quote}
              contact={contact}
              selectedServices={selectedServices}
            />
          )}
        </div>

        {step !== 'confirm' && (
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-between">
            {currentStepIndex > 0 ? (
              <button
                type="button"
                onClick={() => goToStep(STEPS[currentStepIndex - 1])}
                className="btn-ghost btn-sm !rounded-xl"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step === 'services' && (
              <button type="button" onClick={handleServicesNext} className="btn-royal btn-md !rounded-xl sm:ml-auto">
                Continue
              </button>
            )}

            {step === 'details' && (
              <button type="button" onClick={handleDetailsNext} className="btn-royal btn-md !rounded-xl sm:ml-auto">
                See My Estimate
              </button>
            )}
          </div>
        )}
      </div>

      {step !== 'confirm' && (
        <>
          <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
            <QuoteSummary quote={quote} selectedServices={selectedServices} />

            {quote.isComplete && step === 'details' && (
              <div className="quote-fade-in mt-4 rounded-2xl border border-royal-100 bg-royal-50/40 p-4 text-center">
                <p className="text-[0.8125rem] font-medium text-royal-800">Ready to lock in your quote?</p>
                <button
                  type="button"
                  onClick={handleDetailsNext}
                  className="btn-royal btn-sm mt-3 w-full !rounded-xl"
                >
                  Continue to Contact
                </button>
              </div>
            )}
          </aside>

          {quote.lineItems.length > 0 && step !== 'services' && (
            <div
              className="fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200 bg-white/95 px-5 py-3 backdrop-blur-xl lg:hidden"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
              aria-live="polite"
            >
              <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[0.6875rem] font-medium tracking-wide text-gray-400 uppercase">Estimate</p>
                  <p className="truncate font-display text-lg font-semibold text-royal-600">{quote.formattedRange}</p>
                </div>
                {step === 'details' && quote.isComplete && (
                  <button type="button" onClick={handleDetailsNext} className="btn-royal btn-sm shrink-0 !rounded-xl">
                    Continue
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
