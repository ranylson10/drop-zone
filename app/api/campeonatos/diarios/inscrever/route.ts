import { NextResponse } from 'next/server'
import {
  getServerSupabaseClient,
  getUserFromBearerToken,
} from '@/lib/supabaseAdmin'

type Body = {
  campeonatoId?: string
  grupoId?: string
  equipeId?: string
  lineId?: string
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
    const grupoId = String(body?.grupoId || '').trim()
    const equipeId = String(body?.equipeId || '').trim()
    const lineId = String(body?.lineId || '').trim()

    if (!campeonatoId || !grupoId || (!equipeId && !lineId)) {
      return NextResponse.json(
        { error: 'Campeonato, grupo e equipe/line são obrigatórios.' },
        { status: 400 }
      )
    }

    const { data: campeonato, error: campeonatoError } = await supabase
      .from('campeonatos')
      .select('id, nome, tipo_competicao')
      .eq('id', campeonatoId)
      .single()

    if (campeonatoError || !campeonato) {
      return NextResponse.json({ error: 'Campeonato não encontrado.' }, { status: 404 })
    }

    if (String(campeonato.tipo_competicao || '').toLowerCase() !== 'diario') {
      return NextResponse.json(
        { error: 'Essa rota aceita apenas campeonatos diários.' },
        { status: 400 }
      )
    }

    const { data: grupo, error: grupoError } = await supabase
      .from('vw_diario_grupo_financeiro')
      .select('grupo_id, valor_inscricao_configurado, nome')
      .eq('grupo_id', grupoId)
      .eq('campeonato_id', campeonatoId)
      .single()

    if (grupoError || !grupo) {
      return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 })
    }

    const valorInscricao = Number(grupo.valor_inscricao_configurado || 0)
    if (valorInscricao <= 0) {
      return NextResponse.json(
        { error: 'Esse grupo não possui valor de inscrição configurado.' },
        { status: 400 }
      )
    }

    let participanteNome = ''
    let rpcError: any = null

    if (lineId) {
      const { data: line, error: lineError } = await supabase
        .from('lines')
        .select('id, nome, created_by, equipe_id, ativa')
        .eq('id', lineId)
        .single()

      if (lineError || !line) {
        return NextResponse.json({ error: 'Line não encontrada.' }, { status: 404 })
      }

      if (line.ativa === false) {
        return NextResponse.json({ error: 'Essa line está inativa.' }, { status: 400 })
      }

      let podeGerenciarLine = line.created_by === user.id

      if (!podeGerenciarLine && line.equipe_id) {
        const { data: equipeLine } = await supabase
          .from('equipes')
          .select('id, criado_por')
          .eq('id', line.equipe_id)
          .maybeSingle()

        const { data: membrosLine } = await supabase
          .from('membros_equipe')
          .select('id, ativo, tipo, perfis_jogo:perfil_jogo_id ( id, user_id )')
          .eq('equipe_id', line.equipe_id)
          .eq('ativo', true)

        podeGerenciarLine =
          equipeLine?.criado_por === user.id ||
          (membrosLine || []).some((item: any) => {
            const perfilJogo = Array.isArray(item.perfis_jogo)
              ? item.perfis_jogo[0]
              : item.perfis_jogo

            return perfilJogo?.user_id === user.id
          })
      }

      if (!podeGerenciarLine) {
        return NextResponse.json(
          { error: 'Você não faz parte dessa line/equipe.' },
          { status: 403 }
        )
      }

      participanteNome = line.nome

      const { error } = await supabase.rpc('reservar_inscricao_grupo_diario_line', {
        p_campeonato_id: campeonatoId,
        p_grupo_id: grupoId,
        p_line_id: lineId,
        p_user_id: user.id,
        p_valor: valorInscricao,
      })

      rpcError = error
    } else {
      const { data: equipe, error: equipeError } = await supabase
        .from('equipes')
        .select('id, nome, criado_por')
        .eq('id', equipeId)
        .single()

      if (equipeError || !equipe) {
        return NextResponse.json({ error: 'Equipe não encontrada.' }, { status: 404 })
      }

      const { data: membroEquipe } = await supabase
        .from('membros_equipe')
        .select('id, ativo, tipo, perfis_jogo:perfil_jogo_id ( id, user_id )')
        .eq('equipe_id', equipeId)
        .eq('ativo', true)

      const podeGerenciar =
        equipe.criado_por === user.id ||
        (membroEquipe || []).some((item: any) => {
          const perfilJogo = Array.isArray(item.perfis_jogo)
            ? item.perfis_jogo[0]
            : item.perfis_jogo

          return perfilJogo?.user_id === user.id
        })

      if (!podeGerenciar) {
        return NextResponse.json(
          { error: 'Você não faz parte dessa equipe.' },
          { status: 403 }
        )
      }

      participanteNome = equipe.nome

      const { error } = await supabase.rpc(
        'reservar_inscricao_grupo_diario',
        {
          p_campeonato_id: campeonatoId,
          p_grupo_id: grupoId,
          p_equipe_id: equipeId,
          p_user_id: user.id,
          p_valor: valorInscricao,
        }
      )

      rpcError = error
    }

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      campeonatoId,
      grupoId,
      equipeId: equipeId || null,
      lineId: lineId || null,
      participanteNome,
      valor: valorInscricao,
      message:
        'Inscrição paga com sucesso. O participante entrou no grupo e caiu no primeiro slot livre.',
    })
  } catch (error) {
    console.error('POST /api/campeonatos/diarios/inscrever', error)
    return NextResponse.json(
      { error: 'Não foi possível concluir a inscrição agora.' },
      { status: 500 }
    )
  }
}