import type { SupabaseClient } from '@supabase/supabase-js'

export type CompetitiveHistory = {
  campeonatoId: string
  nome: string
  posicao: number | null
  pontos: number
  kills: number
  booyahs: number
  partidas: number
}

export type EvolutionComparison = {
  label: string
  days: number
  currentKills: number
  previousKills: number
  currentMatches: number
  previousMatches: number
  killsChange: number
}

export type EvolutionPoint = {
  label: string
  kills: number
  matches: number
}

export type CompetitiveStats = {
  tier: string
  rankingPosicao: number | null
  score: number
  campeonatos: number
  finais: number
  titulos: number
  podios: number
  partidas: number
  booyahs: number
  kills: number
  mediaKills: number
  mediaPosicao: number
  taxaTitulos: number
  historico: CompetitiveHistory[]
  comparativos: EvolutionComparison[]
  evolucao: EvolutionPoint[]
}

const emptyStats: CompetitiveStats = {
  tier: 'E',
  rankingPosicao: null,
  score: 0,
  campeonatos: 0,
  finais: 0,
  titulos: 0,
  podios: 0,
  partidas: 0,
  booyahs: 0,
  kills: 0,
  mediaKills: 0,
  mediaPosicao: 0,
  taxaTitulos: 0,
  historico: [],
  comparativos: [],
  evolucao: []
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function buildEvolution(rows: Array<{ created_at?: string | null; abates?: number | null; id?: string | null }>) {
  const now = new Date()
  const valid = rows
    .map((row) => ({ ...row, date: new Date(String(row.created_at || '')) }))
    .filter((row) => !Number.isNaN(row.date.getTime()))

  const comparisons = [
    { label: 'Semanal', days: 7 },
    { label: 'Mensal', days: 30 },
    { label: '90 dias', days: 90 }
  ].map(({ label, days }) => {
    const currentStart = new Date(now)
    currentStart.setDate(now.getDate() - days)
    const previousStart = new Date(now)
    previousStart.setDate(now.getDate() - days * 2)
    const current = valid.filter((row) => row.date >= currentStart && row.date <= now)
    const previous = valid.filter((row) => row.date >= previousStart && row.date < currentStart)
    const currentKills = current.reduce((sum, row) => sum + Number(row.abates || 0), 0)
    const previousKills = previous.reduce((sum, row) => sum + Number(row.abates || 0), 0)
    return {
      label,
      days,
      currentKills,
      previousKills,
      currentMatches: current.length,
      previousMatches: previous.length,
      killsChange: previousKills ? ((currentKills - previousKills) / previousKills) * 100 : currentKills ? 100 : 0
    }
  })

  const evolution = Array.from({ length: 8 }, (_, index) => {
    const end = new Date(now)
    end.setDate(now.getDate() - (7 - index) * 7)
    const start = new Date(end)
    start.setDate(end.getDate() - 7)
    const period = valid.filter((row) => row.date >= start && row.date < end)
    return {
      label: `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`,
      kills: period.reduce((sum, row) => sum + Number(row.abates || 0), 0),
      matches: period.length
    }
  })

  return { comparativos: comparisons, evolucao: evolution }
}

async function calculateHistory(
  client: SupabaseClient,
  championshipIds: string[],
  targetEntryIds: Set<string>,
  championshipNames: Map<string, string>
) {
  if (!championshipIds.length || !targetEntryIds.size) return { ...emptyStats, campeonatos: championshipIds.length }

  const [{ data: participants }, { data: results }] = await Promise.all([
    client
      .from('campeonato_equipes')
      .select('id,campeonato_id,equipe_id,equipe_avulsa_id,line_id')
      .in('campeonato_id', championshipIds),
    client
      .from('resultados_jogos')
      .select('id,campeonato_id,equipe_id,jogo_id,mapa,posicao,abates,total_pontos,created_at')
      .in('campeonato_id', championshipIds)
  ])

  const participantIds = new Set((participants || []).map((row: any) => String(row.id || '')).filter(Boolean))
  const publicToEntry = new Map<string, string>()
  ;(participants || []).forEach((row: any) => {
    ;[row.equipe_id, row.equipe_avulsa_id, row.line_id].forEach((id) => {
      const publicId = String(id || '').trim()
      const key = `${String(row.campeonato_id || '')}:${publicId}`
      if (publicId && !publicToEntry.has(key)) publicToEntry.set(key, String(row.id))
    })
  })

  const accumulated = new Map<string, { campeonatoId: string; entryId: string; partidas: Set<string>; booyahs: number; kills: number; pontos: number; somaPosicoes: number; posicoes: number }>()
  ;(results || []).forEach((row: any) => {
    const campeonatoId = String(row.campeonato_id || '').trim()
    const rawTeamId = String(row.equipe_id || '').trim()
    const entryId = participantIds.has(rawTeamId) ? rawTeamId : publicToEntry.get(`${campeonatoId}:${rawTeamId}`) || ''
    if (!campeonatoId || !entryId) return
    const key = `${campeonatoId}:${entryId}`
    const current = accumulated.get(key) || { campeonatoId, entryId, partidas: new Set<string>(), booyahs: 0, kills: 0, pontos: 0, somaPosicoes: 0, posicoes: 0 }
    const posicao = Number(row.posicao || 0)
    current.partidas.add(String(row.id || `${row.jogo_id || ''}:${row.mapa || ''}:${entryId}`))
    current.booyahs += posicao === 1 ? 1 : 0
    current.kills += Number(row.abates || 0)
    current.pontos += Number(row.total_pontos || 0)
    if (posicao > 0) {
      current.somaPosicoes += posicao
      current.posicoes += 1
    }
    accumulated.set(key, current)
  })

  const historico: CompetitiveHistory[] = []
  let partidas = 0
  let booyahs = 0
  let kills = 0
  let somaPosicoes = 0
  let posicoes = 0

  championshipIds.forEach((campeonatoId) => {
    const ranking = Array.from(accumulated.values())
      .filter((row) => row.campeonatoId === campeonatoId)
      .sort((a, b) => b.pontos - a.pontos || b.kills - a.kills || b.booyahs - a.booyahs)
    const target = ranking.find((row) => targetEntryIds.has(row.entryId))
    if (!target) return
    const posicao = ranking.findIndex((row) => row.entryId === target.entryId) + 1
    const matchCount = target.partidas.size
    partidas += matchCount
    booyahs += target.booyahs
    kills += target.kills
    somaPosicoes += target.somaPosicoes
    posicoes += target.posicoes
    historico.push({
      campeonatoId,
      nome: championshipNames.get(campeonatoId) || 'Campeonato',
      posicao: posicao || null,
      pontos: target.pontos,
      kills: target.kills,
      booyahs: target.booyahs,
      partidas: matchCount
    })
  })

  const titulos = historico.filter((row) => row.posicao === 1).length
  const finais = historico.length
  const targetResults = (results || []).filter((row: any) => {
    const rawTeamId = String(row.equipe_id || '').trim()
    const entryId = participantIds.has(rawTeamId) ? rawTeamId : publicToEntry.get(`${String(row.campeonato_id || '')}:${rawTeamId}`) || ''
    return targetEntryIds.has(entryId)
  })
  return {
    ...emptyStats,
    campeonatos: championshipIds.length,
    finais,
    titulos,
    podios: historico.filter((row) => Number(row.posicao || 0) > 0 && Number(row.posicao || 0) <= 3).length,
    partidas,
    booyahs,
    kills,
    mediaKills: partidas ? kills / partidas : 0,
    mediaPosicao: posicoes ? somaPosicoes / posicoes : 0,
    taxaTitulos: finais ? (titulos / finais) * 100 : 0,
    historico: historico.sort((a, b) => Number(a.posicao || 999) - Number(b.posicao || 999)),
    ...buildEvolution(targetResults)
  }
}

export async function loadTeamCompetitiveStats(client: SupabaseClient, teamId: string): Promise<CompetitiveStats> {
  const [{ data: entries }, { data: ranking }] = await Promise.all([
    client
      .from('campeonato_equipes')
      .select('id,campeonato_id,status,campeonatos(id,nome)')
      .eq('equipe_id', teamId),
    client
      .from('vw_lealt_ranking_equipes')
      .select('posicao,tier,score_total,campeonatos_jogados,titulos,finais,booyahs,partidas,abates')
      .eq('equipe_id', teamId)
      .maybeSingle()
  ])
  const valid = (entries || []).filter((row: any) => !['cancelada', 'cancelado'].includes(String(row.status || '').toLowerCase()))
  const championshipIds = Array.from(new Set(valid.map((row: any) => String(row.campeonato_id || '')).filter(Boolean)))
  const names = new Map<string, string>()
  valid.forEach((row: any) => names.set(String(row.campeonato_id), first<any>(row.campeonatos)?.nome || 'Campeonato'))
  const stats = await calculateHistory(client, championshipIds, new Set(valid.map((row: any) => String(row.id))), names)
  const officialMatches = Number((ranking as any)?.partidas || 0)
  const officialKills = Number((ranking as any)?.abates || 0)
  const officialFinals = Number((ranking as any)?.finais || 0)
  const officialTitles = Number((ranking as any)?.titulos || 0)
  return {
    ...stats,
    tier: String((ranking as any)?.tier || 'E'),
    rankingPosicao: Number((ranking as any)?.posicao || 0) || null,
    score: Number((ranking as any)?.score_total || 0),
    campeonatos: Math.max(stats.campeonatos, Number((ranking as any)?.campeonatos_jogados || 0)),
    finais: Math.max(stats.finais, officialFinals),
    titulos: Math.max(stats.titulos, officialTitles),
    booyahs: Math.max(stats.booyahs, Number((ranking as any)?.booyahs || 0)),
    partidas: Math.max(stats.partidas, officialMatches),
    kills: Math.max(stats.kills, officialKills),
    mediaKills: officialMatches ? officialKills / officialMatches : stats.mediaKills,
    taxaTitulos: officialFinals ? (officialTitles / officialFinals) * 100 : stats.taxaTitulos
  }
}

export async function loadPlayerCompetitiveStats(client: SupabaseClient, profileId: string): Promise<CompetitiveStats> {
  const [{ data: links }, { data: ranking }, { data: playerResults }] = await Promise.all([
    client
      .from('jogadores_campeonato')
      .select('id,campeonato_id,campeonato_equipe_id,equipe_id,equipe_avulsa_id,status,campeonatos(id,nome)')
      .eq('perfil_jogo_id', profileId)
      .neq('status', 'removido'),
    client
      .from('vw_lealt_ranking_jogadores')
      .select('posicao,tier,score_total,campeonatos_jogados,jogos_disputados,partidas_registradas,abates,media_abates')
      .eq('perfil_jogo_id', profileId)
      .maybeSingle(),
    client
      .from('resultados_mvp')
      .select('id,abates,created_at')
      .eq('perfil_jogo_id', profileId)
  ])

  const championshipIds = Array.from(new Set((links || []).map((row: any) => String(row.campeonato_id || '')).filter(Boolean)))
  const names = new Map<string, string>()
  ;(links || []).forEach((row: any) => names.set(String(row.campeonato_id), first<any>(row.campeonatos)?.nome || 'Campeonato'))

  const directEntryIds = new Set((links || []).map((row: any) => String(row.campeonato_equipe_id || '')).filter(Boolean))
  const missing = (links || []).filter((row: any) => !row.campeonato_equipe_id)
  if (missing.length && championshipIds.length) {
    const { data: entries } = await client
      .from('campeonato_equipes')
      .select('id,campeonato_id,equipe_id,equipe_avulsa_id')
      .in('campeonato_id', championshipIds)
    ;(entries || []).forEach((entry: any) => {
      if (missing.some((link: any) => String(link.campeonato_id) === String(entry.campeonato_id) && (String(link.equipe_id || '') === String(entry.equipe_id || '') || String(link.equipe_avulsa_id || '') === String(entry.equipe_avulsa_id || '')))) {
        directEntryIds.add(String(entry.id))
      }
    })
  }

  const stats = await calculateHistory(client, championshipIds, directEntryIds, names)
  const officialKills = Number((ranking as any)?.abates || 0)
  const officialMatches = Number((ranking as any)?.partidas_registradas || (ranking as any)?.jogos_disputados || 0)
  const evolution = buildEvolution((playerResults || []) as any[])
  return {
    ...stats,
    tier: String((ranking as any)?.tier || 'E'),
    rankingPosicao: Number((ranking as any)?.posicao || 0) || null,
    score: Number((ranking as any)?.score_total || 0),
    campeonatos: Math.max(stats.campeonatos, Number((ranking as any)?.campeonatos_jogados || 0)),
    partidas: Math.max(stats.partidas, officialMatches),
    kills: Math.max(stats.kills, officialKills),
    mediaKills: Number((ranking as any)?.media_abates || 0) || (officialMatches ? officialKills / officialMatches : stats.mediaKills),
    ...evolution
  }
}
