import { Link } from 'react-router-dom'
import { QuoteButton } from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center bg-navy-950 px-6 pt-32 text-center">
      <p className="text-[0.6875rem] font-bold tracking-[0.2em] text-royal-400 uppercase">404</p>
      <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">Page Not Found</h1>
      <p className="mt-4 max-w-md text-white/60">The page you are looking for does not exist or has moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link to="/" className="btn-secondary btn-md rounded-2xl">Go Home</Link>
        <QuoteButton variant="primary" />
      </div>
    </section>
  )
}
