'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import MessageShortcut from '@/app/components/chat/MessageShortcut'
import RankingTierBadge, { formatScore } from '@/app/components/RankingTierBadge'
import {
  BarChart3,
  Clock3,
  Crosshair,
  Gamepad2,
  Loader2,
  Medal,
  Monitor,
  Search,
  Shield,
  Smartphone,
  Trophy,
  UserCircle2,
  Users,
  Zap,
} from 'lucide-react'

type JogadorRow = {
  id: string
  user_id?: string | null
  nick: string | null
  uid_jogo: string | null
  servidor: string | null
  funcao: string | null
  plataforma: 'mobile' | 'emulador' | null
  foto_capa: string | null
  equipe_id: string | null
  created_at?: string | null
  equipes?:
    | {
        id: string
        nome: string | null
        tag: string | null
        logo_url: string | null
      }
    | { id: string; nome: string | null; tag: string | null; logo_url: string | null }[]
    | null
  rank_score?: number
  rank_posicao?: number
  score_bruto?: number
  tier?: string | null
  score_total?: number | null
}

function normalizarEquipe(equipe: JogadorRow['equipes']) {
  if (!equipe) return null
  return Array.isArray(equipe) ? equipe[0] || null : equipe
}

function getRoleIcon(role: string | null) {
  switch ((role || '').toLowerCase()) {
    case 'sniper':
      return <Crosshair size={14} className="text-red-500" />
    case 'suporte':
      return <Shield size={14} className="text-blue-500" />
    case 'granadeiro':
      return <Zap size={14} className="text-yellow-500" />
    default:
      return <Users size={14} className="text-[#2563eb]" />
  }
}

function getPlatformLabel(plataforma: string | null) {
  if (plataforma === 'mobile') return 'Mobile'
  if (plataforma === 'emulador') return 'Emulador'
  return 'N/I'
}

function getPlatformIcon(plataforma: string | null) {
  if (plataforma === 'mobile') return <Smartphone size={13} className="text-[#2563eb]" />
  if (plataforma === 'emulador') return <Monitor size={13} className="text-[#2563eb]" />
  return <Gamepad2 size={13} className="text-[#2563eb]" />
}

function calcularScoreJogador(jogador: JogadorRow) {
  const equipe = normalizarEquipe(jogador.equipes)

  let score = 0
  if (jogador.nick) score += 20
  if (jogador.uid_jogo) score += 15
  if (jogador.plataforma) score += 15
  if (jogador.funcao) score += 15
  if (jogador.servidor) score += 10
  if (jogador.foto_capa) score += 10
  if (equipe?.id) score += 15

  return score
}

function medalha(posicao?: number) {
  if (posicao === 1) return '🥇'
  if (posicao === 2) return '🥈'
  if (posicao === 3) return '🥉'
  return posicao || '-'
}

function dataCurta(data?: string | null) {
  if (!data) return 'N/I'
  return new Date(data).toLocaleDateString('pt-BR')
}

