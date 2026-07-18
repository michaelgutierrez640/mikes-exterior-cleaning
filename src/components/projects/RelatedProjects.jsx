import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicProjects } from '../../services/projectsApi'
import ProjectCard from './ProjectCard'

/**
 * Matching published projects embed for home / service / city pages.
 * Renders nothing when empty.
 */
export default function RelatedProjects({
  service,
  city,
  limit = 3,
  heading = 'Recent Projects',
  subheading,
  showViewAll = true,
  id,
}) {
  const [projects, setProjects] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const list = await fetchPublicProjects({ service, city, limit })
        if (!cancelled) setProjects(list)
      } catch {
        if (!cancelled) setProjects([])
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [service, city, limit])

  if (!loaded || projects.length === 0) return null

  return (
    <section className="service-section bg-white" aria-labelledby={id || 'related-projects'}>
      <div className="section-container">
        <div className="section-header max-w-2xl">
          <p className="section-label">Our Work</p>
          <h2 id={id || 'related-projects'} className="section-title">
            {heading}
          </h2>
          {subheading ? <p className="section-subtitle mt-3">{subheading}</p> : null}
        </div>
        <div className="section-content grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
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
