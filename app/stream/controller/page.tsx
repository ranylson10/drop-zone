'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Copy,
  Eye,
  EyeOff,
  Gamepad2,
  KeyRound,
  Loader2,
  MonitorUp,
  Plus,
  PlugZap,
  Radio,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Wifi,
  WifiOff,
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

type Overlay = {
  id: string
  nome: string
  template_id: string
  visivel: boolean
  ordem: number
}

type ObsScene = {
  sceneName: string
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

type ConnStatus = 'offline' | 'connecting' | 'online' | 'error'

const OBS_EVENT_SUBSCRIPTIONS = 64 | 128

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

export default function StreamObsControllerPage() {
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const saved = localStorage.getItem('stream.controller.sessionId')
    if (saved) return saved
    const created = createSessionId()
    localStorage.setItem('stream.controller.sessionId', created)
    return created
  })

  const [producerKeys, setProducerKeys] = useState<ProducerKey[]>([])
  const [producerKey, setProducerKey] = useState(() => typeof window !== 'undefined' ? safeText(localStorage.getItem('stream.controller.producerKey')) : '')
  const [producerKeyId, setProducerKeyId] = useState('')
  const [producerActive, setProducerActive] = useState(false)

  const [projectKey, setProjectKey] = useState(() => typeof window !== 'undefined' ? safeText(localStorage.getItem('stream.controller.projectKey')) : '')
  const [project, setProject] = useState<Project | null>(null)
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [buttons, setButtons] = useState<ButtonItem[]>([])

  const [host, setHost] = useState(() => typeof window !== 'undefined' ? safeText(localStorage.getItem('stream.obs.host')) || '127.0.0.1' : '127.0.0.1')
  const [port, setPort] = useState(() => typeof window !== 'undefined' ? safeText(localStorage.getItem('stream.obs.port')) || '4455' : '4455')
  const [password, setPassword] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('stream.obs.password') || '' : '')
  const [status, setStatus] = useState<ConnStatus>('offline')
  const [statusText, setStatusText] = useState('OBS desconectado')
  const [scenes, setScenes] = useState<ObsScene[]>([])
  const [currentScene, setCurrentScene] = useState('')

  const [tab, setTab] = useState<'controle' | 'config'>('controle')
  const [loading, setLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef<Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>>(new Map())
  const requestIdRef = useRef(1)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const producerKeyActive = producerActive && producerKeyId

  const overlayLinks = useMemo(() => {
    if (!project) return []
    return overlays.map((overlay) => ({
      ...overlay,
      url: `${origem}/stream/render/${overlay.id}`,
    }))
  }, [overlays, project, origem])

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

    if (!producerKey && data?.[0]?.producer_key) {
      setProducerKey(data[0].producer_key)
      localStorage.setItem('stream.controller.producerKey', data[0].producer_key)
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

  useEffect(() => {
    if (!producerActive || !producerKey) return

    const release = () => {
      try {
        supabase.rpc('stream_release_producer_key', {
          p_producer_key: producerKey,
          p_session_id: sessionId,
        })
      } catch {}
    }

    window.addEventListener('beforeunload', release)
    return () => {
      window.removeEventListener('beforeunload', release)
    }
  }, [producerActive, producerKey, sessionId])

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    alert('Copiado')
  }

  async function carregarProject() {
    if (!producerKeyActive) {
      alert('Ative sua chave de produtor antes de carregar um projeto.')
      return
    }

    if (!projectKey) {
      alert('Cole a chave do campeonato/projeto.')
      return
    }

    setLoading(true)

    const { data: proj, error: projError } = await supabase
      .from('stream_projects')
      .select('id, nome, stream_key')
      .eq('stream_key', projectKey)
      .maybeSingle()

    if (projError || !proj) {
      setLoading(false)
      alert(projError?.message || 'Projeto não encontrado.')
      return
    }

    const { data: overlayData, error: overlayError } = await supabase
      .from('stream_project_overlays')
      .select('id, nome, template_id, visivel, ordem')
      .eq('project_id', proj.id)
      .order('ordem', { ascending: true })

    if (overlayError) {
      setLoading(false)
      alert(`Erro ao carregar overlays: ${overlayError.message}`)
      return
    }

    const { data: btnData } = await supabase
      .from('stream_controller_buttons')
      .select('id, label, action_type, obs_scene_name, overlay_id, ordem, enabled')
      .eq('producer_key_id', producerKeyId)
      .eq('project_id', proj.id)
      .order('ordem', { ascending: true })

    setProject(proj as Project)
    setOverlays((overlayData || []) as Overlay[])
    setButtons((btnData || []) as ButtonItem[])
    localStorage.setItem('stream.controller.projectKey', projectKey)
    setLoading(false)
  }

  function nextRequestId() {
    const id = String(requestIdRef.current)
    requestIdRef.current += 1
    return id
  }

  const sendRequest = useCallback((requestType: string, requestData: Record<string, unknown> = {}) => {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('OBS não conectado'))
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

  const atualizarCenas = useCallback(async () => {
    try {
      const [sceneData, currentData] = await Promise.all([
        sendRequest('GetSceneList'),
        sendRequest('GetCurrentProgramScene'),
      ])

      const obsScenes = Array.isArray(sceneData.scenes) ? sceneData.scenes as ObsScene[] : []
      setScenes(obsScenes)
      setCurrentScene(safeText(currentData.currentProgramSceneName || sceneData.currentProgramSceneName))
      setStatusText(`Conectado: ${obsScenes.length} cenas`)
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : 'Falha ao atualizar cenas')
    }
  }, [sendRequest])

  async function conectarObs() {
    localStorage.setItem('stream.obs.host', host)
    localStorage.setItem('stream.obs.port', port)
    localStorage.setItem('stream.obs.password', password)

    if (wsRef.current) {
      try { wsRef.current.close() } catch {}
    }

    setStatus('connecting')
    setStatusText('Conectando no OBS...')

    const ws = new WebSocket(`ws://${host}:${port}`)
    wsRef.current = ws

    ws.onopen = () => setStatusText('Handshake com OBS...')
    ws.onerror = () => {
      setStatus('error')
      setStatusText('Falha ao conectar. Confira OBS WebSocket, porta e senha.')
    }
    ws.onclose = () => {
      setStatus((current) => current === 'online' ? 'offline' : current)
    }

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
        setStatus('online')
        setStatusText('Conectado ao OBS')
        atualizarCenas()
        return
      }

      if (msg.op === 5) {
        const data = msg.d || {}
        if (data.eventType === 'CurrentProgramSceneChanged') {
          setCurrentScene(safeText(data.eventData?.sceneName))
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

  async function executarBotao(button: ButtonItem) {
    if (!button.enabled) return

    if (button.action_type === 'scene' && button.obs_scene_name) {
      try {
        await sendRequest('SetCurrentProgramScene', { sceneName: button.obs_scene_name })
      } catch (error: any) {
        alert(error?.message || 'Erro ao trocar cena')
      }
    }

    if (button.action_type === 'overlay' && button.overlay_id) {
      const overlay = overlays.find((item) => item.id === button.overlay_id)
      if (overlay) window.open(`${origem}/stream/render/${overlay.id}`, '_blank')
    }
  }

  async function adicionarBotao() {
    if (!producerKeyId || !project) {
      alert('Ative a chave do produtor e carregue o projeto.')
      return
    }

    const label = prompt('Nome do botão:')
    if (!label) return

    const sceneName = prompt('Nome da cena no OBS para vincular:')
    if (!sceneName) return

    const { data, error } = await supabase
      .from('stream_controller_buttons')
      .insert({
        producer_key_id: producerKeyId,
        project_id: project.id,
        label,
        action_type: 'scene',
        obs_scene_name: sceneName,
        enabled: true,
        ordem: buttons.length + 1,
      })
      .select('id, label, action_type, obs_scene_name, overlay_id, ordem, enabled')
      .single()

    if (error) {
      alert(`Erro ao criar botão: ${error.message}`)
      return
    }

    setButtons((prev) => [...prev, data as ButtonItem])
  }

  async function removerBotao(id: string) {
    if (!confirm('Remover este botão?')) return

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

  return (
    <main className="min-h-screen bg-[#080d16] p-4 text-white">
      <section className="mx-auto max-w-[1200px] border border-white/10 bg-[#111827]">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-red-500">
              <Radio size={13} />
              Controlador OBS
            </div>
            <h1 className="mt-2 text-2xl font-black uppercase">Painel limpo de transmissão</h1>
            <p className="mt-1 text-xs font-semibold text-zinc-400">
              Ative sua chave de produtor, carregue a chave do campeonato e controle cenas/overlays.
            </p>
          </div>

          <button onClick={() => setShowConfig((v) => !v)} className="inline-flex h-10 items-center justify-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
            <Settings size={14} />
            Config
          </button>
        </div>

        <div className="grid gap-4 border-b border-white/10 p-4 lg:grid-cols-[1fr_1fr_auto]">
          <div className="border border-white/10 bg-[#0b1220] p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              <KeyRound size={14} />
              Chave do produtor
            </div>
            <div className="flex gap-2">
              <select value={producerKey} onChange={(e) => setProducerKey(e.target.value)} className="h-11 flex-1 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none">
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
                {producerActive ? 'Ativa' : 'Ativar chave'}
              </button>
              <button onClick={() => producerKey && copiar(producerKey)} className="h-10 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                Copiar
              </button>
            </div>
          </div>

          <div className="border border-white/10 bg-[#0b1220] p-3">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Chave do campeonato/projeto</div>
            <div className="flex gap-2">
              <input value={projectKey} onChange={(e) => setProjectKey(e.target.value)} placeholder="Cole a chave do projeto" className="h-11 flex-1 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none" />
              <button onClick={carregarProject} disabled={loading || !producerKeyActive} className="inline-flex h-11 items-center gap-2 border border-red-600 bg-red-600 px-4 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-50">
                <RefreshCw size={14} />
                Carregar
              </button>
            </div>
            <div className="mt-2 text-xs font-bold uppercase text-zinc-400">
              {project ? project.nome : 'Nenhum projeto carregado'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:w-[260px]">
            <StatusCard label="Produtor" value={producerActive ? 'ATIVO' : 'INATIVO'} active={producerActive} />
            <StatusCard label="OBS" value={status === 'online' ? 'ONLINE' : 'OFFLINE'} active={status === 'online'} />
            <StatusCard label="Cena" value={currentScene || '-'} />
            <StatusCard label="Overlays" value={String(overlays.length)} />
          </div>
        </div>

        {showConfig ? (
          <div className="border-b border-white/10 bg-[#0b1220] p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr_auto]">
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="Host OBS" className="h-11 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none" />
              <input value={port} onChange={(e) => setPort(e.target.value)} placeholder="Porta" className="h-11 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha OBS WebSocket" type="password" className="h-11 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none" />
              <button onClick={conectarObs} className="inline-flex h-11 items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[10px] font-black uppercase tracking-[0.14em]">
                <PlugZap size={14} />
                Conectar OBS
              </button>
            </div>
            <div className="mt-2 text-xs font-semibold text-zinc-400">{statusText}</div>
          </div>
        ) : null}

        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Botões do controlador</div>
              <button onClick={adicionarBotao} disabled={!project || !producerKeyActive} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-40">
                <Plus size={14} />
                Adicionar botão
              </button>
            </div>

            {buttons.length === 0 ? (
              <div className="flex min-h-[250px] items-center justify-center border border-dashed border-white/10 text-center text-sm font-semibold text-zinc-400">
                Ative sua chave, carregue o projeto e adicione botões vinculados às cenas do OBS.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {buttons.map((button) => (
                  <div key={button.id} className="border border-white/10 bg-[#0b1220] p-3">
                    <button onClick={() => executarBotao(button)} className="h-24 w-full border border-red-600 bg-red-600 px-4 text-lg font-black uppercase tracking-[0.08em] hover:brightness-110">
                      {button.label}
                    </button>
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
          </div>

          <aside className="border border-white/10 bg-[#0b1220] p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              <MonitorUp size={15} />
              Overlays do projeto
            </div>

            {!project ? (
              <div className="text-sm font-semibold text-zinc-500">Carregue a chave do campeonato.</div>
            ) : (
              <div className="space-y-2">
                {overlayLinks.map((overlay) => (
                  <div key={overlay.id} className="border border-white/10 bg-[#080d16] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black uppercase">{overlay.nome}</div>
                        <div className="text-[10px] font-bold uppercase text-zinc-500">{overlay.template_id}</div>
                      </div>
                      {overlay.visivel ? <Eye size={16} className="text-green-400" /> : <EyeOff size={16} className="text-zinc-500" />}
                    </div>
                    <div className="mt-2 break-all text-[10px] font-semibold text-zinc-400">{overlay.url}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button onClick={() => copiar(overlay.url)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                        Copiar OBS
                      </button>
                      <Link href={`/stream/render/${overlay.id}`} target="_blank" className="inline-flex h-9 items-center justify-center border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                        Abrir
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}

function StatusCard({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="border border-white/10 bg-[#0b1220] p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</div>
      <div className={`mt-1 truncate text-sm font-black uppercase ${active === true ? 'text-green-400' : active === false ? 'text-red-400' : 'text-white'}`}>{value}</div>
    </div>
  )
}
