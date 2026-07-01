'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (window.location.protocol !== 'https:' && !isLocalhost) return

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // O app continua normal se o navegador bloquear service worker.
    })
  }, [])

  return null
}
