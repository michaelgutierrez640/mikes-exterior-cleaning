import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import Layout from './components/layout/Layout'

const ServicePage = lazy(() => import('./pages/ServicePage'))
const WindowCleaningCityPage = lazy(() => import('./pages/WindowCleaningCityPage'))
const ServiceAreasPage = lazy(() => import('./pages/ServiceAreasPage'))
const CityPage = lazy(() => import('./pages/CityPage'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
const ResourceArticlePage = lazy(() => import('./pages/ResourceArticlePage'))
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<Layout />}>
          <Route path="/services/:slug" element={<LazyPage><ServicePage /></LazyPage>} />
          <Route path="/window-cleaning/:citySlug" element={<LazyPage><WindowCleaningCityPage /></LazyPage>} />
          <Route path="/service-areas" element={<LazyPage><ServiceAreasPage /></LazyPage>} />
          <Route path="/service-areas/:citySlug" element={<LazyPage><CityPage /></LazyPage>} />
          <Route path="/resources" element={<LazyPage><ResourcesPage /></LazyPage>} />
          <Route path="/resources/:slug" element={<LazyPage><ResourceArticlePage /></LazyPage>} />
          <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
