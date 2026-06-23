'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  RankingRow,
  defaultTabelaGeralConfig,
  mergeOverlayConfig,
  sampleRankingRows,
} from '@/lib/streamOverlay'
import { getStreamOverlayTemplate } from '@/app/components/stream/overlays/catalog'
import { getStreamOverlayDefinition } from '@/app/components/stream/overlays/registry'
import { getFreeFireMapImage, normalizeFreeFireMapName } from '@/app/components/stream/overlays/mapas-freefire'
import type { StreamOverlayContext } from '@/app/components/stream/overlays/types'

type Projeto = {
  id: string
  campeonato_id: string | null
  stream_key: string
}

type CampeonatoInfo = {
  id: string
  nome: string | null
  logo_url: string | null
}

type Overlay = {
  id: string
  project_id: string
  template_id: string
  nome: string
  config: Record<string, any> | null
  visivel: boolean
}

type CampeonatoEquipeRow = {
  id: string
  equipe_id: string | null
  equipe_avulsa_id: string | null
  nome_exibicao?: string | null
  grupo_id: string | null
  equipes?: { nome?: string | null; tag?: string | null; logo_url?: string | null } | null
  equipe_avulsa?: { nome?: string | null; tag?: string | null; logo_url?: string | null } | null
}

type ResultadoRow = {
  id?: string | null
  campeonato_id?: string | null
  fase_id?: string | null
  jogo_id?: string | null
  equipe_id: string | null
  grupo_id?: string | null
  mapa?: string | null
  partida_id?: string | null
  colocacao?: number | null
  posicao?: number | null
  abates?: number | null
  pontos_total?: number | null
  total_pontos?: number | null
  created_at?: string | null
}

type MvpRow = {
  id?: string | null
  campeonato_id?: string | null
  fase_id?: string | null
  jogo_id?: string | null
  partida_id?: string | null
  mapa?: string | null
  jogador_campeonato_id?: string | null
  perfil_jogo_id?: string | null
  campeonato_equipe_id?: string | null
  equipe_id?: string | null
  equipe_avulsa_id?: string | null
  nick_snapshot?: string | null
  uid_jogo_snapshot?: string | null
  abates?: number | null
}

type JogadorCampeonatoRow = {
  id: string
  perfil_jogo_id?: string | null
  equipe_id?: string | null
  campeonato_equipe_id?: string | null
  equipe_avulsa_id?: string | null
  jogador_avulso_id?: string | null
}

type JogadorAvulsoRow = {
  id: string
  nick?: string | null
  uid_jogo?: string | null
  foto_url?: string | null
  equipe_id?: string | null
  equipe_avulsa_id?: string | null
}

type PerfilJogoRow = {
  id: string
  nick?: string | null
  uid_jogo?: string | null
  foto_capa?: string | null
}

type JogoRow = {
  id: string
  campeonato_id?: string | null
  fase_id?: string | null
  grupo_id?: string | null
  nome?: string | null
  nome_bloco?: string | null
  mapa?: string | null
  numero_queda?: number | null
  quantidade_partidas?: number | null
  quedas?: string[] | null
  data_hora?: string | null
  created_at?: string | null
}

type PartidaRow = {
  id: string
  jogo_id: string | null
  numero?: number | null
  mapa?: string | null
}

function textoSeguro(valor: unknown, fallback = '') {
  const texto = String(valor || '').trim()
  return texto || fallback
}

function numero(valor: unknown) {
  return Number(valor || 0)
}

function getActiveProjectStorageKey(controllerKey: string) {
  return `stream.controller.activeProject.${controllerKey}`
}

function getActiveProjectChannelName(controllerKey: string) {
  return `stream-controller-active-project-${controllerKey}`
}

function getEquipeNome(item: CampeonatoEquipeRow) {
  return item.equipes?.nome || item.equipe_avulsa?.nome || item.nome_exibicao || `Equipe ${String(item.id || '').slice(0, 6)}`
}

function getEquipeTag(item: CampeonatoEquipeRow) {
  return item.equipes?.tag || item.equipe_avulsa?.tag || null
}

function getEquipeLogo(item: CampeonatoEquipeRow) {
  return item.equipes?.logo_url || item.equipe_avulsa?.logo_url || null
}

function jogoIdConfigurado(config?: Record<string, any> | null) {
  return textoSeguro(config?.data?.jogo_id || config?.jogo_id || config?.jogoId)
}

function partidaIdConfigurada(config?: Record<string, any> | null) {
  return textoSeguro(config?.data?.partida_id || config?.partida_id || config?.partidaId)
}

function mapaConfigurado(config?: Record<string, any> | null) {
  return textoSeguro(config?.data?.mapa || config?.mapa)
}

function grupoConfigurado(config?: Record<string, any> | null) {
  return textoSeguro(config?.data?.grupo_id || config?.grupo_id || config?.grupoId)
}

