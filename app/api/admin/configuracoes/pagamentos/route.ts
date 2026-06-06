import { NextResponse } from 'next/server'
import { getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const allowedProviders = new Set(['mercadopago', 'paypal'])

async function requireAdmin(req: Request) {
  const user = await getUserFromBearerToken(req.headers.get('authorization'))
  if (!user) return null

  const { data } = await supabaseAdmin
    .from('site_administradores')
    .select('id')
    .eq('user_id', user.id)
    .eq('ativo', true)
    .limit(1)

  return data?.length ? user : null
}

export async function GET(req: Request) {
  const user = await requireAdmin(req)
  if (!user) return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 })

  const { data, error } = await supabaseAdmin.rpc('admin_payment_provider_status')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ providers: data || [] })
}

export async function POST(req: Request) {
  const user = await requireAdmin(req)
  if (!user) return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 })

  const body = await req.json()
  const provider = String(body?.provider || '').toLowerCase()
  const environment = String(body?.environment || 'sandbox').toLowerCase()

  if (!allowedProviders.has(provider)) {
    return NextResponse.json({ error: 'Provedor inválido.' }, { status: 400 })
  }

  if (!['sandbox', 'production'].includes(environment)) {
    return NextResponse.json({ error: 'Ambiente inválido.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.rpc('admin_set_payment_provider_config', {
    p_provider: provider,
    p_enabled: Boolean(body?.enabled),
    p_environment: environment,
    p_public_config: body?.publicConfig || {},
    p_secrets: body?.secrets || {},
    p_updated_by: user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || { ok: true })
}
