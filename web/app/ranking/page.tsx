'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Trophy, Users, Gamepad2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import RankingTierBadge, { formatScore } from '@/app/components/RankingTierBadge'
import { getCampeonatoHref } from '@/app/campeonatos/utils/getCampeonatoHref'

type TabKey = 'jogadores' | 'equipes' | 'campeonatos' | 'tiers'

export default function RankingPage() {
  const [tab, setTab] = useState<TabKey>('jogadores')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [jogadores, setJogadores] = useState<any[]>([])
  const [equipes, setEquipes] = useState<any[]>([])
  const [campeonatos, setCampeonatos] = useState<any[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const inicial = params.get('tab') as TabKey | null
    if (inicial && ['jogadores', 'equipes', 'campeonatos', 'tiers'].includes(inicial)) setTab(inicial)
  }, [])

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const [jogadoresRes, equipesRes, campeonatosRes] = await Promise.all([
        supabase.from('vw_lealt_ranking_jogadores').select('*').order('posicao', { ascending: true }).limit(100),
        supabase.from('vw_lealt_ranking_equipes').select('*').order('posicao', { ascending: true }).limit(100),
        supabase.from('vw_lealt_ranking_campeonatos').select('*').order('posicao', { ascending: true }).limit(100),
      ])

      if (!jogadoresRes.error) setJogadores(jogadoresRes.data || [])
      if (!equipesRes.error) setEquipes(equipesRes.data || [])
      if (!campeonatosRes.error) {
        const rankingCampeonatos = campeonatosRes.data || []
        const campeonatoIds = rankingCampeonatos.map((item: any) => item.campeonato_id).filter(Boolean)
        const { data: campeonatosBase } = campeonatoIds.length
          ? await supabase
              .from('campeonatos')
              .select('id, tipo_competicao, modelo_competicao, formato, tipo')
              .in('id', campeonatoIds)
          : { data: [] as any[] }
        const tipoPorCampeonato = new Map<string, any>()
        ;(campeonatosBase || []).forEach((camp: any) => {
          tipoPorCampeonato.set(String(camp.id), camp)
        })
        setCampeonatos(
          rankingCampeonatos.map((item: any) => ({
            ...item,
            campeonato: tipoPorCampeonato.get(String(item.campeonato_id)) || null,
          }))
        )
      }
      setLoading(false)
    }

    carregar()
  }, [])

  const termo = busca.trim().toLowerCase()

  const listaAtual = useMemo(() => {
    const base = tab === 'equipes' ? equipes : tab === 'campeonatos' ? campeonatos : jogadores
    if (!termo) return base

    return base.filter((item) => {
      const texto = [
        item.nick,
        item.uid_jogo,
        item.nome,
        item.tag,
        item.username,
        item.nome_exibicao,
      ].filter(Boolean).join(' ').toLowerCase()

      return texto.includes(termo)
    })
  }, [tab, jogadores, equipes, campeonatos, termo])

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#142340]">
      <div className="mx-auto max-w-[1440px] px-4 py-6">
        <section className="mb-4 border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#2563eb]">// Ranking LEALT</div>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">Ranking geral</h1>
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Jogadores oficiais, equipes e campeonatos ranqueados pelo motor competitivo do banco.
              </p>
            </div>

            <div className="relative w-full lg:w-[360px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar no ranking"
                className="h-10 w-full border border-zinc-200 bg-white pl-9 pr-3 text-[12px] font-semibold uppercase outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-4 border border-zinc-200 bg-white">
          {[
            ['jogadores', 'Jogadores', Gamepad2],
            ['equipes', 'Equipes', Users],
            ['campeonatos', 'Campeonatos', Trophy],
            ['tiers', 'Tiers', ShieldCheck],
          ].map(([key, label, Icon]: any) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex h-12 items-center justify-center gap-2 border-r border-zinc-200 text-[11px] font-black uppercase tracking-[0.14em] last:border-r-0 ${
                tab === key ? 'bg-[#eaf6ff] text-[#2563eb]' : 'text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </section>

        {loading ? (
          <div className="border border-zinc-200 bg-white p-10 text-center text-[12px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Carregando ranking...
          </div>
        ) : tab === 'tiers' ? (
          <TierInfo />
        ) : (
          <section className="border border-zinc-200 bg-white">
            <div className="grid grid-cols-[80px_1.8fr_150px_150px_150px_140px] bg-zinc-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
              <div>#</div>
              <div>{tab === 'jogadores' ? 'Jogador' : tab === 'equipes' ? 'Equipe' : 'Campeonato'}</div>
              <div>Tier</div>
              <div>Score</div>
              <div>{tab === 'jogadores' ? 'Abates' : tab === 'equipes' ? 'Abates' : 'Equipes'}</div>
              <div>Abrir</div>
            </div>

            {listaAtual.map((item) => {
              const href =
                tab === 'jogadores'
                  ? `/jogadores/${item.perfil_jogo_id}`
                  : tab === 'equipes'
                    ? `/equipe/${item.equipe_id}`
                    : getCampeonatoHref(
                        item.campeonato_id,
                        item.campeonato?.tipo_competicao ||
                          item.campeonato?.modelo_competicao ||
                          item.campeonato?.formato ||
                          item.campeonato?.tipo
                      )

              const avatar = tab === 'jogadores' ? item.foto_capa || item.foto_url : tab === 'equipes' ? item.logo_url : item.logo_url
              const nome = tab === 'jogadores' ? item.nick : item.nome
              const sub = tab === 'jogadores' ? `ID: ${item.uid_jogo || 'N/I'}` : tab === 'equipes' ? item.tag || 'SEM TAG' : `${item.qtd_equipes || 0} equipes`

              return (
                <Link
                  key={`${tab}-${item.id}`}
                  href={href}
                  className="grid grid-cols-[80px_1.8fr_150px_150px_150px_140px] items-center border-t border-zinc-200 px-3 py-2 text-[12px] transition hover:bg-zinc-50"
                >
                  <div className="font-black">#{item.posicao || '-'}</div>
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
                      {avatar ? (
                        <Image src={avatar} alt={nome || 'Ranking'} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[12px] font-black uppercase text-zinc-500">
                          {(nome || '?').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-black uppercase">{nome || 'Sem nome'}</div>
                      <div className="truncate text-[10px] font-semibold uppercase text-zinc-500">{sub}</div>
                    </div>
                  </div>
                  <div><RankingTierBadge tier={item.tier} posicao={item.posicao} score={item.score_total} tipo={tab === 'jogadores' ? 'jogador' : tab === 'equipes' ? 'equipe' : 'campeonato'} compacto /></div>
                  <div className="font-black text-[#2563eb]">{formatScore(item.score_total)}</div>
                  <div className="font-semibold text-zinc-600">{tab === 'campeonatos' ? item.qtd_equipes || 0 : item.abates || 0}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563eb]">Ver perfil</div>
                </Link>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}

function TierInfo() {
  const tiers = [
    ['SS', 'Elite máxima', 'Dourado, topo absoluto do cenário.'],
    ['S', 'Elite', 'Altíssimo nível competitivo.'],
    ['A', 'Avançado', 'Competitivo forte e consistente.'],
    ['B', 'Competitivo', 'Bom nível competitivo.'],
    ['C', 'Intermediário', 'Perfil em evolução.'],
    ['D', 'Básico', 'Entrada competitiva.'],
    ['E', 'Entrada', 'Primeiros dados no ranking.'],
  ]

  return (
    <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {tiers.map(([tier, nome, desc]) => (
        <div key={tier} className="border border-zinc-200 bg-white p-4">
          <RankingTierBadge tier={tier} />
          <div className="mt-3 text-[15px] font-black uppercase">{nome}</div>
          <div className="mt-1 text-[12px] font-semibold uppercase leading-5 text-zinc-500">{desc}</div>
        </div>
      ))}
    </section>
  )
}
