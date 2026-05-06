'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CalendarDays, CreditCard, Trophy, Users, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MobileAction, MobileCard, MobileSectionTitle } from '../../components/MobileShell'

type Campeonato = any

function dinheiro(valor: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

function tipoInfo(c: Campeonato) {
  const raw = String(c?.modelo_competicao || c?.tipo || '').toLowerCase()
  if (raw.includes('xtreino')) return { label: 'XTREINO', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' }
  if (raw.includes('copa')) return { label: 'COPA', cls: 'border-purple-200 bg-purple-50 text-purple-700', bar: 'bg-purple-500' }
  if (raw.includes('liga')) return { label: 'LIGA', cls: 'border-amber-200 bg-amber-50 text-amber-700', bar: 'bg-amber-500' }
  if (raw.includes('confronto') || raw.includes('4x4')) return { label: 'CONFRONTO', cls: 'border-red-200 bg-red-50 text-red-700', bar: 'bg-red-500' }
  return { label: 'DIÁRIO', cls: 'border-blue-200 bg-blue-50 text-blue-700', bar: 'bg-blue-500' }
}

export default function MobileCampeonatoDetalhePage() {
  const params = useParams<{ id: string }>()
  const [camp, setCamp] = useState<Campeonato | null>(null)
  const [saldo, setSaldo] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (user) {
        const { data: saldoData } = await supabase.from('wallet_saldo').select('saldo').eq('user_id', user.id).maybeSingle()
        if (ativo && saldoData) setSaldo(Number((saldoData as any).saldo || 0))
      }
      const { data } = await supabase.from('campeonatos').select('*').eq('id', params.id).maybeSingle()
      if (ativo) {
        setCamp(data)
        setLoading(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [params.id])

  if (loading) return <MobileCard><p className="text-center text-xs font-black uppercase text-slate-500">Carregando campeonato...</p></MobileCard>
  if (!camp) return <MobileCard><p className="text-center text-xs font-bold text-slate-500">Campeonato não encontrado.</p></MobileCard>

  const info = tipoInfo(camp)
  const valor = Number(camp.valor_vaga || camp.valor_inscricao || 0)
  const podePagar = saldo >= valor

  return (
    <div className="space-y-3">
      <MobileCard className="overflow-hidden p-0">
        <div className={`h-1.5 ${info.bar}`} />
        <div className="p-3">
          <div className="flex gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-50">
              {camp.logo_url ? <img src={camp.logo_url} alt="" className="h-full w-full object-cover" /> : <Trophy size={24} className="text-slate-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <span className={`inline-flex border px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${info.cls}`}>{info.label}</span>
              <h1 className="mt-2 text-[24px] font-black uppercase leading-[0.95] tracking-[-0.045em] text-slate-950">{camp.nome}</h1>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 line-clamp-2">{camp.descricao || 'Campeonato competitivo Drop Zone.'}</p>
            </div>
          </div>
        </div>
      </MobileCard>

      <MobileCard className="p-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200">
          <div className="p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Vagas</p>
            <p className="mt-1 text-lg font-black">{camp.vagas || camp.quantidade_equipes || '-'}</p>
          </div>
          <div className="p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Inscrição</p>
            <p className="mt-1 text-lg font-black">{dinheiro(valor)}</p>
          </div>
          <div className="p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Premiação</p>
            <p className="mt-1 text-lg font-black">{dinheiro(camp.valor_premiacao)}</p>
          </div>
          <div className="p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Saldo</p>
            <p className="mt-1 text-lg font-black">{dinheiro(saldo)}</p>
          </div>
        </div>
      </MobileCard>

      <MobileCard className={podePagar ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}>
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center border border-white/70 bg-white"><Wallet size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black uppercase">{podePagar ? 'Saldo suficiente' : 'Saldo insuficiente'}</p>
            <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-600">{podePagar ? 'Você pode seguir para inscrição usando a carteira.' : 'Deposite saldo na carteira antes de concluir a inscrição.'}</p>
          </div>
        </div>
      </MobileCard>

      <section>
        <MobileSectionTitle title="Ações" subtitle="Fluxo simples no celular, avançado no painel completo." />
        <div className="grid grid-cols-1 gap-2">
          <MobileAction href={`/m/campeonatos/${camp.id}/inscrever`} label="Inscrever pelo celular" desc="Escolher equipe, line e pagar com saldo" icon={CreditCard} />
          <MobileAction href={`/campeonatos/${camp.id}`} label="Abrir versão completa" desc="Tabela, súmula, estatísticas e configurações" icon={Trophy} />
          <MobileAction href="/m/equipe" label="Preparar equipe" desc="Editar elenco e lines antes de entrar" icon={Users} />
          <MobileAction href="/m/carteira" label="Depositar saldo" desc="PIX e histórico financeiro" icon={Wallet} />
        </div>
      </section>
    </div>
  )
}
