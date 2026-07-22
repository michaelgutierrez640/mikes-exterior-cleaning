import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicProjects } from '../../services/projectsApi'
import { cityLabel, serviceLabel } from '../../utils/projectLabels'
import PlacementProjectCard from './PlacementProjectCard'

/**
 * Reusable published-projects placement for service, city, and service×city pages.
 * Always keeps the section visible (heading + cards or empty message) so placements
 * cannot silently disappear when API/static loading fails.
 */
export default function PublishedProjectsSection({
  service,
  city,
  limit = 6,
  heading,
  subheading,
  showViewAll = true,
  id,
  className = 'service-section bg-section-services',
}) {
  const [projects, setProjects] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoaded(false)
      setError('')
      try {
        const list = await fetchPublicProjects({ service, city, limit })
        if (!cancelled) setProjects(Array.isArray(list) ? list : [])
      } catch (err) {
        if (!cancelled) {
          setProjects([])
          setError(err.message || 'Unable to load projects')
        }
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [service, city, limit])

  const resolvedHeading =
    heading ||
    (service && city
      ? `Recent ${serviceLabel(service)} Projects in ${cityLabel(city)}`
      : service
        ? `Recent ${serviceLabel(service)} Projects`
        : city
          ? `Recent Projects Completed in ${cityLabel(city)}`
          : 'Recent Projects')

  return (
    <section
      className={className}
      aria-labelledby={id || 'published-projects'}
      data-published-projects="true"
      data-service={service || ''}
      data-city={city || ''}
      data-count={projects.length}
      data-loaded={loaded ? 'true' : 'false'}
    >
      <div className="section-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label">Our Work</p>
          <h2 id={id || 'published-projects'} className="section-title">
            {resolvedHeading}
          </h2>
          {subheading ? <p className="section-subtitle mt-3">{subheading}</p> : null}
        </div>

        {!loaded && (
          <p className="mt-10 text-center text-[0.875rem] text-gray-500" role="status">
            Loading recent projects…
          </p>
        )}

        {loaded && error && projects.length === 0 && (
          <p className="mt-10 text-center text-[0.875rem] text-amber-800" role="status">
            Projects are temporarily unavailable. Please check back shortly or visit{' '}
            <Link to="/projects" className="font-semibold underline">
              all projects
            </Link>
            .
          </p>
        )}

        {loaded && !error && projects.length === 0 && (
          <p className="mt-10 text-center text-[0.875rem] text-gray-500" role="status">
            Published projects for this page will appear here soon.
          </p>
        )}

        {projects.length > 0 && (
          <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <PlacementProjectCard key={project.slug} project={project} />
            ))}
          </div>
        )}

        {showViewAll && (
          <div className="mt-8 text-center">
            <Link to="/projects" className="btn-ghost btn-md inline-flex !rounded-xl">
              View All Projects
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
