'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminTabs from '../components/AdminTabs'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

export default function AdminDiagnosticoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => {
    validar()
  }, [])

  async function validar() {
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

    setAutorizado(Boolean(admin?.length))
    setLoading(false)
  }

  if (loading) {
    return <main className="min-h-screen bg-[#f6f7fb] p-6"><Loader2 className="animate-spin" /></main>
  }

  if (!autorizado) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] p-6 text-red-700">
        <AlertTriangle /> Acesso restrito a administradores.
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6 text-[#142340]">
      <div className="mx-auto max-w-6xl space-y-6">
        <AdminTabs active="diagnostico" />
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Diagnóstico</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Checklist operacional</h1>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            Esta tela foi limpa para os módulos atuais. Os gráficos antigos de módulos financeiros antigos e disputas removidas foram desativados.
          </p>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {['Banco limpo', 'Pagamentos por PIX direto', 'Módulos antigos removidos'].map((item) => (
            <div key={item} className="rounded-2xl border border-emerald-200 bg-white p-5 text-emerald-700 shadow-sm">
              <CheckCircle2 className="mb-3" />
              <div className="text-sm font-black uppercase tracking-wide">{item}</div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
