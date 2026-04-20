import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Register service worker for PWA install + push notifications.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[Vesper SW] Registered, scope:', registration.scope)

        // Request notification permission so Vesper can push alerts to CC
        if ('Notification' in window && Notification.permission === 'default') {
          // Small delay so it doesn't fire before the UI renders
          setTimeout(() => {
            Notification.requestPermission().then((permission) => {
              console.log('[Vesper SW] Notification permission:', permission)
            })
          }, 3000)
        }
      })
      .catch((err) => {
        console.warn('[Vesper SW] Registration failed:', err)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