function getResultadoMapaKey(row: ResultadoRow) {
  return normalizeFreeFireMapName(row.mapa)
}

function resultadosAoVivo(config?: Record<string, any> | null): ResultadoRow[] {
  const live = config?.__liveResults
  const mapa = textoSeguro(live?.mapa)
  const jogoId = textoSeguro(live?.jogo_id)

  if (!Array.isArray(live?.rows)) return []

  return live.rows
    .map((row: any) => ({
      id: row.id,
      jogo_id: textoSeguro(row.jogo_id || jogoId) || null,
      partida_id: textoSeguro(row.partida_id) || null,
      equipe_id: textoSeguro(row.equipe_id),
      grupo_id: textoSeguro(row.grupo_id) || null,
      mapa: textoSeguro(row.mapa || mapa) || null,
      colocacao: numero(row.colocacao ?? row.posicao),
      posicao: numero(row.posicao ?? row.colocacao),
      abates: numero(row.abates),
      pontos: numero(row.pontos ?? row.total_pontos ?? row.pontos_total),
      total_pontos: numero(row.total_pontos ?? row.pontos ?? row.pontos_total),
      pontos_total: numero(row.pontos_total ?? row.pontos ?? row.total_pontos),
      created_at: textoSeguro(live.updated_at || row.created_at) || null,
    }))
    .filter((row: ResultadoRow) => textoSeguro(row.equipe_id))
}

function getQuedaMapaNome(queda: unknown) {
  if (typeof queda === 'string') return textoSeguro(queda)
  if (queda && typeof queda === 'object') {
    const item = queda as Record<string, unknown>
    return textoSeguro(item.mapa) || textoSeguro(item.nome) || textoSeguro(item.name) || textoSeguro(item.label)
  }
  return textoSeguro(queda)
}

function booleanConfigurado(config: Record<string, any> | null | undefined, path: string, fallback = false) {
  const partes = path.split('.')
  let atual: any = config
  for (const parte of partes) {
    atual = atual?.[parte]
  }
  if (typeof atual === 'boolean') return atual
  return fallback
}

async function carregarBaseCampeonato(campeonatoId: string) {
  const [{ data: equipes }, { data: grupos }, { data: jogos }] = await Promise.all([
    supabase
      .from('campeonato_equipes')
      .select(`
        id,
        equipe_id,
        equipe_avulsa_id,
        nome_exibicao,
        grupo_id,
        equipes ( nome, tag, logo_url ),
        equipe_avulsa:equipes_avulsas_campeonato ( nome, tag, logo_url )
      `)
      .eq('campeonato_id', campeonatoId)
      .order('created_at', { ascending: true }),
    supabase.from('campeonato_grupos').select('id, nome').eq('campeonato_id', campeonatoId),
    supabase
      .from('jogos')
      .select('id, campeonato_id, fase_id, grupo_id, nome, nome_bloco, mapa, numero_queda, quantidade_partidas, quedas, data_hora, created_at')
      .eq('campeonato_id', campeonatoId)
      .order('created_at', { ascending: false }),
  ])

  const equipesLista = (equipes || []) as CampeonatoEquipeRow[]
  const gruposMap = new Map(((grupos || []) as Array<{ id?: unknown; nome?: unknown }>).map((grupo) => [textoSeguro(grupo.id), textoSeguro(grupo.nome, '-')]))
  const publicToCampeonato = new Map<string, string>()

  equipesLista.forEach((equipe) => {
    ;[equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id]
      .map((item) => textoSeguro(item))
      .filter(Boolean)
      .forEach((ref) => publicToCampeonato.set(ref, equipe.id))
  })

  return {
    equipesLista,
    gruposMap,
    jogosLista: (jogos || []) as JogoRow[],
    publicToCampeonato,
  }
}

function escolherJogo(jogos: JogoRow[], resultados: ResultadoRow[], config?: Record<string, any> | null) {
  const wanted = jogoIdConfigurado(config)
  if (wanted) return jogos.find((jogo) => jogo.id === wanted) || null

  const jogoComResultado = [...resultados]
    .reverse()
    .map((resultado) => textoSeguro(resultado.jogo_id))
    .find(Boolean)

  if (jogoComResultado) return jogos.find((jogo) => jogo.id === jogoComResultado) || null
  return jogos[0] || null
}

async function carregarPartidaSelecionada(jogoId: string, config?: Record<string, any> | null) {
  const partidaWanted = partidaIdConfigurada(config)
  const mapaWanted = mapaConfigurado(config)

  const query = supabase
    .from('partidas')
    .select('id, jogo_id, numero, mapa')
    .eq('jogo_id', jogoId)
    .order('numero', { ascending: true })

  const { data } = await query
  const partidas = (data || []) as PartidaRow[]

  if (partidaWanted) return partidas.find((partida) => partida.id === partidaWanted) || null
  if (mapaWanted) return partidas.find((partida) => textoSeguro(partida.mapa).toLowerCase() === mapaWanted.toLowerCase()) || null
  return partidas[0] || null
}

