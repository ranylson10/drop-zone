'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
 CalendarDays,
 Clock3,
 MapPinned,
 Trophy,
 ShieldAlert,
 ShieldCheck,
 Layers3,
 ListChecks,
 Users,
} from 'lucide-react'

type AgendaJogoRow = {
 jogo_id: string
 campeonato_equipe_id: string
 campeonato_id: string
 fase_id: string | null
 grupo_id: string | null
 nome_jogo: string
 nome_bloco: string | null
 data_jogo: string | null
 hora_jogo: string | null
 data_inicio: string | null
 data_fim: string | null
 duracao_estimada_min: number | null
 quantidade_partidas: number
 quedas: any
 agenda_publicada: boolean
 bloqueia_escalacao_ate: string | null
 bloqueia_alteracao_equipe_ate: string | null
 fase_nome: string | null
 campeonato_nome: string | null
 campeonato_logo_url: string | null
 campeonato_banner_url: string | null
 jogadores_escalados_total: number
}

type AgendaItem = AgendaJogoRow & {
 jogos_ids: string[]
 total_jogos: number
 mapas: string[]
 jogos_nomes: string[]
 titulo_compromisso: string
 campeonato_equipe_ids: string[]
}

function formatarData(data?: string | null) {
 if (!data) return 'Sem data'
 const d = new Date(`${data}T00:00:00`)
 if (Number.isNaN(d.getTime())) return data
 return new Intl.DateTimeFormat('pt-BR', {
 day: '2-digit',
 month: 'short',
 year: 'numeric',
 }).format(d)
}

function formatarDia(data?: string | null) {
 if (!data) return '--'
 const d = new Date(`${data}T00:00:00`)
 if (Number.isNaN(d.getTime())) return '--'
 return new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(d)
}

function formatarMes(data?: string | null) {
 if (!data) return 'SEM'
 const d = new Date(`${data}T00:00:00`)
 if (Number.isNaN(d.getTime())) return 'SEM'
 return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d)
}

function formatarHora(hora?: string | null) {
 if (!hora) return 'Sem horário'
 return String(hora).slice(0, 5)
}

function formatarDataHoraIso(iso?: string | null) {
 if (!iso) return null
 const d = new Date(iso)
 if (Number.isNaN(d.getTime())) return null
 return new Intl.DateTimeFormat('pt-BR', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 }).format(d)
}

function extrairMapas(quedas: any): string[] {
 if (!quedas) return []

 if (Array.isArray(quedas)) {
 return quedas
 .map((q) => {
 if (typeof q === 'string') return q
 if (q?.mapa) return String(q.mapa)
 if (q?.nome) return String(q.nome)
 return ''
 })
 .filter(Boolean)
 }

 if (typeof quedas === 'object') {
 return Object.values(quedas)
 .map((v: any) => {
 if (typeof v === 'string') return v
 if (v?.mapa) return String(v.mapa)
 if (v?.nome) return String(v.nome)
 return String(v || '').trim()
 })
 .filter(Boolean)
 }

 return []
}

function chaveDataHora(item: Pick<AgendaJogoRow, 'data_inicio' | 'data_jogo' | 'hora_jogo'>) {
 return item.data_inicio || (item.data_jogo ? `${item.data_jogo}T${item.hora_jogo || '00:00:00'}` : '')
}

