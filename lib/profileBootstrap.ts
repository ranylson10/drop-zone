import { supabase } from '@/lib/supabase'

interface EnsureProfileInput {
  userId: string
  email?: string | null
  username?: string | null
}

function normalizeUsername(value?: string | null) {
  const fallback = `user_${Math.random().toString(36).slice(2, 8)}`
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback
}

function emailBase(email?: string | null) {
  return normalizeUsername(email?.split('@')[0] || '')
}

function deveAtualizarPerfilExistente(existing: any, email?: string | null, username?: string | null) {
  if (!existing) return false

  const usernameInformado = normalizeUsername(username)
  const usernameAtual = normalizeUsername(existing.username)
  const nomeAtual = normalizeUsername(existing.nome_exibicao)
  const baseEmail = emailBase(email)

  if (!usernameInformado) return false
  if (!usernameAtual || usernameAtual.startsWith('user_')) return true
  if (!nomeAtual || nomeAtual.startsWith('user_')) return true
  if (baseEmail && usernameAtual === baseEmail) return true
  if (baseEmail && nomeAtual === baseEmail) return true

  return usernameAtual !== usernameInformado && Boolean(baseEmail && usernameAtual === baseEmail)
}

async function generateUniqueUsername(base?: string | null, currentUserId?: string | null) {
  const originalBase = normalizeUsername(base)
  let candidate = originalBase

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle()

    if (!data || data.id === currentUserId) return candidate

    candidate = `${originalBase}_${Math.random().toString(36).slice(2, 6)}`
  }

  return `${originalBase}_${Date.now().toString().slice(-4)}`
}

export async function ensureUserProfile({ userId, email, username }: EnsureProfileInput) {
  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    if (deveAtualizarPerfilExistente(existing, email, username)) {
      const finalUsername = await generateUniqueUsername(username, userId)

      const { data, error } = await supabase
        .from('profiles')
        .update({
          username: finalUsername,
          nome_exibicao: username?.trim() || finalUsername,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*')
        .single()

      if (error) throw error
      return data
    }

    return existing
  }

  const finalUsername = await generateUniqueUsername(username || email?.split('@')[0], userId)

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: finalUsername,
      nome_exibicao: username?.trim() || finalUsername,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}
