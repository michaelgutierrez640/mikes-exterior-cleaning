import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SeoSchema from './components/SeoSchema.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SeoSchema />
    <App />
  </StrictMode>,
)
