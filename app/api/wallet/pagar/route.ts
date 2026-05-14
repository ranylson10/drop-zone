import { NextResponse } from 'next/server'
import { getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

type WalletPagamentoBody = {
  tipo?:
    | 'vaga_campeonato'
    | 'inscricao_campeonato'
    | 'taxa_criacao_campeonato'
    | 'repasse_organizador_campeonato'
  campeonatoId?: string
  equipeId?: string
  valor?: number | string
  descricao?: string
  organizadorUserId?: string
}

function texto(value: unknown) {
  return String(value || '').trim()
}

function numero(value: unknown) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearerToken(req.headers.get('authorization'))

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const body = (await req.json()) as WalletPagamentoBody
    const tipo = texto(body.tipo)
    const campeonatoId = texto(body.campeonatoId)
    const equipeId = texto(body.equipeId)
    const valor = numero(body.valor)
    const descricao = texto(body.descricao)

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de pagamento obrigatório.' }, { status: 400 })
    }

    if (tipo === 'vaga_campeonato' || tipo === 'inscricao_campeonato') {
      if (!campeonatoId || !equipeId) {
        return NextResponse.json({ error: 'Campeonato e equipe são obrigatórios.' }, { status: 400 })
      }

      const { data, error } = await supabaseAdmin.rpc('fn_comprar_vaga_campeonato', {
        p_campeonato_id: campeonatoId,
        p_equipe_id: equipeId,
        p_user_id: user.id,
        p_valor: valor,
      })

      if (error) {
        return NextResponse.json({ error: error.message, details: error.details }, { status: 400 })
      }

      const campeonatoEquipeId = String(
        (data as any)?.campeonato_equipe_id ||
        (data as any)?.inscricao_id ||
        ''
      ).trim()

      if (campeonatoEquipeId) {
        await supabaseAdmin.rpc('fn_garantir_line_para_vaga', {
          p_campeonato_equipe_id: campeonatoEquipeId,
          p_nome: null,
          p_user_id: user.id,
          p_plataforma: 'mobile',
        })
      }

      return NextResponse.json({ ok: true, data })
    }

    if (tipo === 'taxa_criacao_campeonato') {
      const { data, error } = await supabaseAdmin.rpc('fn_wallet_pagar_taxa_criacao_campeonato', {
        p_user_id: user.id,
        p_campeonato_id: campeonatoId || null,
        p_valor: valor,
        p_descricao: descricao || 'Taxa de criação de campeonato',
      })

      if (error) {
        return NextResponse.json({ error: error.message, details: error.details }, { status: 400 })
      }

      return NextResponse.json({ ok: true, data })
    }

    if (tipo === 'repasse_organizador_campeonato') {
      const organizadorUserId = texto(body.organizadorUserId)

      if (!organizadorUserId || !campeonatoId) {
        return NextResponse.json({ error: 'Organizador e campeonato são obrigatórios.' }, { status: 400 })
      }

      const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('is_site_admin')
      if (adminError || !isAdmin) {
        return NextResponse.json({ error: 'Apenas administradores do site podem liberar repasse.' }, { status: 403 })
      }

      const { data, error } = await supabaseAdmin.rpc('fn_wallet_pagar_organizador_campeonato', {
        p_campeonato_id: campeonatoId,
        p_organizador_user_id: organizadorUserId,
        p_valor: valor,
        p_observacoes: descricao || 'Repasse de campeonato',
      })

      if (error) {
        return NextResponse.json({ error: error.message, details: error.details }, { status: 400 })
      }

      return NextResponse.json({ ok: true, data })
    }

    return NextResponse.json({ error: 'Tipo de pagamento não suportado.' }, { status: 400 })
  } catch (error: any) {
    console.error('POST /api/wallet/pagar', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar pagamento pela carteira.' },
      { status: 500 }
    )
  }
}
