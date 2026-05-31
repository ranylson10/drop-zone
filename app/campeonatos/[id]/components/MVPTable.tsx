'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

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
 })

 const [rowsDb, setRowsDb] = useState<Row[]>([])

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

 if (config) setLayout(config as LayoutSettings)
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
 }
 }) || []

 arr.sort((a, b) => b.abates - a.abates || b.kd - a.kd || b.quedas - a.quedas || a.nome.localeCompare(b.nome))
 return arr
 }, [data])

 const rows = campeonatoId ? rowsDb : rowsFromProps

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
 <div className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center overflow-hidden border border-zinc-200 bg-white p-1">
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
 className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
 style={{
 border: `1px solid ${layout.border_color}22`,
 boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
 backgroundColor: layout.row_bg_primary,
 }}
 >
 <table className="w-full border-collapse">
 <thead>
 <tr
 className="font-medium uppercase"
 style={{ backgroundColor: layout.header_bg_color, color: layout.header_text_color }}
 >
 <th className="w-16 px-3 py-3 text-center text-[10px]">Rank</th>
 <th className="w-20 px-3 py-3 text-center text-[10px]">Logo</th>
 <th className="w-20 px-3 py-3 text-center text-[10px]">Foto</th>
 <th className="w-28 px-3 py-3 text-center text-[10px]">Tag</th>
 <th className="px-3 py-3 text-left text-[10px]">Nick</th>
 <th className="w-24 px-3 py-3 text-center text-[10px]">Bandeira</th>
 <th className="w-24 px-3 py-3 text-center text-[10px]">Função</th>
 <th className="w-24 px-3 py-3 text-center text-[10px]">Quedas</th>
 <th className="w-24 px-3 py-3 text-center text-[10px]">K.D</th>
 <th
 className="w-24 px-3 py-3 text-center text-[10px]"
 style={{
 backgroundColor: layout.primary_color,
 color: layout.text_color,
 borderLeft: `1px solid ${layout.border_color}22`,
 }}
 >
 Kill
 </th>
 </tr>
 </thead>

 <tbody style={{ color: layout.text_color }}>
 {rows.length === 0 && (
 <tr>
 <td
 colSpan={10}
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
 className="border-b"
 style={{
 backgroundColor: rowBg,
 height: `${layout.row_height}px`,
 borderColor: `${layout.border_color}22`,
 }}
 >
 <td className="px-3 text-center text-[13px] font-semibold" style={{ color: layout.primary_color }}>
 {index + 1}º
 </td>

 <td className="px-3 text-center">
 <div className="mx-auto flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white">
 <img
 src={item.equipe_avatar || '/placeholder.png'}
 className="h-full w-full object-cover"
 alt=""
 />
 </div>
 </td>

 <td className="px-3 text-center">
 <div className="mx-auto flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white">
 <img
 src={item.avatar_url || '/placeholder.png'}
 className="h-full w-full object-cover"
 alt=""
 />
 </div>
 </td>

 <td className="px-3 text-center text-[11px] font-semibold uppercase">
 {item.tag}
 </td>

 <td className="px-3 text-left text-[12px] font-semibold uppercase">
 <span className="block max-w-[240px] truncate">{item.nome}</span>
 </td>

 <td className="px-3 text-center">
 {flagUrlFromPais(item.pais) ? (
 <img src={flagUrlFromPais(item.pais)} alt={paisIso(item.pais) || flagFromPais(item.pais)} className="mx-auto h-4 w-6 rounded-[2px] object-cover" />
 ) : (
 <span className="text-[10px] font-medium uppercase text-zinc-500">{flagFromPais(item.pais)}</span>
 )}
 </td>

 <td className="px-3 text-center">
 <span
 className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[13px] font-semibold"
 style={{
 borderColor: layout.primary_color,
 color: layout.primary_color,
 }}
 title={item.funcao}
 >
 {getFuncaoIcone(item.funcao)}
 </span>
 </td>

 <td className="px-3 text-center text-[13px] font-semibold" style={{ color: layout.primary_color }}>
 {item.quedas || 0}
 </td>

 <td className="px-3 text-center text-[13px] font-semibold text-[#2563eb]">
 {Number(item.kd || 0).toFixed(2)}
 </td>

 <td
 className="px-3 text-center text-[14px] font-semibold"
 style={{
 color: layout.primary_color,
 borderLeft: `1px solid ${layout.border_color}22`,
 }}
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
