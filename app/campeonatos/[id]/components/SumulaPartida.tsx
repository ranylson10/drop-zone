'use client'

import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import {
 Save,
 Upload,
 Loader2,
 Filter,
 ChevronRight,
 UserMinus,
 AlertCircle,
 RefreshCw,
 Trophy,
 Users,
 Pencil,
 Check,
 Lock,
 Unlock,
 FileSpreadsheet,
 UserCircle2,
 FolderInput,
 SaveAll,
} from 'lucide-react'

type Fase = { id: string; nome: string; ordem?: number }
type Jogo = {
 id: string
 fase_id: string
 nome_bloco: string
 data_jogo?: string
 hora_jogo?: string
 quedas?: Record<string, string> | any
 grupos_ids?: any
 grupo_id?: string | null
 quantidade_partidas?: number | null
 numero_queda?: number | null
 mapa?: string | null
 configuracao?: any
}

type SlotEquipe = {
 slot: number
 campeonato_equipe_id?: string | null
 equipe: null | { id: string; nome: string; avatar_url?: string | null; nome_exibicao?: string | null; numero_vaga?: number | null }
 grupo_id?: string | null
 fase_id?: string | null
}

type MVPRow = {
 team_raw: string
 nick: string
 game_id: string
 abates: number
}

type SnapshotQueda = {
 vinculos: Record<string, string>
 classificacao: Record<string, { abates: number; posicao: number }>
 saved_at: string
}

const tabelaPontos: Record<number, number> = {
 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0,
}

function parseConfig(value: any): Record<string, any> {
 if (!value) return {}
 if (typeof value === 'object') return value
 try {
 return JSON.parse(String(value))
 } catch {
 return {}
 }
}

// ----------- Parser fallback -----------
function parseMatchResultFallback(txt: string): {
 teams: { nome_equipe: string; posicao: number; abates_total: number }[]
 players: MVPRow[]
} {
 const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

 const teams: { nome_equipe: string; posicao: number; abates_total: number }[] = []
 const players: MVPRow[] = []

 let currentTeam = ''

 const teamRe = /TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)/i
 const playerRe = /NAME:\s*(.+?)\s+ID:\s*([0-9]+)\s+KILL:\s*(\d+)/i

 for (const line of lines) {
 const mt = line.match(teamRe)
 if (mt) {
 currentTeam = (mt[1] || '').trim()
 const pos = Number(mt[2] || 12)
 const killScore = Number(mt[3] || 0)
 teams.push({ nome_equipe: currentTeam, posicao: pos, abates_total: killScore })
 continue
 }
 const mp = line.match(playerRe)
 if (mp) {
 const nick = (mp[1] || '').trim()
 const gameId = String(mp[2] || '').trim()
 const ab = Number(mp[3] || 0)
 players.push({
 team_raw: currentTeam,
 nick,
 game_id: gameId,
 abates: ab,
 })
 }
 }

 return { teams, players }
}


function normalizeText(value: string) {
 return String(value || '')
 .normalize('NFD')
 .replace(/[̀-ͯ]/g, '')
 .replace(/[^a-zA-Z0-9]/g, '')
 .toLowerCase()
 .trim()
}

function getVagaKey(item: any) {
 return String(item?.campeonato_equipe_id || item?.equipe?.id || '').trim()
}

function guessEquipeIdByRaw(
 raw: string,
 equipesOptions: { id: string; nome: string; avatar_url?: string | null }[],
) {
 const rawNorm = normalizeText(raw)
 if (!rawNorm) return ''

 const exact = equipesOptions.find((eq) => normalizeText(eq.nome) == rawNorm)
 if (exact) return exact.id

 const contains = equipesOptions.find((eq) => {
 const nomeNorm = normalizeText(eq.nome)
 return nomeNorm.includes(rawNorm) || rawNorm.includes(nomeNorm)
 })
 if (contains) return contains.id

 return ''
}

// ----------------- UI helpers -----------------
const TabButton = ({ active, icon, label, onClick }: any) => (
 <button
 onClick={onClick}
 className={`px-4 py-2 text-[10px] font-semibold uppercase rounded-sm border border-zinc-200 flex items-center gap-2
 ${active ? 'bg-white text-[#2563eb]' : 'bg-transparent text-zinc-500 hover:bg-transparent'}`}
 >
 {icon} {label}
 </button>
)

const RowEquipe = React.memo(function RowEquipe({
 item,
 res,
 vinculo,
 equipesNoLog,
 vinculosAtuais,
 onVinculoChange,
 onResultChange,
 index,
 locked,
 rankDuplicado,
 showVinculo,
}: any) {
 if (!item.equipe) {
 return (
 <tr className="bg-zinc-50/30 text-zinc-600">
 <td className="p-2 text-center font-semibold text-xs border-r">{item.slot}</td>
 <td colSpan={showVinculo ? 4 : 3} className="p-2 text-[10px] font-bold uppercase opacity-50">
 <span className="flex items-center gap-1">
 <UserMinus size={12} /> Slot Vazio
 </span>
 </td>
 <td className="p-2 bg-zinc-100 text-center">-</td>
 </tr>
 )
 }

 const vinculoInvalido = vinculo && vinculo !== '' && vinculo !== '__FALTA__' && !equipesNoLog.includes(vinculo)

 const escolhidasPorOutrasEquipes = equipesNoLog.filter((nome: string) => {
 if (!nome || nome === vinculo) return false
 return Object.entries(vinculosAtuais || {}).some(([campeonatoEquipeId, valor]) => {
 if (String(campeonatoEquipeId) === String(item.campeonato_equipe_id || item.equipe.id)) return false
 return String(valor || '') === nome
 })
 })

 const disponiveis = equipesNoLog.filter((nome: string) => !escolhidasPorOutrasEquipes.includes(nome) && nome !== vinculo)
 const jaEscolhidas = escolhidasPorOutrasEquipes

 return (
 <tr className={`transition-colors border-b border-zinc-100 ${index % 2 === 0 ? 'bg-white/40' : 'bg-zinc-50/50'} hover:bg-zinc-100/80`}>
 <td className="p-2 text-center font-semibold text-xs border-r border-zinc-100">{item.slot}</td>

 <td className="p-2">
 <div className="flex items-center gap-2">
 <img
 src={item.equipe.avatar_url || '/placeholder.png'}
 className="w-5 h-5 border border-zinc-200 bg-white/40 object-cover"
 alt=""
 />
 <span className="font-semibold uppercase text-[10px] truncate max-w-[160px]">{item.equipe.nome}</span>
 </div>
 </td>

 {showVinculo ? (
 <td className="p-1 px-3 border-x border-zinc-100">
 <div className="relative">
 <select
 value={vinculo || ''}
 onChange={(e) => onVinculoChange(item.campeonato_equipe_id || item.equipe.id, e.target.value)}
 disabled={locked}
 className={`w-full py-1 px-2 text-[9px] font-bold uppercase rounded-sm outline-none cursor-pointer border transition-colors
 ${locked ? 'bg-zinc-200 text-zinc-500 border-zinc-300' : (vinculoInvalido ? 'bg-red-600 text-[#142340] border-red-700 animate-pulse' : 'bg-white text-[#2563eb] border-transparent')}
 `}
 >
 <option value="">MANUAL / SEM LOG</option>
 <option value="__FALTA__">FALTA</option>
 {!!vinculo && vinculo !== '__FALTA__' && !equipesNoLog.includes(vinculo) && (
 <option value={vinculo}>{`[SALVO] ${vinculo}`}</option>
 )}
 {disponiveis.length > 0 && (
 <optgroup label="DISPONÍVEIS">
 {disponiveis.map((n: string) => (
 <option key={n} value={n}>{`🟢 ${n}`}</option>
 ))}
 </optgroup>
 )}
 {!!vinculo && vinculo !== '__FALTA__' && equipesNoLog.includes(vinculo) && (
 <optgroup label="SELECIONADO NESTA EQUIPE">
 <option value={vinculo}>{`✅ ${vinculo}`}</option>
 </optgroup>
 )}
 {jaEscolhidas.length > 0 && (
 <optgroup label="JÁ ESCOLHIDAS EM OUTRAS EQUIPES">
 {jaEscolhidas.map((n: string) => (
 <option key={n} value={n}>{`🔴 ${n}`}</option>
 ))}
 </optgroup>
 )}
 </select>

 {vinculoInvalido && !locked && (
 <div className="absolute -right-1 -top-1 bg-red-500 rounded-full p-0.5 border border-white">
 <AlertCircle size={8} className="text-[#142340]" />
 </div>
 )}
 </div>
 </td>
 ) : null}

 <td className="p-1 border-r border-zinc-100 text-center">
 <input
 type="number"
 value={res.rank}
 onChange={(e) => onResultChange(getVagaKey(item), 'posicao', Number(e.target.value))}
 disabled={locked}
 className={`w-full text-center font-semibold text-xs outline-none ${locked ? 'bg-transparent text-zinc-500' : rankDuplicado ? 'bg-red-500 text-[#142340]' : 'bg-transparent focus:bg-white/[0.05]'}`}
 />
 </td>

 <td className="p-1 border-r border-zinc-100 text-center">
 <input
 type="number"
 value={res.abates}
 onChange={(e) => onResultChange(getVagaKey(item), 'abates', Number(e.target.value))}
 disabled={locked}
 className={`w-full text-center font-semibold text-xs outline-none ${locked ? 'bg-transparent text-zinc-500' : 'bg-transparent text-red-600 focus:bg-white/40'}`}
 />
 </td>

 <td className="p-2 text-center font-semibold text-sm bg-[#2563eb]/10 border-l-2 border-zinc-200/5">
 {res.total}
 </td>
 </tr>
 )
})

type SumulaPartidaProps = {
 faseInicialId?: string
 jogoInicialId?: string
 quedaInicialId?: string
 canEdit?: boolean
 campeonatoIdOverride?: string
 pontuadorLinkId?: string
 projectIdOverride?: string
 streamKeyOverride?: string
}

