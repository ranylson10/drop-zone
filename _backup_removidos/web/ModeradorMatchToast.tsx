'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Bell, CheckCircle2, Shield, Users, Wallet, X } from 'lucide-react'

type MatchModeracao = {
  id: string
  titulo: string | null
  formato: string | null
  regra_plataforma: string | null
  valor_por_lado: number | null
  valor_total: number | null
  valor_premio?: number | null
  status: string | null
  line_a_nome?: string | null
  line_b_nome?: string | null
  line_a_simbolo?: string | null
  line_b_simbolo?: string | null
  moderador_user_id?: string | null
  moderador_id?: string | null
  moderador_aceito_por?: string | null
  created_at?: string | null
}

function moeda(valor?: number | null) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function statusElegivel(status?: string | null) {
  const s = String(status || '').toLowerCase()

  return (
    s === 'aberto' ||
    s === 'aguardando_pagamento' ||
    s === 'aguardando_moderador' ||
    s === 'match_pronto' ||
    s === 'pronto' ||
    s === 'em_moderacao' ||
    s === 'em_andamento' ||
    s === 'andamento' ||
    s === 'pendente_resultado'
  )
}

export default function ModeradorMatchToast() {
  const router = useRouter()
  const [matches, setMatches] = useState<MatchModeracao[]>([])
  const [match, setMatch] = useState<MatchModeracao | null>(null)
  const [loading, setLoading] = useState(false)
  const [fechadoLocalmente, setFechadoLocalmente] = useState<Record<string, boolean>>({})

  const matchAtual = useMemo(() => {
    if (match && !fechadoLocalmente[match.id]) return match
    return matches.find((item) => !fechadoLocalmente[item.id]) || null
  }, [match, matches, fechadoLocalmente])

  const carregarPendentes = useCallback(async () => {
    const { data, error } = await supabase
      .from('confrontos_apostados')
      .select('*')
      .is('moderador_user_id', null)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Erro ao carregar matches pendentes:', error)
      return
    }

    const lista = (data || [])
      .filter((item: MatchModeracao) => {
        const moderadorAtual = item?.moderador_user_id || item?.moderador_id || item?.moderador_aceito_por || null
        if (moderadorAtual) return false
        if (!statusElegivel(item.status)) return false
        if (fechadoLocalmente[item.id]) return false
        return true
      })

    setMatches(lista)

    if (lista.length === 0) {
      setMatch(null)
      return
    }

    setMatch((atual) => {
      if (atual && lista.some((item) => item.id === atual.id)) return atual
      return lista[0]
    })
  }, [fechadoLocalmente])

  useEffect(() => {
    carregarPendentes()

    const canal = supabase
      .channel('lealt-moderador-match-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'confrontos_apostados' },
        (payload: any) => {
          const novo = payload?.new || {}
          const id = novo?.id
          const moderadorAtual = novo?.moderador_user_id || novo?.moderador_id || novo?.moderador_aceito_por || null

          if (id && moderadorAtual) {
            setMatches((prev) => prev.filter((item) => item.id !== id))
            setMatch((atual) => (atual?.id === id ? null : atual))
          }

          carregarPendentes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [carregarPendentes])

  async function aceitarMatch() {
    if (!matchAtual || loading) return

    setLoading(true)

    const { error } = await supabase.rpc('lealt_moderador_aceitar_confronto', {
      p_confronto_id: matchAtual.id,
    })

    if (error) {
      alert(error.message || 'Erro ao aceitar match.')
      setLoading(false)
      return
    }

    setMatches((prev) => prev.filter((item) => item.id !== matchAtual.id))
    setMatch(null)
    setLoading(false)
    router.push('/moderadores')
  }

  function recusarMatch() {
    if (!matchAtual) return

    setFechadoLocalmente((prev) => ({ ...prev, [matchAtual.id]: true }))
    setMatches((prev) => prev.filter((item) => item.id !== matchAtual.id))
    setMatch(null)
  }

  if (!matchAtual) return null

  const valorPorLado = Number(matchAtual.valor_por_lado || 0)
  const taxa = valorPorLado * 0.1
  const totalPagoPorLado = valorPorLado + taxa
  const premio = valorPorLado * 2

  return (
    <div className="fixed right-5 top-24 z-[9999] w-[420px] max-w-[calc(100vw-24px)] border border-orange-300 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between border-b border-orange-200 bg-orange-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center border border-orange-300 bg-white text-orange-600">
            <Bell size={18} />
          </div>
          <div>
            <div className="text-[12px] font-black uppercase tracking-[0.28em] text-orange-600">
              Nova moderação
            </div>
            <div className="text-[12px] font-bold text-slate-700">
              Um match está aguardando moderador.
            </div>
          </div>
        </div>

        <button
          onClick={recusarMatch}
          className="grid h-8 w-8 place-items-center border border-slate-200 bg-white text-slate-500 hover:border-orange-300 hover:text-orange-600"
          title="Fechar notificação"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div className="border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
            Confronto
          </div>

          <div className="text-[15px] font-black uppercase text-slate-950">
            {matchAtual.titulo || 'Confronto apostado'}
          </div>

          <div className="mt-3 grid grid-cols-[1fr_28px_1fr] items-center gap-2">
            <div className="truncate border border-slate-200 bg-white px-3 py-2 text-[12px] font-black uppercase text-slate-900">
              {matchAtual.line_a_simbolo || '🔥'} {matchAtual.line_a_nome || 'Lado A'}
            </div>
            <div className="text-center text-[10px] font-black uppercase text-slate-400">VS</div>
            <div className="truncate border border-slate-200 bg-white px-3 py-2 text-right text-[12px] font-black uppercase text-slate-900">
              {matchAtual.line_b_nome || 'Lado B'} {matchAtual.line_b_simbolo || '⚡'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="border border-slate-200 bg-white p-3">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
              <Wallet size={12} /> Por lado
            </div>
            <div className="text-[14px] font-black text-slate-950">{moeda(valorPorLado)}</div>
            <div className="text-[10px] font-bold text-slate-400">Paga {moeda(totalPagoPorLado)}</div>
          </div>

          <div className="border border-slate-200 bg-white p-3">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
              <Users size={12} /> Total
            </div>
            <div className="text-[14px] font-black text-slate-950">{moeda(totalPagoPorLado * 2)}</div>
            <div className="text-[10px] font-bold text-slate-400">Taxa {moeda(taxa * 2)}</div>
          </div>

          <div className="border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600">
              <Shield size={12} /> Prêmio
            </div>
            <div className="text-[14px] font-black text-emerald-700">{moeda(premio)}</div>
            <div className="text-[10px] font-bold text-emerald-600">sem taxa</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={recusarMatch}
            disabled={loading}
            className="border border-slate-300 bg-white px-4 py-3 text-[12px] font-black uppercase text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            Recusar
          </button>

          <button
            onClick={aceitarMatch}
            disabled={loading}
            className="flex items-center justify-center gap-2 border border-emerald-600 bg-emerald-600 px-4 py-3 text-[12px] font-black uppercase text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <CheckCircle2 size={15} />
            {loading ? 'Aceitando...' : 'Aceitar match'}
          </button>
        </div>
      </div>
    </div>
  )
}
