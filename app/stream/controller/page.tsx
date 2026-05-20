'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fixedStreamOverlayTemplates, getFixedStreamOverlayTemplate } from '@/lib/streamOverlay'
import { Copy, Eye, EyeOff, Gamepad2, Loader2, MonitorUp, PlugZap, Radio, RefreshCw, Settings, SlidersHorizontal } from 'lucide-react'

type Projeto = {
  id: string
  nome: string
  stream_key: string
}

type OverlayProjeto = {
  id: string
  project_id: string
  nome: string
  template_id: string
  slug?: string
  visivel: boolean
  ordem: number
  fixed?: boolean
  saved?: boolean
}

type ObsScene = {
  sceneName: string
}

type ObsRequestResult = Record<string, unknown>

type PendingRequest = {
  resolve: (value: ObsRequestResult) => void
  reject: (error: Error) => void
}

type ConnStatus = 'offline' | 'connecting' | 'online' | 'error'

const OBS_EVENT_SUBSCRIPTIONS = 64 | 128

function textoSeguro(value: unknown) {
  return String(value || '').trim()
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
  const [streamKey, setStreamKey] = useState(() => {
    if (typeof window === 'undefined') return ''
    return textoSeguro(new URLSearchParams(window.location.search).get('key'))
  })
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [overlays, setOverlays] = useState<OverlayProjeto[]>(() => fixedStreamOverlayTemplates.map((template, index) => ({
    id: template.id,
    project_id: '',
    nome: template.nome,
    template_id: template.id,
    slug: template.slug,
    visivel: true,
    ordem: index + 1,
    fixed: true,
    saved: false,
  })))
  const [loadingProject, setLoadingProject] = useState(false)
  const [salvandoOverlay, setSalvandoOverlay] = useState('')
  const [host, setHost] = useState(() => typeof window !== 'undefined' ? textoSeguro(localStorage.getItem('stream.obs.host')) || '127.0.0.1' : '127.0.0.1')
  const [port, setPort] = useState(() => typeof window !== 'undefined' ? textoSeguro(localStorage.getItem('stream.obs.port')) || '4455' : '4455')
  const [password, setPassword] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('stream.obs.password') || '' : '')
  const [status, setStatus] = useState<ConnStatus>('offline')
  const [statusText, setStatusText] = useState('OBS desconectado')
  const [scenes, setScenes] = useState<ObsScene[]>([])
  const [currentScene, setCurrentScene] = useState('')
  const [tab, setTab] = useState<'controle' | 'overlays' | 'cenas' | 'config'>('controle')

  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map())
  const requestIdRef = useRef(1)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'

  const carregarProjeto = useCallback(async (keyParam?: string) => {
    const key = textoSeguro(keyParam || streamKey)
    if (!key) {
      alert('Cole a chave do projeto primeiro.')
      return
    }

    setLoadingProject(true)
    const { data: proj, error: projError } = await supabase
      .from('stream_projects')
      .select('id, nome, stream_key')
      .eq('stream_key', key)
      .maybeSingle()

    if (projError) {
      setLoadingProject(false)
      alert(`Erro ao buscar projeto: ${projError.message}`)
      return
    }

    if (!proj) {
      setLoadingProject(false)
      setProjeto(null)
      setOverlays(fixedStreamOverlayTemplates.map((template, index) => ({
        id: template.id,
        project_id: '',
        nome: template.nome,
        template_id: template.id,
        slug: template.slug,
        visivel: true,
        ordem: index + 1,
        fixed: true,
        saved: false,
      })))
      alert('Nenhum projeto encontrado com essa chave.')
      return
    }

    const { data: overlayData, error: overlayError } = await supabase
      .from('stream_project_overlays')
      .select('id, project_id, nome, template_id, visivel, ordem')
      .eq('project_id', proj.id)
      .order('ordem', { ascending: true })

    setLoadingProject(false)

    if (overlayError) {
      alert(`Projeto carregado, mas falhou ao buscar overlays: ${overlayError.message}`)
    }

    const overlayRows = (overlayData || []) as OverlayProjeto[]
    const mergedOverlays = fixedStreamOverlayTemplates.map((template, index) => {
      const saved = overlayRows.find((overlay) => overlay.template_id === template.id)
      return saved
        ? { ...saved, slug: template.slug, fixed: true, saved: true }
        : {
            id: template.id,
            project_id: proj.id,
            nome: template.nome,
            template_id: template.id,
            slug: template.slug,
            visivel: true,
            ordem: index + 1,
            fixed: true,
            saved: false,
          }
    })
    const extraOverlays = overlayRows
      .filter((overlay) => !getFixedStreamOverlayTemplate(overlay.template_id))
      .map((overlay) => ({ ...overlay, saved: true }))

    setStreamKey(key)
    setProjeto(proj as Projeto)
    setOverlays([...mergedOverlays, ...extraOverlays])
  }, [streamKey])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (streamKey) carregarProjeto(streamKey)
  }, [carregarProjeto, streamKey])

  function nextRequestId() {
    const id = String(requestIdRef.current)
    requestIdRef.current += 1
    return id
  }

  const sendRequest = useCallback((requestType: string, requestData: ObsRequestResult = {}) => {
    return new Promise<ObsRequestResult>((resolve, reject) => {
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

  const atualizarCenas = useCallback(async () => {
    try {
      const [sceneData, currentData] = await Promise.all([
        sendRequest('GetSceneList'),
        sendRequest('GetCurrentProgramScene'),
      ])

      const obsScenes = Array.isArray(sceneData.scenes) ? sceneData.scenes as ObsScene[] : []
      setScenes(obsScenes)
      setCurrentScene(textoSeguro(currentData.currentProgramSceneName || sceneData.currentProgramSceneName))
      setStatusText(`Conectado: ${obsScenes.length} cenas encontradas`)
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

    ws.onopen = () => {
      setStatusText('Handshake com OBS...')
    }

    ws.onerror = () => {
      setStatus('error')
      setStatusText('Falha ao conectar. Confira se OBS WebSocket esta ativo e porta/senha estao corretas.')
    }

    ws.onclose = () => {
      setStatus((current) => current === 'online' ? 'offline' : current)
      setStatusText((current) => current === 'Conectado ao OBS' ? 'OBS desconectado' : current)
    }

    ws.onmessage = async (event) => {
      let msg: { op?: number; d?: Record<string, unknown> }
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
          d: {
            rpcVersion: 1,
            eventSubscriptions: OBS_EVENT_SUBSCRIPTIONS,
          },
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
          const eventData = data.eventData as { sceneName?: string } | undefined
          setCurrentScene(textoSeguro(eventData?.sceneName))
        }
        return
      }

      if (msg.op === 7) {
        const data = msg.d || {}
        const requestId = textoSeguro(data.requestId)
        const pending = pendingRef.current.get(requestId)
        if (!pending) return

        pendingRef.current.delete(requestId)
        const requestStatus = data.requestStatus as { result?: boolean; comment?: string } | undefined

        if (requestStatus?.result) {
          pending.resolve((data.responseData || {}) as ObsRequestResult)
        } else {
          pending.reject(new Error(requestStatus?.comment || 'Falha no request ao OBS'))
        }
      }
    }
  }

  async function trocarCena(sceneName: string) {
    try {
      await sendRequest('SetCurrentProgramScene', { sceneName })
      setCurrentScene(sceneName)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao trocar cena')
    }
  }

  async function alternarOverlay(overlay: OverlayProjeto) {
    if (!projeto) {
      alert('Carregue uma chave de stream antes de controlar overlays.')
      return
    }

    setSalvandoOverlay(overlay.id)
    const novoValor = !overlay.visivel
    let error: { message: string } | null = null

    if (!overlay.saved) {
      const fixedTemplate = getFixedStreamOverlayTemplate(overlay.template_id)

      if (fixedTemplate) {
        await supabase
          .from('stream_overlay_templates')
          .upsert({
            id: fixedTemplate.id,
            nome: fixedTemplate.nome,
            categoria: fixedTemplate.categoria,
            descricao: fixedTemplate.descricao,
            config_padrao: fixedTemplate.config_padrao,
            ativo: true,
          }, { onConflict: 'id' })

        const result = await supabase
          .from('stream_project_overlays')
          .insert({
            project_id: projeto.id,
            template_id: fixedTemplate.id,
            nome: fixedTemplate.nome,
            config: fixedTemplate.config_padrao,
            visivel: novoValor,
            ordem: overlay.ordem,
          })
          .select('id')
          .single()

        error = result.error

        if (!error && result.data?.id) {
          setOverlays((prev) => prev.map((item) => item.id === overlay.id ? { ...item, id: result.data.id, project_id: projeto.id, visivel: novoValor, saved: true } : item))
        }
      }
    } else {
      const result = await supabase
        .from('stream_project_overlays')
        .update({ visivel: novoValor, updated_at: new Date().toISOString() })
        .eq('id', overlay.id)

      error = result.error
    }

    setSalvandoOverlay('')

    if (error) {
      alert(`Erro ao atualizar overlay: ${error.message}`)
      return
    }

    setOverlays((prev) => prev.map((item) => item.id === overlay.id ? { ...item, visivel: novoValor } : item))
  }

  async function copiar(text: string) {
    await navigator.clipboard.writeText(text)
    alert('Copiado')
  }

  const sceneButtons = scenes.map((scene, index) => ({
    ...scene,
    icon: ['SC', 'TR', 'TB', 'AO', 'GM', 'VS', 'CP', 'GO'][index % 8],
  }))

  return (
    <main className="min-h-screen bg-[#080d16] p-3 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-24px)] max-w-7xl flex-col border border-white/10 bg-[#111827]">
        <header className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-red-500">
              <Radio size={14} />
              Controlador OBS
            </div>
            <h1 className="mt-2 text-xl font-black uppercase">{projeto?.nome || 'Conectar projeto de stream'}</h1>
            <div className="mt-1 text-xs font-semibold text-zinc-400">{projeto ? `Chave: ${projeto.stream_key}` : 'Cole a chave copiada em Projetos de Transmissao.'}</div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto]">
            <input
              value={streamKey}
              onChange={(event) => setStreamKey(event.target.value)}
              placeholder="Cole a chave do projeto"
              className="h-11 border border-white/10 bg-[#0b1220] px-3 text-sm font-bold outline-none focus:border-red-500"
            />
            <button onClick={() => carregarProjeto()} disabled={loadingProject} className="inline-flex h-11 items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-60">
              {loadingProject ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Carregar
            </button>
            {projeto ? (
              <Link href={`/stream/editor/${projeto.id}`} target="_blank" className="inline-flex h-11 items-center justify-center gap-2 border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-[0.14em]">
                <SlidersHorizontal size={14} />
                Editor
              </Link>
            ) : null}
          </div>
        </header>

        {isHttps ? (
          <div className="border-b border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-xs font-semibold text-yellow-100">
            Aviso: se o OBS bloquear conexao com ws://127.0.0.1 por a pagina estar em HTTPS, use este controlador como dock em ambiente HTTP/local ou habilite WebSocket seguro no OBS.
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_340px]">
          <div className="min-h-0 p-4">
            <div className="mb-4 grid grid-cols-4 gap-2">
              {([
                ['controle', 'Controle', Gamepad2],
                ['overlays', 'Overlays', Eye],
                ['cenas', 'Cenas', MonitorUp],
                ['config', 'OBS', Settings],
              ] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex h-11 items-center justify-center gap-2 border text-[10px] font-black uppercase tracking-[0.12em] ${tab === id ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-[#0b1220] text-zinc-300'}`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {tab === 'controle' ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <PanelTitle title="Cenas OBS" subtitle={statusText} />
                <PanelTitle title="Overlays do projeto" subtitle={projeto ? `${overlays.length} overlays carregadas` : 'Carregue uma chave'} />
                <SceneGrid scenes={sceneButtons} currentScene={currentScene} onScene={trocarCena} />
                <OverlayGrid overlays={overlays} origem={origem} streamKey={projeto?.stream_key || streamKey || 'generico'} salvandoOverlay={salvandoOverlay} onToggle={alternarOverlay} onCopy={copiar} />
              </div>
            ) : null}

            {tab === 'overlays' ? (
              <div>
                <PanelTitle title="Overlays" subtitle="Mostre, esconda e copie links para o OBS." />
                <OverlayGrid overlays={overlays} origem={origem} streamKey={projeto?.stream_key || streamKey || 'generico'} salvandoOverlay={salvandoOverlay} onToggle={alternarOverlay} onCopy={copiar} />
              </div>
            ) : null}

            {tab === 'cenas' ? (
              <div>
                <PanelTitle title="Cenas OBS" subtitle={statusText} />
                <SceneGrid scenes={sceneButtons} currentScene={currentScene} onScene={trocarCena} />
              </div>
            ) : null}

            {tab === 'config' ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="border border-white/10 bg-[#0b1220] p-4">
                  <div className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Conexao OBS WebSocket</div>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <EditorField label="Host" value={host} onChange={setHost} />
                      <EditorField label="Porta" value={port} onChange={setPort} />
                    </div>
                    <EditorField label="Senha" value={password} type="password" onChange={setPassword} />
                    <div className="flex flex-wrap gap-2">
                      <button onClick={conectarObs} className="inline-flex h-11 items-center gap-2 border border-red-600 bg-red-600 px-4 text-[10px] font-black uppercase tracking-[0.14em]">
                        <PlugZap size={14} />
                        Conectar OBS
                      </button>
                      <button onClick={atualizarCenas} disabled={status !== 'online'} className="inline-flex h-11 items-center gap-2 border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-40">
                        <RefreshCw size={14} />
                        Importar cenas
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border border-white/10 bg-[#0b1220] p-4">
                  <div className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Links principais</div>
                  {projeto ? (
                    <div className="space-y-3">
                      <LinkBox label="Controlador OBS" url={`${origem}/stream/controller?key=${projeto.stream_key}`} onCopy={copiar} />
                      <LinkBox label="Scoreboard OBS" url={`${origem}/stream/overlay/${projeto.stream_key}/scoreboard`} onCopy={copiar} />
                    </div>
                  ) : (
                    <div className="text-sm font-semibold text-zinc-400">Carregue uma chave para ver os links.</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="border-t border-white/10 bg-[#0b1220] p-4 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Status</div>
                <div className={`mt-1 text-sm font-black uppercase ${status === 'online' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : 'text-zinc-300'}`}>{status}</div>
              </div>
              <button onClick={conectarObs} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                <PlugZap size={14} />
                OBS
              </button>
            </div>

            <div className="space-y-3">
              <div className="border border-white/10 bg-[#111827] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Cena atual</div>
                <div className="mt-2 truncate text-lg font-black uppercase">{currentScene || '-'}</div>
              </div>
              <div className="border border-white/10 bg-[#111827] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Overlays visiveis</div>
                <div className="mt-2 text-3xl font-black">{overlays.filter((overlay) => overlay.visivel).length}</div>
              </div>
              <div className="border border-white/10 bg-[#111827] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Projeto</div>
                <div className="mt-2 text-sm font-black uppercase">{projeto?.nome || 'Nao carregado'}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border border-white/10 bg-[#0b1220] p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{title}</div>
      <div className="mt-2 text-xs font-semibold text-zinc-500">{subtitle}</div>
    </div>
  )
}

function SceneGrid({ scenes, currentScene, onScene }: { scenes: Array<ObsScene & { icon: string }>; currentScene: string; onScene: (sceneName: string) => void }) {
  if (!scenes.length) {
    return <div className="border border-dashed border-white/10 bg-[#0b1220] p-6 text-sm font-semibold text-zinc-400 xl:col-span-2">Conecte no OBS e clique em Importar cenas.</div>
  }

  return (
    <div className="grid gap-3 xl:col-span-2 md:grid-cols-2">
      {scenes.map((scene) => {
        const active = scene.sceneName === currentScene
        return (
          <button
            key={scene.sceneName}
            onClick={() => onScene(scene.sceneName)}
            className={`flex min-h-[82px] items-center gap-4 border p-4 text-left transition hover:-translate-y-0.5 ${active ? 'border-yellow-400 bg-yellow-400/10 text-yellow-100' : 'border-white/10 bg-[#0b1220] text-white'}`}
          >
            <span className="flex h-12 w-12 items-center justify-center border border-white/10 bg-white/5 text-xl">{scene.icon}</span>
            <span className="min-w-0 flex-1 truncate text-base font-black uppercase">{scene.sceneName}</span>
            {active ? <span className="text-lg font-black text-yellow-300">ON</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function OverlayGrid({
  overlays,
  origem,
  streamKey,
  salvandoOverlay,
  onToggle,
  onCopy,
}: {
  overlays: OverlayProjeto[]
  origem: string
  streamKey: string
  salvandoOverlay: string
  onToggle: (overlay: OverlayProjeto) => void
  onCopy: (text: string) => void
}) {
  if (!overlays.length) {
    return <div className="border border-dashed border-white/10 bg-[#0b1220] p-6 text-sm font-semibold text-zinc-400 xl:col-span-2">Nenhuma overlay criada. Abra o Editor visual e adicione uma overlay.</div>
  }

  return (
    <div className="grid gap-3 xl:col-span-2 md:grid-cols-2">
      {overlays.map((overlay) => {
        const fixedTemplate = getFixedStreamOverlayTemplate(overlay.template_id)
        const url = fixedTemplate
          ? `${origem}/stream/overlay/${streamKey || 'generico'}/${fixedTemplate.slug}`
          : `${origem}/stream/render/${overlay.id}`
        return (
          <div key={overlay.id} className={`border ${overlay.visivel ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-[#0b1220] text-zinc-300'}`}>
            <div className="flex min-h-[74px] items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="truncate text-base font-black uppercase">{overlay.nome}</div>
                <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">{overlay.template_id}</div>
              </div>
              <button onClick={() => onToggle(overlay)} disabled={salvandoOverlay === overlay.id} className="flex h-11 w-11 items-center justify-center border border-white/20 bg-black/10 disabled:opacity-50">
                {salvandoOverlay === overlay.id ? <Loader2 size={16} className="animate-spin" /> : overlay.visivel ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="border-t border-white/15 p-3">
              <div className="mb-2 break-all text-[10px] font-semibold opacity-80">{url}</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onCopy(url)} className="inline-flex h-9 items-center justify-center gap-2 border border-white/20 bg-black/10 px-2 text-[9px] font-black uppercase tracking-[0.14em]">
                  <Copy size={12} />
                  Copiar OBS
                </button>
                <Link href={`/stream/render/${overlay.id}`} target="_blank" className="inline-flex h-9 items-center justify-center gap-2 border border-white/20 bg-black/10 px-2 text-[9px] font-black uppercase tracking-[0.14em]">
                  <MonitorUp size={12} />
                  Abrir
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EditorField({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full border border-white/10 bg-[#111827] px-3 text-sm font-bold outline-none focus:border-red-500" />
    </label>
  )
}

function LinkBox({ label, url, onCopy }: { label: string; url: string; onCopy: (text: string) => void }) {
  return (
    <div className="border border-white/10 bg-[#111827] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</div>
      <div className="mt-2 break-all text-xs font-semibold text-zinc-300">{url}</div>
      <button onClick={() => onCopy(url)} className="mt-3 inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
        <Copy size={13} />
        Copiar
      </button>
    </div>
  )
}
