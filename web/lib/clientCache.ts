'use client'

type CacheEntry<T> = {
  savedAt: number
  data: T
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

function now() {
  return Date.now()
}

export function getClientCache<T>(key: string, maxAgeMs = 60_000): T | null {
  if (typeof window === 'undefined') return null

  const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined
  if (memoryEntry && now() - memoryEntry.savedAt <= maxAgeMs) {
    return memoryEntry.data
  }

  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry<T>
    if (!entry?.savedAt || now() - entry.savedAt > maxAgeMs) {
      sessionStorage.removeItem(key)
      return null
    }

    memoryCache.set(key, entry)
    return entry.data
  } catch {
    sessionStorage.removeItem(key)
    return null
  }
}

export function setClientCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return

  const entry: CacheEntry<T> = {
    savedAt: now(),
    data,
  }

  memoryCache.set(key, entry)

  try {
    sessionStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Ignore storage quota or private mode failures; memory cache still helps.
  }
}
