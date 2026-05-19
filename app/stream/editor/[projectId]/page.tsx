'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Copy, Eye, EyeOff, Loader2, MonitorUp, Plus, RefreshCw, Save, SlidersHorizontal } from 'lucide-react'

type Template = {
  id: string
  nome: string
  categoria: string
  descricao: string | null
  config_padrao: any
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

const defaultConfig = {
  title: 'RESULTADO GERAL',
  theme: {
    primary: '#3d2378',
    secondary: '#b9aee0',
    background: 'rgba(20, 13, 48, 0.92)',
    rowBackground: 'rgba(215, 207, 240, 0.90)',
    text: '#101020',
    headerText: '#ffffff',
    accent: '#ffffff',
  },
  layout: {
    x: 180,
    y: 150,
    w: 1560,
    rowHeight: 58,
    rowGap: 4,
    maxRows: 12,
    radius: 0,
    fontSize: 24,
  },
  columns: {
    rank: true,
    logo: true,
    nome: true,
    tag: true,
    grupo: true,
    quedas: true,
    booyahs: true,
    kills: true,
    pontos: true,
  },
  animation: {
    enter: 'slide',
    duration: 650,
  },
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

export default function StreamOverlayEditorPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params?.projectId

  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [overlayId, setOverlayId] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''

  const overlayAtual = useMemo(() => overlays.find((item) => item.id === overlayId) || overlays[0] || null, [overlays, overlayId])
  const templateAtual = useMemo(() => templates.find((item) => item.id === overlayAtual?.template_id) || null, [templates, overlayAtual])
  const config = useMemo(() => mergeConfig(templateAtual?.config_padrao || defaultConfig, overlayAtual?.config || {}), [templateAtual, overlayAtual])
  const renderUrl = overlayAtual ? `${origem}/stream/render/${overlayAtual.id}` : ''

  const carregar = useCallback(async () => {
    if (!projectId) return
    setLoading(true)

    const [projRes, tplRes, overlayRes] = await Promise.all([
      supabase.from('stream_projects').select('id, nome, stream_key, campeonato_id').eq('id', projectId).maybeSingle(),
      supabase.from('stream_overlay_templates').select('id, nome, categoria, descricao, config_padrao').eq('ativo', true).order('nome'),
      supabase.from('stream_project_overlays').select('id, project_id, template_id, nome, config, visivel, ordem').eq('project_id', projectId).order('ordem'),
    ])

    if (projRes.data) setProjeto(projRes.data as Projeto)
    if (tplRes.data) setTemplates(tplRes.data as Template[])
    if (overlayRes.data) {
      const lista = overlayRes.data as Overlay[]
      setOverlays(lista)
      if (!overlayId && lista[0]) setOverlayId(lista[0].id)
    }

    setLoading(false)
  }, [projectId, overlayId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function criarOverlay(template: Template) {
    if (!projectId) return

    setSalvando(true)
    const { data, error } = await supabase
      .from('stream_project_overlays')
      .insert({
        project_id: projectId,
        template_id: template.id,
        nome: template.nome,
        config: template.config_padrao || {},
        visivel: true,
        ordem: overlays.length + 1,
      })
      .select('id')
      .single()

    setSalvando(false)

    if (error) {
      alert(`Erro ao criar overlay: ${error.message}`)
      return
    }

    setOverlayId(data.id)
    await carregar()
  }

  async function salvarConfig(novoConfig: any) {
    if (!overlayAtual) return

    setSalvando(true)
    const { error } = await supabase
      .from('stream_project_overlays')
      .update({
        config: novoConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', overlayAtual.id)

    setSalvando(false)

    if (error) {
      alert(`Erro ao salvar: ${error.message}`)
      return
    }

    setOverlays((prev) => prev.map((item) => item.id === overlayAtual.id ? { ...item, config: novoConfig } : item))
  }

  async function atualizarCampo(path: string, valor: any) {
    const partes = path.split('.')
    const novo = JSON.parse(JSON.stringify(config || {}))
    let alvo = novo

    for (let i = 0; i < partes.length - 1; i += 1) {
      alvo[partes[i]] = alvo[partes[i]] || {}
      alvo = alvo[partes[i]]
    }

    alvo[partes[partes.length - 1]] = valor
    await salvarConfig(novo)
  }

  async function alternarVisivel() {
    if (!overlayAtual) return

    const novo = !overlayAtual.visivel

    const { error } = await supabase
      .from('stream_project_overlays')
      .update({ visivel: novo, updated_at: new Date().toISOString() })
      .eq('id', overlayAtual.id)

    if (error) {
      alert(`Erro: ${error.message}`)
      return
    }

    setOverlays((prev) => prev.map((item) => item.id === overlayAtual.id ? { ...item, visivel: novo } : item))
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    alert('Link copiado')
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#080d16] text-white"><Loader2 className="animate-spin" /></main>
  }

  return (
    <main className="min-h-screen bg-[#080d16] p-5 text-white">
      <section className="mx-auto max-w-[1700px]">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">Overlay Editor</div>
            <h1 className="mt-2 text-2xl font-black uppercase">{projeto?.nome || 'Projeto de transmissão'}</h1>
            <p className="mt-1 text-xs font-semibold text-zinc-400">Templates fixos editáveis: dados automáticos + visual limitado.</p>
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

        <div className="grid gap-5 xl:grid-cols-[280px_1fr_360px]">
          <aside className="border border-white/10 bg-[#111827] p-4">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Overlays do projeto</div>

            <div className="space-y-2">
              {overlays.map((overlay) => (
                <button key={overlay.id} onClick={() => setOverlayId(overlay.id)} className={`w-full border px-3 py-3 text-left text-sm font-black uppercase ${overlayAtual?.id === overlay.id ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-200'}`}>
                  {overlay.nome}
                  <div className="mt-1 text-[10px] font-semibold text-zinc-300">{overlay.template_id}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Adicionar template</div>
              <div className="space-y-2">
                {templates.map((tpl) => (
                  <button key={tpl.id} onClick={() => criarOverlay(tpl)} disabled={salvando} className="flex w-full items-center justify-between border border-white/10 bg-white/5 px-3 py-3 text-left text-xs font-black uppercase text-zinc-200 hover:bg-white/10">
                    {tpl.nome}
                    <Plus size={14} />
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="border border-white/10 bg-[#111827] p-4">
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

            <div className="relative aspect-video overflow-hidden border border-white/10 bg-[#050816]">
              <PreviewTabelaGeral config={config} />
            </div>

            {renderUrl ? (
              <div className="mt-3 break-all border border-white/10 bg-[#0b1220] p-3 text-xs font-semibold text-zinc-300">{renderUrl}</div>
            ) : null}
          </section>

          <aside className="border border-white/10 bg-[#111827] p-4">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              <SlidersHorizontal size={15} />
              Editor limitado
            </div>

            {!overlayAtual ? (
              <div className="text-sm font-semibold text-zinc-400">Crie ou selecione uma overlay.</div>
            ) : (
              <div className="space-y-5">
                <EditorInput label="Título" value={config.title || ''} onChange={(v) => atualizarCampo('title', v)} />
                <EditorColor label="Cor principal" value={config.theme.primary} onChange={(v) => atualizarCampo('theme.primary', v)} />
                <EditorColor label="Cor fundo" value={config.theme.background} onChange={(v) => atualizarCampo('theme.background', v)} />
                <EditorColor label="Cor linha" value={config.theme.rowBackground} onChange={(v) => atualizarCampo('theme.rowBackground', v)} />
                <EditorColor label="Cor texto" value={config.theme.text} onChange={(v) => atualizarCampo('theme.text', v)} />

                <div className="grid grid-cols-2 gap-3">
                  <EditorNumber label="X" value={config.layout.x} onChange={(v) => atualizarCampo('layout.x', v)} />
                  <EditorNumber label="Y" value={config.layout.y} onChange={(v) => atualizarCampo('layout.y', v)} />
                  <EditorNumber label="Largura" value={config.layout.w} onChange={(v) => atualizarCampo('layout.w', v)} />
                  <EditorNumber label="Linhas" value={config.layout.maxRows} onChange={(v) => atualizarCampo('layout.maxRows', v)} />
                  <EditorNumber label="Altura linha" value={config.layout.rowHeight} onChange={(v) => atualizarCampo('layout.rowHeight', v)} />
                  <EditorNumber label="Fonte" value={config.layout.fontSize} onChange={(v) => atualizarCampo('layout.fontSize', v)} />
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Colunas</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(config.columns || {}).map((key) => (
                      <label key={key} className="flex items-center gap-2 border border-white/10 bg-[#0b1220] px-3 py-2 text-xs font-bold uppercase">
                        <input type="checkbox" checked={Boolean(config.columns[key])} onChange={(e) => atualizarCampo(`columns.${key}`, e.target.checked)} />
                        {key}
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

                <button disabled={salvando} onClick={() => salvarConfig(config)} className="inline-flex h-11 w-full items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-60">
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar
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
      <input value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} className="h-10 w-full border border-white/10 bg-[#0b1220] px-3 text-sm font-bold outline-none" />
    </label>
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

function PreviewTabelaGeral({ config }: { config: any }) {
  const rows = Array.from({ length: Number(config.layout?.maxRows || 12) }, (_, idx) => ({
    rank: idx + 1,
    nome: ['RED WAVE', 'ALOE', 'BRAVUS BR', 'TEAM ÓDIO', 'MANDELA GAMING'][idx % 5],
    tag: ['RW', 'ALOE', 'BRA', 'ODIO', 'MDL'][idx % 5],
    grupo: ['A', 'B', 'C', 'D'][idx % 4],
    quedas: 4,
    booyahs: idx % 3,
    kills: 20 - idx,
    pontos: 100 - idx * 5,
  }))

  const scale = 0.5

  return (
    <div className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left" style={{ transform: `scale(${scale})`, background: 'transparent' }}>
      <div
        className="absolute"
        style={{
          left: config.layout?.x || 180,
          top: config.layout?.y || 150,
          width: config.layout?.w || 1560,
          color: config.theme?.text,
          fontSize: config.layout?.fontSize || 24,
        }}
      >
        <div style={{ background: config.theme?.primary, color: config.theme?.headerText }} className="mb-2 px-6 py-3 text-center font-black uppercase tracking-[0.18em]">
          {config.title || 'RESULTADO GERAL'}
        </div>

        <div className="space-y-1">
          {rows.map((row) => (
            <div
              key={row.rank}
              className="grid items-center gap-2 px-3 font-black uppercase"
              style={{
                gridTemplateColumns: '70px 90px 1fr 100px 90px 100px 100px 100px',
                height: config.layout?.rowHeight || 58,
                background: config.theme?.rowBackground,
                borderRadius: config.layout?.radius || 0,
              }}
            >
              {config.columns?.rank ? <div className="text-center">{row.rank}</div> : null}
              {config.columns?.logo ? <div className="mx-auto h-10 w-10 rounded-full bg-white" /> : null}
              {config.columns?.nome ? <div>{row.nome}</div> : null}
              {config.columns?.tag ? <div className="text-center">{row.tag}</div> : null}
              {config.columns?.grupo ? <div className="text-center">{row.grupo}</div> : null}
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