export default function SumulaPartida({ faseInicialId, jogoInicialId, quedaInicialId, canEdit = false, campeonatoIdOverride, pontuadorLinkId, projectIdOverride, streamKeyOverride }: SumulaPartidaProps = {}) {
 const params = useParams()
 const campeonatoId = campeonatoIdOverride || (params?.id as string)

 // Tabs
 const [tab, setTab] = useState<'classificacao' | 'mvp'>('classificacao')

 // Dados base
 const [fases, setFases] = useState<Fase[]>([])
 const [faseSelecionadaId, setFaseSelecionadaId] = useState<string>('')
 const [blocos, setBlocos] = useState<Jogo[]>([])
 const [blocoSelecionado, setBlocoSelecionado] = useState<Jogo | null>(null)
 const [grupoConfiguracoes, setGrupoConfiguracoes] = useState<Record<string, any>>({})

 // Quedas
 const [quedasProcessadas, setQuedasProcessadas] = useState<any[]>([])
 const [quedaAtiva, setQuedaAtiva] = useState<any>(null)

 // Equipes (slots do jogo)
 const [equipes, setEquipes] = useState<SlotEquipe[]>([])

 // UI status
 const [loading, setLoading] = useState(false)
 const [isChanging, setIsChanging] = useState(false)

 // Log
 const [dadosRawLog, setDadosRawLog] = useState<any[]>([]) // teams parsed
 const [equipesNoLog, setEquipesNoLog] = useState<string[]>([])

 // Vínculos persistentes (equipe_id -> team_raw)
 const [vinculos, setVinculos] = useState<Record<string, string>>({})

 // Classificação manual (fallback)
 const [resultadosManuais, setResultadosManuais] = useState<Record<string, { abates: number; posicao: number }>>({})

 // MVP data (parsed)
 const [mvpItems, setMvpItems] = useState<MVPRow[]>([])

 // MVP manual overrides (game_id -> {nick, abates})
 const [mvpEdits, setMvpEdits] = useState<Record<string, { nick: string; abates: number }>>({})

 // MVP: equipe escolhida (game_id -> equipe_id | '')
 const [mvpEquipe, setMvpEquipe] = useState<Record<string, string>>({})
 const [mvpMeta, setMvpMeta] = useState<Record<string, { avatar_url?: string | null; equipe_id?: string; nick?: string; jogador_campeonato_id?: string; uid_jogo?: string }>>({})

 // apelidos persistentes do campeonato (game_id_raw -> nick_display)
 const [apelidos, setApelidos] = useState<Record<string, string>>({})
 const [savingNick, setSavingNick] = useState<Record<string, boolean>>({})

 // TRAVA persistente por jogo+mapa
 const [locked, setLocked] = useState(false)

 // ✅ options de equipes do jogo (select)
 const equipesOptions = useMemo(() => {
 const list = equipes.filter(s => !!s.equipe).map(s => s.equipe!)
 const map = new Map<string, { id: string; nome: string; avatar_url?: string | null }>()
 list.forEach(e => map.set(e.id, e))
 return Array.from(map.values())
 }, [equipes])

 const campeonatoEquipeIdToPublicEquipeId = useMemo(() => {
 const map: Record<string, string> = {}
 equipes.forEach((slot) => {
 const campeonatoEquipeId = String(slot?.campeonato_equipe_id || '').trim()
 const publicEquipeId = String(slot?.equipe?.id || '').trim()
 if (campeonatoEquipeId && publicEquipeId) map[campeonatoEquipeId] = publicEquipeId
 })
 return map
 }, [equipes])

 const publicEquipeIdToCampeonatoEquipeId = useMemo(() => {
 const map: Record<string, string> = {}
 equipes.forEach((slot) => {
 const campeonatoEquipeId = String(slot?.campeonato_equipe_id || '').trim()
 const publicEquipeId = String(slot?.equipe?.id || '').trim()
 if (campeonatoEquipeId && publicEquipeId) map[publicEquipeId] = campeonatoEquipeId
 })
 return map
 }, [equipes])

 const campeonatoEquipeIdToNome = useMemo(() => {
 const map: Record<string, string> = {}
 equipes.forEach((slot) => {
 const campeonatoEquipeId = String(slot?.campeonato_equipe_id || '').trim()
 const nome = String(slot?.equipe?.nome || '').trim()
 if (campeonatoEquipeId && nome) map[campeonatoEquipeId] = nome
 })
 return map
 }, [equipes])

 const guessCampeonatoEquipeIdByRaw = useCallback((raw: string) => {
 const rawNorm = normalizeText(raw)
 if (!rawNorm) return ''

 for (const slot of equipes) {
 const campeonatoEquipeId = String(slot?.campeonato_equipe_id || '').trim()
 const nomeEquipe = String(slot?.equipe?.nome || '').trim()
 if (!campeonatoEquipeId || !nomeEquipe) continue

 const nomeNorm = normalizeText(nomeEquipe)
 if (nomeNorm === rawNorm || nomeNorm.includes(rawNorm) || rawNorm.includes(nomeNorm)) {
 return campeonatoEquipeId
 }
 }

 return ''
 }, [equipes])

 // ✅ invert (team_raw -> campeonato_equipe_id) baseado nos vínculos persistentes do jogo
 const teamRawToEquipeId = useMemo(() => {
 const m: Record<string, string> = {}
 Object.entries(vinculos).forEach(([campeonatoEquipeId, raw]) => {
 const key = normalizeText(String(raw || '').trim())
 if (key) m[key] = campeonatoEquipeId
 })
 return m
 }, [vinculos])

 useEffect(() => {
 if (mvpItems.length === 0) return

 setMvpEquipe((atual) => {
 const proximo = { ...atual }
 let mudou = false

 mvpItems.forEach((item) => {
 const gameId = String(item?.game_id || '').trim()
 const raw = String(item?.team_raw || '').trim()
 const rawNorm = normalizeText(raw)
 const equipePeloRaw = rawNorm ? String(teamRawToEquipeId[rawNorm] || '').trim() : ''

 if (gameId && equipePeloRaw && proximo[gameId] !== equipePeloRaw) {
 proximo[gameId] = equipePeloRaw
 mudou = true
 }
 })

 return mudou ? proximo : atual
 })
 }, [mvpItems, teamRawToEquipeId])


 
 const getGrupoIdDoJogo = useCallback((jogo: any) => {
 if (!jogo) return ''
 const direto = String(jogo?.grupo_id || '').trim()
 if (direto) return direto
 try {
 const cfg = typeof jogo?.configuracao === 'string' ? JSON.parse(jogo.configuracao) : (jogo?.configuracao || {})
 return String(cfg?.grupo_id || '').trim()
 } catch {
 return ''
 }
 }, [])

 const getJogoIdAtual = useCallback(() => {
 return String(quedaAtiva?.jogo_id || quedaAtiva?.id || blocoSelecionado?.id || '').trim()
 }, [quedaAtiva, blocoSelecionado])

// ---------------- Carregar fases ----------------
 useEffect(() => {
 if (!campeonatoId) return
 ;(async () => {
 const { data } = await supabase
 .from('campeonato_fases')
 .select('*')
 .eq('campeonato_id', campeonatoId)
 .order('ordem', { ascending: true })

 if (data?.length) {
 setFases(data as any)
 const fasePreferida = (data as any).find((f: any) => String(f.id) === String(faseInicialId || ''))
 setFaseSelecionadaId(fasePreferida?.id || (data as any)[0].id)
 }
 })()
 }, [campeonatoId])


 const getSnapshotQuedaKey = useCallback((jogoId: string, mapa: string) => {
 return `sumula_snapshot:${campeonatoId}:${jogoId}:${mapa}`
 }, [campeonatoId])

 const lerSnapshotQueda = useCallback((jogoId: string, mapa: string): SnapshotQueda | null => {
 if (typeof window === 'undefined' || !campeonatoId || !jogoId || !mapa) return null

 try {
 const raw = window.localStorage.getItem(getSnapshotQuedaKey(jogoId, mapa))
 if (!raw) return null

 const parsed = JSON.parse(raw)
 return {
 vinculos: parsed?.vinculos && typeof parsed.vinculos === 'object' ? parsed.vinculos : {},
 classificacao: parsed?.classificacao && typeof parsed.classificacao === 'object' ? parsed.classificacao : {},
 saved_at: String(parsed?.saved_at || ''),
 }
 } catch (error) {
 console.error('Erro ao ler snapshot da queda:', error)
 return null
 }
 }, [campeonatoId, getSnapshotQuedaKey])

 const salvarSnapshotQueda = useCallback((jogoId: string, mapa: string) => {
 if (typeof window === 'undefined' || !campeonatoId || !jogoId || !mapa) return

 try {
 const classificacao: Record<string, { abates: number; posicao: number }> = {}

 equipes.forEach((item) => {
 const campeonatoEquipeId = String(item?.campeonato_equipe_id || '').trim()
 const equipePublicaId = String(item?.equipe?.id || '').trim()
 if (!campeonatoEquipeId || !equipePublicaId) return

 const vinculoNome = item.campeonato_equipe_id ? vinculos[item.campeonato_equipe_id] : vinculos[equipePublicaId]
 const log = dadosRawLog.find((d: any) => d.nome_equipe === vinculoNome)

 const abates = log ? Number(log.abates_total || 0) : Number(resultadosManuais[equipePublicaId]?.abates || 0)
 const posicao = log ? Number(log.posicao || 12) : Number(resultadosManuais[equipePublicaId]?.posicao || 12)

 classificacao[campeonatoEquipeId] = {
 abates,
 posicao,
 }
 })

 const vinculosSnapshot: Record<string, string> = {}
 Object.entries(vinculos || {}).forEach(([key, value]) => {
 const campeonatoEquipeId = String(key || '').trim()
 if (!campeonatoEquipeId) return
 vinculosSnapshot[campeonatoEquipeId] = String(value || '')
 })

 const payload: SnapshotQueda = {
 vinculos: vinculosSnapshot,
 classificacao,
 saved_at: new Date().toISOString(),
 }

 window.localStorage.setItem(getSnapshotQuedaKey(jogoId, mapa), JSON.stringify(payload))
 } catch (error) {
 console.error('Erro ao salvar snapshot da queda:', error)
 }
 }, [campeonatoId, equipes, vinculos, dadosRawLog, resultadosManuais, getSnapshotQuedaKey])

 // ---------------- Helpers DB ----------------
 const carregarApelidosCampeonato = useCallback(async () => {
 if (!campeonatoId) return
 try {
 const { data } = await supabase
 .from('apelidos_match')
 .select('game_id_raw, nick_display')
 .eq('campeonato_id', campeonatoId)

 const map: Record<string, string> = {}
 ;(data || []).forEach((r: any) => {
 if (r?.game_id_raw) map[String(r.game_id_raw)] = String(r.nick_display || '')
 })
 setApelidos(map)
 } catch {
 // tabela pode não existir ainda -> não quebra
 setApelidos({})
 }
 }, [campeonatoId])

 const carregarVinculosDoJogo = useCallback(async (jogoId: string) => {
 const { data, error } = await supabase
 .from('jogo_vinculos_equipes')
 .select('campeonato_equipe_id, nome_raw')
 .eq('jogo_id', jogoId)

 if (error) {
 console.error('Erro ao carregar vínculos do jogo:', error)
 setVinculos({})
 return
 }

 const map: Record<string, string> = {}
 ;(data || []).forEach((r: any) => {
 if (r?.campeonato_equipe_id) map[String(r.campeonato_equipe_id)] = String(r.nome_raw || '')
 })
 setVinculos(map)
 }, [])

 const carregarSlotsDoJogo = useCallback(async (jogoId: string, faseId?: string | null) => {
 const { data: jogoEquipes, error: jogoEquipesError } = await supabase
 .from('jogo_equipes')
 .select('campeonato_equipe_id, grupo_id, origem_slot_id')
 .eq('jogo_id', jogoId)

 if (jogoEquipesError) {
 console.error('Erro ao carregar jogo_equipes:', jogoEquipesError)
 const vazios = Array.from({ length: 12 }, (_, i) => ({
 slot: i + 1,
 campeonato_equipe_id: null,
 equipe: null,
 grupo_id: null,
 fase_id: faseId || null,
 } as SlotEquipe))
 setEquipes(vazios)
 return vazios
 }

 const jogoEquipesUnicosMap = new Map<string, any>()
 ;(jogoEquipes || []).forEach((row: any) => {
 const campeonatoEquipeId = String(row?.campeonato_equipe_id || '').trim()
 const origemSlotId = String(row?.origem_slot_id || '').trim()
 const key = origemSlotId || campeonatoEquipeId
 if (!key) return
 if (!jogoEquipesUnicosMap.has(key)) jogoEquipesUnicosMap.set(key, row)
 })
 const jogoEquipesUnicos = Array.from(jogoEquipesUnicosMap.values())

 const origemSlotIds = Array.from(
 new Set((jogoEquipesUnicos || []).map((r: any) => String(r?.origem_slot_id || '').trim()).filter(Boolean))
 )

 const campeonatoEquipeIds = Array.from(
 new Set((jogoEquipesUnicos || []).map((r: any) => String(r?.campeonato_equipe_id || '').trim()).filter(Boolean))
 )

 const { data: origemSlots, error: origemSlotsError } = origemSlotIds.length > 0
 ? await supabase
 .from('campeonato_grupo_slots')
 .select('id, slot_numero')
 .in('id', origemSlotIds)
 : { data: [], error: null as any }

 if (origemSlotsError) {
 console.error('Erro ao carregar campeonato_grupo_slots:', origemSlotsError)
 }

 const { data: campeonatoEquipes, error: campeonatoEquipesError } = campeonatoEquipeIds.length > 0
 ? await supabase
 .from('campeonato_equipes')
 .select('id, equipe_id, equipe_avulsa_id, nome_exibicao, numero_vaga')
 .in('id', campeonatoEquipeIds)
 : { data: [], error: null as any }

 if (campeonatoEquipesError) {
 console.error('Erro ao carregar campeonato_equipes:', campeonatoEquipesError)
 }

 const equipeIds = Array.from(
 new Set((campeonatoEquipes || []).map((r: any) => String(r?.equipe_id || '').trim()).filter(Boolean))
 )
 const equipeAvulsaIds = Array.from(
 new Set((campeonatoEquipes || []).map((r: any) => String(r?.equipe_avulsa_id || '').trim()).filter(Boolean))
 )

 const { data: equipesOficiais, error: equipesOficiaisError } = equipeIds.length > 0
 ? await supabase
 .from('equipes')
 .select('id, nome, logo_url')
 .in('id', equipeIds)
 : { data: [], error: null as any }

 if (equipesOficiaisError) {
 console.error('Erro ao carregar equipes:', equipesOficiaisError)
 }

 const { data: equipesAvulsas, error: equipesAvulsasError } = equipeAvulsaIds.length > 0
 ? await supabase
 .from('equipes_avulsas_campeonato')
 .select('id, nome, logo_url')
 .in('id', equipeAvulsaIds)
 : { data: [], error: null as any }

 if (equipesAvulsasError) {
 console.error('Erro ao carregar equipes_avulsas_campeonato:', equipesAvulsasError)
 }

 const slotNumeroPorOrigemId: Record<string, number> = {}
 ;(origemSlots || []).forEach((row: any) => {
 const id = String(row?.id || '').trim()
 if (!id) return
 slotNumeroPorOrigemId[id] = Number(row?.slot_numero || 0)
 })

 const campeonatoEquipeMap: Record<string, any> = {}
 ;(campeonatoEquipes || []).forEach((row: any) => {
 const id = String(row?.id || '').trim()
 if (!id) return
 campeonatoEquipeMap[id] = row
 })

 const equipeOficialMap: Record<string, any> = {}
 ;(equipesOficiais || []).forEach((row: any) => {
 const id = String(row?.id || '').trim()
 if (!id) return
 equipeOficialMap[id] = row
 })

 const equipeAvulsaMap: Record<string, any> = {}
 ;(equipesAvulsas || []).forEach((row: any) => {
 const id = String(row?.id || '').trim()
 if (!id) return
 equipeAvulsaMap[id] = row
 })

 const slotsPreenchidos: SlotEquipe[] = (jogoEquipesUnicos || []).map((row: any) => {
 const campeonatoEquipe = campeonatoEquipeMap[String(row?.campeonato_equipe_id || '').trim()]
 const equipeOficial = campeonatoEquipe?.equipe_id
 ? equipeOficialMap[String(campeonatoEquipe.equipe_id)]
 : null
 const equipeAvulsa = campeonatoEquipe?.equipe_avulsa_id
 ? equipeAvulsaMap[String(campeonatoEquipe.equipe_avulsa_id)]
 : null

 const equipe = equipeOficial
 ? {
 id: String(equipeOficial.id),
 nome: String(campeonatoEquipe?.nome_exibicao || equipeOficial.nome || 'Equipe sem nome'),
 avatar_url: equipeOficial.logo_url || null,
 nome_exibicao: campeonatoEquipe?.nome_exibicao || null,
 numero_vaga: campeonatoEquipe?.numero_vaga || null,
 }
 : equipeAvulsa
 ? {
 id: String(equipeAvulsa.id),
 nome: String(campeonatoEquipe?.nome_exibicao || equipeAvulsa.nome || 'Equipe avulsa sem nome'),
 avatar_url: equipeAvulsa.logo_url || null,
 nome_exibicao: campeonatoEquipe?.nome_exibicao || null,
 numero_vaga: campeonatoEquipe?.numero_vaga || null,
 }
 : null

 return {
 slot: Number(slotNumeroPorOrigemId[String(row?.origem_slot_id || '').trim()] || 0),
 campeonato_equipe_id: String(row?.campeonato_equipe_id || '') || null,
 equipe,
 grupo_id: row?.grupo_id || null,
 fase_id: faseId || null,
 } as SlotEquipe
 })

 const maiorSlot = Math.max(
 12,
 ...slotsPreenchidos.map((item) => Number(item.slot || 0)).filter(Boolean)
 )

 const slots = Array.from({ length: maiorSlot }, (_, i) => {
 const num = i + 1
 const row = slotsPreenchidos.find((r) => Number(r.slot) === num)
 return row || {
 slot: num,
 campeonato_equipe_id: null,
 equipe: null,
 grupo_id: null,
 fase_id: faseId || null,
 }
 })

 setEquipes(slots)
 return slots
 }, [])

 // resolve equipe default por uid_jogo usando perfis_jogo + jogadores_campeonato
 const resolverEquipesPorGameIds = useCallback(async (gameIds: string[]) => {
 if (!campeonatoId || gameIds.length === 0) return {} as Record<string, string>

 const ids = Array.from(new Set(gameIds.map((v) => String(v || '').trim()).filter(Boolean)))
 if (ids.length === 0) return {} as Record<string, string>

 const { data: perfis } = await supabase
 .from('perfis_jogo')
 .select('id, uid_jogo, updated_at')
 .in('uid_jogo', ids)

 const perfilMaisRecentePorGameId: Record<string, string> = {}
 ;(perfis || [])
 .sort((a: any, b: any) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
 .forEach((p: any) => {
 const gid = String(p?.uid_jogo || '')
 if (gid && !perfilMaisRecentePorGameId[gid]) perfilMaisRecentePorGameId[gid] = String(p.id)
 })

 const perfilIds = Array.from(new Set(Object.values(perfilMaisRecentePorGameId)))
 if (perfilIds.length === 0) return {} as Record<string, string>

 const { data: jogadores } = await supabase
 .from('jogadores_campeonato')
 .select('perfil_jogo_id, equipe_id, equipe_avulsa_id')
 .eq('campeonato_id', campeonatoId)
 .eq('status', 'ativo')
 .in('perfil_jogo_id', perfilIds)

 const equipePorPerfilId: Record<string, string> = {}
 ;(jogadores || []).forEach((r: any) => {
 const perfilId = String(r?.perfil_jogo_id || '').trim()
 const equipeId = String(r?.equipe_id || r?.equipe_avulsa_id || '').trim()
 if (perfilId && equipeId && !equipePorPerfilId[perfilId]) {
 equipePorPerfilId[perfilId] = equipeId
 }
 })

 const result: Record<string, string> = {}
 Object.entries(perfilMaisRecentePorGameId).forEach(([gid, pid]) => {
 const eq = equipePorPerfilId[pid]
 if (eq) result[gid] = eq
 })

 return result
 }, [campeonatoId])

 const carregarJogadoresDoJogoMvp = useCallback(async (slotsRef?: SlotEquipe[]) => {
 const slotsBase = slotsRef || equipes
 const campeonatoEquipeIds = Array.from(
 new Set(
 (slotsBase || [])
 .map((slot) => String(slot?.campeonato_equipe_id || '').trim())
 .filter(Boolean)
 )
 )

 const vazio = {
 base: [] as MVPRow[],
 edits: {} as Record<string, { nick: string; abates: number }>,
 eqMap: {} as Record<string, string>,
 meta: {} as Record<string, { avatar_url?: string | null; equipe_id?: string; nick?: string; jogador_campeonato_id?: string; uid_jogo?: string }>,
 }

 if (!campeonatoId || campeonatoEquipeIds.length === 0) {
 return vazio
 }

 const { data: campeonatoEquipesRows, error: campeonatoEquipesError } = await supabase
 .from('campeonato_equipes')
 .select('id, equipe_id, equipe_avulsa_id, nome_exibicao, numero_vaga')
 .in('id', campeonatoEquipeIds)

 if (campeonatoEquipesError) {
 console.error('Erro ao carregar campeonato_equipes para MVP:', campeonatoEquipesError)
 return vazio
 }

 const campeonatoEquipes = campeonatoEquipesRows || []
 const equipeIdsDoJogo = Array.from(
 new Set(
 campeonatoEquipes
 .map((row: any) => String(row?.equipe_id || '').trim())
 .filter(Boolean)
 )
 )

 const equipeAvulsaIdsDoJogo = Array.from(
 new Set(
 campeonatoEquipes
 .map((row: any) => String(row?.equipe_avulsa_id || '').trim())
 .filter(Boolean)
 )
 )

 const campeonatoEquipePorEquipePublica: Record<string, string> = {}
 const campeonatoEquipePorEquipeAvulsa: Record<string, string> = {}

 campeonatoEquipes.forEach((row: any) => {
 const campeonatoEquipeId = String(row?.id || '').trim()
 const equipeId = String(row?.equipe_id || '').trim()
 const equipeAvulsaId = String(row?.equipe_avulsa_id || '').trim()
 if (campeonatoEquipeId && equipeId) campeonatoEquipePorEquipePublica[equipeId] = campeonatoEquipeId
 if (campeonatoEquipeId && equipeAvulsaId) campeonatoEquipePorEquipeAvulsa[equipeAvulsaId] = campeonatoEquipeId
 })

 const [
 { data: jogadoresRows, error: jogadoresError },
 perfisOficiaisResp,
 avulsosResp,
 ] = await Promise.all([
 supabase
 .from('jogadores_campeonato')
 .select('id, equipe_id, equipe_avulsa_id, perfil_jogo_id, jogador_avulso_id, status')
 .eq('campeonato_id', campeonatoId)
 .eq('status', 'ativo'),
 equipeIdsDoJogo.length > 0
 ? supabase
 .from('perfis_jogo')
 .select('id, nick, uid_jogo, foto_capa, equipe_id, ativo')
 .in('equipe_id', equipeIdsDoJogo)
 : Promise.resolve({ data: [], error: null }),
 (equipeIdsDoJogo.length > 0 || equipeAvulsaIdsDoJogo.length > 0)
 ? supabase
 .from('jogadores_avulsos_campeonato')
 .select('id, nick, uid_jogo, foto_url, equipe_id, equipe_avulsa_id')
 .eq('campeonato_id', campeonatoId)
 : Promise.resolve({ data: [], error: null }),
 ])

 if (jogadoresError) {
 console.error('Erro ao carregar jogadores_campeonato do jogo para MVP:', jogadoresError)
 return vazio
 }

 const perfisOficiaisRows = (perfisOficiaisResp.data || []).filter((row: any) => row?.ativo !== false)
 const jogadoresAvulsosRowsBase = avulsosResp.data || []

 const jogadoresDoJogo = (jogadoresRows || []).filter((row: any) => {
 const equipeId = String(row?.equipe_id || '').trim()
 const equipeAvulsaId = String(row?.equipe_avulsa_id || '').trim()
 return (
 (!!equipeId && equipeIdsDoJogo.includes(equipeId)) ||
 (!!equipeAvulsaId && equipeAvulsaIdsDoJogo.includes(equipeAvulsaId))
 )
 })

 const perfilIds = Array.from(
 new Set(
 jogadoresDoJogo
 .map((row: any) => String(row?.perfil_jogo_id || '').trim())
 .filter(Boolean)
 )
 )

 const jogadorAvulsoIds = Array.from(
 new Set(
 jogadoresDoJogo
 .map((row: any) => String(row?.jogador_avulso_id || '').trim())
 .filter(Boolean)
 )
 )

 const [
 { data: perfisRows },
 { data: jogadoresAvulsosRowsDetalhe },
 ] = await Promise.all([
 perfilIds.length > 0
 ? supabase
 .from('perfis_jogo')
 .select('id, nick, uid_jogo, foto_capa, equipe_id')
 .in('id', perfilIds)
 : Promise.resolve({ data: [], error: null }),
 jogadorAvulsoIds.length > 0
 ? supabase
 .from('jogadores_avulsos_campeonato')
 .select('id, nick, uid_jogo, foto_url, equipe_id, equipe_avulsa_id')
 .in('id', jogadorAvulsoIds)
 : Promise.resolve({ data: [], error: null }),
 ])

 const perfisMap = new Map<string, any>(((perfisRows || []) as any[]).map((row) => [String(row.id), row]))
 const jogadoresAvulsosMap = new Map<string, any>(((jogadoresAvulsosRowsDetalhe || []) as any[]).map((row) => [String(row.id), row]))

 const base: MVPRow[] = []
 const edits: Record<string, { nick: string; abates: number }> = {}
 const eqMap: Record<string, string> = {}
 const meta: Record<string, { avatar_url?: string | null; equipe_id?: string; nick?: string; jogador_campeonato_id?: string; uid_jogo?: string }> = {}

 const upsertJogadorBase = (payload: {
 gameId: string
 nick: string
 campeonatoEquipeId: string
 avatar_url?: string | null
 equipe_id?: string
 jogador_campeonato_id?: string
 uid_jogo?: string
 }) => {
 const gameId = String(payload.gameId || '').trim()
 const campeonatoEquipeId = String(payload.campeonatoEquipeId || '').trim()
 if (!gameId || !campeonatoEquipeId) return

 const nickBase = String(payload.nick || 'SEM NICK').trim() || 'SEM NICK'
 const teamRaw = campeonatoEquipeIdToNome[campeonatoEquipeId] || ''

 if (!edits[gameId]) {
 base.push({
 team_raw: teamRaw,
 nick: nickBase,
 game_id: gameId,
 abates: 0,
 })
 }

 edits[gameId] = edits[gameId] || { nick: nickBase, abates: 0 }
 eqMap[gameId] = campeonatoEquipeId
 meta[gameId] = {
 avatar_url: payload.avatar_url || null,
 equipe_id: String(payload.equipe_id || '').trim(),
 nick: nickBase,
 jogador_campeonato_id: String(payload.jogador_campeonato_id || '').trim(),
 uid_jogo: String(payload.uid_jogo || '').trim(),
 }
 }

 // 1) jogadores já vinculados ao campeonato
 jogadoresDoJogo.forEach((row: any) => {
 const jogadorCampeonatoId = String(row?.id || '').trim()
 const perfil = row?.perfil_jogo_id ? perfisMap.get(String(row.perfil_jogo_id)) : null
 const jogadorAvulso = row?.jogador_avulso_id ? jogadoresAvulsosMap.get(String(row.jogador_avulso_id)) : null

 const uid = String(perfil?.uid_jogo || jogadorAvulso?.uid_jogo || '').trim()
 const gameId = uid || `cadastro:${jogadorCampeonatoId}`
 const nickBase = String(perfil?.nick || jogadorAvulso?.nick || 'SEM NICK').trim() || 'SEM NICK'
 const equipePublicaId = String(row?.equipe_id || perfil?.equipe_id || jogadorAvulso?.equipe_id || '').trim()
 const equipeAvulsaId = String(row?.equipe_avulsa_id || jogadorAvulso?.equipe_avulsa_id || '').trim()

 const campeonatoEquipeId =
 (equipePublicaId ? campeonatoEquipePorEquipePublica[equipePublicaId] : '') ||
 (equipeAvulsaId ? campeonatoEquipePorEquipeAvulsa[equipeAvulsaId] : '')

 upsertJogadorBase({
 gameId,
 nick: nickBase,
 campeonatoEquipeId,
 avatar_url: perfil?.foto_capa || jogadorAvulso?.foto_url || null,
 equipe_id: equipePublicaId || equipeAvulsaId || '',
 jogador_campeonato_id: jogadorCampeonatoId || '',
 uid_jogo: uid || '',
 })
 })

 // 2) perfis oficiais das equipes do jogo, mesmo sem vínculo no campeonato
 ;(perfisOficiaisRows || []).forEach((row: any) => {
 const equipePublicaId = String(row?.equipe_id || '').trim()
 const campeonatoEquipeId = equipePublicaId ? campeonatoEquipePorEquipePublica[equipePublicaId] : ''
 const uid = String(row?.uid_jogo || '').trim()
 const gameId = uid || `perfil:${String(row?.id || '').trim()}`
 upsertJogadorBase({
 gameId,
 nick: String(row?.nick || 'SEM NICK').trim() || 'SEM NICK',
 campeonatoEquipeId,
 avatar_url: row?.foto_capa || null,
 equipe_id: equipePublicaId,
 uid_jogo: uid,
 })
 })

 // 3) jogadores avulsos do campeonato das equipes do jogo
 ;(jogadoresAvulsosRowsBase || []).forEach((row: any) => {
 const equipePublicaId = String(row?.equipe_id || '').trim()
 const equipeAvulsaId = String(row?.equipe_avulsa_id || '').trim()

 const pertenceAoJogo =
 (!!equipePublicaId && equipeIdsDoJogo.includes(equipePublicaId)) ||
 (!!equipeAvulsaId && equipeAvulsaIdsDoJogo.includes(equipeAvulsaId))

 if (!pertenceAoJogo) return

 const campeonatoEquipeId =
 (equipePublicaId ? campeonatoEquipePorEquipePublica[equipePublicaId] : '') ||
 (equipeAvulsaId ? campeonatoEquipePorEquipeAvulsa[equipeAvulsaId] : '')

 const uid = String(row?.uid_jogo || '').trim()
 const gameId = uid || `avulso:${String(row?.id || '').trim()}`
 upsertJogadorBase({
 gameId,
 nick: String(row?.nick || 'SEM NICK').trim() || 'SEM NICK',
 campeonatoEquipeId,
 avatar_url: row?.foto_url || null,
 equipe_id: equipePublicaId || equipeAvulsaId || '',
 uid_jogo: uid,
 })
 })

 return { base, edits, eqMap, meta }
 }, [campeonatoId, equipes, campeonatoEquipeIdToNome])


 const carregarMetaJogadoresMvp = useCallback(async (gameIds: string[]) => {
 if (!campeonatoId || gameIds.length === 0) {
 setMvpMeta({})
 return {} as Record<string, { avatar_url?: string | null; equipe_id?: string; nick?: string; jogador_campeonato_id?: string; uid_jogo?: string }>
 }

 const ids = Array.from(new Set(gameIds.map((v) => String(v || '').trim()).filter(Boolean)))
 if (ids.length === 0) {
 setMvpMeta({})
 return {} as Record<string, { avatar_url?: string | null; equipe_id?: string; nick?: string; jogador_campeonato_id?: string; uid_jogo?: string }>
 }

 const [
 { data: perfisRows },
 { data: jogadoresAvulsosRows },
 ] = await Promise.all([
 supabase
 .from('perfis_jogo')
 .select('id, uid_jogo, nick, foto_capa, equipe_id, updated_at')
 .in('uid_jogo', ids),
 supabase
 .from('jogadores_avulsos_campeonato')
 .select('id, uid_jogo, nick, foto_url, equipe_id, equipe_avulsa_id, updated_at')
 .in('uid_jogo', ids),
 ])

 const meta: Record<string, { avatar_url?: string | null; equipe_id?: string; nick?: string; jogador_campeonato_id?: string; uid_jogo?: string }> = {}

 ;[...(perfisRows || [])]
 .sort((a: any, b: any) => new Date(b?.updated_at || 0).getTime() - new Date(a?.updated_at || 0).getTime())
 .forEach((row: any) => {
 const gid = String(row?.uid_jogo || '').trim()
 if (!gid || meta[gid]) return
 meta[gid] = {
 avatar_url: row?.foto_capa || null,
 equipe_id: String(row?.equipe_id || ''),
 nick: String(row?.nick || ''),
 }
 })

 ;[...(jogadoresAvulsosRows || [])]
 .sort((a: any, b: any) => new Date(b?.updated_at || 0).getTime() - new Date(a?.updated_at || 0).getTime())
 .forEach((row: any) => {
 const gid = String(row?.uid_jogo || '').trim()
 if (!gid || meta[gid]) return
 meta[gid] = {
 avatar_url: row?.foto_url || null,
 equipe_id: String(row?.equipe_id || row?.equipe_avulsa_id || ''),
 nick: String(row?.nick || ''),
 }
 })

 setMvpMeta(meta)
 return meta
 }, [campeonatoId])

 const salvarVinculoEquipe = useCallback(async (jogoId: string, campeonatoEquipeId: string, nomeRaw: string) => {
 const jogoIdSeguro = String(jogoId || '').trim()
 const campeonatoEquipeIdSeguro = String(campeonatoEquipeId || '').trim()
 const nomeRawSeguro = String(nomeRaw || '').trim()

 if (!jogoIdSeguro || !campeonatoEquipeIdSeguro) return

 if (!nomeRawSeguro) {
 const { error } = await supabase
 .from('jogo_vinculos_equipes')
 .delete()
 .eq('jogo_id', jogoIdSeguro)
 .eq('campeonato_equipe_id', campeonatoEquipeIdSeguro)

 if (error) {
 console.error('Erro ao remover vínculo:', {
 message: error.message,
 details: error.details,
 hint: error.hint,
 code: error.code,
 })
 throw error
 }

 return
 }

 const { error } = await supabase
 .from('jogo_vinculos_equipes')
 .upsert(
 [
 {
 jogo_id: jogoIdSeguro,
 campeonato_equipe_id: campeonatoEquipeIdSeguro,
 nome_raw: nomeRawSeguro,
 updated_at: new Date().toISOString(),
 },
 ],
 { onConflict: 'jogo_id,campeonato_equipe_id' }
 )

 if (error) {
 console.error('Erro ao salvar vínculo da equipe:', {
 message: error.message,
 details: error.details,
 hint: error.hint,
 code: error.code,
 })
 throw error
 }
 }, [])

 const persistirVinculosEmLote = useCallback(async (items: { campeonato_equipe_id: string; nome_raw: string }[], jogoId: string) => {
 const unicos = new Map<string, { campeonato_equipe_id: string; nome_raw: string }>()

 items.forEach((item) => {
 const campeonatoEquipeId = String(item?.campeonato_equipe_id || '').trim()
 const nomeRaw = String(item?.nome_raw || '').trim()
 if (!campeonatoEquipeId || !nomeRaw) return
 unicos.set(campeonatoEquipeId, { campeonato_equipe_id: campeonatoEquipeId, nome_raw: nomeRaw })
 })

 for (const item of Array.from(unicos.values())) {
 try {
 await salvarVinculoEquipe(jogoId, item.campeonato_equipe_id, item.nome_raw)
 } catch (error) {
 console.error('Erro ao persistir vínculo em lote:', error)
 }
 }
 }, [salvarVinculoEquipe])

 // ✅ lock persistente
 const carregarLock = useCallback(async (jogoId: string, mapa: string) => {
 if (!campeonatoId || !jogoId || !mapa) return
 const { data } = await supabase
 .from('sumula_locks')
 .select('id')
 .eq('campeonato_id', campeonatoId)
 .eq('jogo_id', jogoId)
 .eq('mapa', mapa)
 .maybeSingle()

 setLocked(!!data?.id)
 }, [campeonatoId])

 // ---------------- Carregar jogos da fase ----------------
 useEffect(() => {
 if (!faseSelecionadaId) return
 ;(async () => {
 setIsChanging(true)
 const [{ data }, { data: gruposData }] = await Promise.all([
 supabase
 .from('jogos')
 .select('*')
 .eq('fase_id', faseSelecionadaId)
 .order('created_at', { ascending: true }),
 supabase
 .from('campeonato_grupos')
 .select('id, qtd_quedas, mapas, configuracao')
 .eq('campeonato_id', campeonatoId),
 ])

 const configs: Record<string, any> = {}
 ;(gruposData || []).forEach((grupo: any) => {
 configs[String(grupo.id)] = {
 ...parseConfig(grupo.configuracao),
 qtd_quedas: grupo.qtd_quedas,
 mapas: grupo.mapas,
 }
 })
 setGrupoConfiguracoes(configs)

 if (data?.length) {
 setBlocos(data as any)
 const jogoPreferido = (data as any).find((j: any) => String(j.id) === String(jogoInicialId || '')) || (data as any)[0]
 await handleSelecionarBloco(jogoPreferido as any)
 } else {
 setBlocos([])
 setBlocoSelecionado(null)
 setEquipes([])
 setQuedasProcessadas([])
 setQuedaAtiva(null)
 setLocked(false)
 }
 setIsChanging(false)
 })()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [faseSelecionadaId, campeonatoId])

 // ---------------- Selecionar jogo ----------------
 const handleSelecionarBloco = useCallback(async (bloco: Jogo) => {
 setIsChanging(true)
 setBlocoSelecionado(bloco)

 setDadosRawLog([])
 setEquipesNoLog([])
 setMvpItems([])
 setMvpEdits({})
 setMvpEquipe({})
 setMvpMeta({})
 setLocked(false)

 const grupoRef = getGrupoIdDoJogo(bloco)

 const jogosDoMesmoGrupo = (blocos || [])
 .filter((item: any) => getGrupoIdDoJogo(item) === grupoRef)
 .sort((a: any, b: any) => Number(a?.numero_queda || 0) - Number(b?.numero_queda || 0))

 const formatadas =
 jogosDoMesmoGrupo.length > 0
 ? jogosDoMesmoGrupo.map((j: any, idx: number) => ({
 id: String(j.id),
 jogo_id: String(j.id),
 numero_partida: Number(j?.numero_queda || idx + 1),
 mapa: String(j?.mapa || 'Bermuda'),
 nome_bloco: String(j?.nome_bloco || ''),
 }))
 : (() => {
 let quedasObj: Record<string, string> = {}
 try {
 quedasObj =
 typeof bloco.quedas === 'string'
 ? JSON.parse(bloco.quedas)
 : (bloco.quedas || {})
 } catch {
 quedasObj = {}
 }

 return Object.entries(quedasObj).map(([numero, mapa]) => ({
 id: `${bloco.id}-${numero}`,
 jogo_id: String(bloco.id),
 numero_partida: parseInt(numero),
 mapa: String(mapa),
 nome_bloco: String(bloco?.nome_bloco || ''),
 }))
 })()

 setQuedasProcessadas(formatadas)

 const jogoBaseParaSlots = jogosDoMesmoGrupo[0] || bloco

 await carregarApelidosCampeonato()
 await carregarVinculosDoJogo(String(jogoBaseParaSlots.id))

 const slots = await carregarSlotsDoJogo(String(jogoBaseParaSlots.id), jogoBaseParaSlots.fase_id)

 if (formatadas.length > 0) {
 const quedaPreferida =
 formatadas.find((q: any) => String(q.id) === String(quedaInicialId || '')) ||
 formatadas[0]
 await handleSelecionarQueda(quedaPreferida, jogoBaseParaSlots, slots)
 } else {
 setQuedaAtiva(null)
 setEquipes(slots)
 }

 setIsChanging(false)
 }, [blocos, carregarApelidosCampeonato, carregarVinculosDoJogo, carregarSlotsDoJogo, getGrupoIdDoJogo])
 // eslint-disable-next-line react-hooks/exhaustive-deps

 // ---------------- Selecionar queda ----------------
 const handleSelecionarQueda = useCallback(async (queda: any, blocoRef?: Jogo | null, equipesRef?: SlotEquipe[]) => {
 const jogo = blocoRef || blocoSelecionado
 if (!jogo) return

 const jogoIdAtual = String(queda?.jogo_id || jogo.id || '').trim()
 const slots =
 equipesRef ||
 (await carregarSlotsDoJogo(jogoIdAtual, jogo.fase_id))

 setIsChanging(true)
 setQuedaAtiva(queda)
 setResultadosManuais({})
 setMvpEquipe({})
 setDadosRawLog([])
 setEquipesNoLog([])
 setMvpItems([])
 setMvpEdits({})

 await carregarVinculosDoJogo(jogoIdAtual)
 const snapshot = lerSnapshotQueda(jogoIdAtual, queda.mapa)

 // classificação salvos
 const { data: salvos } = await supabase
 .from('resultados_jogos')
 .select('*')
 .eq('jogo_id', jogoIdAtual)
 .eq('mapa', queda.mapa)

 const initial: any = {}
 slots.forEach((item) => {
 if (!item.equipe) return

 const campeonatoEquipeId = String(item.campeonato_equipe_id || '')
 const snapshotEquipe = snapshot?.classificacao?.[campeonatoEquipeId]
 const s = (salvos || []).find((r: any) => String(r.equipe_id || '') === campeonatoEquipeId)

 initial[campeonatoEquipeId || item.equipe.id] = {
 abates: snapshotEquipe ? Number(snapshotEquipe.abates || 0) : (s ? Number(s.abates || 0) : 0),
 posicao: snapshotEquipe ? Number(snapshotEquipe.posicao || 12) : (s ? Number(s.posicao || 12) : 12),
 }
 })
 setResultadosManuais(initial)

 // MVP: base com todos os jogadores cadastrados pelas equipes do jogo
 const cadastrados = await carregarJogadoresDoJogoMvp(slots)

 // MVP salvos na tabela única resultados_mvp
 const partidaAtual = await supabase
 .from('partidas')
 .select('id')
 .eq('jogo_id', jogoIdAtual)
 .eq('numero', Number(queda.numero_partida || 0))
 .maybeSingle()

 const partidaIdAtual = String(partidaAtual.data?.id || '').trim()

 const { data: mvpSalvos } = await supabase
 .from('resultados_mvp')
 .select('jogador_campeonato_id, uid_jogo_snapshot, nick_snapshot, abates, equipe_id, equipe_avulsa_id')
 .eq('jogo_id', jogoIdAtual)
 .eq('mapa', queda.mapa)
 .eq('partida_id', partidaIdAtual)

 const baseMap = new Map<string, MVPRow>()
 ;(cadastrados.base || []).forEach((item) => {
 if (!item.game_id) return
 baseMap.set(item.game_id, item)
 })

 const edits: Record<string, { nick: string; abates: number }> = { ...(cadastrados.edits || {}) }
 const eqMap: Record<string, string> = { ...(cadastrados.eqMap || {}) }
 const metaByGameId = { ...(cadastrados.meta || {}) }

 ;(mvpSalvos || []).forEach((r: any) => {
 const jogadorCampeonatoId = String(r?.jogador_campeonato_id || '').trim()
 const gameId = String(r?.uid_jogo_snapshot || '').trim() || (jogadorCampeonatoId ? `cadastro:${jogadorCampeonatoId}` : '')
 if (!gameId) return

 if (!baseMap.has(gameId)) {
 baseMap.set(gameId, {
 team_raw: '',
 nick: String(r?.nick_snapshot || ''),
 game_id: gameId,
 abates: Number(r?.abates || 0),
 })
 }

 const nickDisplay =
 apelidos[gameId] ||
 metaByGameId[gameId]?.nick ||
 String(r?.nick_snapshot || '') ||
 baseMap.get(gameId)?.nick ||
 'SEM NICK'

 edits[gameId] = { nick: nickDisplay, abates: Number(r?.abates || 0) }

 const savedCampeonatoEquipeId = String(r?.equipe_id || '').trim()
 const savedEquipePublicId = String(r?.equipe_avulsa_id || '').trim()
 const bySavedCampeonatoEquipe =
 savedCampeonatoEquipeId && campeonatoEquipeIdToPublicEquipeId[savedCampeonatoEquipeId]
 ? savedCampeonatoEquipeId
 : ''

 if (bySavedCampeonatoEquipe) {
 eqMap[gameId] = bySavedCampeonatoEquipe
 } else {
 const bySavedPublic = savedEquipePublicId
 ? String(publicEquipeIdToCampeonatoEquipeId[savedEquipePublicId] || '')
 : ''

 if (bySavedPublic) {
 eqMap[gameId] = bySavedPublic
 } else {
 const byMetaPublic = String(metaByGameId[gameId]?.equipe_id || '')
 const byMeta = byMetaPublic ? String(publicEquipeIdToCampeonatoEquipeId[byMetaPublic] || '') : ''
 if (byMeta) eqMap[gameId] = byMeta
 }
 }

 if (!metaByGameId[gameId]) {
 metaByGameId[gameId] = {
 avatar_url: null,
 equipe_id: savedEquipePublicId || '',
 nick: nickDisplay,
 jogador_campeonato_id: jogadorCampeonatoId || '',
 uid_jogo: gameId.startsWith('cadastro:') ? '' : gameId,
 }
 } else {
 metaByGameId[gameId] = {
 ...metaByGameId[gameId],
 jogador_campeonato_id: jogadorCampeonatoId || metaByGameId[gameId]?.jogador_campeonato_id || '',
 uid_jogo: metaByGameId[gameId]?.uid_jogo || (gameId.startsWith('cadastro:') ? '' : gameId),
 }
 }
 })

 const base = Array.from(baseMap.values())
 setMvpMeta(metaByGameId)
 setMvpItems(base)
 setMvpEdits(edits)
 setMvpEquipe(eqMap)

 // atualiza vinculos e lock
 if (snapshot?.vinculos && Object.keys(snapshot.vinculos).length > 0) {
 setVinculos(snapshot.vinculos)
 const nomesSnapshot = Array.from(
 new Set(
 Object.values(snapshot.vinculos)
 .map((v: any) => String(v || '').trim())
 .filter((v: string) => !!v && v !== '__FALTA__')
 )
 )
 if (nomesSnapshot.length > 0) {
 setEquipesNoLog((prev) => Array.from(new Set([...(prev || []), ...nomesSnapshot])))
 }
 } else {
 await carregarVinculosDoJogo(jogo.id)
 }

 await carregarLock(jogo.id, queda.mapa)

 setIsChanging(false)
 }, [apelidos, blocoSelecionado, equipes, carregarLock, carregarVinculosDoJogo, publicEquipeIdToCampeonatoEquipeId, lerSnapshotQueda, carregarJogadoresDoJogoMvp])
 // eslint-disable-next-line react-hooks/exhaustive-deps

 // ---------------- Cálculo classificação ----------------
 const killDobroAtivaNaQueda = useMemo(() => {
 if (!blocoSelecionado || !quedaAtiva) return false

 const grupoId = getGrupoIdDoJogo(blocoSelecionado)
 const grupoCfg = grupoId ? (grupoConfiguracoes[grupoId] || {}) : {}
 const jogoCfg = parseConfig(blocoSelecionado.configuracao)
 const habilitado = Boolean(
 jogoCfg.kill_dobro_ultima_queda || grupoCfg.kill_dobro_ultima_queda
 )

 if (!habilitado) return false

 const jogosDoMesmoGrupo = grupoId
 ? (blocos || []).filter((item: any) => getGrupoIdDoJogo(item) === grupoId)
 : []

 let quedasObj: Record<string, string> = {}
 try {
 quedasObj =
 typeof blocoSelecionado.quedas === 'string'
 ? JSON.parse(blocoSelecionado.quedas)
 : (blocoSelecionado.quedas || {})
 } catch {
 quedasObj = {}
 }

 const totalQuedas = Number(
 (jogosDoMesmoGrupo.length > 1 ? jogosDoMesmoGrupo.length : 0) ||
 blocoSelecionado.quantidade_partidas ||
 grupoCfg.qtd_quedas ||
 jogoCfg.qtd_quedas ||
 jogoCfg.quantidade_partidas ||
 Object.keys(quedasObj).length ||
 quedasProcessadas.length ||
 0
 )
 const numeroQueda = Number(quedaAtiva.numero_partida || quedaAtiva.numero_queda || 0)

 return totalQuedas > 0 && numeroQueda === totalQuedas
 }, [
 blocoSelecionado,
 blocos,
 getGrupoIdDoJogo,
 grupoConfiguracoes,
 quedaAtiva,
 quedasProcessadas.length,
 ])

 const resultadosCalculados = useMemo(() => {
 const multiplicadorAbateEquipe = killDobroAtivaNaQueda ? 2 : 1
 const res: Record<string, any> = {}
 equipes.forEach((item) => {
 if (!item.equipe) return
 const vagaKey = getVagaKey(item)
 if (!vagaKey) return
 const vinculoNome = item.campeonato_equipe_id ? vinculos[item.campeonato_equipe_id] : vinculos[item.equipe.id]
 const log = dadosRawLog.find((d: any) => d.nome_equipe === vinculoNome)

 const abates = log ? Number(log.abates_total || 0) : Number(resultadosManuais[vagaKey]?.abates || 0)
 const rank = log ? Number(log.posicao || 12) : Number(resultadosManuais[vagaKey]?.posicao || 12)
 const pontosColocacao = tabelaPontos[rank] || 0
 const pontosAbates = abates * multiplicadorAbateEquipe
 res[vagaKey] = {
 abates,
 rank,
 pontosColocacao,
 pontosAbates,
 total: pontosColocacao + pontosAbates,
 killDobroAtiva: killDobroAtivaNaQueda,
 }
 })
 return res
 }, [equipes, vinculos, dadosRawLog, resultadosManuais, killDobroAtivaNaQueda])

 const ranksDuplicados = useMemo(() => {
 const freq: Record<number, number> = {}
 Object.values(resultadosCalculados).forEach((r: any) => {
 const rank = Number(r?.rank || 0)
 if (!rank) return
 freq[rank] = (freq[rank] || 0) + 1
 })
 return Object.keys(freq)
 .filter((rank) => freq[Number(rank)] > 1)
 .map((rank) => Number(rank))
 }, [resultadosCalculados])

 const equipesOrdenadas = useMemo(() => {
 const porVaga = new Map<string, SlotEquipe>()
 ;(equipes || []).forEach((item: SlotEquipe, idx: number) => {
 const key = item?.campeonato_equipe_id || (item?.equipe ? `sem-vaga-${item.slot}-${idx}` : `empty-${item.slot}-${idx}`)
 if (!porVaga.has(String(key))) porVaga.set(String(key), item)
 })

 return Array.from(porVaga.values()).sort((a, b) => {
 const rankA = a.equipe ? Number(resultadosCalculados[getVagaKey(a)]?.rank || 99) : 999
 const rankB = b.equipe ? Number(resultadosCalculados[getVagaKey(b)]?.rank || 99) : 999
 if (rankA !== rankB) return rankA - rankB
 return a.slot - b.slot
 })
 }, [equipes, resultadosCalculados])


 const mvpAgrupadoPorEquipe = useMemo(() => {
 const ordemEquipes = equipes.map((slot) => String(slot?.campeonato_equipe_id || '')).filter(Boolean)
 const grupos: Record<string, {
 equipeId: string
 equipeNome: string
 itens: Array<{
 gameId: string
 nickAtual: string
 abates: number
 teamRaw: string
 avatar_url: string | null
 isBusy: boolean
 }>
 }> = {}

 Object.entries(mvpEdits).forEach(([gameId, v]) => {
 const original = mvpItems.find((x) => x.game_id === gameId)
 const equipeId =
 String(mvpEquipe[gameId] || '') ||
 String(teamRawToEquipeId[String(original?.team_raw || '').trim()] || '')
 const equipeNome = campeonatoEquipeIdToNome[equipeId] || 'SEM EQUIPE DEFINIDA'
 const chave = equipeId || `sem-equipe-${String(original?.team_raw || '').trim() || gameId}`

 if (!grupos[chave]) {
 grupos[chave] = {
 equipeId,
 equipeNome,
 itens: [],
 }
 }

 grupos[chave].itens.push({
 gameId,
 nickAtual: v.nick || original?.nick || '',
 abates: Number(v.abates || 0),
 teamRaw: String(original?.team_raw || ''),
 avatar_url: mvpMeta[gameId]?.avatar_url || null,
 isBusy: !!savingNick[gameId],
 })
 })

 return Object.values(grupos).sort((a, b) => {
 const ia = a.equipeId ? ordemEquipes.indexOf(a.equipeId) : 999
 const ib = b.equipeId ? ordemEquipes.indexOf(b.equipeId) : 999
 if (ia !== ib) return ia - ib
 return a.equipeNome.localeCompare(b.equipeNome)
 })
 }, [mvpEdits, mvpItems, mvpEquipe, mvpMeta, equipes, campeonatoEquipeIdToNome, teamRawToEquipeId, savingNick])

 const onResultChange = useCallback((id: string, f: string, val: number) => {
 setResultadosManuais((p) => ({
 ...p,
 [id]: { ...(p[id] || { abates: 0, posicao: 12 }), [f]: val },
 }))
 }, [])

 // ---------------- Persistir vínculo equipe ----------------
 const onVinculoChange = useCallback(async (campeonatoEquipeId: string, teamRaw: string) => {
 if (!blocoSelecionado || !quedaAtiva) return

 const jogoIdAtual = String(quedaAtiva?.jogo_id || blocoSelecionado?.id || '').trim()
 if (!jogoIdAtual) return

 const equipeKey = String(campeonatoEquipeId || '').trim()
 const nomeRaw = String(teamRaw || '')

 if (!equipeKey) return

 const proximosVinculos = { ...vinculos, [equipeKey]: nomeRaw }
 setVinculos(proximosVinculos)

 try {
 if (!nomeRaw.trim()) {
 const { error } = await supabase
 .from('jogo_vinculos_equipes')
 .delete()
 .eq('jogo_id', jogoIdAtual)
 .eq('campeonato_equipe_id', equipeKey)

 if (error) console.error('Erro ao remover vínculo:', error)
 salvarSnapshotQueda(jogoIdAtual, quedaAtiva.mapa)
 return
 }

 await salvarVinculoEquipe(jogoIdAtual, equipeKey, nomeRaw)
 salvarSnapshotQueda(jogoIdAtual, quedaAtiva.mapa)
 } catch (error) {
 console.error('Erro ao salvar vínculo da equipe:', error)
 }
 }, [blocoSelecionado, quedaAtiva, vinculos, salvarSnapshotQueda, salvarVinculoEquipe])

 // ---------------- Upload MatchResult ----------------
 const handleFileUpload = async (e: any) => {
 const inputEl = e.target as HTMLInputElement
 const file = inputEl?.files?.[0]
 if (!file || !blocoSelecionado || !quedaAtiva) {
 if (inputEl) inputEl.value = ''
 return
 }

 const jogoIdAtual = String(quedaAtiva?.jogo_id || blocoSelecionado?.id || '').trim()
 if (!jogoIdAtual) {
 if (inputEl) inputEl.value = ''
 return
 }

 if (locked) {
 if (inputEl) inputEl.value = ''
 return alert('🔒 Esta queda está travada. Clique em EDITAR/DESTRAVAR para importar outro MatchResult.')
 }

 const text = await file.text()
 const parsed = parseMatchResultFallback(text)

 const teams = parsed?.teams || []
 const players = parsed?.players || []

 const teamNames = Array.from(new Set((teams || []).map((t: any) => String(t.nome_equipe))))
 setEquipesNoLog(teamNames)
 setDadosRawLog(teams)

 const vinculosDetectados: { campeonato_equipe_id: string; nome_raw: string }[] = []

 for (const team of teams) {
 const nomeRaw = String(team?.nome_equipe || '').trim()
 if (!nomeRaw) continue

 const equipeIdPorVinculo = teamRawToEquipeId[normalizeText(nomeRaw)] || ''
 const equipeIdPorNome = guessCampeonatoEquipeIdByRaw(nomeRaw)
 const equipeIdFinal = equipeIdPorVinculo || equipeIdPorNome

 if (equipeIdFinal) {
 vinculosDetectados.push({ campeonato_equipe_id: equipeIdFinal, nome_raw: nomeRaw })
 }
 }

 if (vinculosDetectados.length > 0) {
 await persistirVinculosEmLote(vinculosDetectados, jogoIdAtual)
 await carregarVinculosDoJogo(jogoIdAtual)
 }

 const normalizedPlayers: MVPRow[] = (players || [])
 .map((p: any) => ({
 team_raw: String(p.team_raw || p.nome_equipe || ''),
 nick: String(p.nick || p.nome || ''),
 game_id: String(p.game_id || p.id || ''),
 abates: Number(p.abates ?? p.kills ?? 0),
 }))
 .filter((p: MVPRow) => p.game_id)

 const withNick = normalizedPlayers.map((p) => ({
 ...p,
 nick: apelidos[p.game_id] || p.nick,
 }))

 const cadastrados = await carregarJogadoresDoJogoMvp(equipes)

 const baseMap = new Map<string, MVPRow>()
 ;(cadastrados.base || []).forEach((item) => {
 if (!item.game_id) return
 baseMap.set(item.game_id, item)
 })
 withNick.forEach((item) => {
 baseMap.set(item.game_id, item)
 })

 const edits: Record<string, { nick: string; abates: number }> = { ...(cadastrados.edits || {}) }
 withNick.forEach((p) => {
 edits[p.game_id] = { nick: p.nick, abates: p.abates }
 })
 setMvpEdits(edits)

 setMvpItems(Array.from(baseMap.values()))

 const importedGameIds = withNick.map(p => p.game_id)
 const metaByGameId = { ...(cadastrados.meta || {}), ...(await carregarMetaJogadoresMvp(importedGameIds)) }
 setMvpMeta(metaByGameId)

 const equipePorGameId = await resolverEquipesPorGameIds(importedGameIds)

 const { data: vinculosAtualizados } = await supabase
 .from('jogo_vinculos_equipes')
 .select('campeonato_equipe_id, nome_raw')
 .eq('jogo_id', jogoIdAtual)

 const teamRawMapAtualizado: Record<string, string> = {}
 ;(vinculosAtualizados || []).forEach((row: any) => {
 const raw = normalizeText(String(row?.nome_raw || '').trim())
 const equipeId = String(row?.campeonato_equipe_id || '').trim()
 if (raw && equipeId) teamRawMapAtualizado[raw] = equipeId
 })

 const eqMap: Record<string, string> = { ...(cadastrados.eqMap || {}) }
 withNick.forEach((p) => {
 const byMetaPublic = String(metaByGameId[p.game_id]?.equipe_id || '')
 const byMeta = byMetaPublic ? String(publicEquipeIdToCampeonatoEquipeId[byMetaPublic] || '') : ''
 if (byMeta) {
 eqMap[p.game_id] = byMeta
 return
 }

 const byCadastroPublic = equipePorGameId[p.game_id]
 const byCadastro = byCadastroPublic ? String(publicEquipeIdToCampeonatoEquipeId[byCadastroPublic] || '') : ''
 if (byCadastro) {
 eqMap[p.game_id] = byCadastro
 return
 }

 const raw = String(p.team_raw || '').trim()
 const rawNorm = normalizeText(raw)
 const byRaw = rawNorm ? (teamRawMapAtualizado[rawNorm] || teamRawToEquipeId[rawNorm] || guessCampeonatoEquipeIdByRaw(raw)) : ''
 if (byRaw) eqMap[p.game_id] = byRaw
 })
 setMvpEquipe(eqMap)

 await carregarVinculosDoJogo(jogoIdAtual)
 await carregarApelidosCampeonato()
 }

 // ---------------- Nick edit persistente ----------------
 const salvarApelido = async (gameId: string, nickDisplay: string) => {
 if (!gameId || !campeonatoId) return
 if (locked) return alert('🔒 Queda travada. Destrave para editar nicks.')

 setSavingNick((p) => ({ ...p, [gameId]: true }))
 try {
 const { data: exists } = await supabase
 .from('apelidos_match')
 .select('id')
 .eq('campeonato_id', campeonatoId)
 .eq('game_id_raw', gameId)
 .maybeSingle()

 if (exists?.id) {
 await supabase.from('apelidos_match').update({ nick_display: nickDisplay }).eq('id', exists.id)
 } else {
 await supabase.from('apelidos_match').insert([{ campeonato_id: campeonatoId, game_id_raw: gameId, nick_display: nickDisplay }])
 }

 setApelidos((p) => ({ ...p, [gameId]: nickDisplay }))
 } catch (err) {
 console.error(err)
 alert('❌ Erro ao salvar apelido. (confere se a tabela apelidos_match existe)')
 } finally {
 setSavingNick((p) => ({ ...p, [gameId]: false }))
 }
 }

 const buscarPartidaAtual = useCallback(async () => {
 if (!blocoSelecionado || !quedaAtiva) return null

 const jogoIdAtual = String(quedaAtiva?.jogo_id || blocoSelecionado?.id || '').trim()
 if (!jogoIdAtual) return null
 const numeroPartida = Number(quedaAtiva.numero_partida || 0)
 const mapaPartida = String(quedaAtiva.mapa || '').trim()

 const { data, error } = await supabase
 .from('partidas')
 .select('id, numero, mapa')
 .eq('jogo_id', jogoIdAtual)
 .eq('numero', numeroPartida)
 .maybeSingle()

 if (error) {
 console.error('Erro ao buscar partida atual:', error)
 return null
 }

 if (data?.id) return data

 const grupoId = String(blocoSelecionado?.grupo_id || getGrupoIdDoJogo(blocoSelecionado) || '').trim()
 const { data: criada, error: criarError } = await supabase
 .from('partidas')
 .insert([{
 campeonato_id: campeonatoId,
 jogo_id: jogoIdAtual,
 grupo_id: grupoId || null,
 numero: numeroPartida || 1,
 mapa: mapaPartida || null,
 status: 'finalizada',
 ordem_exibicao: numeroPartida || 1,
 }])
 .select('id, numero, mapa')
 .single()

 if (criarError) {
 console.error('Erro ao criar partida para MVP:', criarError)
 return null
 }

 return criada || null
 }, [blocoSelecionado, quedaAtiva, campeonatoId, getGrupoIdDoJogo])

 const salvarResultadosJogadores = useCallback(async () => {
 if (!campeonatoId || !blocoSelecionado || !quedaAtiva) return

 const jogoIdAtual = String(quedaAtiva?.jogo_id || blocoSelecionado?.id || '').trim()
 if (!jogoIdAtual) return

 const grupoIdPadrao = String(quedaAtiva?.grupo_id || blocoSelecionado?.grupo_id || getGrupoIdDoJogo(blocoSelecionado) || '').trim()
 const jogadoresPayload = Object.entries(mvpEdits)
 .map(([gameId, v]) => {
 const original = mvpItems.find((x) => x.game_id === gameId)
 const rawOriginal = String(original?.team_raw || '').trim()
 const rawOriginalNorm = normalizeText(rawOriginal)
 const campeonatoEquipeId = String(
 mvpEquipe[gameId] ||
 teamRawToEquipeId[rawOriginalNorm] ||
 guessCampeonatoEquipeIdByRaw(rawOriginal) ||
 ''
 ).trim()

 if (!campeonatoEquipeId) {
 console.warn('MVP ignorado sem equipe vinculada', {
 gameId,
 team_raw: rawOriginal,
 nick: String(v?.nick || original?.nick || '').trim(),
 })
 return null
 }

 const nickFinal = String(v?.nick || '').trim() || String(original?.nick || '').trim() || 'SEM NICK'
 const uidJogoFinal =
 String(mvpMeta[gameId]?.uid_jogo || '').trim() ||
 String(gameId || '').trim()

 return {
 gameId: uidJogoFinal,
 nick: nickFinal,
 abates: Number(v?.abates || 0),
 campeonatoEquipeId,
 teamRaw: rawOriginal,
 }
 })
 .filter(Boolean)

 if (jogadoresPayload.length === 0) {
 throw new Error('Nenhum jogador do MatchResult ficou vinculado a uma equipe. Confira os vinculos TeamName na aba Equipes.')
 }

 const response = await fetch('/api/campeonatos/sumula/mvp', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 campeonatoId,
 faseId: faseSelecionadaId || blocoSelecionado?.fase_id || null,
 jogoId: jogoIdAtual,
 grupoId: grupoIdPadrao || null,
 mapa: String(quedaAtiva.mapa || ''),
 numeroPartida: Number(quedaAtiva.numero_partida || 1),
 jogadores: jogadoresPayload,
 }),
 })

 const result = await response.json().catch(() => null)
 if (!response.ok || !result?.ok) {
 throw new Error(result?.error || 'Nao foi possivel salvar o MVP da sumula.')
 }

 if (Number(result.count || 0) <= 0) {
 throw new Error('A sumula nao gravou nenhum jogador no MVP. Confira os vinculos dos jogadores.')
 }

 return

 const partidaAtual = await buscarPartidaAtual()
 if (!partidaAtual?.id) {
 throw new Error('Nao foi possivel localizar ou criar a partida desta queda para salvar o MVP.')
 }

 const { error: deleteError } = await supabase
 .from('resultados_mvp')
 .delete()
 .eq('campeonato_id', campeonatoId)
 .eq('jogo_id', jogoIdAtual)
 .eq('partida_id', partidaAtual.id)

 if (deleteError) {
 console.error('Erro ao limpar resultados do MVP:', deleteError)
 }

 const inserts: any[] = []

 for (const [gameId, v] of Object.entries(mvpEdits)) {
 const original = mvpItems.find((x) => x.game_id === gameId)
 const rawOriginal = String(original?.team_raw || '').trim()
 const rawOriginalNorm = normalizeText(rawOriginal)
 const campeonatoEquipeId = String(
 mvpEquipe[gameId] ||
 teamRawToEquipeId[rawOriginalNorm] ||
 guessCampeonatoEquipeIdByRaw(rawOriginal) ||
 ''
 ).trim()

 if (!campeonatoEquipeId) {
 console.warn('MVP ignorado sem equipe vinculada', {
 gameId,
 team_raw: rawOriginal,
 nick: String(v?.nick || original?.nick || '').trim(),
 })
 continue
 }

 const slotEquipe = equipes.find((slot) => String(slot?.campeonato_equipe_id || '') === campeonatoEquipeId)
 const equipePublicaId = String(slotEquipe?.equipe?.id || '').trim()
 const grupoId = String(slotEquipe?.grupo_id || '').trim()

 const campeonatoEquipeRow = slotEquipe?.campeonato_equipe_id
 ? await supabase
 .from('campeonato_equipes')
 .select('id, equipe_id, equipe_avulsa_id, nome_exibicao, numero_vaga')
 .eq('id', slotEquipe.campeonato_equipe_id)
 .maybeSingle()
 : { data: null, error: null as any }

 if (campeonatoEquipeRow?.error) {
 console.error('Erro ao carregar campeonato_equipes para resultado_mvp:', campeonatoEquipeRow.error)
 }

 const equipeIdReal = String(campeonatoEquipeRow?.data?.equipe_id || '').trim() || null
 const equipeAvulsaIdReal = String(campeonatoEquipeRow?.data?.equipe_avulsa_id || '').trim() || null

 const cadastroIdFromMeta =
 String(mvpMeta[gameId]?.jogador_campeonato_id || '').trim() ||
 (String(gameId || '').startsWith('cadastro:') ? String(gameId).replace('cadastro:', '').trim() : '')

 let jogadorCampeonatoRow: any = null

 const garantirJogadorNoCampeonato = async () => {
 const uidNormalizado =
 String(mvpMeta[gameId]?.uid_jogo || '').trim() ||
 (String(gameId || '').startsWith('cadastro:') ? '' : String(gameId || '').trim())

 const nickNormalizado =
 String(v?.nick || '').trim() ||
 String(original?.nick || '').trim() ||
 'SEM NICK'

 try {
 const { data: ceRow, error: ceError } = await supabase
 .from('campeonato_equipes')
 .select('id, equipe_id, equipe_avulsa_id, nome_exibicao, numero_vaga')
 .eq('id', campeonatoEquipeId)
 .eq('campeonato_id', campeonatoId)
 .maybeSingle()

 if (ceError || !ceRow?.id) {
 console.error('MVP: campeonato_equipes não encontrado:', ceError || { campeonatoEquipeId, campeonatoId })
 return null
 }

 let jogadorAvulsoId = ''

 if (uidNormalizado) {
 const { data: avulsoExistente } = await supabase
 .from('jogadores_avulsos_campeonato')
 .select('id')
 .eq('campeonato_id', campeonatoId)
 .eq('uid_jogo', uidNormalizado)
 .maybeSingle()

 if (avulsoExistente?.id) {
 jogadorAvulsoId = String(avulsoExistente.id)
 }
 }

 if (!jogadorAvulsoId) {
 const campoEquipe = ceRow.equipe_id ? 'equipe_id' : 'equipe_avulsa_id'
 const valorEquipe = ceRow.equipe_id || ceRow.equipe_avulsa_id

 if (valorEquipe) {
 const { data: avulsoPorNick } = await supabase
 .from('jogadores_avulsos_campeonato')
 .select('id')
 .eq('campeonato_id', campeonatoId)
 .eq('nick', nickNormalizado)
 .eq(campoEquipe, valorEquipe)
 .maybeSingle()

 if (avulsoPorNick?.id) {
 jogadorAvulsoId = String(avulsoPorNick.id)
 }
 }
 }

 if (!jogadorAvulsoId) {
 const { data: novoAvulso, error: novoAvulsoError } = await supabase
 .from('jogadores_avulsos_campeonato')
 .insert([{
 campeonato_id: campeonatoId,
 equipe_id: ceRow.equipe_id || null,
 equipe_avulsa_id: ceRow.equipe_avulsa_id || null,
 nick: nickNormalizado,
 uid_jogo: uidNormalizado || `temp:${gameId}`,
 funcao: null,
 foto_url: null,
 criado_por: null,
 criado_automaticamente: true,
 origem: 'matchresult',
 }])
 .select('id')
 .single()

 if (novoAvulsoError || !novoAvulso?.id) {
 console.error('MVP: erro ao criar jogador_avulso:', novoAvulsoError)
 return null
 }

 jogadorAvulsoId = String(novoAvulso.id)
 }

 const { data: jcExistente } = await supabase
 .from('jogadores_campeonato')
 .select('id, campeonato_equipe_id, perfil_jogo_id, equipe_id, equipe_avulsa_id, jogador_avulso_id')
 .eq('campeonato_id', campeonatoId)
 .eq('campeonato_equipe_id', ceRow.id)
 .eq('jogador_avulso_id', jogadorAvulsoId)
 .maybeSingle()

 if (jcExistente?.id) {
 return jcExistente
 }

 const { data: novoJc, error: novoJcError } = await supabase
 .from('jogadores_campeonato')
 .insert([{
 campeonato_id: campeonatoId,
 campeonato_equipe_id: ceRow.id,
 equipe_id: ceRow.equipe_id || null,
 equipe_avulsa_id: ceRow.equipe_avulsa_id || null,
 perfil_jogo_id: null,
 jogador_avulso_id: jogadorAvulsoId,
 origem: 'sumula',
 status: 'ativo',
 criado_automaticamente: true,
 criado_por: null,
 observacoes: 'Criado automaticamente via súmula',
 }])
 .select('id, campeonato_equipe_id, perfil_jogo_id, equipe_id, equipe_avulsa_id, jogador_avulso_id')
 .single()

 if (novoJcError) {
 console.error('MVP: erro ao criar jogador_campeonato:', novoJcError)
 return null
 }

 return novoJc
 } catch (fallbackError) {
 console.error('MVP: erro inesperado ao garantir jogador:', fallbackError)
 return null
 }
 }

 if (cadastroIdFromMeta) {
 const { data: jogadorExistente, error: jogadorExistenteError } = await supabase
 .from('jogadores_campeonato')
 .select('id, campeonato_equipe_id, perfil_jogo_id, equipe_id, equipe_avulsa_id, jogador_avulso_id')
 .eq('id', cadastroIdFromMeta)
 .maybeSingle()

 if (jogadorExistenteError) {
 console.error('Erro ao buscar jogador do campeonato existente:', jogadorExistenteError)
 continue
 }

 const equipeAtualDoCadastro = String(jogadorExistente?.campeonato_equipe_id || '').trim()
 const equipeSelecionadaNoCampeonato = String(campeonatoEquipeId || '').trim()

 const cadastroCompativelComJogo =
 !!jogadorExistente?.id &&
 !!equipeAtualDoCadastro &&
 equipeAtualDoCadastro === equipeSelecionadaNoCampeonato

 if (!cadastroCompativelComJogo) {
 jogadorCampeonatoRow = await garantirJogadorNoCampeonato()
 } else {
 jogadorCampeonatoRow = jogadorExistente
 }
 } else {
 jogadorCampeonatoRow = await garantirJogadorNoCampeonato()
 }

 if (!jogadorCampeonatoRow?.id) {
 continue
 }
 const nickFinal = String(v?.nick || '').trim() || String(original?.nick || '').trim() || 'SEM NICK'
 const uidJogoFinal =
 String(mvpMeta[gameId]?.uid_jogo || '').trim() ||
 String(gameId || '').trim() ||
 null

 inserts.push({
 campeonato_id: campeonatoId,
 fase_id: faseSelecionadaId || blocoSelecionado?.fase_id || null,
 jogo_id: jogoIdAtual,
 partida_id: partidaAtual.id,
 mapa: String(quedaAtiva.mapa || ''),
 grupo_id: grupoId || null,
 campeonato_equipe_id: campeonatoEquipeId || null,
 equipe_id: campeonatoEquipeId || null,
 equipe_avulsa_id: jogadorCampeonatoRow?.equipe_avulsa_id || null,
 perfil_jogo_id: jogadorCampeonatoRow?.perfil_jogo_id || null,
 jogador_campeonato_id: jogadorCampeonatoRow?.id || null,
 jogador_avulso_id: jogadorCampeonatoRow?.jogador_avulso_id || null,
 nick_snapshot: nickFinal,
 uid_jogo_snapshot: uidJogoFinal,
 abates: Number(v?.abates || 0),
 dano: 0,
 assistencias: 0,
 revives: 0,
 colocacao_individual: null,
 observacoes: 'Importado via MatchResult',
 })
 }

 const insertsDedupeMap = new Map<string, any>()

 for (const row of inserts) {
 const chave =
 String(row?.jogador_campeonato_id || '').trim() ||
 String(row?.perfil_jogo_id || '').trim() ||
 `${String(row?.uid_jogo_snapshot || '').trim()}::${String(row?.equipe_id || row?.equipe_avulsa_id || '').trim()}`

 if (!chave) continue

 const existente = insertsDedupeMap.get(chave)
 if (!existente) {
 insertsDedupeMap.set(chave, {
 ...row,
 campeonato_id: String(row?.campeonato_id || '').trim() || null,
 fase_id: String(row?.fase_id || '').trim() || null,
 jogo_id: String(row?.jogo_id || '').trim() || null,
 partida_id: String(row?.partida_id || '').trim() || null,
 mapa: String(row?.mapa || '').trim(),
 grupo_id: String(row?.grupo_id || '').trim() || null,
 campeonato_equipe_id: String(row?.campeonato_equipe_id || '').trim() || null,
 equipe_id: String(row?.equipe_id || '').trim() || null,
 equipe_avulsa_id: String(row?.equipe_avulsa_id || '').trim() || null,
 jogador_campeonato_id: String(row?.jogador_campeonato_id || '').trim() || null,
 perfil_jogo_id: String(row?.perfil_jogo_id || '').trim() || null,
 jogador_avulso_id: String(row?.jogador_avulso_id || '').trim() || null,
 nick_snapshot: String(row?.nick_snapshot || '').trim() || 'SEM NICK',
 uid_jogo_snapshot: String(row?.uid_jogo_snapshot || '').trim() || null,
 abates: Number(row?.abates || 0),
 dano: Number(row?.dano || 0),
 assistencias: Number(row?.assistencias || 0),
 revives: Number(row?.revives || 0),
 colocacao_individual: row?.colocacao_individual ?? null,
 observacoes: String(row?.observacoes || '').trim() || null,
 })
 continue
 }

 existente.abates = Math.max(Number(existente.abates || 0), Number(row?.abates || 0))
 existente.dano = Math.max(Number(existente.dano || 0), Number(row?.dano || 0))
 existente.assistencias = Math.max(Number(existente.assistencias || 0), Number(row?.assistencias || 0))
 existente.revives = Math.max(Number(existente.revives || 0), Number(row?.revives || 0))

 if ((!existente.nick_snapshot || existente.nick_snapshot === 'SEM NICK') && row?.nick_snapshot) {
 existente.nick_snapshot = String(row.nick_snapshot).trim()
 }
 if (!existente.uid_jogo_snapshot && row?.uid_jogo_snapshot) {
 existente.uid_jogo_snapshot = String(row.uid_jogo_snapshot).trim()
 }
 if (!existente.perfil_jogo_id && row?.perfil_jogo_id) {
 existente.perfil_jogo_id = String(row.perfil_jogo_id).trim()
 }
 if (!existente.jogador_avulso_id && row?.jogador_avulso_id) {
 existente.jogador_avulso_id = String(row.jogador_avulso_id).trim()
 }
 if (!existente.equipe_id && row?.equipe_id) {
 existente.equipe_id = String(row.equipe_id).trim()
 }
 if (!existente.equipe_avulsa_id && row?.equipe_avulsa_id) {
 existente.equipe_avulsa_id = String(row.equipe_avulsa_id).trim()
 }
 }

 const insertsFinal = Array.from(insertsDedupeMap.values())

 if (insertsFinal.length > 0) {
 const { error: insertError } = await supabase
 .from('resultados_mvp')
 .insert(insertsFinal)

 if (insertError) {
 console.error('Erro ao inserir resultados do MVP:', insertError)
 console.error('Payload original do insert do MVP:', inserts)
 console.error('Payload deduplicado do insert do MVP:', insertsFinal)
 try {
 console.error('Erro ao inserir resultados do MVP | json:', JSON.stringify(insertError, null, 2))
 } catch {}
 throw insertError
 }
 } else {
 console.warn('Nenhum jogador do MVP gerou insert em resultados_mvp.')
 }
 }, [campeonatoId, blocoSelecionado, quedaAtiva, getGrupoIdDoJogo, buscarPartidaAtual, mvpEdits, mvpItems, mvpEquipe, teamRawToEquipeId, equipes, mvpMeta, faseSelecionadaId, guessCampeonatoEquipeIdByRaw])

 // ---------------- Salvar CLASSIFICAÇÃO ----------------
 const montarInsertsClassificacao = (jogoIdAtual: string) => equipes
 .filter((i) => i.equipe)
 .map((i) => ({
 campeonato_id: campeonatoId,
 fase_id: faseSelecionadaId,
 jogo_id: jogoIdAtual,
 equipe_id: i.campeonato_equipe_id,
 grupo_id: i.grupo_id,
 mapa: quedaAtiva.mapa,
 abates: resultadosCalculados[getVagaKey(i)].abates,
 posicao: resultadosCalculados[getVagaKey(i)].rank,
 total_pontos: resultadosCalculados[getVagaKey(i)].total,
 }))

 const publicarClassificacaoNoBanco = async (jogoIdAtual: string, rows: any[]) => {
 const response = await fetch('/api/stream/publish-score', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 projectId: projectIdOverride || null,
 streamKey: streamKeyOverride || null,
 campeonatoId,
 jogoId: jogoIdAtual,
 mapa: quedaAtiva?.mapa,
 rows,
 }),
 })

 const result = await response.json().catch(() => null)
 if (!response.ok || !result?.ok) {
 throw new Error(result?.error || 'Nao foi possivel salvar a classificacao no banco.')
 }

 return result
 }

 const salvarClassificacaoLive = async () => {
 if (!quedaAtiva || !blocoSelecionado) return

 setLoading(true)
 try {
 const jogoIdAtual = getJogoIdAtual()
 const inserts = montarInsertsClassificacao(jogoIdAtual)

 const response = await fetch('/api/stream/live-score', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 projectId: projectIdOverride || null,
 streamKey: streamKeyOverride || null,
 campeonatoId,
 jogoId: jogoIdAtual,
 mapa: quedaAtiva.mapa,
 rows: inserts,
 }),
 })
 const result = await response.json()
 if (!response.ok || !result?.ok) {
 throw new Error(result?.error || 'Nao foi possivel atualizar a live.')
 }

 salvarSnapshotQueda(jogoIdAtual, quedaAtiva.mapa)
 alert('Live atualizada. A tabela do site continua congelada ate publicar no site.')
 } catch (e: any) {
 console.error(e)
 alert(`Erro ao atualizar a live: ${e?.message || e?.details || 'veja console'}`)
 } finally {
 setLoading(false)
 }
 }

 const salvarClassificacao = async () => {
 if (!quedaAtiva || !blocoSelecionado) return
 if (locked) return alert('🔒 Queda travada. Clique em EDITAR/DESTRAVAR para alterar.')

 setLoading(true)
 try {
 const jogoIdAtual = getJogoIdAtual()
 const inserts = montarInsertsClassificacao(jogoIdAtual)
 await publicarClassificacaoNoBanco(jogoIdAtual, inserts)
 salvarSnapshotQueda(jogoIdAtual, quedaAtiva.mapa)

 await supabase.rpc('lock_sumula', {
 p_campeonato_id: campeonatoId,
 p_jogo_id: jogoIdAtual,
 p_mapa: quedaAtiva.mapa,
 })
 setLocked(true)

 await carregarVinculosDoJogo(jogoIdAtual)
 await handleSelecionarQueda({ ...quedaAtiva, jogo_id: jogoIdAtual }, blocoSelecionado, equipes)

 alert('✅ Resultados da queda (Classificação) salvos e TRAVADOS!')
 } catch (e) {
 console.error(e)
 alert('❌ Erro ao salvar classificação.')
 } finally {
 setLoading(false)
 }
 }

 // ---------------- Salvar MVP ----------------
 const salvarMvp = async () => {
 if (!quedaAtiva || !blocoSelecionado) return
 if (locked) return alert('🔒 Queda travada. Clique em EDITAR/DESTRAVAR para alterar.')

 const jogoIdAtual = getJogoIdAtual()
 if (!jogoIdAtual) return

 setLoading(true)
 try {
 await salvarResultadosJogadores()

 salvarSnapshotQueda(jogoIdAtual, quedaAtiva.mapa)

 await supabase.rpc('lock_sumula', {
 p_campeonato_id: campeonatoId,
 p_jogo_id: jogoIdAtual,
 p_mapa: quedaAtiva.mapa,
 })
 setLocked(true)

 await carregarVinculosDoJogo(jogoIdAtual)
 await handleSelecionarQueda({ ...quedaAtiva, jogo_id: jogoIdAtual }, blocoSelecionado, equipes)

 alert('✅ MVP da queda salvo em resultados_mvp e TRAVADO!')
 } catch (e) {
 console.error(e)
 alert(`❌ Erro ao salvar MVP: ${e?.message || e?.details || e?.hint || 'veja console'}`)
 } finally {
 setLoading(false)
 }
 }



 const salvarTudo = async () => {
 if (!quedaAtiva || !blocoSelecionado) return
 if (locked) return alert('🔒 Queda travada. Clique em EDITAR/DESTRAVAR para alterar.')

 setLoading(true)
 try {
 const jogoIdAtual = getJogoIdAtual()
 const insertsClassificacao = montarInsertsClassificacao(jogoIdAtual)

 await publicarClassificacaoNoBanco(jogoIdAtual, insertsClassificacao)

 salvarSnapshotQueda(jogoIdAtual, quedaAtiva.mapa)

 await salvarResultadosJogadores()

 await supabase.rpc('lock_sumula', {
 p_campeonato_id: campeonatoId,
 p_jogo_id: jogoIdAtual,
 p_mapa: quedaAtiva.mapa,
 })
 setLocked(true)

 await carregarVinculosDoJogo(jogoIdAtual)
 await handleSelecionarQueda({ ...quedaAtiva, jogo_id: jogoIdAtual }, blocoSelecionado, equipes)

 alert('✅ Classificação e MVP salvos juntos. Queda travada!')
 } catch (e: any) {
 console.error('Erro ao salvar tudo:', e)
 try {
 console.error('Erro ao salvar tudo (json):', JSON.stringify(e, null, 2))
 } catch {}
 alert(`❌ Erro ao salvar tudo: ${e?.message || e?.error_description || e?.details || 'veja console'}`)
 } finally {
 setLoading(false)
 }
 }



 // destravar
 const destravar = async () => {
 if (!blocoSelecionado || !quedaAtiva) return
 const jogoIdAtual = getJogoIdAtual()
 if (!jogoIdAtual) return

 const ok = confirm('Destravar esta queda para editar? (vai liberar upload e inputs)')
 if (!ok) return

 try {
 await supabase.rpc('unlock_sumula', {
 p_campeonato_id: campeonatoId,
 p_jogo_id: jogoIdAtual,
 p_mapa: quedaAtiva.mapa,
 })
 setLocked(false)
 alert('✅ Queda destravada.')
 } catch (err) {
 console.error(err)
 alert('❌ Erro ao destravar. (confere se RPC unlock_sumula existe)')
 }
 }

 // ---------------- Render ----------------
 const temMatchResult = equipesNoLog.length > 0 || dadosRawLog.length > 0 || mvpItems.length > 0

 if (!canEdit) {
  return (
   <div className="border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Súmula bloqueada</div>
    <p className="mt-2 leading-6">Registrar pontuação, MVP ou destravar súmula é permitido apenas para o dono do campeonato ou ajudantes autorizados.</p>
   </div>
  )
 }

 return (
 <div className="border border-zinc-200 bg-white">
 <div className="grid grid-cols-12">
 {/* SIDEBAR / PASTAS */}
 <aside className="col-span-12 border-r border-zinc-200 bg-white lg:col-span-2">
 <div className="sticky top-0 max-h-[calc(100vh-90px)] overflow-auto">
 <div className="border-b border-zinc-200 px-4 py-3">
 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#142340]">
 <Filter size={14} className="text-[#2563eb]" />
 Navegação
 </div>
 </div>

 <div className="p-2">
 {fases.map((fase) => {
 const faseAtiva = faseSelecionadaId === fase.id

 return (
 <div key={fase.id} className="mb-1">
 <button
 type="button"
 onClick={() => setFaseSelecionadaId(fase.id)}
 className={`flex h-11 w-full items-center justify-between border px-4 text-left text-[12px] font-black uppercase italic tracking-[0.08em] ${
 faseAtiva
 ? 'border-[#0b1224] bg-[#0b1224] text-white'
 : 'border-zinc-200 bg-[#e8eef6] text-[#142340]'
 }`}
 >
 <span>{fase.nome}</span>
 <ChevronRight size={17} className={`${faseAtiva ? 'rotate-90 text-[#6b8cff]' : 'text-[#6b8cff]'}`} />
 </button>

 {faseAtiva ? (
 <div className="border-x border-zinc-200">
 {blocos.map((grupo) => {
 const grupoAtivo = blocoSelecionado?.id === grupo.id

 return (
 <div key={grupo.id}>
 <button
 type="button"
 onClick={() => handleSelecionarBloco(grupo)}
 className={`flex h-10 w-full items-center justify-between border-b border-zinc-200 px-4 text-left text-[11px] font-black uppercase italic tracking-[0.08em] ${
 grupoAtivo
 ? 'bg-[#dfe7f1] text-[#142340]'
 : 'bg-[#eef2f7] text-[#142340]'
 }`}
 >
 <span className="truncate">{grupo.nome_bloco}</span>
 <ChevronRight size={16} className={`${grupoAtivo ? 'rotate-90 text-[#6b8cff]' : 'text-[#6b8cff]'}`} />
 </button>

 {grupoAtivo ? (
 <div>
 {quedasProcessadas.map((q) => (
 <button
 key={q.id}
 type="button"
 onClick={() => handleSelecionarQueda(q)}
 className={`flex h-10 w-full items-center gap-3 border-b border-zinc-200 px-5 text-left text-[11px] font-black uppercase italic tracking-[0.08em] ${
 quedaAtiva?.id === q.id
 ? 'bg-white text-[#2563eb] shadow-[inset_3px_0_0_#2563eb]'
 : 'bg-white text-[#142340] hover:text-[#2563eb]'
 }`}
 >
 <span className="text-base leading-none">🪂</span>
 <span className="truncate">{q.mapa}</span>
 </button>
 ))}
 </div>
 ) : null}
 </div>
 )
 })}
 </div>
 ) : null}
 </div>
 )
 })}
 </div>
 </div>
 </aside>

 {/* CONTEÚDO */}
 <main className="col-span-12 min-w-0 lg:col-span-10">
 {/* HEADER COMPACTO APROVADO */}
 <div className="sticky top-0 z-50 flex min-h-[58px] flex-wrap items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 py-2 backdrop-blur">
 {quedaAtiva ? (
 <button
 type="button"
 title={locked ? 'Travado' : 'Editável'}
 className={`inline-flex h-9 items-center justify-center gap-2 border px-3 text-[10px] font-black uppercase tracking-[0.10em] ${
 locked
 ? 'border-zinc-200 bg-white text-zinc-500'
 : 'border-[#2563eb] bg-[#2563eb] text-white'
 }`}
 >
 {locked ? <Lock size={13} /> : <Unlock size={13} />}
 <span>{locked ? 'Travado' : 'Editável'}</span>
 </button>
 ) : null}

 <div className="flex min-w-[180px] flex-1 items-center gap-3">
 <span className="text-lg leading-none">🪂</span>
 <div className="min-w-0">
 <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Queda atual</p>
 <h3 className="truncate text-base font-black uppercase tracking-tight text-[#142340]">
 {quedaAtiva?.mapa || 'Selecione uma queda'}
 </h3>
 </div>
 </div>

 <div className="flex items-center gap-1 border border-zinc-200 bg-white p-1">
 <button
 type="button"
 onClick={() => setTab('classificacao')}
 className={`inline-flex h-8 items-center gap-2 border px-3 text-[10px] font-black uppercase tracking-[0.10em] ${
 tab === 'classificacao' ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-zinc-200 bg-white text-zinc-500'
 }`}
 >
 <FileSpreadsheet size={13} /> Equipes
 </button>
 <button
 type="button"
 onClick={() => setTab('mvp')}
 className={`inline-flex h-8 items-center gap-2 border px-3 text-[10px] font-black uppercase tracking-[0.10em] ${
 tab === 'mvp' ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-zinc-200 bg-white text-zinc-500'
 }`}
 >
 <UserCircle2 size={13} /> Jogadores
 </button>
 </div>

 <div className="ml-auto flex items-center gap-1">
 <input
 type="file"
 id="log-up"
 onChange={handleFileUpload}
 onClick={(e) => {
 ;(e.currentTarget as HTMLInputElement).value = ''
 }}
 className="hidden"
 />
 <label
 htmlFor="log-up"
 title="Importar MatchResult"
 className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center border ${
 locked
 ? 'border-zinc-200 bg-white text-zinc-400'
 : 'border-zinc-200 bg-white text-[#2563eb] hover:border-[#2563eb]'
 }`}
 onClick={(ev) => {
 if (locked) {
 ev.preventDefault()
 alert('🔒 Queda travada. Destrave para importar novo MatchResult.')
 }
 }}
 >
 <FolderInput size={14} />
 </label>

 <button
 onClick={salvarClassificacaoLive}
 disabled={loading || isChanging || !quedaAtiva}
 title="Atualizar live sem publicar no site"
 className="inline-flex h-8 items-center justify-center gap-2 border border-emerald-600 bg-emerald-600 px-3 text-[9px] font-black uppercase tracking-[0.10em] text-white disabled:opacity-50"
 >
 {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
 <span>Atualizar live</span>
 </button>

 <button
 onClick={salvarTudo}
 disabled={loading || isChanging || !quedaAtiva}
 title="Publicar pontuacao na tabela do site"
 className="inline-flex h-8 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-3 text-[9px] font-black uppercase tracking-[0.10em] text-white disabled:opacity-50"
 >
 {loading ? <Loader2 size={14} className="animate-spin" /> : <SaveAll size={14} />}
 <span>Publicar site</span>
 </button>

 {tab === 'classificacao' ? (
 <button
 onClick={salvarClassificacao}
 disabled={loading || isChanging || !quedaAtiva}
 title="Salvar equipes"
 className="inline-flex h-8 w-8 items-center justify-center border border-zinc-200 bg-white text-[#2563eb] disabled:opacity-50 hover:border-[#2563eb]"
 >
 <Save size={14} />
 </button>
 ) : (
 <button
 onClick={salvarMvp}
 disabled={loading || isChanging || !quedaAtiva}
 title="Salvar jogadores"
 className="inline-flex h-8 w-8 items-center justify-center border border-zinc-200 bg-white text-[#2563eb] disabled:opacity-50 hover:border-[#2563eb]"
 >
 <Users size={14} />
 </button>
 )}

 <button
 onClick={destravar}
 disabled={!locked || loading || isChanging}
 title="Editar / destravar"
 className="inline-flex h-8 w-8 items-center justify-center border border-zinc-200 bg-white text-[#2563eb] disabled:opacity-50 hover:border-[#2563eb]"
 >
 <Pencil size={14} />
 </button>
 </div>
 </div>

 <div className="space-y-3 p-4">
 <div className="flex flex-wrap items-center gap-2">
 <div className="border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-600">
 LOG: <span className="text-[#2563eb]">{equipesNoLog.length}</span>
 </div>
 <div className="border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-600">
 MVP: <span className="text-[#2563eb]">{Object.keys(mvpEdits).length}</span>
 </div>
 <div className={`border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
 ranksDuplicados.length ? 'border-red-500 bg-red-50 text-red-600' : 'border-zinc-200 bg-white text-zinc-600'
 }`}>
 DUP: {ranksDuplicados.length}
 </div>
 <div className="ml-auto text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
 {temMatchResult ? 'MatchResult carregado' : 'Pontuação manual'}
 </div>
 </div>

 <div className="relative overflow-hidden border border-zinc-200 bg-white/40 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
 {isChanging && (
 <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px]">
 <RefreshCw size={24} className="animate-spin text-[#142340]" />
 </div>
 )}

 {tab === 'classificacao' && (
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-white text-[#142340] text-[9px] font-semibold uppercase">
 <th className="p-2 text-center w-10">#</th>
 <th className="p-2 text-left">EQUIPE</th>
 {temMatchResult ? (
 <th className="p-2 text-center w-48 bg-zinc-800 text-[#2563eb]">VÍNCULO TEAMNAME</th>
 ) : null}
 <th className="p-2 text-center w-20">POS</th>
 <th className="p-2 text-center w-20">ABATES</th>
 <th className="p-2 text-center bg-[#2563eb] text-white w-24">TOTAL</th>
 </tr>
 </thead>
 <tbody>
 {equipesOrdenadas.map((item, idx) => (
 <RowEquipe
 key={item.campeonato_equipe_id || item.equipe?.id || `empty-${idx}`}
 index={idx}
 item={item}
 res={resultadosCalculados[getVagaKey(item)] || { abates: 0, rank: 12, total: 0 }}
 vinculo={item.campeonato_equipe_id ? vinculos[item.campeonato_equipe_id] : ''}
 equipesNoLog={equipesNoLog}
 vinculosAtuais={vinculos}
 onVinculoChange={onVinculoChange}
 onResultChange={onResultChange}
 locked={locked}
 rankDuplicado={!!item.equipe && ranksDuplicados.includes(Number(resultadosCalculados[getVagaKey(item)]?.rank || 0))}
 showVinculo={temMatchResult}
 />
 ))}
 </tbody>
 </table>
 </div>
 )}

 {tab === 'mvp' && (
 <div className="p-3 space-y-4">
 <div className="border border-zinc-200">
 <div className="bg-white text-[#142340] px-3 py-2 text-[10px] font-semibold uppercase flex items-center justify-between">
 <span>PONTUAÇÃO DOS JOGADORES</span>
 <span className="text-[9px] font-bold text-zinc-600">
 Jogadores pontuados por line/vaga
 </span>
 </div>

 <div className="max-h-[520px] overflow-auto">
 {mvpAgrupadoPorEquipe.length === 0 && (
 <div className="p-5 text-center text-[10px] font-semibold text-zinc-500 uppercase">
 Importe um MatchResult para preencher jogadores automaticamente.
 </div>
 )}

 {mvpAgrupadoPorEquipe.map((grupo, grupoIndex) => (
 <div key={`${grupo.equipeId || 'sem-equipe'}-${grupo.equipeNome}-${grupoIndex}`} className="border-b-2 border-zinc-200 last:border-b-0">
 <div className="bg-[#2563eb]/10 border-b border-zinc-200 px-3 py-2 flex items-center justify-between">
 <span className="text-[10px] font-semibold uppercase">{grupo.equipeNome}</span>
 <span className="text-[9px] font-semibold uppercase text-zinc-500">{grupo.itens.length} jogador(es)</span>
 </div>

 <table className="w-full border-collapse">
 <thead>
 <tr className="bg-zinc-100 text-[9px] font-semibold uppercase text-zinc-600">
 <th className="p-2 text-left">Jogador</th>
 <th className="p-2 text-center w-28">Abates</th>
 <th className="p-2 text-left w-48">Equipe</th>
 <th className="p-2 text-left w-40">Team Raw</th>
 </tr>
 </thead>
 <tbody>
 {grupo.itens.map((item) => (
 <tr key={item.gameId} className="border-b border-zinc-100 hover:bg-transparent last:border-b-0">
 <td className="p-2">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 border border-zinc-200 overflow-hidden bg-white/40 shrink-0">
 <img
 src={item.avatar_url || '/placeholder.png'}
 alt=""
 className="w-full h-full object-cover"
 />
 </div>

 <div className="bg-white text-[#2563eb] px-2 py-1 text-[9px] font-semibold border border-zinc-200 shrink-0">
 ID: {item.gameId}
 </div>

 <input
 value={item.nickAtual}
 disabled={locked}
 onChange={(e) =>
 setMvpEdits((p) => ({
 ...p,
 [item.gameId]: { ...p[item.gameId], nick: e.target.value },
 }))
 }
 className={`flex-1 border border-zinc-200 px-2 py-1 text-[10px] font-semibold uppercase outline-none ${
 locked ? 'bg-transparent text-zinc-500' : 'bg-white/40'
 }`}
 />

 <button
 onClick={() => salvarApelido(item.gameId, item.nickAtual)}
 disabled={locked || item.isBusy}
 className={`border border-zinc-200 px-2 py-1 text-[9px] font-semibold uppercase ${
 locked || item.isBusy
 ? 'bg-zinc-200 text-zinc-500'
 : 'bg-[#2563eb] text-white hover:bg-[#2563eb]'
 }`}
 >
 {item.isBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
 </button>
 </div>
 </td>

 <td className="p-2 text-center">
 <input
 type="number"
 value={item.abates}
 disabled={locked}
 onChange={(e) =>
 setMvpEdits((p) => ({
 ...p,
 [item.gameId]: { ...p[item.gameId], abates: Number(e.target.value) },
 }))
 }
 className={`w-20 text-center border border-zinc-200 px-2 py-1 text-[10px] font-semibold outline-none ${
 locked ? 'bg-transparent text-zinc-500' : 'text-red-600'
 }`}
 />
 </td>

 <td className="p-2 text-[10px] font-semibold uppercase text-zinc-700">
 {grupo.equipeNome}
 </td>

 <td className="p-2 text-[10px] font-semibold uppercase text-zinc-500">
 {item.teamRaw || '-'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </main>
 </div>
 </div>
 )
}