function montarRowsEquipes(
  equipesLista: CampeonatoEquipeRow[],
  gruposMap: Map<string, string>,
  publicToCampeonato: Map<string, string>,
  resultados: ResultadoRow[],
) {
  const rankingSort = (a: RankingRow, b: RankingRow) => b.pontos - a.pontos || b.booyahs - a.booyahs || b.kills - a.kills || a.nome.localeCompare(b.nome, 'pt-BR')
  const resultadoQuedaKey = (resultado: ResultadoRow, index: number) => textoSeguro(resultado.partida_id)
    || [textoSeguro(resultado.jogo_id), textoSeguro(resultado.mapa)].filter(Boolean).join(':')
    || textoSeguro(resultado.created_at)
    || textoSeguro(resultado.id)
    || `resultado-${index}`
  const orderedResultados = [...resultados].sort((a, b) => {
    const aTime = new Date(textoSeguro(a.created_at)).getTime() || 0
    const bTime = new Date(textoSeguro(b.created_at)).getTime() || 0
    if (aTime !== bTime) return aTime - bTime
    return textoSeguro(a.id).localeCompare(textoSeguro(b.id))
  })
  const latestKey = orderedResultados.length > 0 ? resultadoQuedaKey(orderedResultados[orderedResultados.length - 1], orderedResultados.length - 1) : ''
  const anteriores = latestKey ? orderedResultados.filter((resultado, index) => resultadoQuedaKey(resultado, index) !== latestKey) : []

  const montar = (rows: ResultadoRow[]) => {
    const statsMap = new Map<string, { quedas: number; booyahs: number; kills: number; pontos: number; grupoId: string | null }>()

    rows.forEach((resultado) => {
      const ref = textoSeguro(resultado.equipe_id)
      const campeonatoEquipeId = publicToCampeonato.get(ref) || ref
      if (!campeonatoEquipeId) return

      const atual = statsMap.get(campeonatoEquipeId) || { quedas: 0, booyahs: 0, kills: 0, pontos: 0, grupoId: null as string | null }
      atual.quedas += 1
      atual.kills += numero(resultado.abates)
      atual.pontos += numero(resultado.pontos_total ?? resultado.total_pontos)
      if (numero(resultado.colocacao ?? resultado.posicao) === 1) atual.booyahs += 1
      if (!atual.grupoId && resultado.grupo_id) atual.grupoId = textoSeguro(resultado.grupo_id)
      statsMap.set(campeonatoEquipeId, atual)
    })

    return equipesLista
      .map((equipe) => {
        const stats = statsMap.get(equipe.id) || { quedas: 0, booyahs: 0, kills: 0, pontos: 0, grupoId: null }
        const grupoId = textoSeguro(stats.grupoId || equipe.grupo_id)
        return {
          id: equipe.id,
          nome: getEquipeNome(equipe),
          tag: getEquipeTag(equipe),
          logo: getEquipeLogo(equipe),
          grupo: grupoId ? gruposMap.get(grupoId) || '-' : '-',
          quedas: stats.quedas,
          booyahs: stats.booyahs,
          kills: stats.kills,
          pontos: stats.pontos,
        }
      })
      .filter((row) => row.quedas > 0 || row.pontos > 0)
      .sort(rankingSort)
  }

  const rankingAtual = montar(orderedResultados)
  const posicaoAnterior = new Map(montar(anteriores).map((row, index) => [row.id, index + 1]))
  return rankingAtual.map((row, index) => ({ ...row, variacao: (posicaoAnterior.get(row.id) || index + 1) - (index + 1) }))
}

