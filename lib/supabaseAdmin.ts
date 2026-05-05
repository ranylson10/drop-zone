import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis do Supabase ausentes. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

function extrairBearerToken(authHeader?: string | null) {
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

/**
 * Client "admin" real quando a service role existir.
 * Se não existir, cai para anon key sem derrubar o servidor.
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Client por requisição.
 * - se existir service role, usa service role
 * - se não existir, usa anon key
 * - se vier token do usuário, envia o Authorization nas queries
 */
export function getServerSupabaseClient(authHeader?: string | null) {
  const token = extrairBearerToken(authHeader)
  const key = supabaseServiceRoleKey || supabaseAnonKey

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  })
}

export async function getUserFromBearerToken(authHeader?: string | null) {
  const token = extrairBearerToken(authHeader)

  if (!token) {
    return null
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const { data, error } = await client.auth.getUser(token)

  if (error || !data.user) {
    return null
  }

  return data.user
}