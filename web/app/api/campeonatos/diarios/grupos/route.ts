import { NextResponse } from 'next/server'
import {
  getServerSupabaseClient,
  getUserFromBearerToken,
} from '@/lib/supabaseAdmin'

type Body = {
  campeonatoId?: string
  grupoId?: string
  nome?: string
  horario_inicio?: string
  horario_fim?: string | null
  premiacao?: number | null
  valor_inscricao?: number | null
  qtd_slots?: number | null
  qtd_quedas?: number | null
  mapas?: string[] | null
  ordem?: number | null
  intervalo_minutos?: number | null
}

async function validarPermissaoOrganizacao(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  campeonatoId: string,
  userId: string
) {
  const { data: campeonato, error: campeonatoError } = await supabase
    .from('campeonatos')
    .select('id, tipo_competicao, produtora_id')
    .eq('id', campeonatoId)
    .single()

  if (campeonatoError || !campeonato) {
    throw new Error('Campeonato não encontrado.')
  }

  if (String(campeonato.tipo_competicao || '').toLowerCase() !== 'diario') {
    throw new Error('Essa rota aceita apenas campeonatos diários.')
  }

  const { data: produtora } = await supabase
    .from('produtoras')
    .select('id, dono_id')
    .eq('id', campeonato.produtora_id)
    .single()

  const { data: membrosProdutora } = await supabase
    .from('membros_produtora')
    .select('tipo, usuario_id')
    .eq('produtora_id', campeonato.produtora_id)
    .eq('usuario_id', userId)

  const ehDono = produtora?.dono_id === userId
  const ehAdmin = (membrosProdutora || []).some((item: any) =>
    ['dono', 'admin'].includes(String(item.tipo || '').toLowerCase())
  )

  if (!ehDono && !ehAdmin) {
    throw new Error('Apenas a organização pode gerenciar os grupos deste diário.')
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const supabase = getServerSupabaseClient(authHeader)
    const body = (await req.json()) as Body
    const campeonatoId = String(body?.campeonatoId || '').trim()

    if (!campeonatoId || !body?.nome || !body?.horario_inicio) {
      return NextResponse.json(
        { error: 'Campeonato, nome e horário inicial são obrigatórios.' },
        { status: 400 }
      )
    }

    await validarPermissaoOrganizacao(supabase, campeonatoId, user.id)

    const { error: rpcError } = await supabase.rpc('fn_criar_grupo_diario', {
      p_campeonato_id: campeonatoId,
      p_nome: body.nome,
      p_horario_inicio: body.horario_inicio,
      p_horario_fim: body.horario_fim || null,
      p_premiacao: body.premiacao ?? null,
      p_valor_inscricao: body.valor_inscricao ?? null,
      p_qtd_slots: body.qtd_slots ?? 12,
      p_qtd_quedas: body.qtd_quedas ?? 6,
      p_mapas: body.mapas ?? [],
      p_ordem: body.ordem ?? null,
      p_intervalo_minutos: body.intervalo_minutos ?? 15,
      p_configuracao: {},
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Grupo criado com sucesso.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar grupo.' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const supabase = getServerSupabaseClient(authHeader)
    const body = (await req.json()) as Body
    const campeonatoId = String(body?.campeonatoId || '').trim()
    const grupoId = String(body?.grupoId || '').trim()

    if (!campeonatoId || !grupoId) {
      return NextResponse.json(
        { error: 'Campeonato e grupo são obrigatórios.' },
        { status: 400 }
      )
    }

    await validarPermissaoOrganizacao(supabase, campeonatoId, user.id)

    const { error: rpcError } = await supabase.rpc('fn_atualizar_grupo_diario', {
      p_campeonato_id: campeonatoId,
      p_grupo_id: grupoId,
      p_nome: body.nome ?? null,
      p_horario_inicio: body.horario_inicio ?? null,
      p_horario_fim: body.horario_fim || null,
      p_premiacao: body.premiacao ?? null,
      p_valor_inscricao: body.valor_inscricao ?? null,
      p_qtd_slots: body.qtd_slots ?? null,
      p_qtd_quedas: body.qtd_quedas ?? null,
      p_mapas: body.mapas ?? null,
      p_ordem: body.ordem ?? null,
      p_intervalo_minutos: body.intervalo_minutos ?? null,
      p_recriar_jogos: true,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Grupo atualizado com sucesso.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar grupo.' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const supabase = getServerSupabaseClient(authHeader)
    const body = (await req.json()) as Body
    const campeonatoId = String(body?.campeonatoId || '').trim()
    const grupoId = String(body?.grupoId || '').trim()

    if (!campeonatoId || !grupoId) {
      return NextResponse.json(
        { error: 'Campeonato e grupo são obrigatórios.' },
        { status: 400 }
      )
    }

    await validarPermissaoOrganizacao(supabase, campeonatoId, user.id)

    const { error: rpcError } = await supabase.rpc('fn_remover_grupo_diario', {
      p_campeonato_id: campeonatoId,
      p_grupo_id: grupoId,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Grupo removido com sucesso.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao remover grupo.' },
      { status: 500 }
    )
  }
}