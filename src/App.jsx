import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ServicePage from './pages/ServicePage'
import ServiceAreasPage from './pages/ServiceAreasPage'
import CityPage from './pages/CityPage'
import WindowCleaningCityPage from './pages/WindowCleaningCityPage'
import Layout from './components/layout/Layout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<Layout />}>
          <Route path="/services/:slug" element={<ServicePage />} />
          <Route path="/window-cleaning/:citySlug" element={<WindowCleaningCityPage />} />
          <Route path="/service-areas" element={<ServiceAreasPage />} />
          <Route path="/service-areas/:citySlug" element={<CityPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
