import { useState } from 'react'
import { FAQS } from '../../config/content'
import ScrollReveal from '../ScrollReveal'

const CATEGORIES = ['All', 'Window Cleaning', 'Solar Panel Cleaning', 'Gutter Cleaning', 'Pressure Washing', 'General']

function FAQItem({ question, answer, category, isOpen, onToggle }) {
  return (
    <div className={`overflow-hidden rounded-[1rem] border bg-white transition-[border-color,box-shadow] duration-300 ${isOpen ? 'border-royal-200/50 shadow-[0_4px_20px_rgba(37,99,235,0.06)]' : 'border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-gray-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full min-h-[56px] items-center justify-between gap-4 px-6 py-4 text-left"
      >
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold tracking-[0.12em] text-royal-600 uppercase">{category}</span>
          <span className="text-[0.9375rem] font-semibold text-navy-900 sm:text-base">{question}</span>
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all duration-300 ${isOpen ? 'rotate-45 bg-royal-50 text-royal-600' : ''}`} aria-hidden="true">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
      </button>
      <div className={`grid transition-all duration-400 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-[0.9375rem] leading-[1.7] text-gray-500">{answer}</p>
        </div>
      </div>
    </div>
  )
}

export default function FAQ() {
  const [openFaq, setOpenFaq] = useState(0)
  const [filter, setFilter] = useState('All')

  const filtered = filter === 'All' ? FAQS : FAQS.filter((f) => f.category === filter)

  return (
    <section id="faq" className="section-padding relative bg-section-faq" aria-labelledby="faq-heading">
      <div className="section-container max-w-2xl">
        <ScrollReveal className="section-header">
          <p className="section-label">FAQ</p>
          <h2 id="faq-heading" className="section-title">
            Frequently Asked Questions
          </h2>
          <p className="section-subtitle">
            Answers to common questions about window cleaning, pressure washing, gutter cleaning, and solar panel cleaning.
          </p>
        </ScrollReveal>

        <ScrollReveal className="section-content" delay="delay-100">
          <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="FAQ categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={filter === cat}
                onClick={() => { setFilter(cat); setOpenFaq(0) }}
                className={`rounded-full px-4 py-2 text-[0.75rem] font-semibold tracking-[-0.01em] transition-all duration-300 sm:text-xs ${
                  filter === cat
                    ? 'bg-navy-900 text-white'
                    : 'border border-gray-200/80 bg-white text-gray-600 hover:text-navy-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <div key={filter} className="gallery-fade-in mt-8 space-y-3 sm:mt-10">
          {filtered.map((faq, i) => (
            <ScrollReveal key={faq.q} stagger={i + 1}>
              <FAQItem
                question={faq.q}
                answer={faq.a}
                category={faq.category}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