async function montarRowsMvp(rows: MvpRow[], equipesLista: CampeonatoEquipeRow[], gruposMap: Map<string, string>): Promise<RankingRow[]> {
  const equipesMap = new Map<string, CampeonatoEquipeRow>()
  equipesLista.forEach((equipe) => {
    ;[equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean).forEach((ref) => equipesMap.set(ref, equipe))
  })

  const jogadorCampeonatoIds = Array.from(new Set(rows.map((row) => textoSeguro(row.jogador_campeonato_id)).filter(Boolean)))
  const { data: jogadoresCampeonatoRows } = jogadorCampeonatoIds.length > 0
    ? await supabase
      .from('jogadores_campeonato')
      .select('id, perfil_jogo_id, equipe_id, campeonato_equipe_id, equipe_avulsa_id, jogador_avulso_id')
      .in('id', jogadorCampeonatoIds)
    : { data: [] }

  const jogadoresCampeonatoMap = new Map<string, JogadorCampeonatoRow>(
    ((jogadoresCampeonatoRows || []) as JogadorCampeonatoRow[]).map((row) => [String(row.id), row])
  )
  const jogadorAvulsoIds = Array.from(new Set(
    ((jogadoresCampeonatoRows || []) as JogadorCampeonatoRow[])
      .map((row) => textoSeguro(row.jogador_avulso_id))
      .filter(Boolean)
  ))
  const { data: jogadoresAvulsosRows } = jogadorAvulsoIds.length > 0
    ? await supabase
      .from('jogadores_avulsos_campeonato')
      .select('id, nick, uid_jogo, foto_url, equipe_id, equipe_avulsa_id')
      .in('id', jogadorAvulsoIds)
    : { data: [] }

  const jogadoresAvulsosMap = new Map<string, JogadorAvulsoRow>(
    ((jogadoresAvulsosRows || []) as JogadorAvulsoRow[]).map((row) => [String(row.id), row])
  )
  const perfilIds = Array.from(new Set(
    rows
      .map((row) => {
        const jogador = row.jogador_campeonato_id ? jogadoresCampeonatoMap.get(String(row.jogador_campeonato_id)) : null
        return textoSeguro(row.perfil_jogo_id || jogador?.perfil_jogo_id)
      })
      .filter(Boolean)
  ))
  const uidSemPerfil = Array.from(new Set(
    rows
      .map((row) => {
        const jogador = row.jogador_campeonato_id ? jogadoresCampeonatoMap.get(String(row.jogador_campeonato_id)) : null
        const avulso = jogador?.jogador_avulso_id ? jogadoresAvulsosMap.get(String(jogador.jogador_avulso_id)) : null
        const perfilId = textoSeguro(row.perfil_jogo_id || jogador?.perfil_jogo_id)
        return perfilId ? '' : textoSeguro(row.uid_jogo_snapshot || avulso?.uid_jogo)
      })
      .filter(Boolean)
  ))
  const [{ data: perfisRows }, { data: perfisPorUidRows }] = await Promise.all([
    perfilIds.length > 0
      ? supabase.from('perfis_jogo').select('id, nick, uid_jogo, foto_capa').in('id', perfilIds)
      : Promise.resolve({ data: [] }),
    uidSemPerfil.length > 0
      ? supabase.from('perfis_jogo').select('id, nick, uid_jogo, foto_capa').in('uid_jogo', uidSemPerfil)
      : Promise.resolve({ data: [] }),
  ])

  const perfisMap = new Map<string, PerfilJogoRow>(((perfisRows || []) as PerfilJogoRow[]).map((row) => [String(row.id), row]))
  const perfisPorUidMap = new Map<string, PerfilJogoRow>(((perfisPorUidRows || []) as PerfilJogoRow[]).map((row) => [textoSeguro(row.uid_jogo), row]))
  const acumulado = new Map<string, RankingRow & { partidasSet: Set<string> }>()

  rows.forEach((row) => {
    const jogadorCampeonato = row.jogador_campeonato_id ? jogadoresCampeonatoMap.get(String(row.jogador_campeonato_id)) : null
    const jogadorAvulso = jogadorCampeonato?.jogador_avulso_id ? jogadoresAvulsosMap.get(String(jogadorCampeonato.jogador_avulso_id)) : null
    const perfilId = textoSeguro(row.perfil_jogo_id || jogadorCampeonato?.perfil_jogo_id)
    const uid = textoSeguro(row.uid_jogo_snapshot || jogadorAvulso?.uid_jogo)
    const perfil = perfilId ? perfisMap.get(perfilId) : null
    const perfilPorUid = !perfilId && uid ? perfisPorUidMap.get(uid) : null
    const nome = textoSeguro(row.nick_snapshot || jogadorAvulso?.nick || perfil?.nick || perfilPorUid?.nick || uid, 'SEM NICK')
    const equipeId = textoSeguro(row.campeonato_equipe_id || jogadorCampeonato?.campeonato_equipe_id || row.equipe_id || jogadorCampeonato?.equipe_id || jogadorAvulso?.equipe_id || row.equipe_avulsa_id || jogadorCampeonato?.equipe_avulsa_id || jogadorAvulso?.equipe_avulsa_id)
    const equipe = equipeId ? equipesMap.get(equipeId) : null
    const playerPhoto = (perfil?.foto_capa as string | null) || (perfilPorUid?.foto_capa as string | null) || (jogadorAvulso?.foto_url as string | null) || null
    const key = `${textoSeguro(row.jogador_campeonato_id || perfilId || uid || row.nick_snapshot)}::${equipeId}`
    if (!key.trim()) return

    const atual = acumulado.get(key) || {
      id: key,
      nome,
      tag: equipe ? getEquipeTag(equipe) : null,
      logo: equipe ? getEquipeLogo(equipe) : null,
      playerPhoto,
      grupo: equipe?.grupo_id ? gruposMap.get(textoSeguro(equipe.grupo_id)) || '-' : '-',
      quedas: 0,
      booyahs: 0,
      kills: 0,
      pontos: 0,
      partidasSet: new Set<string>(),
    }

    atual.kills += numero(row.abates)
    atual.pontos = atual.kills
    if (!atual.playerPhoto && playerPhoto) atual.playerPhoto = playerPhoto
    if (!atual.logo && equipe) atual.logo = getEquipeLogo(equipe)
    if ((!atual.nome || atual.nome === 'SEM NICK') && nome) atual.nome = nome
    const partidaKey = textoSeguro(row.partida_id || `${row.jogo_id || ''}:${row.mapa || ''}`)
    if (partidaKey) atual.partidasSet.add(partidaKey)
    atual.quedas = atual.partidasSet.size
    acumulado.set(key, atual)
  })

  return Array.from(acumulado.values())
    .map((item) => {
      const { partidasSet: _partidasSet, ...row } = item
      void _partidasSet
      return row
    })
    .sort((a, b) => b.kills - a.kills || b.quedas - a.quedas || a.nome.localeCompare(b.nome, 'pt-BR'))
}

