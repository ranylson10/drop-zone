'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminTabs from './components/AdminTabs'
import { AlertTriangle, BarChart3, FileSearch, Loader2, ShieldCheck, Trophy, Users } from 'lucide-react'

type Counts = {
  usuarios: number
  campeonatos: number
  equipes: number
  produtoras: number
  denunciasAbertas: number
  logsHoje: number
}

const vazio: Counts = {
  usuarios: 0,
  campeonatos: 0,
  equipes: 0,
  produtoras: 0,
  denunciasAbertas: 0,
  logsHoje: 0,
}

async function contar(tabela: string, query?: (q: any) => any) {
  try {
    let q = supabase.from(tabela).select('id', { count: 'exact', head: true })
    if (query) q = query(q)
    const { count } = await q
    return count || 0
  } catch {
    return 0
  }
}

function inicioDoDiaIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [counts, setCounts] = useState<Counts>(vazio)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)

    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user

    if (!user) {
      router.push('/login')
      return
    }

    const { data: admin } = await supabase
      .from('site_administradores')
      .select('id')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .limit(1)

    if (!admin || admin.length === 0) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    setAutorizado(true)

    const [usuarios, campeonatos, equipes, produtoras, denunciasAbertas, logsHoje] = await Promise.all([
      contar('profiles'),
      contar('campeonatos'),
      contar('equipes'),
      contar('produtoras'),
      contar('denuncias_campeonato', (q) => q.in('status', ['aberta', 'em_analise', 'pendente'])),
      contar('audit_logs', (q) => q.gte('created_at', inicioDoDiaIso())),
    ])

    setCounts({ usuarios, campeonatos, equipes, produtoras, denunciasAbertas, logsHoje })
    setLoading(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] p-6 text-[#142340]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <Loader2 className="animate-spin" size={18} /> Carregando painel administrativo...
        </div>
      </main>
    )
  }

  if (!autorizado) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] p-6 text-[#142340]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <AlertTriangle className="mb-3" /> Acesso restrito a administradores do site.
        </div>
      </main>
    )
  }

  const cards = [
    { titulo: 'Usuários', valor: counts.usuarios, href: '/admin/usuarios', icon: Users },
    { titulo: 'Campeonatos', valor: counts.campeonatos, href: '/campeonatos', icon: Trophy },
    { titulo: 'Equipes', valor: counts.equipes, href: '/equipe', icon: ShieldCheck },
    { titulo: 'Produtoras', valor: counts.produtoras, href: '/admin/produtoras', icon: BarChart3 },
    { titulo: 'Denúncias abertas', valor: counts.denunciasAbertas, href: '/admin/denuncias', icon: FileSearch },
    { titulo: 'Logs hoje', valor: counts.logsHoje, href: '/admin/auditoria', icon: ShieldCheck },
  ]

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6 text-[#142340]">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminTabs active="dashboard" />

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Admin</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Painel geral limpo</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-zinc-500">
            Visão administrativa focada nos módulos mantidos: usuários, equipes, campeonatos, produtoras, denúncias e auditoria.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.titulo} href={card.href} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">{card.titulo}</p>
                    <p className="mt-2 text-3xl font-black">{card.valor}</p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-zinc-200 bg-zinc-50">
                    <Icon size={20} />
                  </span>
                </div>
              </Link>
            )
          })}
        </section>
      </div>
    </main>
  )
}
