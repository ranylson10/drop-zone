'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ProducerKey = {
  id: string
  producer_key: string
}

type ProducerProject = {
  id: string
  producer_key_id: string
  project_id: string
  label: string
  ordem: number
  stream_projects?: {
    id: string
    nome: string
    stream_key: string
  } | null
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

type ObsScene = {
  sceneName: string
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

const OBS_EVENT_SUBSCRIPTIONS = 64 | 128

export default function StreamControllerPanelPage() {
  const params = useParams<{ producerKey: string }>()
  const producerKey = decodeURIComponent(params?.producerKey || '')

  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const saved = localStorage.getItem('stream.controller.panelSessionId')
    if (saved) return saved
    const created = createSessionId()
    localStorage.setItem('stream.controller.panelSessionId', created)
    return created
  })

  const [producerKeyId, setProducerKeyId] = useState('')
  const [projects, setProjects] = useState<ProducerProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [buttons, setButtons] = useState<ButtonItem[]>([])
  const [status, setStatus] = useState('Conectando chave...')
  const [obsStatus, setObsStatus] = useState('OBS offline')

  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef<Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>>(new Map())
  const requestIdRef = useRef(1)

  const carregar = useCallback(async () => {
    if (!producerKey) return

    const { data, error } = await supabase.rpc('stream_claim_producer_key', {
      p_producer_key: producerKey,
      p_session_id: sessionId,
    })

    if (error) {
      setStatus(error.message)
      return
    }

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.ok) {
      setStatus(result?.reason || 'Chave bloqueada.')
      return
    }

    setProducerKeyId(result.producer_key_id)
    setStatus('Chave ativa')

    const { data: projectData, error: projectError } = await supabase
      .from('stream_producer_projects')
      .select(`
        id,
        producer_key_id,
        project_id,
        label,
        ordem,
        stream_projects ( id, nome, stream_key )
      `)
      .eq('producer_key_id', result.producer_key_id)
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    if (projectError) {
      setStatus(projectError.message)
      return
    }

    const lista = (projectData || []) as ProducerProject[]
    setProjects(lista)
    const primeiro = lista[0]?.project_id || ''
    setSelectedProjectId((prev) => prev || primeiro)
    if (primeiro) carregarBotoes(result.producer_key_id, primeiro)
  }, [producerKey, sessionId])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!producerKey) return

    const interval = setInterval(() => {
      supabase.rpc('stream_heartbeat_producer_key', {
        p_producer_key: producerKey,
        p_session_id: sessionId,
      })
    }, 15000)

    return () => clearInterval(interval)
  }, [producerKey, sessionId])

  async function carregarBotoes(keyId: string, projectId: string) {
    const { data, error } = await supabase
      .from('stream_controller_buttons')
      .select('id, label, action_type, obs_scene_name, overlay_id, ordem, enabled')
      .eq('producer_key_id', keyId)
      .eq('project_id', projectId)
      .eq('enabled', true)
      .order('ordem', { ascending: true })

    if (error) {
      setStatus(error.message)
      return
    }

    setButtons((data || []) as ButtonItem[])
  }

  async function selecionarProjeto(projectId: string) {
    setSelectedProjectId(projectId)
    if (producerKeyId) carregarBotoes(producerKeyId, projectId)
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

  async function conectarObs() {
    const host = localStorage.getItem('stream.obs.host') || '127.0.0.1'
    const port = localStorage.getItem('stream.obs.port') || '4455'
    const password = localStorage.getItem('stream.obs.password') || ''

    if (wsRef.current) {
      try { wsRef.current.close() } catch {}
    }

    setObsStatus('Conectando OBS...')
    const ws = new WebSocket(`ws://${host}:${port}`)
    wsRef.current = ws

    ws.onerror = () => setObsStatus('Erro OBS')
    ws.onclose = () => setObsStatus('OBS offline')

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

  useEffect(() => {
    conectarObs()
  }, [])

  async function executar(button: ButtonItem) {
    if (button.action_type === 'scene' && button.obs_scene_name) {
      try {
        await sendRequest('SetCurrentProgramScene', { sceneName: button.obs_scene_name })
      } catch (error: any) {
        setObsStatus(error?.message || 'Erro ao trocar cena')
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#050914] p-3 text-white">
      <section className="mx-auto max-w-[420px]">
        <div className="mb-3 rounded-xl border border-white/10 bg-[#101827] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">Drop Zone Controller</div>
          <div className="mt-1 text-xs font-bold text-zinc-400">{status} • {obsStatus}</div>

          <select value={selectedProjectId} onChange={(e) => selecionarProjeto(e.target.value)} className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-[#050914] px-3 text-xs font-black uppercase outline-none">
            {projects.length === 0 ? <option value="">Nenhum campeonato</option> : null}
            {projects.map((project) => (
              <option key={project.id} value={project.project_id}>
                {project.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {buttons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm font-bold text-zinc-400">
              Nenhum botão configurado.
            </div>
          ) : buttons.map((button) => (
            <button
              key={button.id}
              onClick={() => executar(button)}
              className="flex h-[82px] w-full items-center justify-center rounded-xl border border-white/10 bg-[#162033] px-4 text-center text-xl font-black uppercase tracking-[0.06em] shadow-lg active:scale-[0.98]"
            >
              {button.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
