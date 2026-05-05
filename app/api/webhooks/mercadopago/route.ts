import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function getPaymentIdFromBody(body: any, url: URL) {
  return (
    body?.data?.id ||
    body?.id ||
    url.searchParams.get('data.id') ||
    url.searchParams.get('id')
  )
}

/**
 * Validação opcional de assinatura.
 * Configure MERCADOPAGO_WEBHOOK_SECRET para ativar.
 *
 * Mercado Pago envia headers como x-signature e x-request-id em Webhooks.
 * Como o formato pode variar por produto/conta, deixamos validação permissiva:
 * - se não configurar secret, aceita e valida pelo GET /v1/payments/:id
 * - se configurar secret e a assinatura não bater, bloqueia
 */
function validateSignature(req: NextRequest, paymentId: string | null) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return true

  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')

  if (!xSignature || !xRequestId || !paymentId) return false

  const parts = Object.fromEntries(
    xSignature.split(',').map((part) => {
      const [k, v] = part.split('=')
      return [k?.trim(), v?.trim()]
    })
  )

  const ts = parts.ts
  const hash = parts.v1

  if (!ts || !hash) return false

  const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(hash))
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado' }, { status: 500 })
    }

    const url = new URL(req.url)
    const body = await req.json().catch(() => ({}))
    const paymentId = String(getPaymentIdFromBody(body, url) || '')

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: 'sem payment id' })
    }

    if (!validateSignature(req, paymentId)) {
      return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 })
    }

    // Sempre consulta a API do Mercado Pago antes de alterar carteira.
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const payment = await mpRes.json()

    if (!mpRes.ok) {
      return NextResponse.json({ error: 'erro ao consultar pagamento', detalhes: payment }, { status: 500 })
    }

    const externalReference = payment?.external_reference
    const status = payment?.status

    if (!externalReference) {
      return NextResponse.json({ ok: true, ignored: 'sem external_reference' })
    }

    const { data: deposito, error: depError } = await supabaseAdmin
      .from('wallet_depositos_pix')
      .select('*')
      .eq('id', externalReference)
      .single()

    if (depError || !deposito) {
      return NextResponse.json({ ok: true, ignored: 'depósito não encontrado' })
    }

    if (status === 'approved') {
      const { data, error } = await supabaseAdmin.rpc('processar_deposito_pix_aprovado', {
        p_deposito_id: deposito.id,
        p_provider_payment_id: String(payment.id),
        p_provider_status: status,
        p_payload: payment,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, processed: data })
    }

    const mapped =
      status === 'rejected' ? 'recusado' :
      status === 'cancelled' ? 'cancelado' :
      status === 'expired' ? 'expirado' :
      'pendente'

    const { error } = await supabaseAdmin.rpc('atualizar_status_deposito_pix', {
      p_deposito_id: deposito.id,
      p_status: mapped,
      p_provider_payment_id: String(payment.id),
      p_provider_status: status,
      p_payload: payment,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, status })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'erro interno' }, { status: 500 })
  }
}
