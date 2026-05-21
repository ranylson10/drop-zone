'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fixedStreamOverlayTemplates } from '@/lib/streamOverlay'
import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MonitorUp,
  Plus,
  Radio,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'

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

function joinUrl(origin: string, path: string) {
  return origin ? `${origin}${path}` : path
}

export default function StreamProjectsPage() {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [overlays, setOverlays] = useState<OverlayProjeto[]>([])
  const [campeonatoId, setCampeonatoId] = useState('')
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [sincronizandoId, setSincronizandoId] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  const overlaysPorProjeto = useMemo(() => {
    const map = new Map<string, OverlayProjeto[]>()
    overlays.forEach((overlay) => {
      const lista = map.get(overlay.project_id) || []
      lista.push(overlay)
      map.set(overlay.project_id, lista)
    })

    map.forEach((lista) => lista.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)))
    return map
  }, [overlays])

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

    if (campRes.error) console.error('Erro ao carregar campeonatos:', campRes.error)
    if (projRes.error) console.error('Erro ao carregar projetos de stream:', projRes.error)
    if (overlayRes.error) console.error('Erro ao carregar overlays de stream:', overlayRes.error)

    setLoading(false)
  }

  useEffect(() => {
    setOrigin(window.location.origin)
    carregar()
  }, [])

  async function garantirTemplates() {
    const { error } = await supabase
      .from('stream_overlay_templates')
      .upsert(
        fixedStreamOverlayTemplates.map((template) => ({
          id: template.id,
          nome: template.nome,
          categoria: template.categoria,
          descricao: template.descricao,
          config_padrao: template.config_padrao,
          ativo: true,
        })),
        { onConflict: 'id' }
      )

    if (error) throw error
  }

  async function criarOverlaysPadrao(projectId: string, overlaysAtuais: OverlayProjeto[] = []) {
    await garantirTemplates()

    const templatesExistentes = new Set(overlaysAtuais.map((overlay) => overlay.template_id))
    const templatesFaltando = fixedStreamOverlayTemplates.filter((template) => !templatesExistentes.has(template.id))

    if (templatesFaltando.length === 0) return

    const { error } = await supabase
      .from('stream_project_overlays')
      .insert(
        templatesFaltando.map((template, index) => ({
          project_id: projectId,
          template_id: template.id,
          nome: template.nome,
          config: template.config_padrao,
          visivel: true,
          ordem: overlaysAtuais.length + index + 1,
        }))
      )

    if (error) throw error
  }

  async function criarProjeto() {
    if (!campeonatoId) {
      alert('Selecione um campeonato')
      return
    }

    const camp = campeonatos.find((item) => item.id === campeonatoId)

    setCriando(true)

    try {
      const { data, error } = await supabase
        .from('stream_projects')
        .insert({
          campeonato_id: campeonatoId,
          nome: nomeProjeto.trim() || `Transmissão - ${camp?.nome || 'Campeonato'}`,
          ativo: true,
        })
        .select('id, stream_key')
        .single()

      if (error) throw error

      const { error: scoreError } = await supabase
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

      if (scoreError) throw scoreError

      await criarOverlaysPadrao(data.id, [])

      setNomeProjeto('')
      setCampeonatoId('')
      await carregar()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'erro desconhecido'
      console.error(error)
      alert(`Erro ao criar projeto: ${message}`)
    } finally {
      setCriando(false)
    }
  }

  async function sincronizarOverlays(projeto: Projeto) {
    setSincronizandoId(projeto.id)

    try {
      await criarOverlaysPadrao(projeto.id, overlaysPorProjeto.get(projeto.id) || [])
      await carregar()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'erro desconhecido'
      console.error(error)
      alert(`Erro ao sincronizar overlays: ${message}`)
    } finally {
      setSincronizandoId(null)
    }
  }

  async function copiar(texto: string, mensagem = 'Copiado') {
    await navigator.clipboard.writeText(texto)
    alert(mensagem)
  }

  return (
    <main className="min-h-screen bg-[#080d16] p-5 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">Stream Studio</div>
            <h1 className="mt-2 text-3xl font-black uppercase">Projetos de transmissão</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-400">
              Configure o painel do campeonato, copie os links do OBS e mantenha a chave interna oculta.
            </p>
          </div>
          <button onClick={carregar} className="inline-flex h-11 items-center justify-center gap-2 border border-white/10 bg-white/5 px-4 text-[11px] font-black uppercase tracking-[0.16em]">
            <RefreshCw size={15} />
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
            {projetos.map((projeto) => {
              const overlaysDoProjeto = overlaysPorProjeto.get(projeto.id) || []
              const overlaysCriadas = overlaysDoProjeto.length
              const totalTemplates = fixedStreamOverlayTemplates.length
              const studioPath = `/stream/studio/${projeto.stream_key}`
              const scoreboardPath = `/stream/overlay/${projeto.stream_key}/scoreboard`
              const editorPath = `/stream/editor/${projeto.id}`
              const faltamOverlays = overlaysCriadas < totalTemplates

              return (
                <div key={projeto.id} className="border border-white/10 bg-[#111827] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xl font-black uppercase">
                        <Radio size={19} className="shrink-0 text-red-500" />
                        <span className="truncate">{projeto.nome}</span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
                        {projeto.ativo ? <Eye size={13} /> : <EyeOff size={13} />}
                        {projeto.ativo ? 'Projeto ativo' : 'Projeto inativo'}
                      </div>
                      <div className="mt-2 text-xs font-semibold text-zinc-500">
                        Chave interna protegida. Use os botões abaixo para copiar os links prontos.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={editorPath} target="_blank" className="inline-flex h-10 items-center gap-2 border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                        <SlidersHorizontal size={14} />
                        Editor
                      </Link>
                      <Link href={studioPath} target="_blank" className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                        <MonitorUp size={14} />
                        Studio
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 lg:grid-cols-3">
                    <div className="border border-white/10 bg-[#0b1220] p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Painel do campeonato</div>
                      <div className="mt-2 break-all text-xs font-semibold text-zinc-300">{joinUrl(origin, studioPath)}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => copiar(joinUrl(origin, studioPath), 'Link do Studio copiado')} className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                          <Copy size={13} /> Copiar
                        </button>
                        <Link href={studioPath} target="_blank" className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                          <ExternalLink size={13} /> Abrir
                        </Link>
                      </div>
                    </div>

                    <div className="border border-white/10 bg-[#0b1220] p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Overlay OBS - Scoreboard</div>
                      <div className="mt-2 break-all text-xs font-semibold text-zinc-300">{joinUrl(origin, scoreboardPath)}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => copiar(joinUrl(origin, scoreboardPath), 'Link da overlay copiado')} className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                          <Copy size={13} /> Copiar
                        </button>
                        <Link href={scoreboardPath} target="_blank" className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                          <ExternalLink size={13} /> Abrir
                        </Link>
                      </div>
                    </div>

                    <div className="border border-white/10 bg-[#0b1220] p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Status das overlays</div>
                      <div className="mt-2 text-xs font-semibold text-zinc-300">
                        Criadas: <span className="font-black text-white">{overlaysCriadas}/{totalTemplates}</span>
                      </div>
                      {faltamOverlays ? (
                        <button onClick={() => sincronizarOverlays(projeto)} disabled={sincronizandoId === projeto.id} className="mt-3 inline-flex h-9 items-center gap-2 border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-60">
                          {sincronizandoId === projeto.id ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                          Criar faltantes
                        </button>
                      ) : (
                        <div className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">Tudo pronto</div>
                      )}
                    </div>
                  </div>

                  {overlaysDoProjeto.length > 0 ? (
                    <div className="mt-4 border border-white/10 bg-[#0b1220] p-4">
                      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Links render OBS por overlay fixa</div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {overlaysDoProjeto.map((overlay) => {
                          const renderPath = `/stream/render/${overlay.id}`

                          return (
                            <div key={overlay.id} className="flex flex-col gap-2 border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-black uppercase text-white">{overlay.nome}</div>
                                <div className="mt-1 break-all text-[11px] font-semibold text-zinc-500">{joinUrl(origin, renderPath)}</div>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button onClick={() => copiar(joinUrl(origin, renderPath), 'Link render copiado')} className="inline-flex h-8 items-center gap-1 border border-white/10 bg-white/5 px-2 text-[9px] font-black uppercase tracking-[0.12em]">
                                  <Copy size={12} /> Copiar
                                </button>
                                <Link href={renderPath} target="_blank" className="inline-flex h-8 items-center gap-1 border border-white/10 bg-white/5 px-2 text-[9px] font-black uppercase tracking-[0.12em]">
                                  <ExternalLink size={12} /> Abrir
                                </Link>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}

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
