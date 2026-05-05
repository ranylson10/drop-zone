'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ConfrontoModerador = {
  id: string
  titulo: string | null
  formato: string | null
  regra_plataforma: string | null
  valor_por_lado: number | null
  valor_total: number | null
  status: string | null
  vencedor_lado: string | null
  resultado_texto: string | null
  melhor_de: number | null
  rounds_para_vencer?: number | null
  rounds_a_total: number | null
  rounds_b_total: number | null
  partidas_a: number | null
  partidas_b: number | null
  abates_a_total: number | null
  abates_b_total: number | null
  valor_site: number | null
  valor_premio: number | null
  resultado_validado_em?: string | null
  resultado_validado_por?: string | null
  fila_lado_a_id: string | null
  fila_lado_b_id: string | null
  line_a_id: string | null
  line_b_id: string | null
  line_a_simbolo: string | null
  line_a_nome: string | null
  line_b_simbolo: string | null
  line_b_nome: string | null
  created_at: string | null
  updated_at: string | null
  moderador_user_id?: string | null
  moderador_aceito_at?: string | null
}

type JogadorModerador = {
  id: string
  fila_id: string | null
  lineup_id: string | null
  lado: 'A' | 'B' | null
  confronto_id: string
  perfil_jogo_id: string
  ordem: number | null
  nick: string | null
  uid_jogo: string | null
  plataforma: string | null
  nome_perfil: string | null
  avatar_url: string | null
}

type AbatesState = Record<string, number>

const ROUNDS_OPCOES = [6, 8, 13, 15]

function moeda(valor?: number | null) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusLabel(status?: string | null) {
  if (!status) return 'SEM STATUS'
  return status.replaceAll('_', ' ').toUpperCase()
}

function plataformaLabel(value?: string | null) {
  if (!value) return '—'
  return value.replaceAll('_', ' ').toUpperCase()
}

function dataCurta(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return '—'
  }
}

function normalizarLado(lado?: string | null) {
  const l = String(lado || '').toUpperCase()
  return l === 'A' || l === 'B' ? l : null
}

function partidasParaVencer(md?: number | null) {
  const melhorDe = Number(md || 1)
  if (melhorDe >= 7) return 4
  if (melhorDe >= 5) return 3
  if (melhorDe >= 3) return 2
  return 1
}

function pctRound(rounds: number, limite: number) {
  if (!limite) return 0
  return Math.min(100, Math.max(0, (rounds / limite) * 100))
}

