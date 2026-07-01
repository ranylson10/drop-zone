export function getSafeRedirectTo(value?: string | null, fallback = '/feed') {
  const raw = String(value || '').trim()

  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//')) return fallback
  if (raw.includes('://')) return fallback
  if (raw.startsWith('/login') || raw.startsWith('/cadastro') || raw.startsWith('/recuperar') || raw.startsWith('/confirmar')) {
    return fallback
  }

  return raw
}

export function getRedirectParamFromBrowser(fallback = '/feed') {
  if (typeof window === 'undefined') return fallback
  const params = new URLSearchParams(window.location.search)
  return getSafeRedirectTo(params.get('redirect'), fallback)
}

export function withRedirectParam(path: string, redirectTo?: string | null) {
  const safe = getSafeRedirectTo(redirectTo, '')
  if (!safe) return path
  const joiner = path.includes('?') ? '&' : '?'
  return `${path}${joiner}redirect=${encodeURIComponent(safe)}`
}
