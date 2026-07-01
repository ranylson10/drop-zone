import { NextResponse } from 'next/server'
import { getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

type EntrarBody = {
  confrontoId?: string
  nomeTime?: string
}

function normalizarTexto(value: unknown) {
  return String(value || '').trim()
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

    const body = (await req.json()) as EntrarBody
    const confrontoId = normalizarTexto(body?.confrontoId)
    const nomeTime = normalizarTexto(body?.nomeTime) || 'Meu time'

    if (!confrontoId) {
      return NextResponse.json({ error: 'Confronto inválido.' }, { status: 400 })
    }

    const [{ data: confronto, error: confrontoError }, { data: perfil, error: perfilError }] =
      await Promise.all([
        supabaseAdmin
          .from('confrontos_apostados')
          .select('*')
          .eq('id', confrontoId)
          .maybeSingle(),
        supabaseAdmin
          .from('perfis_jogo')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

    if (confrontoError) throw confrontoError
    if (perfilError) throw perfilError

    if (!confronto) {
      return NextResponse.json({ error: 'Confronto não encontrado.' }, { status: 404 })
    }

    if (String(confronto.criado_por_user_id) === user.id) {
      return NextResponse.json(
        { error: 'O criador do confronto não pode entrar no lado adversário.' },
        { status: 400 }
      )
    }

    if (String(confronto.status) !== 'aberto' && String(confronto.status) !== 'aguardando_oponente') {
      return NextResponse.json(
        { error: 'Esse confronto não está disponível para entrada.' },
        { status: 400 }
      )
    }

    const { data: timeExistente } = await supabaseAdmin
      .from('confrontos_times')
      .select('id, lado, capitao_user_id')
      .eq('confronto_id', confrontoId)

    const jaParticipa = (timeExistente || []).some((item) => String(item.capitao_user_id) === user.id)
    if (jaParticipa) {
      return NextResponse.json({ error: 'Você já está nesse confronto.' }, { status: 400 })
    }

    const ladoBOcupado = (timeExistente || []).some((item) => item.lado === 'b')
    if (ladoBOcupado) {
      return NextResponse.json({ error: 'Esse confronto já foi aceito por outro adversário.' }, { status: 400 })
    }

    const valor = Number(confronto.valor_por_lado || 0)

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallet_saldo')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletError) throw walletError

    const saldoDisponivel =
      Number(wallet?.saldo || 0) - Number(wallet?.saldo_retido || 0)

    if (saldoDisponivel < valor) {
      return NextResponse.json(
        {
          error: 'Saldo insuficiente para entrar no confronto.',
          saldoDisponivel,
          valorNecessario: valor,
        },
        { status: 400 }
      )
    }

    const { error: debitoError } = await supabaseAdmin.rpc('reservar_saldo_confronto', {
      uid: user.id,
      valor,
    })

    if (debitoError) {
      console.error('reservar_saldo_confronto', debitoError)
      return NextResponse.json(
        { error: 'Não foi possível reservar o saldo agora.' },
        { status: 500 }
      )
    }

    const { data: timeB, error: timeBError } = await supabaseAdmin
      .from('confrontos_times')
      .insert({
        confronto_id: confrontoId,
        lado: 'b',
        nome_time: nomeTime,
        capitao_user_id: user.id,
        status_pagamento: 'pago',
        valor_pago: valor,
      })
      .select('id')
      .single()

    if (timeBError) {
      await supabaseAdmin.rpc('desfazer_reserva_saldo_confronto', { uid: user.id, valor })
      throw timeBError
    }

    const { error: jogadorError } = await supabaseAdmin.from('confrontos_jogadores').insert({
      confronto_time_id: timeB.id,
      user_id: user.id,
      nick_snapshot: perfil?.nick || user.email || 'Jogador',
      plataforma:
        perfil?.plataforma || (String(confronto.regra_plataforma) === 'full_emulador' ? 'emulador' : 'mobile'),
      funcao: perfil?.funcao || 'rush',
      confirmado_em: new Date().toISOString(),
    })

    if (jogadorError) {
      await supabaseAdmin.rpc('desfazer_reserva_saldo_confronto', { uid: user.id, valor })
      throw jogadorError
    }

    const { error: escrowError } = await supabaseAdmin.from('confrontos_escrow').insert({
      confronto_id: confrontoId,
      user_id: user.id,
      valor,
      status: 'pago',
    })

    if (escrowError) {
      await supabaseAdmin.rpc('desfazer_reserva_saldo_confronto', { uid: user.id, valor })
      throw escrowError
    }

    await supabaseAdmin
      .from('confrontos_apostados')
      .update({
        status: 'pronto',
      })
      .eq('id', confrontoId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/confrontos/entrar', error)
    return NextResponse.json(
      { error: 'Não foi possível entrar no confronto agora.' },
      { status: 500 }
    )
  }
}
