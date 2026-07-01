'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShieldCheck, Wallet, Landmark, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'

type WalletKyc = {
 status?: string | null
}

type UsuarioPagamento = {
 nome?: string | null
 cpf?: string | null
 chave_pix?: string | null
 tipo_chave?: string | null
}

type Deposito = {
 id: string
 valor?: number | null
 created_at?: string | null
}

type Saque = {
 id: string
 valor?: number | null
 created_at?: string | null
}

function formatarDinheiro(valor: number) {
 return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarTipoPix(tipo?: string | null) {
 if (!tipo) return '—'
 return String(tipo).toUpperCase()
}

function formatarData(valor?: string | null) {
 if (!valor) return '—'
 try {
 return new Date(valor).toLocaleDateString('pt-BR')
 } catch {
 return valor
 }
}

function useAnimatedNumber(value: number, duration = 700) {
 const [display, setDisplay] = useState(0)

 useEffect(() => {
 const from = display
 const diff = value - from
 const startTime = performance.now()
 let raf = 0

 const tick = (now: number) => {
 const progress = Math.min((now - startTime) / duration, 1)
 const next = from + diff * progress
 setDisplay(next)
 if (progress < 1) raf = requestAnimationFrame(tick)
 }

 raf = requestAnimationFrame(tick)
 return () => cancelAnimationFrame(raf)
 }, [value])

 return display
}

export default function SaquePage() {
 const [valor, setValor] = useState('')
 const [saldo, setSaldo] = useState(0)
 const [saldoRetido, setSaldoRetido] = useState(0)
 const [mensagem, setMensagem] = useState('')
 const [bloqueado, setBloqueado] = useState(true)
 const [loading, setLoading] = useState(false)
 const [carregando, setCarregando] = useState(true)
 const [dadosPix, setDadosPix] = useState<UsuarioPagamento | null>(null)
 const [depositos, setDepositos] = useState<Deposito[]>([])
 const [saques, setSaques] = useState<Saque[]>([])

 const valorNumero = useMemo(() => Number(valor || 0), [valor])
 const saldoAnimado = useAnimatedNumber(saldo)
 const saldoRetidoAnimado = useAnimatedNumber(saldoRetido)

 useEffect(() => {
 carregar()
 }, [])

 async function carregar() {
 setCarregando(true)
 const { data } = await supabase.auth.getUser()
 const uid = data.user?.id
 if (!uid) {
 setCarregando(false)
 return
 }

 const [saldoRes, kycRes, pixRes, depositosRes, saquesRes] = await Promise.all([
 supabase.from('wallet_saldo').select('saldo, saldo_retido').eq('user_id', uid).single(),
 supabase.from('wallet_kyc').select('status').eq('user_id', uid).single(),
 supabase.from('usuarios_pagamento').select('nome, cpf, chave_pix, tipo_chave').eq('user_id', uid).single(),
 supabase
 .from('pagamentos_depositos')
 .select('id, valor, created_at')
 .eq('user_id', uid)
 .order('created_at', { ascending: false })
 .limit(6),
 supabase
 .from('pagamentos_saques')
 .select('id, valor, created_at')
 .eq('user_id', uid)
 .order('created_at', { ascending: false })
 .limit(6),
 ])

 setSaldo(Number(saldoRes.data?.saldo || 0))
 setSaldoRetido(Number(saldoRes.data?.saldo_retido || 0))
 setBloqueado(kycRes.data?.status !== 'verificada')
 setDadosPix((pixRes.data as UsuarioPagamento | null) || null)
 setDepositos((depositosRes.data as Deposito[]) || [])
 setSaques((saquesRes.data as Saque[]) || [])
 setCarregando(false)
 }

 const movimentacoes = useMemo(() => {
 const itens = [
 ...depositos.map((item) => ({
 id: `d-${item.id}`,
 tipo: 'deposito' as const,
 valor: Number(item.valor || 0),
 data: item.created_at || '',
 })),
 ...saques.map((item) => ({
 id: `s-${item.id}`,
 tipo: 'saque' as const,
 valor: Number(item.valor || 0),
 data: item.created_at || '',
 })),
 ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

 return itens.slice(-6)
 }, [depositos, saques])

 const maxMov = useMemo(() => {
 if (movimentacoes.length === 0) return 1
 return Math.max(...movimentacoes.map((item) => item.valor || 0), 1)
 }, [movimentacoes])

 async function solicitar() {
 setMensagem('')

 if (bloqueado) {
 setMensagem('Sua carteira precisa estar verificada antes do saque.')
 return
 }

 if (!dadosPix?.chave_pix) {
 setMensagem('Cadastre sua chave Pix antes de solicitar saque.')
 return
 }

 if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
 setMensagem('Informe um valor válido.')
 return
 }

 if (valorNumero > saldo) {
 setMensagem('Saldo insuficiente para esse saque.')
 return
 }

 setLoading(true)
 try {
 const { data } = await supabase.auth.getUser()
 const uid = data.user?.id

 await supabase.from('pagamentos_saques').insert({
 user_id: uid,
 valor: valorNumero,
 status: 'solicitado',
 })

 setMensagem('Saque solicitado com sucesso.')
 setValor('')
 await carregar()
 } catch (error: any) {
 setMensagem(error?.message || 'Não foi possível solicitar o saque.')
 } finally {
 setLoading(false)
 }
 }

 if (carregando) {
 return (
 <div className="mx-auto max-w-6xl p-8">
 <div className="border border-zinc-200 bg-white p-10 text-center">
 <div className="mx-auto h-3 w-44 overflow-hidden border border-zinc-200 bg-white">
 <div className="h-full w-1/2 animate-pulse bg-[#2563eb]" />
 </div>
 <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Carregando carteira...
 </div>
 </div>
 </div>
 )
 }

 return (
 <div className="mx-auto max-w-6xl p-8">
 <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
 <div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
 Financeiro
 </div>
 <h1 className="mt-2 text-3xl font-semibold uppercase text-[#142340]">Solicitar saque</h1>
 <p className="mt-2 text-sm font-semibold text-zinc-600">
 Retire saldo da plataforma usando sua chave Pix cadastrada.
 </p>
 </div>

 <div className={`inline-flex items-center gap-2 border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${
 bloqueado
 ? 'border-[#ff5c5c]/40 bg-white text-[#ff8a8a]'
 : 'border-[#2563eb]/30 bg-white text-[#9cff68]'
 }`}>
 <ShieldCheck size={14} />
 {bloqueado ? 'KYC pendente' : 'KYC aprovado'}
 </div>
 </div>

 <div className="grid gap-4 xl:grid-cols-[1fr,1fr,1.15fr]">
 <div className="border border-zinc-200 bg-white p-5">
 <div className="flex items-center justify-between">
 <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Saldo disponível
 </div>
 <Wallet size={16} className="text-[#2563eb]" />
 </div>
 <div className="mt-3 text-4xl font-semibold text-[#142340]">
 {formatarDinheiro(Number(saldoAnimado || 0))}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-5">
 <div className="flex items-center justify-between">
 <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Saldo retido
 </div>
 <Landmark size={16} className="text-[#ffb347]" />
 </div>
 <div className="mt-3 text-4xl font-semibold text-[#142340]">
 {formatarDinheiro(Number(saldoRetidoAnimado || 0))}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-5">
 <div className="flex items-center justify-between">
 <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Movimento recente
 </div>
 <TrendingUp size={16} className="text-[#00e5ff]" />
 </div>

 {movimentacoes.length === 0 ? (
 <div className="mt-6 text-sm font-semibold text-zinc-500">
 Sem movimentações recentes.
 </div>
 ) : (
 <div className="mt-4 flex h-24 items-end gap-2">
 {movimentacoes.map((item) => {
 const h = Math.max(14, Math.round((item.valor / maxMov) * 88))
 const cor = item.tipo === 'deposito' ? '#7cfc00' : '#ff9f43'
 return (
 <div key={item.id} className="flex flex-1 flex-col items-center gap-2">
 <div
 className="w-full border border-zinc-200"
 style={{ height: `${h}px`, backgroundColor: cor }}
 title={`${item.tipo} • ${formatarDinheiro(item.valor)}`}
 />
 <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
 {item.tipo === 'deposito' ? 'D' : 'S'}
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 </div>

 <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
 <div className="border border-zinc-200 bg-white p-5">
 <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Dados Pix cadastrados
 </div>

 <div className="grid gap-3 md:grid-cols-3">
 <div className="border border-zinc-200 bg-white p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Nome</div>
 <div className="mt-2 text-sm font-semibold uppercase text-[#142340] break-words">
 {dadosPix?.nome || 'Não cadastrado'}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Chave Pix</div>
 <div className="mt-2 text-sm font-semibold text-[#142340] break-all">
 {dadosPix?.chave_pix || 'Não cadastrada'}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Tipo</div>
 <div className="mt-2 text-sm font-semibold uppercase text-[#142340]">
 {formatarTipoPix(dadosPix?.tipo_chave)}
 </div>
 </div>
 </div>

 <div className="mt-4">
 <Link
 href="/perfil/pagamento"
 className="inline-flex border border-zinc-200 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340] hover:border-[#2563eb]/40"
 >
 Editar dados Pix
 </Link>
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-5">
 <div className="mb-4 flex items-center justify-between">
 <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Valor do saque
 </div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 Disponível: {formatarDinheiro(saldo)}
 </div>
 </div>

 <input
 placeholder="Digite o valor"
 value={valor}
 onChange={(e) => setValor(e.target.value)}
 className="h-12 w-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] placeholder:text-zinc-500 outline-none"
 />

 <div className="mt-3 grid gap-2 sm:grid-cols-3">
 {[50, 100, 200].map((v) => (
 <button
 key={v}
 type="button"
 onClick={() => setValor(String(v))}
 className="border border-zinc-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#142340] hover:border-[#2563eb]/40"
 >
 {formatarDinheiro(v)}
 </button>
 ))}
 </div>

 <button
 onClick={solicitar}
 disabled={loading || bloqueado}
 className="mt-4 flex h-12 w-full items-center justify-center gap-2 border border-zinc-200 bg-[#2563eb] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] disabled:opacity-60"
 >
 <ArrowUpRight size={16} />
 {loading ? 'Solicitando...' : 'Solicitar saque'}
 </button>

 {mensagem ? (
 <div className="mt-3 border border-zinc-200 bg-white p-3 text-sm font-semibold text-[#142340]">
 {mensagem}
 </div>
 ) : null}

 {bloqueado ? (
 <div className="mt-4 border border-zinc-200 bg-white p-4">
 <div className="text-sm font-semibold uppercase text-[#ffd66b]">Carteira não verificada</div>
 <p className="mt-1 text-sm font-semibold text-[#f6e2a3]">
 Finalize a verificação da carteira antes de sacar valores.
 </p>
 </div>
 ) : null}
 </div>
 </div>

 <div className="mt-4 grid gap-4 xl:grid-cols-2">
 <div className="border border-zinc-200 bg-white p-5">
 <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 <ArrowDownRight size={14} className="text-[#2563eb]" />
 Últimos depósitos
 </div>

 <div className="space-y-2">
 {depositos.length === 0 ? (
 <div className="border border-dashed border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-500">
 Nenhum depósito encontrado.
 </div>
 ) : (
 depositos.map((item) => (
 <div key={item.id} className="grid grid-cols-[1fr,auto] gap-3 border border-zinc-200 bg-white p-3">
 <div>
 <div className="text-sm font-semibold text-[#142340]">{formatarDinheiro(Number(item.valor || 0))}</div>
 <div className="text-[11px] font-semibold text-zinc-500">{formatarData(item.created_at)}</div>
 </div>
 <div className="text-[11px] font-semibold uppercase text-[#2563eb]">Depósito</div>
 </div>
 ))
 )}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-5">
 <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 <ArrowUpRight size={14} className="text-[#ff9f43]" />
 Últimos saques
 </div>

 <div className="space-y-2">
 {saques.length === 0 ? (
 <div className="border border-dashed border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-500">
 Nenhum saque encontrado.
 </div>
 ) : (
 saques.map((item) => (
 <div key={item.id} className="grid grid-cols-[1fr,auto] gap-3 border border-zinc-200 bg-white p-3">
 <div>
 <div className="text-sm font-semibold text-[#142340]">{formatarDinheiro(Number(item.valor || 0))}</div>
 <div className="text-[11px] font-semibold text-zinc-500">{formatarData(item.created_at)}</div>
 </div>
 <div className="text-[11px] font-semibold uppercase text-[#ff9f43]">Saque</div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>
 )
}
