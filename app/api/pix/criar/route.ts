import { NextResponse } from 'next/server'
import { getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

type CriarPixBody = {
  valor?: number
  descricao?: string
}

function toMoney(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return numeric
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearerToken(req.headers.get('authorization'))

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { data: kyc } = await supabaseAdmin
      .from('wallet_kyc')
      .select('status')
      .eq('user_id', user.id)
      .single()

    if (!kyc || kyc.status !== 'verificada') {
      return NextResponse.json(
        { error: 'Sua carteira precisa estar verificada antes do primeiro depósito.' },
        { status: 403 }
      )
    }

    const body = (await req.json()) as CriarPixBody
    const valor = toMoney(body?.valor)

    if (!valor) {
      return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
    }

    if (!process.env.EFI_TOKEN || !process.env.EFI_PIX_KEY) {
      return NextResponse.json(
        { error: 'Variáveis da Efí não configuradas no servidor.' },
        { status: 500 }
      )
    }

    const efiResponse = await fetch('https://api.efi.com.br/v2/cob', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EFI_TOKEN}`,
      },
      body: JSON.stringify({
        calendario: { expiracao: 3600 },
        valor: { original: valor.toFixed(2) },
        chave: process.env.EFI_PIX_KEY,
        solicitacaoPagador: body?.descricao?.trim() || 'Depósito de saldo na carteira',
      }),
      cache: 'no-store',
    })

    const efiData = await efiResponse.json().catch(() => null)

    if (!efiResponse.ok) {
      return NextResponse.json(
        {
          error: 'Falha ao gerar cobrança Pix.',
          details: efiData,
        },
        { status: efiResponse.status }
      )
    }

    const txid = String(efiData?.txid || '')
    const status = String(efiData?.status || 'pendente').toLowerCase()
    const pixCopiaECola = efiData?.pixCopiaECola || ''
    const location = efiData?.location || efiData?.loc?.location || null

    if (txid) {
      const payloadInsert = {
        user_id: user.id,
        valor,
        txid,
        status: 'pendente',
        gateway: 'efi',
        gateway_status: status,
        payload: efiData,
        qr_code: location,
        pix_copia_cola: pixCopiaECola,
      }

      const { error: depositoError } = await supabaseAdmin
        .from('pagamentos_depositos')
        .upsert(payloadInsert, { onConflict: 'txid' })

      if (depositoError) {
        console.error('pagamentos_depositos upsert', depositoError)
      }
    }

    return NextResponse.json({
      ok: true,
      txid,
      status,
      valor,
      location,
      pixCopiaECola,
      raw: efiData,
    })
  } catch (error) {
    console.error('POST /api/pix/criar', error)

    return NextResponse.json(
      { error: 'Não foi possível gerar o Pix agora.' },
      { status: 500 }
    )
  }
}
