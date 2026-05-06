'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, Plus, Save, ShieldAlert, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MobileAction, MobileCard, MobileSectionTitle } from '../components/MobileShell'

type Equipe = { id: string; nome: string; tag?: string | null; logo_url?: string | null; descricao?: string | null }

export default function MobileEquipePage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [nome, setNome] = useState('')
  const [tag, setTag] = useState('')
  const [descricao, setDescricao] = useState('')

  async function carregar() {
    setLoading(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) {
      setErro('Entre na conta para gerenciar equipe.')
      setLoading(false)
      return
    }
    const { data } = await supabase.from('equipes').select('id,nome,tag,logo_url,descricao').eq('criado_por', user.id).order('created_at', { ascending: false })
    setEquipes((data || []) as Equipe[])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function criarEquipe(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) {
      setErro('Sessão expirada.')
      setSalvando(false)
      return
    }
    const { error } = await supabase.from('equipes').insert({ nome: nome.trim(), tag: tag.trim() || null, descricao: descricao.trim() || null, criado_por: user.id })
    if (error) setErro(error.message)
    else {
      setNome(''); setTag(''); setDescricao('')
      await carregar()
    }
    setSalvando(false)
  }

  return (
    <div className="space-y-3">
      <MobileCard className="bg-slate-950 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Equipe mobile</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">Minha equipe</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">Crie, edite e acesse lines pelo celular. Opções avançadas ficam no painel completo.</p>
      </MobileCard>

      {erro && <MobileCard className="border-red-200 bg-red-50"><div className="flex gap-3 text-sm font-bold text-red-700"><ShieldAlert size={18} /> {erro}</div></MobileCard>}

      <section>
        <MobileSectionTitle title="Minhas equipes" subtitle="Somente equipes criadas por você." />
        <div className="space-y-2">
          {loading && <MobileCard><p className="text-center text-xs font-black uppercase text-slate-500">Carregando...</p></MobileCard>}
          {!loading && equipes.length === 0 && <MobileCard><p className="text-center text-xs font-bold text-slate-500">Nenhuma equipe criada ainda.</p></MobileCard>}
          {equipes.map((equipe) => (
            <MobileCard key={equipe.id}>
              <div className="flex gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-50">
                  {equipe.logo_url ? <img src={equipe.logo_url} alt="" className="h-full w-full object-cover" /> : <Users size={20} className="text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-black uppercase tracking-[-0.03em]">{equipe.nome}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{equipe.tag || 'Sem tag'} • {equipe.descricao || 'Sem descrição'}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/m/lines" className="border border-blue-200 bg-blue-50 px-3 py-2 text-center text-[10px] font-black uppercase text-blue-700">Lines</Link>
                <Link href="/equipe" className="border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[10px] font-black uppercase text-slate-700">Avançado</Link>
              </div>
            </MobileCard>
          ))}
        </div>
      </section>

      <section>
        <MobileSectionTitle title="Criar equipe rápida" subtitle="Depois você pode completar logo, elenco e configurações." />
        <form onSubmit={criarEquipe} className="space-y-2 border border-slate-200 bg-white p-3">
          <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Nome da equipe" className="h-11 w-full border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-500" />
          <input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())} placeholder="TAG" className="h-11 w-full border border-slate-200 px-3 text-sm font-bold uppercase outline-none focus:border-blue-500" />
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição curta" className="min-h-20 w-full border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
          <button disabled={salvando} className="flex h-11 w-full items-center justify-center gap-2 bg-blue-600 text-[11px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-60">{salvando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Criar equipe</button>
        </form>
      </section>

      <MobileAction href="/equipe" label="Abrir gestão completa" desc="Elenco, convites, imagens e configurações avançadas" icon={Save} />
    </div>
  )
}
