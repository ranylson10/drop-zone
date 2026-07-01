'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Lado = 'a' | 'b'

function mensagemErro(error: any) {
  const msg = String(error?.message || error?.details || error || '')

  if (msg.toLowerCase().includes('antifraude')) {
    return 'Usuário bloqueado pelo antifraude. Revise o painel administrativo antes de continuar.'
  }

  if (
    msg.toLowerCase().includes('permission') ||
    msg.toLowerCase().includes('permiss') ||
    msg.toLowerCase().includes('rls') ||
    msg.toLowerCase().includes('not authorized') ||
    msg.toLowerCase().includes('não autorizado') ||
    msg.toLowerCase().includes('sem permissão')
  ) {
    return 'Você não tem permissão para executar essa ação.'
  }

  return msg || 'Erro inesperado ao executar a ação.'
}

export default function AdminConfrontoDetalhe() {
  const params = useParams()
  const confrontoId = useMemo(() => {
    const value = params?.id
    return Array.isArray(value) ? value[0] : value
  }, [params])

  const [confronto, setConfronto] = useState<any>(null)
  const [times, setTimes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [roundsA, setRoundsA] = useState(0)
  const [roundsB, setRoundsB] = useState(0)
  const [abatesA, setAbatesA] = useState(0)
  const [abatesB, setAbatesB] = useState(0)
  const [wo, setWo] = useState<Lado | ''>('')

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

    if (confrontoError) {
      console.error('Erro ao carregar confronto:', JSON.stringify(confrontoError, null, 2))
      alert(mensagemErro(confrontoError))
    }

    if (timesError) {
      console.error('Erro ao carregar times:', JSON.stringify(timesError, null, 2))
      alert(mensagemErro(timesError))
    }

    setConfronto(confrontoData)
    setTimes(timesData || [])
    setLoading(false)
  }

  function definirVencedor(): Lado | null {
    if (wo === 'a') return 'b'
    if (wo === 'b') return 'a'
    if (roundsA > roundsB) return 'a'
    if (roundsB > roundsA) return 'b'
    return null
  }

  async function salvarResultado() {
    if (!confrontoId || salvando) return

    const vencedorLado = definirVencedor()

    if (!vencedorLado) {
      alert('Empate não permitido. Ajuste os rounds ou marque W.O.')
      return
    }

    const confirmar = window.confirm(
      `Finalizar confronto?\n\nVencedor: Lado ${vencedorLado.toUpperCase()}\nRounds: ${roundsA} x ${roundsB}\nAbates: ${abatesA} x ${abatesB}\n\nEssa ação processa o pagamento pelo backend seguro e não deve ser refeita.`
    )

    if (!confirmar) return

    setSalvando(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw authError || new Error('Usuário não autenticado.')

      const { error: resultadoError } = await supabase.from('confrontos_resultados').insert({
        confronto_id: confrontoId,
        enviado_por_user_id: authData.user.id,
        lado_declarante: vencedorLado,
        lado_vencedor_informado: vencedorLado,
        observacao: wo ? `W.O aplicado. Lado ${wo.toUpperCase()} perdeu.` : 'Resultado lançado pelo painel administrativo.',
        rounds_a: roundsA,
        rounds_b: roundsB,
        abates_a: abatesA,
        abates_b: abatesB,
        wo_lado: wo || null,
      })

      if (resultadoError) throw resultadoError

      const { error: finalizarError } = await supabase.rpc('user_finalizar_confronto', {
        p_confronto_id: confrontoId,
        p_vencedor_lado: vencedorLado,
      })

      if (finalizarError) throw finalizarError

      alert('Resultado salvo e pagamento processado com segurança.')
      await carregar()
    } catch (error: any) {
      console.error('Erro ao finalizar confronto:', JSON.stringify(error, null, 2))
      alert(mensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#f7f7f7] p-6 text-slate-700">Carregando...</div>
  if (!confronto) return <div className="min-h-screen bg-[#f7f7f7] p-6 text-slate-700">Confronto não encontrado ou sem permissão.</div>

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-900">
      <div className="mx-auto max-w-3xl px-3 py-4">
        <div className="mb-3 border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">Painel seguro</div>
          <h1 className="mt-1 text-[20px] font-semibold uppercase text-slate-950">{confronto.titulo}</h1>
          <p className="mt-1 text-[12px] text-slate-500">Finalize o confronto usando a RPC segura do backend. Nenhum saldo é alterado diretamente pelo navegador.</p>
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-2">
          {(['a', 'b'] as Lado[]).map((lado) => {
            const time = times.find((t) => String(t.lado).toLowerCase() === lado)
            return (
              <div key={lado} className="border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-bold uppercase text-slate-500">Lado {lado.toUpperCase()}</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{time?.nome_time || 'Sem nome'}</div>
                <div className="mt-1 text-[11px] text-slate-500">Pagamento: {time?.status_pagamento || 'pendente'}</div>
              </div>
            )
          })}
        </div>

        <div className="border border-slate-200 bg-white p-4">
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-bold uppercase text-slate-600">Rounds</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <input type="number" min={0} value={roundsA} onChange={(e) => setRoundsA(Number(e.target.value))} className="w-full border border-slate-300 bg-white p-2 text-sm outline-none focus:border-blue-500" placeholder="Lado A" />
                <input type="number" min={0} value={roundsB} onChange={(e) => setRoundsB(Number(e.target.value))} className="w-full border border-slate-300 bg-white p-2 text-sm outline-none focus:border-blue-500" placeholder="Lado B" />
              </div>
            </div>

            <div>
              <p className="text-[12px] font-bold uppercase text-slate-600">Abates</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <input type="number" min={0} value={abatesA} onChange={(e) => setAbatesA(Number(e.target.value))} className="w-full border border-slate-300 bg-white p-2 text-sm outline-none focus:border-blue-500" placeholder="Lado A" />
                <input type="number" min={0} value={abatesB} onChange={(e) => setAbatesB(Number(e.target.value))} className="w-full border border-slate-300 bg-white p-2 text-sm outline-none focus:border-blue-500" placeholder="Lado B" />
              </div>
            </div>

            <div>
              <p className="text-[12px] font-bold uppercase text-slate-600">W.O</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button onClick={() => setWo('')} className={`border px-3 py-2 text-[12px] font-semibold ${wo === '' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>Sem W.O</button>
                <button onClick={() => setWo('a')} className={`border px-3 py-2 text-[12px] font-semibold ${wo === 'a' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600'}`}>A perdeu</button>
                <button onClick={() => setWo('b')} className={`border px-3 py-2 text-[12px] font-semibold ${wo === 'b' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600'}`}>B perdeu</button>
              </div>
            </div>

            <button onClick={salvarResultado} disabled={salvando || confronto.status === 'finalizado'} className="w-full border border-blue-700 bg-blue-600 px-6 py-3 text-sm font-bold uppercase text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500">
              {confronto.status === 'finalizado' ? 'Confronto finalizado' : salvando ? 'Finalizando...' : 'Finalizar confronto com segurança'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
