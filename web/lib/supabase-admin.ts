import { createClient } from '@supabase/supabase-js'

function createServerClient(supabaseUrl: string, key: string) {
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

type SupabaseClient = ReturnType<typeof createServerClient>

let adminClient: SupabaseClient | null = null

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL nao configurado')
  }

  if (!serviceRoleKey && !supabaseAnonKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY nao configurado')
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey }
}

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getSupabaseConfig()

    adminClient = createServerClient(supabaseUrl, serviceRoleKey || supabaseAnonKey!)
  }

  return adminClient
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdminClient(), prop, receiver)
  },
})
