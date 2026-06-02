'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { AlertTriangle, Camera, Loader2, Save, UserCheck } from 'lucide-react'

interface MVPData {
 nome_jogador?: string
 equipe_nome?: string
 total_abates?: number
 nick?: string
 equipe_nome_display?: string
 abates?: number
 quedas?: number
 kd?: number
 avatar_url?: string | null
 equipe_avatar?: string | null
 equipe_tag?: string | null
 funcao?: string | null
 pais?: string | null
 perfil_jogo_id?: string | null
 equipe_id?: string | null
 campeonato_equipe_id?: string | null
 game_id_raw?: string | null
 nick_raw?: string | null
}

interface LayoutSettings {
 primary_color: string
 text_color: string
 header_bg_color: string
 header_text_color: string
 row_alt_bg: boolean
 row_bg_primary: string
 row_bg_secondary: string
 border_width: number
 border_color: string
 row_height: number
 table_width?: number
 column_widths?: Record<string, number>
 column_styles?: Record<string, { bg?: string; color?: string }>
 row_bg_image_url?: string | null
 row_bg_image_opacity?: number | null
}

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
 pos: 52,
 logo: 72,
 equipe: 360,
 grupo: 70,
 quedas: 56,
 booyah: 56,
 kill: 70,
 total: 96,
}

const MVP_COLUMN_KEYS = ['pos', 'logo', 'equipe', 'booyah', 'kill', 'total']

function getColumnWidth(layout: LayoutSettings, key: string, fallback: number) {
 return Number(layout.column_widths?.[key] || fallback)
}

function getTablePixelWidth(layout: LayoutSettings) {
 return MVP_COLUMN_KEYS.reduce((total, key) => total + getColumnWidth(layout, key, DEFAULT_COLUMN_WIDTHS[key] || 60), 0)
}

function getColumnStyle(layout: LayoutSettings, key: string, fallback: React.CSSProperties = {}) {
 const style = layout.column_styles?.[key] || {}
 return {
 ...fallback,
 ...(style.bg ? { backgroundColor: style.bg } : {}),
 ...(style.color ? { color: style.color } : {}),
 }
}

function hexToRgba(hex: string, alpha: number) {
 const clean = String(hex || '#ffffff').replace('#', '')
 const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
 const r = parseInt(value.slice(0, 2), 16)
 const g = parseInt(value.slice(2, 4), 16)
 const b = parseInt(value.slice(4, 6), 16)
 if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(255,255,255,${alpha})`
 return `rgba(${r},${g},${b},${alpha})`
}

function rowBackgroundStyle(layout: LayoutSettings, rowBg: string) {
 const image = String(layout.row_bg_image_url || '').trim()
 if (!image) return { backgroundColor: rowBg }
 const opacity = Math.max(0, Math.min(100, Number(layout.row_bg_image_opacity ?? 100))) / 100
 return {
 backgroundColor: rowBg,
 backgroundImage: `linear-gradient(${hexToRgba(rowBg, 1 - opacity)}, ${hexToRgba(rowBg, 1 - opacity)}), url(${image})`,
 backgroundSize: '100% 100%',
 backgroundPosition: 'left center',
 }
}

type Row = {
 key: string
 nome: string
 equipe: string
 tag: string
 pais: string
 funcao: string
 abates: number
 quedas: number
 kd: number
 avatar_url: string | null
 equipe_avatar: string | null
 perfil_jogo_id: string | null
 equipe_id: string | null
 campeonato_equipe_id: string | null
 jogador_campeonato_id: string | null
 jogador_avulso_id: string | null
 uid_jogo: string | null
 perfil_sugerido_id: string | null
 perfil_sugerido_nick: string | null
 perfil_sugerido_avatar: string | null
}

type ResultadoMvpRow = {
 jogador_campeonato_id?: string | null
 perfil_jogo_id?: string | null
 equipe_id?: string | null
 campeonato_equipe_id?: string | null
 equipe_avulsa_id?: string | null
 nick_snapshot?: string | null
 uid_jogo_snapshot?: string | null
 abates?: number | null
 partida_id?: string | null
}

type JogadorCampeonatoRow = {
 id: string
 perfil_jogo_id?: string | null
 equipe_id?: string | null
 campeonato_equipe_id?: string | null
 equipe_avulsa_id?: string | null
 jogador_avulso_id?: string | null
}

type JogadorAvulsoRow = {
 id: string
 nick?: string | null
 uid_jogo?: string | null
 foto_url?: string | null
 equipe_id?: string | null
 equipe_avulsa_id?: string | null
 funcao?: string | null
 pais?: string | null
}

type PerfilJogoRow = {
 id: string
 nick?: string | null
 uid_jogo?: string | null
 foto_capa?: string | null
 funcao?: string | null
}

const BUCKET_AVATAR_JOGADOR = 'avatars'

const funcaoIcone: Record<string, string> = {
 rush: '⚡',
 suporte: '🛡️',
 capitão: '👑',
 capitao: '👑',
 sniper: '🎯',
 awp: '🎯',
 granadeiro: '💣',
 igl: '🧠',
 flex: '✦',
}

function flagFromPais(pais?: string | null) {
 const value = String(pais || '').trim().toLowerCase()
 if (!value) return '🏳️'
 if (['br', 'bra', 'brasil', 'brazil'].includes(value)) return '🇧🇷'
 if (['pt', 'prt', 'portugal'].includes(value)) return '🇵🇹'
 if (['us', 'usa', 'eua', 'estados unidos'].includes(value)) return '🇺🇸'
 return value.length <= 4 ? value.toUpperCase() : value
}

function getFuncaoIcone(funcao?: string | null) {
 const key = String(funcao || '').trim().toLowerCase()
 return funcaoIcone[key] || '◎'
}

function paisIso(pais?: string | null) {
 const value = String(pais || '').trim().toLowerCase()
 if (!value) return 'BR'
 if (['br', 'bra', 'brasil', 'brazil'].includes(value)) return 'BR'
 if (['pt', 'prt', 'portugal'].includes(value)) return 'PT'
 if (['us', 'usa', 'eua', 'estados unidos'].includes(value)) return 'US'
 return value.length === 2 ? value.toUpperCase() : ''
}

function flagUrlFromPais(pais?: string | null) {
 const iso = paisIso(pais).toLowerCase()
 return iso.length === 2 ? `https://flagcdn.com/w40/${iso}.png` : ''
}

