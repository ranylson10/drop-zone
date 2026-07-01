import { NextResponse } from 'next/server'
import { getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

type SolicitarSaqueBody = {
  valor?: number
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

    const { data: bloqueado, error: bloqueioError } = await supabaseAdmin.rpc('usuario_bloqueado_antifraude', {
      p_user_id: user.id,
    })

    if (bloqueioError) {
      return NextResponse.json({ error: bloqueioError.message }, { status: 400 })
    }

    if (bloqueado) {
      return NextResponse.json({ error: 'Usuário bloqueado pelo antifraude.' }, { status: 403 })
    }

    const body = (await req.json()) as SolicitarSaqueBody
    const valor = toMoney(body?.valor)

    if (!valor) {
      return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
    }

    const { data: pagamento, error: pagamentoError } = await supabaseAdmin
      .from('usuarios_pagamento')
      .select('user_id, chave_pix, tipo_chave')
      .eq('user_id', user.id)
      .maybeSingle()

    if (pagamentoError) {
      return NextResponse.json({ error: pagamentoError.message }, { status: 400 })
    }

    if (!pagamento?.chave_pix) {
      return NextResponse.json(
        { error: 'Cadastre sua chave Pix antes de solicitar saque.' },
        { status: 400 }
      )
    }

    const { error: reservarError } = await supabaseAdmin.rpc('reservar_saldo_confronto', {
      uid: user.id,
      valor,
    })

    if (reservarError) {
      return NextResponse.json(
        { error: reservarError.message || 'Saldo insuficiente.' },
        { status: 400 }
      )
    }

    const { data: saque, error: saqueError } = await supabaseAdmin
      .from('pagamentos_saques')
      .insert({
        user_id: user.id,
        valor,
        status: 'solicitado',
      })
      .select('id, user_id, valor, status, created_at')
      .single()

    if (saqueError) {
      await supabaseAdmin.rpc('desfazer_reserva_saldo_confronto', {
        uid: user.id,
        valor,
      })

      return NextResponse.json(
        { error: saqueError.message || 'Não foi possível registrar o saque.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      saque,
    })
  } catch (error) {
    console.error('POST /api/saques/solicitar', error)
    return NextResponse.json(
      { error: 'Não foi possível solicitar o saque agora.' },
      { status: 500 }
    )
  }
}
