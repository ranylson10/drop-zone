import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      ok: true,
      ignored: 'Webhook antigo de depósito removido. Use /api/webhooks/mercadopago para PIX direto.',
    },
    { status: 410 }
  )
}
