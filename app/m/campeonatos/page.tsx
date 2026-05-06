'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Search, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MobileCard, MobileSectionTitle } from '../components/MobileShell'

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
  status?: string | null
}

const filtros = [
  { key: 'todos', label: 'Todos', cls: 'border-slate-200 bg-white text-slate-700' },
  { key: 'diario', label: 'Diário', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  { key: 'xtreino', label: 'Xtreino', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { key: 'copa', label: 'Copa', cls: 'border-purple-200 bg-purple-50 text-purple-700' },
  { key: 'liga', label: 'Liga', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  { key: 'confronto', label: 'Confronto', cls: 'border-red-200 bg-red-50 text-red-700' },
]

function dinheiro(valor: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

function normalizarTipo(c: Campeonato) {
  const raw = String(c.modelo_competicao || c.tipo || '').toLowerCase()
  if (raw.includes('xtreino')) return 'xtreino'
  if (raw.includes('copa')) return 'copa'
  if (raw.includes('liga')) return 'liga'
  if (raw.includes('confronto') || raw.includes('4x4')) return 'confronto'
  return 'diario'
}

export default function MobileCampeonatosPage() {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data } = await supabase
        .from('campeonatos')
        .select('id,nome,modelo_competicao,tipo,horario_inicio,data_inicio,vagas,valor_vaga,valor_premiacao,logo_url,status,created_at')
        .order('created_at', { ascending: false })
        .limit(80)
      if (ativo) {
        setCampeonatos((data || []) as Campeonato[])
        setLoading(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [])

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return campeonatos.filter((c) => {
      const tipo = normalizarTipo(c)
      if (filtro !== 'todos' && tipo !== filtro) return false
      if (termo && !c.nome.toLowerCase().includes(termo)) return false
      return true
    })
  }, [campeonatos, filtro, busca])

  return (
    <div className="space-y-3">
      <MobileCard className="bg-slate-950 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Competitivo</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">Campeonatos</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">Lista simplificada para entrar rápido pelo celular.</p>
      </MobileCard>

      <div className="flex h-11 border border-slate-200 bg-white focus-within:border-blue-500">
        <div className="grid w-11 place-items-center border-r border-slate-200 text-slate-400"><Search size={15} /></div>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar campeonato" className="min-w-0 flex-1 px-3 text-sm font-bold outline-none" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filtros.map((item) => (
          <button key={item.key} onClick={() => setFiltro(item.key)} className={`shrink-0 border px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] ${filtro === item.key ? item.cls : 'border-slate-200 bg-white text-slate-500'}`}>{item.label}</button>
        ))}
      </div>

      <section>
        <MobileSectionTitle title="Disponíveis" subtitle="Toque em um campeonato para ver detalhes." />
        <div className="space-y-2">
          {loading && <MobileCard><p className="text-center text-xs font-black uppercase text-slate-500">Carregando...</p></MobileCard>}
          {!loading && lista.length === 0 && <MobileCard><p className="text-center text-xs font-bold text-slate-500">Nenhum campeonato encontrado.</p></MobileCard>}
          {lista.map((camp) => {
            const tipo = normalizarTipo(camp)
            const info = filtros.find((f) => f.key === tipo) || filtros[0]
            return (
              <Link key={camp.id} href={`/m/campeonatos/${camp.id}`} className="block border border-slate-200 bg-white p-3 active:bg-slate-50">
                <div className="flex gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-50">
                    {camp.logo_url ? <img src={camp.logo_url} alt="" className="h-full w-full object-cover" /> : <Trophy size={22} className="text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${info.cls}`}>{info.label}</span>
                      <span className="text-[10px] font-bold uppercase text-slate-400">{camp.status || 'aberto'}</span>
                    </div>
                    <h3 className="mt-1 truncate text-[15px] font-black uppercase tracking-[-0.03em]">{camp.nome}</h3>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">Vagas {camp.vagas || '-'} • {dinheiro(camp.valor_vaga)} • Prêmio {dinheiro(camp.valor_premiacao)}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
