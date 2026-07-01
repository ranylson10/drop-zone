'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminTabs from '../components/AdminTabs'
import { AlertTriangle, CheckCircle, Loader2, RefreshCcw, ShieldCheck, Unlock } from 'lucide-react'

type Alerta = { id: string; user_id: string | null; tipo: string | null; descricao: string | null; nivel: string | null; referencia_id: string | null; created_at: string }
type Bloqueio = { id: string; user_id: string; motivo: string; nivel: string; ativo: boolean; bloqueado_em: string; referencia_id: string | null }
type Score = { user_id: string; score: number; nivel: string; atualizado_em: string }

function badge(nivel?: string | null) {
  if (nivel === 'critico' || nivel === 'alto') return 'border-red-300 bg-red-50 text-red-700'
  if (nivel === 'medio') return 'border-amber-300 bg-amber-50 text-amber-700'
  return 'border-zinc-300 bg-zinc-50 text-zinc-600'
}

export default function AdminAntifraudePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [msg, setMsg] = useState('')

  async function carregar() {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) { router.push('/login'); return }
    const { data: admin } = await supabase.from('site_administradores').select('id').eq('user_id', user.id).eq('ativo', true).limit(1)
    if (!admin || admin.length === 0) { setAutorizado(false); setLoading(false); return }
    setAutorizado(true)

    const [a, b, s] = await Promise.all([
      supabase.from('antifraude_alertas').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('antifraude_bloqueios').select('*').eq('ativo', true).order('bloqueado_em', { ascending: false }).limit(100),
      supabase.from('antifraude_score').select('*').order('score', { ascending: false }).limit(100),
    ])
    setAlertas((a.data || []) as Alerta[])
    setBloqueios((b.data || []) as Bloqueio[])
    setScores((s.data || []) as Score[])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const resumo = useMemo(() => ({
    alertasAltos: alertas.filter((a) => a.nivel === 'alto' || a.nivel === 'critico').length,
    bloqueios: bloqueios.length,
    scoresAltos: scores.filter((s) => s.score >= 70).length,
    medios: scores.filter((s) => s.score >= 30 && s.score < 70).length,
  }), [alertas, bloqueios, scores])

  async function desbloquear(userId: string) {
    setMsg('')
    const { error } = await supabase.rpc('admin_desbloquear_usuario_antifraude', { p_user_id: userId })
    setMsg(error ? `Erro ao desbloquear: ${error.message}` : 'Usuário desbloqueado.')
    await carregar()
  }

  async function manutencao() {
    setMsg('')
    const { error } = await supabase.rpc('antifraude_manutencao_diaria')
    setMsg(error ? `Erro na manutenção: ${error.message}` : 'Cooldown/manutenção executado.')
    await carregar()
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#f7f7f7]"><Loader2 className="animate-spin text-[#2563eb]" size={42} /></div>
  if (!autorizado) return <div className="p-6"><div className="border border-red-200 bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-4 text-red-500" /><b>Acesso restrito</b></div></div>

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-[1700px] space-y-5 p-4 md:p-6">
        <div className="space-y-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">Administração LEALT</p><h1 className="mt-2 text-2xl font-semibold uppercase text-[#142340] md:text-3xl">Antifraude</h1><p className="mt-2 text-sm text-zinc-500">Score, alertas, bloqueios automáticos e desbloqueio manual.</p></div><AdminTabs /></div>
        {msg && <div className="border border-zinc-200 bg-white p-3 text-sm text-zinc-700">{msg}</div>}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[['Alertas altos', resumo.alertasAltos], ['Bloqueios ativos', resumo.bloqueios], ['Scores altos', resumo.scoresAltos], ['Scores médios', resumo.medios]].map(([l,v]) => <div key={String(l)} className="border border-zinc-200 bg-white p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{l}</p><p className="mt-2 text-3xl font-semibold text-[#142340]">{String(v)}</p></div>)}
        </section>
        <button onClick={manutencao} className="inline-flex items-center gap-2 border border-[#2563eb] bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2563eb] hover:bg-[#2563eb] hover:text-white"><RefreshCcw size={14} /> Rodar cooldown/manutenção</button>
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="border border-zinc-200 bg-white"><Header icon={<ShieldCheck size={16}/>} title="Bloqueios ativos" /> <div className="divide-y divide-zinc-200">{bloqueios.map(b => <div key={b.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#142340]">{b.user_id}</p><p className="mt-1 text-sm text-zinc-500">{b.motivo}</p><span className={`mt-2 inline-flex border px-2 py-1 text-[10px] font-semibold uppercase ${badge(b.nivel)}`}>{b.nivel}</span></div><button onClick={()=>desbloquear(b.user_id)} className="border border-zinc-200 p-2 text-[#2563eb] hover:border-[#2563eb]"><Unlock size={16}/></button></div></div>)}{bloqueios.length===0&&<Empty text="Nenhum bloqueio ativo."/>}</div></section>
          <section className="border border-zinc-200 bg-white"><Header icon={<AlertTriangle size={16}/>} title="Alertas recentes" /> <div className="divide-y divide-zinc-200">{alertas.map(a => <div key={a.id} className="p-4"><div className="flex justify-between gap-3"><b className="text-xs uppercase text-[#142340]">{a.tipo || 'alerta'}</b><span className={`border px-2 py-1 text-[10px] font-semibold uppercase ${badge(a.nivel)}`}>{a.nivel || 'baixo'}</span></div><p className="mt-2 text-sm text-zinc-600">{a.descricao}</p><p className="mt-2 text-xs text-zinc-400">{a.user_id || 'sistema'} • {new Date(a.created_at).toLocaleString('pt-BR')}</p></div>)}{alertas.length===0&&<Empty text="Sem alertas."/>}</div></section>
          <section className="border border-zinc-200 bg-white"><Header icon={<CheckCircle size={16}/>} title="Ranking de score" /> <div className="divide-y divide-zinc-200">{scores.map(s => <div key={s.user_id} className="grid grid-cols-[1fr_70px_80px] items-center gap-2 p-4"><span className="truncate text-xs text-[#142340]">{s.user_id}</span><b className="text-xl text-[#142340]">{s.score}</b><span className={`border px-2 py-1 text-center text-[10px] font-semibold uppercase ${badge(s.nivel)}`}>{s.nivel}</span></div>)}{scores.length===0&&<Empty text="Sem scores."/>}</div></section>
        </div>
      </div>
    </div>
  )
}

function Header({ title, icon }: { title: string; icon: any }) { return <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#142340]">{icon}{title}</div> }
function Empty({ text }: { text: string }) { return <div className="p-6 text-center text-sm text-zinc-500">{text}</div> }
