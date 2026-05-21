'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fixedStreamOverlayTemplates } from '@/lib/streamOverlay'
import {
  Eye,
  EyeOff,
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

async function sha256Base64(text: string) {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(hash))
  return btoa(String.fromCharCode(...bytes))
}

async function computeObsAuth(password: string, salt: string, challenge: string) {
  const secret = await sha256Base64(password + salt)
  return sha256Base64(secret + challenge)
}

function getActiveProjectStorageKey(controllerKey: string) {
  return `stream.controller.activeProject.${controllerKey}`
}

function getActiveProjectChannelName(controllerKey: string) {
  return `stream-controller-active-project-${controllerKey}`
}

function produtorProjectsNextOrder(projects: ProducerProject[]) {
  const maior = projects.reduce((max, item) => Math.max(max, Number(item.ordem || 0)), 0)
  return maior + 1
}

const DEFAULT_OVERLAYS = fixedStreamOverlayTemplates.map((template, index) => ({
  template_id: template.id,
  slug: template.slug,
  nome: template.nome,
  descricao: template.descricao,
  ordem: index + 1,
  config: template.config_padrao,
}))

const OBS_EVENT_SUBSCRIPTIONS = 64 | 128

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
  const [obsStatus, setObsStatus] = useState('OBS nao conectado')
  const [obsScenes, setObsScenes] = useState<string[]>([])
  const [obsLoadingScenes, setObsLoadingScenes] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef<Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>>(new Map())
  const requestIdRef = useRef(1)

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
    const { data: sessionData } = await supabase.auth.getSession()
    const authUser = sessionData.session?.user || (await supabase.auth.getUser()).data.user
    if (!authUser) return

    const { data, error } = await supabase
      .from('stream_producer_keys')
      .select('id, label, producer_key, active_session_id, active_until')
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    let keys = (data || []) as ProducerKey[]

    if (keys.length === 0) {
      const { data: criada, error: criarError } = await supabase
        .from('stream_producer_keys')
        .insert({
          user_id: authUser.id,
          label: 'Controlador OBS',
        })
        .select('id, label, producer_key, active_session_id, active_until')
        .single()

      if (criarError) {
        const { data: recarregadas } = await supabase
          .from('stream_producer_keys')
          .select('id, label, producer_key, active_session_id, active_until')
          .order('created_at', { ascending: true })
        keys = (recarregadas || []) as ProducerKey[]
      } else if (criada) {
        keys = [criada as ProducerKey]
      }
    }

    setProducerKeys(keys)

    const saved = safeText(localStorage.getItem('stream.controller.producerKey'))
    const escolhido = saved || keys[0]?.producer_key || ''
    const keyEncontrada = keys.find((item) => item.producer_key === escolhido) || keys[0]
    if (escolhido && !producerKey) setProducerKey(escolhido)
    if (keyEncontrada?.id) {
      setProducerKey(keyEncontrada.producer_key)
      setProducerKeyId(keyEncontrada.id)
      localStorage.setItem('stream.controller.producerKey', keyEncontrada.producer_key)
      await carregarProducerProjects(keyEncontrada.id)
    }
  }, [producerKey])

  useEffect(() => {
    carregarProducerKeys()
    const { data } = supabase.auth.onAuthStateChange(() => {
      carregarProducerKeys()
    })
    return () => data.subscription.unsubscribe()
  }, [carregarProducerKeys])

  async function criarProducerKeySilenciosa() {
    const existente = producerKeys[0]
    if (existente) {
      setProducerKey(existente.producer_key)
      setProducerKeyId(existente.id)
      localStorage.setItem('stream.controller.producerKey', existente.producer_key)
      return existente
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const authUser = sessionData.session?.user || (await supabase.auth.getUser()).data.user
    if (!authUser) {
      throw new Error('Faça login para ativar o painel. A chave do streamer precisa ficar vinculada ao perfil.')
    }

    const { data, error } = await supabase
      .from('stream_producer_keys')
      .insert({
        user_id: authUser.id,
        label: 'Controlador OBS',
      })
      .select('id, label, producer_key, active_session_id, active_until')
      .single()

    if (error) {
      const { data: keysAtualizadas } = await supabase
        .from('stream_producer_keys')
        .select('id, label, producer_key, active_session_id, active_until')
        .order('created_at', { ascending: true })
        .limit(1)
      const carregada = keysAtualizadas?.[0] as ProducerKey | undefined
      if (carregada) return carregada
      throw error
    }

    const created = data as ProducerKey
    setProducerKeys((prev) => [...prev, created])
    setProducerKey(created.producer_key)
    setProducerKeyId(created.id)
    localStorage.setItem('stream.controller.producerKey', created.producer_key)
    return created
  }

  async function garantirProducerKeyAtual() {
    const saved = safeText(localStorage.getItem('stream.controller.producerKey'))
    const encontrada = producerKeys.find((item) => item.producer_key === producerKey || item.producer_key === saved) || producerKeys[0]

    if (encontrada) {
      setProducerKey(encontrada.producer_key)
      setProducerKeyId(encontrada.id)
      localStorage.setItem('stream.controller.producerKey', encontrada.producer_key)
      return encontrada
    }

    return await criarProducerKeySilenciosa()
  }

  async function ativarProducerKey() {
    setLoading(true)

    let keyAtual = producerKey
    try {
      const garantida = await garantirProducerKeyAtual()
      keyAtual = garantida.producer_key
    } catch (error: any) {
      setLoading(false)
      alert(error?.message || 'Não consegui preparar o painel do streamer.')
      return
    }

    const { data, error } = await supabase.rpc('stream_claim_producer_key', {
      p_producer_key: keyAtual,
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
    localStorage.setItem('stream.controller.producerKey', keyAtual)
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

  function salvarObsConfig() {
    localStorage.setItem('stream.obs.host', safeText(obsHost) || '127.0.0.1')
    localStorage.setItem('stream.obs.port', safeText(obsPort) || '4455')
    localStorage.setItem('stream.obs.password', obsPassword)
    alert('Configuração do OBS salva. O painel limpo usa esses dados ao conectar.')
  }

  function nextRequestId() {
    const id = String(requestIdRef.current)
    requestIdRef.current += 1
    return id
  }

  const sendObsRequest = useCallback((requestType: string, requestData: Record<string, unknown> = {}) => {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('OBS nao conectado'))
        return
      }

      const requestId = nextRequestId()
      pendingRef.current.set(requestId, { resolve, reject })
      ws.send(JSON.stringify({
        op: 6,
        d: { requestType, requestId, requestData },
      }))
    })
  }, [])

  async function conectarObsEPuxarCenas() {
    setObsLoadingScenes(true)
    setObsStatus('Conectando OBS...')
    setObsScenes([])

    const host = safeText(obsHost) || '127.0.0.1'
    const port = safeText(obsPort) || '4455'
    const password = obsPassword

    localStorage.setItem('stream.obs.host', host)
    localStorage.setItem('stream.obs.port', port)
    localStorage.setItem('stream.obs.password', password)

    if (wsRef.current) {
      try { wsRef.current.close() } catch {}
    }

    const ws = new WebSocket(`ws://${host}:${port}`)
    wsRef.current = ws

    ws.onerror = () => {
      setObsLoadingScenes(false)
      setObsStatus('Erro ao conectar no OBS')
    }
    ws.onclose = () => setObsStatus((prev) => prev === 'OBS online' ? 'OBS desconectado' : prev)

    ws.onmessage = async (event) => {
      let msg: { op?: number; d?: Record<string, any> }
      try {
        msg = JSON.parse(String(event.data))
      } catch {
        return
      }

      if (msg.op === 0) {
        const data = msg.d || {}
        const auth = data.authentication as { salt?: string; challenge?: string } | undefined
        const identify: { op: number; d: { rpcVersion: number; eventSubscriptions: number; authentication?: string } } = {
          op: 1,
          d: { rpcVersion: 1, eventSubscriptions: OBS_EVENT_SUBSCRIPTIONS },
        }

        if (auth?.salt && auth?.challenge && password) {
          identify.d.authentication = await computeObsAuth(password, auth.salt, auth.challenge)
        }

        ws.send(JSON.stringify(identify))
        return
      }

      if (msg.op === 2) {
        setObsStatus('OBS online')
        try {
          const response = await sendObsRequest('GetSceneList')
          const scenes = ((response.scenes || []) as Array<{ sceneName?: string }>)
            .map((scene) => safeText(scene.sceneName))
            .filter(Boolean)
          setObsScenes(scenes)
          setObsStatus(scenes.length > 0 ? `${scenes.length} cenas encontradas` : 'OBS online, sem cenas retornadas')
        } catch (error: any) {
          setObsStatus(error?.message || 'Nao consegui puxar cenas')
        } finally {
          setObsLoadingScenes(false)
        }
        return
      }

      if (msg.op === 7) {
        const data = msg.d || {}
        const requestId = safeText(data.requestId)
        const pending = pendingRef.current.get(requestId)
        if (!pending) return

        pendingRef.current.delete(requestId)
        const status = data.requestStatus as { result?: boolean; comment?: string } | undefined
        if (status?.result === false) {
          pending.reject(new Error(status.comment || 'OBS retornou erro'))
          return
        }
        pending.resolve((data.responseData || {}) as Record<string, unknown>)
      }
    }
  }

  async function garantirOverlaysDoProjeto(projectId: string) {
    const { error: templatesError } = await supabase.from('stream_overlay_templates').upsert(
      fixedStreamOverlayTemplates.map((template) => ({
        id: template.id,
        nome: template.nome,
        categoria: template.categoria,
        descricao: template.descricao,
        config_padrao: template.config_padrao,
        ativo: true,
      })),
      { onConflict: 'id' },
    )
    if (templatesError) console.warn('Nao foi possivel sincronizar templates oficiais no controlador.', templatesError)

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
          config: item.config,
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
    if (selecionadoAtual?.stream_projects?.stream_key) publicarProjetoAtivo(selecionadoAtual.stream_projects.stream_key)
    if (selecionadoAtual?.stream_projects?.id) await carregarProjetoDetalhes(selecionadoAtual.stream_projects.id, keyId)
    if (!selecionadoAtual) {
      setOverlays([])
      setButtons([])
    }
  }

  async function adicionarProjetoNaLista() {
    let keyIdParaSalvar = producerKeyId || producerKeys.find((item) => item.producer_key === producerKey)?.id || ''

    if (!keyIdParaSalvar) {
      try {
        const garantida = await garantirProducerKeyAtual()
        keyIdParaSalvar = garantida.id
      } catch (error: any) {
        alert(error?.message || 'Não consegui preparar o painel do streamer.')
        return
      }
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
    if (item?.stream_projects?.stream_key) publicarProjetoAtivo(item.stream_projects.stream_key)
    if (item?.stream_projects?.id) {
      await carregarProjetoDetalhes(item.stream_projects.id)
    }
  }

  function publicarProjetoAtivo(streamKey: string) {
    if (!producerKey || !streamKey) return
    localStorage.setItem(getActiveProjectStorageKey(producerKey), streamKey)
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(getActiveProjectChannelName(producerKey))
      channel.postMessage({ streamKey })
      channel.close()
    }
  }

  async function criarBotaoCena(sceneName: string, label = sceneName) {
    if (!producerKeyId || !selectedProject) {
      alert('Ative sua chave e selecione um campeonato.')
      return
    }

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
    <main className="min-h-screen bg-[#f5f7fb] p-4 text-[#111827] md:p-6">
      <section className="mx-auto max-w-[1320px]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#2563eb]">
              <Radio size={14} />
              Controlador OBS
            </div>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#0f172a] md:text-3xl">
              Configurar painel do produtor
            </h1>
            <p className="mt-1 text-sm font-medium text-[#64748b]">
              Salve a chave recebida, conecte o OBS e copie os links fixos das overlays.
            </p>
          </div>

          {panelUrl ? (
            <a
              href={panelUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#1d4ed8]"
            >
              Abrir painel
            </a>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_280px]">
            <div>
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#475569]">
                Link do painel para Dock OBS
              </div>
              <div className="flex overflow-hidden rounded-xl border border-[#dbe3ef] bg-[#f8fafc]">
                <div className="min-w-0 flex-1 truncate px-4 py-3 text-sm font-semibold text-[#0f172a]">
                  {panelUrl || 'Ative sua chave para gerar o link do painel.'}
                </div>
                <button
                  onClick={() => copiar(panelUrl)}
                  disabled={!panelUrl}
                  className="border-l border-[#dbe3ef] px-4 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0f172a] transition hover:bg-white disabled:opacity-40"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={ativarProducerKey}
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />}
                {producerActive ? 'Painel ativo' : 'Ativar minha chave'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_390px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.13em] text-[#334155]">
                <Settings size={16} />
                Configurações OBS WebSocket
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_150px_1fr_62px]">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748b]">IP / Host</span>
                  <input
                    value={obsHost}
                    onChange={(e) => setObsHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className="h-11 w-full rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748b]">Porta</span>
                  <input
                    value={obsPort}
                    onChange={(e) => setObsPort(e.target.value)}
                    placeholder="4455"
                    className="h-11 w-full rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748b]">Senha</span>
                  <input
                    value={obsPassword}
                    onChange={(e) => setObsPassword(e.target.value)}
                    type={showObsPassword ? 'text' : 'password'}
                    placeholder="Senha OBS WebSocket"
                    className="h-11 w-full rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    onClick={() => setShowObsPassword((prev) => !prev)}
                    className="h-11 w-full rounded-xl border border-[#dbe3ef] bg-[#f8fafc] text-xs font-extrabold uppercase tracking-[0.1em] text-[#0f172a] transition hover:bg-white"
                  >
                    {showObsPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <button
                  onClick={salvarObsConfig}
                  className="h-11 rounded-xl bg-[#2563eb] px-4 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#1d4ed8]"
                >
                  Salvar OBS
                </button>
                <button
                  onClick={conectarObsEPuxarCenas}
                  disabled={obsLoadingScenes}
                  className="h-11 rounded-xl border border-[#dbe3ef] bg-white px-4 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0f172a] transition hover:bg-[#f8fafc] disabled:opacity-50"
                >
                  {obsLoadingScenes ? 'Puxando cenas...' : 'Conectar e puxar cenas'}
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#64748b]">
                <span className={`h-2 w-2 rounded-full ${obsStatus.toLowerCase().includes('online') || obsStatus.toLowerCase().includes('encontradas') ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {obsStatus}
              </div>

              {obsScenes.length > 0 ? (
                <div className="mt-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#64748b]">Cenas detectadas no OBS</div>
                  <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                    {obsScenes.map((scene) => {
                      const jaExiste = buttons.some((button) => button.obs_scene_name === scene)
                      return (
                        <button
                          key={scene}
                          onClick={() => criarBotaoCena(scene)}
                          disabled={!selectedProject || !producerKeyId || jaExiste}
                          className="flex min-h-10 items-center justify-between gap-2 rounded-xl border border-[#dbe3ef] bg-white px-3 text-left text-xs font-extrabold uppercase tracking-[0.06em] text-[#0f172a] disabled:opacity-45"
                        >
                          <span className="truncate">{scene}</span>
                          <span className="text-[#64748b]">{jaExiste ? 'Adicionado' : '+ Botão'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.13em] text-[#334155]">
                    <MonitorUp size={16} />
                    Botões do painel OBS
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#64748b]">{selectedProject?.nome || 'Selecione um campeonato'}</div>
                </div>
                <button
                  onClick={adicionarBotao}
                  disabled={!selectedProject || !producerActive}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe3ef] bg-white px-3 text-xs font-extrabold uppercase tracking-[0.1em] text-[#0f172a] transition hover:bg-[#f8fafc] disabled:opacity-40"
                >
                  <Plus size={15} />
                  Botão
                </button>
              </div>

              {buttons.length === 0 ? (
                <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-center text-sm font-semibold text-[#64748b]">
                  Crie botões vinculados às cenas do OBS.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {buttons.map((button) => (
                    <div key={button.id} className="rounded-xl border border-[#dbe3ef] bg-[#f8fafc] p-2">
                      <div className="flex h-16 items-center justify-center rounded-lg bg-[#2563eb] px-3 text-center text-sm font-black uppercase tracking-[0.06em] text-white shadow-sm shadow-blue-500/20">
                        {button.label}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b]">
                        <span className="truncate">{button.obs_scene_name || button.action_type}</span>
                        <button onClick={() => removerBotao(button.id)} className="text-rose-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <div className="mb-4 text-[12px] font-extrabold uppercase tracking-[0.13em] text-[#334155]">Campeonatos salvos</div>

            <div className="mb-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#64748b]">Adicionar live por chave</div>
              <div className="grid gap-2">
                <input
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value)}
                  placeholder="Chave enviada pelo dono"
                  className="h-10 rounded-xl border border-[#dbe3ef] bg-white px-3 text-xs font-semibold outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-500/10"
                />
                <input
                  value={projectLabel}
                  onChange={(e) => setProjectLabel(e.target.value)}
                  placeholder="Nome para aparecer no painel"
                  className="h-10 rounded-xl border border-[#dbe3ef] bg-white px-3 text-xs font-semibold outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  onClick={adicionarProjetoNaLista}
                  disabled={loading || !projectKey.trim()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-3 text-xs font-extrabold uppercase tracking-[0.1em] text-white shadow-sm shadow-blue-500/20 disabled:opacity-40"
                >
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>
            </div>

            {producerProjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4 text-sm font-semibold text-[#64748b]">
                Nenhum campeonato salvo.
              </div>
            ) : (
              <div className="space-y-2">
                {producerProjects.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 transition ${selectedProducerProjectId === item.id ? 'border-[#2563eb] bg-blue-50' : 'border-[#dbe3ef] bg-white hover:bg-[#f8fafc]'}`}
                  >
                    <button onClick={() => selecionarProducerProject(item.id)} className="block w-full text-left">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black uppercase text-[#0f172a]">{item.label}</div>
                          <div className="truncate text-[11px] font-bold uppercase text-[#64748b]">{item.stream_projects?.nome}</div>
                        </div>
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${selectedProducerProjectId === item.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                    </button>
                    <button onClick={() => removerProjetoDaLista(item.id)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-rose-500">
                      <Trash2 size={13} />
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>

        <section className="mt-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.13em] text-[#334155]">
                <MonitorUp size={16} />
                Links das overlays
              </div>
              <p className="mt-1 text-sm font-medium text-[#64748b]">Links fixos para cadastrar uma vez no OBS.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
            <div className="grid grid-cols-[1fr_150px_120px] bg-[#f8fafc] px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#64748b] max-sm:hidden">
              <div>Overlay</div>
              <div className="text-center">Status</div>
              <div className="text-right">Ações</div>
            </div>

            <div className="divide-y divide-[#e2e8f0]">
              {DEFAULT_OVERLAYS.map((template) => {
                const overlaySalva = overlays.find((overlay) => overlay.template_id === template.template_id)
                const url = producerKey ? `${origem}/stream/overlay/${encodeURIComponent(producerKey)}/${template.slug}` : ''

                return (
                  <div key={template.template_id} className="grid min-h-14 items-center gap-3 px-4 py-2 md:grid-cols-[1fr_150px_120px]">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563eb]">
                        <MonitorUp size={17} />
                      </div>
                      <div className="min-w-0 truncate text-sm font-black uppercase text-[#0f172a]">{template.nome}</div>
                    </div>

                    <div className="flex items-center justify-start gap-2 text-xs font-bold text-[#64748b] md:justify-center">
                      {selectedProject ? (
                        overlaySalva?.visivel !== false ? <Eye size={15} className="text-emerald-500" /> : <EyeOff size={15} className="text-slate-400" />
                      ) : (
                        <MonitorUp size={15} className="text-slate-400" />
                      )}
                      {overlaySalva?.visivel === false ? 'oculta' : 'visível'}
                    </div>

                    <div className="flex justify-start md:justify-end">
                      <button
                        onClick={() => copiar(url)}
                        disabled={!url}
                        className="h-9 rounded-xl border border-[#dbe3ef] bg-white px-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0f172a] transition hover:bg-[#f8fafc] disabled:opacity-40"
                      >
                        Copiar link
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