function montarRowsBooyahsDia(jogo: JogoRow | null, resultados: ResultadoRow[], equipesLista: CampeonatoEquipeRow[], publicToCampeonato: Map<string, string>) {
  const equipesMap = new Map(equipesLista.map((equipe) => [equipe.id, equipe]))
  const mapasDoJogo = Array.isArray(jogo?.quedas)
    ? jogo.quedas.map((mapa) => getQuedaMapaNome(mapa)).filter(Boolean)
    : []
  const quantidade = mapasDoJogo.length > 0 ? mapasDoJogo.length : Math.max(Number(jogo?.quantidade_partidas || 0), 1)
  const fallbackMapas = ['Bermuda', 'Purgatorio', 'Kalahari', 'Alpine', 'Nova Terra', 'Solara']

  return Array.from({ length: quantidade }, (_, index) => {
    const mapaNome = mapasDoJogo[index] || fallbackMapas[index % fallbackMapas.length] || `Queda ${index + 1}`
    const mapaKey = normalizeFreeFireMapName(mapaNome)
    const resultadosDaQueda = resultados.filter((row) => {
      if (jogo?.id && textoSeguro(row.jogo_id) !== jogo.id) return false
      return getResultadoMapaKey(row) === mapaKey
    })
    const vencedor = resultadosDaQueda.find((row) => numero(row.posicao ?? row.colocacao) === 1)
      || [...resultadosDaQueda].sort((a, b) => numero(b.total_pontos ?? b.pontos_total) - numero(a.total_pontos ?? a.pontos_total))[0]
    const equipeRef = textoSeguro(vencedor?.equipe_id)
    const campeonatoEquipeId = publicToCampeonato.get(equipeRef) || equipeRef
    const equipe = campeonatoEquipeId ? equipesMap.get(campeonatoEquipeId) : null
    const mapa = getFreeFireMapImage(mapaNome)

    return {
      id: `${jogo?.id || 'jogo'}-${index + 1}`,
      nome: equipe ? getEquipeNome(equipe) : '',
      tag: equipe ? getEquipeTag(equipe) : null,
      logo: equipe ? getEquipeLogo(equipe) : null,
      grupo: null,
      quedas: vencedor ? 1 : 0,
      booyahs: vencedor ? 1 : 0,
      kills: numero(vencedor?.abates),
      pontos: numero(vencedor?.total_pontos ?? vencedor?.pontos_total),
      mapa: mapa?.nome || mapaNome,
      mapaImagem: mapa?.url || null,
      quedaNumero: index + 1,
      concluida: Boolean(vencedor),
    }
  })
}

