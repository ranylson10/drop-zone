'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowDownLeft, CreditCard, History, Plus, ShieldCheck, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MobileAction, MobileCard, MobileSectionTitle } from '../components/MobileShell'

type Transacao = { id: string; tipo?: string | null; valor: number; status?: string | null; descricao?: string | null; created_at?: string | null }

function dinheiro(valor: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

export default function MobileCarteiraPage() {
  const [saldo, setSaldo] = useState(0)
  const [retido, setRetido] = useState(0)
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) { setLoading(false); return }
      const [{ data: saldoData }, { data: transData }] = await Promise.all([
        supabase.from('wallet_saldo').select('saldo,saldo_retido').eq('user_id', user.id).maybeSingle(),
        supabase.from('wallet_transacoes').select('id,tipo,valor,status,descricao,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
      ])
      if (ativo) {
        setSaldo(Number((saldoData as any)?.saldo || 0))
        setRetido(Number((saldoData as any)?.saldo_retido || 0))
        setTransacoes((transData || []) as Transacao[])
        setLoading(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [])

  return (
    <div className="space-y-3">
      <MobileCard className="bg-slate-950 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Carteira</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em]">{dinheiro(saldo)}</h1>
            <p className="mt-1 text-xs font-semibold text-slate-300">Retido: {dinheiro(retido)}</p>
          </div>
          <div className="grid h-12 w-12 place-items-center border border-blue-300 bg-blue-600"><Wallet size={22} /></div>
        </div>
      </MobileCard>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/carteira" className="flex h-12 items-center justify-center gap-2 border border-blue-200 bg-blue-50 text-[11px] font-black uppercase tracking-[0.1em] text-blue-700"><Plus size={15} /> Depositar</Link>
        <Link href="/carteira" className="flex h-12 items-center justify-center gap-2 border border-slate-200 bg-white text-[11px] font-black uppercase tracking-[0.1em] text-slate-700"><CreditCard size={15} /> Completa</Link>
      </div>

      <section>
        <MobileSectionTitle title="Últimas transações" subtitle="Resumo simples para celular." />
        <div className="space-y-2">
          {loading && <MobileCard><p className="text-center text-xs font-black uppercase text-slate-500">Carregando...</p></MobileCard>}
          {!loading && transacoes.length === 0 && <MobileCard><p className="text-center text-xs font-bold text-slate-500">Nenhuma transação encontrada.</p></MobileCard>}
          {transacoes.map((t) => (
            <MobileCard key={t.id}>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center border border-slate-200 bg-slate-50 text-blue-600"><ArrowDownLeft size={17} /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black uppercase">{t.descricao || t.tipo || 'Transação'}</p>
                  <p className="text-[11px] font-bold text-slate-500">{t.status || 'registrada'}</p>
                </div>
                <p className="text-sm font-black">{dinheiro(t.valor)}</p>
              </div>
            </MobileCard>
          ))}
        </div>
      </section>

      <MobileAction href="/carteira" label="Abrir carteira completa" desc="PIX, KYC, comprovantes e saques" icon={ShieldCheck} />
      <MobileAction href="/transparencia" label="Transparência" desc="Histórico e confiança da plataforma" icon={History} />
    </div>
  )
}