function calcKd(abates: number, quedas: number) {
 const q = Number(quedas || 0)
 if (!q) return 0
 return Number((Number(abates || 0) / q).toFixed(2))
}

export default function MVPTable({ data }: { data: MVPData[] }) {
 const params = useParams()
 const campeonatoId = (params?.id as string) || ''
 const [loading, setLoading] = useState(true)

 const [layout, setLayout] = useState<LayoutSettings>({
 primary_color: '#7cfc00',
 text_color: '#000000',
 header_bg_color: '#000000',
 header_text_color: '#ffffff',
 row_alt_bg: true,
 row_bg_primary: '#ffffff',
 row_bg_secondary: '#f9f9f9',
 border_width: 2,
 border_color: '#000000',
 row_height: 46,
 table_width: 100,
 column_widths: DEFAULT_COLUMN_WIDTHS,
 column_styles: {},
 row_bg_image_url: '',
 row_bg_image_opacity: 100,
 })

 const [rowsDb, setRowsDb] = useState<Row[]>([])
 const [editingNick, setEditingNick] = useState<Record<string, string>>({})
 const [savingKey, setSavingKey] = useState<string | null>(null)
 const [uploadingKey, setUploadingKey] = useState<string | null>(null)

 const normalizeNick = (nick: any) => String(nick || '').trim()
 const safeText = (v: any, fallback: string) => {
 const s = String(v || '').trim()
 return s ? s : fallback
 }

 const carregarLayout = useCallback(async () => {
 if (!campeonatoId) return
 try {
 const { data: config } = await supabase
 .from('campeonato_layout')
 .select('*')
 .eq('campeonato_id', campeonatoId)
 .maybeSingle()

 if (config) {
 setLayout((current) => ({
 ...current,
 ...(config as LayoutSettings),
 column_widths: { ...DEFAULT_COLUMN_WIDTHS, ...((config as any).column_widths || {}) },
 column_styles: ((config as any).column_styles || {}),
 }))
 }
 } catch (err) {
 console.error('Erro ao carregar layout MVP:', err)
 }
 }, [campeonatoId])

 const carregarMvpDb = useCallback(async () => {
 if (!campeonatoId) return

 setLoading(true)
 try {
 const { data: resultadosRaw, error: resultadosErr } = await supabase
 .from('resultados_mvp')
 .select(
 'jogador_campeonato_id, perfil_jogo_id, equipe_id, campeonato_equipe_id, equipe_avulsa_id, nick_snapshot, uid_jogo_snapshot, abates, partida_id'
 )
 .eq('campeonato_id', campeonatoId)

 if (resultadosErr) {
 console.error('Erro ao carregar resultados_mvp:', resultadosErr)
 setRowsDb([])
 return
 }

 const resultados = (resultadosRaw || []) as ResultadoMvpRow[]

 const jogadorCampeonatoIds = Array.from(
 new Set(resultados.map((r) => String(r?.jogador_campeonato_id || '').trim()).filter(Boolean))
 )

 const { data: jogadoresCampeonatoRows, error: jogadoresCampeonatoErr } =
 jogadorCampeonatoIds.length > 0
 ? await supabase
 .from('jogadores_campeonato')
 .select('id, perfil_jogo_id, equipe_id, campeonato_equipe_id, equipe_avulsa_id, jogador_avulso_id')
 .in('id', jogadorCampeonatoIds)
 : { data: [], error: null }

 if (jogadoresCampeonatoErr) {
 console.error('Erro ao carregar jogadores_campeonato do MVP:', jogadoresCampeonatoErr)
 }

 const jogadoresCampeonatoMap = new Map<string, JogadorCampeonatoRow>(
 ((jogadoresCampeonatoRows || []) as JogadorCampeonatoRow[]).map((row) => [String(row.id), row])
 )

 const perfilIds = Array.from(
 new Set(
 resultados
 .map((r) => {
 const jogador = r?.jogador_campeonato_id
 ? jogadoresCampeonatoMap.get(String(r.jogador_campeonato_id))
 : null
 return String(r?.perfil_jogo_id || jogador?.perfil_jogo_id || '').trim()
 })
 .filter(Boolean)
 )
 )

 const jogadorAvulsoIds = Array.from(
 new Set(
 (jogadoresCampeonatoRows || [])
 .map((r: any) => String(r?.jogador_avulso_id || '').trim())
 .filter(Boolean)
 )
 )

 const { data: jogadoresAvulsosRows, error: jogadoresAvulsosErr } =
 jogadorAvulsoIds.length > 0
 ? await supabase
 .from('jogadores_avulsos_campeonato')
 .select('id, nick, uid_jogo, foto_url, equipe_id, equipe_avulsa_id, funcao')
 .in('id', jogadorAvulsoIds)
 : { data: [], error: null }

 if (jogadoresAvulsosErr) {
 console.error('Erro ao carregar jogadores_avulsos_campeonato do MVP:', jogadoresAvulsosErr)
 }

 const jogadoresAvulsosMap = new Map<string, JogadorAvulsoRow>(
 ((jogadoresAvulsosRows || []) as JogadorAvulsoRow[]).map((row) => [String(row.id), row])
 )

 const uidAvulsos = Array.from(
 new Set(
 resultados
 .map((r) => {
 const jogador = r?.jogador_campeonato_id
 ? jogadoresCampeonatoMap.get(String(r.jogador_campeonato_id))
 : null
 const avulso = jogador?.jogador_avulso_id
 ? jogadoresAvulsosMap.get(String(jogador.jogador_avulso_id))
 : null
 const perfilId = String(r?.perfil_jogo_id || jogador?.perfil_jogo_id || '').trim()
 return perfilId ? '' : String(r?.uid_jogo_snapshot || avulso?.uid_jogo || '').trim()
 })
 .filter(Boolean)
 )
 )

 const { data: perfisPorUidRows, error: perfisPorUidErr } =
 uidAvulsos.length > 0
 ? await supabase.from('perfis_jogo').select('id, nick, uid_jogo, foto_capa, funcao').in('uid_jogo', uidAvulsos)
 : { data: [], error: null }

 if (perfisPorUidErr) {
 console.error('Erro ao buscar perfis_jogo por UID do MVP:', perfisPorUidErr)
 }

 const perfisPorUidMap = new Map<string, PerfilJogoRow>(
 ((perfisPorUidRows || []) as PerfilJogoRow[]).map((row) => [String(row.uid_jogo || '').trim(), row])
 )

 const equipeIds = Array.from(
 new Set(
 resultados
 .map((r) => {
 const jogador = r?.jogador_campeonato_id
 ? jogadoresCampeonatoMap.get(String(r.jogador_campeonato_id))
 : null
 const avulso = jogador?.jogador_avulso_id
 ? jogadoresAvulsosMap.get(String(jogador.jogador_avulso_id))
 : null
 return String(r?.equipe_id || jogador?.equipe_id || avulso?.equipe_id || '').trim()
 })
 .filter(Boolean)
 )
 )

 const equipeAvulsaIds = Array.from(
 new Set(
 resultados
 .map((r) => {
 const jogador = r?.jogador_campeonato_id
 ? jogadoresCampeonatoMap.get(String(r.jogador_campeonato_id))
 : null
 const avulso = jogador?.jogador_avulso_id
 ? jogadoresAvulsosMap.get(String(jogador.jogador_avulso_id))
 : null
 return String(r?.equipe_avulsa_id || jogador?.equipe_avulsa_id || avulso?.equipe_avulsa_id || '').trim()
 })
 .filter(Boolean)
 )
 )

 const [
 { data: perfisRows, error: perfisErr },
 { data: equipesRows, error: equipesErr },
 { data: equipesAvulsasRows, error: equipesAvulsasErr },
 ] = await Promise.all([
 perfilIds.length > 0
 ? supabase.from('perfis_jogo').select('id, nick, foto_capa, funcao').in('id', perfilIds)
 : Promise.resolve({ data: [], error: null }),
 equipeIds.length > 0
 ? supabase.from('equipes').select('id, nome, tag, logo_url, pais').in('id', equipeIds)
 : Promise.resolve({ data: [], error: null }),
 equipeAvulsaIds.length > 0
 ? supabase
 .from('equipes_avulsas_campeonato')
 .select('id, nome, tag, logo_url')
 .in('id', equipeAvulsaIds)
 : Promise.resolve({ data: [], error: null }),
 ])

 if (perfisErr) console.error('Erro ao carregar perfis_jogo do MVP:', perfisErr)
 if (equipesErr) console.error('Erro ao carregar equipes do MVP:', equipesErr)
 if (equipesAvulsasErr) {
 console.error('Erro ao carregar equipes_avulsas_campeonato do MVP:', equipesAvulsasErr)
 }

 const perfisMap = new Map<string, any>(
 ((perfisRows || []) as any[]).map((row) => [String(row.id), row])
 )
 const equipesMap = new Map<string, any>(
 ((equipesRows || []) as any[]).map((row) => [String(row.id), row])
 )
 const equipesAvulsasMap = new Map<string, any>(
 ((equipesAvulsasRows || []) as any[]).map((row) => [String(row.id), row])
 )

 const campeonatoEquipeIds = Array.from(
 new Set(
 resultados
 .map((r) => {
 const jogador = r?.jogador_campeonato_id
 ? jogadoresCampeonatoMap.get(String(r.jogador_campeonato_id))
 : null
 return String(r?.campeonato_equipe_id || jogador?.campeonato_equipe_id || r?.equipe_id || '').trim()
 })
 .filter(Boolean)
 )
 )

 const { data: campeonatoEquipesRows, error: campeonatoEquipesErr } =
 campeonatoEquipeIds.length > 0
 ? await supabase
 .from('campeonato_equipes')
 .select('id, equipe_id, equipe_avulsa_id, nome_exibicao, numero_vaga')
 .in('id', campeonatoEquipeIds)
 : { data: [], error: null }

 if (campeonatoEquipesErr) {
 console.error('Erro ao carregar campeonato_equipes do MVP:', campeonatoEquipesErr)
 }

 const campeonatoEquipesMap = new Map<string, any>(
 ((campeonatoEquipesRows || []) as any[]).map((row) => [String(row.id), row])
 )

 const acumuladoMap = new Map<
 string,
 {
 perfil_jogo_id: string | null
 equipe_id: string | null
 campeonato_equipe_id: string | null
 jogador_campeonato_id: string | null
 jogador_avulso_id: string | null
 uid_jogo: string | null
 perfil_sugerido_id: string | null
 perfil_sugerido_nick: string | null
 perfil_sugerido_avatar: string | null
 nome: string
 equipe: string
 tag: string
 pais: string
 funcao: string
 avatar_url: string | null
 equipe_avatar: string | null
 abates: number
 partidas: Set<string>
 }
 >()

 for (const row of resultados) {
 const jogadorCampeonatoId = String(row?.jogador_campeonato_id || '').trim() || null
 const jogadorCampeonato = jogadorCampeonatoId
 ? jogadoresCampeonatoMap.get(jogadorCampeonatoId)
 : null
 const jogadorAvulso = jogadorCampeonato?.jogador_avulso_id
 ? jogadoresAvulsosMap.get(String(jogadorCampeonato.jogador_avulso_id))
 : null

 const perfilId =
 String(row?.perfil_jogo_id || jogadorCampeonato?.perfil_jogo_id || '').trim() || null
 const jogadorAvulsoId = String(jogadorCampeonato?.jogador_avulso_id || '').trim() || null
 const uidJogo = String(row?.uid_jogo_snapshot || jogadorAvulso?.uid_jogo || '').trim() || null
 const perfilSugerido = !perfilId && uidJogo ? perfisPorUidMap.get(uidJogo) : null

 const campeonatoEquipeId =
 String(row?.campeonato_equipe_id || jogadorCampeonato?.campeonato_equipe_id || row?.equipe_id || '').trim() || null
 const campeonatoEquipe = campeonatoEquipeId ? campeonatoEquipesMap.get(campeonatoEquipeId) : null
 const equipeOficialId =
 String(campeonatoEquipe?.equipe_id || jogadorCampeonato?.equipe_id || jogadorAvulso?.equipe_id || '').trim() || null
 const equipeAvulsaId =
 String(campeonatoEquipe?.equipe_avulsa_id || row?.equipe_avulsa_id || jogadorCampeonato?.equipe_avulsa_id || jogadorAvulso?.equipe_avulsa_id || '').trim() || null
 const equipeId = campeonatoEquipeId || equipeOficialId || equipeAvulsaId || null

 const perfil = perfilId ? perfisMap.get(perfilId) : null
 const equipe = equipeOficialId ? equipesMap.get(equipeOficialId) : null
 const equipeAvulsa = equipeAvulsaId ? equipesAvulsasMap.get(equipeAvulsaId) : null

 const nome = safeText(
 row?.nick_snapshot,
 safeText(jogadorAvulso?.nick, safeText(perfil?.nick, 'SEM NICK'))
 )
 const equipeNome = safeText(campeonatoEquipe?.nome_exibicao || equipe?.nome || equipeAvulsa?.nome, 'SEM EQUIPE')
 const equipeTag = safeText(equipe?.tag || equipeAvulsa?.tag || equipeNome, equipeNome)
 const pais = safeText(equipe?.pais || jogadorAvulso?.pais, 'BR')
 const funcao = safeText(perfil?.funcao || jogadorAvulso?.funcao, 'SEM FUNÇÃO')
 const avatar =
 (perfil?.foto_capa as string | null) ||
 (jogadorAvulso?.foto_url as string | null) ||
 null
 const equipeAvatar =
 (equipe?.logo_url as string | null) || (equipeAvulsa?.logo_url as string | null) || null

 const chave =
 jogadorCampeonatoId ||
 `${perfilId || String(row?.uid_jogo_snapshot || '').trim() || nome}::${equipeId || 'sem-equipe'}`

 const atual = acumuladoMap.get(chave) || {
 perfil_jogo_id: perfilId,
 equipe_id: equipeId,
 campeonato_equipe_id: campeonatoEquipeId,
 jogador_campeonato_id: jogadorCampeonatoId,
 jogador_avulso_id: jogadorAvulsoId,
 uid_jogo: uidJogo,
 perfil_sugerido_id: perfilSugerido?.id || null,
 perfil_sugerido_nick: perfilSugerido?.nick || null,
 perfil_sugerido_avatar: perfilSugerido?.foto_capa || null,
 nome,
 equipe: equipeNome,
 tag: equipeTag,
 pais,
 funcao,
 avatar_url: avatar,
 equipe_avatar: equipeAvatar,
 abates: 0,
 partidas: new Set<string>(),
 }

 atual.abates += Number(row?.abates || 0)

 const partidaId = String(row?.partida_id || '').trim()
 if (partidaId) atual.partidas.add(partidaId)

 if (!atual.nome || atual.nome === 'SEM NICK') atual.nome = nome
 if (!atual.equipe || atual.equipe === 'SEM EQUIPE') atual.equipe = equipeNome
 if (!atual.tag || atual.tag === 'SEM EQUIPE') atual.tag = equipeTag
 if (!atual.pais || atual.pais === 'BR') atual.pais = pais
 if (!atual.funcao || atual.funcao === 'SEM FUNÇÃO') atual.funcao = funcao
 if (!atual.avatar_url && avatar) atual.avatar_url = avatar
 if (!atual.equipe_avatar && equipeAvatar) atual.equipe_avatar = equipeAvatar
 if (!atual.perfil_jogo_id && perfilId) atual.perfil_jogo_id = perfilId
 if (!atual.equipe_id && equipeId) atual.equipe_id = equipeId
 if (!atual.campeonato_equipe_id && campeonatoEquipeId) atual.campeonato_equipe_id = campeonatoEquipeId
 if (!atual.jogador_campeonato_id && jogadorCampeonatoId) {
 atual.jogador_campeonato_id = jogadorCampeonatoId
 }
 if (!atual.jogador_avulso_id && jogadorAvulsoId) atual.jogador_avulso_id = jogadorAvulsoId
 if (!atual.uid_jogo && uidJogo) atual.uid_jogo = uidJogo
 if (!atual.perfil_sugerido_id && perfilSugerido?.id) {
 atual.perfil_sugerido_id = perfilSugerido.id
 atual.perfil_sugerido_nick = perfilSugerido.nick || null
 atual.perfil_sugerido_avatar = perfilSugerido.foto_capa || null
 }

 acumuladoMap.set(chave, atual)
 }

 const arr: Row[] = Array.from(acumuladoMap.values())
 .map((item) => ({
 key: `${item.jogador_campeonato_id || item.perfil_jogo_id || item.nome}::${item.campeonato_equipe_id || item.equipe_id || 'sem-equipe'}`,
 nome: item.nome,
 equipe: item.equipe,
 tag: item.tag,
 pais: item.pais,
 funcao: item.funcao,
 abates: item.abates,
 quedas: item.partidas.size,
 kd: calcKd(item.abates, item.partidas.size),
 avatar_url: item.avatar_url,
 equipe_avatar: item.equipe_avatar,
 perfil_jogo_id: item.perfil_jogo_id,
 equipe_id: item.equipe_id,
 campeonato_equipe_id: item.campeonato_equipe_id,
 jogador_campeonato_id: item.jogador_campeonato_id,
 jogador_avulso_id: item.jogador_avulso_id,
 uid_jogo: item.uid_jogo,
 perfil_sugerido_id: item.perfil_sugerido_id,
 perfil_sugerido_nick: item.perfil_sugerido_nick,
 perfil_sugerido_avatar: item.perfil_sugerido_avatar,
 }))
 .sort((a, b) => b.abates - a.abates || b.kd - a.kd || b.quedas - a.quedas || a.nome.localeCompare(b.nome))

 setRowsDb(arr)
 } finally {
 setLoading(false)
 }
 }, [campeonatoId])

 useEffect(() => {
 if (!campeonatoId) return
 ;(async () => {
 await carregarLayout()
 await carregarMvpDb()
 })()
 }, [campeonatoId, carregarLayout, carregarMvpDb])

 const rowsFromProps = useMemo<Row[]>(() => {
 const arr =
 (data || []).map((item) => {
 const nome = normalizeNick(item.nick ?? item.nome_jogador ?? '-')
 const equipe = safeText(item.equipe_nome_display ?? item.equipe_nome, 'SEM EQUIPE')
 const abates = Number(item.abates ?? item.total_abates ?? 0)
 const quedas = Number(item.quedas ?? 0)
 const perfilId = item.perfil_jogo_id ? String(item.perfil_jogo_id) : null
 const equipeId = item.equipe_id ? String(item.equipe_id) : null

 const key = `${perfilId || nome}::${equipeId || equipe || 'sem-equipe'}`
 return {
 key,
 nome,
 equipe,
 tag: safeText(item.equipe_tag || equipe, equipe),
 pais: safeText(item.pais, 'BR'),
 funcao: safeText(item.funcao, 'SEM FUNÇÃO'),
 abates,
 quedas,
 kd: Number(item.kd ?? calcKd(abates, quedas)),
 avatar_url: item.avatar_url ?? null,
 equipe_avatar: item.equipe_avatar ?? null,
 perfil_jogo_id: perfilId,
 equipe_id: equipeId,
 jogador_campeonato_id: null,
          campeonato_equipe_id: null,
 jogador_avulso_id: null,
 uid_jogo: item.game_id_raw || null,
 perfil_sugerido_id: null,
 perfil_sugerido_nick: null,
 perfil_sugerido_avatar: null,
 }
 }) || []

 arr.sort((a, b) => b.abates - a.abates || b.kd - a.kd || b.quedas - a.quedas || a.nome.localeCompare(b.nome))
 return arr
 }, [data])

 const rows = campeonatoId ? rowsDb : rowsFromProps

 const atualizarLinhaLocal = (key: string, patch: Partial<Row>) => {
 setRowsDb((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
 }

 const salvarNickAvulso = async (item: Row) => {
 if (!item.jogador_avulso_id) return
 const novoNick = String(editingNick[item.key] ?? item.nome).trim()
 if (!novoNick) {
 window.alert('Informe o nick do jogador.')
 return
 }

 setSavingKey(item.key)
 try {
 const response = await fetch('/api/campeonatos/mvp-avulso', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 campeonatoId,
 jogadorAvulsoId: item.jogador_avulso_id,
 jogadorCampeonatoId: item.jogador_campeonato_id,
 uidJogo: item.uid_jogo,
 nick: novoNick,
 }),
 })
 const result = await response.json().catch(() => null)
 if (!response.ok || !result?.ok) {
 throw new Error(result?.error || 'Nao foi possivel salvar o nick.')
 }

 setEditingNick((prev) => {
 const next = { ...prev }
 delete next[item.key]
 return next
 })
 atualizarLinhaLocal(item.key, { nome: novoNick })
 } catch (error: any) {
 window.alert(`Erro ao salvar nick: ${error?.message || error}`)
 } finally {
 setSavingKey(null)
 }
 }

 const trocarFotoAvulso = async (item: Row, input: HTMLInputElement) => {
 const file = input.files?.[0]
 if (!file || !item.jogador_avulso_id) return

 setUploadingKey(item.key)
 try {
 const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
 const fileName = `${campeonatoId}/mvp-avulsos/${item.jogador_avulso_id}-${Date.now()}.${ext}`
 const { error: uploadError } = await supabase.storage.from(BUCKET_AVATAR_JOGADOR).upload(fileName, file, {
 upsert: true,
 cacheControl: '3600',
 contentType: file.type || undefined,
 })
 if (uploadError) throw uploadError

 const {
 data: { publicUrl },
 } = supabase.storage.from(BUCKET_AVATAR_JOGADOR).getPublicUrl(fileName)

 const response = await fetch('/api/campeonatos/mvp-avulso', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 campeonatoId,
 jogadorAvulsoId: item.jogador_avulso_id,
 jogadorCampeonatoId: item.jogador_campeonato_id,
 uidJogo: item.uid_jogo,
 fotoUrl: publicUrl,
 }),
 })
 const result = await response.json().catch(() => null)
 if (!response.ok || !result?.ok) {
 throw new Error(result?.error || 'Nao foi possivel salvar a foto.')
 }

 atualizarLinhaLocal(item.key, { avatar_url: publicUrl })
 } catch (error: any) {
 window.alert(`Erro ao trocar foto: ${error?.message || error}`)
 } finally {
 setUploadingKey(null)
 input.value = ''
 }
 }

 const trocarAvulsoPorPerfil = async (item: Row) => {
 if (!item.perfil_sugerido_id) return
 if (!item.jogador_campeonato_id) {
 window.alert('Esse MVP não tem vínculo de jogador do campeonato para trocar automaticamente.')
 return
 }

 setSavingKey(item.key)
 try {
 const { error: jogadorError } = await supabase
 .from('jogadores_campeonato')
 .update({ perfil_jogo_id: item.perfil_sugerido_id, jogador_avulso_id: null })
 .eq('id', item.jogador_campeonato_id)
 if (jogadorError) throw jogadorError

 const { error: mvpError } = await supabase
 .from('resultados_mvp')
 .update({
 perfil_jogo_id: item.perfil_sugerido_id,
 nick_snapshot: item.perfil_sugerido_nick || item.nome,
 })
 .eq('campeonato_id', campeonatoId)
 .eq('jogador_campeonato_id', item.jogador_campeonato_id)
 if (mvpError) throw mvpError

 await carregarMvpDb()
 } catch (error: any) {
 window.alert(`Erro ao trocar pelo perfil de jogo: ${error?.message || error}`)
 } finally {
 setSavingKey(null)
 }
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center p-12">
 <Loader2 className="animate-spin text-zinc-500" />
 </div>
 )
 }

 const topMvp = null

 return (
 <div className="w-full animate-in fade-in duration-500">
 <div className="mx-auto max-w-6xl">
 {topMvp ? (
 <aside
 className="hidden self-start overflow-hidden border bg-white xl:flex xl:flex-col"
 style={{
 borderColor: `${layout.border_color}33`,
 boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
 }}
 >
 <div className="p-4 text-black" style={{ backgroundColor: layout.primary_color }}>
 <div className="text-[9px] font-black uppercase tracking-[0.24em] opacity-70">Top 1</div>
 <div className="mt-1 text-xl font-black uppercase leading-none">MVP</div>
 </div>

 <div className="flex flex-1 flex-col items-center justify-center px-5 py-6 text-center">
 <div className="relative h-28 w-28">
 <div className="flex h-28 w-28 items-center justify-center overflow-hidden border border-zinc-200 bg-zinc-50">
 <img src={topMvp.avatar_url || '/placeholder.png'} alt="" className="h-full w-full object-cover" />
 </div>
 {topMvp.equipe_avatar ? (
 <div className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center overflow-hidden p-1">
 <img src={topMvp.equipe_avatar} alt="" className="h-full w-full object-contain" />
 </div>
 ) : null}
 </div>
 <div className="mt-6 text-lg font-black uppercase leading-tight text-[#142340]">{topMvp.nome}</div>
 <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{topMvp.equipe}</div>
 </div>

 <div className="grid grid-cols-2 border-t border-zinc-200 text-center">
 <MvpTopStat label="Kills" value={topMvp.abates} highlight color={layout.primary_color} />
 <MvpTopStat label="K.D" value={Number(topMvp.kd || 0).toFixed(2)} />
 <MvpTopStat label="Quedas" value={topMvp.quedas} />
 <MvpTopStat label="Função" value={getFuncaoIcone(topMvp.funcao)} />
 </div>
 </aside>
 ) : null}
 <div
 className="overflow-x-auto rounded-sm border border-zinc-200 bg-white shadow-sm"
 style={{
 border: `1px solid ${layout.border_color}22`,
 boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
 backgroundColor: layout.row_bg_primary,
 width: 'fit-content',
 maxWidth: '100%',
 marginInline: 'auto',
 }}
 >
 <table className="table-fixed border-collapse" style={{ width: getTablePixelWidth(layout), minWidth: getTablePixelWidth(layout) }}>
 <thead>
 <tr
 className="font-medium uppercase"
 style={{ backgroundColor: layout.header_bg_color, color: layout.header_text_color }}
 >
 <th className="px-1 py-1.5 text-center text-[8px] sm:px-3 sm:py-3 sm:text-[10px]" style={getColumnStyle(layout, 'pos', { width: getColumnWidth(layout, 'pos', 52) })}>Rank</th>
 <th className="px-1 py-1.5 text-center text-[8px] sm:px-3 sm:py-3 sm:text-[10px]" style={getColumnStyle(layout, 'logo', { width: getColumnWidth(layout, 'logo', 72) })}>Logo</th>
 <th className="w-[50%] px-1 py-1.5 text-left text-[8px] sm:px-3 sm:py-3 sm:text-[10px]" style={getColumnStyle(layout, 'equipe', { width: getColumnWidth(layout, 'equipe', 360) })}>Nick</th>
 <th className="w-[17%] px-0.5 py-1.5 text-center text-[8px] sm:px-3 sm:py-3 sm:text-[10px]" style={getColumnStyle(layout, 'booyah', { width: getColumnWidth(layout, 'booyah', 56) })}>Quedas</th>
 <th className="px-3 py-3 text-center text-[10px]" style={getColumnStyle(layout, 'kill', { width: getColumnWidth(layout, 'kill', 70) })}>K.D</th>
 <th
 className="w-[17%] px-0.5 py-1.5 text-center text-[8px] sm:px-3 sm:py-3 sm:text-[10px]"
 style={getColumnStyle(layout, 'total', {
 width: getColumnWidth(layout, 'total', 96),
 backgroundColor: layout.primary_color,
 color: layout.text_color,
 borderLeft: `1px solid ${layout.border_color}22`,
 })}
 >
 Kill
 </th>
 </tr>
 </thead>

 <tbody style={{ color: layout.text_color }}>
 {rows.length === 0 && (
 <tr>
 <td
 colSpan={6}
 className="text-center text-[10px] font-semibold uppercase"
 style={{
 backgroundColor: layout.row_bg_secondary,
 color: layout.text_color,
 height: 70,
 }}
 >
 SEM DADOS DE MVP.
 </td>
 </tr>
 )}

 {rows.map((item, index) => {
 const isEven = index % 2 === 0
 const rowBg = layout.row_alt_bg
 ? isEven
 ? layout.row_bg_primary
 : layout.row_bg_secondary
 : layout.row_bg_primary

 return (
 <tr
 key={item.key}
 className="h-9 border-b sm:h-[var(--mvp-row-height)]"
 style={{
 ...rowBackgroundStyle(layout, rowBg),
 '--mvp-row-height': `${layout.row_height}px`,
 borderColor: `${layout.border_color}22`,
 } as React.CSSProperties}
 >
<td className="px-1 text-center text-[9px] font-semibold sm:px-3 sm:text-[13px]" style={getColumnStyle(layout, 'pos', { color: layout.primary_color })}>
 {index + 1}º
 </td>

<td className="px-1 text-center sm:px-3" style={getColumnStyle(layout, 'logo')}>
<div className="mx-auto flex h-6 w-6 items-center justify-center overflow-hidden rounded-full sm:h-9 sm:w-9">
 <img
 src={item.equipe_avatar || '/placeholder.png'}
 className="h-full w-full object-cover"
 alt=""
 />
 </div>
 </td>

<td className="px-1 text-left text-[9px] font-medium uppercase sm:px-3 sm:text-[12px] sm:font-semibold" style={getColumnStyle(layout, 'equipe')}>
<span className="block min-w-0 truncate sm:hidden">{item.nome}</span>
<div className="hidden min-w-0 sm:block">
 {item.jogador_avulso_id ? (
 <div className="space-y-1">
 <div className="flex min-w-0 items-center gap-2">
 <input
 value={editingNick[item.key] ?? item.nome}
 onChange={(event) => setEditingNick((prev) => ({ ...prev, [item.key]: event.target.value }))}
 className="min-w-0 flex-1 border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase outline-none focus:border-blue-500"
 aria-label={`Editar nick de ${item.nome}`}
 />
 <button
 type="button"
 onClick={() => salvarNickAvulso(item)}
 disabled={savingKey === item.key}
 className="inline-flex h-7 w-7 items-center justify-center bg-blue-600 text-white disabled:opacity-60"
 title="Salvar nick do jogador avulso"
 >
 {savingKey === item.key ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
 </button>
 </div>
 <div className="flex flex-wrap items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.06em]">
 {item.uid_jogo ? (
 <span className="border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-blue-700">ID: {item.uid_jogo}</span>
 ) : null}
 </div>
 {item.perfil_sugerido_id ? (
 <div className="flex flex-wrap items-center gap-2 border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-amber-800">
 <span className="inline-flex items-center gap-1">
 <AlertTriangle size={11} />
 Perfil encontrado: {item.perfil_sugerido_nick || 'perfil de jogo'}
 </span>
 <button
 type="button"
 onClick={() => trocarAvulsoPorPerfil(item)}
 disabled={savingKey === item.key}
 className="inline-flex items-center gap-1 border border-amber-300 bg-white px-2 py-0.5 text-[8px] font-bold text-amber-900 disabled:opacity-60"
 title="Trocar jogador avulso pelo perfil de jogo cadastrado"
 >
 <UserCheck size={10} />
 Usar perfil
 </button>
 </div>
 ) : null}
 </div>
 ) : (
 <span className="block min-w-0 truncate sm:max-w-[240px]">{item.nome}</span>
 )}
</div>
 </td>

<td className="px-0.5 text-center text-[9px] font-semibold sm:px-3 sm:text-[13px]" style={getColumnStyle(layout, 'booyah', { color: layout.primary_color })}>
 {item.quedas || 0}
 </td>

<td className="px-0.5 text-center text-[9px] font-semibold text-[#2563eb] sm:px-3 sm:text-[13px]" style={getColumnStyle(layout, 'kill')}>
 {Number(item.kd || 0).toFixed(2)}
 </td>

 <td
className="px-0.5 text-center text-[9px] font-semibold sm:px-3 sm:text-[14px]"
 style={getColumnStyle(layout, 'total', {
 color: layout.primary_color,
 borderLeft: `1px solid ${layout.border_color}22`,
 })}
 >
 {item.abates}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 </div>

 <div className="mt-3 text-[8px] font-semibold uppercase text-zinc-500">
 * Ranking MVP agregado diretamente da tabela resultados_mvp.
 </div>
 </div>
 )
}

function MvpTopStat({ label, value, highlight = false, color = '#7cfc00' }: { label: string; value: string | number; highlight?: boolean; color?: string }) {
 return (
 <div className="border-r border-b border-zinc-200 p-3 last:border-r-0" style={highlight ? { backgroundColor: `${color}33` } : undefined}>
 <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
 <div className="mt-1 text-xl font-black text-[#142340]">{value}</div>
 </div>
 )
}

