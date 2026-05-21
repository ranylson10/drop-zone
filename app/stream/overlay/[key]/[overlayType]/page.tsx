'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  RankingRow,
  defaultTabelaGeralConfig,
  getFixedStreamOverlayTemplate,
  mergeOverlayConfig,
  sampleRankingRows,
} from '@/lib/streamOverlay'
import { getStreamOverlayDefinition } from '@/app/components/stream/overlays/registry'
import type { StreamOverlayContext } from '@/app/components/stream/overlays/types'

type Projeto = {
  id: string
  campeonato_id: string | null
  stream_key: string
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
  colocacao?: number | null
  posicao?: number | null
  abates?: number | null
  pontos_total?: number | null
  total_pontos?: number | null
}

type MvpRow = {
  id?: string | null
  campeonato_id?: string | null
  fase_id?: string | null
  jogo_id?: string | null
  partida_id?: string | null
  mapa?: string | null
  campeonato_equipe_id?: string | null
  equipe_id?: string | null
  equipe_avulsa_id?: string | null
  nick_snapshot?: string | null
  uid_jogo_snapshot?: string | null
  abates?: number | null
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

  let query = supabase
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
  const statsMap = new Map<string, { quedas: number; booyahs: number; kills: number; pontos: number; grupoId: string | null }>()

  resultados.forEach((resultado) => {
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
    .sort((a, b) => b.pontos - a.pontos || b.booyahs - a.booyahs || b.kills - a.kills || a.nome.localeCompare(b.nome, 'pt-BR'))
}

function montarRowsMvp(rows: MvpRow[], equipesLista: CampeonatoEquipeRow[], gruposMap: Map<string, string>): RankingRow[] {
  const equipesMap = new Map(equipesLista.map((equipe) => [equipe.id, equipe]))
  const acumulado = new Map<string, RankingRow & { partidasSet: Set<string> }>()

  rows.forEach((row) => {
    const nome = textoSeguro(row.nick_snapshot || row.uid_jogo_snapshot, 'SEM NICK')
    const equipeId = textoSeguro(row.campeonato_equipe_id || row.equipe_id)
    const equipe = equipeId ? equipesMap.get(equipeId) : null
    const key = `${textoSeguro(row.uid_jogo_snapshot || row.nick_snapshot)}::${equipeId}`
    if (!key.trim()) return

    const atual = acumulado.get(key) || {
      id: key,
      nome,
      tag: equipe ? getEquipeTag(equipe) : null,
      logo: equipe ? getEquipeLogo(equipe) : null,
      grupo: equipe?.grupo_id ? gruposMap.get(textoSeguro(equipe.grupo_id)) || '-' : '-',
      quedas: 0,
      booyahs: 0,
      kills: 0,
      pontos: 0,
      partidasSet: new Set<string>(),
    }

    atual.kills += numero(row.abates)
    atual.pontos = atual.kills
    const partidaKey = textoSeguro(row.partida_id || `${row.jogo_id || ''}:${row.mapa || ''}`)
    if (partidaKey) atual.partidasSet.add(partidaKey)
    atual.quedas = atual.partidasSet.size
    acumulado.set(key, atual)
  })

  return Array.from(acumulado.values())
    .map(({ partidasSet, ...row }) => row)
    .sort((a, b) => b.kills - a.kills || b.quedas - a.quedas || a.nome.localeCompare(b.nome, 'pt-BR'))
}

async function carregarDadosOverlay(campeonatoId: string, templateId: string, config?: Record<string, any> | null): Promise<RankingRow[]> {
  const [{ equipesLista, gruposMap, jogosLista, publicToCampeonato }, { data: resultadosData }, { data: mvpData }] = await Promise.all([
    carregarBaseCampeonato(campeonatoId),
    supabase
      .from('resultados_jogos')
      .select('id, campeonato_id, fase_id, jogo_id, equipe_id, grupo_id, mapa, posicao, abates, total_pontos')
      .eq('campeonato_id', campeonatoId),
    supabase
      .from('resultados_mvp')
      .select('id, campeonato_id, fase_id, jogo_id, partida_id, mapa, campeonato_equipe_id, equipe_id, equipe_avulsa_id, nick_snapshot, uid_jogo_snapshot, abates')
      .eq('campeonato_id', campeonatoId),
  ])

  const resultados = (resultadosData || []) as ResultadoRow[]
  const mvpRows = (mvpData || []) as MvpRow[]
  const jogo = escolherJogo(jogosLista, resultados, config)
  const partida = jogo?.id ? await carregarPartidaSelecionada(jogo.id, config) : null
  const mapaAlvo = mapaConfigurado(config) || textoSeguro(partida?.mapa || jogo?.mapa)
  const grupoAlvo = grupoConfigurado(config) || textoSeguro(jogo?.grupo_id)

  if (templateId === 'tela-de-espera') {
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

  if (templateId === 'booyah') {
    const rowsDaQueda = resultados.filter((row) => {
      if (jogo?.id && textoSeguro(row.jogo_id) !== jogo.id) return false
      if (mapaAlvo && textoSeguro(row.mapa).toLowerCase() !== mapaAlvo.toLowerCase()) return false
      return true
    })
    return montarRowsEquipes(equipesLista, gruposMap, publicToCampeonato, rowsDaQueda)
      .filter((row) => row.booyahs > 0)
      .slice(0, 1)
  }

  if (templateId === 'tabela-da-queda') {
    const rowsDaQueda = resultados.filter((row) => {
      if (jogo?.id && textoSeguro(row.jogo_id) !== jogo.id) return false
      if (mapaAlvo && textoSeguro(row.mapa).toLowerCase() !== mapaAlvo.toLowerCase()) return false
      return true
    })
    return montarRowsEquipes(equipesLista, gruposMap, publicToCampeonato, rowsDaQueda)
  }

  if (templateId === 'tabela-do-dia') {
    const rowsDoJogo = resultados.filter((row) => !jogo?.id || textoSeguro(row.jogo_id) === jogo.id)
    return montarRowsEquipes(equipesLista, gruposMap, publicToCampeonato, rowsDoJogo)
  }

  if (templateId === 'mvp-da-queda') {
    const rowsDaQueda = mvpRows.filter((row) => {
      if (jogo?.id && textoSeguro(row.jogo_id) !== jogo.id) return false
      if (partida?.id && textoSeguro(row.partida_id) !== partida.id) return false
      if (!partida?.id && mapaAlvo && textoSeguro(row.mapa).toLowerCase() !== mapaAlvo.toLowerCase()) return false
      return true
    })
    return montarRowsMvp(rowsDaQueda, equipesLista, gruposMap)
  }

  if (templateId === 'mvp-do-dia') {
    const rowsDoJogo = mvpRows.filter((row) => !jogo?.id || textoSeguro(row.jogo_id) === jogo.id)
    return montarRowsMvp(rowsDoJogo, equipesLista, gruposMap)
  }

  if (templateId === 'mvp-geral') {
    return montarRowsMvp(mvpRows, equipesLista, gruposMap)
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

  const grupoAlvo = grupoConfigurado(config) || textoSeguro(jogo?.grupo_id)
  const equipesDoJogo = equipesLista.filter((equipe) => {
    if (idsDoJogo.size > 0) return idsDoJogo.has(equipe.id)
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
  const fixedTemplate = getFixedStreamOverlayTemplate(overlayType)
  const overlayDefinition = getStreamOverlayDefinition(fixedTemplate?.id || overlayType)

  const [project, setProject] = useState<Projeto | null>(null)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [rows, setRows] = useState<RankingRow[]>([])
  const [overlayContext, setOverlayContext] = useState<StreamOverlayContext>({})
  const [loaded, setLoaded] = useState(false)
  const [genericOnly, setGenericOnly] = useState(false)

  const config = useMemo(() => {
    const fallbackConfig = fixedTemplate?.config_padrao || mergeOverlayConfig(defaultTabelaGeralConfig, { title: String(overlayType || 'OVERLAY').toUpperCase() })
    return mergeOverlayConfig(defaultTabelaGeralConfig, mergeOverlayConfig(fallbackConfig, overlay?.config || {}))
  }, [fixedTemplate, overlay, overlayType])

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
      if (fixedTemplate.id === 'countdown') {
        const countdownData = await carregarCountdownContext(projectData.campeonato_id, overlayRow?.config)
        setRows(countdownData.rows)
        setOverlayContext(countdownData.context)
      } else {
        setRows(await carregarDadosOverlay(projectData.campeonato_id, fixedTemplate.id, overlayRow?.config))
        setOverlayContext({})
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
        <main className="flex h-[1080px] w-[1920px] items-center justify-center overflow-hidden bg-transparent">
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
      <main className="relative h-[1080px] w-[1920px] overflow-hidden bg-transparent">
        {overlayDefinition ? (
          <overlayDefinition.Render
            config={config}
            rows={rows.length > 0 ? rows : sampleRankingRows(Number(config.layout?.maxRows || 8))}
            templateId={fixedTemplate?.id || String(overlayType || '')}
            overlayName={fixedTemplate?.nome || String(overlayType || 'Overlay')}
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
