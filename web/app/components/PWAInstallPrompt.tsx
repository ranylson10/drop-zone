'use client'

import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'dropzone-install-dismissed'

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const canShow = useMemo(() => isMobile && !dismissed && !isStandaloneMode(), [isMobile, dismissed])

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1')
    setIsMobile(window.matchMedia('(max-width: 1023px)').matches)

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  async function instalar() {
    if (!installEvent) {
      setExpanded((value) => !value)
      return
    }

    await installEvent.prompt()
    const choice = await installEvent.userChoice.catch(() => null)
    if (choice?.outcome === 'accepted') {
      window.localStorage.setItem(DISMISS_KEY, '1')
      setDismissed(true)
    }
    setInstallEvent(null)
  }

  function fechar() {
    window.localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (!canShow) return null

  return (
    <div className="fixed inset-x-3 bottom-[76px] z-[130] rounded-lg border border-emerald-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.16)] xl:hidden">
      <div className="flex items-center gap-3">
        <img src="/brand/dropzone-icon.png" alt="DropZone" className="h-10 w-10 rounded-lg object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black text-slate-950">Instalar DropZone</p>
          <p className="truncate text-[11px] font-semibold text-slate-500">
            {installEvent ? 'Use como app no celular.' : 'Se o botao nao aparecer, veja o caminho manual.'}
          </p>
        </div>
        <button type="button" onClick={instalar} className="h-9 rounded bg-[#008069] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white">
          {installEvent ? 'Instalar' : 'Ver'}
        </button>
        <button type="button" onClick={fechar} className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 bg-white text-slate-500" aria-label="Fechar aviso">
          <X size={16} />
        </button>
      </div>
      {expanded ? (
        <div className="mt-3 rounded-md bg-emerald-50 p-3 text-[11px] font-bold leading-5 text-slate-700">
          <p>Android Chrome: toque no menu do navegador e escolha Adicionar a tela inicial.</p>
          <p className="mt-1">iPhone Safari: toque em Compartilhar e depois Adicionar a Tela de Inicio.</p>
        </div>
      ) : null}
    </div>
  )
}
