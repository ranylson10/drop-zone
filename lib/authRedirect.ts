export function getSafeRedirectTo(value?: string | null, fallback = '/feed') {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//')) return fallback
  if (raw.startsWith('/login') || raw.startsWith('/cadastro') || raw.startsWith('/confirmar') || raw.startsWith('/recuperar')) {
    return fallback
  }
  return raw
}

export function appendRedirectTo(path: string, redirectTo?: string | null) {
  const safe = getSafeRedirectTo(redirectTo, '')
  if (!safe) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}redirectTo=${encodeURIComponent(safe)}`
}
