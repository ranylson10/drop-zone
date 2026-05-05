import { NextResponse } from 'next/server'
import {
  getServerSupabaseClient,
  getUserFromBearerToken,
} from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const supabase = getServerSupabaseClient(authHeader)

    const { id } = await context.params
    const campeonatoId = String(id || '').trim()

    if (!campeonatoId) {
      return NextResponse.json({ error: 'Campeonato inválido.' }, { status: 400 })
    }

    const [
      { data: campeonato, error: campeonatoError },
      { data: grupos, error: gruposError },
      { data: financeiro, error: financeiroError },
      { data: pagamentos, error: pagamentosError },
    ] = await Promise.all([
      supabase
        .from('campeonatos')
        .select(
          'id, nome, status, valor_vaga, valor_premiacao, vagas, banner_url, logo_url, tipo_competicao'
        )
        .eq('id', campeonatoId)
        .single(),

      supabase
        .from('vw_diario_dashboard')
        .select('*')
        .eq('campeonato_id', campeonatoId)
        .order('horario_inicio', { ascending: true }),

      supabase
        .from('vw_diario_grupo_financeiro')
        .select('*')
        .eq('campeonato_id', campeonatoId)
        .order('horario_inicio', { ascending: true }),

      supabase
        .from('campeonato_diario_grupo_inscricoes_pagamento')
        .select('id, grupo_id, equipe_id, valor')
        .eq('campeonato_id', campeonatoId)
        .eq('status', 'pago')
        .order('created_at', { ascending: true }),
    ])

    if (campeonatoError) {
      return NextResponse.json(
        { error: `Erro ao buscar campeonato: ${campeonatoError.message}` },
        { status: 400 }
      )
    }

    if (!campeonato) {
      return NextResponse.json({ error: 'Campeonato não encontrado.' }, { status: 404 })
    }

    if (String(campeonato.tipo_competicao || '').toLowerCase() !== 'diario') {
      return NextResponse.json(
        { error: 'Este campeonato não é do tipo diário.' },
        { status: 400 }
      )
    }

    if (gruposError) {
      return NextResponse.json(
        { error: `Erro ao buscar grupos: ${gruposError.message}` },
        { status: 400 }
      )
    }

    if (financeiroError) {
      return NextResponse.json(
        { error: `Erro ao buscar financeiro: ${financeiroError.message}` },
        { status: 400 }
      )
    }

    if (pagamentosError) {
      return NextResponse.json(
        { error: `Erro ao buscar pagamentos: ${pagamentosError.message}` },
        { status: 400 }
      )
    }

    const pagamentosRows = (pagamentos || []) as Array<{
      id: string
      grupo_id: string
      equipe_id: string
      valor: number | string | null
    }>

    const equipeIds = [
      ...new Set(pagamentosRows.map((item) => item.equipe_id).filter(Boolean)),
    ]

    let equipesMap: Record<
      string,
      {
        id: string
        nome?: string | null
        logo_url?: string | null
      }
    > = {}

    if (equipeIds.length > 0) {
      const { data: equipesData, error: equipesError } = await supabase
        .from('equipes')
        .select('id, nome, logo_url')
        .in('id', equipeIds)

      if (equipesError) {
        return NextResponse.json(
          { error: `Erro ao buscar equipes pagas: ${equipesError.message}` },
          { status: 400 }
        )
      }

      equipesMap = Object.fromEntries(
        (equipesData || []).map((equipe) => [equipe.id, equipe])
      )
    }

    const pagamentosComEquipes = pagamentosRows.map((item) => ({
      id: item.id,
      grupo_id: item.grupo_id,
      equipe_id: item.equipe_id,
      valor: Number(item.valor || 0),
      equipes: equipesMap[item.equipe_id] || null,
    }))

    return NextResponse.json({
      ok: true,
      campeonato,
      grupos: grupos || [],
      financeiro: financeiro || [],
      pagamentos: pagamentosComEquipes,
    })
  } catch (error: any) {
    console.error('GET /api/campeonatos/diarios/[id]', error)

    return NextResponse.json(
      { error: error?.message || 'Erro interno ao carregar diário.' },
      { status: 500 }
    )
  }
}