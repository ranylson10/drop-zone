import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  return auth.slice(7)
}

function centsSafe(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

export async function POST(req: NextRequest) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase env incompleto' }, { status: 500 })
    }

    const token = getBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    const user = userData?.user

    if (userError || !user) {
      return NextResponse.json({ error: 'usuário inválido' }, { status: 401 })
    }

    const body = await req.json()
    const valor = centsSafe(body?.valor)

    if (valor < 1) {
      return NextResponse.json({ error: 'valor mínimo para depósito é R$ 1,00' }, { status: 400 })
    }

    if (valor > 5000) {
      return NextResponse.json({ error: 'valor máximo por depósito é R$ 5.000,00' }, { status: 400 })
    }

    const { data: bloqueado } = await supabaseAdmin.rpc('usuario_bloqueado_antifraude', {
      p_user_id: user.id,
    })

    if (bloqueado) {
      return NextResponse.json({ error: 'usuário bloqueado pelo antifraude' }, { status: 403 })
    }

    const { data: deposito, error: depError } = await supabaseAdmin
      .from('wallet_depositos_pix')
      .insert({
        user_id: user.id,
        valor,
        status: 'pendente',
        provider: 'mercadopago',
      })
      .select('*')
      .single()

    if (depError || !deposito) {
      return NextResponse.json({ error: depError?.message || 'erro ao criar depósito' }, { status: 500 })
    }

    const notificationUrl = process.env.MERCADOPAGO_WEBHOOK_URL

    const mpPayload: any = {
      transaction_amount: valor,
      description: `Depósito LEALT - ${deposito.id}`,
      payment_method_id: 'pix',
      external_reference: deposito.id,
      payer: {
        email: user.email || `user-${user.id}@lealt.local`,
        first_name: user.user_metadata?.name || user.user_metadata?.nome || 'Usuario',
      },
    }

    if (notificationUrl) {
      mpPayload.notification_url = notificationUrl
    }

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': deposito.id,
      },
      body: JSON.stringify(mpPayload),
    })

    const mpData = await mpRes.json()

    if (!mpRes.ok) {
      await supabaseAdmin.rpc('atualizar_status_deposito_pix', {
        p_deposito_id: deposito.id,
        p_status: 'recusado',
        p_provider_payment_id: mpData?.id ? String(mpData.id) : null,
        p_provider_status: mpData?.status || 'erro_criacao',
        p_payload: mpData,
      })

      return NextResponse.json({ error: 'erro ao criar Pix no Mercado Pago', detalhes: mpData }, { status: 500 })
    }

    const qr = mpData?.point_of_interaction?.transaction_data

    const { error: updateError } = await supabaseAdmin
      .from('wallet_depositos_pix')
      .update({
        provider_payment_id: mpData?.id ? String(mpData.id) : null,
        provider_status: mpData?.status || null,
        qr_code: qr?.qr_code || null,
        qr_code_base64: qr?.qr_code_base64 || null,
        ticket_url: qr?.ticket_url || null,
        external_reference: deposito.id,
        payload: mpData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deposito.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      deposito_id: deposito.id,
      valor,
      provider_payment_id: mpData?.id ? String(mpData.id) : null,
      status: mpData?.status,
      qr_code: qr?.qr_code || null,
      qr_code_base64: qr?.qr_code_base64 || null,
      ticket_url: qr?.ticket_url || null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'erro interno' }, { status: 500 })
  }
}
