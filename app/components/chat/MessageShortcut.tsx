'use client'

import { MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'

type ReferenciaTipo =
  | 'equipe'
  | 'jogador'
  | 'campeonato'
  | 'grupo'
  | 'grupo_campeonato'
  | 'campeonato_grupo'
  | 'jogo'
  | 'confronto'
  | 'apostado'
  | 'moderacao'
  | 'geral'

type ConversaTipo =
  | 'equipe'
  | 'campeonato'
  | 'grupo_campeonato'
  | 'jogo'
  | 'confronto'
  | 'apostado'
  | 'moderacao'
  | 'dm'
  | 'geral'

type MessageShortcutProps = {
  referenciaTipo: ReferenciaTipo
  referenciaId: string
  titulo: string
  avatarUrl?: string | null
  tipo?: ConversaTipo
  label?: string
  compact?: boolean
  className?: string
  title?: string
}

function getTipoPadrao(referenciaTipo: ReferenciaTipo): ConversaTipo {
  if (referenciaTipo === 'jogador') return 'dm'
  if (referenciaTipo === 'grupo' || referenciaTipo === 'campeonato_grupo' || referenciaTipo === 'grupo_campeonato') return 'grupo_campeonato'
  if (referenciaTipo === 'jogo') return 'jogo'
  if (referenciaTipo === 'moderacao') return 'moderacao'
  if (referenciaTipo === 'apostado') return 'apostado'
  if (referenciaTipo === 'confronto') return 'confronto'
  if (referenciaTipo === 'campeonato') return 'campeonato'
  if (referenciaTipo === 'equipe') return 'equipe'
  return 'geral'
}

export default function MessageShortcut({
  referenciaTipo,
  referenciaId,
  titulo,
  avatarUrl,
  tipo,
  label,
  compact = true,
  className = '',
  title = 'Enviar mensagem',
}: MessageShortcutProps) {
  const router = useRouter()

  function abrirMensagem(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()

    const params = new URLSearchParams({
      refTipo: referenciaTipo,
      refId: referenciaId,
      titulo,
      tipo: tipo || getTipoPadrao(referenciaTipo),
    })

    if (avatarUrl) params.set('avatar', avatarUrl)
    router.push(`/chat?${params.toString()}`)
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={abrirMensagem}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') abrirMensagem(event as any)
      }}
      title={title}
      aria-label={title}
      className={[
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border border-blue-200 bg-[#eaf6ff] text-[#2563eb] transition hover:border-[#2563eb] hover:bg-blue-50 active:scale-95',
        compact ? 'h-8 w-8 p-0' : 'h-8 px-2 text-[10px] font-medium uppercase tracking-wide',
        className,
      ].join(' ')}
    >
      <MessageCircle size={15} />
      {!compact && <span>{label || 'Mensagem'}</span>}
    </span>
  )
}
