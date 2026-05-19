'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Copy, Eye, EyeOff, Loader2, MonitorUp, Plus, RefreshCw, Save, SlidersHorizontal } from 'lucide-react'
import {
  RankingRow,
  TabelaGeralOverlay,
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
    supabase.from('resultados_partidas_equipes').select('equipe_id, grupo_id, colocacao, abates, pontos_total').eq('campeonato_id', campeonatoId),
    supabase.from('resultados_jogos').select('equipe_id, grupo_id, posicao, abates, total_pontos').eq('campeonato_id', campeonatoId),
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

export default function StreamOverlayEditorPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params?.projectId

  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [rankingRows, setRankingRows] = useState<RankingRow[]>([])
  const [overlayId, setOverlayId] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''

  const overlayAtual = useMemo(() => overlays.find((item) => item.id === overlayId) || overlays[0] || null, [overlays, overlayId])
  const templateAtual = useMemo(() => templates.find((item) => item.id === overlayAtual?.template_id) || null, [templates, overlayAtual])
  const config = useMemo(() => mergeOverlayConfig(defaultTabelaGeralConfig, mergeOverlayConfig(templateAtual?.config_padrao || {}, overlayAtual?.config || {})), [templateAtual, overlayAtual])
  const renderUrl = overlayAtual ? `${origem}/stream/render/${overlayAtual.id}` : ''
  const previewRows = rankingRows.length > 0 ? rankingRows : sampleRankingRows(Number(config.layout?.maxRows || 12))

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!projeto?.campeonato_id) return

    async function carregarRanking() {
      if (!projeto?.campeonato_id) return
      setRankingRows(await carregarRankingTabelaGeral(projeto.campeonato_id))
    }

    carregarRanking()
  }, [projeto?.campeonato_id])

  async function criarOverlay(template: Template) {
    if (!projectId) return

    setSalvando(true)
    const { data, error } = await supabase
      .from('stream_project_overlays')
      .insert({
        project_id: projectId,
        template_id: template.id,
        nome: template.nome,
        config: mergeOverlayConfig(defaultTabelaGeralConfig, template.config_padrao || {}),
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
              <TabelaGeralOverlay config={config} rows={previewRows} previewScale={0.5} />
            </div>

            {renderUrl ? (
              <div className="mt-3 break-all border border-white/10 bg-[#0b1220] p-3 text-xs font-semibold text-zinc-300">{renderUrl}</div>
            ) : null}
          </section>

          <aside className="border border-white/10 bg-[#111827] p-4">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              <SlidersHorizontal size={15} />
              Editor visual
            </div>

            {!overlayAtual ? (
              <div className="text-sm font-semibold text-zinc-400">Crie ou selecione uma overlay.</div>
            ) : (
              <div className="space-y-5">
                <EditorInput label="Título" value={config.title || ''} onChange={(v) => atualizarCampo('title', v)} />
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
                  <EditorNumber label="Linhas" value={config.layout.maxRows} onChange={(v) => atualizarCampo('layout.maxRows', v)} />
                  <EditorNumber label="Altura linha" value={config.layout.rowHeight} onChange={(v) => atualizarCampo('layout.rowHeight', v)} />
                  <EditorNumber label="Altura topo" value={config.layout.headerHeight} onChange={(v) => atualizarCampo('layout.headerHeight', v)} />
                  <EditorNumber label="Fonte" value={config.layout.fontSize} onChange={(v) => atualizarCampo('layout.fontSize', v)} />
                  <EditorNumber label="Logo" value={config.layout.logoSize} onChange={(v) => atualizarCampo('layout.logoSize', v)} />
                  <EditorNumber label="Espaco" value={config.layout.rowGap} onChange={(v) => atualizarCampo('layout.rowGap', v)} />
                  <EditorNumber label="Raio" value={config.layout.radius} onChange={(v) => atualizarCampo('layout.radius', v)} />
                  <EditorNumber label="Opacidade" value={config.layout.opacity} onChange={(v) => atualizarCampo('layout.opacity', v)} />
                </div>

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
