import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { GoogleReviewsProvider } from './context/GoogleReviewsContext'
import HomePage from './pages/HomePage'
import Layout from './components/layout/Layout'
import Analytics from './components/Analytics'

const ServicePage = lazy(() => import('./pages/ServicePage'))
const WindowCleaningCityPage = lazy(() => import('./pages/WindowCleaningCityPage'))
const ServiceAreasPage = lazy(() => import('./pages/ServiceAreasPage'))
const CityPage = lazy(() => import('./pages/CityPage'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
const ResourceArticlePage = lazy(() => import('./pages/ResourceArticlePage'))
const InstantQuotePage = lazy(() => import('./pages/InstantQuotePage'))
const BookOnlinePage = lazy(() => import('./pages/BookOnlinePage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'))
const AdminLeadsPage = lazy(() => import('./pages/AdminLeadsPage'))
const AdminLeadDetailPage = lazy(() => import('./pages/AdminLeadDetailPage'))
const AdminCompletedJobsPage = lazy(() => import('./pages/AdminCompletedJobsPage'))
const AdminJobDetailPage = lazy(() => import('./pages/AdminJobDetailPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))
const ServiceCityPage = lazy(() => import('./pages/ServiceCityPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-gray-50" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-royal-200 border-t-royal-600" />
      <span className="sr-only">Loading page…</span>
    </div>
  )
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <GoogleReviewsProvider>
      <BrowserRouter>
        <Analytics />
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<Layout />}>
          <Route path="/services/:slug/:citySlug" element={<LazyPage><ServiceCityPage /></LazyPage>} />
          <Route path="/services/:slug" element={<LazyPage><ServicePage /></LazyPage>} />
          <Route path="/window-cleaning/:citySlug" element={<LazyPage><WindowCleaningCityPage /></LazyPage>} />
          <Route path="/service-areas" element={<LazyPage><ServiceAreasPage /></LazyPage>} />
          <Route path="/service-areas/:citySlug" element={<LazyPage><CityPage /></LazyPage>} />
          <Route path="/resources" element={<LazyPage><ResourcesPage /></LazyPage>} />
          <Route path="/resources/:slug" element={<LazyPage><ResourceArticlePage /></LazyPage>} />
          <Route path="/instant-quote" element={<LazyPage><InstantQuotePage /></LazyPage>} />
          <Route path="/book-online" element={<LazyPage><BookOnlinePage /></LazyPage>} />
          <Route path="/projects" element={<LazyPage><ProjectsPage /></LazyPage>} />
          <Route path="/projects/:slug" element={<LazyPage><ProjectDetailPage /></LazyPage>} />
          <Route path="/admin/dashboard" element={<LazyPage><AdminDashboardPage /></LazyPage>} />
          <Route path="/admin/reports" element={<LazyPage><AdminReportsPage /></LazyPage>} />
          <Route path="/admin/leads" element={<LazyPage><AdminLeadsPage /></LazyPage>} />
          <Route path="/admin/leads/:id" element={<LazyPage><AdminLeadDetailPage /></LazyPage>} />
          <Route path="/admin/completed-jobs" element={<Navigate to="/admin/completed-jobs/new" replace />} />
          <Route path="/admin/completed-jobs/new" element={<LazyPage><AdminCompletedJobsPage /></LazyPage>} />
          <Route path="/admin/completed-jobs/drafts" element={<LazyPage><AdminCompletedJobsPage /></LazyPage>} />
          <Route path="/admin/completed-jobs/draft" element={<Navigate to="/admin/completed-jobs/drafts" replace />} />
          <Route path="/admin/completed-jobs/published" element={<LazyPage><AdminCompletedJobsPage /></LazyPage>} />
          <Route path="/admin/completed-jobs/:id" element={<LazyPage><AdminJobDetailPage /></LazyPage>} />
          <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
        </Route>
      </Routes>
    </BrowserRouter>
    </GoogleReviewsProvider>
  )
}
