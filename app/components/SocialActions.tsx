'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Flame, Heart, Loader2, Skull, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type EntityType = 'perfil' | 'jogador' | 'equipe' | 'produtora' | 'campeonato'
type ActionType = 'torcer' | 'seguir' | 'secar' | 'curtir'

type SocialActionsProps = {
 entityId: string | null | undefined
 entityType: EntityType
 variant?: 'dark' | 'light'
 compact?: boolean
 title?: string
}

type Stats = Record<ActionType, number>

const emptyStats: Stats = {
 torcer: 0,
 seguir: 0,
 secar: 0,
 curtir: 0,
}

const actions: Array<{
 type: ActionType
 label: string
 activeLabel: string
 description: string
 Icon: typeof Heart
}> = [
 {
 type: 'torcer',
 label: 'Torcer',
 activeLabel: 'Torcendo',
 description: 'Mostra apoio público para esse perfil.',
 Icon: Heart,
 },
 {
 type: 'seguir',
 label: 'Seguir',
 activeLabel: 'Seguindo',
 description: 'Acompanha novidades e movimentações.',
 Icon: Bell,
 },
 {
 type: 'secar',
 label: 'Secar',
 activeLabel: 'Secando',
 description: 'Rivalidade saudável dentro da comunidade.',
 Icon: Skull,
 },
 {
 type: 'curtir',
 label: 'Curtir',
 activeLabel: 'Curtido',
 description: 'Like rápido no perfil.',
 Icon: Flame,
 },
]

