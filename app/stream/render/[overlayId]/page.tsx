'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RankingRow, defaultTabelaGeralConfig, mergeOverlayConfig, sampleRankingRows } from '@/lib/streamOverlay'
import { getStreamOverlayDefinition } from '@/app/components/stream/overlays/registry'
import { getFreeFireMapImage, normalizeFreeFireMapName } from '@/app/components/stream/overlays/mapas-freefire'
import type { StreamOverlayContext } from '@/app/components/stream/overlays/types'

type Overlay = {
  id: string
  project_id: string
  template_id: string
  nome: string
  config: any
  visivel: boolean
  stream_projects?: { id?: string | null; campeonato_id: string | null } | { id?: string | null; campeonato_id: string | null }[] | null
  stream_overlay_templates?: { config_padrao: any } | { config_padrao: any }[] | null
}

type CampeonatoEquipeRow = {
  id: string
  equipe_id?: string | null
  equipe_avulsa_id?: string | null
  nome_exibicao?: string | null
  grupo_id?: string | null
  equipes?: { nome?: string | null; tag?: string | null; logo_url?: string | null } | null
  equipe_avulsa?: { nome?: string | null; tag?: string | null; logo_url?: string | null } | null
}

type ResultadoRow = {
  id?: string | null
  jogo_id?: string | null
  partida_id?: string | null
  equipe_id?: string | null
  grupo_id?: string | null
  mapa?: string | null
  posicao?: number | null
  colocacao?: number | null
  abates?: number | null
  total_pontos?: number | null
  pontos_total?: number | null
  pontos?: number | null
  created_at?: string | null
}

type MvpRow = {
  id?: string | null
  jogo_id?: string | null
  partida_id?: string | null
  mapa?: string | null
  jogador_campeonato_id?: string | null
  perfil_jogo_id?: string | null
  campeonato_equipe_id?: string | null
  equipe_id?: string | null
  equipe_avulsa_id?: string | null
  jogador_avulso_id?: string | null
  nick_snapshot?: string | null
  uid_jogo_snapshot?: string | null
  abates?: number | null
}

type JogoRow = {
  id: string
  nome?: string | null
  nome_bloco?: string | null
  grupo_id?: string | null
  mapa?: string | null
  quantidade_partidas?: number | null
  quedas?: unknown[] | null
  data_hora?: string | null
  created_at?: string | null
}

function textoSeguro(valor: unknown, fallback = '') {
  const texto = String(valor || '').trim()
  return texto || fallback
}

