'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Columns3, Copy, Eye, EyeOff, ImageIcon, Loader2, MonitorUp, Move, Palette, Play, Plus, RefreshCw, Save, SlidersHorizontal, Table2, Trash2, Type } from 'lucide-react'
import { getStreamOverlayDefinition, streamOverlayDefinitions } from '@/app/components/stream/overlays/registry'
import { getFreeFireMapImage, normalizeFreeFireMapName } from '@/app/components/stream/overlays/mapas-freefire'
import {
  RankingRow,
  StreamOverlayBlock,
  TabelaGeralOverlay,
  defaultTabelaGeralColumnWidths,
  defaultTabelaGeralConfig,
  mergeOverlayConfig,
  sampleRankingRows,
  tabelaGeralColumnLabels,
} from '@/lib/streamOverlay'

type Template = {
  id: string
  nome: string
  categoria: string
  descricao: string | null
  config_padrao: any
  fixed?: boolean
}

type Overlay = {
  id: string
  project_id: string
  template_id: string
  nome: string
  config: any
  visivel: boolean
  ordem: number
}

type Projeto = {
  id: string
  nome: string
  stream_key: string
  campeonato_id: string | null
}

type CampeonatoInfo = {
  nome: string | null
  logo_url: string | null
}

type EditorAction = 'move' | 'content' | 'style' | 'table' | 'transition'
type CountdownBlock = 'timer' | 'equipes' | 'mapas'
type BooyahBlock = 'texto' | 'logo' | 'equipe'
type BooyahsDiaBlock = 'art' | 'cards'
type VisualStyleTarget = 'primary' | 'accent' | 'background' | 'rowBackground' | 'text' | 'headerText' | 'border' | 'columnBackground' | 'columnText' | 'rowHighlightBackground' | 'rowHighlightText'

const OVERLAY_EDITOR_FOCUS = new Set(['tabela-geral', 'mvp-geral', 'booyah', 'booyahs-do-dia'])

const blockLabels: Record<StreamOverlayBlock, string> = {
  image: 'Imagem',
  text: 'Texto',
  table: 'Overlay',
  infoImage: 'Imagem topo',
}

const countdownBlockLabels: Record<CountdownBlock, string> = {
  timer: 'Contador',
  equipes: 'Equipes',
  mapas: 'Mapas',
}

const countdownBlockPaths: Record<CountdownBlock, string> = {
  timer: 'countdown.timerBlock',
  equipes: 'countdown.equipesBlock',
  mapas: 'countdown.mapasBlock',
}

const countdownBlockFallbacks: Record<CountdownBlock, { x: number; y: number; w: number; h: number; scale: number; opacity: number }> = {
  timer: { x: 585, y: 110, w: 750, h: 360, scale: 100, opacity: 100 },
  equipes: { x: 95, y: 380, w: 760, h: 390, scale: 100, opacity: 100 },
  mapas: { x: 1120, y: 405, w: 620, h: 380, scale: 100, opacity: 100 },
}

const booyahBlockLabels: Record<BooyahBlock, string> = {
  texto: 'Texto',
  logo: 'Logo',
  equipe: 'Equipe',
}

const booyahsDiaBlockLabels: Record<BooyahsDiaBlock, string> = {
  art: 'Imagem',
  cards: 'Cards',
}

const booyahBlockPaths: Record<BooyahBlock, string> = {
  texto: 'booyah.textoBlock',
  logo: 'booyah.logoBlock',
  equipe: 'booyah.equipeBlock',
}

const booyahBlockFallbacks: Record<BooyahBlock, { x: number; y: number; w: number; h: number; scale: number; opacity: number }> = {
  texto: { x: 630, y: 330, w: 880, h: 190, scale: 100, opacity: 100 },
  logo: { x: 300, y: 360, w: 230, h: 230, scale: 100, opacity: 100 },
  equipe: { x: 620, y: 530, w: 760, h: 80, scale: 100, opacity: 100 },
}

function getCountdownNumber(blockConfig: any, primary: string, fallback: number, legacy?: string) {
  return Number(blockConfig?.[primary] ?? (legacy ? blockConfig?.[legacy] : undefined) ?? fallback)
}

const horizontalAlignOptions: [string, string][] = [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]
const gridAlignOptions: [string, string][] = [['start', 'Esquerda'], ['center', 'Centro'], ['end', 'Direita']]
const verticalAlignOptions: [string, string][] = [['top', 'Cima'], ['center', 'Centro'], ['bottom', 'Baixo']]
const objectPositionOptions: [string, string][] = [
  ['left top', 'Esq. cima'],
  ['center top', 'Centro cima'],
  ['right top', 'Dir. cima'],
  ['left center', 'Esq. meio'],
  ['center center', 'Centro'],
  ['right center', 'Dir. meio'],
  ['left bottom', 'Esq. baixo'],
  ['center bottom', 'Centro baixo'],
  ['right bottom', 'Dir. baixo'],
]
const shadowOptions: [string, string][] = [
  ['none', 'Sem sombra'],
  ['0 8px 20px rgba(0,0,0,0.28)', 'Leve'],
  ['0 16px 36px rgba(0,0,0,0.35)', 'Media'],
  ['0 24px 70px rgba(0,0,0,0.45)', 'Forte'],
]
const borderStyleOptions: [string, string][] = [
  ['none', 'Sem borda'],
  ['1px solid rgba(255,255,255,0.20)', 'Branca leve'],
  ['2px solid #ef4444', 'Vermelha'],
  ['2px solid #f6c453', 'Dourada'],
  ['2px dashed #ef4444', 'Tracejada'],
]

const transitionOptions: [string, string][] = [
  ['fade', 'Fade'],
  ['slide-up', 'Sobe'],
  ['slide-down', 'Desce'],
  ['slide-left', 'Esquerda'],
  ['slide-right', 'Direita'],
  ['zoom', 'Zoom'],
  ['flip', 'Flip'],
  ['wipe', 'Corte'],
  ['blur', 'Blur'],
  ['elastic', 'Elastic'],
]

const checkerboardStyle = {
  backgroundColor: '#ffffff',
  backgroundImage:
    'linear-gradient(45deg, #d7d7d7 25%, transparent 25%), linear-gradient(-45deg, #d7d7d7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d7d7d7 75%), linear-gradient(-45deg, transparent 75%, #d7d7d7 75%)',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  backgroundSize: '20px 20px',
}

const colorSwatches = [
  '#e60012',
  '#f6c453',
  '#101827',
  '#d8ab4f',
  '#ffffff',
  '#0ea5e9',
  '#22c55e',
  '#8b5cf6',
  '#f97316',
  '#020617',
  'rgba(255,255,255,0.88)',
  'rgba(8,13,22,0.92)',
]

