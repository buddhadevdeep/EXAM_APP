import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Intercept and ignore ResizeObserver loop limit warnings to prevent dev crash overlays
window.addEventListener('error', (e) => {
  if (e.message && (
    e.message.includes('ResizeObserver loop completed with undelivered notifications') ||
    e.message.includes('ResizeObserver loop limit exceeded')
  )) {
    e.stopImmediatePropagation();
  }
});
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.message && (
    e.reason.message.includes('ResizeObserver loop completed with undelivered notifications') ||
    e.reason.message.includes('ResizeObserver loop limit exceeded')
  )) {
    e.stopImmediatePropagation();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