async function carregarDadosOverlay(campeonatoId: string, templateId: string, config?: Record<string, any> | null): Promise<RankingRow[]> {
  const [{ equipesLista, gruposMap, jogosLista, publicToCampeonato }, { data: resultadosData }, { data: mvpData }] = await Promise.all([
    carregarBaseCampeonato(campeonatoId),
    supabase
      .from('resultados_jogos')
      .select('id, campeonato_id, fase_id, jogo_id, partida_id, equipe_id, grupo_id, mapa, posicao, abates, total_pontos, created_at')
      .eq('campeonato_id', campeonatoId),
    supabase
      .from('resultados_mvp')
      .select('id, campeonato_id, fase_id, jogo_id, partida_id, mapa, jogador_campeonato_id, perfil_jogo_id, campeonato_equipe_id, equipe_id, equipe_avulsa_id, nick_snapshot, uid_jogo_snapshot, abates')
      .eq('campeonato_id', campeonatoId),
  ])

  const resultados = [...((resultadosData || []) as ResultadoRow[]), ...resultadosAoVivo(config)]
  const mvpRows = (mvpData || []) as MvpRow[]
  const jogo = escolherJogo(jogosLista, resultados, config)
  const partida = jogo?.id ? await carregarPartidaSelecionada(jogo.id, config) : null
  const mapaAlvo = mapaConfigurado(config) || textoSeguro(partida?.mapa || jogo?.mapa)
  const grupoAlvo = grupoConfigurado(config) || textoSeguro(jogo?.grupo_id)

  if (templateId === 'tela-de-espera' || templateId === 'tela-espera') {
    return equipesLista
      .filter((equipe) => !grupoAlvo || textoSeguro(equipe.grupo_id) === grupoAlvo)
      .map((equipe) => ({
        id: equipe.id,
        nome: getEquipeNome(equipe),
        tag: getEquipeTag(equipe),
        logo: getEquipeLogo(equipe),
        grupo: equipe.grupo_id ? gruposMap.get(textoSeguro(equipe.grupo_id)) || '-' : '-',
        quedas: 0,
        booyahs: 0,
        kills: 0,
        pontos: 0,
      }))
  }

  if (templateId === 'booyah' && config?.booyahsDia) {
    return montarRowsBooyahsDia(jogo, resultados, equipesLista, publicToCampeonato)
  }

  if (templateId === 'booyah') {
    const rowsDaQueda = resultados.filter((row) => {
      if (jogo?.id && textoSeguro(row.jogo_id) !== jogo.id) return false
      if (mapaAlvo && textoSeguro(row.mapa).toLowerCase() !== mapaAlvo.toLowerCase()) return false
      return true
    })
    const rankingDaQueda = montarRowsEquipes(equipesLista, gruposMap, publicToCampeonato, rowsDaQueda)
    const vencedorDaQueda = rankingDaQueda.find((row) => row.booyahs > 0)
    if (vencedorDaQueda) return [vencedorDaQueda]

    const rankingGeral = montarRowsEquipes(equipesLista, gruposMap, publicToCampeonato, resultados)
    const vencedorGeral = rankingGeral.find((row) => row.booyahs > 0) || rankingGeral[0]
    if (vencedorGeral) return [vencedorGeral]

    const primeiraEquipe = equipesLista[0]
    if (primeiraEquipe) {
      return [{
        id: primeiraEquipe.id,
        nome: getEquipeNome(primeiraEquipe),
        tag: getEquipeTag(primeiraEquipe),
        logo: getEquipeLogo(primeiraEquipe),
        grupo: primeiraEquipe.grupo_id ? gruposMap.get(textoSeguro(primeiraEquipe.grupo_id)) || '-' : '-',
        quedas: 0,
        booyahs: 0,
        kills: 0,
        pontos: 0,
      }]
    }

    return []
  }

  if (templateId === 'tabela-da-queda' || templateId === 'tabela-queda') {
    const rowsDaQueda = resultados.filter((row) => {
      if (jogo?.id && textoSeguro(row.jogo_id) !== jogo.id) return false
      if (mapaAlvo && textoSeguro(row.mapa).toLowerCase() !== mapaAlvo.toLowerCase()) return false
      return true
    })
    return montarRowsEquipes(equipesLista, gruposMap, publicToCampeonato, rowsDaQueda)
  }

  if (templateId === 'tabela-do-dia' || templateId === 'tabela-dia') {
    const rowsDoJogo = resultados.filter((row) => !jogo?.id || textoSeguro(row.jogo_id) === jogo.id)
    return montarRowsEquipes(equipesLista, gruposMap, publicToCampeonato, rowsDoJogo)
  }

  if (templateId === 'booyahs-do-dia' || templateId === 'booyahs-dia') {
    return montarRowsBooyahsDia(jogo, resultados, equipesLista, publicToCampeonato)
  }

  if (templateId === 'mvp-da-queda' || templateId === 'mvp-queda') {
    const rowsDaQueda = mvpRows.filter((row) => {
      if (jogo?.id && textoSeguro(row.jogo_id) !== jogo.id) return false
      if (partida?.id && textoSeguro(row.partida_id) !== partida.id) return false
      if (!partida?.id && mapaAlvo && textoSeguro(row.mapa).toLowerCase() !== mapaAlvo.toLowerCase()) return false
      return true
    })
    return await montarRowsMvp(rowsDaQueda, equipesLista, gruposMap)
  }

  if (templateId === 'mvp-do-dia' || templateId === 'mvp-dia') {
    const rowsDoJogo = mvpRows.filter((row) => !jogo?.id || textoSeguro(row.jogo_id) === jogo.id)
    return await montarRowsMvp(rowsDoJogo, equipesLista, gruposMap)
  }

  if (templateId === 'mvp-geral') {
    return await montarRowsMvp(mvpRows, equipesLista, gruposMap)
  }

  return montarRowsEquipes(equipesLista, gruposMap, publicToCampeonato, resultados)
}

