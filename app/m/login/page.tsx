'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ensureUserProfile } from '@/lib/profileBootstrap'
import { DropZoneLogo } from '@/app/components/DropZoneLogo'

export default function MobileLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) {
      setErro('E-mail ou senha inválidos.')
      setLoading(false)
      return
    }
    if (data.user) {
      await ensureUserProfile({ userId: data.user.id, email: data.user.email, username: data.user.user_metadata?.username })
    }
    router.push('/m')
    router.refresh()
  }

  return (
    <section className="flex min-h-[calc(100vh-90px)] items-center justify-center py-4">
      <form onSubmit={entrar} className="w-full border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="grid h-14 w-14 place-items-center border border-slate-200 bg-white"><DropZoneLogo size="md" animated /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">LEALT Mobile</p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">Entrar</h1>
          </div>
        </div>

        {erro && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div>}

        <label className="mt-4 block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">E-mail</span>
          <div className="flex h-12 border border-slate-200 bg-white focus-within:border-blue-500">
            <div className="grid w-12 place-items-center border-r border-slate-200 text-slate-400"><Mail size={16} /></div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="min-w-0 flex-1 px-3 text-sm font-bold outline-none" placeholder="seu@email.com" />
          </div>
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Senha</span>
          <div className="flex h-12 border border-slate-200 bg-white focus-within:border-blue-500">
            <div className="grid w-12 place-items-center border-r border-slate-200 text-slate-400"><Lock size={16} /></div>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="min-w-0 flex-1 px-3 text-sm font-bold outline-none" placeholder="Sua senha" />
          </div>
        </label>

        <button disabled={loading} className="mt-4 flex h-12 w-full items-center justify-center gap-2 bg-blue-600 text-[12px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Entrar
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/m/cadastro" className="border border-slate-200 bg-slate-50 px-3 py-3 text-center text-[11px] font-black uppercase text-slate-700">Criar conta</Link>
          <Link href="/m/recuperar-senha" className="border border-slate-200 bg-slate-50 px-3 py-3 text-center text-[11px] font-black uppercase text-slate-700">Esqueci senha</Link>
        </div>
      </form>
    </section>
  )
}
