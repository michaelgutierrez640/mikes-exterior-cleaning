import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicProjects } from '../../services/projectsApi'
import { cityLabel, serviceLabel } from '../../utils/projectLabels'
import PlacementProjectCard from './PlacementProjectCard'

/**
 * Reusable published-projects placement for service, city, and service×city pages.
 * Fetches published-only jobs with normalized service/city matching.
 * Renders nothing when there are no matching published projects.
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
          ? `Recent Projects in ${cityLabel(city)}`
          : 'Recent Projects')

  if (!loaded) {
    return (
      <section className={className} aria-labelledby={id || 'published-projects'} aria-busy="true">
        <div className="section-container">
          <div className="section-header max-w-2xl">
            <p className="section-label">Our Work</p>
            <h2 id={id || 'published-projects'} className="section-title">
              {resolvedHeading}
            </h2>
          </div>
          <p className="section-content text-[0.875rem] text-gray-500">Loading recent projects…</p>
        </div>
      </section>
    )
  }

  if (error || projects.length === 0) return null

  return (
    <section className={className} aria-labelledby={id || 'published-projects'}>
      <div className="section-container">
        <div className="section-header max-w-2xl">
          <p className="section-label">Our Work</p>
          <h2 id={id || 'published-projects'} className="section-title">
            {resolvedHeading}
          </h2>
          {subheading ? <p className="section-subtitle mt-3">{subheading}</p> : null}
        </div>
        <div className="section-content grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <PlacementProjectCard key={project.slug} project={project} />
          ))}
        </div>
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
