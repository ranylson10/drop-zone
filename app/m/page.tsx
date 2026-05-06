'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CreditCard, Gamepad2, ShieldCheck, Trophy, UserPlus, Users, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MobileAction, MobileCard, MobileSectionTitle } from './components/MobileShell'

type Campeonato = {
  id: string
  nome: string
  modelo_competicao?: string | null
  tipo?: string | null
  horario_inicio?: string | null
  data_inicio?: string | null
  vagas?: number | null
  valor_vaga?: number | null
  valor_premiacao?: number | null
  logo_url?: string | null
}

function dinheiro(valor: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

function tipoInfo(campeonato: Campeonato) {
  const tipo = String(campeonato.modelo_competicao || campeonato.tipo || '').toLowerCase()
  if (tipo.includes('copa')) return { label: 'Copa', cls: 'border-purple-200 bg-purple-50 text-purple-700' }
  if (tipo.includes('liga')) return { label: 'Liga', cls: 'border-amber-200 bg-amber-50 text-amber-700' }
  if (tipo.includes('xtreino')) return { label: 'Xtreino', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
  if (tipo.includes('confronto') || tipo.includes('4x4')) return { label: 'Confronto', cls: 'border-red-200 bg-red-50 text-red-700' }
  return { label: 'Diário', cls: 'border-blue-200 bg-blue-50 text-blue-700' }
}

export default function MobileHomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logado, setLogado] = useState(false)
  const [saldo, setSaldo] = useState(0)
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!ativo) return
      setLogado(Boolean(user))

      if (!user) {
        setLoading(false)
        router.replace('/m/cadastro')
        return
      }

      if (user) {
        const { data: saldoData } = await supabase.from('wallet_saldo').select('saldo').eq('user_id', user.id).maybeSingle()
        if (ativo && saldoData) setSaldo(Number((saldoData as any).saldo || 0))
      }

      const { data } = await supabase
        .from('campeonatos')
        .select('id,nome,modelo_competicao,tipo,horario_inicio,data_inicio,vagas,valor_vaga,valor_premiacao,logo_url,status')
        .in('status', ['inscricoes', 'rascunho', 'em_andamento'])
        .order('created_at', { ascending: false })
        .limit(5)

      if (ativo) {
        setCampeonatos((data || []) as Campeonato[])
        setLoading(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [router])

  if (loading) {
    return <div className="border border-slate-200 bg-white p-4 text-center text-[12px] font-black uppercase tracking-[0.16em] text-slate-500">Carregando mobile...</div>
  }

  if (!logado) {
    return <div className="border border-slate-200 bg-white p-4 text-center text-[12px] font-black uppercase tracking-[0.16em] text-slate-500">Abrindo cadastro...</div>
  }

  return (
    <div className="space-y-3">
      <MobileCard className="bg-slate-950 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Resumo da conta</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-300">Saldo disponível</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.05em]">{dinheiro(saldo)}</h1>
          </div>
          <Link href="/m/carteira" className="border border-blue-300 bg-blue-600 px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em]">Depositar</Link>
        </div>
      </MobileCard>

      <section>
        <MobileSectionTitle title="Ações rápidas" subtitle="O essencial na primeira tela." />
        <div className="grid grid-cols-2 gap-2">
          <MobileAction href="/m/campeonatos" label="Inscrever" desc="Vagas abertas" icon={Trophy} />
          <MobileAction href="/m/equipe" label="Equipe" desc="Elenco" icon={Users} />
          <MobileAction href="/m/lines" label="Lines" desc="Titulares" icon={Gamepad2} />
          <MobileAction href="/m/carteira" label="Carteira" desc="PIX" icon={Wallet} />
        </div>
      </section>

      <section>
        <MobileSectionTitle title="Campeonatos recentes" subtitle="Toque para abrir detalhes e se inscrever." />
        <div className="space-y-2">
          {campeonatos.length === 0 && <MobileCard><p className="text-center text-xs font-bold text-slate-500">Nenhum campeonato encontrado.</p></MobileCard>}
          {campeonatos.map((camp) => {
            const info = tipoInfo(camp)
            return (
              <Link key={camp.id} href={`/m/campeonatos/${camp.id}`} className="block border border-slate-200 bg-white p-3 active:bg-slate-50">
                <div className="flex gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center border border-slate-200 bg-slate-50 overflow-hidden">
                    {camp.logo_url ? <img src={camp.logo_url} alt="" className="h-full w-full object-cover" /> : <Trophy size={20} className="text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${info.cls}`}>{info.label}</span>
                      <span className="text-[10px] font-bold text-slate-400">{camp.horario_inicio || 'Horário aberto'}</span>
                    </div>
                    <h3 className="mt-1 truncate text-[14px] font-black uppercase tracking-[-0.03em]">{camp.nome}</h3>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">Vagas: {camp.vagas || '-'} • Inscrição: {dinheiro(camp.valor_vaga)} • Prêmio: {dinheiro(camp.valor_premiacao)}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <MobileSectionTitle title="Ferramentas avançadas" subtitle="Para quem precisa explorar mais opções." />
        <div className="grid grid-cols-1 gap-2">
          <MobileAction href="/campeonatos" label="Abrir painel completo" desc="Desktop/avançado" icon={Trophy} />
          <MobileAction href="/carteira" label="Carteira completa" desc="KYC, saque e comprovantes" icon={CreditCard} />
        </div>
      </section>
    </div>
  )
}
