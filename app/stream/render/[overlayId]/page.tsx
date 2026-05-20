'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RankingRow, TabelaGeralOverlay, defaultTabelaGeralConfig, mergeOverlayConfig } from '@/lib/streamOverlay'

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
      .select('equipe_id, grupo_id, colocacao, abates, pontos_total')
      .eq('campeonato_id', campeonatoId),
    supabase
      .from('resultados_jogos')
      .select('equipe_id, grupo_id, posicao, abates, total_pontos')
      .eq('campeonato_id', campeonatoId),
  ])

  const equipesLista = (equipes || []) as CampeonatoEquipeRow[]
  const gruposMap = new Map(((grupos || []) as any[]).map((grupo) => [textoSeguro(grupo.id), textoSeguro(grupo.nome, '-')]))
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
  const resultados = resultadosPartidas.length > 0 ? resultadosPartidas : resultadosJogos

  const statsMap = new Map<string, { quedas: number; booyahs: number; kills: number; pontos: number; grupoId: string | null }>()
  const publicToCampeonato = new Map<string, string>()

  equipesLista.forEach((equipe) => {
    const refs = [equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean)
    refs.forEach((ref) => publicToCampeonato.set(ref, equipe.id))
  })

  resultados.forEach((resultado) => {
    const ref = textoSeguro(resultado.equipe_id)
    const campeonatoEquipeId = publicToCampeonato.get(ref) || ref
    if (!campeonatoEquipeId) return

    const atual = statsMap.get(campeonatoEquipeId) || {
      quedas: 0,
      booyahs: 0,
      kills: 0,
      pontos: 0,
      grupoId: null as string | null,
    }

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
    .sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos
      if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs
      if (b.kills !== a.kills) return b.kills - a.kills
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
}

export default function OverlayRenderPage() {
  const params = useParams<{ overlayId: string }>()
  const overlayId = params?.overlayId

  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [rows, setRows] = useState<RankingRow[]>([])

  const campeonatoId = firstRelation(overlay?.stream_projects)?.campeonato_id || null
  const template = firstRelation(overlay?.stream_overlay_templates)
  const config = useMemo(
    () => mergeOverlayConfig(defaultTabelaGeralConfig, mergeOverlayConfig(template?.config_padrao || {}, overlay?.config || {})),
    [overlay, template]
  )

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
    setRows(await carregarRankingTabelaGeral(campeonatoId))
  }, [campeonatoId])

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
        <TabelaGeralOverlay config={config} rows={rows} />
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
