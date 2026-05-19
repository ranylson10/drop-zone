'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Overlay = {
  id: string
  project_id: string
  template_id: string
  nome: string
  config: any
  visivel: boolean
  stream_projects?: {
    campeonato_id: string | null
  } | null
  stream_overlay_templates?: {
    config_padrao: any
  } | null
}

type RankingRow = {
  id: string
  nome: string
  tag: string | null
  logo: string | null
  grupo: string | null
  quedas: number
  booyahs: number
  kills: number
  pontos: number
}

function mergeConfig(base: any, override: any) {
  return {
    ...base,
    ...(override || {}),
    theme: { ...(base?.theme || {}), ...(override?.theme || {}) },
    layout: { ...(base?.layout || {}), ...(override?.layout || {}) },
    columns: { ...(base?.columns || {}), ...(override?.columns || {}) },
    animation: { ...(base?.animation || {}), ...(override?.animation || {}) },
  }
}

function getEquipeNome(item: any) {
  return item?.equipes?.nome || item?.equipe_avulsa?.nome || item?.nome_exibicao || item?.nome || `Equipe ${String(item?.id || '').slice(0, 6)}`
}

function getEquipeTag(item: any) {
  return item?.equipes?.tag || item?.equipe_avulsa?.tag || null
}

function getEquipeLogo(item: any) {
  return item?.equipes?.logo_url || item?.equipe_avulsa?.logo_url || null
}

export default function OverlayRenderPage() {
  const params = useParams<{ overlayId: string }>()
  const overlayId = params?.overlayId

  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [rows, setRows] = useState<RankingRow[]>([])

  const config = useMemo(() => mergeConfig(overlay?.stream_overlay_templates?.config_padrao || {}, overlay?.config || {}), [overlay])

  const carregar = useCallback(async () => {
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

    setOverlay(data as Overlay | null)

    const campeonatoId = data?.stream_projects?.campeonato_id
    if (!campeonatoId) return

    const { data: equipes } = await supabase
      .from('campeonato_equipes')
      .select(`
        id,
        nome_exibicao,
        grupo_id,
        status,
        tipo_origem,
        equipes ( nome, tag, logo_url ),
        equipe_avulsa:equipes_avulsas_campeonato ( nome, tag, logo_url )
      `)
      .eq('campeonato_id', campeonatoId)
      .limit(80)

    const { data: jogoEquipes } = await supabase
      .from('jogo_equipes')
      .select('campeonato_equipe_id')
      .eq('campeonato_id', campeonatoId)

    const { data: jogadores } = await supabase
      .from('confronto_quedas_jogadores')
      .select('kills, campeonato_equipe_id')
      .eq('campeonato_id', campeonatoId)

    const baseRows = (equipes || []).map((eq: any) => {
      const kills = (jogadores || [])
        .filter((j: any) => j.campeonato_equipe_id === eq.id)
        .reduce((acc: number, j: any) => acc + Number(j.kills || 0), 0)

      const quedas = (jogoEquipes || []).filter((j: any) => j.campeonato_equipe_id === eq.id).length
      const booyahs = 0
      const pontos = kills + booyahs * 12

      return {
        id: eq.id,
        nome: getEquipeNome(eq),
        tag: getEquipeTag(eq),
        logo: getEquipeLogo(eq),
        grupo: eq.grupo_id ? String(eq.grupo_id).slice(0, 4).toUpperCase() : '-',
        quedas,
        booyahs,
        kills,
        pontos,
      }
    })

    baseRows.sort((a, b) => b.pontos - a.pontos || b.kills - a.kills)
    setRows(baseRows)
  }, [overlayId])

  useEffect(() => {
    carregar()
  }, [carregar])

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

  if (!overlay || !overlay.visivel) {
    return <main className="h-screen w-screen overflow-hidden bg-transparent" />
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-transparent">
      <TabelaGeral config={config} rows={rows} />
    </main>
  )
}

function TabelaGeral({ config, rows }: { config: any; rows: RankingRow[] }) {
  const maxRows = Number(config.layout?.maxRows || 12)
  const lista = rows.slice(0, maxRows)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-transparent">
      <div
        className="absolute"
        style={{
          left: Number(config.layout?.x || 180),
          top: Number(config.layout?.y || 150),
          width: Number(config.layout?.w || 1560),
          color: config.theme?.text || '#101020',
          fontSize: Number(config.layout?.fontSize || 24),
        }}
      >
        <div style={{ background: config.theme?.primary || '#3d2378', color: config.theme?.headerText || '#ffffff' }} className="mb-2 px-6 py-3 text-center font-black uppercase tracking-[0.18em]">
          {config.title || 'RESULTADO GERAL'}
        </div>

        <div className="space-y-1">
          {lista.map((row, index) => (
            <div
              key={row.id}
              className="grid items-center gap-2 px-3 font-black uppercase"
              style={{
                gridTemplateColumns: '70px 90px 1fr 100px 90px 100px 100px 100px',
                height: Number(config.layout?.rowHeight || 58),
                background: config.theme?.rowBackground || 'rgba(215, 207, 240, 0.90)',
                borderRadius: Number(config.layout?.radius || 0),
              }}
            >
              {config.columns?.rank ? <div className="text-center">{index + 1}</div> : null}
              {config.columns?.logo ? (
                <div className="mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
                  {row.logo ? <img src={row.logo} alt={row.nome} className="h-full w-full object-contain" /> : <span>{row.nome.charAt(0)}</span>}
                </div>
              ) : null}
              {config.columns?.nome ? <div className="truncate">{row.nome}</div> : null}
              {config.columns?.tag ? <div className="text-center">{row.tag || '-'}</div> : null}
              {config.columns?.grupo ? <div className="text-center">{row.grupo || '-'}</div> : null}
              {config.columns?.booyahs ? <div className="text-center">{row.booyahs}</div> : null}
              {config.columns?.kills ? <div className="text-center">{row.kills}</div> : null}
              {config.columns?.pontos ? <div className="text-center">{row.pontos}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