export default function ModeradoresPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [confrontos, setConfrontos] = useState<ConfrontoModerador[]>([])
  const [confrontoId, setConfrontoId] = useState<string | null>(null)
  const [jogadores, setJogadores] = useState<JogadorModerador[]>([])
  const [filtro, setFiltro] = useState<'abertos' | 'todos' | 'finalizados'>('abertos')
  const [registrandoRound, setRegistrandoRound] = useState<'A' | 'B' | null>(null)
  const [salvandoKills, setSalvandoKills] = useState(false)
  const [abates, setAbates] = useState<AbatesState>({})
  const [roundsParaVencer, setRoundsParaVencer] = useState(8)
  const [editandoResultado, setEditandoResultado] = useState(false)
  const [salvandoCorrecao, setSalvandoCorrecao] = useState(false)
  const [correcao, setCorrecao] = useState({ partidasA: 0, partidasB: 0, roundsA: 0, roundsB: 0, firstTo: 8 })

  const confrontoSelecionado = useMemo(
    () => confrontos.find((item) => item.id === confrontoId) || null,
    [confrontos, confrontoId]
  )

  const jogadoresA = useMemo(
    () => jogadores.filter((j) => j.lado === 'A').sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)),
    [jogadores]
  )

  const jogadoresB = useMemo(
    () => jogadores.filter((j) => j.lado === 'B').sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)),
    [jogadores]
  )

  const md = Number(confrontoSelecionado?.melhor_de || 1)
  const partidasNecessarias = partidasParaVencer(md)
  const partidasA = Number(confrontoSelecionado?.partidas_a || 0)
  const partidasB = Number(confrontoSelecionado?.partidas_b || 0)
  const roundsA = Number(confrontoSelecionado?.rounds_a_total || 0)
  const roundsB = Number(confrontoSelecionado?.rounds_b_total || 0)
  const limiteRounds = Number(confrontoSelecionado?.rounds_para_vencer || roundsParaVencer || 8)
  const vencedor = normalizarLado(confrontoSelecionado?.vencedor_lado)
  const encerrado = ['finalizado', 'cancelado', 'reembolsado'].includes(String(confrontoSelecionado?.status || ''))
  const pagamentoProcessado = Boolean((confrontoSelecionado as any)?.resultado_validado_em) || Number(confrontoSelecionado?.valor_premio || 0) > 0
  const proximaPartida = Math.min(partidasA + partidasB + 1, md)

  const totalKillsA = useMemo(() => jogadoresA.reduce((s, j) => s + Number(abates[j.perfil_jogo_id] || 0), 0), [abates, jogadoresA])
  const totalKillsB = useMemo(() => jogadoresB.reduce((s, j) => s + Number(abates[j.perfil_jogo_id] || 0), 0), [abates, jogadoresB])

  const carregarConfrontos = useCallback(async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData?.user?.id || null
      setUserId(uid)

      let query = supabase
        .from('vw_apostados_confrontos_moderador')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (filtro === 'abertos') {
        query = query.in('status', ['aberto', 'aguardando_pagamento', 'em_moderacao', 'em_andamento', 'andamento', 'pendente_resultado'])
      }
      if (filtro === 'finalizados') {
        query = query.eq('status', 'finalizado')
      }

      const { data, error } = await query
      if (error) throw error

      const listaBase = (data || []) as ConfrontoModerador[]
      const lista = uid ? listaBase.filter((item: any) => !('moderador_user_id' in item) || item.moderador_user_id === uid) : listaBase

      setConfrontos(lista)

      if (!confrontoId && lista.length > 0) {
        setConfrontoId(lista[0].id)
      }
      if (confrontoId && !lista.some((c) => c.id === confrontoId) && lista.length > 0) {
        setConfrontoId(lista[0].id)
      }
    } catch (error: any) {
      console.error('Erro ao carregar confrontos:', JSON.stringify(error, null, 2))
      alert(error?.message || 'Erro ao carregar confrontos.')
    } finally {
      setLoading(false)
    }
  }, [confrontoId, filtro])

  const carregarJogadores = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('vw_apostados_confronto_jogadores_moderador')
      .select('*')
      .eq('confronto_id', id)
      .order('lado', { ascending: true })
      .order('ordem', { ascending: true })

    if (error) {
      console.error('Erro ao carregar jogadores:', JSON.stringify(error, null, 2))
      setJogadores([])
      return
    }

    const lista = (data || []) as JogadorModerador[]
    setJogadores(lista)

    const inicial: AbatesState = {}
    for (const j of lista) inicial[j.perfil_jogo_id] = abates[j.perfil_jogo_id] || 0
    setAbates(inicial)
  }, [abates])

  useEffect(() => {
    carregarConfrontos()
  }, [carregarConfrontos])

  useEffect(() => {
    if (confrontoId) carregarJogadores(confrontoId)
  }, [carregarJogadores, confrontoId])

  useEffect(() => {
    if (confrontoSelecionado?.rounds_para_vencer) {
      setRoundsParaVencer(Number(confrontoSelecionado.rounds_para_vencer))
    }
  }, [confrontoSelecionado?.rounds_para_vencer])

  useEffect(() => {
    if (!confrontoSelecionado) return
    setCorrecao({
      partidasA: Number(confrontoSelecionado.partidas_a || 0),
      partidasB: Number(confrontoSelecionado.partidas_b || 0),
      roundsA: Number(confrontoSelecionado.rounds_a_total || 0),
      roundsB: Number(confrontoSelecionado.rounds_b_total || 0),
      firstTo: Number(confrontoSelecionado.rounds_para_vencer || roundsParaVencer || 8),
    })
    setEditandoResultado(false)
  }, [confrontoSelecionado?.id, confrontoSelecionado?.partidas_a, confrontoSelecionado?.partidas_b, confrontoSelecionado?.rounds_a_total, confrontoSelecionado?.rounds_b_total, confrontoSelecionado?.rounds_para_vencer, roundsParaVencer])

  useEffect(() => {
    const id = window.setInterval(() => carregarConfrontos(), 15000)
    return () => window.clearInterval(id)
  }, [carregarConfrontos])

  async function registrarRound(lado: 'A' | 'B') {
    if (!confrontoSelecionado) return
    if (encerrado) {
      alert('Este confronto já está encerrado.')
      return
    }

    setRegistrandoRound(lado)
    try {
      const { data, error } = await supabase.rpc('fn_apostados_registrar_round', {
        p_confronto_id: confrontoSelecionado.id,
        p_lado_vencedor: lado,
      })

      if (error) {
        console.error('Erro RPC registrar round:', JSON.stringify(error, null, 2))
        throw error
      }

      if (data?.partida_finalizada || data?.partida_fechada) {
        alert(`Partida fechada. Placar da série: ${data.partidas_a} x ${data.partidas_b}`)
      }
      if (data?.confronto_finalizado || data?.finalizado) {
        alert(`Série finalizada. Vencedor: Lado ${String(data.vencedor_lado || '').toUpperCase()}. Revise o placar e clique em Validar + pagar.`)
      }

      await carregarConfrontos()
      await carregarJogadores(confrontoSelecionado.id)
    } catch (error: any) {
      console.error('Erro ao registrar round:', JSON.stringify(error, null, 2))
      alert(error?.message || error?.details || 'Erro ao registrar round.')
    } finally {
      setRegistrandoRound(null)
    }
  }


  function alterarCorrecao(campo: 'partidasA' | 'partidasB' | 'roundsA' | 'roundsB' | 'firstTo', valor: string | number) {
    const n = Math.max(0, Number(valor || 0))
    setCorrecao((prev) => ({ ...prev, [campo]: n }))
  }

  async function salvarCorrecaoResultado() {
    if (!confrontoSelecionado) return
    if (pagamentoProcessado) {
      alert('Este confronto já tem pagamento validado. Para corrigir depois do pagamento, primeiro precisa reembolsar/regularizar o financeiro.')
      return
    }

    const confirmar = window.confirm('Salvar correção manual do placar? Isso pode reabrir ou finalizar o confronto conforme o placar informado.')
    if (!confirmar) return

    setSalvandoCorrecao(true)
    try {
      const { data, error } = await supabase.rpc('fn_apostados_ajustar_resultado_manual', {
        p_confronto_id: confrontoSelecionado.id,
        p_partidas_a: correcao.partidasA,
        p_partidas_b: correcao.partidasB,
        p_rounds_a: correcao.roundsA,
        p_rounds_b: correcao.roundsB,
        p_rounds_para_vencer: correcao.firstTo,
      })

      if (error) {
        console.error('Erro RPC corrigir resultado:', JSON.stringify(error, null, 2))
        throw error
      }

      alert(data?.confronto_finalizado ? `Resultado corrigido. Vencedor: Lado ${String(data.vencedor_lado || '').toUpperCase()}.` : 'Resultado corrigido. Confronto em andamento novamente.')
      setEditandoResultado(false)
      await carregarConfrontos()
      await carregarJogadores(confrontoSelecionado.id)
    } catch (error: any) {
      console.error('Erro ao corrigir resultado:', JSON.stringify(error, null, 2))
      alert(error?.message || error?.details || 'Erro ao corrigir resultado.')
    } finally {
      setSalvandoCorrecao(false)
    }
  }

  async function atualizarRoundsParaVencer(novoLimite: number) {
    if (!confrontoSelecionado) return
    setRoundsParaVencer(novoLimite)

    const { error } = await supabase
      .from('confrontos_apostados')
      .update({ rounds_para_vencer: novoLimite })
      .eq('id', confrontoSelecionado.id)

    if (error) {
      console.error('Erro ao atualizar limite de rounds:', JSON.stringify(error, null, 2))
      alert(error?.message || 'Erro ao atualizar limite de rounds.')
      return
    }

    await carregarConfrontos()
  }

  function alterarAbate(perfilJogoId: string, valor: string) {
    const n = Math.max(0, Number(valor || 0))
    setAbates((prev) => ({ ...prev, [perfilJogoId]: n }))
  }

  async function salvarEstatisticas() {
    if (!confrontoSelecionado) return
    setSalvandoKills(true)
    try {
      const updates: Promise<any>[] = []

      for (const j of jogadoresA) {
        updates.push(
          supabase
            .from('apostados_confronto_partida_jogadores')
            .upsert({
              confronto_id: confrontoSelecionado.id,
              partida_id: confrontoSelecionado.id,
              numero_partida: proximaPartida,
              lado: 'A',
              perfil_jogo_id: j.perfil_jogo_id,
              abates: Number(abates[j.perfil_jogo_id] || 0),
            }, { onConflict: 'partida_id,perfil_jogo_id' })
        )
      }

      for (const j of jogadoresB) {
        updates.push(
          supabase
            .from('apostados_confronto_partida_jogadores')
            .upsert({
              confronto_id: confrontoSelecionado.id,
              partida_id: confrontoSelecionado.id,
              numero_partida: proximaPartida,
              lado: 'B',
              perfil_jogo_id: j.perfil_jogo_id,
              abates: Number(abates[j.perfil_jogo_id] || 0),
            }, { onConflict: 'partida_id,perfil_jogo_id' })
        )
      }

      const results = await Promise.all(updates)
      const erro = results.find((r) => r.error)?.error
      if (erro) throw erro

      alert('Estatísticas salvas.')
      await carregarJogadores(confrontoSelecionado.id)
    } catch (error: any) {
      console.error('Erro ao salvar estatísticas:', JSON.stringify(error, null, 2))
      alert(error?.message || error?.details || 'Erro ao salvar estatísticas.')
    } finally {
      setSalvandoKills(false)
    }
  }

  async function pagarManualmente() {
    if (!confrontoSelecionado) return
    const lado = vencedor || (partidasA > partidasB ? 'A' : partidasB > partidasA ? 'B' : null)
    if (!lado) {
      alert('Não existe vencedor definido para pagar.')
      return
    }

    const confirmar = window.confirm(`Processar pagamento do confronto para o Lado ${lado}?`)
    if (!confirmar) return

    try {
      const { data, error } = await supabase.rpc('lealt_apostado_finalizar_com_escrow', {
        p_confronto_id: confrontoSelecionado.id,
        p_vencedor_lado: lado.toLowerCase(),
      })
      if (error) throw error
      alert(`Pagamento processado. Prêmio: ${moeda(data?.valor_premio || 0)}`)
      await carregarConfrontos()
    } catch (error: any) {
      console.error('Erro ao pagar escrow:', JSON.stringify(error, null, 2))
      alert(error?.message || error?.details || 'Erro ao pagar escrow.')
    }
  }

  async function reembolsarConfronto() {
    if (!confrontoSelecionado) return
    const confirmar = window.confirm('Reembolsar este confronto? O saldo retido volta para os participantes.')
    if (!confirmar) return

    try {
      const { data, error } = await supabase.rpc('lealt_apostado_reembolsar_confronto', {
        p_confronto_id: confrontoSelecionado.id,
        p_motivo: 'Reembolso feito pelo moderador',
      })
      if (error) throw error
      alert(`Reembolso processado: ${moeda(data?.valor_reembolsado || 0)}`)
      await carregarConfrontos()
    } catch (error: any) {
      console.error('Erro ao reembolsar:', JSON.stringify(error, null, 2))
      alert(error?.message || error?.details || 'Erro ao reembolsar confronto.')
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto max-w-[1500px] px-3 py-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[360px_1fr]">
          <aside className="border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 p-2">
              {(['abertos', 'todos', 'finalizados'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltro(tipo)}
                  className={[
                    'border px-3 py-2 text-[11px] font-black uppercase tracking-wide',
                    filtro === tipo ? 'border-cyan-400 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-300',
                  ].join(' ')}
                >
                  {tipo}
                </button>
              ))}
            </div>

            <div className="border-b border-slate-200 px-3 py-2">
              <div className="text-[12px] font-black uppercase text-slate-900">Confrontos</div>
              <div className="text-[11px] font-semibold text-slate-400">{confrontos.length} registros encontrados</div>
            </div>

            <div className="max-h-[calc(100vh-145px)] overflow-auto p-2">
              {loading ? (
                <div className="p-4 text-[12px] font-bold text-slate-500">Carregando...</div>
              ) : confrontos.length === 0 ? (
                <div className="p-4 text-[12px] font-bold text-slate-500">Nenhum confronto encontrado.</div>
              ) : (
                <div className="space-y-2">
                  {confrontos.map((c) => {
                    const ativo = c.id === confrontoId
                    const cPartidasA = Number(c.partidas_a || 0)
                    const cPartidasB = Number(c.partidas_b || 0)
                    return (
                      <button
                        key={c.id}
                        onClick={() => setConfrontoId(c.id)}
                        className={[
                          'w-full border p-2 text-left transition',
                          ativo ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-white hover:border-cyan-300',
                        ].join(' ')}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-black uppercase text-slate-900">{c.titulo || 'Confronto apostado'}</span>
                          <span className={['border px-2 py-1 text-[10px] font-black uppercase', c.status === 'finalizado' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'].join(' ')}>{statusLabel(c.status)}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_48px_1fr] items-center gap-2">
                          <div className="truncate text-[11px] font-black uppercase text-slate-900">{c.line_a_simbolo || '🔥'} {c.line_a_nome || 'Lado A'}</div>
                          <div className="bg-slate-950 px-2 py-1 text-center text-[11px] font-black text-white">{cPartidasA} x {cPartidasB}</div>
                          <div className="truncate text-right text-[11px] font-black uppercase text-slate-900">{c.line_b_nome || 'Lado B'} {c.line_b_simbolo || '⚡'}</div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase text-slate-500">
                          <span>{c.formato || '—'} • MD{c.melhor_de || 1}</span>
                          <span>{dataCurta(c.created_at)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>

          {!confrontoSelecionado ? (
            <section className="border border-slate-200 bg-white p-6 text-[13px] font-bold text-slate-500 shadow-sm">Selecione um confronto.</section>
          ) : (
            <section className="space-y-3">
              <div className="border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-500">Controle oficial</div>
                    <h1 className="text-[19px] font-black uppercase leading-tight">Partida {proximaPartida} • MD{md}</h1>
                    <p className="text-[12px] font-semibold text-slate-500">Round é ponto. Quem chega em {limiteRounds} vence a partida. Quem vence {partidasNecessarias} partida(s) vence a série.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                      <div className="text-[10px] font-black uppercase text-slate-400">Status</div>
                      <div className="text-[12px] font-black uppercase text-slate-900">{statusLabel(confrontoSelecionado.status)}</div>
                    </div>
                    <button onClick={() => carregarConfrontos()} className="border border-slate-300 bg-white px-3 py-2 text-[11px] font-black uppercase text-slate-700 hover:border-cyan-400">Atualizar</button>
                    <button onClick={() => router.push('/apostados')} className="border border-slate-300 bg-white px-3 py-2 text-[11px] font-black uppercase text-slate-700 hover:border-cyan-400">Apostados</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_280px_1fr]">
                  <div className="border border-slate-200 bg-white p-3">
                    <div className="mb-3 grid grid-cols-[58px_1fr_auto] items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center border border-slate-200 bg-slate-50 text-[28px]">{confrontoSelecionado.line_a_simbolo || '🔥'}</div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Equipe A</div>
                        <div className="truncate text-[28px] font-black uppercase leading-none">{confrontoSelecionado.line_a_nome || 'Lado A'}</div>
                      </div>
                      <div className="text-[32px] font-black text-cyan-700">{roundsA}</div>
                    </div>
                    <div className="mb-3 h-2 border border-slate-200 bg-slate-50">
                      <div className="h-full bg-cyan-600" style={{ width: `${pctRound(roundsA, limiteRounds)}%` }} />
                    </div>
                    <button disabled={!!registrandoRound || encerrado} onClick={() => registrarRound('A')} className="mb-3 w-full border border-cyan-700 bg-cyan-700 py-3 text-[13px] font-black uppercase text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300">
                      {registrandoRound === 'A' ? 'Registrando...' : '+ Round A'}
                    </button>
                    <div className="space-y-1">
                      {jogadoresA.length === 0 ? (
                        <div className="border border-slate-200 bg-slate-50 px-3 py-3 text-[12px] font-bold text-slate-500">Nenhum jogador carregado.</div>
                      ) : jogadoresA.map((j) => (
                        <label key={j.perfil_jogo_id} className="grid grid-cols-[1fr_70px] items-center gap-2">
                          <div className="border border-slate-300 bg-slate-50 px-3 py-2 text-[18px] font-black uppercase leading-none">{j.nick || 'Jogador'}</div>
                          <input type="number" min={0} value={abates[j.perfil_jogo_id] || 0} onChange={(e) => alterarAbate(j.perfil_jogo_id, e.target.value)} className="border border-cyan-700 bg-cyan-700 px-2 py-2 text-center text-[20px] font-black text-white outline-none" />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-200 bg-white p-3 text-center">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Série</div>
                    <div className="text-[52px] font-black leading-none text-slate-950">{partidasA} <span className="text-[24px] text-slate-400">x</span> {partidasB}</div>
                    <div className="mt-2 text-[12px] font-black uppercase text-slate-500">MD{md} • precisa {partidasNecessarias}</div>
                    <div className="mt-1 text-[12px] font-black uppercase text-emerald-600">{vencedor ? `Vencedor lado ${vencedor}` : 'Em andamento'}</div>

                    <div className="my-4 border-t border-slate-200" />

                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="border border-slate-200 bg-slate-50 p-2">
                        <div className="text-[10px] font-black uppercase text-slate-400">Rounds</div>
                        <div className="text-[16px] font-black">{roundsA} x {roundsB}</div>
                      </div>
                      <div className="border border-slate-200 bg-slate-50 p-2">
                        <div className="text-[10px] font-black uppercase text-slate-400">First to</div>
                        <div className="text-[16px] font-black">{limiteRounds}</div>
                      </div>
                      <div className="border border-slate-200 bg-slate-50 p-2">
                        <div className="text-[10px] font-black uppercase text-slate-400">Kills A</div>
                        <div className="text-[16px] font-black">{totalKillsA}</div>
                      </div>
                      <div className="border border-slate-200 bg-slate-50 p-2">
                        <div className="text-[10px] font-black uppercase text-slate-400">Kills B</div>
                        <div className="text-[16px] font-black">{totalKillsB}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-1">
                      {ROUNDS_OPCOES.map((n) => (
                        <button key={n} disabled={encerrado} onClick={() => atualizarRoundsParaVencer(n)} className={['border px-2 py-2 text-[10px] font-black uppercase', limiteRounds === n ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-500'].join(' ')}>
                          FT{n}
                        </button>
                      ))}
                    </div>

                    <button onClick={() => setEditandoResultado((v) => !v)} disabled={pagamentoProcessado} className="mt-3 w-full border border-amber-400 bg-amber-50 px-3 py-2 text-[11px] font-black uppercase text-amber-700 disabled:cursor-not-allowed disabled:opacity-50">
                      {editandoResultado ? 'Fechar correção' : 'Corrigir placar'}
                    </button>

                    {editandoResultado && (
                      <div className="mt-2 border border-amber-200 bg-amber-50 p-2 text-left">
                        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Correção manual antes do pagamento</div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-[10px] font-black uppercase text-slate-500">Partidas A
                            <input type="number" min={0} max={partidasNecessarias} value={correcao.partidasA} onChange={(e) => alterarCorrecao('partidasA', e.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-2 py-2 text-center text-[15px] font-black outline-none" />
                          </label>
                          <label className="text-[10px] font-black uppercase text-slate-500">Partidas B
                            <input type="number" min={0} max={partidasNecessarias} value={correcao.partidasB} onChange={(e) => alterarCorrecao('partidasB', e.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-2 py-2 text-center text-[15px] font-black outline-none" />
                          </label>
                          <label className="text-[10px] font-black uppercase text-slate-500">Rounds A
                            <input type="number" min={0} value={correcao.roundsA} onChange={(e) => alterarCorrecao('roundsA', e.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-2 py-2 text-center text-[15px] font-black outline-none" />
                          </label>
                          <label className="text-[10px] font-black uppercase text-slate-500">Rounds B
                            <input type="number" min={0} value={correcao.roundsB} onChange={(e) => alterarCorrecao('roundsB', e.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-2 py-2 text-center text-[15px] font-black outline-none" />
                          </label>
                        </div>
                        <button onClick={salvarCorrecaoResultado} disabled={salvandoCorrecao} className="mt-2 w-full border border-amber-500 bg-amber-500 px-3 py-2 text-[11px] font-black uppercase text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                          {salvandoCorrecao ? 'Salvando...' : 'Salvar correção'}
                        </button>
                        <p className="mt-2 text-[10px] font-semibold text-amber-800">Use isso quando o moderador pontuar errado antes de pagar. Depois do pagamento, a correção deve ser feita por reembolso/regularização.</p>
                      </div>
                    )}

                    <button onClick={pagarManualmente} disabled={!vencedor || pagamentoProcessado} className="mt-3 w-full border border-emerald-600 bg-emerald-600 px-3 py-3 text-[12px] font-black uppercase text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300">
                      {pagamentoProcessado ? 'Pagamento validado' : 'Validar + pagar'}
                    </button>
                    <button onClick={reembolsarConfronto} disabled={pagamentoProcessado} className="mt-2 w-full border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-black uppercase text-rose-600 disabled:cursor-not-allowed disabled:opacity-50">
                      Reembolsar confronto
                    </button>
                  </div>

                  <div className="border border-slate-200 bg-white p-3">
                    <div className="mb-3 grid grid-cols-[58px_1fr_auto] items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center border border-slate-200 bg-slate-50 text-[28px]">{confrontoSelecionado.line_b_simbolo || '⚡'}</div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Equipe B</div>
                        <div className="truncate text-[28px] font-black uppercase leading-none">{confrontoSelecionado.line_b_nome || 'Lado B'}</div>
                      </div>
                      <div className="text-[32px] font-black text-rose-600">{roundsB}</div>
                    </div>
                    <div className="mb-3 h-2 border border-slate-200 bg-slate-50">
                      <div className="h-full bg-rose-600" style={{ width: `${pctRound(roundsB, limiteRounds)}%` }} />
                    </div>
                    <button disabled={!!registrandoRound || encerrado} onClick={() => registrarRound('B')} className="mb-3 w-full border border-rose-600 bg-rose-600 py-3 text-[13px] font-black uppercase text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300">
                      {registrandoRound === 'B' ? 'Registrando...' : '+ Round B'}
                    </button>
                    <div className="space-y-1">
                      {jogadoresB.length === 0 ? (
                        <div className="border border-slate-200 bg-slate-50 px-3 py-3 text-[12px] font-bold text-slate-500">Nenhum jogador carregado.</div>
                      ) : jogadoresB.map((j) => (
                        <label key={j.perfil_jogo_id} className="grid grid-cols-[1fr_70px] items-center gap-2">
                          <div className="border border-slate-300 bg-slate-50 px-3 py-2 text-[18px] font-black uppercase leading-none">{j.nick || 'Jogador'}</div>
                          <input type="number" min={0} value={abates[j.perfil_jogo_id] || 0} onChange={(e) => alterarAbate(j.perfil_jogo_id, e.target.value)} className="border border-rose-600 bg-rose-600 px-2 py-2 text-center text-[20px] font-black text-white outline-none" />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-black uppercase text-slate-500 sm:grid-cols-5">
                    <div>Valor: <span className="text-slate-950">{moeda(confrontoSelecionado.valor_por_lado)}</span></div>
                    <div>Total: <span className="text-slate-950">{moeda(confrontoSelecionado.valor_total)}</span></div>
                    <div>Prêmio: <span className="text-emerald-600">{moeda(confrontoSelecionado.valor_premio)}</span></div>
                    <div>Site: <span className="text-cyan-700">{moeda(confrontoSelecionado.valor_site)}</span></div>
                    <div>Criado: <span className="text-slate-950">{dataCurta(confrontoSelecionado.created_at)}</span></div>
                  </div>
                  <button onClick={salvarEstatisticas} disabled={salvandoKills || encerrado} className="border border-slate-950 bg-slate-950 px-4 py-2 text-[12px] font-black uppercase text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300">
                    {salvandoKills ? 'Salvando...' : 'Salvar estatísticas'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