const STREAM_ASSET_BUCKET = 'imagem_campeonatos'
const DATA_IMAGE_REGEX = /data:image\/[a-zA-Z0-9.+-]+;base64,[^"')\s]+/g
const tabelaGeralColumnKeys = Object.keys(tabelaGeralColumnLabels)

function extractColor(value?: string) {
  const text = String(value || '').trim()
  const hex = text.match(/#[0-9a-fA-F]{6}/)?.[0]
  return hex || '#ffffff'
}

function gradientValue(start: string, end: string, direction = '90deg') {
  return `linear-gradient(${direction}, ${start || '#ffffff'}, ${end || '#101827'})`
}

function imageBackgroundValue(url: string) {
  return `url("${url}")`
}

function backgroundEditorMode(value?: string) {
  const text = String(value || '').trim()
  if (!text || text === 'transparent') return 'none'
  if (text.startsWith('url(')) return 'image'
  if (text.startsWith('linear-gradient')) return 'gradient'
  return 'solid'
}

function gradientEditorParts(value?: string) {
  const text = String(value || '')
  const colors = text.match(/#[0-9a-fA-F]{6}|rgba?\([^)]+\)/g) || []
  const direction = text.match(/linear-gradient\(([^,]+),/)?.[1]?.trim() || '90deg'

  return {
    direction,
    start: colors[0] || '#ffffff',
    end: colors[1] || '#101827',
  }
}

function assetExtensao(fileName: string, mime?: string) {
  const fromName = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (fromName) return fromName
  if (mime?.includes('jpeg')) return 'jpg'
  if (mime?.includes('webp')) return 'webp'
  if (mime?.includes('gif')) return 'gif'
  return 'png'
}

function pastaSegura(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'asset'
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/data:([^;]+);/)?.[1] || 'image/png'
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new File([bytes], fileName, { type: mime })
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
  jogo_id?: string | null
  partida_id?: string | null
  equipe_id: string | null
  grupo_id?: string | null
  mapa?: string | null
  colocacao?: number | null
  posicao?: number | null
  abates?: number | null
  pontos_total?: number | null
  total_pontos?: number | null
  pontos?: number | null
  created_at?: string | null
}

type JogoRow = {
  id: string
  nome?: string | null
  nome_bloco?: string | null
  quantidade_partidas?: number | null
  quedas?: unknown[] | null
  created_at?: string | null
}

function textoSeguro(valor: unknown, fallback = '') {
  const texto = String(valor || '').trim()
  return texto || fallback
}

function numero(valor: unknown) {
  return Number(valor || 0)
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

function normalizarTemplateNome(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

function rankingSort(a: RankingRow, b: RankingRow) {
  return b.pontos - a.pontos || b.booyahs - a.booyahs || b.kills - a.kills || a.nome.localeCompare(b.nome, 'pt-BR')
}

function resultadoQuedaKey(resultado: ResultadoRow, index: number) {
  return textoSeguro(resultado.partida_id)
    || [textoSeguro(resultado.jogo_id), textoSeguro(resultado.mapa)].filter(Boolean).join(':')
    || textoSeguro(resultado.created_at)
    || textoSeguro(resultado.id)
    || `resultado-${index}`
}

function getResultadoMapaKey(resultado: ResultadoRow) {
  return normalizeFreeFireMapName(resultado.mapa)
}

function getQuedaMapaNome(queda: unknown) {
  if (typeof queda === 'string') return textoSeguro(queda)
  if (queda && typeof queda === 'object') {
    const item = queda as Record<string, unknown>
    return textoSeguro(item.mapa) || textoSeguro(item.nome) || textoSeguro(item.name) || textoSeguro(item.label)
  }
  return textoSeguro(queda)
}

function montarRowsBooyahsDiaEditor(jogo: JogoRow | null, resultados: ResultadoRow[], equipesLista: CampeonatoEquipeRow[]) {
  const equipesMap = new Map(equipesLista.map((equipe) => [equipe.id, equipe]))
  const publicToCampeonato = new Map<string, string>()
  equipesLista.forEach((equipe) => {
    const refs = [equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean)
    refs.forEach((ref) => publicToCampeonato.set(ref, equipe.id))
  })

  const mapasDoJogo = Array.isArray(jogo?.quedas) ? jogo.quedas.map((mapa) => getQuedaMapaNome(mapa)).filter(Boolean) : []
  const quantidade = mapasDoJogo.length > 0 ? mapasDoJogo.length : Math.max(Number(jogo?.quantidade_partidas || 0), 1)
  const fallbackMapas = ['Bermuda', 'Purgatorio', 'Kalahari', 'Alpine', 'Nova Terra', 'Solara']

  return Array.from({ length: quantidade }, (_, index) => {
    const mapaNome = mapasDoJogo[index] || fallbackMapas[index % fallbackMapas.length] || `Queda ${index + 1}`
    const mapaKey = normalizeFreeFireMapName(mapaNome)
    const resultadosDaQueda = resultados.filter((resultado) => {
      if (jogo?.id && textoSeguro(resultado.jogo_id) !== jogo.id) return false
      return getResultadoMapaKey(resultado) === mapaKey
    })
    const vencedor = resultadosDaQueda.find((resultado) => numero(resultado.colocacao ?? resultado.posicao) === 1)
      || [...resultadosDaQueda].sort((a, b) => numero(b.pontos ?? b.pontos_total ?? b.total_pontos) - numero(a.pontos ?? a.pontos_total ?? a.total_pontos))[0]
    const equipeRef = textoSeguro(vencedor?.equipe_id)
    const campeonatoEquipeId = publicToCampeonato.get(equipeRef) || equipeRef
    const equipe = campeonatoEquipeId ? equipesMap.get(campeonatoEquipeId) : null
    const mapa = getFreeFireMapImage(mapaNome)

    return {
      id: `${jogo?.id || 'preview'}-${index + 1}`,
      nome: equipe ? getEquipeNome(equipe) : '',
      tag: equipe ? getEquipeTag(equipe) : null,
      logo: equipe ? getEquipeLogo(equipe) : null,
      grupo: null,
      quedas: vencedor ? 1 : 0,
      booyahs: vencedor ? 1 : 0,
      kills: numero(vencedor?.abates),
      pontos: numero(vencedor?.pontos ?? vencedor?.pontos_total ?? vencedor?.total_pontos),
      mapa: mapa?.nome || mapaNome,
      mapaImagem: mapa?.url || null,
      quedaNumero: index + 1,
      concluida: Boolean(vencedor),
    }
  })
}

function montarRankingComVariacao(equipesLista: CampeonatoEquipeRow[], gruposMap: Map<string, string>, publicToCampeonato: Map<string, string>, resultados: ResultadoRow[]) {
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
      atual.pontos += numero(resultado.pontos ?? resultado.pontos_total ?? resultado.total_pontos)
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
      .sort(rankingSort)
  }

  const rankingAtual = montar(orderedResultados)
  const posicaoAnterior = new Map(montar(anteriores).map((row, index) => [row.id, index + 1]))

  return rankingAtual.map((row, index) => {
    const anterior = posicaoAnterior.get(row.id)
    return {
      ...row,
      variacao: anterior ? anterior - (index + 1) : 0,
    }
  })
}

async function carregarRankingTabelaGeral(campeonatoId: string): Promise<RankingRow[]> {
  const [{ data: equipes }, { data: grupos }, partidasRes, jogosRes] = await Promise.all([
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
    supabase.from('resultados_partidas_equipes').select('id, equipe_id, grupo_id, colocacao, abates, pontos_total, created_at').eq('campeonato_id', campeonatoId),
    supabase.from('resultados_jogos').select('id, jogo_id, partida_id, equipe_id, grupo_id, mapa, posicao, abates, total_pontos, created_at').eq('campeonato_id', campeonatoId),
  ])

  const equipesLista = (equipes || []) as CampeonatoEquipeRow[]
  const gruposMap = new Map(((grupos || []) as any[]).map((grupo) => [textoSeguro(grupo.id), textoSeguro(grupo.nome, '-')]))
  const resultadosPartidas = ((partidasRes.data || []) as ResultadoRow[]).map((row) => ({
    equipe_id: row.equipe_id,
    grupo_id: row.grupo_id,
    colocacao: row.colocacao,
    abates: row.abates,
    pontos: row.pontos_total,
    created_at: row.created_at,
    id: row.id,
  }))
  const resultadosJogos = ((jogosRes.data || []) as ResultadoRow[]).map((row) => ({
    id: row.id,
    jogo_id: row.jogo_id,
    partida_id: row.partida_id,
    equipe_id: row.equipe_id,
    grupo_id: row.grupo_id,
    mapa: row.mapa,
    colocacao: row.posicao,
    abates: row.abates,
    pontos: row.total_pontos,
    created_at: row.created_at,
  }))
  const resultados = resultadosPartidas.length > 0 ? resultadosPartidas : resultadosJogos
  const publicToCampeonato = new Map<string, string>()

  equipesLista.forEach((equipe) => {
    ;[equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean).forEach((ref) => publicToCampeonato.set(ref, equipe.id))
  })

  return montarRankingComVariacao(equipesLista, gruposMap, publicToCampeonato, resultados)
}

async function carregarRankingMvpEditor(campeonatoId: string): Promise<RankingRow[]> {
  const [{ data: equipes }, { data: grupos }, { data: resultados }] = await Promise.all([
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
      .from('resultados_mvp')
      .select('jogador_campeonato_id, perfil_jogo_id, equipe_id, campeonato_equipe_id, equipe_avulsa_id, nick_snapshot, uid_jogo_snapshot, abates, partida_id, jogo_id, mapa')
      .eq('campeonato_id', campeonatoId),
  ])

  const equipesLista = (equipes || []) as CampeonatoEquipeRow[]
  const gruposMap = new Map(((grupos || []) as any[]).map((grupo) => [textoSeguro(grupo.id), textoSeguro(grupo.nome, '-')]))
  const equipesMap = new Map<string, CampeonatoEquipeRow>()
  equipesLista.forEach((equipe) => {
    ;[equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean).forEach((ref) => equipesMap.set(ref, equipe))
  })
  const rows = (resultados || []) as any[]
  const jogadorIds = Array.from(new Set(rows.map((row) => textoSeguro(row.jogador_campeonato_id)).filter(Boolean)))
  const { data: jogadores } = jogadorIds.length > 0
    ? await supabase.from('jogadores_campeonato').select('id, perfil_jogo_id, equipe_id, campeonato_equipe_id, equipe_avulsa_id, jogador_avulso_id').in('id', jogadorIds)
    : { data: [] }
  const jogadoresMap = new Map(((jogadores || []) as any[]).map((row) => [String(row.id), row]))
  const avulsoIds = Array.from(new Set(((jogadores || []) as any[]).map((row) => textoSeguro(row.jogador_avulso_id)).filter(Boolean)))
  const { data: avulsos } = avulsoIds.length > 0
    ? await supabase.from('jogadores_avulsos_campeonato').select('id, nick, uid_jogo, foto_url, equipe_id, equipe_avulsa_id').in('id', avulsoIds)
    : { data: [] }
  const avulsosMap = new Map(((avulsos || []) as any[]).map((row) => [String(row.id), row]))
  const perfilIds = Array.from(new Set(rows.map((row) => {
    const jogador = row.jogador_campeonato_id ? jogadoresMap.get(String(row.jogador_campeonato_id)) : null
    return textoSeguro(row.perfil_jogo_id || jogador?.perfil_jogo_id)
  }).filter(Boolean)))
  const uids = Array.from(new Set(rows.map((row) => {
    const jogador = row.jogador_campeonato_id ? jogadoresMap.get(String(row.jogador_campeonato_id)) : null
    const avulso = jogador?.jogador_avulso_id ? avulsosMap.get(String(jogador.jogador_avulso_id)) : null
    const perfilId = textoSeguro(row.perfil_jogo_id || jogador?.perfil_jogo_id)
    return perfilId ? '' : textoSeguro(row.uid_jogo_snapshot || avulso?.uid_jogo)
  }).filter(Boolean)))
  const [{ data: perfis }, { data: perfisUid }] = await Promise.all([
    perfilIds.length > 0 ? supabase.from('perfis_jogo').select('id, nick, uid_jogo, foto_capa').in('id', perfilIds) : Promise.resolve({ data: [] }),
    uids.length > 0 ? supabase.from('perfis_jogo').select('id, nick, uid_jogo, foto_capa').in('uid_jogo', uids) : Promise.resolve({ data: [] }),
  ])
  const perfisMap = new Map(((perfis || []) as any[]).map((row) => [String(row.id), row]))
  const perfisUidMap = new Map(((perfisUid || []) as any[]).map((row) => [textoSeguro(row.uid_jogo), row]))
  const acumulado = new Map<string, RankingRow & { partidasSet: Set<string> }>()

  rows.forEach((row) => {
    const jogador = row.jogador_campeonato_id ? jogadoresMap.get(String(row.jogador_campeonato_id)) : null
    const avulso = jogador?.jogador_avulso_id ? avulsosMap.get(String(jogador.jogador_avulso_id)) : null
    const perfilId = textoSeguro(row.perfil_jogo_id || jogador?.perfil_jogo_id)
    const uid = textoSeguro(row.uid_jogo_snapshot || avulso?.uid_jogo)
    const perfil = perfilId ? perfisMap.get(perfilId) : null
    const perfilUid = !perfilId && uid ? perfisUidMap.get(uid) : null
    const equipeId = textoSeguro(row.campeonato_equipe_id || jogador?.campeonato_equipe_id || row.equipe_id || jogador?.equipe_id || avulso?.equipe_id || row.equipe_avulsa_id || jogador?.equipe_avulsa_id || avulso?.equipe_avulsa_id)
    const equipe = equipeId ? equipesMap.get(equipeId) : null
    const nome = textoSeguro(row.nick_snapshot || avulso?.nick || perfil?.nick || perfilUid?.nick || uid, 'SEM NICK')
    const playerPhoto = perfil?.foto_capa || perfilUid?.foto_capa || avulso?.foto_url || null
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
      variacao: 0,
      partidasSet: new Set<string>(),
    }
    atual.kills += numero(row.abates)
    atual.pontos = atual.kills
    if (!atual.playerPhoto && playerPhoto) atual.playerPhoto = playerPhoto
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
    .map((row, index) => ({ ...row, variacao: index % 3 === 0 ? 0 : index % 3 === 1 ? -1 : 1 }))
}

async function carregarBooyahsDiaPreview(campeonatoId: string) {
  const [{ data: equipes }, { data: resultados }, { data: jogos }] = await Promise.all([
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
    supabase
      .from('resultados_jogos')
      .select('id, jogo_id, partida_id, equipe_id, grupo_id, mapa, posicao, abates, total_pontos, created_at')
      .eq('campeonato_id', campeonatoId),
    supabase
      .from('jogos')
      .select('id, nome, nome_bloco, quantidade_partidas, quedas, created_at')
      .eq('campeonato_id', campeonatoId)
      .order('created_at', { ascending: false }),
  ])

  const equipesLista = (equipes || []) as CampeonatoEquipeRow[]
  const resultadosLista = (resultados || []) as ResultadoRow[]
  const jogosLista = (jogos || []) as JogoRow[]
  const jogo = jogosLista.find((item) => resultadosLista.some((row) => textoSeguro(row.jogo_id) === item.id)) || jogosLista[0] || null
  const rows = montarRowsBooyahsDiaEditor(jogo, resultadosLista, equipesLista)

  return {
    rows,
    context: {
      jogo,
      mapas: rows.map((row) => textoSeguro(row.mapa)).filter(Boolean),
      quantidadePartidas: rows.length,
    },
  }
}

export default function StreamOverlayEditorPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params?.projectId

  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [rankingRows, setRankingRows] = useState<RankingRow[]>([])
  const [mvpRankingRows, setMvpRankingRows] = useState<RankingRow[]>([])
  const [booyahsDiaRows, setBooyahsDiaRows] = useState<RankingRow[]>([])
  const [booyahsDiaContext, setBooyahsDiaContext] = useState<any>({})
  const [campeonatoInfo, setCampeonatoInfo] = useState<CampeonatoInfo | null>(null)
  const [isSiteAdmin, setIsSiteAdmin] = useState(false)
  const [overlayId, setOverlayId] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<StreamOverlayBlock>('table')
  const [activeAction, setActiveAction] = useState<EditorAction>('move')
  const [selectedCountdownBlock, setSelectedCountdownBlock] = useState<CountdownBlock>('timer')
  const [selectedBooyahBlock, setSelectedBooyahBlock] = useState<BooyahBlock>('texto')
  const [selectedBooyahsDiaBlock, setSelectedBooyahsDiaBlock] = useState<BooyahsDiaBlock>('cards')
  const [selectedColumn, setSelectedColumn] = useState('nome')
  const [selectedRow, setSelectedRow] = useState(1)
  const [selectedVisualStyle, setSelectedVisualStyle] = useState<VisualStyleTarget>('rowBackground')
  const [draftConfig, setDraftConfig] = useState<any | null>(null)
  const [temAlteracoesPendentes, setTemAlteracoesPendentes] = useState(false)
  const [previewScale, setPreviewScale] = useState(0.5)
  const historyRef = useRef<any[]>([])

  const origem = typeof window !== 'undefined' ? window.location.origin : ''

  const overlayAtual = useMemo(() => overlays.find((item) => item.id === overlayId) || overlays[0] || null, [overlays, overlayId])
  const templateAtual = useMemo(() => templates.find((item) => item.id === overlayAtual?.template_id) || null, [templates, overlayAtual])
  const configSalva = useMemo(() => mergeOverlayConfig(defaultTabelaGeralConfig, mergeOverlayConfig(templateAtual?.config_padrao || {}, overlayAtual?.config || {})), [templateAtual, overlayAtual])
  const config = draftConfig || configSalva
  const previewOverlayDefinition = getStreamOverlayDefinition(overlayAtual?.template_id)
  const PreviewOverlay = previewOverlayDefinition?.Render
  const CustomOverlayEditor = previewOverlayDefinition?.Editor
  const isTabelaOverlay = Boolean(overlayAtual?.template_id && ['tabela-geral', 'tabela-do-dia', 'tabela-da-queda', 'mvp-geral', 'mvp-do-dia', 'mvp-da-queda'].includes(overlayAtual.template_id))
  const isMvpGeralOverlay = overlayAtual?.template_id === 'mvp-geral' || Boolean(config.mvpGeral?.enabled)
  const isCountdownOverlay = overlayAtual?.template_id === 'countdown'
  const isBooyahsDiaOverlay = Boolean(config.booyahsDia || previewOverlayDefinition?.slug === 'booyahs-do-dia')
  const isBooyahOverlay = overlayAtual?.template_id === 'booyah' && !isBooyahsDiaOverlay
  const booyahsDiaConfig = (config.booyahsDia || {}) as any
  const booyahsDiaMode = String(booyahsDiaConfig.mode || 'cards')
  const selectedCountdownPath = countdownBlockPaths[selectedCountdownBlock]
  const selectedCountdownConfig = config.countdown?.[`${selectedCountdownBlock}Block`] || {}
  const selectedCountdownFallback = countdownBlockFallbacks[selectedCountdownBlock]
  const selectedBooyahPath = booyahBlockPaths[selectedBooyahBlock]
  const selectedBooyahConfig = config.booyah?.[`${selectedBooyahBlock}Block`] || {}
  const selectedBooyahFallback = booyahBlockFallbacks[selectedBooyahBlock]
  const renderUrl = overlayAtual
    ? previewOverlayDefinition && projeto?.stream_key
      ? `${origem}/stream/overlay/${projeto.stream_key}/${previewOverlayDefinition.slug}`
      : `${origem}/stream/render/${overlayAtual.id}`
    : ''
  const previewRows = useMemo(() => {
    if (isMvpGeralOverlay) return mvpRankingRows.length > 0 ? mvpRankingRows : sampleRankingRows(Number(config.mvpGeral?.tableMaxRows || config.layout?.maxRows || 8))
    if (!['booyah', 'booyahs-do-dia'].includes(String(overlayAtual?.template_id || ''))) return rankingRows.length > 0 ? rankingRows : sampleRankingRows(Number(config.layout?.maxRows || 12))
    if (booyahsDiaRows.length > 0) return booyahsDiaRows

    const mapas = ['Bermuda', 'Purgatorio', 'Alpine', 'Kalahari']
    const baseRows = rankingRows.length > 0 ? rankingRows : sampleRankingRows(mapas.length)
    return mapas.map((mapa, index) => ({
      ...(baseRows[index] || baseRows[0]),
      id: `preview-booyah-${index + 1}`,
      mapa,
      mapaImagem: getFreeFireMapImage(mapa)?.url || null,
      quedaNumero: index + 1,
      concluida: index < Math.min(4, baseRows.length),
    }))
  }, [booyahsDiaRows, config.layout?.maxRows, config.mvpGeral?.tableMaxRows, isMvpGeralOverlay, mvpRankingRows, overlayAtual?.template_id, rankingRows])
  const orderedColumnKeys = useMemo(() => {
    const savedOrder = ((config.columnsOrder || []) as string[]).filter((key) => tabelaGeralColumnKeys.includes(key))
    const orderedKeys = [...savedOrder]
    tabelaGeralColumnKeys.forEach((key) => {
      if (orderedKeys.includes(key)) return
      const defaultIndex = tabelaGeralColumnKeys.indexOf(key)
      const insertAt = orderedKeys.findIndex((existingKey) => tabelaGeralColumnKeys.indexOf(existingKey) > defaultIndex)
      if (insertAt === -1) orderedKeys.push(key)
      else orderedKeys.splice(insertAt, 0, key)
    })
    return orderedKeys
  }, [config.columnsOrder])
  const selectedColumnIndex = Math.max(0, orderedColumnKeys.indexOf(selectedColumn))
  const selectedColumnWidth = Number(config.columnWidths?.[selectedColumn] ?? defaultTabelaGeralColumnWidths[selectedColumn] ?? 1)
  useEffect(() => {
    setDraftConfig(configSalva)
    setTemAlteracoesPendentes(false)
    historyRef.current = []
  }, [overlayAtual?.id, configSalva])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
      const previous = historyRef.current.pop()
      if (!previous) return

      event.preventDefault()
      setDraftConfig(previous)
      setTemAlteracoesPendentes(true)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const carregar = useCallback(async () => {
    if (!projectId) return
    setLoading(true)

    const [projRes, tplRes, overlayRes, authRes] = await Promise.all([
      supabase.from('stream_projects').select('id, nome, stream_key, campeonato_id').eq('id', projectId).maybeSingle(),
      supabase.from('stream_overlay_templates').select('id, nome, categoria, descricao, config_padrao').eq('ativo', true).order('nome'),
      supabase.from('stream_project_overlays').select('id, project_id, template_id, nome, config, visivel, ordem').eq('project_id', projectId).order('ordem'),
      supabase.auth.getUser(),
    ])

    if (projRes.data) setProjeto(projRes.data as Projeto)
    const officialTemplates = streamOverlayDefinitions
      .filter((template) => OVERLAY_EDITOR_FOCUS.has(template.id))
      .map((template) => ({
        id: template.id,
        nome: template.nome,
        categoria: template.categoria,
        descricao: template.descricao || null,
        config_padrao: template.config_padrao || defaultTabelaGeralConfig,
        fixed: true,
      }))
    let adminAtivo = false

    if (authRes.data.user?.id) {
      const { data: adminData } = await supabase
        .from('site_administradores')
        .select('id')
        .eq('user_id', authRes.data.user.id)
        .eq('ativo', true)
        .limit(1)

      adminAtivo = Boolean(adminData?.length)
      setIsSiteAdmin(adminAtivo)
    }

    const fixedTemplateNames = new Set(officialTemplates.map((fixed) => normalizarTemplateNome(fixed.nome)))
    const dbTemplates = ((tplRes.data || []) as Template[]).filter((template) => {
      if (!OVERLAY_EDITOR_FOCUS.has(template.id)) return false
      if (officialTemplates.some((fixed) => fixed.id === template.id)) return false
      return !fixedTemplateNames.has(normalizarTemplateNome(template.nome))
    })
    setTemplates(adminAtivo ? [...officialTemplates, ...dbTemplates] : officialTemplates)

    const lista = ((overlayRes.data || []) as Overlay[]).filter((overlay) => OVERLAY_EDITOR_FOCUS.has(overlay.template_id))

    // Nao cria overlays automaticamente ao abrir o editor.
    // O projeto deve começar vazio e o dono adiciona apenas as overlays que quiser usar.

    setOverlays(lista)
    if (!overlayId && lista[0]) setOverlayId(lista[0].id)
    setLoading(false)
  }, [projectId, overlayId])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!projeto?.campeonato_id) {
      setRankingRows([])
      setMvpRankingRows([])
      setBooyahsDiaRows([])
      setBooyahsDiaContext({})
      setCampeonatoInfo(null)
      return
    }

    async function carregarRanking() {
      if (!projeto?.campeonato_id) return
      const [ranking, mvpRanking, booyahsDia, campeonatoRes] = await Promise.all([
        carregarRankingTabelaGeral(projeto.campeonato_id),
        carregarRankingMvpEditor(projeto.campeonato_id),
        carregarBooyahsDiaPreview(projeto.campeonato_id),
        supabase.from('campeonatos').select('nome, logo_url').eq('id', projeto.campeonato_id).maybeSingle(),
      ])
      setRankingRows(ranking)
      setMvpRankingRows(mvpRanking)
      setBooyahsDiaRows(booyahsDia.rows)
      setBooyahsDiaContext(booyahsDia.context)
      setCampeonatoInfo((campeonatoRes.data as CampeonatoInfo) || null)
    }

    carregarRanking()
  }, [projeto?.campeonato_id])

  async function criarOverlay(template: Template) {
    if (!projectId) return
    const existente = overlays.find((overlay) => overlay.template_id === template.id)
    if (existente) {
      setOverlayId(existente.id)
      alert('Esse template ja foi adicionado neste projeto.')
      return
    }

    setSalvando(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const response = await fetch(`/api/stream/projects/${encodeURIComponent(projectId)}/overlays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ templateId: template.id }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result?.error || 'Nao consegui criar overlay.')
      }

      if (result?.overlay?.id) {
        setOverlayId(result.overlay.id)
      }
    } catch (error: any) {
      setSalvando(false)
      alert(`Erro ao criar overlay: ${error?.message || 'template nao sincronizado'}`)
      return
    }

    setSalvando(false)
    await carregar()
  }

  async function removerOverlay(overlay: Overlay) {
    if (!confirm(`Remover overlay "${overlay.nome}" deste projeto?`)) return

    setSalvando(true)
    const { error } = await supabase
      .from('stream_project_overlays')
      .delete()
      .eq('id', overlay.id)

    setSalvando(false)

    if (error) {
      alert(`Erro ao remover overlay: ${error.message}`)
      return
    }

    setOverlays((prev) => {
      const novaLista = prev.filter((item) => item.id !== overlay.id)
      if (overlayId === overlay.id) setOverlayId(novaLista[0]?.id || '')
      return novaLista
    })
  }

  async function uploadStreamAsset(file: File, pasta: string) {
    if (!overlayAtual) throw new Error('Selecione uma overlay antes de enviar imagem.')

    const extensao = assetExtensao(file.name, file.type)
    const pastaAsset = pastaSegura(pasta)
    const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`
    const caminho = `stream-overlays/${overlayAtual.id}/${pastaAsset}/${nomeArquivo}`

    const { data, error } = await supabase.storage
      .from(STREAM_ASSET_BUCKET)
      .upload(caminho, file, { upsert: false, contentType: file.type || undefined })

    if (error) throw error

    const { data: publicData } = supabase.storage
      .from(STREAM_ASSET_BUCKET)
      .getPublicUrl(data.path)

    return publicData.publicUrl
  }

  async function migrarInlineAssetsParaStorage(valor: any, caminho = 'asset'): Promise<any> {
    if (typeof valor === 'string') {
      const matches = Array.from(new Set(valor.match(DATA_IMAGE_REGEX) || []))
      if (!matches.length) return valor

      let texto = valor

      for (const dataUrl of matches) {
        const mime = dataUrl.match(/data:([^;]+);/)?.[1] || 'image/png'
        const extensao = assetExtensao('', mime)
        const file = dataUrlToFile(dataUrl, `${pastaSegura(caminho)}.${extensao}`)
        const publicUrl = await uploadStreamAsset(file, caminho)
        texto = texto.split(dataUrl).join(publicUrl)
      }

      return texto
    }

    if (Array.isArray(valor)) {
      return Promise.all(valor.map((item, index) => migrarInlineAssetsParaStorage(item, `${caminho}-${index}`)))
    }

    if (valor && typeof valor === 'object') {
      const novo: any = {}
      for (const [chave, item] of Object.entries(valor)) {
        novo[chave] = await migrarInlineAssetsParaStorage(item, `${caminho}-${chave}`)
      }
      return novo
    }

    return valor
  }

  async function salvarConfig(novoConfig: any) {
    if (!overlayAtual || !projectId) return

    setSalvando(true)
    try {
      const configLeve = await migrarInlineAssetsParaStorage(novoConfig, 'config')
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const response = await fetch(`/api/stream/projects/${encodeURIComponent(projectId)}/overlays/${encodeURIComponent(overlayAtual.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ config: configLeve }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result?.overlay?.id) {
        alert(`Erro ao salvar: ${result?.error || 'o banco nao confirmou a atualizacao da overlay.'}`)
        return
      }

      const configConfirmada = result.overlay.config || configLeve
      setOverlays((prev) => prev.map((item) => item.id === overlayAtual.id ? { ...item, ...result.overlay, config: configConfirmada } : item))
      setDraftConfig(configConfirmada)
      setTemAlteracoesPendentes(false)
    } catch (error) {
      alert(`Erro ao salvar: ${error instanceof Error ? error.message : 'falha ao salvar no banco'}`)
    } finally {
      setSalvando(false)
    }
  }

  async function validarDimensoesImagem(file: File) {
    const objectUrl = URL.createObjectURL(file)

    try {
      return await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
        image.onerror = reject
        image.src = objectUrl
      })
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  async function salvarImagemNoCampo(path: string, file: File, pasta: string, formatarUrl: (url: string) => string = (url) => url) {
    try {
      setSalvando(true)
      const publicUrl = await uploadStreamAsset(file, pasta)
      await atualizarCampo(path, formatarUrl(publicUrl))
    } catch (error) {
      alert(`Erro ao enviar imagem: ${error instanceof Error ? error.message : 'tente novamente'}`)
    } finally {
      setSalvando(false)
    }
  }

  function atualizarCampo(path: string, valor: any) {
    const partes = path.split('.')
    const base = draftConfig || configSalva || {}
    const novo = JSON.parse(JSON.stringify(base))
    let alvo = novo

    for (let i = 0; i < partes.length - 1; i += 1) {
      alvo[partes[i]] = alvo[partes[i]] || {}
      alvo = alvo[partes[i]]
    }

    alvo[partes[partes.length - 1]] = valor
    historyRef.current.push(JSON.parse(JSON.stringify(base)))
    if (historyRef.current.length > 50) historyRef.current.shift()
    setDraftConfig(novo)
    setTemAlteracoesPendentes(true)
  }

  function atualizarConfigLocal(mutator: (configAtual: any) => any) {
    const base = draftConfig || configSalva || {}
    const novo = mutator(JSON.parse(JSON.stringify(base)))
    historyRef.current.push(JSON.parse(JSON.stringify(base)))
    if (historyRef.current.length > 50) historyRef.current.shift()
    setDraftConfig(novo)
    setTemAlteracoesPendentes(true)
  }

  function ajustarZoomPreview(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.05 : 0.05
    setPreviewScale((current) => Math.max(0.25, Math.min(1.2, Number((current + delta).toFixed(2)))))
  }

  function atualizarLimiteLinhasTabela(valor: number) {
    atualizarConfigLocal((novo) => {
      novo.layout = novo.layout || {}
      const maxRows = Math.max(1, Number(valor || 1))
      const blockCount = Math.max(1, Number(novo.layout.blockCount || 1))
      novo.layout.maxRows = maxRows
      novo.layout.rowsPerBlock = blockCount > 1 ? Math.ceil(maxRows / blockCount) : maxRows
      return novo
    })
  }

  function atualizarFundoUnicoLinhas(valor: string) {
    atualizarConfigLocal((novo) => {
      novo.theme = novo.theme || {}
      novo.theme.rowBackground = valor
      novo.theme.rowAltBackground = valor
      return novo
    })
  }

  async function uploadFundoUnicoLinhas(file: File | null) {
    if (!file) return

    try {
      setSalvando(true)
      const publicUrl = await uploadStreamAsset(file, 'background')
      atualizarFundoUnicoLinhas(imageBackgroundValue(publicUrl))
    } catch (error) {
      alert(`Erro ao enviar imagem: ${error instanceof Error ? error.message : 'tente novamente'}`)
    } finally {
      setSalvando(false)
    }
  }

  function testarTransicao() {
    atualizarCampo('animation.testKey', Date.now())
  }

  function usarLogoDoCampeonato() {
    if (!campeonatoInfo?.logo_url) {
      alert('Este campeonato ainda nao tem logo cadastrada.')
      return
    }

    atualizarConfigLocal((novo) => {
      novo.brand = novo.brand || {}
      novo.brand.enabled = true
      novo.brand.imageEnabled = true
      novo.brand.logoDataUrl = campeonatoInfo.logo_url
      novo.brand.name = novo.brand.name || campeonatoInfo.nome || projeto?.nome || ''
      return novo
    })
    setSelectedBlock('image')
    setActiveAction('move')
  }


  async function moverColuna(direcao: -1 | 1) {
    if (!overlayAtual) return

    const atual = orderedColumnKeys.indexOf(selectedColumn)
    const destino = atual + direcao
    if (atual < 0 || destino < 0 || destino >= orderedColumnKeys.length) return

    const novaOrdem = [...orderedColumnKeys]
    const [coluna] = novaOrdem.splice(atual, 1)
    novaOrdem.splice(destino, 0, coluna)
    await atualizarCampo('columnsOrder', novaOrdem)
  }

  async function alternarVisivel() {
    if (!overlayAtual || !projectId) return

    const novo = !overlayAtual.visivel

    const response = await fetch(`/api/stream/projects/${encodeURIComponent(projectId)}/overlays/${encodeURIComponent(overlayAtual.id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ visivel: novo }),
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok || !result?.overlay?.id) {
      alert(`Erro: ${result?.error || 'nao foi possivel atualizar a overlay'}`)
      return
    }

    setOverlays((prev) => prev.map((item) => item.id === overlayAtual.id ? { ...item, ...result.overlay } : item))
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    alert('Link copiado')
  }

  async function uploadLogoCampeonato(file: File | null) {
    if (!file) return

    try {
      const dimensoes = await validarDimensoesImagem(file)
      if (dimensoes.width > 1920 || dimensoes.height > 1080) {
        alert('A imagem precisa ter no maximo 1920x1080.')
        return
      }
    } catch {
      alert('Nao foi possivel ler essa imagem.')
      return
    }

    await salvarImagemNoCampo('brand.logoDataUrl', file, 'brand')
  }

  async function uploadBackgroundImage(path: string, file: File | null) {
    if (!file) return

    await salvarImagemNoCampo(path, file, 'background', imageBackgroundValue)
  }

  function configComPosicao(baseConfig: any, block: StreamOverlayBlock, x: number, y: number) {
    const novo = JSON.parse(JSON.stringify(baseConfig || {}))
    novo.brand = novo.brand || {}
    novo.layout = novo.layout || {}

    if (isMvpGeralOverlay) {
      novo.mvpGeral = novo.mvpGeral || {}
      if (block === 'image') {
        novo.mvpGeral.photoX = Math.round(x)
        novo.mvpGeral.photoY = Math.round(y)
      } else if (block === 'text') {
        novo.mvpGeral.infoX = Math.round(x)
        novo.mvpGeral.infoY = Math.round(y)
      } else {
        novo.mvpGeral.tableX = Math.round(x)
        novo.mvpGeral.tableY = Math.round(y)
      }
    } else if (block === 'image') {
      novo.brand.x = Math.round(x)
      novo.brand.y = Math.round(y)
    } else if (block === 'text') {
      novo.brand.textX = Math.round(x)
      novo.brand.textY = Math.round(y)
    } else if (block === 'infoImage') {
      novo.tabelaGeral = novo.tabelaGeral || {}
      novo.tabelaGeral.infoImage = novo.tabelaGeral.infoImage || {}
      novo.tabelaGeral.infoImage.x = Math.round(x)
      novo.tabelaGeral.infoImage.y = Math.round(y)
    } else {
      novo.layout.x = Math.round(x)
      novo.layout.y = Math.round(y)
    }

    return novo
  }

  function lerPosicaoBloco(block: StreamOverlayBlock) {
    if (isMvpGeralOverlay) {
      if (block === 'image') return { x: Number(config.mvpGeral?.photoX ?? config.brand?.x ?? 0), y: Number(config.mvpGeral?.photoY ?? config.brand?.y ?? 0) }
      if (block === 'text') return { x: Number(config.mvpGeral?.infoX ?? config.brand?.textX ?? 0), y: Number(config.mvpGeral?.infoY ?? config.brand?.textY ?? 0) }
      return { x: Number(config.mvpGeral?.tableX ?? config.layout?.x ?? 0), y: Number(config.mvpGeral?.tableY ?? config.layout?.y ?? 0) }
    }
    if (block === 'image') return { x: Number(config.brand?.x || 0), y: Number(config.brand?.y || 0) }
    if (block === 'text') return { x: Number(config.brand?.textX || 0), y: Number(config.brand?.textY || 0) }
    if (block === 'infoImage') return { x: Number(config.tabelaGeral?.infoImage?.x || 0), y: Number(config.tabelaGeral?.infoImage?.y || 0) }
    return { x: Number(config.layout?.x || 0), y: Number(config.layout?.y || 0) }
  }

  function countdownBlockConfig(block: CountdownBlock) {
    return config.countdown?.[`${block}Block`] || {}
  }

  function countdownBlockBox(block: CountdownBlock) {
    const blockConfig = countdownBlockConfig(block)
    const fallback = countdownBlockFallbacks[block]
    const scale = Number(blockConfig.scale ?? fallback.scale) / 100

    return {
      left: Number(blockConfig.x ?? fallback.x),
      top: Number(blockConfig.y ?? fallback.y),
      width: Number(blockConfig.w ?? fallback.w),
      height: Number(blockConfig.h ?? fallback.h),
      opacity: Number(blockConfig.opacity ?? fallback.opacity) / 100,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }
  }

  function booyahBlockConfig(block: BooyahBlock) {
    return config.booyah?.[`${block}Block`] || {}
  }

  function booyahBlockBox(block: BooyahBlock) {
    const blockConfig = booyahBlockConfig(block)
    const fallback = booyahBlockFallbacks[block]
    const scale = Number(blockConfig.scale ?? fallback.scale) / 100

    return {
      left: Number(blockConfig.x ?? fallback.x),
      top: Number(blockConfig.y ?? fallback.y),
      width: Number(blockConfig.w ?? fallback.w),
      height: Number(blockConfig.h ?? fallback.h),
      opacity: Number(blockConfig.opacity ?? fallback.opacity) / 100,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }
  }

  function booyahsDiaBlockBox(block: BooyahsDiaBlock) {
    const cfg = (config.booyahsDia || {}) as any
    const mode = String(cfg.mode || 'cards')

    if (block === 'art') {
      if (mode === 'vertical-list') {
        return {
          left: Number(cfg.artSideX ?? 80),
          top: Number(cfg.artSideY ?? 160),
          width: Number(cfg.artSideW ?? 720),
          height: Number(cfg.artSideH ?? 620),
        }
      }

      return {
        left: Number(cfg.artX ?? 0),
        top: Number(cfg.artY ?? 20),
        width: Number(cfg.artW ?? 1920),
        height: Number(cfg.artH ?? 260),
      }
    }

    if (mode === 'vertical-list') {
      return {
        left: Number(cfg.listX ?? 940),
        top: Number(cfg.listY ?? 160),
        width: Number(cfg.listW ?? 820),
        height: Number(cfg.listH ?? 760),
      }
    }

    const total = Math.max(previewRows.length || Number(booyahsDiaContext.quantidadePartidas || 0), 1)
    const gap = Number(cfg.gap ?? 18)
    const columns = Math.min(total, Math.max(1, Math.min(8, Number(cfg.columns ?? total))))
    const containerWidth = Math.min(1920, Math.max(320, Number(cfg.containerWidth ?? 1840)))
    const autoFit = cfg.autoFit !== false
    const cardWidth = autoFit ? Math.floor((containerWidth - gap * Math.max(0, columns - 1)) / columns) : Number(cfg.cardWidth ?? 292)
    const cardHeight = Number(cfg.cardHeight ?? 470)
    const gridWidth = columns * cardWidth + gap * Math.max(0, columns - 1)

    return {
      left: autoFit ? Math.max(0, (1920 - gridWidth) / 2) : Number(cfg.x ?? 36),
      top: Number(cfg.y ?? 360),
      width: gridWidth,
      height: cardHeight,
    }
  }

  function selecionarBooyahsDiaBlock(block: BooyahsDiaBlock, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    setSelectedBooyahsDiaBlock(block)
  }

  function atualizarPreviewConfig(novoConfig: any) {
    if (!overlayAtual) return
    setOverlays((prev) => prev.map((item) => item.id === overlayAtual.id ? { ...item, config: novoConfig } : item))
  }

  function iniciarArrasto(block: StreamOverlayBlock, event: PointerEvent) {
    if (!overlayAtual) return

    setSelectedBlock(block)
    setActiveAction('move')

    const inicioMouse = { x: event.clientX, y: event.clientY }
    const inicioBloco = lerPosicaoBloco(block)
    let ultimoConfig = config

    const mover = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = (moveEvent.clientX - inicioMouse.x) / previewScale
      const deltaY = (moveEvent.clientY - inicioMouse.y) / previewScale
      ultimoConfig = configComPosicao(config, block, inicioBloco.x + deltaX, inicioBloco.y + deltaY)
      atualizarPreviewConfig(ultimoConfig)
    }

    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      salvarConfig(ultimoConfig)
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  function iniciarArrastoCountdown(block: CountdownBlock, event: PointerEvent<HTMLButtonElement>) {
    if (!overlayAtual) return

    event.preventDefault()
    event.stopPropagation()
    setSelectedCountdownBlock(block)
    setActiveAction('move')

    const inicioMouse = { x: event.clientX, y: event.clientY }
    const blockConfig = countdownBlockConfig(block)
    const fallback = countdownBlockFallbacks[block]
    const inicioBloco = { x: Number(blockConfig.x ?? fallback.x), y: Number(blockConfig.y ?? fallback.y) }
    const path = countdownBlockPaths[block]
    let ultimoConfig = config

    const mover = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = (moveEvent.clientX - inicioMouse.x) / previewScale
      const deltaY = (moveEvent.clientY - inicioMouse.y) / previewScale
      const novo = JSON.parse(JSON.stringify(config || {}))
      novo.countdown = novo.countdown || {}
      novo.countdown[`${block}Block`] = {
        ...(novo.countdown[`${block}Block`] || {}),
        x: Math.round(inicioBloco.x + deltaX),
        y: Math.round(inicioBloco.y + deltaY),
      }
      ultimoConfig = novo
      atualizarPreviewConfig(novo)
    }

    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      void salvarConfig(ultimoConfig)
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)

    if (!config.countdown?.[`${block}Block`]) {
      atualizarCampo(path, { ...fallback })
    }
  }

  function iniciarArrastoBooyah(block: BooyahBlock, event: PointerEvent<HTMLButtonElement>) {
    if (!overlayAtual) return

    event.preventDefault()
    event.stopPropagation()
    setSelectedBooyahBlock(block)
    setActiveAction('move')

    const inicioMouse = { x: event.clientX, y: event.clientY }
    const blockConfig = booyahBlockConfig(block)
    const fallback = booyahBlockFallbacks[block]
    const inicioBloco = { x: Number(blockConfig.x ?? fallback.x), y: Number(blockConfig.y ?? fallback.y) }
    const path = booyahBlockPaths[block]
    let ultimoConfig = config

    const mover = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = (moveEvent.clientX - inicioMouse.x) / previewScale
      const deltaY = (moveEvent.clientY - inicioMouse.y) / previewScale
      const novo = JSON.parse(JSON.stringify(config || {}))
      novo.booyah = novo.booyah || {}
      novo.booyah[`${block}Block`] = {
        ...(novo.booyah[`${block}Block`] || {}),
        x: Math.round(inicioBloco.x + deltaX),
        y: Math.round(inicioBloco.y + deltaY),
      }
      ultimoConfig = novo
      atualizarPreviewConfig(novo)
    }

    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      void salvarConfig(ultimoConfig)
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)

    if (!config.booyah?.[`${block}Block`]) {
      atualizarCampo(path, { ...fallback })
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#080d16] text-white"><Loader2 className="animate-spin" /></main>
  }

  return (
    <main className="h-screen overflow-hidden bg-[#080d16] p-5 text-white">
      <section className="mx-auto flex h-full max-w-[1700px] flex-col">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">Overlay Editor</div>
            <h1 className="mt-2 text-2xl font-black uppercase">{projeto?.nome || 'Projeto de transmissão'}</h1>
            <p className="mt-1 text-xs font-semibold text-zinc-400">Preview com dados reais do campeonato e visual salvo direto no link OBS.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={carregar} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><RefreshCw size={14} /> Atualizar</button>
            {overlayAtual ? (
              <>
                <button onClick={alternarVisivel} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                  {overlayAtual.visivel ? <EyeOff size={14} /> : <Eye size={14} />}
                  {overlayAtual.visivel ? 'Ocultar' : 'Mostrar'}
                </button>
                <Link href={`/stream/render/${overlayAtual.id}`} target="_blank" className="inline-flex h-10 items-center gap-2 border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><MonitorUp size={14} /> OBS</Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[280px_minmax(620px,1fr)_360px]">
          <aside className="min-h-0 overflow-y-auto border border-white/10 bg-[#111827] p-4">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Overlays do projeto</div>

            <div className="space-y-2">
              {overlays.map((overlay) => (
                <div key={overlay.id} className={`flex border ${overlayAtual?.id === overlay.id ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-200'}`}>
                  <button onClick={() => setOverlayId(overlay.id)} className="min-w-0 flex-1 px-3 py-3 text-left text-sm font-black uppercase">
                    {overlay.nome}
                    <div className="mt-1 truncate text-[10px] font-semibold text-zinc-300">{overlay.template_id}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removerOverlay(overlay)}
                    disabled={salvando}
                    className="flex w-10 items-center justify-center border-l border-white/10 text-white/80 hover:bg-black/20 disabled:opacity-50"
                    title="Remover overlay"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Adicionar template</div>
              {!isSiteAdmin ? (
                <div className="mb-3 border border-white/10 bg-[#0b1220] p-3 text-[11px] font-semibold leading-5 text-zinc-400">
                  As overlays oficiais sao fixas. Apenas administradores do site podem adicionar novos modelos.
                </div>
              ) : null}
              <div className="space-y-2">
                {templates.map((tpl) => {
                  const jaAdicionado = overlays.some((overlay) => overlay.template_id === tpl.id)
                  const isExtraTemplate = !tpl.fixed
                  if (isExtraTemplate && !isSiteAdmin) return null
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => criarOverlay(tpl)}
                      disabled={salvando || jaAdicionado}
                      className={`flex w-full items-center justify-between border px-3 py-3 text-left text-xs font-black uppercase ${jaAdicionado ? 'border-white/5 bg-white/[0.03] text-zinc-500' : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'} disabled:cursor-not-allowed`}
                    >
                      <span>{tpl.nome}</span>
                      {jaAdicionado ? <span className="text-[9px] tracking-[0.14em]">Adicionado</span> : <Plus size={14} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col border border-white/10 bg-[#111827] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Preview 1920x1080</div>
                <div className="mt-1 text-xl font-black uppercase">{overlayAtual?.nome || 'Nenhuma overlay'}</div>
              </div>
              {renderUrl ? (
                <button onClick={() => copiar(renderUrl)} className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                  <Copy size={13} />
                  Copiar link
                </button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <div
                className="relative overflow-hidden"
                style={{
                  ...checkerboardStyle,
                  width: 1920 * previewScale,
                  height: 1080 * previewScale,
                }}
                onWheel={ajustarZoomPreview}
                onMouseDown={() => setSelectedBlock('table')}
              >
                {!isTabelaOverlay && PreviewOverlay && overlayAtual ? (
                  <div
                    className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left"
                    style={{ transform: `scale(${previewScale})` }}
                  >
                    <PreviewOverlay
                      config={config}
                      rows={previewRows}
                      templateId={overlayAtual.template_id}
                      overlayName={overlayAtual.nome}
                      context={{
                        jogo: booyahsDiaContext.jogo || { nome: 'JOGO PRINCIPAL', nome_bloco: 'GRUPO A', quantidade_partidas: previewRows.length },
                        mapas: booyahsDiaContext.mapas || previewRows.map((row) => textoSeguro(row.mapa)).filter(Boolean),
                        quantidadePartidas: booyahsDiaContext.quantidadePartidas || previewRows.length,
                        campeonato: campeonatoInfo,
                      }}
                    />
                    {isCountdownOverlay ? (
                      <div className="absolute left-0 top-0 h-[1080px] w-[1920px]">
                        {(['timer', 'equipes', 'mapas'] as CountdownBlock[]).map((block) => (
                          <button
                            key={block}
                            type="button"
                            onPointerDown={(event) => iniciarArrastoCountdown(block, event)}
                            className="absolute z-20 border text-left text-[22px] font-black uppercase tracking-[0.14em] text-white"
                            style={{
                              ...countdownBlockBox(block),
                              borderColor: selectedCountdownBlock === block ? '#ef4444' : 'rgba(239,68,68,0.55)',
                              outline: selectedCountdownBlock === block ? '5px solid rgba(239,68,68,0.45)' : '2px dashed rgba(239,68,68,0.45)',
                              background: selectedCountdownBlock === block ? 'rgba(239,68,68,0.10)' : 'rgba(15,23,42,0.03)',
                            }}
                          >
                            <span className="absolute left-2 top-2 bg-red-600 px-2 py-1 text-[18px] leading-none">{countdownBlockLabels[block]}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {isBooyahOverlay ? (
                      <div className="absolute left-0 top-0 h-[1080px] w-[1920px]">
                        {(['texto', 'logo', 'equipe'] as BooyahBlock[]).map((block) => (
                          <button
                            key={block}
                            type="button"
                            onPointerDown={(event) => iniciarArrastoBooyah(block, event)}
                            className="absolute z-20 border text-left text-[22px] font-black uppercase tracking-[0.14em] text-white"
                            style={{
                              ...booyahBlockBox(block),
                              borderColor: selectedBooyahBlock === block ? '#ef4444' : 'rgba(239,68,68,0.55)',
                              outline: selectedBooyahBlock === block ? '5px solid rgba(239,68,68,0.45)' : '2px dashed rgba(239,68,68,0.45)',
                              background: selectedBooyahBlock === block ? 'rgba(239,68,68,0.10)' : 'rgba(15,23,42,0.03)',
                            }}
                          >
                            <span className="absolute left-2 top-2 bg-red-600 px-2 py-1 text-[18px] leading-none">{booyahBlockLabels[block]}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {isBooyahsDiaOverlay ? (
                      <div className="absolute left-0 top-0 h-[1080px] w-[1920px]">
                        {(['art', 'cards'] as BooyahsDiaBlock[]).map((block) => (
                          <button
                            key={block}
                            type="button"
                            onPointerDown={(event) => selecionarBooyahsDiaBlock(block, event)}
                            className="absolute z-20 border text-left text-[22px] font-black uppercase tracking-[0.14em] text-white"
                            style={{
                              ...booyahsDiaBlockBox(block),
                              borderColor: selectedBooyahsDiaBlock === block ? '#ef4444' : 'rgba(239,68,68,0.55)',
                              outline: selectedBooyahsDiaBlock === block ? '5px solid rgba(239,68,68,0.45)' : '2px dashed rgba(239,68,68,0.45)',
                              background: selectedBooyahsDiaBlock === block ? 'rgba(239,68,68,0.10)' : 'rgba(15,23,42,0.03)',
                            }}
                          >
                            <span className="absolute left-2 top-2 bg-red-600 px-2 py-1 text-[18px] leading-none">{booyahsDiaBlockLabels[block]}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <TabelaGeralOverlay
                    config={config}
                    rows={previewRows}
                    previewScale={previewScale}
                    editable
                    selectedBlock={selectedBlock}
                    selectedColumn={selectedColumn}
                    onSelectBlock={setSelectedBlock}
                    onSelectColumn={(column) => {
                      setSelectedColumn(column)
                      setActiveAction('table')
                    }}
                    onStartDrag={iniciarArrasto}
                  />
                )}
              </div>
            </div>

            {renderUrl ? (
              <div className="mt-3 break-all border border-white/10 bg-[#0b1220] p-3 text-xs font-semibold text-zinc-300">{renderUrl}</div>
            ) : null}
          </section>

          <aside className="min-h-0 overflow-y-auto border border-white/10 bg-[#111827] p-4">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              <SlidersHorizontal size={15} />
              Editor visual
            </div>

            {!overlayAtual ? (
              <div className="text-sm font-semibold text-zinc-400">Crie ou selecione uma overlay.</div>
            ) : (
              <div className="space-y-4">
                {CustomOverlayEditor ? (
                  <CustomOverlayEditor
                    config={config}
                    onChange={atualizarCampo}
                    onChangeConfig={(mutator) => atualizarConfigLocal((atual) => mutator(atual))}
                    onUploadImage={(path, file) => salvarImagemNoCampo(path, file, 'background')}
                  />
                ) : null}

                {isBooyahsDiaOverlay ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(['art', 'cards'] as BooyahsDiaBlock[]).map((block) => (
                      <button
                        key={block}
                        type="button"
                        onClick={() => setSelectedBooyahsDiaBlock(block)}
                        className={`flex h-16 flex-col items-center justify-center gap-1 border text-[10px] font-black uppercase tracking-[0.12em] ${selectedBooyahsDiaBlock === block ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300'}`}
                      >
                        {block === 'art' ? <ImageIcon size={17} /> : <Columns3 size={17} />}
                        {booyahsDiaBlockLabels[block]}
                      </button>
                    ))}
                  </div>
                ) : isCountdownOverlay ? (
                  <div className="grid grid-cols-3 gap-2">
                    {(['timer', 'equipes', 'mapas'] as CountdownBlock[]).map((block) => (
                      <button
                        key={block}
                        type="button"
                        onClick={() => setSelectedCountdownBlock(block)}
                        className={`flex h-16 flex-col items-center justify-center gap-1 border text-[10px] font-black uppercase tracking-[0.12em] ${selectedCountdownBlock === block ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300'}`}
                      >
                        {block === 'timer' ? <Type size={17} /> : block === 'equipes' ? <ImageIcon size={17} /> : <Table2 size={17} />}
                        {countdownBlockLabels[block]}
                      </button>
                    ))}
                  </div>
                ) : isBooyahOverlay ? (
                  <div className="grid grid-cols-3 gap-2">
                    {(['texto', 'logo', 'equipe'] as BooyahBlock[]).map((block) => (
                      <button
                        key={block}
                        type="button"
                        onClick={() => setSelectedBooyahBlock(block)}
                        className={`flex h-16 flex-col items-center justify-center gap-1 border text-[10px] font-black uppercase tracking-[0.12em] ${selectedBooyahBlock === block ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300'}`}
                      >
                        {block === 'logo' ? <ImageIcon size={17} /> : <Type size={17} />}
                        {booyahBlockLabels[block]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={isMvpGeralOverlay ? "grid grid-cols-3 gap-2" : "grid grid-cols-4 gap-2"}>
                    {(isMvpGeralOverlay ? (['image', 'text', 'table'] as StreamOverlayBlock[]) : (['infoImage', 'image', 'text', 'table'] as StreamOverlayBlock[])).map((block) => (
                      <button
                        key={block}
                        type="button"
                        onClick={() => {
                          setSelectedBlock(block)
                          if (block === 'infoImage') {
                            atualizarCampo('tabelaGeral.infoImage.enabled', true)
                          } else if (block === 'image') {
                            atualizarCampo('brand.imageEnabled', true)
                          } else if (block === 'text') {
                            atualizarCampo('brand.textEnabled', true)
                          }
                        }}
                        className={`flex h-16 flex-col items-center justify-center gap-1 border text-[10px] font-black uppercase tracking-[0.12em] ${selectedBlock === block ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300'}`}
                      >
                        {block === 'image' || block === 'infoImage' ? <ImageIcon size={17} /> : block === 'text' ? <Type size={17} /> : <Table2 size={17} />}
                        {isMvpGeralOverlay ? (block === 'image' ? 'Foto MVP' : block === 'text' ? 'Info MVP' : 'Tabela') : (block === 'infoImage' ? 'Imagem topo' : block === 'image' ? 'Logo' : block === 'text' ? 'Titulo' : 'Tabela')}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-5 gap-2">
                  {([
                    ['move', Move],
                    ['content', Type],
                    ['style', Palette],
                    ['table', Columns3],
                    ['transition', Play],
                  ] as const).map(([action, Icon]) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => setActiveAction(action)}
                      className={`flex h-11 items-center justify-center border text-[10px] font-black uppercase tracking-[0.12em] ${activeAction === action ? 'border-white bg-white text-[#101827]' : 'border-white/10 bg-[#0b1220] text-zinc-300'}`}
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>

                <div className="border border-white/10 bg-[#0b1220] p-3">
                  <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                    {isBooyahsDiaOverlay ? booyahsDiaBlockLabels[selectedBooyahsDiaBlock] : isCountdownOverlay ? countdownBlockLabels[selectedCountdownBlock] : isBooyahOverlay ? booyahBlockLabels[selectedBooyahBlock] : isMvpGeralOverlay ? (selectedBlock === 'image' ? 'Foto MVP' : selectedBlock === 'text' ? 'Info MVP' : 'Tabela') : blockLabels[selectedBlock]} / {activeAction === 'move' ? 'Mover bloco' : activeAction === 'content' ? 'Conteudo' : activeAction === 'style' ? 'Visual' : activeAction === 'transition' ? 'Transicoes' : 'Tabela'}
                  </div>

                  {activeAction === 'move' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {isBooyahsDiaOverlay ? (
                        selectedBooyahsDiaBlock === 'art' ? (
                          booyahsDiaMode === 'vertical-list' ? (
                            <>
                              <EditorNumber label="X" value={Number(booyahsDiaConfig.artSideX ?? 80)} onChange={(v) => atualizarCampo('booyahsDia.artSideX', v)} />
                              <EditorNumber label="Y" value={Number(booyahsDiaConfig.artSideY ?? 160)} onChange={(v) => atualizarCampo('booyahsDia.artSideY', v)} />
                              <EditorNumber label="Largura" value={Number(booyahsDiaConfig.artSideW ?? 720)} onChange={(v) => atualizarCampo('booyahsDia.artSideW', v)} />
                              <EditorNumber label="Altura" value={Number(booyahsDiaConfig.artSideH ?? 620)} onChange={(v) => atualizarCampo('booyahsDia.artSideH', v)} />
                            </>
                          ) : (
                            <>
                              <EditorNumber label="X" value={Number(booyahsDiaConfig.artX ?? 0)} onChange={(v) => atualizarCampo('booyahsDia.artX', v)} />
                              <EditorNumber label="Y" value={Number(booyahsDiaConfig.artY ?? 20)} onChange={(v) => atualizarCampo('booyahsDia.artY', v)} />
                              <EditorNumber label="Largura" value={Number(booyahsDiaConfig.artW ?? 1920)} onChange={(v) => atualizarCampo('booyahsDia.artW', v)} />
                              <EditorNumber label="Altura" value={Number(booyahsDiaConfig.artH ?? 260)} onChange={(v) => atualizarCampo('booyahsDia.artH', v)} />
                            </>
                          )
                        ) : booyahsDiaMode === 'vertical-list' ? (
                          <>
                            <EditorNumber label="X" value={Number(booyahsDiaConfig.listX ?? 940)} onChange={(v) => atualizarCampo('booyahsDia.listX', v)} />
                            <EditorNumber label="Y" value={Number(booyahsDiaConfig.listY ?? 160)} onChange={(v) => atualizarCampo('booyahsDia.listY', v)} />
                            <EditorNumber label="Largura" value={Number(booyahsDiaConfig.listW ?? 820)} onChange={(v) => atualizarCampo('booyahsDia.listW', v)} />
                            <EditorNumber label="Altura" value={Number(booyahsDiaConfig.listH ?? 760)} onChange={(v) => atualizarCampo('booyahsDia.listH', v)} />
                          </>
                        ) : (
                          <>
                            <EditorNumber label="X" value={Number(booyahsDiaConfig.x ?? 36)} onChange={(v) => atualizarCampo('booyahsDia.x', v)} />
                            <EditorNumber label="Y" value={Number(booyahsDiaConfig.y ?? 360)} onChange={(v) => atualizarCampo('booyahsDia.y', v)} />
                            <EditorNumber label="Area cards" value={Number(booyahsDiaConfig.containerWidth ?? 1840)} onChange={(v) => atualizarCampo('booyahsDia.containerWidth', v)} />
                          </>
                        )
                      ) : isCountdownOverlay ? (
                        <>
                          <EditorNumber label="X" value={selectedCountdownConfig.x ?? selectedCountdownFallback.x} onChange={(v) => atualizarCampo(`${selectedCountdownPath}.x`, v)} />
                          <EditorNumber label="Y" value={selectedCountdownConfig.y ?? selectedCountdownFallback.y} onChange={(v) => atualizarCampo(`${selectedCountdownPath}.y`, v)} />
                          <EditorNumber label="Largura" value={selectedCountdownConfig.w ?? selectedCountdownFallback.w} onChange={(v) => atualizarCampo(`${selectedCountdownPath}.w`, v)} />
                          <EditorNumber label="Altura" value={selectedCountdownConfig.h ?? selectedCountdownFallback.h} onChange={(v) => atualizarCampo(`${selectedCountdownPath}.h`, v)} />
                          <EditorNumber label="Escala" value={selectedCountdownConfig.scale ?? selectedCountdownFallback.scale} onChange={(v) => atualizarCampo(`${selectedCountdownPath}.scale`, v)} />
                          <EditorNumber label="Opacidade" value={selectedCountdownConfig.opacity ?? selectedCountdownFallback.opacity} onChange={(v) => atualizarCampo(`${selectedCountdownPath}.opacity`, v)} />
                        </>
                      ) : isBooyahOverlay ? (
                        <>
                          <EditorNumber label="X" value={selectedBooyahConfig.x ?? selectedBooyahFallback.x} onChange={(v) => atualizarCampo(`${selectedBooyahPath}.x`, v)} />
                          <EditorNumber label="Y" value={selectedBooyahConfig.y ?? selectedBooyahFallback.y} onChange={(v) => atualizarCampo(`${selectedBooyahPath}.y`, v)} />
                          <EditorNumber label="Largura" value={selectedBooyahConfig.w ?? selectedBooyahFallback.w} onChange={(v) => atualizarCampo(`${selectedBooyahPath}.w`, v)} />
                          <EditorNumber label="Altura" value={selectedBooyahConfig.h ?? selectedBooyahFallback.h} onChange={(v) => atualizarCampo(`${selectedBooyahPath}.h`, v)} />
                          <EditorNumber label="Escala" value={selectedBooyahConfig.scale ?? selectedBooyahFallback.scale} onChange={(v) => atualizarCampo(`${selectedBooyahPath}.scale`, v)} />
                          <EditorNumber label="Opacidade" value={selectedBooyahConfig.opacity ?? selectedBooyahFallback.opacity} onChange={(v) => atualizarCampo(`${selectedBooyahPath}.opacity`, v)} />
                        </>
                      ) : selectedBlock === 'infoImage' ? (
                        <>
                          <EditorNumber label="X" value={config.tabelaGeral?.infoImage?.x || 0} onChange={(v) => atualizarCampo('tabelaGeral.infoImage.x', v)} />
                          <EditorNumber label="Y" value={config.tabelaGeral?.infoImage?.y || 0} onChange={(v) => atualizarCampo('tabelaGeral.infoImage.y', v)} />
                          <EditorNumber label="Largura" value={config.tabelaGeral?.infoImage?.w || 1920} onChange={(v) => atualizarCampo('tabelaGeral.infoImage.w', v)} />
                          <EditorNumber label="Altura" value={config.tabelaGeral?.infoImage?.h || 260} onChange={(v) => atualizarCampo('tabelaGeral.infoImage.h', v)} />
                          <EditorNumber label="Opacidade" value={config.tabelaGeral?.infoImage?.opacity || 100} onChange={(v) => atualizarCampo('tabelaGeral.infoImage.opacity', v)} />
                        </>
                      ) : selectedBlock === 'image' ? (
                        isMvpGeralOverlay ? (
                          <>
                            <EditorNumber label="X" value={config.mvpGeral?.photoX ?? 50} onChange={(v) => atualizarCampo('mvpGeral.photoX', v)} />
                            <EditorNumber label="Y" value={config.mvpGeral?.photoY ?? 120} onChange={(v) => atualizarCampo('mvpGeral.photoY', v)} />
                            <EditorNumber label="Largura" value={config.mvpGeral?.photoW ?? 600} onChange={(v) => atualizarCampo('mvpGeral.photoW', v)} />
                            <EditorNumber label="Altura" value={config.mvpGeral?.photoH ?? 850} onChange={(v) => atualizarCampo('mvpGeral.photoH', v)} />
                            <EditorNumber label="Opacidade" value={config.brand?.opacity || 100} onChange={(v) => atualizarCampo('brand.opacity', v)} />
                          </>
                        ) : (
                          <>
                            <EditorNumber label="X" value={config.brand?.x || 0} onChange={(v) => atualizarCampo('brand.x', v)} />
                            <EditorNumber label="Y" value={config.brand?.y || 0} onChange={(v) => atualizarCampo('brand.y', v)} />
                            <EditorNumber label="Largura" value={config.brand?.w || 0} onChange={(v) => atualizarCampo('brand.w', v)} />
                            <EditorNumber label="Altura" value={config.brand?.h || 0} onChange={(v) => atualizarCampo('brand.h', v)} />
                            <EditorNumber label="Escala" value={config.brand?.scale || 100} onChange={(v) => atualizarCampo('brand.scale', v)} />
                            <EditorNumber label="Opacidade" value={config.brand?.opacity || 100} onChange={(v) => atualizarCampo('brand.opacity', v)} />
                          </>
                        )
                      ) : selectedBlock === 'text' ? (
                        isMvpGeralOverlay ? (
                          <>
                            <EditorNumber label="X" value={config.mvpGeral?.infoX ?? 50} onChange={(v) => atualizarCampo('mvpGeral.infoX', v)} />
                            <EditorNumber label="Y" value={config.mvpGeral?.infoY ?? 842} onChange={(v) => atualizarCampo('mvpGeral.infoY', v)} />
                            <EditorNumber label="Largura" value={config.mvpGeral?.infoW ?? 600} onChange={(v) => atualizarCampo('mvpGeral.infoW', v)} />
                            <EditorNumber label="Altura" value={config.mvpGeral?.infoH ?? 128} onChange={(v) => atualizarCampo('mvpGeral.infoH', v)} />
                            <EditorNumber label="Opacidade" value={config.brand?.textOpacity || 100} onChange={(v) => atualizarCampo('brand.textOpacity', v)} />
                          </>
                        ) : (
                          <>
                            <EditorNumber label="X" value={config.brand?.textX || 0} onChange={(v) => atualizarCampo('brand.textX', v)} />
                            <EditorNumber label="Y" value={config.brand?.textY || 0} onChange={(v) => atualizarCampo('brand.textY', v)} />
                            <EditorNumber label="Largura" value={config.brand?.textW || 0} onChange={(v) => atualizarCampo('brand.textW', v)} />
                            <EditorNumber label="Altura" value={config.brand?.textH || 0} onChange={(v) => atualizarCampo('brand.textH', v)} />
                            <EditorNumber label="Escala" value={config.brand?.textScale || 100} onChange={(v) => atualizarCampo('brand.textScale', v)} />
                            <EditorNumber label="Opacidade" value={config.brand?.textOpacity || 100} onChange={(v) => atualizarCampo('brand.textOpacity', v)} />
                          </>
                        )
                      ) : (
                        isMvpGeralOverlay ? (
                          <>
                            <EditorNumber label="X" value={config.mvpGeral?.tableX ?? 730} onChange={(v) => atualizarCampo('mvpGeral.tableX', v)} />
                            <EditorNumber label="Y" value={config.mvpGeral?.tableY ?? 260} onChange={(v) => atualizarCampo('mvpGeral.tableY', v)} />
                            <EditorNumber label="Largura" value={config.mvpGeral?.tableW ?? 1140} onChange={(v) => atualizarCampo('mvpGeral.tableW', v)} />
                            <EditorNumber label="Opacidade" value={config.layout.opacity || 100} onChange={(v) => atualizarCampo('layout.opacity', v)} />
                          </>
                        ) : (
                          <>
                            <EditorNumber label="X" value={config.layout.x || 0} onChange={(v) => atualizarCampo('layout.x', v)} />
                            <EditorNumber label="Y" value={config.layout.y || 0} onChange={(v) => atualizarCampo('layout.y', v)} />
                            <EditorNumber label="Largura" value={config.layout.w || 0} onChange={(v) => atualizarCampo('layout.w', v)} />
                            <EditorNumber label="Escala" value={config.layout.scale || 100} onChange={(v) => atualizarCampo('layout.scale', v)} />
                            <EditorNumber label="Opacidade" value={config.layout.opacity || 100} onChange={(v) => atualizarCampo('layout.opacity', v)} />
                          </>
                        )
                      )}
                    </div>
                  ) : null}

                  {activeAction === 'content' ? (
                    <div className="space-y-3">
                      {isBooyahsDiaOverlay ? (
                        <>
                          {selectedBooyahsDiaBlock === 'art' ? (
                            <>
                              <EditorInput label="Titulo" value={booyahsDiaConfig.title || config.title || 'BOOYAHS DO DIA'} onChange={(v) => atualizarCampo('booyahsDia.title', v)} />
                              <label className="block">
                                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{booyahsDiaMode === 'vertical-list' ? 'Imagem lateral' : 'Imagem topo'}</span>
                                <input type="file" accept="image/*" onChange={(e) => salvarImagemNoCampo('booyahsDia.artImageUrl', e.target.files?.[0] || null, 'booyahs-dia')} className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                              </label>
                              <button type="button" onClick={() => atualizarCampo('booyahsDia.artImageUrl', '')} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Remover imagem
                              </button>
                              <EditorSelect label="Ajuste da imagem" value={booyahsDiaConfig.artFit || 'contain'} onChange={(v) => atualizarCampo('booyahsDia.artFit', v)} options={[['contain', 'Conter'], ['cover', 'Cobrir'], ['fill', 'Esticar']]} />
                            </>
                          ) : (
                            <>
                              <label className="block">
                                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Mascara/recorte do mapa</span>
                                <input type="file" accept="image/*" onChange={(e) => salvarImagemNoCampo('booyahsDia.mapBackgroundUrl', e.target.files?.[0] || null, 'booyahs-dia')} className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                              </label>
                              <button type="button" onClick={() => atualizarCampo('booyahsDia.mapBackgroundUrl', '')} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Remover mascara
                              </button>
                              <label className="block">
                                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Imagem faixa do nome</span>
                                <input type="file" accept="image/*" onChange={(e) => salvarImagemNoCampo('booyahsDia.nameBandBackgroundUrl', e.target.files?.[0] || null, 'booyahs-dia')} className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                              </label>
                              <button type="button" onClick={() => atualizarCampo('booyahsDia.nameBandBackgroundUrl', '')} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Remover faixa
                              </button>
                              {booyahsDiaMode !== 'vertical-list' ? (
                                <>
                                  <label className="block">
                                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Imagem fundo dos pontos</span>
                                    <input type="file" accept="image/*" onChange={(e) => salvarImagemNoCampo('booyahsDia.statsBackgroundUrl', e.target.files?.[0] || null, 'booyahs-dia')} className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                                  </label>
                                  <button type="button" onClick={() => atualizarCampo('booyahsDia.statsBackgroundUrl', '')} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                    Remover fundo pontos
                                  </button>
                                </>
                              ) : null}
                            </>
                          )}
                        </>
                      ) : isCountdownOverlay ? (
                        <>
                          {selectedCountdownBlock === 'timer' ? (
                            <>
                              <EditorInput label="Titulo do contador" value={config.countdown?.titulo || config.title || ''} onChange={(v) => atualizarCampo('countdown.titulo', v)} />
                              <EditorInput label="Subtitulo" value={config.countdown?.subtitulo || ''} onChange={(v) => atualizarCampo('countdown.subtitulo', v)} />
                              <EditorNumber label="Tempo em segundos" value={config.countdown?.seconds || 900} onChange={(v) => atualizarCampo('countdown.seconds', v)} />
                            </>
                          ) : null}

                          {selectedCountdownBlock === 'equipes' ? (
                            <>
                              <EditorInput label="Titulo das equipes" value={config.countdown?.equipesBlock?.title || 'EQUIPES DO JOGO'} onChange={(v) => atualizarCampo('countdown.equipesBlock.title', v)} />
                              <EditorNumber label="Quantidade equipes" value={config.countdown?.maxEquipes || 18} onChange={(v) => atualizarCampo('countdown.maxEquipes', v)} />
                              <EditorNumber label="Colunas" value={config.countdown?.equipesBlock?.columns || 3} onChange={(v) => atualizarCampo('countdown.equipesBlock.columns', v)} />
                              <label className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-200">
                                <input type="checkbox" checked={Boolean(config.countdown?.filtrarPorJogo)} onChange={(e) => atualizarCampo('countdown.filtrarPorJogo', e.target.checked)} />
                                Filtrar por jogo/grupo
                              </label>
                            </>
                          ) : null}

                          {selectedCountdownBlock === 'mapas' ? (
                            <>
                              <EditorInput label="Titulo dos mapas" value={config.countdown?.mapasBlock?.title || 'MAPAS / QUEDAS'} onChange={(v) => atualizarCampo('countdown.mapasBlock.title', v)} />
                              <EditorInput label="Texto extra da overlay" value={config.countdown?.texto || ''} onChange={(v) => atualizarCampo('countdown.texto', v)} />
                            </>
                          ) : null}

                          <label className="block">
                            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Imagem geral do countdown</span>
                            <input type="file" accept="image/*" onChange={(e) => salvarImagemNoCampo('countdown.imagemUrl', e.target.files?.[0] || null, 'countdown')} className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                          </label>
                          <button type="button" onClick={() => atualizarCampo('countdown.imagemUrl', '')} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                            Remover imagem
                          </button>
                        </>
                      ) : isBooyahOverlay ? (
                        <>
                          {selectedBooyahBlock === 'texto' ? (
                            <EditorInput label="Texto principal" value={config.booyah?.texto || config.title || 'BOOYAH'} onChange={(v) => atualizarCampo('booyah.texto', v)} />
                          ) : null}
                          {selectedBooyahBlock === 'logo' ? (
                            <>
                              <EditorNumber label="Delay entrada ms" value={selectedBooyahConfig.delay || 2000} onChange={(v) => atualizarCampo('booyah.logoBlock.delay', v)} />
                              <EditorSelect label="Ajuste logo" value={selectedBooyahConfig.fit || 'contain'} onChange={(v) => atualizarCampo('booyah.logoBlock.fit', v)} options={[['contain', 'Conter'], ['cover', 'Cobrir']]} />
                              <EditorSelect label="Posicao logo" value={selectedBooyahConfig.position || 'center center'} onChange={(v) => atualizarCampo('booyah.logoBlock.position', v)} options={objectPositionOptions} />
                            </>
                          ) : null}
                          {selectedBooyahBlock === 'equipe' ? (
                            <>
                              <EditorNumber label="Delay entrada ms" value={selectedBooyahConfig.delay || 2200} onChange={(v) => atualizarCampo('booyah.equipeBlock.delay', v)} />
                              <EditorSelect label="Alinhamento" value={selectedBooyahConfig.align || 'left'} onChange={(v) => atualizarCampo('booyah.equipeBlock.align', v)} options={horizontalAlignOptions} />
                            </>
                          ) : null}
                        </>
                      ) : selectedBlock === 'infoImage' ? (
                        <>
                          <label className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-200">
                            <input type="checkbox" checked={config.tabelaGeral?.infoImage?.enabled !== false} onChange={(e) => atualizarCampo('tabelaGeral.infoImage.enabled', e.target.checked)} />
                            Mostrar imagem topo
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Imagem superior</span>
                            <input type="file" accept="image/*" onChange={(e) => salvarImagemNoCampo('tabelaGeral.infoImage.url', e.target.files?.[0] || null, 'background')} className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                          </label>
                          <EditorSelect label="Ajuste imagem" value={config.tabelaGeral?.infoImage?.fit || 'contain'} onChange={(v) => atualizarCampo('tabelaGeral.infoImage.fit', v)} options={[['contain', 'Conter'], ['cover', 'Cobrir']]} />
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => atualizarCampo('tabelaGeral.infoImage.enabled', false)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                              Ocultar
                            </button>
                            <button type="button" onClick={() => atualizarCampo('tabelaGeral.infoImage.url', '')} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                              Limpar
                            </button>
                          </div>
                        </>
                      ) : selectedBlock === 'image' ? (
                        <>
                          <label className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-200">
                            <input type="checkbox" checked={config.brand?.imageEnabled !== false} onChange={(e) => atualizarCampo('brand.imageEnabled', e.target.checked)} />
                            Mostrar imagem
                          </label>
                          <button
                            type="button"
                            onClick={usarLogoDoCampeonato}
                            className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!campeonatoInfo?.logo_url}
                          >
                            Usar logo do campeonato
                          </button>
                          <label className="block">
                            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Imagem ate 1920x1080</span>
                            <input type="file" accept="image/*" onChange={(e) => uploadLogoCampeonato(e.target.files?.[0] || null)} className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                          </label>
                          <EditorSelect label="Ajuste imagem" value={isMvpGeralOverlay ? (config.mvpGeral?.photoFit || config.brand?.objectFit || 'cover') : (config.brand?.objectFit || 'contain')} onChange={(v) => atualizarCampo(isMvpGeralOverlay ? 'mvpGeral.photoFit' : 'brand.objectFit', v)} options={[['contain', 'Conter'], ['cover', 'Cobrir']]} />
                          <EditorSelect label="Posicao imagem" value={config.brand?.objectPosition || 'center center'} onChange={(v) => atualizarCampo('brand.objectPosition', v)} options={objectPositionOptions} />
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => atualizarCampo('brand.imageEnabled', false)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                              Ocultar imagem
                            </button>
                            <button type="button" onClick={() => atualizarCampo('brand.logoDataUrl', null)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                              Limpar arquivo
                            </button>
                          </div>
                        </>
                      ) : selectedBlock === 'text' ? (
                        <>
                          <label className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-200">
                            <input type="checkbox" checked={config.brand?.textEnabled !== false} onChange={(e) => atualizarCampo('brand.textEnabled', e.target.checked)} />
                            Mostrar texto
                          </label>
                          <EditorInput label="Nome grande" value={config.brand?.name || ''} onChange={(v) => atualizarCampo('brand.name', v)} />
                          <EditorInput label="Titulo" value={config.brand?.title || ''} onChange={(v) => atualizarCampo('brand.title', v)} />
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => atualizarCampo('brand.textEnabled', false)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                              Ocultar texto
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const novo = JSON.parse(JSON.stringify(config || {}))
                                novo.brand = novo.brand || {}
                                novo.brand.name = ''
                                novo.brand.title = ''
                                await salvarConfig(novo)
                              }}
                              className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]"
                            >
                              Limpar texto
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <EditorInput label={isMvpGeralOverlay ? 'Titulo opcional da tabela' : isTabelaOverlay ? 'Titulo da tabela' : 'Titulo da overlay'} value={isMvpGeralOverlay ? (config.mvpGeral?.tableTitle || '') : (config.title || '')} onChange={(v) => atualizarCampo(isMvpGeralOverlay ? 'mvpGeral.tableTitle' : 'title', v)} />
                        </>
                      )}
                    </div>
                  ) : null}

                  {activeAction === 'style' ? (
                    <div className="space-y-3">
                      {isBooyahsDiaOverlay ? (
                        selectedBooyahsDiaBlock === 'art' ? (
                          <div className="text-xs font-semibold leading-5 text-zinc-400">
                            Use Conteudo para trocar a imagem e Mover bloco para ajustar posicao e tamanho.
                          </div>
                        ) : (
                          <>
                            <EditorColor label="Cor destaque" value={booyahsDiaConfig.accent || '#82a82b'} onChange={(v) => atualizarCampo('booyahsDia.accent', v)} />
                            <EditorColor label="Fundo" value={booyahsDiaConfig.background || '#eef3e8'} onChange={(v) => atualizarCampo('booyahsDia.background', v)} />
                            {booyahsDiaMode !== 'vertical-list' ? (
                              <>
                                <EditorColor label="Cor fundo pontos" value={booyahsDiaConfig.statsBackground || '#ffffff'} onChange={(v) => atualizarCampo('booyahsDia.statsBackground', v)} />
                                <EditorColor label="Cor texto pontos" value={booyahsDiaConfig.statsText || '#1f2937'} onChange={(v) => atualizarCampo('booyahsDia.statsText', v)} />
                              </>
                            ) : null}
                          </>
                        )
                      ) : isCountdownOverlay ? (
                        <>
                          {selectedCountdownBlock === 'timer' ? (
                            <>
                              <EditorSelect label="Alinhamento texto" value={selectedCountdownConfig.align || 'center'} onChange={(v) => atualizarCampo('countdown.timerBlock.align', v)} options={horizontalAlignOptions} />
                              <EditorBackground label="Fundo do contador" value={selectedCountdownConfig.background || ''} onChange={(v) => atualizarCampo('countdown.timerBlock.background', v)} onImage={(file) => uploadBackgroundImage('countdown.timerBlock.background', file)} />
                              <EditorSelect label="Borda" value={selectedCountdownConfig.border || 'none'} onChange={(v) => atualizarCampo('countdown.timerBlock.border', v)} options={borderStyleOptions} />
                              <EditorSelect label="Sombra" value={selectedCountdownConfig.shadow || 'none'} onChange={(v) => atualizarCampo('countdown.timerBlock.shadow', v)} options={shadowOptions} />
                              <EditorNumber label="Canto / raio" value={selectedCountdownConfig.radius || 28} onChange={(v) => atualizarCampo('countdown.timerBlock.radius', v)} />
                              <EditorColor label="Cor titulo" value={selectedCountdownConfig.titleColor || '#ffffff'} onChange={(v) => atualizarCampo('countdown.timerBlock.titleColor', v)} />
                              <EditorColor label="Cor relogio" value={selectedCountdownConfig.clockColor || '#ffffff'} onChange={(v) => atualizarCampo('countdown.timerBlock.clockColor', v)} />
                              <EditorColor label="Cor destaque" value={selectedCountdownConfig.accentColor || '#f6c453'} onChange={(v) => atualizarCampo('countdown.timerBlock.accentColor', v)} />
                              <EditorColor label="Cor info quedas" value={selectedCountdownConfig.infoColor || 'rgba(255,255,255,0.8)'} onChange={(v) => atualizarCampo('countdown.timerBlock.infoColor', v)} />
                            </>
                          ) : null}
                          {selectedCountdownBlock === 'mapas' ? (
                            <>
                              <EditorBackground label="Fundo do bloco" value={selectedCountdownConfig.background || ''} onChange={(v) => atualizarCampo('countdown.mapasBlock.background', v)} onImage={(file) => uploadBackgroundImage('countdown.mapasBlock.background', file)} />
                              <EditorSelect label="Borda bloco" value={selectedCountdownConfig.border || 'none'} onChange={(v) => atualizarCampo('countdown.mapasBlock.border', v)} options={borderStyleOptions} />
                              <EditorSelect label="Sombra bloco" value={selectedCountdownConfig.shadow || 'none'} onChange={(v) => atualizarCampo('countdown.mapasBlock.shadow', v)} options={shadowOptions} />
                              <EditorNumber label="Canto bloco" value={selectedCountdownConfig.radius || 24} onChange={(v) => atualizarCampo('countdown.mapasBlock.radius', v)} />
                              <EditorSelect label="Borda linha" value={selectedCountdownConfig.rowBorder || 'none'} onChange={(v) => atualizarCampo('countdown.mapasBlock.rowBorder', v)} options={borderStyleOptions} />
                              <EditorColor label="Cor titulo" value={selectedCountdownConfig.titleColor || '#ffffff'} onChange={(v) => atualizarCampo('countdown.mapasBlock.titleColor', v)} />
                              <EditorBackground label="Fundo linha mapa" value={selectedCountdownConfig.rowBackground || 'rgba(255,255,255,0.95)'} onChange={(v) => atualizarCampo('countdown.mapasBlock.rowBackground', v)} onImage={(file) => uploadBackgroundImage('countdown.mapasBlock.rowBackground', file)} />
                              <EditorColor label="Texto linha mapa" value={selectedCountdownConfig.rowTextColor || '#020617'} onChange={(v) => atualizarCampo('countdown.mapasBlock.rowTextColor', v)} />
                            </>
                          ) : null}
                          {selectedCountdownBlock === 'equipes' ? (
                            <>
                              <EditorSelect label="Grade no bloco" value={selectedCountdownConfig.gridAlign || 'start'} onChange={(v) => atualizarCampo('countdown.equipesBlock.gridAlign', v)} options={gridAlignOptions} />
                              <EditorSelect label="Conteudo horizontal" value={selectedCountdownConfig.contentAlign || 'center'} onChange={(v) => atualizarCampo('countdown.equipesBlock.contentAlign', v)} options={horizontalAlignOptions} />
                              <EditorSelect label="Conteudo vertical" value={selectedCountdownConfig.verticalAlign || 'center'} onChange={(v) => atualizarCampo('countdown.equipesBlock.verticalAlign', v)} options={verticalAlignOptions} />
                              <EditorSelect label="Ajuste logo" value={selectedCountdownConfig.logoFit || 'contain'} onChange={(v) => atualizarCampo('countdown.equipesBlock.logoFit', v)} options={[['contain', 'Conter'], ['cover', 'Cobrir']]} />
                              <EditorSelect label="Posicao logo" value={selectedCountdownConfig.logoPosition || 'center center'} onChange={(v) => atualizarCampo('countdown.equipesBlock.logoPosition', v)} options={objectPositionOptions} />
                              <EditorColor label="Cor titulo" value={selectedCountdownConfig.titleColor || '#ffffff'} onChange={(v) => atualizarCampo('countdown.equipesBlock.titleColor', v)} />
                              <EditorColor label="Cor nome equipe" value={selectedCountdownConfig.textColor || '#ffffff'} onChange={(v) => atualizarCampo('countdown.equipesBlock.textColor', v)} />
                              <EditorColor label="Fundo logo" value={selectedCountdownConfig.logoBackground || 'transparent'} onChange={(v) => atualizarCampo('countdown.equipesBlock.logoBackground', v)} />
                              <EditorBackground label="Fundo card equipe" value={selectedCountdownConfig.cardStyle?.background || 'rgba(0,0,0,0.55)'} onChange={(v) => atualizarCampo('countdown.equipesBlock.cardStyle.background', v)} onImage={(file) => uploadBackgroundImage('countdown.equipesBlock.cardStyle.background', file)} />
                              <EditorSelect label="Borda card" value={selectedCountdownConfig.cardStyle?.border || 'none'} onChange={(v) => atualizarCampo('countdown.equipesBlock.cardStyle.border', v)} options={borderStyleOptions} />
                              <EditorSelect label="Sombra card" value={selectedCountdownConfig.cardStyle?.shadow || 'none'} onChange={(v) => atualizarCampo('countdown.equipesBlock.cardStyle.shadow', v)} options={shadowOptions} />
                              <EditorNumber label="Canto card" value={selectedCountdownConfig.cardStyle?.radius || 18} onChange={(v) => atualizarCampo('countdown.equipesBlock.cardStyle.radius', v)} />
                            </>
                          ) : null}
                        </>
                      ) : isBooyahOverlay ? (
                        <>
                          {selectedBooyahBlock === 'texto' ? (
                            <>
                              <EditorColor label="Cor do BOOYAH" value={selectedBooyahConfig.color || '#f6c453'} onChange={(v) => atualizarCampo('booyah.textoBlock.color', v)} />
                              <EditorColor label="Sombra do BOOYAH" value={selectedBooyahConfig.shadowColor || 'rgba(0,0,0,0.35)'} onChange={(v) => atualizarCampo('booyah.textoBlock.shadowColor', v)} />
                              <EditorNumber label="Fonte BOOYAH" value={selectedBooyahConfig.fontSize || 132} onChange={(v) => atualizarCampo('booyah.textoBlock.fontSize', v)} />
                            </>
                          ) : null}
                          {selectedBooyahBlock === 'logo' ? (
                            <>
                              <EditorBackground label="Fundo da logo" value={selectedBooyahConfig.background || ''} onChange={(v) => atualizarCampo('booyah.logoBlock.background', v)} onImage={(file) => uploadBackgroundImage('booyah.logoBlock.background', file)} />
                              <EditorSelect label="Borda da logo" value={selectedBooyahConfig.border || 'none'} onChange={(v) => atualizarCampo('booyah.logoBlock.border', v)} options={borderStyleOptions} />
                              <EditorNumber label="Canto da logo" value={selectedBooyahConfig.radius || 0} onChange={(v) => atualizarCampo('booyah.logoBlock.radius', v)} />
                            </>
                          ) : null}
                          {selectedBooyahBlock === 'equipe' ? (
                            <>
                              <EditorColor label="Cor do nome" value={selectedBooyahConfig.color || '#ffffff'} onChange={(v) => atualizarCampo('booyah.equipeBlock.color', v)} />
                              <EditorColor label="Sombra do nome" value={selectedBooyahConfig.shadowColor || 'rgba(0,0,0,0.35)'} onChange={(v) => atualizarCampo('booyah.equipeBlock.shadowColor', v)} />
                              <EditorNumber label="Fonte do nome" value={selectedBooyahConfig.fontSize || 42} onChange={(v) => atualizarCampo('booyah.equipeBlock.fontSize', v)} />
                            </>
                          ) : null}
                        </>
                      ) : selectedBlock === 'image' ? (
                        <EditorSelect label="Ajuste imagem" value={isMvpGeralOverlay ? (config.mvpGeral?.photoFit || config.brand?.objectFit || 'cover') : (config.brand?.objectFit || 'contain')} onChange={(v) => atualizarCampo(isMvpGeralOverlay ? 'mvpGeral.photoFit' : 'brand.objectFit', v)} options={[['contain', 'Conter'], ['cover', 'Cobrir']]} />
                      ) : selectedBlock === 'text' ? (
                        isMvpGeralOverlay ? (
                          <>
                            <EditorBackgroundMode label="Fundo info MVP" value={config.mvpGeral?.cardBackground || config.theme?.accent || '#5318f0'} onChange={(v) => atualizarCampo('mvpGeral.cardBackground', v)} onImage={(file) => uploadBackgroundImage('mvpGeral.cardBackground', file)} />
                            <EditorColor label="Texto info MVP" value={config.theme?.text || '#ffffff'} onChange={(v) => atualizarCampo('theme.text', v)} />
                            <EditorColor label="Destaque info MVP" value={config.theme?.primary || '#d8ab4f'} onChange={(v) => atualizarCampo('theme.primary', v)} />
                          </>
                        ) : (
                          <>
                            <EditorColor label="Cor fonte" value={config.brand?.textColor || '#ffffff'} onChange={(v) => atualizarCampo('brand.textColor', v)} />
                            <EditorSelect label="Alinhamento" value={config.brand?.align || 'left'} onChange={(v) => atualizarCampo('brand.align', v)} options={[['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]} />
                            <div className="grid grid-cols-2 gap-3">
                              <EditorNumber label="Fonte nome" value={config.brand?.nameSize || 54} onChange={(v) => atualizarCampo('brand.nameSize', v)} />
                              <EditorNumber label="Fonte titulo" value={config.brand?.titleSize || 24} onChange={(v) => atualizarCampo('brand.titleSize', v)} />
                              <EditorNumber label="Peso" value={config.brand?.fontWeight || 900} onChange={(v) => atualizarCampo('brand.fontWeight', v)} />
                              <label className="flex items-end gap-2 pb-2 text-xs font-bold uppercase text-zinc-200">
                                <input type="checkbox" checked={Boolean(config.brand?.italic)} onChange={(e) => atualizarCampo('brand.italic', e.target.checked)} />
                                Italico
                              </label>
                            </div>
                          </>
                        )
                      ) : (
                        <>
                          <VisualStyleSelector
                            selected={selectedVisualStyle}
                            onSelect={setSelectedVisualStyle}
                            targets={[
                              { id: 'primary', label: 'Cor principal' },
                              { id: 'accent', label: 'Cor destaque' },
                              { id: 'background', label: 'Fundo da tabela' },
                              { id: 'rowBackground', label: 'Fundo das linhas' },
                              { id: 'columnBackground', label: 'Fundo coluna' },
                              { id: 'columnText', label: 'Texto coluna' },
                              { id: 'rowHighlightBackground', label: 'Fundo linha destaque' },
                              { id: 'rowHighlightText', label: 'Texto linha destaque' },
                              { id: 'text', label: 'Texto das linhas' },
                              { id: 'headerText', label: 'Texto do topo' },
                              { id: 'border', label: 'Borda' },
                            ]}
                          />

                          {selectedVisualStyle === 'primary' ? (
                            <EditorColor label="Cor principal" value={config.theme.primary} onChange={(v) => atualizarCampo('theme.primary', v)} />
                          ) : null}
                          {selectedVisualStyle === 'accent' ? (
                            <EditorColor label="Cor destaque" value={config.theme.accent} onChange={(v) => atualizarCampo('theme.accent', v)} />
                          ) : null}
                          {selectedVisualStyle === 'background' ? (
                            <EditorBackgroundMode label="Fundo da tabela" value={config.theme.background || ''} onChange={(v) => atualizarCampo('theme.background', v)} onImage={(file) => uploadBackgroundImage('theme.background', file)} />
                          ) : null}
                          {selectedVisualStyle === 'rowBackground' ? (
                            <EditorBackgroundMode label="Fundo unico das linhas" value={isMvpGeralOverlay ? (config.mvpGeral?.tableBackground || config.theme.rowBackground || '') : (config.theme.rowBackground || '')} onChange={(v) => {
                              if (isMvpGeralOverlay) atualizarCampo('mvpGeral.tableBackground', v)
                              else atualizarFundoUnicoLinhas(v)
                            }} onImage={isMvpGeralOverlay ? (file) => uploadBackgroundImage('mvpGeral.tableBackground', file) : uploadFundoUnicoLinhas} />
                          ) : null}
                          {selectedVisualStyle === 'columnBackground' ? (
                            <div className="space-y-3">
                              <EditorSelect
                                label="Coluna selecionada"
                                value={selectedColumn}
                                onChange={setSelectedColumn}
                                options={orderedColumnKeys.map((key) => [key, tabelaGeralColumnLabels[key] || key])}
                              />
                              <EditorBackgroundMode label="Fundo da coluna" value={config.columnStyles?.[selectedColumn]?.background || ''} onChange={(v) => atualizarCampo(`columnStyles.${selectedColumn}.background`, v)} onImage={(file) => uploadBackgroundImage(`columnStyles.${selectedColumn}.background`, file)} />
                              <button type="button" onClick={() => atualizarCampo(`columnStyles.${selectedColumn}.background`, '')} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Limpar fundo da coluna
                              </button>
                            </div>
                          ) : null}
                          {selectedVisualStyle === 'columnText' ? (
                            <div className="space-y-3">
                              <EditorSelect
                                label="Coluna selecionada"
                                value={selectedColumn}
                                onChange={setSelectedColumn}
                                options={orderedColumnKeys.map((key) => [key, tabelaGeralColumnLabels[key] || key])}
                              />
                              <EditorColor label="Texto da coluna" value={config.columnStyles?.[selectedColumn]?.text || ''} onChange={(v) => atualizarCampo(`columnStyles.${selectedColumn}.text`, v)} />
                              <button type="button" onClick={() => atualizarCampo(`columnStyles.${selectedColumn}.text`, '')} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Limpar texto da coluna
                              </button>
                            </div>
                          ) : null}
                          {selectedVisualStyle === 'rowHighlightBackground' ? (
                            <div className="space-y-3">
                              <EditorNumber label="Linha destaque" value={selectedRow} onChange={(v) => setSelectedRow(Math.max(1, v))} />
                              <EditorBackgroundMode label="Fundo da linha" value={config.rowStyles?.[String(selectedRow)]?.background || ''} onChange={(v) => atualizarCampo(`rowStyles.${selectedRow}.background`, v)} onImage={(file) => uploadBackgroundImage(`rowStyles.${selectedRow}.background`, file)} />
                              <button type="button" onClick={() => atualizarCampo(`rowStyles.${selectedRow}.background`, '')} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Limpar fundo da linha
                              </button>
                            </div>
                          ) : null}
                          {selectedVisualStyle === 'rowHighlightText' ? (
                            <div className="space-y-3">
                              <EditorNumber label="Linha destaque" value={selectedRow} onChange={(v) => setSelectedRow(Math.max(1, v))} />
                              <EditorColor label="Texto da linha" value={config.rowStyles?.[String(selectedRow)]?.text || ''} onChange={(v) => atualizarCampo(`rowStyles.${selectedRow}.text`, v)} />
                              <button type="button" onClick={() => atualizarCampo(`rowStyles.${selectedRow}.text`, '')} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Limpar texto da linha
                              </button>
                            </div>
                          ) : null}
                          {selectedVisualStyle === 'text' ? (
                            <EditorColor label="Texto das linhas" value={config.theme.text} onChange={(v) => atualizarCampo('theme.text', v)} />
                          ) : null}
                          {selectedVisualStyle === 'headerText' ? (
                            <EditorColor label="Texto do topo" value={config.theme.headerText} onChange={(v) => atualizarCampo('theme.headerText', v)} />
                          ) : null}
                          {selectedVisualStyle === 'border' ? (
                            <EditorInput label="Borda" value={config.theme.border || ''} onChange={(v) => atualizarCampo('theme.border', v)} />
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}

                  {activeAction === 'transition' ? (
                    <div className="space-y-3">
                      <EditorSelect
                        label="Tipo de transicao"
                        value={config.animation?.transition || config.animation?.enter || 'fade'}
                        onChange={(v) => atualizarCampo('animation.transition', v)}
                        options={transitionOptions}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <EditorNumber label="Duracao ms" value={config.animation?.duration || 650} onChange={(v) => atualizarCampo('animation.duration', v)} />
                        <EditorNumber label="Delay linha ms" value={config.animation?.lineDelay || 70} onChange={(v) => atualizarCampo('animation.lineDelay', v)} />
                      </div>
                      <label className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-200">
                        <input type="checkbox" checked={Boolean(config.animation?.lineByLine)} onChange={(e) => atualizarCampo('animation.lineByLine', e.target.checked)} />
                        Transicao linha a linha
                      </label>
                      <button type="button" onClick={testarTransicao} className="inline-flex h-10 w-full items-center justify-center gap-2 border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                        <Play size={14} />
                        Testar transicao
                      </button>
                    </div>
                  ) : null}

                  {activeAction === 'table' ? (
                    <div className="space-y-3">
                      {isBooyahsDiaOverlay ? (
                        selectedBooyahsDiaBlock === 'art' ? (
                          <div className="text-xs font-semibold leading-5 text-zinc-400">
                            A imagem usa apenas posicao, tamanho e ajuste. Edite isso nas abas Mover bloco e Conteudo.
                          </div>
                        ) : booyahsDiaMode === 'vertical-list' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <EditorNumber label="Altura mapa" value={Number(booyahsDiaConfig.listRowHeight ?? 132)} onChange={(v) => atualizarCampo('booyahsDia.listRowHeight', v)} />
                            <EditorNumber label="Logo equipe" value={Number(booyahsDiaConfig.listLogoSize ?? 120)} onChange={(v) => atualizarCampo('booyahsDia.listLogoSize', v)} />
                            <EditorNumber label="Espaco" value={Number(booyahsDiaConfig.gap ?? 18)} onChange={(v) => atualizarCampo('booyahsDia.gap', v)} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <label className="col-span-2 flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-200">
                              <input type="checkbox" checked={booyahsDiaConfig.autoFit !== false} onChange={(e) => atualizarCampo('booyahsDia.autoFit', e.target.checked)} />
                              Ajustar e centralizar cards automaticamente
                            </label>
                            <EditorNumber label="Colunas" value={Number(booyahsDiaConfig.columns ?? 6)} onChange={(v) => atualizarCampo('booyahsDia.columns', v)} />
                            <EditorNumber label="Espaco" value={Number(booyahsDiaConfig.gap ?? 18)} onChange={(v) => atualizarCampo('booyahsDia.gap', v)} />
                            <EditorNumber label="Largura card" value={Number(booyahsDiaConfig.cardWidth ?? 292)} onChange={(v) => atualizarCampo('booyahsDia.cardWidth', v)} />
                            <EditorNumber label="Altura card" value={Number(booyahsDiaConfig.cardHeight ?? 470)} onChange={(v) => atualizarCampo('booyahsDia.cardHeight', v)} />
                            <EditorNumber label="Logo" value={Number(booyahsDiaConfig.logoSize ?? 150)} onChange={(v) => atualizarCampo('booyahsDia.logoSize', v)} />
                          </div>
                        )
                      ) : isMvpGeralOverlay ? (
                        selectedBlock !== 'table' ? (
                          <div className="text-xs font-semibold text-zinc-400">Selecione o bloco Tabela para editar linhas e espacamento do ranking 02-08.</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <EditorNumber label="Top total" value={config.mvpGeral?.tableMaxRows ?? config.layout?.maxRows ?? 8} onChange={(v) => atualizarConfigLocal((novo) => {
                              const maxRows = Math.max(2, v)
                              novo.mvpGeral = novo.mvpGeral || {}
                              novo.layout = novo.layout || {}
                              novo.mvpGeral.tableMaxRows = maxRows
                              novo.layout.maxRows = maxRows
                              novo.layout.rowsPerBlock = Math.max(1, maxRows - 1)
                              return novo
                            })} />
                            <EditorNumber label="Altura linha" value={config.mvpGeral?.tableRowHeight ?? config.layout?.rowHeight ?? 86} onChange={(v) => atualizarCampo('mvpGeral.tableRowHeight', v)} />
                            <EditorNumber label="Espaco linhas" value={config.mvpGeral?.tableGap ?? config.layout?.rowGap ?? 10} onChange={(v) => atualizarCampo('mvpGeral.tableGap', v)} />
                            <EditorNumber label="Fonte base" value={config.layout?.fontSize || 30} onChange={(v) => atualizarCampo('layout.fontSize', v)} />
                            <EditorNumber label="Logo" value={config.layout?.logoSize || 58} onChange={(v) => atualizarCampo('layout.logoSize', v)} />
                          </div>
                        )
                      ) : !isTabelaOverlay ? (
                        isCountdownOverlay ? (
                          <div className="space-y-3">
                            {selectedCountdownBlock === 'timer' ? (
                              <div className="grid grid-cols-2 gap-3">
                                <EditorNumber label="Padding" value={selectedCountdownConfig.padding || 48} onChange={(v) => atualizarCampo('countdown.timerBlock.padding', v)} />
                                <EditorNumber label="Raio" value={selectedCountdownConfig.radius || 28} onChange={(v) => atualizarCampo('countdown.timerBlock.radius', v)} />
                                <EditorNumber label="Fonte titulo" value={selectedCountdownConfig.titleSize || 36} onChange={(v) => atualizarCampo('countdown.timerBlock.titleSize', v)} />
                                <EditorNumber label="Fonte subtitulo" value={selectedCountdownConfig.subtitleSize || 24} onChange={(v) => atualizarCampo('countdown.timerBlock.subtitleSize', v)} />
                                <EditorNumber label="Fonte relogio" value={selectedCountdownConfig.clockSize || 160} onChange={(v) => atualizarCampo('countdown.timerBlock.clockSize', v)} />
                                <EditorNumber label="Fonte quedas" value={selectedCountdownConfig.infoSize || 24} onChange={(v) => atualizarCampo('countdown.timerBlock.infoSize', v)} />
                              </div>
                            ) : null}

                            {selectedCountdownBlock === 'equipes' ? (
                              <div className="grid grid-cols-2 gap-3">
                                <EditorNumber label="Colunas" value={selectedCountdownConfig.columns || 3} onChange={(v) => atualizarCampo('countdown.equipesBlock.columns', v)} />
                                <EditorNumber label="Espaco colunas" value={getCountdownNumber(selectedCountdownConfig, 'columnGap', 20, 'gap')} onChange={(v) => atualizarCampo('countdown.equipesBlock.columnGap', v)} />
                                <EditorNumber label="Espaco linhas" value={getCountdownNumber(selectedCountdownConfig, 'rowGap', 20, 'gap')} onChange={(v) => atualizarCampo('countdown.equipesBlock.rowGap', v)} />
                                <EditorNumber label="Largura card" value={selectedCountdownConfig.cardWidth || 190} onChange={(v) => atualizarCampo('countdown.equipesBlock.cardWidth', v)} />
                                <EditorNumber label="Altura card" value={selectedCountdownConfig.cardHeight || 150} onChange={(v) => atualizarCampo('countdown.equipesBlock.cardHeight', v)} />
                                <EditorNumber label="Raio card" value={selectedCountdownConfig.cardStyle?.radius || 18} onChange={(v) => atualizarCampo('countdown.equipesBlock.cardStyle.radius', v)} />
                                <EditorNumber label="Logo" value={selectedCountdownConfig.logoSize || 80} onChange={(v) => atualizarCampo('countdown.equipesBlock.logoSize', v)} />
                                <EditorNumber label="Fonte equipe" value={selectedCountdownConfig.fontSize || 18} onChange={(v) => atualizarCampo('countdown.equipesBlock.fontSize', v)} />
                                <EditorNumber label="Fonte titulo" value={selectedCountdownConfig.titleSize || 30} onChange={(v) => atualizarCampo('countdown.equipesBlock.titleSize', v)} />
                                <EditorNumber label="Quantidade" value={config.countdown?.maxEquipes || 18} onChange={(v) => atualizarCampo('countdown.maxEquipes', v)} />
                              </div>
                            ) : null}

                            {selectedCountdownBlock === 'mapas' ? (
                              <div className="grid grid-cols-2 gap-3">
                                <EditorNumber label="Padding" value={selectedCountdownConfig.padding || 32} onChange={(v) => atualizarCampo('countdown.mapasBlock.padding', v)} />
                                <EditorNumber label="Raio bloco" value={selectedCountdownConfig.radius || 24} onChange={(v) => atualizarCampo('countdown.mapasBlock.radius', v)} />
                                <EditorNumber label="Altura linha" value={selectedCountdownConfig.rowHeight || 62} onChange={(v) => atualizarCampo('countdown.mapasBlock.rowHeight', v)} />
                                <EditorNumber label="Espaco linhas" value={getCountdownNumber(selectedCountdownConfig, 'rowGap', 12, 'gap')} onChange={(v) => atualizarCampo('countdown.mapasBlock.rowGap', v)} />
                                <EditorNumber label="Raio linha" value={selectedCountdownConfig.rowRadius || 12} onChange={(v) => atualizarCampo('countdown.mapasBlock.rowRadius', v)} />
                                <EditorNumber label="Fonte mapa" value={selectedCountdownConfig.fontSize || 24} onChange={(v) => atualizarCampo('countdown.mapasBlock.fontSize', v)} />
                                <EditorNumber label="Fonte label" value={selectedCountdownConfig.labelSize || 16} onChange={(v) => atualizarCampo('countdown.mapasBlock.labelSize', v)} />
                                <EditorNumber label="Fonte titulo" value={selectedCountdownConfig.titleSize || 30} onChange={(v) => atualizarCampo('countdown.mapasBlock.titleSize', v)} />
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="text-xs font-semibold leading-5 text-zinc-400">
                            Esta overlay nao usa colunas. Edite titulo, imagem e cores pelas abas Conteudo e Visual.
                          </div>
                        )
                      ) : selectedBlock !== 'table' ? (
                        <div className="text-xs font-semibold text-zinc-400">Selecione o bloco Overlay para editar linhas, blocos e colunas.</div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <EditorNumber label="Limite linhas" value={config.layout.maxRows || 12} onChange={atualizarLimiteLinhasTabela} />
                            <EditorNumber label="Espaco blocos" value={config.layout.blockGap || 36} onChange={(v) => atualizarCampo('layout.blockGap', v)} />
                            <EditorNumber label="Altura linha" value={config.layout.rowHeight || 62} onChange={(v) => atualizarCampo('layout.rowHeight', v)} />
                            <EditorNumber label="Altura topo" value={config.layout.headerHeight || 72} onChange={(v) => atualizarCampo('layout.headerHeight', v)} />
                            <EditorNumber label="Fonte" value={config.layout.fontSize || 24} onChange={(v) => atualizarCampo('layout.fontSize', v)} />
                            <EditorNumber label="Logo" value={config.layout.logoSize || 44} onChange={(v) => atualizarCampo('layout.logoSize', v)} />
                            <EditorNumber label="Espaco" value={config.layout.rowGap || 5} onChange={(v) => atualizarCampo('layout.rowGap', v)} />
                          </div>

                          <div>
                            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Colunas</div>
                            <div className="grid grid-cols-2 gap-2">
                              {orderedColumnKeys.map((key) => (
                                <label key={key} className={`flex items-center gap-2 border px-3 py-2 text-xs font-bold uppercase ${selectedColumn === key ? 'border-yellow-400 bg-yellow-400/10 text-yellow-100' : 'border-white/10 bg-[#111827]'}`}>
                                  <input type="checkbox" checked={Boolean(config.columns[key])} onChange={(e) => atualizarCampo(`columns.${key}`, e.target.checked)} />
                                  <button type="button" onClick={() => setSelectedColumn(key)} className="min-w-0 flex-1 text-left uppercase">
                                    {tabelaGeralColumnLabels[key] || key}
                                  </button>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-white/10 pt-3">
                            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Ajuste da coluna</div>
                            <EditorSelect
                              label="Selecionar coluna"
                              value={selectedColumn}
                              onChange={setSelectedColumn}
                              options={orderedColumnKeys.map((key) => [key, tabelaGeralColumnLabels[key] || key])}
                            />
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => moverColuna(-1)}
                                disabled={selectedColumnIndex <= 0}
                                className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Mover esquerda
                              </button>
                              <button
                                type="button"
                                onClick={() => moverColuna(1)}
                                disabled={selectedColumnIndex >= orderedColumnKeys.length - 1}
                                className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Mover direita
                              </button>
                            </div>
                            <div className="mt-3 grid grid-cols-[1fr_88px] items-end gap-3">
                              <label className="block">
                                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Largura fixa</span>
                                <input
                                  type="range"
                                  min={0.2}
                                  max={4}
                                  step={0.05}
                                  value={selectedColumnWidth}
                                  onChange={(e) => atualizarCampo(`columnWidths.${selectedColumn}`, Number(e.target.value))}
                                  className="h-10 w-full accent-red-600"
                                />
                              </label>
                              <EditorNumber label="Valor" value={selectedColumnWidth} onChange={(v) => atualizarCampo(`columnWidths.${selectedColumn}`, Math.max(0.2, v))} />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button type="button" onClick={() => atualizarCampo(`columnStyles.${selectedColumn}`, {})} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Limpar visual
                              </button>
                              <button type="button" onClick={() => atualizarCampo(`columnWidths.${selectedColumn}`, defaultTabelaGeralColumnWidths[selectedColumn] ?? 1)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Reset largura
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="hidden">
                <div className="border border-white/10 bg-[#0b1220] p-3">
                  <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Area do campeonato</div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-200">
                      <input type="checkbox" checked={config.brand?.enabled !== false} onChange={(e) => atualizarCampo('brand.enabled', e.target.checked)} />
                      Exibir area superior
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Logo/arte ate 1920x1080</span>
                      <input type="file" accept="image/*" onChange={(e) => uploadLogoCampeonato(e.target.files?.[0] || null)} className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                    </label>

                    {config.brand?.logoDataUrl ? (
                      <button type="button" onClick={() => atualizarCampo('brand.logoDataUrl', null)} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                        Remover logo
                      </button>
                    ) : null}

                    <EditorInput label="Nome grande" value={config.brand?.name || ''} onChange={(v) => atualizarCampo('brand.name', v)} />
                    <EditorInput label="Titulo superior" value={config.brand?.title || ''} onChange={(v) => atualizarCampo('brand.title', v)} />
                    <EditorColor label="Cor texto superior" value={config.brand?.textColor || '#ffffff'} onChange={(v) => atualizarCampo('brand.textColor', v)} />

                    <div className="grid grid-cols-2 gap-3">
                      <EditorNumber label="Logo X" value={config.brand?.x || 0} onChange={(v) => atualizarCampo('brand.x', v)} />
                      <EditorNumber label="Logo Y" value={config.brand?.y || 0} onChange={(v) => atualizarCampo('brand.y', v)} />
                      <EditorNumber label="Logo largura" value={config.brand?.w || 0} onChange={(v) => atualizarCampo('brand.w', v)} />
                      <EditorNumber label="Logo altura" value={config.brand?.h || 0} onChange={(v) => atualizarCampo('brand.h', v)} />
                      <EditorNumber label="Escala logo" value={config.brand?.scale || 100} onChange={(v) => atualizarCampo('brand.scale', v)} />
                      <EditorNumber label="Opacidade logo" value={config.brand?.opacity || 100} onChange={(v) => atualizarCampo('brand.opacity', v)} />
                      <EditorNumber label="Nome fonte" value={config.brand?.nameSize || 54} onChange={(v) => atualizarCampo('brand.nameSize', v)} />
                      <EditorNumber label="Titulo fonte" value={config.brand?.titleSize || 24} onChange={(v) => atualizarCampo('brand.titleSize', v)} />
                    </div>

                    <EditorSelect label="Ajuste imagem" value={config.brand?.objectFit || 'contain'} onChange={(v) => atualizarCampo('brand.objectFit', v)} options={[['contain', 'Conter'], ['cover', 'Cobrir']]} />
                    <EditorSelect label="Alinhamento texto" value={config.brand?.align || 'left'} onChange={(v) => atualizarCampo('brand.align', v)} options={[['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]} />
                  </div>
                </div>

                <EditorInput label="Titulo" value={config.title || ''} onChange={(v) => atualizarCampo('title', v)} />
                <EditorColor label="Cor principal" value={config.theme.primary} onChange={(v) => atualizarCampo('theme.primary', v)} />
                <EditorColor label="Cor destaque" value={config.theme.accent} onChange={(v) => atualizarCampo('theme.accent', v)} />
                <EditorColor label="Cor fundo" value={config.theme.background} onChange={(v) => atualizarCampo('theme.background', v)} />
                <EditorColor label="Cor linha" value={config.theme.rowBackground} onChange={(v) => atualizarCampo('theme.rowBackground', v)} />
                <EditorColor label="Cor linha alternada" value={config.theme.rowAltBackground} onChange={(v) => atualizarCampo('theme.rowAltBackground', v)} />
                <EditorColor label="Cor texto" value={config.theme.text} onChange={(v) => atualizarCampo('theme.text', v)} />
                <EditorColor label="Cor cabecalho" value={config.theme.headerText} onChange={(v) => atualizarCampo('theme.headerText', v)} />
                <EditorInput label="Borda" value={config.theme.border || ''} onChange={(v) => atualizarCampo('theme.border', v)} />

                <div className="grid grid-cols-2 gap-3">
                  <EditorNumber label="X" value={config.layout.x} onChange={(v) => atualizarCampo('layout.x', v)} />
                  <EditorNumber label="Y" value={config.layout.y} onChange={(v) => atualizarCampo('layout.y', v)} />
                  <EditorNumber label="Largura" value={config.layout.w} onChange={(v) => atualizarCampo('layout.w', v)} />
                  <EditorNumber label="Escala tabela" value={config.layout.scale} onChange={(v) => atualizarCampo('layout.scale', v)} />
                  <EditorNumber label="Linhas" value={config.layout.maxRows} onChange={(v) => atualizarCampo('layout.maxRows', v)} />
                  <EditorNumber label="Blocos" value={config.layout.blockCount} onChange={(v) => atualizarCampo('layout.blockCount', v)} />
                  <EditorNumber label="Linhas/bloco" value={config.layout.rowsPerBlock} onChange={(v) => atualizarCampo('layout.rowsPerBlock', v)} />
                  <EditorNumber label="Espaco blocos" value={config.layout.blockGap} onChange={(v) => atualizarCampo('layout.blockGap', v)} />
                  <EditorNumber label="Altura linha" value={config.layout.rowHeight} onChange={(v) => atualizarCampo('layout.rowHeight', v)} />
                  <EditorNumber label="Altura topo" value={config.layout.headerHeight} onChange={(v) => atualizarCampo('layout.headerHeight', v)} />
                  <EditorNumber label="Fonte" value={config.layout.fontSize} onChange={(v) => atualizarCampo('layout.fontSize', v)} />
                  <EditorNumber label="Logo" value={config.layout.logoSize} onChange={(v) => atualizarCampo('layout.logoSize', v)} />
                  <EditorNumber label="Espaco" value={config.layout.rowGap} onChange={(v) => atualizarCampo('layout.rowGap', v)} />
                  <EditorNumber label="Raio" value={config.layout.radius} onChange={(v) => atualizarCampo('layout.radius', v)} />
                  <EditorNumber label="Opacidade" value={config.layout.opacity} onChange={(v) => atualizarCampo('layout.opacity', v)} />
                </div>

                <EditorSelect label="Direcao dos blocos" value={config.layout.blockDirection || 'horizontal'} onChange={(v) => atualizarCampo('layout.blockDirection', v)} options={[['horizontal', 'Horizontal'], ['vertical', 'Vertical']]} />

                <div>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Colunas</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(tabelaGeralColumnLabels).map((key) => (
                      <label key={key} className="flex items-center gap-2 border border-white/10 bg-[#0b1220] px-3 py-2 text-xs font-bold uppercase">
                        <input type="checkbox" checked={Boolean(config.columns[key])} onChange={(e) => atualizarCampo(`columns.${key}`, e.target.checked)} />
                        {tabelaGeralColumnLabels[key] || key}
                      </label>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Entrada</span>
                  <select value={config.animation.enter || 'slide'} onChange={(e) => atualizarCampo('animation.enter', e.target.value)} className="h-10 w-full border border-white/10 bg-[#0b1220] px-3 text-sm font-bold outline-none">
                    <option value="slide">Slide</option>
                    <option value="fade">Fade</option>
                    <option value="zoom">Zoom</option>
                    <option value="none">Sem animação</option>
                  </select>
                </label>

                <button disabled={salvando || !temAlteracoesPendentes} onClick={() => salvarConfig(config)} className="inline-flex h-11 w-full items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-60">
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {temAlteracoesPendentes ? 'Salvar alterações' : 'Tudo salvo'}
                </button>
                </div>

                <button disabled={salvando || !temAlteracoesPendentes} onClick={() => salvarConfig(config)} className="inline-flex h-11 w-full items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-60">
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {temAlteracoesPendentes ? 'Salvar alterações' : 'Tudo salvo'}
                </button>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}

function EditorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full border border-white/10 bg-[#0b1220] px-3 text-sm font-bold outline-none" />
    </label>
  )
}

function EditorColor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <div className="flex overflow-hidden border border-white/10 bg-[#0b1220]">
        <input
          type="color"
          value={extractColor(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-9 cursor-pointer border-0 bg-transparent p-1"
        />
        <input
          value={value ?? ''}
          placeholder="#ffffff ou rgba(...)"
          onChange={(e) => onChange(e.target.value)}
          className="h-8 min-w-0 flex-1 bg-transparent px-2 text-xs font-bold outline-none"
        />
      </div>
      <div className="mt-2 grid grid-cols-8 gap-1">
        {colorSwatches.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="h-4 border border-white/10"
            style={{ background: color }}
            title={color}
          />
        ))}
      </div>
    </label>
  )
}

function VisualStyleSelector({
  selected,
  onSelect,
  targets,
}: {
  selected: VisualStyleTarget
  onSelect: (target: VisualStyleTarget) => void
  targets: Array<{ id: VisualStyleTarget; label: string }>
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">O que voce quer editar?</div>
      <div className="grid grid-cols-2 gap-2">
        {targets.map((target) => (
          <button
            key={target.id}
            type="button"
            onClick={() => onSelect(target.id)}
            className={`min-h-9 border px-3 text-left text-[10px] font-black uppercase tracking-[0.1em] ${selected === target.id ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300'}`}
          >
            {target.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EditorBackgroundMode({
  label,
  value,
  onChange,
  onImage,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onImage: (file: File | null) => void
}) {
  const detectedMode = backgroundEditorMode(value)
  const [mode, setMode] = useState(detectedMode)
  const gradient = gradientEditorParts(value)

  useEffect(() => {
    setMode(detectedMode)
  }, [detectedMode])

  return (
    <div className="block">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="space-y-3 border border-white/10 bg-[#0b1220] p-3">
        <div className="h-8 border border-white/10" style={{ background: value || 'transparent' }} />

        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Tipo de fundo</span>
          <select
            value={mode}
            onChange={(event) => {
              const nextMode = event.target.value
              setMode(nextMode)
              if (nextMode === 'none') onChange('transparent')
              if (nextMode === 'solid') onChange(extractColor(value))
              if (nextMode === 'gradient') onChange(gradientValue(gradient.start, gradient.end, gradient.direction))
            }}
            className="h-10 w-full border border-white/10 bg-[#080d16] px-3 text-sm font-bold outline-none"
          >
            <option value="none">Sem fundo</option>
            <option value="solid">Cor solida</option>
            <option value="gradient">Degrade</option>
            <option value="image">Imagem</option>
          </select>
        </label>

        {mode === 'solid' ? (
          <EditorColor label="Cor solida" value={value || '#ffffff'} onChange={onChange} />
        ) : null}

        {mode === 'gradient' ? (
          <div className="space-y-3">
            <EditorSelect
              label="Direcao"
              value={gradient.direction}
              onChange={(direction) => onChange(gradientValue(gradient.start, gradient.end, direction))}
              options={[['90deg', 'Horizontal'], ['180deg', 'Vertical'], ['135deg', 'Diagonal']]}
            />
            <EditorColor label="Cor inicial" value={gradient.start} onChange={(start) => onChange(gradientValue(start, gradient.end, gradient.direction))} />
            <EditorColor label="Cor final" value={gradient.end} onChange={(end) => onChange(gradientValue(gradient.start, end, gradient.direction))} />
          </div>
        ) : null}

        {mode === 'image' ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Imagem</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onImage(e.target.files?.[0] || null)}
                className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white"
              />
            </label>
            <button
              type="button"
              onClick={() => onChange('transparent')}
              className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.12em]"
            >
              Limpar fundo
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function EditorBackground({
  label,
  value,
  onChange,
  onImage,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onImage: (file: File | null) => void
}) {
  return (
    <div className="block">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="space-y-3 border border-white/10 bg-[#0b1220] p-3">
        <div className="h-8 border border-white/10" style={{ background: value || 'transparent' }} />

        <EditorColor label="Cor solida" value={value?.startsWith('linear-gradient') || value?.startsWith('url(') ? '' : value} onChange={onChange} />

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChange('transparent')}
            className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.12em]"
          >
            Sem fundo
          </button>
          <button
            type="button"
            onClick={() => onChange(gradientValue('#ffffff', '#101827', '90deg'))}
            className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.12em]"
          >
            Degrade H
          </button>
          <button
            type="button"
            onClick={() => onChange(gradientValue('#ffffff', '#101827', '180deg'))}
            className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.12em]"
          >
            Degrade V
          </button>
        </div>

        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Imagem</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onImage(e.target.files?.[0] || null)}
            className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white"
          />
        </label>
      </div>
    </div>
  )
}

function EditorNumber({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <input type="number" value={Number(value || 0)} onChange={(e) => onChange(Number(e.target.value))} className="h-10 w-full border border-white/10 bg-[#0b1220] px-3 text-sm font-bold outline-none" />
    </label>
  )
}

function EditorSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full border border-white/10 bg-[#0b1220] px-3 text-sm font-bold outline-none">
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
    </label>
  )
}