export default function JogadoresPage() {
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroPlataforma, setFiltroPlataforma] = useState('')
  const [jogadores, setJogadores] = useState<JogadorRow[]>([])

  const carregarJogadores = useCallback(async () => {
    try {
      setLoading(true)

      const [perfisRes, rankingRes, membrosRes] = await Promise.all([
        supabase
          .from('perfis_jogo')
          .select('id,user_id,nick,uid_jogo,servidor,funcao,plataforma,foto_capa,equipe_id,created_at')
          .eq('ativo', true)
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('vw_lealt_ranking_jogadores')
          .select('*')
          .limit(1000),
        supabase
          .from('membros_equipe')
          .select('equipe_id,perfil_jogo_id,user_id,tipo,ativo,created_at')
          .eq('ativo', true)
          .limit(2000),
      ])

      if (perfisRes.error) throw perfisRes.error
      if (rankingRes.error) console.error('Erro ao carregar ranking dos jogadores:', rankingRes.error)
      if (membrosRes.error) console.error('Erro ao carregar vinculos de equipe dos jogadores:', membrosRes.error)

      const perfis = (perfisRes.data || []) as any[]
      const rankingPorPerfil = new Map<string, any>()
      ;((rankingRes.data || []) as any[]).forEach((row) => {
        if (row?.perfil_jogo_id) rankingPorPerfil.set(String(row.perfil_jogo_id), row)
      })

      const membros = ((membrosRes.data || []) as any[]).filter((membro) => membro?.equipe_id)
      const membroPorPerfil = new Map<string, any>()
      const membroPorUsuario = new Map<string, any>()

      membros.forEach((membro) => {
        if (membro.perfil_jogo_id && !membroPorPerfil.has(String(membro.perfil_jogo_id))) {
          membroPorPerfil.set(String(membro.perfil_jogo_id), membro)
        }

        if (membro.user_id && !membroPorUsuario.has(String(membro.user_id))) {
          membroPorUsuario.set(String(membro.user_id), membro)
        }
      })

      const equipeIds = Array.from(
        new Set(
          perfis
            .flatMap((perfil) => [
              perfil.equipe_id,
              membroPorPerfil.get(String(perfil.id))?.equipe_id,
              perfil.user_id ? membroPorUsuario.get(String(perfil.user_id))?.equipe_id : null,
            ])
            .filter(Boolean)
            .map(String)
        )
      )

      const equipesRes = equipeIds.length
        ? await supabase.from('equipes').select('id,nome,tag,logo_url').in('id', equipeIds)
        : { data: [], error: null }

      if (equipesRes.error) console.error('Erro ao carregar equipes dos jogadores:', equipesRes.error)

      const equipesPorId = new Map<string, any>()
      ;((equipesRes.data || []) as any[]).forEach((equipe) => {
        if (equipe?.id) equipesPorId.set(String(equipe.id), equipe)
      })

      const jogadoresCompletos = perfis
        .map((perfil) => {
          const ranking = rankingPorPerfil.get(String(perfil.id))
          const membroPerfil = membroPorPerfil.get(String(perfil.id))
          const membroUsuario = perfil.user_id ? membroPorUsuario.get(String(perfil.user_id)) : null
          const equipeId = perfil.equipe_id || membroPerfil?.equipe_id || membroUsuario?.equipe_id || null
          const equipe = equipeId ? equipesPorId.get(String(equipeId)) || null : null
          const jogador: JogadorRow = {
            id: perfil.id,
            user_id: perfil.user_id,
            nick: perfil.nick,
            uid_jogo: perfil.uid_jogo,
            servidor: perfil.servidor,
            funcao: perfil.funcao,
            plataforma: perfil.plataforma,
            foto_capa: perfil.foto_capa || ranking?.foto_capa || ranking?.foto_url || null,
            equipe_id: equipeId,
            created_at: perfil.created_at,
            equipes: equipe,
            rank_posicao: ranking?.posicao || undefined,
            rank_score: ranking ? Number(ranking.score_total || 0) : 0,
            score_bruto: ranking ? Number(ranking.score_skill || 0) : 0,
            score_total: ranking ? Number(ranking.score_total || 0) : 0,
            tier: ranking?.tier || null,
          }

          return {
            ...jogador,
            rank_score: ranking ? Number(ranking.score_total || 0) : calcularScoreJogador(jogador),
          }
        })
        .sort((a, b) => {
          const posA = a.rank_posicao || Number.MAX_SAFE_INTEGER
          const posB = b.rank_posicao || Number.MAX_SAFE_INTEGER
          if (posA !== posB) return posA - posB
          return (b.rank_score || 0) - (a.rank_score || 0)
        }) as JogadorRow[]

      setJogadores(jogadoresCompletos)
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarJogadores()
  }, [carregarJogadores])

  const jogadoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return jogadores.filter((jogador) => {
      const equipe = normalizarEquipe(jogador.equipes)
      const bateBusca =
        !termo ||
        [jogador.nick, jogador.uid_jogo, jogador.servidor, jogador.funcao, equipe?.nome, equipe?.tag].some(
          (valor) => String(valor || '').toLowerCase().includes(termo)
        )

      const batePlataforma = !filtroPlataforma || jogador.plataforma === filtroPlataforma
      return bateBusca && batePlataforma
    })
  }, [busca, filtroPlataforma, jogadores])

  const totalJogadores = jogadores.length
  const totalComEquipe = jogadores.filter((jogador) => normalizarEquipe(jogador.equipes)?.id).length
  const totalMobile = jogadores.filter((jogador) => jogador.plataforma === 'mobile').length
  const totalEmulador = jogadores.filter((jogador) => jogador.plataforma === 'emulador').length
  const mediaScore = jogadores.length
    ? Math.round(jogadores.reduce((total, jogador) => total + (jogador.rank_score || 0), 0) / jogadores.length)
    : 0
  const ultimosJogadores = [...jogadores]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 6)
  const topJogadores = jogadores.slice(0, 6)

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#142340]">
      <div className="mx-auto max-w-[1520px] px-4 pb-6 pt-5">
        <section className="mb-3 flex flex-col gap-2 border border-zinc-200 bg-white p-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
              <Users size={18} />
              Jogadores
            </div>
            <h1 className="text-[20px] font-semibold tracking-tight text-[#111827] md:text-[22px]">
              Ranking competitivo dos jogadores
            </h1>
            <p className="mt-1 text-[12px] text-zinc-500">
              Baseado em cadastro completo, equipe, plataforma, função e atividade.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/jogadores/convites"
              className="border border-zinc-300 px-4 py-2 text-[11px] font-semibold uppercase  text-[#142340] transition hover:bg-[#2563eb] hover:text-black"
            >
              Convites
            </Link>
            <Link
              href="/meu-perfil"
              className="bg-[#2563eb] px-3 py-2 text-[11px] font-medium uppercase text-white transition hover:bg-[#1d4ed8]"
            >
              + Novo jogador
            </Link>
          </div>
        </section>

        <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          <div className="border border-zinc-200 bg-white p-2">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
              <Users size={15} className="text-[#2563eb]" />
              Jogadores
            </div>
            <div className="mt-1 text-[18px] font-semibold text-[#111827]">{totalJogadores}</div>
            <div className="text-[10px] font-medium uppercase text-zinc-500">cadastrados</div>
          </div>

          <div className="border border-zinc-200 bg-white p-2">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
              <Shield size={15} className="text-[#2563eb]" />
              Com equipe
            </div>
            <div className="mt-1 text-[18px] font-semibold text-[#111827]">{totalComEquipe}</div>
            <div className="text-[10px] font-medium uppercase text-zinc-500">vinculados</div>
          </div>

          <div className="border border-zinc-200 bg-white p-2">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
              <Smartphone size={15} className="text-[#2563eb]" />
              Mobile
            </div>
            <div className="mt-1 text-[18px] font-semibold text-[#111827]">{totalMobile}</div>
            <div className="text-[10px] font-medium uppercase text-zinc-500">atletas</div>
          </div>

          <div className="border border-zinc-200 bg-white p-2">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
              <Monitor size={15} className="text-[#2563eb]" />
              Emulador
            </div>
            <div className="mt-1 text-[18px] font-semibold text-[#111827]">{totalEmulador}</div>
            <div className="text-[10px] font-medium uppercase text-zinc-500">atletas</div>
          </div>

          <div className="border border-zinc-200 bg-white p-2">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
              <BarChart3 size={15} className="text-[#2563eb]" />
              Média score
            </div>
            <div className="mt-1 text-[18px] font-semibold text-[#111827]">{mediaScore}</div>
            <div className="text-[10px] font-medium uppercase text-zinc-500">score médio</div>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#2563eb]" />
          </div>
        ) : (
          <>
            {ultimosJogadores.length > 0 && (
              <section className="mb-3 border border-zinc-200 bg-white">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
                    <Clock3 size={16} className="text-[#2563eb]" />
                    Últimos jogadores que entraram
                  </div>
                  <span className="text-[10px] font-medium uppercase text-zinc-500">recentes</span>
                </div>

                <div className="overflow-x-auto px-3 pb-3">
                  <div className="flex min-w-max gap-2">
                    {ultimosJogadores.map((jogador) => {
                      const equipe = normalizarEquipe(jogador.equipes)
                      return (
                        <Link
                          key={`ultimo-${jogador.id}`}
                          href={`/jogadores/${jogador.id}`}
                          className="flex w-[225px] shrink-0 items-center gap-2 bg-zinc-50 p-2.5 transition hover:bg-zinc-50"
                        >
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
                            {jogador.foto_capa ? (
                              <Image src={jogador.foto_capa} alt={jogador.nick || 'Jogador'} fill className="object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-zinc-500">
                                <UserCircle2 size={24} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-semibold uppercase">{jogador.nick || 'Sem nick'}</div>
                            <div className="mt-1 text-[10px] font-medium uppercase text-zinc-500">
                              ID: {jogador.uid_jogo || 'N/I'}
                            </div>
                            <div className="text-[10px] font-medium uppercase text-zinc-500">
                              {equipe?.tag || equipe?.nome || 'Sem equipe'}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            <section className="mb-3 border border-zinc-200 bg-white">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
                  <Trophy size={16} className="text-[#2563eb]" />
                  Ranking oficial dos jogadores
                </div>
                <Link href="/ranking?tab=jogadores" className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563eb] hover:underline">ver ranking geral</Link>
              </div>

              <div className="overflow-x-auto px-3 pb-3">
                <div className="min-w-[900px]">
                  <div className="grid grid-cols-[78px_2fr_1.3fr_120px_120px_170px_120px] bg-zinc-50 px-3 py-2 text-[10px] font-medium uppercase text-zinc-500">
                    <div>Posição</div>
                    <div>Jogador</div>
                    <div>Equipe</div>
                    <div>Plataforma</div>
                    <div>Função</div>
                    <div>Score</div>
                    <div>Cadastro</div>
                  </div>

                  {topJogadores.map((jogador) => {
                    const equipe = normalizarEquipe(jogador.equipes)
                    return (
                      <Link
                        key={`rank-${jogador.id}`}
                        href={`/jogadores/${jogador.id}`}
                        className="grid grid-cols-[78px_2fr_1.3fr_120px_120px_170px_120px] items-center border-t border-zinc-200 px-3 py-2 text-[12px] transition hover:bg-zinc-50"
                      >
                        <div className="text-sm font-semibold">{medalha(jogador.rank_posicao)}</div>
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden bg-zinc-100">
                            {jogador.foto_capa ? (
                              <Image src={jogador.foto_capa} alt={jogador.nick || 'Jogador'} fill className="object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-zinc-500">
                                <UserCircle2 size={20} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2"><span className="truncate font-semibold uppercase">{jogador.nick || 'Sem nick'}</span><RankingTierBadge tier={jogador.tier} posicao={jogador.rank_posicao} score={jogador.score_total || jogador.rank_score} tipo="jogador" compacto /></div>
                            <div className="text-[10px] font-medium uppercase text-zinc-500">ID: {jogador.uid_jogo || 'N/I'}</div>
                          </div>
                        </div>
                        <div className="font-semibold uppercase">{equipe?.tag || equipe?.nome || 'Sem equipe'}</div>
                        <div className="flex items-center gap-2 font-semibold">{getPlatformIcon(jogador.plataforma)} {getPlatformLabel(jogador.plataforma)}</div>
                        <div className="flex items-center gap-2 font-semibold uppercase">{getRoleIcon(jogador.funcao)} {jogador.funcao || 'N/I'}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-14 font-semibold text-[#2563eb]">{formatScore(jogador.score_total || jogador.rank_score || 0)}</span>
                            <div className="h-1.5 w-[110px] bg-zinc-200">
                              <div className="h-full bg-[#2563eb]" style={{ width: `${Math.max(0, Math.min(100, Number(jogador.score_total || jogador.rank_score || 0)))}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-zinc-500">{dataCurta(jogador.created_at)}</div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="border border-zinc-200 bg-white">
              <div className="flex flex-col gap-2 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
                  <Users size={16} className="text-[#2563eb]" />
                  Todos os jogadores
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_190px] lg:w-[480px]">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar jogador..."
                      className="h-9 w-full border border-zinc-300 bg-white pl-9 pr-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <select
                    value={filtroPlataforma}
                    onChange={(e) => setFiltroPlataforma(e.target.value)}
                    className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium uppercase text-[#142340] outline-none focus:border-[#2563eb]"
                  >
                    <option value="">Todas plataformas</option>
                    <option value="mobile">Mobile</option>
                    <option value="emulador">Emulador</option>
                  </select>
                </div>
              </div>

              {jogadoresFiltrados.length > 0 ? (
                <div className="overflow-x-auto px-3 pb-3">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[62px_2fr_1.25fr_120px_120px_170px_120px_96px] bg-zinc-50 px-3 py-2 text-[10px] font-medium uppercase text-zinc-500">
                      <div>Pos.</div>
                      <div>Jogador</div>
                      <div>Equipe</div>
                      <div>Plataforma</div>
                      <div>Função</div>
                      <div>Score</div>
                      <div>Servidor</div>
                      <div>Ações</div>
                    </div>

                    {jogadoresFiltrados.map((jogador) => {
                      const equipe = normalizarEquipe(jogador.equipes)
                      return (
                        <Link
                          key={jogador.id}
                          href={`/jogadores/${jogador.id}`}
                          className="grid grid-cols-[62px_2fr_1.25fr_120px_120px_170px_120px_96px] items-center border-t border-zinc-200 px-3 py-2 text-[12px] transition hover:bg-zinc-50"
                        >
                          <div className="font-semibold">#{jogador.rank_posicao || '-'}<div className="mt-1"><RankingTierBadge tier={jogador.tier} compacto /></div></div>
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="relative h-8 w-8 shrink-0 overflow-hidden bg-zinc-100">
                              {jogador.foto_capa ? (
                                <Image src={jogador.foto_capa} alt={jogador.nick || 'Jogador'} fill className="object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-zinc-500">
                                  <UserCircle2 size={20} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2"><span className="truncate font-semibold uppercase">{jogador.nick || 'Sem nick'}</span><RankingTierBadge tier={jogador.tier} posicao={jogador.rank_posicao} score={jogador.score_total || jogador.rank_score} tipo="jogador" compacto /></div>
                              <div className="text-[10px] font-medium uppercase text-zinc-500">ID: {jogador.uid_jogo || 'N/I'}</div>
                            </div>
                          </div>
                          <div className="font-semibold uppercase">{equipe?.tag || equipe?.nome || 'Sem equipe'}</div>
                          <div className="flex items-center gap-2 font-semibold">{getPlatformIcon(jogador.plataforma)} {getPlatformLabel(jogador.plataforma)}</div>
                          <div className="flex items-center gap-2 font-semibold uppercase">{getRoleIcon(jogador.funcao)} {jogador.funcao || 'N/I'}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-14 font-semibold text-[#2563eb]">{formatScore(jogador.score_total || jogador.rank_score || 0)}</span>
                              <div className="h-1.5 w-[110px] bg-zinc-200">
                                <div className="h-full bg-[#2563eb]" style={{ width: `${Math.max(0, Math.min(100, Number(jogador.score_total || jogador.rank_score || 0)))}%` }} />
                              </div>
                            </div>
                          </div>
                          <div className="font-semibold text-zinc-500">{jogador.servidor || 'N/I'}</div>
                          <div className="flex items-center gap-2">
                            <MessageShortcut referenciaTipo="jogador" referenciaId={jogador.id} titulo={jogador.nick || 'Jogador'} avatarUrl={jogador.foto_capa} tipo="dm" />
                            <span className="border border-zinc-300 px-2.5 py-1 text-[9px] font-semibold uppercase text-[#142340]">
                              Ver perfil
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="border-t border-zinc-200 py-8 text-center text-[12px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Nenhum jogador encontrado.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