async function carregarCountdownContext(campeonatoId: string, config?: Record<string, any> | null): Promise<{ rows: RankingRow[]; context: StreamOverlayContext }> {
  const { equipesLista, gruposMap, jogosLista } = await carregarBaseCampeonato(campeonatoId)
  const jogo = escolherJogo(jogosLista, [], config)

  let idsDoJogo = new Set<string>()
  if (jogo?.id) {
    const { data: jogoEquipes } = await supabase
      .from('jogo_equipes')
      .select('campeonato_equipe_id')
      .eq('jogo_id', jogo.id)

    idsDoJogo = new Set(((jogoEquipes || []) as Array<{ campeonato_equipe_id?: string | null }>).map((item) => textoSeguro(item.campeonato_equipe_id)).filter(Boolean))
  }

  const filtrarPorJogo = booleanConfigurado(config, 'countdown.filtrarPorJogo', false)
  const grupoAlvo = grupoConfigurado(config) || (filtrarPorJogo ? textoSeguro(jogo?.grupo_id) : '')
  const equipesDoJogo = equipesLista.filter((equipe) => {
    if (filtrarPorJogo && idsDoJogo.size > 0) return idsDoJogo.has(equipe.id)
    if (grupoAlvo) return textoSeguro(equipe.grupo_id) === grupoAlvo
    return true
  })

  const rows = equipesDoJogo.map((equipe) => ({
    id: equipe.id,
    nome: getEquipeNome(equipe),
    tag: getEquipeTag(equipe),
    logo: getEquipeLogo(equipe),
    grupo: equipe.grupo_id ? gruposMap.get(textoSeguro(equipe.grupo_id)) || '-' : '-',
    quedas: 0,
    booyahs: 0,
    kills: 0,
    pontos: 0,
  }))

  const quedas = Array.isArray(jogo?.quedas) ? jogo.quedas : []
  const mapas = quedas.map((mapa) => textoSeguro(mapa)).filter(Boolean)

  return {
    rows,
    context: {
      jogo: jogo ? {
        id: jogo.id,
        nome: jogo.nome,
        nome_bloco: jogo.nome_bloco,
        quantidade_partidas: jogo.quantidade_partidas,
        data_hora: jogo.data_hora,
      } : null,
      mapas,
      quantidadePartidas: Number(jogo?.quantidade_partidas || mapas.length || 0),
    },
  }
}

