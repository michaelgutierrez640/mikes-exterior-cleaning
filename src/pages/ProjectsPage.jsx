import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SeoHead from '../components/seo/SeoHead'
import JsonLd from '../components/seo/JsonLd'
import ProjectCard from '../components/projects/ProjectCard'
import { getProjectsIndexSeo, getProjectsIndexSchemas } from '../config/seo'
import { fetchPublicProjects } from '../services/projectsApi'
import { InstantQuoteButton } from '../components/ui/Button'

const pageSeo = getProjectsIndexSeo()

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const list = await fetchPublicProjects({ limit: 50 })
        if (!cancelled) setProjects(list)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load projects')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <SeoHead {...pageSeo} />
      <JsonLd data={getProjectsIndexSchemas()} id="projects-index" />

      <section className="relative overflow-hidden bg-navy-950 pt-28 pb-12 sm:pt-32 sm:pb-14">
        <div className="section-container max-w-3xl">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-royal-300/80 uppercase">Portfolio</p>
          <h1 className="font-display mt-4 text-3xl font-semibold text-white sm:text-4xl">Completed Projects</h1>
          <p className="mt-4 text-[1rem] leading-relaxed text-white/65">
            Recent exterior cleaning work across the Central Valley — windows, solar, pressure washing, and more.
          </p>
        </div>
      </section>

      <section className="section-container -mt-6 pb-20">
        {loading && (
          <p className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-[0.875rem] text-gray-500">
            Loading projects…
          </p>
        )}
        {error && !loading && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && projects.length === 0 && (
          <div className="rounded-2xl border border-black/[0.06] bg-white p-10 text-center">
            <p className="text-[0.9375rem] text-gray-600">Published projects will appear here soon.</p>
            <InstantQuoteButton variant="royal" size="md" className="mt-6 !rounded-xl" showIcon={false} />
          </div>
        )}
        {!loading && projects.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        )}
        <div className="mt-12 flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <InstantQuoteButton variant="royal" size="md" className="!rounded-xl" />
            <Link to="/service-areas" className="btn-ghost btn-md !rounded-xl">
              Service Areas
            </Link>
          </div>
          <p className="max-w-xl text-center text-[0.875rem] leading-relaxed text-gray-500">
            Looking for window cleaning in a specific city?{' '}
            <Link to="/window-cleaning/modesto" className="font-semibold text-royal-600 hover:text-royal-700">
              Modesto
            </Link>
            {', '}
            <Link to="/window-cleaning/ripon" className="font-semibold text-royal-600 hover:text-royal-700">
              Ripon
            </Link>
            {', '}
            <Link to="/window-cleaning/riverbank" className="font-semibold text-royal-600 hover:text-royal-700">
              Riverbank
            </Link>
            {', '}
            <Link to="/window-cleaning/salida" className="font-semibold text-royal-600 hover:text-royal-700">
              Salida
            </Link>
            {', '}
            <Link to="/window-cleaning/turlock" className="font-semibold text-royal-600 hover:text-royal-700">
              Turlock
            </Link>
            {', or '}
            <Link to="/window-cleaning/tracy" className="font-semibold text-royal-600 hover:text-royal-700">
              Tracy
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  )
}
