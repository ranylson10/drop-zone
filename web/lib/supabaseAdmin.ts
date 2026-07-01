import { createClient } from '@supabase/supabase-js'

function createServerClient(supabaseUrl: string, key: string) {
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

type SupabaseClient = ReturnType<typeof createServerClient>

let adminClient: SupabaseClient | null = null

function getSupabaseConfig() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variaveis do Supabase ausentes. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey }
}

function extrairBearerToken(authHeader?: string | null) {
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig()

    adminClient = createServerClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey)
  }

  return adminClient
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdminClient(), prop, receiver)
  },
})

export function getServerSupabaseClient(authHeader?: string | null) {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig()
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

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  const client = createServerClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await client.auth.getUser(token)

  if (error || !data.user) {
    return null
  }

  return data.user
}