function formatCount(value: number) {
 if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`
 if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
 return String(value)
}

export default function SocialActions({
 entityId,
 entityType,
 variant = 'dark',
 compact = false,
 title = 'Torcida social',
}: SocialActionsProps) {
 const [loading, setLoading] = useState(true)
 const [savingAction, setSavingAction] = useState<ActionType | null>(null)
 const [stats, setStats] = useState<Stats>(emptyStats)
 const [myActions, setMyActions] = useState<ActionType[]>([])
 const [errorMessage, setErrorMessage] = useState<string | null>(null)

 const isDark = variant === 'dark'

 const loadData = useCallback(async () => {
 if (!entityId) {
 setLoading(false)
 return
 }

 setLoading(true)
 setErrorMessage(null)

 const {
 data: { user },
 } = await supabase.auth.getUser()

 const { data, error } = await supabase
 .from('interacoes_sociais')
 .select('tipo_interacao, usuario_id')
 .eq('alvo_tipo', entityType)
 .eq('alvo_id', entityId)

 if (error) {
 console.error('Erro ao carregar interações sociais:', error)
 setErrorMessage('Rode o SQL das interações sociais no Supabase.')
 setStats(emptyStats)
 setMyActions([])
 setLoading(false)
 return
 }

 const nextStats: Stats = { ...emptyStats }
 const nextMyActions: ActionType[] = []

 ;(data || []).forEach((item: any) => {
 const tipo = item.tipo_interacao as ActionType
 if (tipo in nextStats) nextStats[tipo] += 1
 if (user?.id && item.usuario_id === user.id && tipo in nextStats) nextMyActions.push(tipo)
 })

 setStats(nextStats)
 setMyActions(nextMyActions)
 setLoading(false)
 }, [entityId, entityType])

 useEffect(() => {
 loadData()
 }, [loadData])

 const total = useMemo(() => stats.torcer + stats.seguir + stats.secar + stats.curtir, [stats])

 const toggleAction = async (tipo: ActionType) => {
 if (!entityId || savingAction) return

 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user) {
 alert('Você precisa estar logado para interagir.')
 return
 }

 const alreadyActive = myActions.includes(tipo)
 const previousActions = myActions
 const previousStats = stats

 setSavingAction(tipo)
 setErrorMessage(null)

 let nextActions = alreadyActive ? myActions.filter((action) => action !== tipo) : [...myActions, tipo]
 let nextStats: Stats = {
 ...stats,
 [tipo]: Math.max(0, stats[tipo] + (alreadyActive ? -1 : 1)),
 }

 if (!alreadyActive && (tipo === 'torcer' || tipo === 'secar')) {
 const opposite = tipo === 'torcer' ? 'secar' : 'torcer'
 if (nextActions.includes(opposite)) {
 nextActions = nextActions.filter((action) => action !== opposite)
 nextStats = { ...nextStats, [opposite]: Math.max(0, nextStats[opposite] - 1) }
 }
 }

 setMyActions(nextActions)
 setStats(nextStats)

 let resultError: any = null

 if (alreadyActive) {
 const { error } = await supabase
 .from('interacoes_sociais')
 .delete()
 .match({ usuario_id: user.id, alvo_tipo: entityType, alvo_id: entityId, tipo_interacao: tipo })
 resultError = error
 } else {
 if (tipo === 'torcer' || tipo === 'secar') {
 const opposite = tipo === 'torcer' ? 'secar' : 'torcer'
 const { error } = await supabase
 .from('interacoes_sociais')
 .delete()
 .match({ usuario_id: user.id, alvo_tipo: entityType, alvo_id: entityId, tipo_interacao: opposite })
 resultError = error
 }

 if (!resultError) {
 const { error } = await supabase.from('interacoes_sociais').upsert(
 {
 usuario_id: user.id,
 alvo_tipo: entityType,
 alvo_id: entityId,
 tipo_interacao: tipo,
 },
 { onConflict: 'usuario_id,alvo_tipo,alvo_id,tipo_interacao' }
 )
 resultError = error
 }
 }

 if (resultError) {
 console.error('Erro ao salvar interação social:', resultError)
 setMyActions(previousActions)
 setStats(previousStats)
 setErrorMessage('Não foi possível salvar a interação agora.')
 }

 setSavingAction(null)
 }

 const cardClass = isDark
 ? 'border-zinc-200 bg-white/[0.04] text-[#142340]'
 : 'border-zinc-200 bg-white text-[#142340]'

 const buttonBase = isDark
 ? 'border-zinc-200 bg-zinc-50 hover:border-[#2563eb] hover:bg-zinc-50'
 : 'border-zinc-200 bg-white hover:border-zinc-900'

 const activeButton = isDark
 ? 'border-[#2563eb]/50 bg-[#2563eb]/10 text-[#2563eb]'
 : 'border-[#2563eb] bg-[#eefcf3] text-[#142340]'

 if (loading) {
 return (
 <div className={`border p-4 ${cardClass}`}>
 <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 <Loader2 size={14} className="animate-spin" />
 Carregando torcida...
 </div>
 </div>
 )
 }

 return (
 <section className={`border ${compact ? 'p-2' : 'p-4'} ${cardClass}`}>
 <div className={`${compact ? 'mb-2' : 'mb-4'} flex flex-col gap-2 md:flex-row md:items-center md:justify-between`}>
 <div>
 <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isDark ? 'text-[#2563eb]' : 'text-[#2563eb]'}`}>
 // {title}
 </p>
 <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.10em] text-zinc-500">
 {formatCount(total)} interações no total
 </p>
 </div>

 <div className={`inline-flex w-fit items-center gap-2 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${isDark ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}`}>
 <Users size={13} />
 Apoio · rivalidade · alcance
 </div>
 </div>

 <div className={`grid gap-2 ${compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4'}`}>
 {actions.map(({ type, label, activeLabel, description, Icon }) => {
 const active = myActions.includes(type)
 const disabled = savingAction !== null

 return (
 <button
 key={type}
 type="button"
 onClick={() => toggleAction(type)}
 disabled={disabled}
 title={description}
 className={`relative border text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${compact ? 'min-h-[48px] px-2 py-2' : 'min-h-[82px] p-3'} ${active ? activeButton : buttonBase}`}
 >
 <div className="flex items-start justify-between gap-2">
 <Icon size={compact ? 15 : 19} fill={active ? 'currentColor' : 'none'} />
 <span className={`${compact ? 'text-[12px]' : 'text-[18px]'} font-semibold`}>{formatCount(stats[type])}</span>
 </div>

 <div className={compact ? 'mt-1' : 'mt-3'}>
 <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-bold uppercase tracking-[0.12em]`}>{active ? activeLabel : label}</p>
 {!compact ? <p className="mt-1 text-[9px] font-bold uppercase leading-4 text-zinc-500">{description}</p> : null}
 </div>

 {savingAction === type ? <Loader2 size={14} className="absolute bottom-2 right-2 animate-spin text-zinc-500" /> : null}
 </button>
 )
 })}
 </div>

 {errorMessage ? (
 <div className={`mt-3 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${isDark ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-600'}`}>
 {errorMessage}
 </div>
 ) : null}
 </section>
 )
}
