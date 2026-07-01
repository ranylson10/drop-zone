import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ensureProfileForUser } from '@/lib/serverEnsureProfile'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

function getAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase nao configurado no backend.')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Informe email e senha.' }, { status: 400, headers: corsHeaders })
    }

    const { data, error } = await getAuthClient().auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user || !data.session) {
      return NextResponse.json({ error: 'E-mail ou senha invalidos.' }, { status: 401, headers: corsHeaders })
    }

    let profile = null
    try {
      profile = await ensureProfileForUser(data.user)
    } catch (profileError: any) {
      return NextResponse.json(
        { error: profileError?.message || 'Erro ao preparar perfil do usuario.' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      ok: true,
      user: data.user,
      session: data.session,
      profile,
    }, { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao fazer login.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
