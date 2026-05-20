'use client'

/* eslint-disable react-hooks/immutability, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MonitorUp,
  Plus,
  Settings,
  Radio,
  Trash2,
  Wifi,
} from 'lucide-react'

type ProducerKey = {
  id: string
  label: string
  producer_key: string
  active_session_id: string | null
  active_until: string | null
}

type Project = {
  id: string
  nome: string
  stream_key: string
}

type ProducerProject = {
  id: string
  producer_key_id: string
  project_id: string
  label: string
  ordem: number
  ativo: boolean
  stream_projects?: Project | null
}

type Overlay = {
  id: string
  nome: string
  template_id: string
  visivel: boolean
  ordem: number
}

type ButtonItem = {
  id: string
  label: string
  action_type: string
  obs_scene_name: string | null
  overlay_id: string | null
  ordem: number
  enabled: boolean
}

function safeText(value: unknown) {
  return String(value || '').trim()
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function produtorProjectsNextOrder(projects: ProducerProject[]) {
  const maior = projects.reduce((max, item) => Math.max(max, Number(item.ordem || 0)), 0)
  return maior + 1
}

const DEFAULT_OVERLAYS = [
  { template_id: 'waiting', nome: 'Tela de espera', ordem: 1 },
  { template_id: 'countdown', nome: 'Countdown', ordem: 2 },
  { template_id: 'ranking_geral', nome: 'Tabela geral', ordem: 3 },
  { template_id: 'ranking_dia', nome: 'Tabela do dia', ordem: 4 },
  { template_id: 'ranking_queda', nome: 'Tabela da queda', ordem: 5 },
  { template_id: 'mvp_geral', nome: 'MVP geral', ordem: 6 },
  { template_id: 'mvp_queda', nome: 'MVP da queda', ordem: 7 },
  { template_id: 'mvp_dia', nome: 'MVP do dia', ordem: 8 },
  { template_id: 'booyah', nome: 'Booyah', ordem: 9 },
  { template_id: 'classificadas', nome: 'Equipes classificadas', ordem: 10 },
  { template_id: 'campeao', nome: 'Campeão', ordem: 11 },
  { template_id: 'agradecimentos', nome: 'Agradecimentos', ordem: 12 },
]

export default function StreamObsControllerPage() {
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const saved = localStorage.getItem('stream.controller.siteSessionId')
    if (saved) return saved
    const created = createSessionId()
    localStorage.setItem('stream.controller.siteSessionId', created)
    return created
  })

  const [producerKeys, setProducerKeys] = useState<ProducerKey[]>([])
  const [producerKey, setProducerKey] = useState(() => typeof window !== 'undefined' ? safeText(localStorage.getItem('stream.controller.producerKey')) : '')
  const [producerKeyId, setProducerKeyId] = useState('')
  const [producerActive, setProducerActive] = useState(false)

  const [projectKey, setProjectKey] = useState('')
  const [projectLabel, setProjectLabel] = useState('')
  const [producerProjects, setProducerProjects] = useState<ProducerProject[]>([])
  const [selectedProducerProjectId, setSelectedProducerProjectId] = useState('')
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [buttons, setButtons] = useState<ButtonItem[]>([])

  const [loading, setLoading] = useState(false)
  const [obsHost, setObsHost] = useState('127.0.0.1')
  const [obsPort, setObsPort] = useState('4455')
  const [obsPassword, setObsPassword] = useState('')
  const [showObsPassword, setShowObsPassword] = useState(false)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const selectedProducerProject = useMemo(() => producerProjects.find((item) => item.id === selectedProducerProjectId) || producerProjects[0] || null, [producerProjects, selectedProducerProjectId])
  const selectedProject = selectedProducerProject?.stream_projects || null
  const panelUrl = producerKey ? `${origem}/stream/controller/panel/${encodeURIComponent(producerKey)}` : ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    setObsHost(localStorage.getItem('stream.obs.host') || '127.0.0.1')
    setObsPort(localStorage.getItem('stream.obs.port') || '4455')
    setObsPassword(localStorage.getItem('stream.obs.password') || '')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || projectKey) return
    const keyFromUrl = safeText(new URLSearchParams(window.location.search).get('key'))
    if (keyFromUrl) {
      setProjectKey(keyFromUrl)
    }
  }, [projectKey])

  const carregarProducerKeys = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { data, error } = await supabase
      .from('stream_producer_keys')
      .select('id, label, producer_key, active_session_id, active_until')
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setProducerKeys((data || []) as ProducerKey[])

    const saved = safeText(localStorage.getItem('stream.controller.producerKey'))
    const escolhido = saved || data?.[0]?.producer_key || ''
    const keyEncontrada = data?.find((item) => item.producer_key === escolhido)
    if (escolhido && !producerKey) setProducerKey(escolhido)
    if (keyEncontrada?.id) {
      setProducerKeyId(keyEncontrada.id)
      await carregarProducerProjects(keyEncontrada.id)
    }
  }, [producerKey])

  useEffect(() => {
    carregarProducerKeys()
  }, [carregarProducerKeys])

  async function gerarProducerKey() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      alert('Faça login para gerar uma chave de produtor.')
      return
    }

    const { data, error } = await supabase
      .from('stream_producer_keys')
      .insert({
        user_id: auth.user.id,
        label: `Controlador OBS ${producerKeys.length + 1}`,
      })
      .select('id, label, producer_key, active_session_id, active_until')
      .single()

    if (error) {
      alert(`Erro ao gerar chave: ${error.message}`)
      return
    }

    setProducerKeys((prev) => [...prev, data as ProducerKey])
    setProducerKey(data.producer_key)
    localStorage.setItem('stream.controller.producerKey', data.producer_key)
  }

  async function ativarProducerKey() {
    if (!producerKey) {
      alert('Cole ou gere uma chave de produtor.')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.rpc('stream_claim_producer_key', {
      p_producer_key: producerKey,
      p_session_id: sessionId,
    })
    setLoading(false)

    if (error) {
      alert(`Erro ao ativar chave: ${error.message}`)
      return
    }

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.ok) {
      setProducerActive(false)
      alert(result?.reason || 'Chave bloqueada.')
      return
    }

    setProducerKeyId(result.producer_key_id)
    setProducerActive(true)
    localStorage.setItem('stream.controller.producerKey', producerKey)
    await carregarProducerProjects(result.producer_key_id)
  }

  useEffect(() => {
    if (!producerActive || !producerKey) return

    const interval = setInterval(() => {
      supabase.rpc('stream_heartbeat_producer_key', {
        p_producer_key: producerKey,
        p_session_id: sessionId,
      })
    }, 15000)

    return () => clearInterval(interval)
  }, [producerActive, producerKey, sessionId])

  function selecionarProducerKey(value: string) {
    const clean = safeText(value)
    setProducerKey(clean)
    localStorage.setItem('stream.controller.producerKey', clean)
    const encontrada = producerKeys.find((item) => item.producer_key === clean)
    setProducerKeyId(encontrada?.id || '')
    setProducerActive(false)
    setProducerProjects([])
    setSelectedProducerProjectId('')
    setOverlays([])
    setButtons([])
    if (encontrada?.id) carregarProducerProjects(encontrada.id)
  }

  function salvarObsConfig() {
    localStorage.setItem('stream.obs.host', safeText(obsHost) || '127.0.0.1')
    localStorage.setItem('stream.obs.port', safeText(obsPort) || '4455')
    localStorage.setItem('stream.obs.password', obsPassword)
    alert('Configuração do OBS salva. O painel limpo usa esses dados ao conectar.')
  }

  async function garantirOverlaysDoProjeto(projectId: string) {
    const { data: atuais, error: consultaError } = await supabase
      .from('stream_project_overlays')
      .select('id, template_id')
      .eq('project_id', projectId)

    if (consultaError) throw consultaError

    const existentes = new Set((atuais || []).map((item: any) => item.template_id))
    const faltando = DEFAULT_OVERLAYS.filter((item) => !existentes.has(item.template_id))

    if (faltando.length > 0) {
      const { error: insertError } = await supabase.from('stream_project_overlays').insert(
        faltando.map((item) => ({
          project_id: projectId,
          nome: item.nome,
          template_id: item.template_id,
          ordem: item.ordem,
          visivel: true,
          config: {},
        })),
      )
      if (insertError) throw insertError
    }
  }

  async function carregarProducerProjects(keyId = producerKeyId) {
    if (!keyId) return

    const { data, error } = await supabase
      .from('stream_producer_projects')
      .select('id, producer_key_id, project_id, label, ordem, ativo')
      .eq('producer_key_id', keyId)
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    if (error) {
      alert(`Erro ao carregar lista de campeonatos: ${error.message}`)
      return
    }

    const rows = (data || []) as Omit<ProducerProject, 'stream_projects'>[]
    const projectIds = rows.map((item) => item.project_id).filter(Boolean)

    let projectsMap = new Map<string, Project>()
    if (projectIds.length > 0) {
      const { data: projetos, error: projetosError } = await supabase
        .from('stream_projects')
        .select('id, nome, stream_key')
        .in('id', projectIds)

      if (projetosError) {
        alert(`Erro ao carregar projetos salvos: ${projetosError.message}`)
        return
      }

      projectsMap = new Map(((projetos || []) as Project[]).map((projeto) => [projeto.id, projeto]))
    }

    const lista = rows.map((item) => ({
      ...item,
      stream_projects: projectsMap.get(item.project_id) || null,
    })) as ProducerProject[]

    setProducerProjects(lista)
    const selecionadoAtual = lista.find((item) => item.id === selectedProducerProjectId) || lista[0] || null
    setSelectedProducerProjectId(selecionadoAtual?.id || '')
    if (selecionadoAtual?.stream_projects?.id) await carregarProjetoDetalhes(selecionadoAtual.stream_projects.id, keyId)
    if (!selecionadoAtual) {
      setOverlays([])
      setButtons([])
    }
  }

  async function adicionarProjetoNaLista() {
    const keyIdParaSalvar = producerKeyId || producerKeys.find((item) => item.producer_key === producerKey)?.id || ''

    if (!keyIdParaSalvar) {
      alert('Selecione ou gere uma chave de produtor primeiro.')
      return
    }

    if (!projectKey) {
      alert('Cole a chave do campeonato/projeto.')
      return
    }

    setLoading(true)

    const { data: projeto, error: projError } = await supabase
      .from('stream_projects')
      .select('id, nome, stream_key')
      .eq('stream_key', projectKey)
      .maybeSingle()

    if (projError || !projeto) {
      setLoading(false)
      alert(projError?.message || 'Projeto não encontrado.')
      return
    }

    const labelFinal = projectLabel.trim() || projeto.nome

    try {
      await garantirOverlaysDoProjeto(projeto.id)
    } catch (overlayError: any) {
      setLoading(false)
      alert(`Projeto encontrado, mas não consegui preparar os links das overlays: ${overlayError?.message || overlayError}`)
      return
    }

    const { data: existente, error: consultaError } = await supabase
      .from('stream_producer_projects')
      .select('id')
      .eq('producer_key_id', keyIdParaSalvar)
      .eq('project_id', projeto.id)
      .maybeSingle()

    if (consultaError) {
      setLoading(false)
      alert(`Erro ao verificar lista: ${consultaError.message}`)
      return
    }

    const payload = {
      producer_key_id: keyIdParaSalvar,
      project_id: projeto.id,
      label: labelFinal,
      ativo: true,
      ordem: produtorProjectsNextOrder(producerProjects),
      updated_at: new Date().toISOString(),
    }

    const { data: salvo, error } = existente?.id
      ? await supabase
          .from('stream_producer_projects')
          .update({ label: labelFinal, ativo: true, updated_at: payload.updated_at })
          .eq('id', existente.id)
.select('id, producer_key_id, project_id, label, ordem, ativo')
          .single()
      : await supabase
          .from('stream_producer_projects')
          .insert(payload)
.select('id, producer_key_id, project_id, label, ordem, ativo')
          .single()

    setLoading(false)

    if (error) {
      alert(`Erro ao salvar projeto na lista: ${error.message}`)
      return
    }

    setProjectKey('')
    setProjectLabel('')
    if (salvo?.id) setSelectedProducerProjectId(salvo.id)
    setProducerKeyId(keyIdParaSalvar)
    await carregarProducerProjects(keyIdParaSalvar)
  }

  async function removerProjetoDaLista(id: string) {
    if (!confirm('Remover este campeonato da lista do controlador?')) return

    const { error } = await supabase
      .from('stream_producer_projects')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    setProducerProjects((prev) => prev.filter((item) => item.id !== id))
  }

  async function carregarProjetoDetalhes(projectId: string, keyId = producerKeyId) {
    if (!projectId || !keyId) return

    try {
      await garantirOverlaysDoProjeto(projectId)
    } catch (error) {
      console.error(error)
    }

    const [{ data: overlayData }, { data: buttonData }] = await Promise.all([
      supabase
        .from('stream_project_overlays')
        .select('id, nome, template_id, visivel, ordem')
        .eq('project_id', projectId)
        .order('ordem', { ascending: true }),

      supabase
        .from('stream_controller_buttons')
        .select('id, label, action_type, obs_scene_name, overlay_id, ordem, enabled')
        .eq('producer_key_id', keyId)
        .eq('project_id', projectId)
        .order('ordem', { ascending: true }),
    ])

    setOverlays((overlayData || []) as Overlay[])
    setButtons((buttonData || []) as ButtonItem[])
  }

  async function selecionarProducerProject(id: string) {
    setSelectedProducerProjectId(id)
    const item = producerProjects.find((project) => project.id === id)
    if (item?.stream_projects?.id) {
      await carregarProjetoDetalhes(item.stream_projects.id)
    }
  }

  async function adicionarBotao() {
    if (!producerKeyId || !selectedProject) {
      alert('Ative sua chave e selecione um campeonato.')
      return
    }

    const label = prompt('Nome do botão:')
    if (!label) return

    const sceneName = prompt('Nome exato da cena no OBS:')
    if (!sceneName) return

    const { data, error } = await supabase
      .from('stream_controller_buttons')
      .insert({
        producer_key_id: producerKeyId,
        project_id: selectedProject.id,
        label,
        action_type: 'scene',
        obs_scene_name: sceneName,
        enabled: true,
        ordem: buttons.length + 1,
      })
      .select('id, label, action_type, obs_scene_name, overlay_id, ordem, enabled')
      .single()

    if (error) {
      alert(error.message)
      return
    }

    setButtons((prev) => [...prev, data as ButtonItem])
  }

  async function removerBotao(id: string) {
    if (!confirm('Remover botão?')) return

    const { error } = await supabase
      .from('stream_controller_buttons')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    setButtons((prev) => prev.filter((item) => item.id !== id))
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    alert('Copiado')
  }

  return (
    <main className="min-h-screen bg-[#080d16] p-4 text-white">
      <section className="mx-auto max-w-[1300px] border border-white/10 bg-[#111827]">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-red-500">
              <Radio size={13} />
              Controlador OBS
            </div>
            <h1 className="mt-2 text-2xl font-black uppercase">Configurar painel do produtor</h1>
            <p className="mt-1 text-xs font-semibold text-zinc-400">
              Configure aqui. No OBS use apenas o link limpo do painel.
            </p>
          </div>

          {panelUrl ? (
            <div className="flex gap-2">
              <button onClick={() => copiar(panelUrl)} className="h-10 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                Copiar painel OBS
              </button>
              <Link href={panelUrl} target="_blank" className="inline-flex h-10 items-center justify-center border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                Abrir painel
              </Link>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 border-b border-white/10 p-4 xl:grid-cols-[360px_1fr_360px]">
          <div className="border border-white/10 bg-[#0b1220] p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              <KeyRound size={14} />
              Chave do produtor
            </div>
            <div className="flex gap-2">
              <select value={producerKey} onChange={(e) => selecionarProducerKey(e.target.value)} className="h-11 flex-1 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none">
                <option value="">Selecione ou gere uma chave</option>
                {producerKeys.map((key) => (
                  <option key={key.id} value={key.producer_key}>
                    {key.label} • {key.producer_key.slice(0, 14)}...
                  </option>
                ))}
              </select>
              <button onClick={gerarProducerKey} className="h-11 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                Gerar
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={ativarProducerKey} disabled={loading} className="inline-flex h-10 flex-1 items-center justify-center gap-2 border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-60">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                {producerActive ? 'Chave ativa' : 'Ativar chave'}
              </button>
              <button onClick={() => producerKey && copiar(producerKey)} className="h-10 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                Copiar
              </button>
            </div>
            {panelUrl ? (
              <div className="mt-3 border border-white/10 bg-[#080d16] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Link do painel para Dock OBS</div>
                <div className="mt-1 break-all text-xs font-semibold text-zinc-300">{panelUrl}</div>
              </div>
            ) : null}
          </div>


          <div className="border border-white/10 bg-[#0b1220] p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              <Settings size={14} />
              Configuração OBS WebSocket
            </div>
            <div className="grid gap-2">
              <input value={obsHost} onChange={(e) => setObsHost(e.target.value)} placeholder="Host OBS: 127.0.0.1" className="h-10 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none" />
              <input value={obsPort} onChange={(e) => setObsPort(e.target.value)} placeholder="Porta: 4455" className="h-10 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none" />
              <div className="flex gap-2">
                <input value={obsPassword} onChange={(e) => setObsPassword(e.target.value)} type={showObsPassword ? 'text' : 'password'} placeholder="Senha OBS WebSocket" className="h-10 flex-1 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none" />
                <button onClick={() => setShowObsPassword((prev) => !prev)} className="h-10 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.12em]">
                  {showObsPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <button onClick={salvarObsConfig} className="h-10 border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                Salvar OBS
              </button>
            </div>
            <div className="mt-2 text-[11px] font-semibold leading-relaxed text-zinc-500">
              O painel limpo usa essa configuração para conectar no OBS e trocar as cenas pelos botões.
            </div>
          </div>

          <div className="border border-white/10 bg-[#0b1220] p-3 xl:col-span-2">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Adicionar campeonato/projeto na lista</div>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input value={projectKey} onChange={(e) => setProjectKey(e.target.value)} placeholder="Chave do campeonato/projeto" className="h-11 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none" />
              <input value={projectLabel} onChange={(e) => setProjectLabel(e.target.value)} placeholder="Nome para aparecer no painel" className="h-11 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none" />
              <button onClick={adicionarProjetoNaLista} disabled={loading || !projectKey.trim() || !producerKey} className="inline-flex h-11 items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-40">
                <Plus size={14} />
                Adicionar
              </button>
            </div>
            <div className="mt-3 text-xs font-semibold text-zinc-500">
              O produtor pode salvar várias chaves e alternar entre campeonatos direto no painel limpo do OBS.
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[360px_1fr_360px]">
          <aside className="border border-white/10 bg-[#0b1220] p-4">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Campeonatos salvos</div>

            {producerProjects.length === 0 ? (
              <div className="text-sm font-semibold text-zinc-500">Nenhum campeonato salvo.</div>
            ) : (
              <div className="space-y-2">
                {producerProjects.map((item) => (
                  <div key={item.id} className={`border p-3 ${selectedProducerProjectId === item.id ? 'border-red-600 bg-red-600/15' : 'border-white/10 bg-[#080d16]'}`}>
                    <button onClick={() => selecionarProducerProject(item.id)} className="block w-full text-left">
                      <div className="text-sm font-black uppercase">{item.label}</div>
                      <div className="text-[10px] font-bold uppercase text-zinc-500">{item.stream_projects?.nome}</div>
                    </button>
                    <button onClick={() => removerProjetoDaLista(item.id)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-red-400">
                      <Trash2 size={13} />
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>

          <section className="border border-white/10 bg-[#0b1220] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Botões do painel OBS</div>
                <div className="mt-1 text-xl font-black uppercase">{selectedProject?.nome || 'Selecione um campeonato'}</div>
              </div>
              <button onClick={adicionarBotao} disabled={!selectedProject || !producerActive} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-40">
                <Plus size={14} />
                Botão
              </button>
            </div>

            {buttons.length === 0 ? (
              <div className="flex min-h-[280px] items-center justify-center border border-dashed border-white/10 text-center text-sm font-semibold text-zinc-400">
                Crie botões vinculados às cenas do OBS. No painel limpo só eles aparecem.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {buttons.map((button) => (
                  <div key={button.id} className="border border-white/10 bg-[#080d16] p-3">
                    <div className="h-20 border border-red-600 bg-red-600 px-4 text-center text-lg font-black uppercase tracking-[0.08em] flex items-center justify-center">
                      {button.label}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                      <span>{button.obs_scene_name || button.action_type}</span>
                      <button onClick={() => removerBotao(button.id)} className="text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="border border-white/10 bg-[#0b1220] p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              <MonitorUp size={15} />
              Links das overlays
            </div>

            {!selectedProject ? (
              <div className="text-sm font-semibold text-zinc-500">Selecione um campeonato.</div>
            ) : (
              <div className="space-y-2">
                <div className="border border-red-600/30 bg-red-600/10 p-3 text-[11px] font-semibold leading-relaxed text-zinc-300">
                  Links fixos para o OBS. O que muda é a chave do campeonato selecionado: ela puxa as configurações salvas pelo dono.
                </div>

                {DEFAULT_OVERLAYS.map((template) => {
                  const overlaySalva = overlays.find((overlay) => overlay.template_id === template.template_id)
                  const url = `${origem}/stream/overlay/${encodeURIComponent(selectedProject.stream_key)}/${template.template_id}`

                  return (
                    <div key={template.template_id} className="border border-white/10 bg-[#080d16] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-black uppercase">{template.nome}</div>
                          <div className="text-[10px] font-bold uppercase text-zinc-500">{template.template_id}</div>
                        </div>
                        {overlaySalva?.visivel !== false ? <Eye size={16} className="text-green-400" /> : <EyeOff size={16} className="text-zinc-500" />}
                      </div>
                      <div className="mt-2 break-all text-[10px] font-semibold text-zinc-400">{url}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button onClick={() => copiar(url)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                          Copiar link
                        </button>
                        <Link href={url} target="_blank" className="inline-flex h-9 items-center justify-center border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                          Abrir
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}