function numero(valor: unknown) {
  const parsed = Number(valor || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function getEquipeNome(item?: CampeonatoEquipeRow | null) {
  if (!item) return ''
  return item.equipes?.nome || item.equipe_avulsa?.nome || item.nome_exibicao || `Equipe ${String(item.id || '').slice(0, 6)}`
}

function getEquipeTag(item?: CampeonatoEquipeRow | null) {
  return item?.equipes?.tag || item?.equipe_avulsa?.tag || null
}

function getEquipeLogo(item?: CampeonatoEquipeRow | null) {
  return item?.equipes?.logo_url || item?.equipe_avulsa?.logo_url || null
}

function jogoIdConfigurado(config?: Record<string, any> | null) {
  return textoSeguro(config?.data?.jogo_id || config?.jogo_id || config?.jogoId)
}

function mapaConfigurado(config?: Record<string, any> | null) {
  return textoSeguro(config?.data?.mapa || config?.mapa)
}

function grupoConfigurado(config?: Record<string, any> | null) {
  return textoSeguro(config?.data?.grupo_id || config?.grupo_id || config?.grupoId)
}

function getQuedaMapaNome(queda: unknown) {
  if (typeof queda === 'string') return textoSeguro(queda)
  if (queda && typeof queda === 'object') {
    const item = queda as Record<string, unknown>
    return textoSeguro(item.mapa) || textoSeguro(item.nome) || textoSeguro(item.name) || textoSeguro(item.label)
  }
  return textoSeguro(queda)
}

function getResultadoMapaKey(row: ResultadoRow) {
  return normalizeFreeFireMapName(row.mapa)
}

function resultadosAoVivo(config?: Record<string, any> | null): ResultadoRow[] {
  const live = config?.__liveResults
  if (!Array.isArray(live?.rows)) return []
  const mapa = textoSeguro(live?.mapa)
  const jogoId = textoSeguro(live?.jogo_id)
  return live.rows.map((row: any) => ({
    id: row.id,
    jogo_id: textoSeguro(row.jogo_id || jogoId) || null,
    partida_id: textoSeguro(row.partida_id) || null,
    equipe_id: textoSeguro(row.equipe_id),
    grupo_id: textoSeguro(row.grupo_id) || null,
    mapa: textoSeguro(row.mapa || mapa) || null,
    posicao: numero(row.posicao ?? row.colocacao),
    colocacao: numero(row.colocacao ?? row.posicao),
    abates: numero(row.abates),
    pontos: numero(row.pontos ?? row.total_pontos ?? row.pontos_total),
    total_pontos: numero(row.total_pontos ?? row.pontos ?? row.pontos_total),
    pontos_total: numero(row.pontos_total ?? row.pontos ?? row.total_pontos),
    created_at: textoSeguro(live.updated_at || row.created_at) || null,
  })).filter((row: ResultadoRow) => textoSeguro(row.equipe_id))
}

async function carregarBaseCampeonato(campeonatoId: string) {
  const [{ data: equipes }, { data: grupos }, { data: jogos }, { data: campeonato }] = await Promise.all([
    supabase.from('campeonato_equipes').select(`
      id,
      equipe_id,
      equipe_avulsa_id,
      nome_exibicao,
      grupo_id,
      equipes ( nome, tag, logo_url ),
      equipe_avulsa:equipes_avulsas_campeonato ( nome, tag, logo_url )
    `).eq('campeonato_id', campeonatoId).order('created_at', { ascending: true }),
    supabase.from('campeonato_grupos').select('id, nome').eq('campeonato_id', campeonatoId),
    supabase.from('jogos').select('id, nome, nome_bloco, grupo_id, mapa, quantidade_partidas, quedas, data_hora, created_at').eq('campeonato_id', campeonatoId).order('created_at', { ascending: false }),
    supabase.from('campeonatos').select('id, nome, logo_url, banner_url').eq('id', campeonatoId).maybeSingle(),
  ])

  const equipesLista = (equipes || []) as CampeonatoEquipeRow[]
  const gruposMap = new Map(((grupos || []) as any[]).map((grupo) => [textoSeguro(grupo.id), textoSeguro(grupo.nome, '-')]))
  const publicToCampeonato = new Map<string, string>()
  equipesLista.forEach((equipe) => {
    ;[equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean).forEach((ref) => publicToCampeonato.set(ref, equipe.id))
  })
  const equipesMap = new Map(equipesLista.map((equipe) => [equipe.id, equipe]))

  return { equipesLista, equipesMap, gruposMap, publicToCampeonato, jogosLista: (jogos || []) as JogoRow[], campeonato: campeonato as any }
}

function escolherJogo(jogos: JogoRow[], resultados: ResultadoRow[], config?: Record<string, any> | null) {
  const wanted = jogoIdConfigurado(config)
  if (wanted) return jogos.find((jogo) => jogo.id === wanted) || null
  const jogoComResultado = [...resultados].reverse().map((resultado) => textoSeguro(resultado.jogo_id)).find(Boolean)
  if (jogoComResultado) return jogos.find((jogo) => jogo.id === jogoComResultado) || null
  return jogos[0] || null
}

function montarRowsEquipes(equipesLista: CampeonatoEquipeRow[], gruposMap: Map<string, string>, publicToCampeonato: Map<string, string>, resultados: ResultadoRow[]) {
  const statsMap = new Map<string, { quedas: number; booyahs: number; kills: number; pontos: number; grupoId: string | null; posicao: number | null }>()
  resultados.forEach((resultado) => {
    const ref = textoSeguro(resultado.equipe_id)
    const id = publicToCampeonato.get(ref) || ref
    if (!id) return
    const atual = statsMap.get(id) || { quedas: 0, booyahs: 0, kills: 0, pontos: 0, grupoId: null, posicao: null }
    atual.quedas += 1
    atual.kills += numero(resultado.abates)
    atual.pontos += numero(resultado.total_pontos ?? resultado.pontos_total ?? resultado.pontos)
    const pos = numero(resultado.posicao ?? resultado.colocacao)
    if (pos === 1) atual.booyahs += 1
    if (pos && (atual.posicao == null || pos < atual.posicao)) atual.posicao = pos
    if (!atual.grupoId && resultado.grupo_id) atual.grupoId = textoSeguro(resultado.grupo_id)
    statsMap.set(id, atual)
  })

  return equipesLista.map((equipe) => {
    const stats = statsMap.get(equipe.id) || { quedas: 0, booyahs: 0, kills: 0, pontos: 0, grupoId: null, posicao: null }
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
      variacao: null,
    }
  }).filter((row) => row.quedas > 0 || row.pontos > 0).sort((a, b) => b.pontos - a.pontos || b.booyahs - a.booyahs || b.kills - a.kills || a.nome.localeCompare(b.nome, 'pt-BR'))
}

async function montarRowsTabelaGeral(campeonatoId: string): Promise<RankingRow[]> {
  const { data } = await supabase.from('classificacao_geral').select('*').eq('campeonato_id', campeonatoId)
  return ((data || []) as any[]).map((row) => ({
    id: textoSeguro(row.equipe_id),
    nome: textoSeguro(row.nome, 'Equipe'),
    tag: null,
    logo: textoSeguro(row.avatar_url) || null,
    grupo: textoSeguro(row.grupo, '-'),
    quedas: numero(row.partidas),
    booyahs: numero(row.booyahs),
    kills: numero(row.total_abates),
    pontos: numero(row.total_pontos),
    variacao: null,
  })).sort((a, b) => b.pontos - a.pontos || b.booyahs - a.booyahs || b.kills - a.kills || a.nome.localeCompare(b.nome, 'pt-BR'))
}

async function montarRowsMvp(rows: MvpRow[], equipesLista: CampeonatoEquipeRow[], gruposMap: Map<string, string>): Promise<RankingRow[]> {
  const equipesMap = new Map<string, CampeonatoEquipeRow>()
  equipesLista.forEach((equipe) => {
    ;[equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean).forEach((ref) => equipesMap.set(ref, equipe))
  })

  const jogadorCampeonatoIds = Array.from(new Set(rows.map((row) => textoSeguro(row.jogador_campeonato_id)).filter(Boolean)))
  const { data: jogadoresCampeonatoRows } = jogadorCampeonatoIds.length > 0
    ? await supabase.from('jogadores_campeonato').select('id, perfil_jogo_id, equipe_id, campeonato_equipe_id, equipe_avulsa_id, jogador_avulso_id').in('id', jogadorCampeonatoIds)
    : { data: [] }

  const jcMap = new Map<string, any>(((jogadoresCampeonatoRows || []) as any[]).map((row) => [String(row.id), row]))
  const jogadorAvulsoIds = Array.from(new Set([
    ...rows.map((row) => textoSeguro(row.jogador_avulso_id)),
    ...((jogadoresCampeonatoRows || []) as any[]).map((row) => textoSeguro(row.jogador_avulso_id)),
  ].filter(Boolean)))
  const { data: avulsosRows } = jogadorAvulsoIds.length > 0
    ? await supabase.from('jogadores_avulsos_campeonato').select('id, nick, uid_jogo, foto_url, equipe_id, equipe_avulsa_id').in('id', jogadorAvulsoIds)
    : { data: [] }
  const avulsosMap = new Map<string, any>(((avulsosRows || []) as any[]).map((row) => [String(row.id), row]))

  const perfilIds = Array.from(new Set(rows.map((row) => {
    const jc = row.jogador_campeonato_id ? jcMap.get(String(row.jogador_campeonato_id)) : null
    return textoSeguro(row.perfil_jogo_id || jc?.perfil_jogo_id)
  }).filter(Boolean)))
  const { data: perfisRows } = perfilIds.length > 0
    ? await supabase.from('perfis_jogo').select('id, nick, uid_jogo, foto_capa').in('id', perfilIds)
    : { data: [] }
  const perfisMap = new Map<string, any>(((perfisRows || []) as any[]).map((row) => [String(row.id), row]))

  const acumulado = new Map<string, RankingRow & { partidasSet: Set<string> }>()
  rows.forEach((row) => {
    const jc = row.jogador_campeonato_id ? jcMap.get(String(row.jogador_campeonato_id)) : null
    const avulso = textoSeguro(row.jogador_avulso_id || jc?.jogador_avulso_id) ? avulsosMap.get(textoSeguro(row.jogador_avulso_id || jc?.jogador_avulso_id)) : null
    const perfilId = textoSeguro(row.perfil_jogo_id || jc?.perfil_jogo_id)
    const perfil = perfilId ? perfisMap.get(perfilId) : null
    const nome = textoSeguro(row.nick_snapshot || avulso?.nick || perfil?.nick || row.uid_jogo_snapshot || avulso?.uid_jogo, 'SEM NICK')
    const equipeId = textoSeguro(row.campeonato_equipe_id || jc?.campeonato_equipe_id || row.equipe_id || jc?.equipe_id || avulso?.equipe_id || row.equipe_avulsa_id || jc?.equipe_avulsa_id || avulso?.equipe_avulsa_id)
    const equipe = equipeId ? equipesMap.get(equipeId) : null
    const key = textoSeguro(row.jogador_campeonato_id || perfilId || row.jogador_avulso_id || row.uid_jogo_snapshot || nome) + `::${equipeId}`
    if (!key.trim()) return
    const atual = acumulado.get(key) || {
      id: key,
      nome,
      tag: equipe ? getEquipeTag(equipe) : null,
      logo: equipe ? getEquipeLogo(equipe) : null,
      playerPhoto: textoSeguro(perfil?.foto_capa || avulso?.foto_url) || null,
      grupo: equipe?.grupo_id ? gruposMap.get(textoSeguro(equipe.grupo_id)) || '-' : '-',
      quedas: 0,
      booyahs: 0,
      kills: 0,
      pontos: 0,
      variacao: null,
      partidasSet: new Set<string>(),
    }
    atual.kills += numero(row.abates)
    atual.pontos = atual.kills
    const partidaKey = textoSeguro(row.partida_id || `${row.jogo_id || ''}:${row.mapa || ''}`)
    if (partidaKey) atual.partidasSet.add(partidaKey)
    atual.quedas = atual.partidasSet.size
    acumulado.set(key, atual)
  })

  return Array.from(acumulado.values()).map((item) => {
    const { partidasSet: _partidasSet, ...row } = item
    void _partidasSet
    return row
  }).sort((a, b) => b.kills - a.kills || b.quedas - a.quedas || a.nome.localeCompare(b.nome, 'pt-BR'))
}

function montarRowsBooyahsDia(jogo: JogoRow | null, resultados: ResultadoRow[], equipesLista: CampeonatoEquipeRow[], publicToCampeonato: Map<string, string>) {
  const equipesMap = new Map(equipesLista.map((equipe) => [equipe.id, equipe]))
  const mapasDoJogo = Array.isArray(jogo?.quedas) ? jogo.quedas.map((mapa) => getQuedaMapaNome(mapa)).filter(Boolean) : []
  const quantidade = mapasDoJogo.length > 0 ? mapasDoJogo.length : Math.max(Number(jogo?.quantidade_partidas || 0), 1)
  const fallbackMapas = ['Bermuda', 'Purgatorio', 'Kalahari', 'Alpine', 'Nova Terra', 'Solara']

  return Array.from({ length: quantidade }, (_, index) => {
    const mapaNome = mapasDoJogo[index] || fallbackMapas[index % fallbackMapas.length] || `Queda ${index + 1}`
    const mapaKey = normalizeFreeFireMapName(mapaNome)
    const resultadosDaQueda = resultados.filter((row) => (!jogo?.id || textoSeguro(row.jogo_id) === jogo.id) && getResultadoMapaKey(row) === mapaKey)
    const vencedor = resultadosDaQueda.find((row) => numero(row.posicao ?? row.colocacao) === 1)
      || [...resultadosDaQueda].sort((a, b) => numero(b.total_pontos ?? b.pontos_total) - numero(a.total_pontos ?? a.pontos_total))[0]
    const equipeRef = textoSeguro(vencedor?.equipe_id)
    const equipe = equipesMap.get(publicToCampeonato.get(equipeRef) || equipeRef)
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

async function carregarDadosOverlay(campeonatoId: string, templateId: string, config?: Record<string, any> | null): Promise<{ rows: RankingRow[]; context: StreamOverlayContext }> {
  const base = await carregarBaseCampeonato(campeonatoId)
  const [{ data: resultadosData }, { data: mvpData }] = await Promise.all([
    supabase.from('resultados_jogos').select('id, campeonato_id, fase_id, jogo_id, partida_id, equipe_id, grupo_id, mapa, posicao, abates, total_pontos, created_at').eq('campeonato_id', campeonatoId),
    supabase.from('resultados_mvp').select('id, campeonato_id, fase_id, jogo_id, partida_id, mapa, jogador_campeonato_id, jogador_avulso_id, perfil_jogo_id, campeonato_equipe_id, equipe_id, equipe_avulsa_id, nick_snapshot, uid_jogo_snapshot, abates').eq('campeonato_id', campeonatoId),
  ])
  const resultados = [...((resultadosData || []) as ResultadoRow[]), ...resultadosAoVivo(config)]
  const mvpRows = (mvpData || []) as MvpRow[]
  const jogo = escolherJogo(base.jogosLista, resultados, config)
  const mapaAlvo = mapaConfigurado(config) || getQuedaMapaNome(Array.isArray(jogo?.quedas) ? jogo?.quedas?.[0] : null) || textoSeguro(jogo?.mapa)
  const grupoAlvo = grupoConfigurado(config) || textoSeguro(jogo?.grupo_id)
  const lowerTemplate = String(templateId || '').toLowerCase()
  const context: StreamOverlayContext = {
    campeonato: base.campeonato || null,
    jogo: jogo ? { id: jogo.id, nome: jogo.nome, nome_bloco: jogo.nome_bloco, quantidade_partidas: jogo.quantidade_partidas, data_hora: jogo.data_hora } : null,
    mapas: Array.isArray(jogo?.quedas) ? jogo.quedas.map((mapa) => getQuedaMapaNome(mapa)).filter(Boolean) : [],
    quantidadePartidas: Number(jogo?.quantidade_partidas || (Array.isArray(jogo?.quedas) ? jogo?.quedas.length : 0) || 0),
  }

  if (lowerTemplate === 'countdown') {
    const rows = base.equipesLista.filter((equipe) => !grupoAlvo || textoSeguro(equipe.grupo_id) === grupoAlvo).map((equipe) => ({
      id: equipe.id,
      nome: getEquipeNome(equipe),
      tag: getEquipeTag(equipe),
      logo: getEquipeLogo(equipe),
      grupo: equipe.grupo_id ? base.gruposMap.get(textoSeguro(equipe.grupo_id)) || '-' : '-',
      quedas: 0,
      booyahs: 0,
      kills: 0,
      pontos: 0,
    }))
    return { rows, context }
  }

  if (lowerTemplate === 'tabela-geral') return { rows: await montarRowsTabelaGeral(campeonatoId), context }
  if (['tabela-dia', 'tabela-do-dia'].includes(lowerTemplate)) {
    return { rows: montarRowsEquipes(base.equipesLista, base.gruposMap, base.publicToCampeonato, resultados.filter((row) => !jogo?.id || textoSeguro(row.jogo_id) === jogo.id)), context }
  }
  if (['tabela-queda', 'tabela-da-queda'].includes(lowerTemplate)) {
    return { rows: montarRowsEquipes(base.equipesLista, base.gruposMap, base.publicToCampeonato, resultados.filter((row) => (!jogo?.id || textoSeguro(row.jogo_id) === jogo.id) && (!mapaAlvo || normalizeFreeFireMapName(row.mapa) === normalizeFreeFireMapName(mapaAlvo)))), context }
  }
  if (['booyahs-dia', 'booyahs-do-dia'].includes(lowerTemplate) || (lowerTemplate === 'booyah' && config?.booyahsDia)) {
    return { rows: montarRowsBooyahsDia(jogo, resultados, base.equipesLista, base.publicToCampeonato), context }
  }
  if (lowerTemplate === 'booyah') {
    const rows = montarRowsEquipes(base.equipesLista, base.gruposMap, base.publicToCampeonato, resultados.filter((row) => (!jogo?.id || textoSeguro(row.jogo_id) === jogo.id) && (!mapaAlvo || normalizeFreeFireMapName(row.mapa) === normalizeFreeFireMapName(mapaAlvo))))
    return { rows: rows.filter((row) => row.booyahs > 0).slice(0, 1), context }
  }
  if (['mvp-queda', 'mvp-da-queda'].includes(lowerTemplate)) {
    return { rows: await montarRowsMvp(mvpRows.filter((row) => (!jogo?.id || textoSeguro(row.jogo_id) === jogo.id) && (!mapaAlvo || normalizeFreeFireMapName(row.mapa) === normalizeFreeFireMapName(mapaAlvo))), base.equipesLista, base.gruposMap), context }
  }
  if (['mvp-dia', 'mvp-do-dia'].includes(lowerTemplate)) {
    return { rows: await montarRowsMvp(mvpRows.filter((row) => !jogo?.id || textoSeguro(row.jogo_id) === jogo.id), base.equipesLista, base.gruposMap), context }
  }
  if (lowerTemplate === 'mvp-geral') return { rows: await montarRowsMvp(mvpRows, base.equipesLista, base.gruposMap), context }
  if (['tela-espera', 'tela-de-espera'].includes(lowerTemplate)) {
    return { rows: base.equipesLista.map((equipe) => ({ id: equipe.id, nome: getEquipeNome(equipe), tag: getEquipeTag(equipe), logo: getEquipeLogo(equipe), grupo: equipe.grupo_id ? base.gruposMap.get(textoSeguro(equipe.grupo_id)) || '-' : '-', quedas: 0, booyahs: 0, kills: 0, pontos: 0 })), context }
  }

  return { rows: montarRowsEquipes(base.equipesLista, base.gruposMap, base.publicToCampeonato, resultados), context }
}

export default function OverlayRenderPage() {
  const params = useParams<{ overlayId: string }>()
  const overlayId = params?.overlayId
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [rows, setRows] = useState<RankingRow[]>([])
  const [overlayContext, setOverlayContext] = useState<StreamOverlayContext>({})

  const project = firstRelation(overlay?.stream_projects)
  const campeonatoId = project?.campeonato_id || null
  const template = firstRelation(overlay?.stream_overlay_templates)
  const config = useMemo(() => mergeOverlayConfig(defaultTabelaGeralConfig, mergeOverlayConfig(template?.config_padrao || {}, overlay?.config || {})), [overlay, template])
  const overlayDefinition = getStreamOverlayDefinition(overlay?.template_id, config as any)
  const RenderOverlay = overlayDefinition?.Render

  const carregarOverlay = useCallback(async () => {
    if (!overlayId) return
    const { data } = await supabase.from('stream_project_overlays').select(`
      id,
      project_id,
      template_id,
      nome,
      config,
      visivel,
      stream_projects ( id, campeonato_id ),
      stream_overlay_templates ( config_padrao )
    `).eq('id', overlayId).maybeSingle()
    setOverlay((data as unknown as Overlay) || null)
  }, [overlayId])

  const carregarRanking = useCallback(async () => {
    if (!campeonatoId || !overlay?.template_id) return
    const data = await carregarDadosOverlay(campeonatoId, overlay.template_id, config as any)
    setRows(data.rows)
    setOverlayContext(data.context)
  }, [campeonatoId, overlay?.template_id, config])

  useEffect(() => { carregarOverlay() }, [carregarOverlay])
  useEffect(() => { carregarRanking() }, [carregarRanking])

  useEffect(() => {
    if (!overlay?.id) return
    const channel = supabase.channel(`overlay-render-${overlay.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_project_overlays', filter: `id=eq.${overlay.id}` }, (payload) => {
        if (payload.new) setOverlay((prev) => ({ ...(prev || {}), ...(payload.new as any) } as Overlay))
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [overlay?.id])

  useEffect(() => {
    if (!campeonatoId) return
    const channel = supabase.channel(`overlay-ranking-${campeonatoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados_jogos', filter: `campeonato_id=eq.${campeonatoId}` }, carregarRanking)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados_mvp', filter: `campeonato_id=eq.${campeonatoId}` }, carregarRanking)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_live_resultados_jogos', filter: `campeonato_id=eq.${campeonatoId}` }, carregarRanking)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campeonato_equipes', filter: `campeonato_id=eq.${campeonatoId}` }, carregarRanking)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [campeonatoId, carregarRanking])

  if (!overlay || !overlay.visivel) {
    return (<><ObsTransparentPageStyle /><main className="h-screen w-screen overflow-hidden bg-transparent" /></>)
  }

  return (
    <>
      <ObsTransparentPageStyle />
      <main className="relative h-[1080px] w-[1920px] overflow-hidden bg-transparent">
        {RenderOverlay ? <RenderOverlay config={config} rows={rows.length > 0 ? rows : sampleRankingRows(Number(config.layout?.maxRows || 8))} templateId={overlay.template_id} overlayName={overlay.nome} context={overlayContext} /> : null}
      </main>
    </>
  )
}

function ObsTransparentPageStyle() {
  return (
    <style jsx global>{`
      html,
      body {
        width: 1920px !important;
        height: 1080px !important;
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
