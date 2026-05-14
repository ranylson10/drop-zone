'use client'

import { ReactNode, useEffect, useState } from 'react'
import { X } from 'lucide-react'

type PlayerCardExpandedProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  card?: ReactNode
  title?: string
  subtitle?: string
  className?: string
}

export default function PlayerCardExpanded({
  open,
  onClose,
  children,
  card,
  title = 'Perfil do jogador',
  subtitle = 'Carta expandida',
  className = '',
}: PlayerCardExpandedProps) {
  const [closing, setClosing] = useState(false)

  function requestClose() {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      onClose()
    }, 260)
  }

  useEffect(() => {
    if (open) setClosing(false)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, closing])

  if (!open) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 top-[64px] z-50 overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-md md:top-[96px] md:p-5"
      role="dialog"
      aria-modal="true"
      onClick={requestClose}
    >
      <style jsx global>{`
        @keyframes lealtOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes lealtOverlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes lealtCardOpen {
          0% {
            opacity: 0;
            transform: translate3d(-18px, 38px, 0) scale(.84) rotateX(9deg) rotateY(-7deg);
            filter: saturate(.65) blur(10px);
          }
          45% {
            opacity: 1;
            transform: translate3d(0, -8px, 0) scale(1.018) rotateX(0deg) rotateY(0deg);
            filter: saturate(1.18) blur(0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1) rotateX(0deg) rotateY(0deg);
            filter: saturate(1) blur(0);
          }
        }

        @keyframes lealtCardClose {
          from {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1) rotateX(0deg) rotateY(0deg);
            filter: saturate(1) blur(0);
          }
          to {
            opacity: 0;
            transform: translate3d(-18px, 28px, 0) scale(.9) rotateX(8deg) rotateY(-5deg);
            filter: saturate(.7) blur(8px);
          }
        }

        @keyframes lealtCardPanelIn {
          from {
            opacity: 0;
            transform: translate3d(-28px, 0, 0) scale(.98);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes lealtScanMove {
          from { transform: translateX(-45%); }
          to { transform: translateX(45%); }
        }

        .lealt-player-overlay-in { animation: lealtOverlayIn 180ms ease-out both; }
        .lealt-player-overlay-out { animation: lealtOverlayOut 260ms ease-in both; }
        .lealt-player-expanded-in { animation: lealtCardOpen 520ms cubic-bezier(.16,1,.3,1) both; transform-origin: 18% 45%; }
        .lealt-player-expanded-out { animation: lealtCardClose 260ms cubic-bezier(.4,0,1,1) both; transform-origin: 18% 45%; }
        .lealt-player-panel-in { animation: lealtCardPanelIn 480ms cubic-bezier(.16,1,.3,1) 120ms both; }
        .lealt-player-scan { animation: lealtScanMove 4.8s linear infinite alternate; }

        @media (prefers-reduced-motion: reduce) {
          .lealt-player-overlay-in,
          .lealt-player-expanded-in,
          .lealt-player-panel-in,
          .lealt-player-scan {
            animation: none !important;
          }
        }
      `}</style>

      <div className={`${closing ? 'lealt-player-overlay-out' : 'lealt-player-overlay-in'} min-h-full`} onClick={requestClose}>
        <div
          className={`${closing ? 'lealt-player-expanded-out' : 'lealt-player-expanded-in'} relative mx-auto grid w-full max-w-7xl overflow-hidden border border-white/20 bg-[#f6f7f8] shadow-[0_30px_90px_rgba(0,0,0,.42)] md:grid-cols-[310px_1fr] ${className}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="lealt-player-scan absolute -left-1/2 top-0 h-full w-2/3 rotate-12 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(37,99,235,.14),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(249,115,22,.12),transparent_32%)]" />
          </div>

          <aside className="relative border-b border-zinc-200 bg-gradient-to-b from-slate-950 via-slate-900 to-black p-4 md:border-b-0 md:border-r md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 text-white md:hidden">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">{subtitle}</div>
                <div className="mt-1 text-sm font-black uppercase tracking-[0.12em]">{title}</div>
              </div>
              <button type="button" onClick={requestClose} className="inline-flex h-10 w-10 items-center justify-center border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className="hidden md:block">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">{subtitle}</div>
              <div className="mt-1 text-sm font-black uppercase tracking-[0.12em] text-white">{title}</div>
            </div>

            <div className="relative mx-auto mt-3 flex max-w-[230px] items-center justify-center md:mt-7">
              <div className="absolute inset-3 rounded-full bg-orange-400/25 blur-3xl" />
              <div className="relative w-full drop-shadow-[0_25px_45px_rgba(0,0,0,.5)]">
                {card}
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-orange-500/15 to-transparent" />
          </aside>

          <section className="lealt-player-panel-in relative min-w-0 bg-[#f6f7f8]">
            <div className="sticky top-0 z-20 hidden items-center justify-between border-b border-zinc-200 bg-white/90 px-5 py-3 backdrop-blur md:flex">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#2563eb]">{subtitle}</div>
                <div className="mt-1 text-sm font-black uppercase tracking-[0.12em] text-[#142340]">{title}</div>
              </div>
              <button type="button" onClick={requestClose} className="inline-flex h-10 items-center justify-center gap-2 border border-zinc-300 bg-white px-4 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600 hover:border-[#2563eb] hover:text-[#2563eb]">
                <X size={14} />
                Fechar
              </button>
            </div>

            {children}
          </section>
        </div>
      </div>
    </div>
  )
}
