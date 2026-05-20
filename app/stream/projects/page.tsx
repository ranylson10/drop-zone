'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fixedStreamOverlayTemplates, getFixedStreamOverlayTemplate } from '@/lib/streamOverlay'
import { Copy, ExternalLink, Gamepad2, Loader2, MonitorUp, Plus, Radio, SlidersHorizontal } from 'lucide-react'

type Campeonato = {
  id: string
  nome: string | null
}

type Projeto = {
  id: string
  campeonato_id: string | null
  nome: string
  stream_key: string
  ativo: boolean
}

type OverlayProjeto = {
  id: string
  project_id: string
  nome: string
  template_id: string
  visivel: boolean
  ordem: number
}

export default function StreamProjectsPage() {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [overlays, setOverlays] = useState<OverlayProjeto[]>([])
  const [campeonatoId, setCampeonatoId] = useState('')
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const origem = typeof window !== 'undefined' ? window.location.origin : ''

  async function carregar() {
    setLoading(true)

    const [campRes, projRes, overlayRes] = await Promise.all([
      supabase.from('campeonatos').select('id, nome').order('created_at', { ascending: false }).limit(80),
      supabase.from('stream_projects').select('id, campeonato_id, nome, stream_key, ativo').order('created_at', { ascending: false }),
      supabase.from('stream_project_overlays').select('id, project_id, nome, template_id, visivel, ordem').order('ordem', { ascending: true }),
    ])

    if (!campRes.error) setCampeonatos((campRes.data || []) as Campeonato[])
    if (!projRes.error) setProjetos((projRes.data || []) as Projeto[])
    if (!overlayRes.error) setOverlays((overlayRes.data || []) as OverlayProjeto[])

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [])

  async function criarProjeto() {
    if (!campeonatoId) {
      alert('Selecione um campeonato')
      return
    }

    const camp = campeonatos.find((item) => item.id === campeonatoId)

    setCriando(true)

    const { data, error } = await supabase
      .from('stream_projects')
      .insert({
        campeonato_id: campeonatoId,
        nome: nomeProjeto.trim() || `Transmissão - ${camp?.nome || 'Campeonato'}`,
        ativo: true,
      })
      .select('id, stream_key')
      .single()

    setCriando(false)

    if (error) {
      console.error(error)
      alert(`Erro ao criar projeto: ${error.message}`)
      return
    }

    await supabase
      .from('stream_scoreboard_state')
      .insert({
        project_id: data.id,
        nome_a: 'Equipe A',
        nome_b: 'Equipe B',
        tag_a: 'A',
        tag_b: 'B',
        score_a: 0,
        score_b: 0,
        md: 1,
        rodada: 'Rodada 1',
        status: 'pre_jogo',
        visivel: true,
      })

    setNomeProjeto('')
    setCampeonatoId('')
    await carregar()
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    alert('Copiado')
  }

  return (
    <main className="min-h-screen bg-[#080d16] p-5 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">Stream Studio</div>
            <h1 className="mt-2 text-3xl font-black uppercase">Projetos de transmissão</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-400">
              Gere uma chave por campeonato para o produtor usar no painel do OBS.
            </p>
          </div>
          <button onClick={carregar} className="h-11 border border-white/10 bg-white/5 px-4 text-[11px] font-black uppercase tracking-[0.16em]">
            Atualizar
          </button>
        </div>

        <div className="mb-6 border border-white/10 bg-[#111827] p-5">
          <div className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Novo projeto</div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select value={campeonatoId} onChange={(e) => setCampeonatoId(e.target.value)} className="h-12 border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none">
              <option value="">Selecione o campeonato</option>
              {campeonatos.map((camp) => (
                <option key={camp.id} value={camp.id}>{camp.nome || camp.id}</option>
              ))}
            </select>
            <input value={nomeProjeto} onChange={(e) => setNomeProjeto(e.target.value)} placeholder="Nome do projeto, opcional" className="h-12 border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none" />
            <button onClick={criarProjeto} disabled={criando} className="inline-flex h-12 items-center justify-center gap-2 border border-red-600 bg-red-600 px-5 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-60">
              {criando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Criar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="grid gap-4">
            {projetos.map((projeto) => (
              <div key={projeto.id} className="border border-white/10 bg-[#111827] p-5">
                {(() => {
                  const overlaysDoProjeto = overlays.filter((overlay) => overlay.project_id === projeto.id)
                  const overlayLinks = fixedStreamOverlayTemplates.map((template, index) => {
                    const saved = overlaysDoProjeto.find((overlay) => overlay.template_id === template.id)
                    return {
                      id: saved?.id || template.id,
                      nome: saved?.nome || template.nome,
                      template_id: template.id,
                      slug: template.slug,
                      visivel: saved?.visivel ?? true,
                      ordem: saved?.ordem ?? index + 1,
                      fixed: true,
                    }
                  })
                  const extraOverlayLinks = overlaysDoProjeto
                    .filter((overlay) => !getFixedStreamOverlayTemplate(overlay.template_id))
                    .map((overlay) => ({ ...overlay, slug: '', fixed: false }))
                  const studioUrl = `${origem}/stream/studio/${projeto.stream_key}`
                  const controllerUrl = `${origem}/stream/controller?key=${projeto.stream_key}`
                  const scoreboardUrl = `${origem}/stream/overlay/${projeto.stream_key}/scoreboard`

                  return (
                    <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xl font-black uppercase">
                      <Radio size={19} className="text-red-500" />
                      {projeto.nome}
                    </div>
                    <div className="mt-2 break-all text-xs font-semibold text-zinc-400">
                      Chave: {projeto.stream_key}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copiar(projeto.stream_key)} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                      <Copy size={14} />
                      Copiar chave
                    </button>
                    <button onClick={() => copiar(studioUrl)} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                      <Copy size={14} />
                      Link controlador
                    </button>
                    <Link href={`/stream/controller?key=${projeto.stream_key}`} target="_blank" className="inline-flex h-10 items-center gap-2 border border-yellow-500 bg-yellow-500 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#101827]">
                      <Gamepad2 size={14} />
                      Controlador OBS
                    </Link>
                    <Link href={`/stream/studio/${projeto.stream_key}`} target="_blank" className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                      <ExternalLink size={14} />
                      Controlador live
                    </Link>
                    <Link href={`/stream/editor/${projeto.id}`} target="_blank" className="inline-flex h-10 items-center gap-2 border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                      <SlidersHorizontal size={14} />
                      Editor visual
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 md:grid-cols-2">
                  <div className="border border-white/10 bg-[#0b1220] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Controlador OBS com cenas</div>
                    <div className="mt-2 break-all text-xs font-semibold text-zinc-300">{controllerUrl}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => copiar(controllerUrl)} className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><Copy size={13} /> Copiar</button>
                      <Link href={`/stream/controller?key=${projeto.stream_key}`} target="_blank" className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><Gamepad2 size={13} /> Abrir</Link>
                    </div>
                  </div>
                  <div className="border border-white/10 bg-[#0b1220] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Placar OBS por chave</div>
                    <div className="mt-2 break-all text-xs font-semibold text-zinc-300">{scoreboardUrl}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => copiar(scoreboardUrl)} className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><Copy size={13} /> Copiar OBS</button>
                      <Link href={`/stream/overlay/${projeto.stream_key}/scoreboard`} target="_blank" className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><MonitorUp size={13} /> Abrir OBS</Link>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Links OBS criados no editor</div>
                  {overlayLinks.length > 0 ? (
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {[...overlayLinks, ...extraOverlayLinks].map((overlay) => {
                        const overlayUrl = overlay.fixed
                          ? `${origem}/stream/overlay/${projeto.stream_key}/${overlay.slug}`
                          : `${origem}/stream/render/${overlay.id}`
                        return (
                          <div
                            key={overlay.id}
                            className={`border ${overlay.visivel ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-400'}`}
                          >
                            <Link
                              href={`/stream/render/${overlay.id}`}
                              target="_blank"
                              className="flex h-11 items-center justify-between px-3 text-[10px] font-black uppercase tracking-[0.14em]"
                            >
                              <span className="truncate">{overlay.nome}</span>
                              <span className="ml-2 text-[9px] opacity-80">{overlay.visivel ? 'OBS' : 'Oculta'}</span>
                            </Link>
                            <div className="border-t border-white/15 p-2">
                              <div className="mb-2 break-all text-[10px] font-semibold opacity-80">{overlayUrl}</div>
                              <button onClick={() => copiar(overlayUrl)} className="inline-flex h-8 w-full items-center justify-center gap-2 border border-white/20 bg-black/10 px-2 text-[9px] font-black uppercase tracking-[0.14em]">
                                <Copy size={12} />
                                Copiar link OBS
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="border border-dashed border-white/10 p-4 text-xs font-semibold text-zinc-400">
                      Nenhuma overlay criada neste projeto. Abra o Studio e adicione uma overlay.
                    </div>
                  )}
                </div>
                    </>
                  )
                })()}
              </div>
            ))}

            {projetos.length === 0 ? (
              <div className="border border-dashed border-white/10 p-10 text-center text-sm font-semibold text-zinc-400">
                Nenhum projeto criado ainda.
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}
