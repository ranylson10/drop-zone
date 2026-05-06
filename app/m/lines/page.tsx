'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Gamepad2, Loader2, Plus, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MobileAction, MobileCard, MobileSectionTitle } from '../components/MobileShell'

type Equipe = { id: string; nome: string }
type Line = { id: string; nome: string; equipe_id: string; tipo?: string | null; ativa?: boolean | null }

export default function MobileLinesPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [equipeId, setEquipeId] = useState('')
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('principal')

  async function carregar() {
    setLoading(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) {
      setErro('Entre na conta para gerenciar lines.')
      setLoading(false)
      return
    }
    const { data: equipesData } = await supabase.from('equipes').select('id,nome').eq('criado_por', user.id).order('created_at', { ascending: false })
    const equipeIds = (equipesData || []).map((e: any) => e.id)
    let linesData: any[] = []
    if (equipeIds.length) {
      const { data } = await supabase.from('equipes_lines').select('id,nome,equipe_id,tipo,ativa').in('equipe_id', equipeIds).order('created_at', { ascending: false })
      linesData = data || []
    }
    setEquipes((equipesData || []) as Equipe[])
    setLines(linesData as Line[])
    if (equipesData?.[0]?.id) setEquipeId(equipesData[0].id)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function criarLine(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!equipeId) return setErro('Crie ou escolha uma equipe primeiro.')
    setSalvando(true)
    const { error } = await supabase.from('equipes_lines').insert({ equipe_id: equipeId, nome: nome.trim(), tipo, ativa: true })
    if (error) setErro(error.message)
    else { setNome(''); await carregar() }
    setSalvando(false)
  }

  return (
    <div className="space-y-3">
      <MobileCard className="bg-slate-950 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Elenco competitivo</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">Lines</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">Crie lines rápido. Para adicionar/remover jogadores, use o painel completo enquanto finalizamos a versão guiada.</p>
      </MobileCard>

      {erro && <MobileCard className="border-red-200 bg-red-50"><div className="flex gap-3 text-sm font-bold text-red-700"><ShieldAlert size={18} /> {erro}</div></MobileCard>}

      <section>
        <MobileSectionTitle title="Minhas lines" subtitle="Agrupadas pelas equipes criadas por você." />
        <div className="space-y-2">
          {loading && <MobileCard><p className="text-center text-xs font-black uppercase text-slate-500">Carregando...</p></MobileCard>}
          {!loading && lines.length === 0 && <MobileCard><p className="text-center text-xs font-bold text-slate-500">Nenhuma line criada ainda.</p></MobileCard>}
          {lines.map((line) => {
            const equipe = equipes.find((e) => e.id === line.equipe_id)
            return <MobileCard key={line.id}><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center border border-blue-200 bg-blue-50 text-blue-600"><Gamepad2 size={18} /></div><div><p className="text-[14px] font-black uppercase">{line.nome}</p><p className="text-[11px] font-bold text-slate-500">{equipe?.nome || 'Equipe'} • {line.tipo || 'line'} • {line.ativa === false ? 'inativa' : 'ativa'}</p></div></div></MobileCard>
          })}
        </div>
      </section>

      <section>
        <MobileSectionTitle title="Criar line rápida" subtitle="Configuração básica para inscrição mobile." />
        <form onSubmit={criarLine} className="space-y-2 border border-slate-200 bg-white p-3">
          <select value={equipeId} onChange={(e) => setEquipeId(e.target.value)} className="h-11 w-full border border-slate-200 px-3 text-sm font-black uppercase outline-none focus:border-blue-500">
            {equipes.length === 0 && <option value="">Crie uma equipe primeiro</option>}
            {equipes.map((equipe) => <option key={equipe.id} value={equipe.id}>{equipe.nome}</option>)}
          </select>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Nome da line" className="h-11 w-full border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-500" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-11 w-full border border-slate-200 px-3 text-sm font-black uppercase outline-none focus:border-blue-500">
            <option value="principal">Principal</option>
            <option value="base">Base</option>
            <option value="teste">Teste</option>
          </select>
          <button disabled={salvando} className="flex h-11 w-full items-center justify-center gap-2 bg-blue-600 text-[11px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-60">{salvando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Criar line</button>
        </form>
      </section>

      <MobileAction href="/equipe" label="Gerenciar jogadores" desc="Adicionar, remover e configurar elenco completo" icon={Gamepad2} />
    </div>
  )
}
