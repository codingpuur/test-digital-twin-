import { ChevronDown } from 'lucide-react'

import { FAQS } from './landing.content'

export const LandingFaq = () => (
  <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-20">
    <h2 className="text-center text-3xl md:text-4xl">Questions</h2>
    <div className="mt-10 divide-y rounded-xl border bg-surface-100">
      {FAQS.map((item) => (
        <details key={item.question} className="group px-6 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-x-4 text-left">
            <span>{item.question}</span>
            <ChevronDown
              size={18}
              className="shrink-0 text-foreground-lighter transition-transform group-open:rotate-180"
            />
          </summary>
          <p className="mt-3 text-sm text-foreground-light">{item.answer}</p>
        </details>
      ))}
    </div>
  </section>
)
