import { supabase } from './supabase'

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || ''

export const apiBaseUrl = rawApiUrl.replace(/\/+$/, '')
export const isApiConfigured = Boolean(apiBaseUrl)

type ApiOptions = RequestInit & {
  authenticated?: boolean
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL nao configurado.')
  }

  const headers = new Headers(options.headers)
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json')

  if (options.authenticated && supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || `Erro HTTP ${response.status}`)
  }

  return data as T
}

export async function apiLogin(email: string, password: string) {
  const data = await apiFetch<any>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  if (data?.session && supabase) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  }

  return data
}

export async function apiSignup(username: string, email: string, password: string) {
  const data = await apiFetch<any>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, nome_exibicao: username, name: username, email, password }),
  })

  if (data?.session && supabase) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  }

  return data
}
