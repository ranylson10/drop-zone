'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PlayerCard from '@/app/components/PlayerCard'

export default function EscalaVagaPage({ params }: any) {
  const campeonatoEquipeId = params?.campeonatoEquipeId

  const [loading, setLoading] = useState(true)
  const [vaga, setVaga] = useState<any>(null)
  const [campeonato, setCampeonato] = useState<any>(null)
  const [jogadoresEscalados, setJogadoresEscalados] = useState<any[]>([])
  const [elenco, setElenco] = useState<any[]>([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregar()
  }, [campeonatoEquipeId])

  async function carregar() {
    setLoading(true)
    setErro('')

    const { data: vagaData, error: vagaError } = await supabase
      .from('campeonato_equipes')
      .select('*')
      .eq('id', campeonatoEquipeId)
      .single()

    if (vagaError || !vagaData) {
      setErro('Vaga não encontrada.')
      setLoading(false)
      return
    }

    setVaga(vagaData)

    const { data: campeonatoData } = await supabase
      .from('campeonatos')
      .select('*')
      .eq('id', vagaData.campeonato_id)
      .single()

    setCampeonato(campeonatoData)

    const { data: escaladosData } = await supabase
      .from('jogadores_campeonato')
      .select(`
        *,
        perfis_jogo (*),
        jogadores_avulsos_campeonato (*)
      `)
      .eq('campeonato_id', vagaData.campeonato_id)
      .eq('equipe_id', vagaData.equipe_id)

    setJogadoresEscalados(escaladosData || [])

    const { data: elencoData } = await supabase
      .from('membros_equipe')
      .select(`
        *,
        perfis_jogo (*)
      `)
      .eq('equipe_id', vagaData.equipe_id)

    setElenco(elencoData || [])
    setLoading(false)
  }

  const totalSlots = useMemo(() => {
    const titulares = Number(campeonato?.jogadores_por_equipe || 0)
    const reservas = Number(campeonato?.reservas_permitidos || 0)
    return Math.max(1, titulares + reservas)
  }, [campeonato])

  const slots = useMemo(() => {
    return Array.from({ length: totalSlots }).map((_, index) => {
      return jogadoresEscalados[index] || null
    })
  }, [totalSlots, jogadoresEscalados])

  function nomeJogador(item: any) {
    return (
      item?.perfis_jogo?.nick_jogo ||
      item?.perfis_jogo?.nick ||
      item?.jogadores_avulsos_campeonato?.nick_snapshot ||
      item?.nick_snapshot ||
      'JOGADOR'
    )
  }

  function tierJogador(item: any) {
    return (
      item?.perfis_jogo?.tier ||
      item?.perfis_jogo?.ranking_tier ||
      item?.tier ||
      'C'
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] flex items-center justify-center text-sm font-bold text-slate-500">
        CARREGANDO...
      </main>
    )
  }

  if (erro) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 p-6 text-center">
          <div className="font-black text-lg mb-4">{erro}</div>
          <Link href="/campeonatos" className="inline-flex h-11 px-5 items-center justify-center bg-[#2563eb] text-white font-black">
            VER CAMPEONATOS
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#0f172a]">
      <div className="mx-auto max-w-[520px] bg-white min-h-screen border-x border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="text-[10px] tracking-[0.25em] uppercase text-[#2563eb] font-black">
            Escalação
          </div>
          <h1 className="text-xl font-black leading-tight">
            {campeonato?.nome || 'Campeonato'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {jogadoresEscalados.length}/{totalSlots} slots usados
          </p>
        </div>

        <section className="p-4 bg-[#07111f]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-violet-300 font-black">
                Slots do campeonato
              </div>
              <div className="text-white font-black text-sm">
                Clique no + para adicionar jogador
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {slots.map((item, index) => {
              if (!item) {
                return (
                  <PlayerCard
                    key={`slot-${index}`}
                    variant="slot"
                    number={index + 1}
                    onClick={() => {
                      const el = document.getElementById('elenco-equipe')
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                  />
                )
              }

              return (
                <PlayerCard
                  key={item.id || index}
                  name={nomeJogador(item)}
                  tier={tierJogador(item) as any}
                  number={index + 1}
                  variant={item?.jogador_avulso_id ? 'avulso' : 'oficial'}
                />
              )
            })}
          </div>
        </section>

        <section id="elenco-equipe" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-slate-400 font-black">
                Elenco da equipe
              </div>
              <div className="text-sm font-black">
                Jogadores cadastrados
              </div>
            </div>
          </div>

          {elenco.length === 0 ? (
            <div className="border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 font-bold">
              Nenhum jogador encontrado no elenco.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {elenco.map((item, index) => (
                <PlayerCard
                  key={item.id || index}
                  name={item?.perfis_jogo?.nick_jogo || item?.perfis_jogo?.nick || 'JOGADOR'}
                  tier={(item?.perfis_jogo?.tier || item?.perfis_jogo?.ranking_tier || 'C') as any}
                  number={index + 1}
                  variant="oficial"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
