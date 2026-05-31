import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function texto(value: unknown) {
  return String(value || '').trim()
}

function numero(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function garantirPartida(payload: {
  campeonatoId: string
  jogoId: string
  grupoId: string | null
  numeroPartida: number
  mapa: string
}) {
  const { data: existente, error: existenteError } = await supabaseAdmin
    .from('partidas')
    .select('id, numero, mapa')
    .eq('jogo_id', payload.jogoId)
    .eq('numero', payload.numeroPartida)
    .maybeSingle()

  if (existenteError) throw existenteError
  if (existente?.id) return existente

  const { data: criada, error: criarError } = await supabaseAdmin
    .from('partidas')
    .insert([{
      campeonato_id: payload.campeonatoId,
      jogo_id: payload.jogoId,
      grupo_id: payload.grupoId,
      numero: payload.numeroPartida,
      mapa: payload.mapa || null,
      status: 'finalizada',
      ordem_exibicao: payload.numeroPartida,
    }])
    .select('id, numero, mapa')
    .single()

  if (criarError) throw criarError
  return criada
}

async function garantirJogador(params: {
  campeonatoId: string
  campeonatoEquipeId: string
  gameId: string
  nick: string
}) {
  const { data: ceRow, error: ceError } = await supabaseAdmin
    .from('campeonato_equipes')
    .select('id, equipe_id, equipe_avulsa_id')
    .eq('id', params.campeonatoEquipeId)
    .eq('campeonato_id', params.campeonatoId)
    .maybeSingle()

  if (ceError) throw ceError
  if (!ceRow?.id) throw new Error(`Vaga/equipe do campeonato nao encontrada: ${params.campeonatoEquipeId}`)

  const uidJogo = texto(params.gameId)
  const nick = texto(params.nick) || 'SEM NICK'

  if (uidJogo) {
    const { data: perfil } = await supabaseAdmin
      .from('perfis_jogo')
      .select('id, equipe_id')
      .eq('uid_jogo', uidJogo)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (perfil?.id) {
      const { data: jcPerfil } = await supabaseAdmin
        .from('jogadores_campeonato')
        .select('id, campeonato_equipe_id, perfil_jogo_id, equipe_id, equipe_avulsa_id, jogador_avulso_id')
        .eq('campeonato_id', params.campeonatoId)
        .eq('campeonato_equipe_id', ceRow.id)
        .eq('perfil_jogo_id', perfil.id)
        .maybeSingle()

      if (jcPerfil?.id) return jcPerfil

      const { data: novoPerfil, error: novoPerfilError } = await supabaseAdmin
        .from('jogadores_campeonato')
        .insert([{
          campeonato_id: params.campeonatoId,
          campeonato_equipe_id: ceRow.id,
          equipe_id: ceRow.equipe_id || perfil.equipe_id || null,
          equipe_avulsa_id: ceRow.equipe_avulsa_id || null,
          perfil_jogo_id: perfil.id,
          jogador_avulso_id: null,
          origem: 'sumula',
          status: 'ativo',
          criado_automaticamente: true,
          criado_por: null,
          observacoes: 'Vinculado automaticamente via MatchResult',
        }])
        .select('id, campeonato_equipe_id, perfil_jogo_id, equipe_id, equipe_avulsa_id, jogador_avulso_id')
        .single()

      if (novoPerfilError) throw novoPerfilError
      return novoPerfil
    }
  }

  let jogadorAvulsoId = ''

  if (uidJogo) {
    const { data: avulsoExistente } = await supabaseAdmin
      .from('jogadores_avulsos_campeonato')
      .select('id')
      .eq('campeonato_id', params.campeonatoId)
      .eq('uid_jogo', uidJogo)
      .maybeSingle()

    if (avulsoExistente?.id) jogadorAvulsoId = String(avulsoExistente.id)
  }

  if (!jogadorAvulsoId) {
    const campoEquipe = ceRow.equipe_id ? 'equipe_id' : 'equipe_avulsa_id'
    const valorEquipe = ceRow.equipe_id || ceRow.equipe_avulsa_id

    if (valorEquipe) {
      const { data: avulsoPorNick } = await supabaseAdmin
        .from('jogadores_avulsos_campeonato')
        .select('id')
        .eq('campeonato_id', params.campeonatoId)
        .eq('nick', nick)
        .eq(campoEquipe, valorEquipe)
        .maybeSingle()

      if (avulsoPorNick?.id) jogadorAvulsoId = String(avulsoPorNick.id)
    }
  }

  if (!jogadorAvulsoId) {
    const { data: novoAvulso, error: novoAvulsoError } = await supabaseAdmin
      .from('jogadores_avulsos_campeonato')
      .insert([{
        campeonato_id: params.campeonatoId,
        equipe_id: ceRow.equipe_id || null,
        equipe_avulsa_id: ceRow.equipe_avulsa_id || null,
        nick,
        uid_jogo: uidJogo || `temp:${params.campeonatoEquipeId}:${nick}`,
        funcao: null,
        foto_url: null,
        criado_por: null,
        criado_automaticamente: true,
        origem: 'matchresult',
      }])
      .select('id')
      .single()

    if (novoAvulsoError) throw novoAvulsoError
    jogadorAvulsoId = String(novoAvulso.id)
  }

  const { data: jcExistente } = await supabaseAdmin
    .from('jogadores_campeonato')
    .select('id, campeonato_equipe_id, perfil_jogo_id, equipe_id, equipe_avulsa_id, jogador_avulso_id')
    .eq('campeonato_id', params.campeonatoId)
    .eq('campeonato_equipe_id', ceRow.id)
    .eq('jogador_avulso_id', jogadorAvulsoId)
    .maybeSingle()

  if (jcExistente?.id) return jcExistente

  const { data: novoJc, error: novoJcError } = await supabaseAdmin
    .from('jogadores_campeonato')
    .insert([{
      campeonato_id: params.campeonatoId,
      campeonato_equipe_id: ceRow.id,
      equipe_id: ceRow.equipe_id || null,
      equipe_avulsa_id: ceRow.equipe_avulsa_id || null,
      perfil_jogo_id: null,
      jogador_avulso_id: jogadorAvulsoId,
      origem: 'sumula',
      status: 'ativo',
      criado_automaticamente: true,
      criado_por: null,
      observacoes: 'Criado automaticamente via MatchResult',
    }])
    .select('id, campeonato_equipe_id, perfil_jogo_id, equipe_id, equipe_avulsa_id, jogador_avulso_id')
    .single()

  if (novoJcError) throw novoJcError
  return novoJc
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const campeonatoId = texto(body.campeonatoId)
    const jogoId = texto(body.jogoId)
    const faseId = texto(body.faseId) || null
    const grupoId = texto(body.grupoId) || null
    const mapa = texto(body.mapa)
    const numeroPartida = Math.max(1, numero(body.numeroPartida, 1))
    const jogadores = Array.isArray(body.jogadores) ? body.jogadores : []

    if (!campeonatoId || !jogoId || !mapa) {
      return NextResponse.json({ ok: false, error: 'Dados da sumula incompletos.' }, { status: 400 })
    }

    const partida = await garantirPartida({ campeonatoId, jogoId, grupoId, numeroPartida, mapa })

    const { error: limparError } = await supabaseAdmin
      .from('resultados_mvp')
      .delete()
      .eq('campeonato_id', campeonatoId)
      .eq('jogo_id', jogoId)
      .eq('partida_id', partida.id)

    if (limparError) throw limparError

    const insertsMap = new Map<string, any>()

    for (const item of jogadores) {
      const campeonatoEquipeId = texto(item.campeonatoEquipeId)
      const gameId = texto(item.gameId)
      const nick = texto(item.nick) || 'SEM NICK'
      const abates = numero(item.abates, 0)

      if (!campeonatoEquipeId || !gameId) continue

      const jogador = await garantirJogador({ campeonatoId, campeonatoEquipeId, gameId, nick })
      if (!jogador?.id) continue

      const chave = String(jogador.id)
      const existente = insertsMap.get(chave)

      if (existente) {
        existente.abates = Math.max(Number(existente.abates || 0), abates)
        continue
      }

      insertsMap.set(chave, {
        campeonato_id: campeonatoId,
        fase_id: faseId,
        jogo_id: jogoId,
        partida_id: partida.id,
        mapa,
        grupo_id: grupoId,
        campeonato_equipe_id: campeonatoEquipeId,
        equipe_id: campeonatoEquipeId,
        equipe_avulsa_id: jogador.equipe_avulsa_id || null,
        perfil_jogo_id: jogador.perfil_jogo_id || null,
        jogador_campeonato_id: jogador.id,
        jogador_avulso_id: jogador.jogador_avulso_id || null,
        nick_snapshot: nick,
        uid_jogo_snapshot: gameId,
        abates,
        dano: 0,
        assistencias: 0,
        revives: 0,
        colocacao_individual: null,
        observacoes: 'Importado via MatchResult',
      })
    }

    const inserts = Array.from(insertsMap.values())
    if (inserts.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('resultados_mvp').insert(inserts)
      if (insertError) throw insertError
    }

    return NextResponse.json({ ok: true, count: inserts.length, partidaId: partida.id })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Erro ao salvar MVP da sumula.' }, { status: 500 })
  }
}
