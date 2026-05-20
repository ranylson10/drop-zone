'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  RankingRow,
  TabelaGeralOverlay,
  defaultTabelaGeralConfig,
  getFixedStreamOverlayTemplate,
  mergeOverlayConfig,
  sampleRankingRows,
} from '@/lib/streamOverlay'

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
  config: Record<string, unknown> | null
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
  equipe_id: string | null
  grupo_id?: string | null
  colocacao?: number | null
  posicao?: number | null
  abates?: number | null
  pontos_total?: number | null
  total_pontos?: number | null
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

async function carregarRankingTabelaGeral(campeonatoId: string, liveRows: ResultadoRow[] = []): Promise<RankingRow[]> {
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
    supabase.from('resultados_partidas_equipes').select('equipe_id, grupo_id, colocacao, abates, pontos_total').eq('campeonato_id', campeonatoId),
    supabase.from('resultados_jogos').select('equipe_id, grupo_id, posicao, abates, total_pontos').eq('campeonato_id', campeonatoId),
  ])

  const equipesLista = (equipes || []) as CampeonatoEquipeRow[]
  const gruposMap = new Map(((grupos || []) as Array<{ id?: unknown; nome?: unknown }>).map((grupo) => [textoSeguro(grupo.id), textoSeguro(grupo.nome, '-')]))
  const resultadosPartidas = ((partidasRes.data || []) as ResultadoRow[]).map((row) => ({
    equipe_id: row.equipe_id,
    grupo_id: row.grupo_id,
    colocacao: row.colocacao,
    abates: row.abates,
    pontos: row.pontos_total,
  }))
  const resultadosJogos = ((jogosRes.data || []) as ResultadoRow[]).map((row) => ({
    equipe_id: row.equipe_id,
    grupo_id: row.grupo_id,
    colocacao: row.posicao,
    abates: row.abates,
    pontos: row.total_pontos,
  }))
  const resultadosLive = (liveRows || []).map((row) => ({
    equipe_id: row.equipe_id,
    grupo_id: row.grupo_id,
    colocacao: row.posicao,
    abates: row.abates,
    pontos: row.total_pontos,
  }))
  const resultados = resultadosLive.length > 0 ? resultadosLive : resultadosPartidas.length > 0 ? resultadosPartidas : resultadosJogos
  const statsMap = new Map<string, { quedas: number; booyahs: number; kills: number; pontos: number; grupoId: string | null }>()
  const publicToCampeonato = new Map<string, string>()

  equipesLista.forEach((equipe) => {
    ;[equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean).forEach((ref) => publicToCampeonato.set(ref, equipe.id))
  })

  resultados.forEach((resultado) => {
    const ref = textoSeguro(resultado.equipe_id)
    const campeonatoEquipeId = publicToCampeonato.get(ref) || ref
    if (!campeonatoEquipeId) return

    const atual = statsMap.get(campeonatoEquipeId) || { quedas: 0, booyahs: 0, kills: 0, pontos: 0, grupoId: null as string | null }
    atual.quedas += 1
    atual.kills += numero(resultado.abates)
    atual.pontos += numero(resultado.pontos)
    if (numero(resultado.colocacao) === 1) atual.booyahs += 1
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
    .sort((a, b) => b.pontos - a.pontos || b.booyahs - a.booyahs || b.kills - a.kills || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export default function FixedOverlayRenderPage() {
  const params = useParams<{ key: string; overlayType: string }>()
  const streamKey = params?.key
  const overlayType = params?.overlayType
  const fixedTemplate = getFixedStreamOverlayTemplate(overlayType)

  const [project, setProject] = useState<Projeto | null>(null)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [rows, setRows] = useState<RankingRow[]>([])
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

    setOverlay((overlayData as Overlay) || null)

    if (projectData.campeonato_id) {
      const liveRows = ((overlayData as Overlay | null)?.config as any)?.__liveResults?.rows || []
      setRows(await carregarRankingTabelaGeral(projectData.campeonato_id, liveRows))
    } else {
      setRows(sampleRankingRows(Number(fixedTemplate.config_padrao.layout?.maxRows || 8)))
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados_partidas_equipes', filter: `campeonato_id=eq.${project.campeonato_id}` }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados_jogos', filter: `campeonato_id=eq.${project.campeonato_id}` }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_project_overlays', filter: `project_id=eq.${project.id}` }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campeonato_equipes', filter: `campeonato_id=eq.${project.campeonato_id}` }, carregar)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [project?.campeonato_id, carregar])

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
        <TabelaGeralOverlay config={config} rows={rows.length > 0 ? rows : sampleRankingRows(Number(config.layout?.maxRows || 8))} />
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
