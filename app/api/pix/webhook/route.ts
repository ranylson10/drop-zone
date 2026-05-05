import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type PixWebhookItem = {
  txid?: string
  endToEndId?: string
  valor?: string | number
  horario?: string
  chave?: string
}

async function creditarDeposito(item: PixWebhookItem) {
  const txid = String(item?.txid || '').trim()
  if (!txid) return

  const { data: deposito, error: depositoError } = await supabaseAdmin
    .from('pagamentos_depositos')
    .select('*')
    .eq('txid', txid)
    .maybeSingle()

  if (depositoError) {
    console.error('buscar deposito webhook', depositoError)
    return
  }

  if (!deposito) {
    console.warn('Webhook recebido para txid não encontrado:', txid)
    return
  }

  if (String(deposito.status || '').toLowerCase() === 'pago') {
    return
  }

  const valor = Number(item?.valor || deposito.valor || 0)
  const userId = String(deposito.user_id || '')

  if (!userId || !Number.isFinite(valor) || valor <= 0) {
    console.warn('Webhook com depósito inconsistente:', { txid, userId, valor })
    return
  }

  const { error: walletError } = await supabaseAdmin.rpc('incrementar_saldo', {
    uid: userId,
    valor,
  })

  if (walletError) {
    console.error('incrementar_saldo webhook', walletError)
    return
  }

  const { error: updateDeposError } = await supabaseAdmin
    .from('pagamentos_depositos')
    .update({
      status: 'pago',
      gateway_status: 'concluida',
      end_to_end_id: item?.endToEndId || null,
      pago_em: item?.horario || new Date().toISOString(),
    })
    .eq('txid', txid)

  if (updateDeposError) {
    console.error('atualizar deposito webhook', updateDeposError)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const pixList = Array.isArray(body?.pix) ? body.pix : []

    for (const item of pixList) {
      await creditarDeposito(item)
    }

    return NextResponse.json({ ok: true, recebidos: pixList.length })
  } catch (error) {
    console.error('POST /api/pix/webhook', error)
    return NextResponse.json({ error: 'Erro ao processar webhook.' }, { status: 500 })
  }
}
