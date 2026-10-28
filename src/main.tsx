import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Router } from 'wouter'
import '@/styles/index.css'
import App from '@/App.tsx'

// Base de Vite sin la barra final ('/' → '', '/buscaminas-plus/' → '/buscaminas-plus')
const base = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router base={base}>
      <App />
    </Router>
  </StrictMode>,
)
