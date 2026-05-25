'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RankingRow, defaultTabelaGeralConfig, mergeOverlayConfig } from '@/lib/streamOverlay'
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
  stream_projects?: { campeonato_id: string | null } | { campeonato_id: string | null }[] | null
  stream_overlay_templates?: { config_padrao: any } | { config_padrao: any }[] | null
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
  quedas?: string[] | null
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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function rankingSort(a: RankingRow, b: RankingRow) {
  return b.pontos - a.pontos || b.booyahs - a.booyahs || b.kills - a.kills || a.nome.localeCompare(b.nome, 'pt-BR')
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

function resultadoQuedaKey(resultado: ResultadoRow, index: number) {
  return textoSeguro(resultado.partida_id)
    || [textoSeguro(resultado.jogo_id), textoSeguro(resultado.mapa)].filter(Boolean).join(':')
    || textoSeguro(resultado.created_at)
    || textoSeguro(resultado.id)
    || `resultado-${index}`
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
  return rankingAtual.map((row, index) => ({ ...row, variacao: (posicaoAnterior.get(row.id) || index + 1) - (index + 1) }))
}

function montarRowsBooyahsDia(jogo: JogoRow | null, resultados: ResultadoRow[], equipesLista: CampeonatoEquipeRow[], publicToCampeonato: Map<string, string>) {
  const equipesMap = new Map(equipesLista.map((equipe) => [equipe.id, equipe]))
  const mapasDoJogo = Array.isArray(jogo?.quedas) ? jogo.quedas.map((mapa) => getQuedaMapaNome(mapa)).filter(Boolean) : []
  const quantidade = mapasDoJogo.length > 0 ? mapasDoJogo.length : Math.max(Number(jogo?.quantidade_partidas || 0), 1)
  const fallbackMapas = ['Bermuda', 'Purgatorio', 'Kalahari', 'Alpine', 'Nova Terra', 'Solara']

  return Array.from({ length: quantidade }, (_, index) => {
    const mapaNome = mapasDoJogo[index] || fallbackMapas[index % fallbackMapas.length]
    const mapaKey = normalizeFreeFireMapName(mapaNome)
    const resultadosDaQueda = resultados.filter((row) => {
      if (jogo?.id && textoSeguro(row.jogo_id) !== jogo.id) return false
      return getResultadoMapaKey(row) === mapaKey
    })
    const vencedor = resultadosDaQueda.find((row) => numero(row.colocacao ?? row.posicao) === 1)
      || [...resultadosDaQueda].sort((a, b) => numero(b.pontos ?? b.pontos_total ?? b.total_pontos) - numero(a.pontos ?? a.pontos_total ?? a.total_pontos))[0]
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
      pontos: numero(vencedor?.pontos ?? vencedor?.pontos_total ?? vencedor?.total_pontos),
      mapa: mapa?.nome || mapaNome,
      mapaImagem: mapa?.url || null,
      quedaNumero: index + 1,
      concluida: Boolean(vencedor),
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
    supabase
      .from('resultados_partidas_equipes')
      .select('id, equipe_id, grupo_id, colocacao, abates, pontos_total, created_at')
      .eq('campeonato_id', campeonatoId),
    supabase
      .from('resultados_jogos')
      .select('id, jogo_id, partida_id, equipe_id, grupo_id, mapa, posicao, abates, total_pontos, created_at')
      .eq('campeonato_id', campeonatoId),
  ])

  const equipesLista = (equipes || []) as CampeonatoEquipeRow[]
  const gruposMap = new Map(((grupos || []) as any[]).map((grupo) => [textoSeguro(grupo.id), textoSeguro(grupo.nome, '-')]))
  const resultadosPartidas = ((partidasRes.data || []) as ResultadoRow[]).map((row) => ({
    id: row.id,
    equipe_id: row.equipe_id,
    grupo_id: row.grupo_id,
    colocacao: row.colocacao,
    abates: row.abates,
    pontos: row.pontos_total,
    created_at: row.created_at,
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
    const refs = [equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean)
    refs.forEach((ref) => publicToCampeonato.set(ref, equipe.id))
  })

  return montarRankingComVariacao(equipesLista, gruposMap, publicToCampeonato, resultados)
}

async function carregarBooyahsDia(campeonatoId: string, config?: Record<string, any> | null): Promise<{ rows: RankingRow[]; context: StreamOverlayContext }> {
  const [{ data: equipes }, { data: resultados }, { data: jogos }, { data: campeonato }] = await Promise.all([
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
    supabase.from('campeonatos').select('id, nome, logo_url').eq('id', campeonatoId).maybeSingle(),
  ])

  const equipesLista = (equipes || []) as CampeonatoEquipeRow[]
  const publicToCampeonato = new Map<string, string>()
  equipesLista.forEach((equipe) => {
    const refs = [equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean)
    refs.forEach((ref) => publicToCampeonato.set(ref, equipe.id))
  })
  const resultadosLista = [...((resultados || []) as ResultadoRow[]), ...resultadosAoVivo(config)]
  const jogo = ((jogos || []) as JogoRow[]).find((item) => resultadosLista.some((row) => textoSeguro(row.jogo_id) === item.id)) || ((jogos || []) as JogoRow[])[0] || null
  const rows = montarRowsBooyahsDia(jogo, resultadosLista, equipesLista, publicToCampeonato)

  return {
    rows,
    context: {
      jogo,
      mapas: rows.map((row) => textoSeguro(row.mapa)).filter(Boolean),
      quantidadePartidas: rows.length,
      campeonato: (campeonato as any) || null,
    },
  }
}

export default function OverlayRenderPage() {
  const params = useParams<{ overlayId: string }>()
  const overlayId = params?.overlayId

  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [rows, setRows] = useState<RankingRow[]>([])
  const [overlayContext, setOverlayContext] = useState<StreamOverlayContext>({})

  const campeonatoId = firstRelation(overlay?.stream_projects)?.campeonato_id || null
  const template = firstRelation(overlay?.stream_overlay_templates)
  const config = useMemo(
    () => mergeOverlayConfig(defaultTabelaGeralConfig, mergeOverlayConfig(template?.config_padrao || {}, overlay?.config || {})),
    [overlay, template]
  )
  const overlayDefinition = getStreamOverlayDefinition(overlay?.template_id)
  const RenderOverlay = overlayDefinition?.Render

  const carregarOverlay = useCallback(async () => {
    if (!overlayId) return

    const { data } = await supabase
      .from('stream_project_overlays')
      .select(`
        id,
        project_id,
        template_id,
        nome,
        config,
        visivel,
        stream_projects ( campeonato_id ),
        stream_overlay_templates ( config_padrao )
      `)
      .eq('id', overlayId)
      .maybeSingle()

    setOverlay((data as unknown as Overlay) || null)
  }, [overlayId])

  const carregarRanking = useCallback(async () => {
    if (!campeonatoId) return
    if (overlay?.template_id === 'booyahs-do-dia' || (overlay?.template_id === 'booyah' && config.booyahsDia)) {
      const data = await carregarBooyahsDia(campeonatoId, config)
      setRows(data.rows)
      setOverlayContext(data.context)
      return
    }

    setRows(await carregarRankingTabelaGeral(campeonatoId))
    setOverlayContext({})
  }, [campeonatoId, overlay?.template_id, config])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarOverlay()
  }, [carregarOverlay])

  useEffect(() => {
    carregarRanking()
  }, [carregarRanking])

  useEffect(() => {
    if (!overlay?.id) return

    const channel = supabase
      .channel(`overlay-render-${overlay.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_project_overlays', filter: `id=eq.${overlay.id}` }, (payload) => {
        if (payload.new) setOverlay((prev) => ({ ...(prev || {}), ...(payload.new as any) } as Overlay))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [overlay?.id])

  useEffect(() => {
    if (!campeonatoId) return

    const channel = supabase
      .channel(`overlay-ranking-${campeonatoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados_partidas_equipes', filter: `campeonato_id=eq.${campeonatoId}` }, carregarRanking)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados_jogos', filter: `campeonato_id=eq.${campeonatoId}` }, carregarRanking)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campeonato_equipes', filter: `campeonato_id=eq.${campeonatoId}` }, carregarRanking)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [campeonatoId, carregarRanking])

  if (!overlay || !overlay.visivel) {
    return (
      <>
        <ObsTransparentPageStyle />
        <main className="h-screen w-screen overflow-hidden bg-transparent" />
      </>
    )
  }

  return (
    <>
      <ObsTransparentPageStyle />
      <main className="relative h-[1080px] w-[1920px] overflow-hidden bg-transparent">
        {RenderOverlay ? (
          <RenderOverlay
            config={config}
            rows={rows}
            templateId={overlay.template_id}
            overlayName={overlay.nome}
            context={overlayContext}
          />
        ) : null}
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
