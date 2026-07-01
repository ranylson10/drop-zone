import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMercadoPagoConfig } from '@/lib/payment-provider-config'

export const dynamic = 'force-dynamic'

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  return auth.slice(7)
}

function money(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export async function POST(req: NextRequest) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const mercadoPago = await getMercadoPagoConfig()
    const accessToken = mercadoPago.accessToken

    if (!mercadoPago.enabled || !accessToken) {
      return NextResponse.json({ error: 'Mercado Pago PIX não está configurado ou ativo.' }, { status: 503 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase env incompleto.' }, { status: 500 })
    }

    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    const user = userData?.user

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário inválido.' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const valor = money(body?.valor)

    if (!valor) return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })

    const tipo = String(body?.tipo || body?.referencia_tipo || 'pagamento_pix').slice(0, 80)
    const referenciaId = body?.referencia_id ? String(body.referencia_id) : null
    const descricao = String(body?.descricao || 'Pagamento PIX direto').slice(0, 240)

    const { data: bloqueado } = await supabaseAdmin.rpc('usuario_bloqueado_antifraude', {
      p_user_id: user.id,
    })

    if (bloqueado) {
      return NextResponse.json({ error: 'Usuário bloqueado pelo antifraude.' }, { status: 403 })
    }

    const { data: transacao, error: transacaoError } = await supabaseAdmin
      .from('transacoes_cobranca')
      .insert({
        user_id: user.id,
        valor,
        descricao,
        status: 'pendente',
      })
      .select('id')
      .single()

    if (transacaoError || !transacao?.id) {
      return NextResponse.json({ error: transacaoError?.message || 'Erro ao registrar cobrança.' }, { status: 500 })
    }

    const notificationUrl = mercadoPago.webhookUrl

    const mpPayload: any = {
      transaction_amount: valor,
      description: descricao,
      payment_method_id: 'pix',
      external_reference: String(transacao.id),
      payer: {
        email: user.email || `user-${user.id}@dropzone.local`,
        first_name: user.user_metadata?.name || user.user_metadata?.nome || 'Usuario',
      },
      metadata: {
        tipo,
        referencia_id: referenciaId,
        transacao_cobranca_id: String(transacao.id),
        user_id: user.id,
      },
    }

    if (notificationUrl) mpPayload.notification_url = notificationUrl

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': String(transacao.id),
      },
      body: JSON.stringify(mpPayload),
    })

    const mpData = await mpRes.json().catch(() => ({}))

    if (!mpRes.ok) {
      await supabaseAdmin
        .from('transacoes_cobranca')
        .update({ status: 'recusado' })
        .eq('id', transacao.id)

      return NextResponse.json({ error: 'Erro ao criar Pix no Mercado Pago.', detalhes: mpData }, { status: 500 })
    }

    const qr = mpData?.point_of_interaction?.transaction_data || {}

    return NextResponse.json({
      ok: true,
      transacao_cobranca_id: transacao.id,
      referencia_id: referenciaId,
      tipo,
      valor,
      provider: 'mercadopago',
      provider_payment_id: mpData?.id ? String(mpData.id) : null,
      status: mpData?.status || 'pending',
      qr_code: qr?.qr_code || null,
      qr_code_base64: qr?.qr_code_base64 || null,
      ticket_url: qr?.ticket_url || null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno.' }, { status: 500 })
  }
}