export default function FixedOverlayRenderPage() {
  const params = useParams<{ key: string; overlayType: string }>()
  const streamKey = params?.key
  const overlayType = params?.overlayType
  const fixedTemplate = getStreamOverlayTemplate(overlayType)

  const [project, setProject] = useState<Projeto | null>(null)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [rows, setRows] = useState<RankingRow[]>([])
  const [overlayContext, setOverlayContext] = useState<StreamOverlayContext>({})
  const [loaded, setLoaded] = useState(false)
  const [genericOnly, setGenericOnly] = useState(false)
  const [viewport, setViewport] = useState({ width: 1920, height: 1080 })

  const config = useMemo(() => {
    const fallbackConfig = fixedTemplate?.config_padrao || mergeOverlayConfig(defaultTabelaGeralConfig, { title: String(overlayType || 'OVERLAY').toUpperCase() })
    return mergeOverlayConfig(defaultTabelaGeralConfig, mergeOverlayConfig(fallbackConfig, overlay?.config || {}))
  }, [fixedTemplate, overlay, overlayType])

  const overlayDefinition = getStreamOverlayDefinition(fixedTemplate?.id || overlayType, config as any)

  const carregarPorStreamKey = useCallback(async (keyToLoad: string) => {
    const { data: projectData } = await supabase
      .from('stream_projects')
      .select('id, campeonato_id, stream_key')
      .eq('stream_key', keyToLoad)
      .maybeSingle()

    return (projectData as Projeto | null) || null
  }, [])

  const carregar = useCallback(async () => {
    if (!streamKey || !fixedTemplate) {
      setLoaded(true)
      return
    }

    const activeStreamKey = typeof window !== 'undefined'
      ? textoSeguro(localStorage.getItem(getActiveProjectStorageKey(streamKey)))
      : ''
    const projectData = await carregarPorStreamKey(activeStreamKey || streamKey)

    if (!projectData) {
      setProject(null)
      setOverlay(null)
      setGenericOnly(true)
      setRows(sampleRankingRows(Number(fixedTemplate.config_padrao.layout?.maxRows || 8)))
      setLoaded(true)
      return
    }

    setGenericOnly(false)
    setProject(projectData as Projeto)

    const { data: overlayData } = await supabase
      .from('stream_project_overlays')
      .select('id, project_id, template_id, nome, config, visivel')
      .eq('project_id', projectData.id)
      .eq('template_id', fixedTemplate.id)
      .maybeSingle()

    const overlayRow = (overlayData as Overlay) || null
    setOverlay(overlayRow)

    if (projectData.campeonato_id) {
      const { data: campeonatoData } = await supabase
        .from('campeonatos')
        .select('id, nome, logo_url')
        .eq('id', projectData.campeonato_id)
        .maybeSingle()
      const campeonato = (campeonatoData as CampeonatoInfo | null) || null

      if (fixedTemplate.id === 'countdown') {
        const countdownData = await carregarCountdownContext(projectData.campeonato_id, overlayRow?.config)
        setRows(countdownData.rows)
        setOverlayContext({ ...countdownData.context, campeonato })
      } else {
        setRows(await carregarDadosOverlay(projectData.campeonato_id, fixedTemplate.id, overlayRow?.config))
        setOverlayContext({ campeonato })
      }
    } else {
      setRows(sampleRankingRows(Number(fixedTemplate.config_padrao.layout?.maxRows || 8)))
      setOverlayContext({})
    }

    setLoaded(true)
  }, [carregarPorStreamKey, fixedTemplate, streamKey])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  useEffect(() => {
    const atualizarViewport = () => {
      setViewport({
        width: window.innerWidth || 1920,
        height: window.innerHeight || 1080,
      })
    }

    atualizarViewport()
    window.addEventListener('resize', atualizarViewport)
    return () => window.removeEventListener('resize', atualizarViewport)
  }, [])

  useEffect(() => {
    if (!streamKey) return

    const onStorage = (event: StorageEvent) => {
      if (event.key === getActiveProjectStorageKey(streamKey)) carregar()
    }
    window.addEventListener('storage', onStorage)

    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(getActiveProjectChannelName(streamKey)) : null
    channel?.addEventListener('message', carregar)

    return () => {
      window.removeEventListener('storage', onStorage)
      channel?.close()
    }
  }, [carregar, streamKey])

  useEffect(() => {
    if (!overlay?.id) return

    const channel = supabase
      .channel(`fixed-overlay-${overlay.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_project_overlays', filter: `id=eq.${overlay.id}` }, (payload) => {
        if (payload.new) setOverlay((prev) => ({ ...(prev || {}), ...(payload.new as Partial<Overlay>) } as Overlay))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [overlay?.id])

  useEffect(() => {
    if (!project?.campeonato_id) return

    const channel = supabase
      .channel(`fixed-overlay-ranking-${project.campeonato_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados_jogos', filter: `campeonato_id=eq.${project.campeonato_id}` }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados_mvp', filter: `campeonato_id=eq.${project.campeonato_id}` }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_project_overlays', filter: `project_id=eq.${project.id}` }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campeonato_equipes', filter: `campeonato_id=eq.${project.campeonato_id}` }, carregar)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [project?.campeonato_id, project?.id, carregar])

  if (!loaded || (overlay && !overlay.visivel)) {
    return (
      <>
        <ObsTransparentPageStyle />
        <main className="h-screen w-screen overflow-hidden bg-transparent" />
      </>
    )
  }

  if (genericOnly) {
    return (
      <>
        <ObsTransparentPageStyle />
        <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent">
          <div className="border border-white/20 bg-black/35 px-16 py-10 text-center text-6xl font-black uppercase tracking-[0.08em] text-white">
            {fixedTemplate?.nome || String(overlayType || 'Overlay')}
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <ObsTransparentPageStyle />
      <main className="relative h-screen w-screen overflow-hidden bg-transparent">
        <div
          className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left overflow-hidden bg-transparent"
          style={{
            transform: `scale(${viewport.width / 1920}, ${viewport.height / 1080})`,
          }}
        >
          {overlayDefinition ? (
            <overlayDefinition.Render
              config={config}
              rows={fixedTemplate?.id === 'countdown' || fixedTemplate?.id === 'booyah' ? rows : rows.length > 0 ? rows : sampleRankingRows(Number(config.layout?.maxRows || 8))}
              templateId={fixedTemplate?.id || String(overlayType || '')}
              overlayName={fixedTemplate?.nome || String(overlayType || 'Overlay')}
              context={overlayContext}
            />
          ) : null}
        </div>
      </main>
    </>
  )
}

function ObsTransparentPageStyle() {
  return (
    <style jsx global>{`
      html,
      body {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        overflow: hidden !important;
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
      }

      body::before,
      body::after {
        display: none !important;
        background: transparent !important;
      }
    `}</style>
  )
}
