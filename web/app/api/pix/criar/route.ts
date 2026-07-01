import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Endpoint antigo de depósito removido.',
      details: 'Use /api/pagamentos/pix/criar para gerar cobrança PIX direta de inscrição, vaga ou taxa.',
    },
    { status: 410 }
  )
}
