import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurado')
}

if (!serviceRoleKey && !supabaseAnonKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configurado')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
