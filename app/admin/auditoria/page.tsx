'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminTabs from '../components/AdminTabs'
import { Database, FileSearch, Loader2, Search, ShieldCheck } from 'lucide-react'

type Log = { id: string; user_id: string | null; acao: string; entidade: string; entidade_id: string | null; dados_antigos: any; dados_novos: any; risco: string; created_at: string }

function riscoClass(risco: string) {
  if (risco === 'alto') return 'border-red-300 bg-red-50 text-red-700'
  if (risco === 'medio') return 'border-amber-300 bg-amber-50 text-amber-700'
  return 'border-zinc-300 bg-zinc-50 text-zinc-600'
}

export default function AdminAuditoriaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [logs, setLogs] = useState<Log[]>([])
  const [busca, setBusca] = useState('')
  const [risco, setRisco] = useState('todos')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) { router.push('/login'); return }
    const { data: admin } = await supabase.from('site_administradores').select('id').eq('user_id', user.id).eq('ativo', true).limit(1)
    if (!admin || admin.length === 0) { setAutorizado(false); setLoading(false); return }
    setAutorizado(true)
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500)
    setLogs((data || []) as Log[])
    setLoading(false)
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return logs.filter((log) => {
      const matchRisco = risco === 'todos' || log.risco === risco
      const matchBusca = !termo || [log.acao, log.entidade, log.entidade_id, log.user_id, log.id].filter(Boolean).some(v => String(v).toLowerCase().includes(termo))
      return matchRisco && matchBusca
    })
  }, [busca, logs, risco])

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#f7f7f7]"><Loader2 className="animate-spin text-[#2563eb]" size={42} /></div>
  if (!autorizado) return <div className="p-6"><div className="border border-red-200 bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-4 text-red-500" /><b>Acesso restrito</b></div></div>

  return (
    <div className="min-h-screen bg-[#f7f7f7]"><div className="mx-auto max-w-[1700px] space-y-5 p-4 md:p-6">
      <div className="space-y-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">Administração LEALT</p><h1 className="mt-2 text-2xl font-semibold uppercase text-[#142340] md:text-3xl">Auditoria</h1><p className="mt-2 text-sm text-zinc-500">Rastro completo de alterações críticas no banco.</p></div><AdminTabs /></div>
      <section className="grid gap-3 border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_180px]">
        <label className="flex items-center gap-2 border border-zinc-200 px-3 py-2"><Search size={16} className="text-zinc-400"/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por usuário, tabela, ação ou ID" className="w-full bg-transparent text-sm outline-none"/></label>
        <select value={risco} onChange={e=>setRisco(e.target.value)} className="border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"><option value="todos">Todos riscos</option><option value="baixo">Baixo</option><option value="medio">Médio</option><option value="alto">Alto</option></select>
      </section>
      <section className="overflow-hidden border border-zinc-200 bg-white">
        <div className="hidden grid-cols-[120px_170px_1fr_180px_120px_160px] border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 md:grid"><span>Ação</span><span>Entidade</span><span>ID</span><span>Usuário</span><span>Risco</span><span>Data</span></div>
        <div className="divide-y divide-zinc-200">
          {filtrados.map(log => <details key={log.id} className="group"><summary className="grid cursor-pointer gap-3 p-4 hover:bg-zinc-50 md:grid-cols-[120px_170px_1fr_180px_120px_160px] md:items-center"><b className="text-xs uppercase text-[#142340]">{log.acao}</b><span className="text-xs text-zinc-600">{log.entidade}</span><span className="truncate text-xs text-zinc-500">{log.entidade_id || '-'}</span><span className="truncate text-xs text-zinc-500">{log.user_id || 'sistema'}</span><span className={`w-fit border px-2 py-1 text-[10px] font-semibold uppercase ${riscoClass(log.risco)}`}>{log.risco}</span><span className="text-xs text-zinc-500">{new Date(log.created_at).toLocaleString('pt-BR')}</span></summary><div className="grid gap-3 border-t border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2"><pre className="overflow-auto border border-zinc-200 bg-white p-3 text-xs"><Database size={14}/>\n{JSON.stringify(log.dados_antigos, null, 2)}</pre><pre className="overflow-auto border border-zinc-200 bg-white p-3 text-xs"><FileSearch size={14}/>\n{JSON.stringify(log.dados_novos, null, 2)}</pre></div></details>)}
          {filtrados.length===0 && <div className="p-8 text-center text-sm text-zinc-500">Nenhum log encontrado.</div>}
        </div>
      </section>
    </div></div>
  )
}
