import { supabase } from '@/lib/supabase'

interface EnsureProfileInput {
  userId: string
  email?: string | null
  username?: string | null
  nomeExibicao?: string | null
}

function fallbackUsername() {
  return `user_${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeUsername(value?: string | null) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || fallbackUsername()
}

function emailBase(email?: string | null) {
  const base = String(email || '').split('@')[0]
  return base ? normalizeUsername(base) : ''
}

function displayNameFrom(input: EnsureProfileInput, finalUsername: string) {
  return String(input.nomeExibicao || input.username || '')
    .trim()
    .slice(0, 80) || finalUsername
}

function deveAtualizarPerfilExistente(existing: any, input: EnsureProfileInput) {
  if (!existing) return false

  const usernameInformadoRaw = String(input.username || '').trim()
  if (!usernameInformadoRaw) return false

  const usernameInformado = normalizeUsername(usernameInformadoRaw)
  const usernameAtual = normalizeUsername(existing.username)
  const nomeAtual = normalizeUsername(existing.nome_exibicao)
  const baseEmail = emailBase(input.email)

  if (!usernameAtual || usernameAtual.startsWith('user_')) return true
  if (!nomeAtual || nomeAtual.startsWith('user_')) return true
  if (baseEmail && usernameAtual === baseEmail) return true
  if (baseEmail && nomeAtual === baseEmail) return true

  return false
}

async function usernameExists(candidate: string, currentUserId?: string | null) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', candidate)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return Boolean(data && data.id !== currentUserId)
}

async function generateUniqueUsername(base?: string | null, currentUserId?: string | null) {
  const originalBase = normalizeUsername(base)
  let candidate = originalBase

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const exists = await usernameExists(candidate, currentUserId)
    if (!exists) return candidate
    candidate = `${originalBase}_${Math.random().toString(36).slice(2, 6)}`
  }

  return `${originalBase}_${Date.now().toString().slice(-4)}`
}

async function ensureUserProfileViaApi(input: EnsureProfileInput) {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  if (!accessToken) {
    throw new Error('Sessao ausente para preparar o perfil.')
  }

  const response = await fetch('/api/auth/ensure-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      username: input.username,
      nome_exibicao: input.nomeExibicao || input.username,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Erro ao preparar perfil do usuario.')
  }

  return payload.profile
}

export async function ensureUserProfile(input: EnsureProfileInput) {
  const { userId, email } = input
  const preferredUsername = input.username || emailBase(email) || `user_${userId.slice(0, 8)}`

  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    if (deveAtualizarPerfilExistente(existing, input)) {
      const finalUsername = await generateUniqueUsername(preferredUsername, userId)
      const nomeExibicao = displayNameFrom(input, finalUsername)

      const { data, error } = await supabase
        .from('profiles')
        .update({
          username: finalUsername,
          nome_exibicao: nomeExibicao,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*')
        .single()

      if (!error) return data
      return ensureUserProfileViaApi({ ...input, username: finalUsername, nomeExibicao })
    }

    return existing
  }

  const finalUsername = await generateUniqueUsername(preferredUsername, userId)
  const nomeExibicao = displayNameFrom(input, finalUsername)

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: finalUsername,
      nome_exibicao: nomeExibicao,
    })
    .select('*')
    .single()

  if (!error) return data
  return ensureUserProfileViaApi({ ...input, username: finalUsername, nomeExibicao })
}
