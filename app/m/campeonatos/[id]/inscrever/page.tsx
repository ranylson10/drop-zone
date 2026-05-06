'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CreditCard, Loader2, ShieldAlert, Users, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MobileCard, MobileSectionTitle } from '../../../components/MobileShell'

type Equipe = { id: string; nome: string; tag?: string | null; logo_url?: string | null }
type Line = { id: string; nome: string; equipe_id: string; tipo?: string | null }

type Campeonato = any

function dinheiro(valor: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

export default function MobileInscreverPage() {
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [camp, setCamp] = useState<Campeonato | null>(null)
  const [saldo, setSaldo] = useState(0)
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [equipeId, setEquipeId] = useState('')
  const [lineId, setLineId] = useState('')

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        if (ativo) {
          setErro('Entre na sua conta para se inscrever.')
          setLoading(false)
        }
        return
      }

      const [{ data: campeonatoData }, { data: saldoData }, { data: equipesData }] = await Promise.all([
        supabase.from('campeonatos').select('*').eq('id', params.id).maybeSingle(),
        supabase.from('wallet_saldo').select('saldo').eq('user_id', user.id).maybeSingle(),
        supabase.from('equipes').select('id,nome,tag,logo_url').eq('criado_por', user.id).order('created_at', { ascending: false }),
      ])

      const equipeIds = (equipesData || []).map((e: any) => e.id)
      let linesData: any[] = []
      if (equipeIds.length) {
        const { data } = await supabase.from('equipes_lines').select('id,nome,equipe_id,tipo').in('equipe_id', equipeIds).eq('ativa', true).order('created_at', { ascending: false })
        linesData = data || []
      }

      if (ativo) {
        setCamp(campeonatoData)
        setSaldo(Number((saldoData as any)?.saldo || 0))
        setEquipes((equipesData || []) as Equipe[])
        setLines(linesData as Line[])
        if (equipesData?.[0]?.id) setEquipeId(equipesData[0].id)
        if (linesData?.[0]?.id) setLineId(linesData[0].id)
        setLoading(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [params.id])

  const valor = Number(camp?.valor_vaga || camp?.valor_inscricao || 0)
  const linesDaEquipe = useMemo(() => lines.filter((line) => line.equipe_id === equipeId), [lines, equipeId])

  async function confirmar() {
    setErro(null)
    if (!camp) return
    if (!equipeId) return setErro('Escolha uma equipe sua para continuar.')
    if (valor > saldo) return setErro('Saldo insuficiente. Deposite na carteira antes de confirmar.')

    setSalvando(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) {
      setErro('Sessão expirada. Entre novamente.')
      setSalvando(false)
      return
    }

    const equipe = equipes.find((e) => e.id === equipeId)
    const { error } = await supabase.from('campeonato_equipes').insert({
      campeonato_id: camp.id,
      equipe_id: equipeId,
      line_id: lineId || null,
      status: 'ativa',
      origem_inscricao: 'site_mobile',
      status_pagamento: valor > 0 ? 'pendente_carteira' : 'gratuito',
      valor_vaga_pago: valor,
      registrado_por: user.id,
      forma_pagamento: valor > 0 ? 'carteira' : 'gratuito',
      nome_exibicao: equipe?.nome || null,
      tipo_entrada: 'compra',
    })

    if (error) {
      setErro(error.message || 'Não foi possível salvar a inscrição.')
      setSalvando(false)
      return
    }

    setConcluido(true)
    setSalvando(false)
  }

  if (loading) return <MobileCard><p className="text-center text-xs font-black uppercase text-slate-500">Carregando inscrição...</p></MobileCard>

  if (concluido) {
    return (
      <div className="space-y-3">
        <MobileCard className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 size={34} className="text-emerald-600" />
          <h1 className="mt-3 text-2xl font-black uppercase tracking-[-0.05em] text-emerald-800">Inscrição enviada</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-emerald-700">Sua inscrição foi registrada. O organizador poderá validar a vaga conforme as regras do campeonato.</p>
        </MobileCard>
        <Link href={`/m/campeonatos/${params.id}`} className="block border border-slate-200 bg-white px-4 py-3 text-center text-[12px] font-black uppercase tracking-[0.12em] text-slate-700">Voltar ao campeonato</Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <MobileCard className="bg-slate-950 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Inscrição mobile</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">{camp?.nome || 'Campeonato'}</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">Escolha sua equipe, line e confirme usando saldo da carteira.</p>
      </MobileCard>

      {erro && <MobileCard className="border-red-200 bg-red-50"><div className="flex gap-3 text-sm font-bold text-red-700"><ShieldAlert size={18} /> {erro}</div></MobileCard>}

      <section>
        <MobileSectionTitle title="1. Equipe" subtitle="Só aparecem equipes criadas por você." />
        <MobileCard>
          {equipes.length === 0 ? (
            <div>
              <p className="text-sm font-bold text-slate-600">Você ainda não tem equipe cadastrada.</p>
              <Link href="/m/equipe" className="mt-3 block border border-blue-200 bg-blue-50 px-3 py-3 text-center text-[11px] font-black uppercase text-blue-700">Criar equipe</Link>
            </div>
          ) : (
            <select value={equipeId} onChange={(e) => { setEquipeId(e.target.value); setLineId('') }} className="h-12 w-full border border-slate-200 bg-white px-3 text-sm font-black uppercase outline-none">
              {equipes.map((equipe) => <option key={equipe.id} value={equipe.id}>{equipe.tag ? `${equipe.tag} - ` : ''}{equipe.nome}</option>)}
            </select>
          )}
        </MobileCard>
      </section>

      <section>
        <MobileSectionTitle title="2. Line" subtitle="Opcional, mas recomendado para campeonatos por equipe." />
        <MobileCard>
          {linesDaEquipe.length === 0 ? (
            <div>
              <p className="text-sm font-bold text-slate-600">Nenhuma line ativa nessa equipe.</p>
              <Link href="/m/lines" className="mt-3 block border border-blue-200 bg-blue-50 px-3 py-3 text-center text-[11px] font-black uppercase text-blue-700">Criar line</Link>
            </div>
          ) : (
            <select value={lineId} onChange={(e) => setLineId(e.target.value)} className="h-12 w-full border border-slate-200 bg-white px-3 text-sm font-black uppercase outline-none">
              <option value="">Sem line definida</option>
              {linesDaEquipe.map((line) => <option key={line.id} value={line.id}>{line.nome}</option>)}
            </select>
          )}
        </MobileCard>
      </section>

      <section>
        <MobileSectionTitle title="3. Pagamento" subtitle="Confirmação simplificada pela carteira." />
        <div className="grid grid-cols-2 gap-2">
          <MobileCard><Wallet size={18} className="text-blue-600" /><p className="mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Saldo</p><p className="text-lg font-black">{dinheiro(saldo)}</p></MobileCard>
          <MobileCard><CreditCard size={18} className="text-blue-600" /><p className="mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Inscrição</p><p className="text-lg font-black">{dinheiro(valor)}</p></MobileCard>
        </div>
      </section>

      <button disabled={salvando || !equipeId} onClick={confirmar} className="flex h-12 w-full items-center justify-center gap-2 bg-blue-600 text-[12px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-60">
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Confirmar inscrição
      </button>
    </div>
  )
}