function statusJogo(item: AgendaItem) {
 const agora = new Date()

 if (item.data_inicio) {
 const inicio = new Date(item.data_inicio)
 const fim = item.data_fim ? new Date(item.data_fim) : null

 if (!Number.isNaN(inicio.getTime()) && agora < inicio) {
 return { label: 'Próximo', className: 'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/20' }
 }

 if (!Number.isNaN(inicio.getTime()) && (!fim || Number.isNaN(fim.getTime()) || agora <= fim)) {
 return { label: 'Em andamento', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' }
 }

 if (fim && !Number.isNaN(fim.getTime()) && agora > fim) {
 return { label: 'Finalizado', className: 'bg-zinc-200 text-zinc-700 border-zinc-300' }
 }
 }

 if (item.data_jogo) {
 const base = new Date(`${item.data_jogo}T${item.hora_jogo || '00:00:00'}`)
 if (!Number.isNaN(base.getTime())) {
 if (agora <= base) {
 return { label: 'Próximo', className: 'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/20' }
 }
 return { label: 'Finalizado', className: 'bg-zinc-200 text-zinc-700 border-zinc-300' }
 }
 }

 return { label: 'Agendado', className: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20' }
}

function ordenarAgenda(a: AgendaItem, b: AgendaItem) {
 return new Date(chaveDataHora(a) || 0).getTime() - new Date(chaveDataHora(b) || 0).getTime()
}

function normalizarTexto(valor?: string | null) {
 return String(valor || '').trim().toLowerCase()
}


function limparTituloCompromisso(nome?: string | null) {
 const bruto = String(nome || '').trim()
 if (!bruto) return ''

 const semQueda = bruto
 .replace(/\s*[-–—]?\s*queda\s*\d+\s*$/i, '')
 .replace(/^queda\s*\d+\s*[-–—]?\s*/i, '')
 .replace(/\s*[-–—]?\s*q\s*\d+\s*$/i, '')
 .trim()

 return semQueda || 'Jogo'
}

function chaveCompromisso(item: AgendaJogoRow) {
 const data = item.data_jogo || item.data_inicio?.slice(0, 10) || 'sem-data'
 const hora = item.hora_jogo || item.data_inicio?.slice(11, 16) || 'sem-hora'
 const blocoLimpo = limparTituloCompromisso(item.nome_bloco)
 const nomeLimpo = limparTituloCompromisso(item.nome_jogo)
 const tituloBase = normalizarTexto(blocoLimpo || nomeLimpo || 'jogo')

 return [
 item.campeonato_id,
 item.fase_id || 'sem-fase',
 item.grupo_id || 'sem-grupo',
 data,
 hora,
 tituloBase,
 ].join('|')
}

function agruparJogosEmCompromissos(jogos: AgendaJogoRow[]): AgendaItem[] {
 const grupos = new Map<string, AgendaItem>()

 jogos.forEach((jogo) => {
 const chave = chaveCompromisso(jogo)
 const mapasJogo = extrairMapas(jogo.quedas)
 const tituloCompromisso = limparTituloCompromisso(jogo.nome_bloco) || limparTituloCompromisso(jogo.nome_jogo) || 'Jogo'
 const existente = grupos.get(chave)

 if (!existente) {
 grupos.set(chave, {
 ...jogo,
 nome_jogo: tituloCompromisso,
 nome_bloco: tituloCompromisso,
 jogos_ids: [jogo.jogo_id],
 total_jogos: 1,
 mapas: mapasJogo,
 jogos_nomes: jogo.nome_jogo ? [jogo.nome_jogo] : [],
 titulo_compromisso: tituloCompromisso,
 campeonato_equipe_ids: jogo.campeonato_equipe_id ? [jogo.campeonato_equipe_id] : [],
 quantidade_partidas: Number(jogo.quantidade_partidas || 1),
 })
 return
 }

 existente.jogos_ids.push(jogo.jogo_id)
 existente.total_jogos += 1
 if (jogo.campeonato_equipe_id && !existente.campeonato_equipe_ids.includes(jogo.campeonato_equipe_id)) {
 existente.campeonato_equipe_ids.push(jogo.campeonato_equipe_id)
 }
 existente.jogadores_escalados_total = Math.max(existente.jogadores_escalados_total || 0, jogo.jogadores_escalados_total || 0)
 existente.mapas = Array.from(new Set([...existente.mapas, ...mapasJogo]))
 existente.jogos_nomes = Array.from(new Set([...existente.jogos_nomes, jogo.nome_jogo].filter(Boolean)))

 // Quando o banco salva cada queda como uma linha em `jogos`, o compromisso real é o grupo dessas linhas.
 // Por isso o total exibido deve ser o número de linhas agrupadas, não a soma de `quantidade_partidas`
 // de cada queda, que poderia virar 9 em um jogo com 3 quedas.
 existente.quantidade_partidas = Math.max(existente.quantidade_partidas || 0, Number(jogo.quantidade_partidas || 1))

 const atual = new Date(chaveDataHora(existente) || 0).getTime()
 const novo = new Date(chaveDataHora(jogo) || 0).getTime()
 if (novo && (!atual || novo < atual)) {
 existente.data_jogo = jogo.data_jogo
 existente.hora_jogo = jogo.hora_jogo
 existente.data_inicio = jogo.data_inicio
 }

 if (jogo.data_fim) {
 const fimAtual = new Date(existente.data_fim || 0).getTime()
 const fimNovo = new Date(jogo.data_fim).getTime()
 if (!fimAtual || fimNovo > fimAtual) existente.data_fim = jogo.data_fim
 }
 })

 return Array.from(grupos.values()).sort(ordenarAgenda)
}

export default function AbaAgenda({ equipeId }: { equipeId: string }) {
 const [loading, setLoading] = useState(true)
 const [agenda, setAgenda] = useState<AgendaItem[]>([])

 const carregarAgenda = useCallback(async () => {
 try {
 setLoading(true)

 const { data: inscricoes, error: inscricoesError } = await supabase
 .from('campeonato_equipes')
 .select('id, campeonato_id')
 .eq('equipe_id', equipeId)

 if (inscricoesError) throw inscricoesError

 const campeonatoEquipeIds = Array.from(
 new Set((inscricoes || []).map((r: any) => String(r?.id || '').trim()).filter(Boolean))
 )

 if (campeonatoEquipeIds.length === 0) {
 setAgenda([])
 return
 }

 const { data: jogoEquipes, error: jogoEquipesError } = await supabase
 .from('jogo_equipes')
 .select('jogo_id, campeonato_equipe_id')
 .in('campeonato_equipe_id', campeonatoEquipeIds)

 if (jogoEquipesError) throw jogoEquipesError

 const jogoIds = Array.from(
 new Set((jogoEquipes || []).map((r: any) => String(r?.jogo_id || '').trim()).filter(Boolean))
 )

 if (jogoIds.length === 0) {
 setAgenda([])
 return
 }

 const { data: jogosRows, error: jogosError } = await supabase
 .from('jogos')
 .select(`
 id,
 campeonato_id,
 fase_id,
 grupo_id,
 nome,
 nome_bloco,
 data_jogo,
 hora_jogo,
 data_inicio,
 data_fim,
 duracao_estimada_min,
 quantidade_partidas,
 quedas,
 agenda_publicada,
 bloqueia_escalacao_ate,
 bloqueia_alteracao_equipe_ate
 `)
 .in('id', jogoIds)

 if (jogosError) throw jogosError

 const faseIds = Array.from(
 new Set((jogosRows || []).map((r: any) => String(r?.fase_id || '').trim()).filter(Boolean))
 )

 const { data: fasesRows, error: fasesError } = faseIds.length
 ? await supabase.from('campeonato_fases').select('id, nome').in('id', faseIds)
 : { data: [], error: null as any }

 if (fasesError) throw fasesError

 const faseMap = new Map<string, string>()
 ;(fasesRows || []).forEach((f: any) => faseMap.set(String(f.id), String(f.nome || '')))

 const campeonatoIds = Array.from(
 new Set((jogosRows || []).map((r: any) => String(r?.campeonato_id || '').trim()).filter(Boolean))
 )

 const { data: campeonatosRows, error: campeonatosError } = campeonatoIds.length
 ? await supabase
 .from('campeonatos')
 .select('id, nome, logo_url, banner_url')
 .in('id', campeonatoIds)
 : { data: [], error: null as any }

 if (campeonatosError) throw campeonatosError

 const { data: jogadoresCampeonatoRows, error: jogadoresCampeonatoError } = campeonatoIds.length
 ? await supabase
 .from('jogadores_campeonato')
 .select('id, campeonato_id, equipe_id, equipe_avulsa_id, status')
 .in('campeonato_id', campeonatoIds)
 .eq('equipe_id', equipeId)
 : { data: [], error: null as any }

 if (jogadoresCampeonatoError) throw jogadoresCampeonatoError

 const jogadoresPorCampeonato = new Map<string, number>()
 ;(jogadoresCampeonatoRows || []).forEach((j: any) => {
 const statusJogador = String(j?.status || 'ativo').toLowerCase()
 if (['removido', 'cancelado', 'inativo'].includes(statusJogador)) return
 const campeonatoId = String(j?.campeonato_id || '').trim()
 if (!campeonatoId) return
 jogadoresPorCampeonato.set(campeonatoId, (jogadoresPorCampeonato.get(campeonatoId) || 0) + 1)
 })

 const campeonatoMap = new Map<string, { nome: string; logo_url: string | null; banner_url: string | null }>()
 ;(campeonatosRows || []).forEach((c: any) => {
 campeonatoMap.set(String(c.id), {
 nome: String(c.nome || 'Campeonato'),
 logo_url: c.logo_url || null,
 banner_url: c.banner_url || null,
 })
 })

 const jogoEquipeMap = new Map<string, string>()
 ;(jogoEquipes || []).forEach((je: any) => {
 const jogoId = String(je?.jogo_id || '').trim()
 const campeonatoEquipeId = String(je?.campeonato_equipe_id || '').trim()
 if (jogoId && campeonatoEquipeId && !jogoEquipeMap.has(jogoId)) {
 jogoEquipeMap.set(jogoId, campeonatoEquipeId)
 }
 })

 const jogosNormalizados: AgendaJogoRow[] = ((jogosRows || []) as any[])
 .filter((jogo) => jogo.agenda_publicada !== false)
 .map((jogo) => {
 const campeonatoInfo = campeonatoMap.get(String(jogo.campeonato_id))

 return {
 jogo_id: String(jogo.id),
 campeonato_equipe_id: jogoEquipeMap.get(String(jogo.id)) || '',
 campeonato_id: String(jogo.campeonato_id),
 fase_id: jogo.fase_id || null,
 grupo_id: jogo.grupo_id || null,
 nome_jogo: String(jogo.nome || 'Jogo'),
 nome_bloco: jogo.nome_bloco || null,
 data_jogo: jogo.data_jogo || null,
 hora_jogo: jogo.hora_jogo || null,
 data_inicio: jogo.data_inicio || null,
 data_fim: jogo.data_fim || null,
 duracao_estimada_min: jogo.duracao_estimada_min ?? null,
 quantidade_partidas: Number(jogo.quantidade_partidas || 0),
 quedas: jogo.quedas || {},
 agenda_publicada: Boolean(jogo.agenda_publicada),
 bloqueia_escalacao_ate: jogo.bloqueia_escalacao_ate || null,
 bloqueia_alteracao_equipe_ate: jogo.bloqueia_alteracao_equipe_ate || null,
 fase_nome: jogo.fase_id ? faseMap.get(String(jogo.fase_id)) || null : null,
 campeonato_nome: campeonatoInfo?.nome || 'Campeonato',
 campeonato_logo_url: campeonatoInfo?.logo_url || null,
 campeonato_banner_url: campeonatoInfo?.banner_url || null,
 jogadores_escalados_total: jogadoresPorCampeonato.get(String(jogo.campeonato_id)) || 0,
 }
 })

 setAgenda(agruparJogosEmCompromissos(jogosNormalizados))
 } catch (error) {
 console.error('Erro ao carregar agenda da equipe:', error)
 setAgenda([])
 } finally {
 setLoading(false)
 }
 }, [equipeId])

 useEffect(() => {
 carregarAgenda()
 }, [carregarAgenda])

 const proximos = useMemo(() => agenda.filter((item) => statusJogo(item).label !== 'Finalizado'), [agenda])
 const historico = useMemo(() => agenda.filter((item) => statusJogo(item).label === 'Finalizado'), [agenda])

 const renderListaItem = (item: AgendaItem) => {
 const status = statusJogo(item)
 const mapas = item.mapas
 const titulo = item.campeonato_nome || 'Campeonato'
 const subtitulo = item.titulo_compromisso || item.nome_bloco || item.nome_jogo || 'Jogo'
 const totalQuedas = item.total_jogos > 1 ? item.total_jogos : (mapas.length || item.quantidade_partidas || 1)

 return (
 <div key={`${item.jogo_id}-${item.jogos_ids.join('-')}`} className="border border-zinc-200 bg-white px-4 py-3">
 <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
 <div className="flex min-w-0 items-center gap-4">
 <div className="relative h-[56px] min-w-[78px] overflow-hidden border border-zinc-200 bg-zinc-50">
 {item.campeonato_logo_url || item.campeonato_banner_url ? (
 <img
 src={item.campeonato_logo_url || item.campeonato_banner_url || ''}
 alt={titulo}
 className="h-full w-full object-contain p-1"
 />
 ) : (
 <div className="flex h-full w-full flex-col items-center justify-center text-center">
 <p className="text-[18px] font-semibold leading-none text-[#142340]">{formatarDia(item.data_jogo)}</p>
 <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{formatarMes(item.data_jogo)}</p>
 </div>
 )}
 </div>

 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <h4 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#142340]">{titulo}</h4>
 <span className={`border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${status.className}`}>{status.label}</span>
 </div>
 <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{subtitulo}</p>

 <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 <span className="inline-flex items-center gap-1"><Clock3 size={12} /> {formatarHora(item.hora_jogo)}</span>
 <span>•</span>
 <span>{formatarData(item.data_jogo)}</span>
 {item.fase_nome ? (<><span>•</span><span className="inline-flex items-center gap-1"><Layers3 size={12} /> {item.fase_nome}</span></>) : null}
 <span>•</span>
 <span className="inline-flex items-center gap-1"><Trophy size={12} /> {totalQuedas} queda(s)</span>
 </div>
 </div>
 </div>

 <div className="flex flex-col gap-2 md:items-end">
 <div className="inline-flex items-center justify-center gap-2 border border-[#2563eb]\/30 bg-[#2563eb]\/10 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#0f8f39]">
 <Users size={12} /> {item.jogadores_escalados_total || 0} jogador(es) escalado(s)
 </div>

 <div className="flex flex-wrap gap-2 md:justify-end">
 {mapas.length > 0 ? mapas.slice(0, 8).map((mapa, idx) => (
 <span key={`${item.jogo_id}-mapa-${idx}`} className="inline-flex items-center gap-1 border border-zinc-200 bg-zinc-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
 <MapPinned size={11} />{mapa}
 </span>
 )) : (
 <span className="inline-flex items-center gap-1 border border-zinc-200 bg-zinc-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 <ListChecks size={11} />Quedas agrupadas
 </span>
 )}
 </div>
 </div>
 </div>

 {(item.bloqueia_escalacao_ate || item.bloqueia_alteracao_equipe_ate) ? (
 <div className="mt-3 grid grid-cols-1 gap-2 border-t border-zinc-100 pt-3 md:grid-cols-2">
 <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">Escalação: <span className="text-[#142340]">{formatarDataHoraIso(item.bloqueia_escalacao_ate) || 'Sem bloqueio'}</span></p>
 <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">Alteração: <span className="text-[#142340]">{formatarDataHoraIso(item.bloqueia_alteracao_equipe_ate) || 'Sem bloqueio'}</span></p>
 </div>
 ) : null}
 </div>
 )
 }

 return (
 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <h2 className="mb-8 text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">// CRONOGRAMA DA EQUIPE</h2>

 <div className="border border-zinc-200 bg-zinc-50 p-6">
 <div className="flex items-center gap-3 text-[#142340]"><CalendarDays size={22} /><div className="text-[18px] font-semibold uppercase ">Agenda em lista</div></div>
 <p className="mt-4 text-[13px] font-semibold leading-6 text-zinc-500">Cada bloco de jogo aparece uma única vez. As quedas ficam agrupadas dentro do mesmo compromisso.</p>

 <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
 <div className="border border-zinc-200 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Compromissos</p><p className="mt-2 text-3xl font-semibold text-[#142340]">{agenda.length}</p></div>
 <div className="border border-zinc-200 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Próximos</p><p className="mt-2 text-3xl font-semibold text-[#142340]">{proximos.length}</p></div>
 <div className="border border-zinc-200 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Finalizados</p><p className="mt-2 text-3xl font-semibold text-[#142340]">{historico.length}</p></div>
 </div>

 {loading ? (
 <div className="mt-8 border border-zinc-200 bg-white py-10 text-center text-[11px] font-semibold uppercase text-zinc-500">Carregando cronograma...</div>
 ) : agenda.length === 0 ? (
 <div className="mt-8 border border-dashed border-zinc-200 bg-white py-10 text-center text-[11px] font-semibold uppercase text-zinc-500">Nenhum jogo encontrado para esta equipe.</div>
 ) : (
 <div className="mt-8 space-y-8">
 <div>
 <div className="mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-[#2563eb]" /><h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#142340]">Próximos compromissos</h3></div>
 <div className="space-y-2">{proximos.length > 0 ? proximos.map(renderListaItem) : <div className="border border-dashed border-zinc-200 bg-white py-6 text-center text-[11px] font-semibold uppercase text-zinc-500">Nenhum próximo compromisso.</div>}</div>
 </div>

 <div>
 <div className="mb-4 flex items-center gap-2"><ShieldAlert size={16} className="text-zinc-500" /><h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#142340]">Histórico</h3></div>
 <div className="space-y-2">{historico.length > 0 ? historico.map(renderListaItem) : <div className="border border-dashed border-zinc-200 bg-white py-6 text-center text-[11px] font-semibold uppercase text-zinc-500">Nenhum compromisso finalizado.</div>}</div>
 </div>
 </div>
 )}
 </div>
 </div>
 )
}
