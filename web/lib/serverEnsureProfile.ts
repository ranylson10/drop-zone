import { createClient, type User } from '@supabase/supabase-js'

function normalizeUsername(value?: string | null) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || `user_${Math.random().toString(36).slice(2, 8)}`
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL nao configurado.')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY nao configurado no backend.')

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function generateUniqueUsername(admin: ReturnType<typeof getAdminClient>, base: string, currentUserId: string) {
  const originalBase = normalizeUsername(base)
  let candidate = originalBase

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', candidate)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data || String(data.id) === currentUserId) return candidate

    candidate = `${originalBase}_${Math.random().toString(36).slice(2, 6)}`
  }

  return `${originalBase}_${currentUserId.slice(0, 8)}`
}

export async function ensureProfileForUser(
  user: User,
  input?: { username?: string | null; nome_exibicao?: string | null; name?: string | null }
) {
  const admin = getAdminClient()
  const meta = user.user_metadata || {}
  const requestedUsername = String(
    input?.username || meta.username || meta.nome_exibicao || meta.nome || meta.name || user.email?.split('@')[0] || user.id
  ).trim()
  const requestedName = String(
    input?.nome_exibicao || input?.name || meta.nome_exibicao || meta.nome || meta.name || requestedUsername
  ).trim()

  const finalUsername = await generateUniqueUsername(admin, requestedUsername, user.id)
  const nomeExibicao = requestedName.slice(0, 80) || finalUsername

  const { data: existing, error: existingError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    const currentLooksWeak =
      !existing.username ||
      String(existing.username).startsWith('user_') ||
      normalizeUsername(existing.username) === normalizeUsername(user.email?.split('@')[0])

    if (!currentLooksWeak) return existing

    const { data, error } = await admin
      .from('profiles')
      .update({
        username: finalUsername,
        nome_exibicao: nomeExibicao,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await admin
    .from('profiles')
    .insert({
      id: user.id,
      username: finalUsername,
      nome_exibicao: nomeExibicao,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}
