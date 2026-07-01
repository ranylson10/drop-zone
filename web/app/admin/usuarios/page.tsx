'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminTabs from '../components/AdminTabs'
import { Ban, Loader2, Search, ShieldCheck, Unlock, Users } from 'lucide-react'

type Profile = { id: string; nome_exibicao: string | null; email?: string | null; created_at?: string | null }
type ScoreMap = Record<string, { score: number; nivel: string }>
type BloqMap = Record<string, boolean>

export default function AdminUsuariosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [scores, setScores] = useState<ScoreMap>({})
  const [bloqueios, setBloqueios] = useState<BloqMap>({})
  const [busca, setBusca] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) { router.push('/login'); return }
    const { data: admin } = await supabase.from('site_administradores').select('id').eq('user_id', user.id).eq('ativo', true).limit(1)
    if (!admin || admin.length === 0) { setAutorizado(false); setLoading(false); return }
    setAutorizado(true)

    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(300)
    const ids = (profiles || []).map((p: any) => p.id)
    const { data: scoreData } = ids.length ? await supabase.from('antifraude_score').select('*').in('user_id', ids) : { data: [] as any[] }
    const { data: bloqueioData } = ids.length ? await supabase.from('antifraude_bloqueios').select('*').eq('ativo', true).in('user_id', ids) : { data: [] as any[] }
    const sm: ScoreMap = {}; (scoreData || []).forEach((s: any) => sm[s.user_id] = { score: s.score, nivel: s.nivel })
    const bm: BloqMap = {}; (bloqueioData || []).forEach((b: any) => bm[b.user_id] = true)
    setUsuarios((profiles || []) as Profile[]); setScores(sm); setBloqueios(bm); setLoading(false)
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return usuarios
    return usuarios.filter(u => [u.id, u.nome_exibicao, u.email].filter(Boolean).some(v => String(v).toLowerCase().includes(termo)))
  }, [busca, usuarios])

  async function bloquear(userId: string) {
    setMsg('')
    const { error } = await supabase.from('antifraude_bloqueios').insert({ user_id: userId, motivo: 'Bloqueio manual pelo painel admin', nivel: 'alto', ativo: true })
    setMsg(error ? error.message : 'Usuário bloqueado.')
    await carregar()
  }

  async function desbloquear(userId: string) {
    setMsg('')
    const { error } = await supabase.rpc('admin_desbloquear_usuario_antifraude', { p_user_id: userId })
    setMsg(error ? error.message : 'Usuário desbloqueado.')
    await carregar()
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#f7f7f7]"><Loader2 className="animate-spin text-[#2563eb]" size={42} /></div>
  if (!autorizado) return <div className="p-6"><div className="border border-red-200 bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-4 text-red-500" /><b>Acesso restrito</b></div></div>

  return <div className="min-h-screen bg-[#f7f7f7]"><div className="mx-auto max-w-[1700px] space-y-5 p-4 md:p-6"><div className="space-y-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">Administração LEALT</p><h1 className="mt-2 text-2xl font-semibold uppercase text-[#142340] md:text-3xl">Usuários</h1><p className="mt-2 text-sm text-zinc-500">Consulta geral, score, bloqueio e desbloqueio manual.</p></div><AdminTabs /></div>{msg&&<div className="border border-zinc-200 bg-white p-3 text-sm text-zinc-700">{msg}</div>}<section className="border border-zinc-200 bg-white p-4"><label className="flex items-center gap-2 border border-zinc-200 px-3 py-2"><Search size={16} className="text-zinc-400"/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar usuário por nome, email ou ID" className="w-full bg-transparent text-sm outline-none"/></label></section><section className="overflow-hidden border border-zinc-200 bg-white"><div className="hidden grid-cols-[1fr_120px_110px_140px] border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 md:grid"><span>Usuário</span><span>Score</span><span>Status</span><span>Ações</span></div><div className="divide-y divide-zinc-200">{filtrados.map(u=><div key={u.id} className="grid gap-3 p-4 md:grid-cols-[1fr_120px_110px_140px] md:items-center"><div className="min-w-0"><p className="font-semibold text-[#142340]">{u.nome_exibicao || 'Sem nome'}</p><p className="truncate text-xs text-zinc-500">{u.id}</p></div><span className="font-semibold text-[#142340]">{scores[u.id]?.score ?? 0} <small className="text-zinc-400">{scores[u.id]?.nivel || 'baixo'}</small></span><span className={bloqueios[u.id]?'text-sm font-semibold text-red-600':'text-sm text-emerald-600'}>{bloqueios[u.id]?'bloqueado':'ativo'}</span><div>{bloqueios[u.id]?<button onClick={()=>desbloquear(u.id)} className="inline-flex items-center gap-2 border border-zinc-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]"><Unlock size={14}/>Desbloquear</button>:<button onClick={()=>bloquear(u.id)} className="inline-flex items-center gap-2 border border-red-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600"><Ban size={14}/>Bloquear</button>}</div></div>)}{filtrados.length===0&&<div className="p-8 text-center text-sm text-zinc-500"><Users className="mx-auto mb-2"/>Nenhum usuário encontrado.</div>}</div></section></div></div>
}
