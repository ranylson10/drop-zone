'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Lado = 'a' | 'b'

function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

function mensagemErro(error: any) {
  const msg = String(error?.message || error?.details || error || '')

  if (msg.toLowerCase().includes('antifraude')) return 'Usuário bloqueado pelo antifraude.'
  if (
    msg.toLowerCase().includes('permission') ||
    msg.toLowerCase().includes('permiss') ||
    msg.toLowerCase().includes('rls') ||
    msg.toLowerCase().includes('não autorizado') ||
    msg.toLowerCase().includes('sem permissão')
  ) {
    return 'Você não tem permissão para executar essa ação.'
  }

  return msg || 'Erro inesperado.'
}

export default function ApostadoDetalhe() {
  const params = useParams()
  const confrontoId = useMemo(() => {
    const value = params?.id
    return Array.isArray(value) ? value[0] : value
  }, [params])

  const [confronto, setConfronto] = useState<any>(null)
  const [times, setTimes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [finalizando, setFinalizando] = useState<Lado | null>(null)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confrontoId])

  async function carregar() {
    if (!confrontoId) return

    setLoading(true)

    const [{ data: confrontoData, error: confrontoError }, { data: timesData, error: timesError }] = await Promise.all([
      supabase.from('confrontos_apostados').select('*').eq('id', confrontoId).single(),
      supabase.from('confrontos_times').select('*').eq('confronto_id', confrontoId).order('lado', { ascending: true }),
    ])

    if (confrontoError) console.error('Erro ao carregar apostado:', JSON.stringify(confrontoError, null, 2))
    if (timesError) console.error('Erro ao carregar times:', JSON.stringify(timesError, null, 2))

    setConfronto(confrontoData)
    setTimes(timesData || [])
    setLoading(false)
  }

  async function finalizarPorLado(lado: Lado) {
    if (!confrontoId || finalizando) return

    const confirmar = window.confirm(`Finalizar apostado com vitória do lado ${lado.toUpperCase()}?\n\nEssa ação processa o pagamento pelo backend seguro.`)
    if (!confirmar) return

    setFinalizando(lado)

    try {
      const { error } = await supabase.rpc('lealt_apostado_finalizar_com_escrow', {
        p_confronto_id: confrontoId,
        p_vencedor_lado: lado,
      })

      if (error) throw error

      alert(`Apostado finalizado. Vencedor: lado ${lado.toUpperCase()}`)
      await carregar()
    } catch (error: any) {
      console.error('Erro ao finalizar apostado:', JSON.stringify(error, null, 2))
      alert(mensagemErro(error))
    } finally {
      setFinalizando(null)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#f7f7f7] p-6 text-slate-700">Carregando...</div>
  if (!confronto) return <div className="min-h-screen bg-[#f7f7f7] p-6 text-slate-700">Apostado não encontrado ou sem permissão.</div>

  const total = Number(confronto.valor_total || 0) || Number(confronto.valor_por_lado || 0) * 2
  const premio = Number(confronto.valor_premio || 0) || total

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-900">
      <div className="mx-auto max-w-3xl px-3 py-4">
        <div className="mb-3 border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-600">Apostado</div>
          <h1 className="mt-1 text-[20px] font-semibold uppercase text-slate-950">{confronto.titulo}</h1>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] md:grid-cols-4">
            <div className="border border-slate-200 bg-slate-50 p-2"><b>Formato</b><br />{confronto.formato}</div>
            <div className="border border-slate-200 bg-slate-50 p-2"><b>Valor/lado</b><br />{moeda(confronto.valor_por_lado)}</div>
            <div className="border border-slate-200 bg-slate-50 p-2"><b>Prêmio</b><br />{moeda(premio)}</div>
            <div className="border border-slate-200 bg-slate-50 p-2"><b>Status</b><br />{confronto.status}</div>
          </div>
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-2">
          {(['a', 'b'] as Lado[]).map((lado) => {
            const time = times.find((t) => String(t.lado).toLowerCase() === lado)
            return (
              <div key={lado} className="border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-bold uppercase text-slate-500">Lado {lado.toUpperCase()}</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{time?.nome_time || 'Sem nome'}</div>
                <div className="mt-1 text-[11px] text-slate-500">Pagamento: {time?.status_pagamento || 'pendente'}</div>
              </div>
            )
          })}
        </div>

        {confronto.status !== 'finalizado' && (
          <div className="border border-slate-200 bg-white p-4">
            <p className="mb-3 text-[12px] font-semibold text-slate-600">Finalização permitida apenas para admin/moderador do confronto. O pagamento é feito via RPC segura.</p>
            <div className="grid gap-2 md:grid-cols-2">
              <button onClick={() => finalizarPorLado('a')} disabled={!!finalizando} className="border border-blue-700 bg-blue-600 px-5 py-3 text-sm font-bold uppercase text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                {finalizando === 'a' ? 'Finalizando...' : 'Vitória lado A'}
              </button>
              <button onClick={() => finalizarPorLado('b')} disabled={!!finalizando} className="border border-blue-700 bg-blue-600 px-5 py-3 text-sm font-bold uppercase text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                {finalizando === 'b' ? 'Finalizando...' : 'Vitória lado B'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
