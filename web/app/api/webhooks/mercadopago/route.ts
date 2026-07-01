import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMercadoPagoConfig } from '@/lib/payment-provider-config'

export const dynamic = 'force-dynamic'

function getPaymentIdFromBody(body: any, url: URL) {
  return body?.data?.id || body?.id || url.searchParams.get('data.id') || url.searchParams.get('id')
}

function validateSignature(req: NextRequest, paymentId: string | null, secret: string) {
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

function mapMercadoPagoStatus(status: string) {
  if (status === 'approved') return 'pago'
  if (status === 'rejected') return 'recusado'
  if (status === 'cancelled') return 'cancelado'
  if (status === 'expired') return 'expirado'
  return 'pendente'
}

export async function POST(req: NextRequest) {
  try {
    const mercadoPago = await getMercadoPagoConfig()
    const accessToken = mercadoPago.accessToken

    if (!mercadoPago.enabled || !accessToken) {
      return NextResponse.json(
        { error: 'Mercado Pago não está configurado ou ativo.' },
        { status: 503 }
      )
    }

    const url = new URL(req.url)
    const body = await req.json().catch(() => ({}))
    const paymentId = String(getPaymentIdFromBody(body, url) || '')

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: 'sem payment id' })
    }

    if (!validateSignature(req, paymentId, mercadoPago.webhookSecret)) {
      return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 })
    }

    // Consulta a API do Mercado Pago antes de alterar qualquer cobrança local.
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })

    const payment = await mpRes.json().catch(() => ({}))

    if (!mpRes.ok) {
      return NextResponse.json(
        { error: 'Erro ao consultar pagamento no Mercado Pago.', detalhes: payment },
        { status: 500 }
      )
    }

    const externalReference = String(payment?.external_reference || '')
    const providerStatus = String(payment?.status || '')
    const mappedStatus = mapMercadoPagoStatus(providerStatus)

    if (!externalReference) {
      return NextResponse.json({ ok: true, ignored: 'sem external_reference' })
    }

    const { data: transacao, error: transacaoError } = await supabaseAdmin
      .from('transacoes_cobranca')
      .select('*')
      .eq('id', externalReference)
      .maybeSingle()

    if (transacaoError) {
      return NextResponse.json({ error: transacaoError.message }, { status: 500 })
    }

    if (!transacao) {
      return NextResponse.json({ ok: true, ignored: 'transação de cobrança não encontrada' })
    }

    const updatePayload: Record<string, any> = {
      status: mappedStatus,
    }

    if (Object.prototype.hasOwnProperty.call(transacao, 'provider_payment_id')) {
      updatePayload.provider_payment_id = String(payment?.id || paymentId)
    }

    if (Object.prototype.hasOwnProperty.call(transacao, 'provider_status')) {
      updatePayload.provider_status = providerStatus
    }

    if (Object.prototype.hasOwnProperty.call(transacao, 'payload')) {
      updatePayload.payload = {
        ...(typeof transacao.payload === 'object' && transacao.payload ? transacao.payload : {}),
        mercado_pago_payment: payment,
      }
    }

    if (mappedStatus === 'pago' && Object.prototype.hasOwnProperty.call(transacao, 'pago_em')) {
      updatePayload.pago_em = new Date().toISOString()
    }

    if (Object.prototype.hasOwnProperty.call(transacao, 'updated_at')) {
      updatePayload.updated_at = new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('transacoes_cobranca')
      .update(updatePayload)
      .eq('id', transacao.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // A ativação de vaga/taxa deve ser feita por rotina específica do fluxo PIX direto,
    // usando transacoes_cobranca como fonte do pagamento confirmado.
    return NextResponse.json({
      ok: true,
      status: providerStatus,
      mapped_status: mappedStatus,
      transacao_id: transacao.id,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno.' }, { status: 500 })
  }
}
