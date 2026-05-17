'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ensureUserProfile } from '@/lib/profileBootstrap'
import { DropZoneLogo } from '@/app/components/DropZoneLogo'

function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(37,99,235,0.30),transparent_34%),radial-gradient(circle_at_15%_25%,rgba(249,115,22,0.16),transparent_28%),linear-gradient(135deg,#020617_0%,#07111f_46%,#020617_100%)]" />
      <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(59,130,246,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute -left-24 top-20 h-72 w-72 animate-pulse rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute -right-24 bottom-20 h-80 w-80 animate-pulse rounded-full bg-orange-500/10 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
      <div className="relative w-full max-w-[430px]">{children}</div>
    </section>
  )
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-blue-400/25 bg-slate-950/78 p-5 shadow-[0_28px_120px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.045),transparent)]" />
      {children}
    </div>
  )
}

function Field({ icon: Icon, label, ...props }: any) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/80">{label}</span>
      <div className="flex h-[52px] items-center rounded-2xl border border-white/10 bg-white/[0.055] text-slate-100 transition focus-within:border-blue-400 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_35px_rgba(37,99,235,0.20)]">
        <div className="grid h-full w-12 place-items-center border-r border-white/10 text-blue-300"><Icon size={17} /></div>
        <input {...props} className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold text-white outline-none placeholder:text-slate-500" />
      </div>
    </label>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let ativo = true
    async function verificarSessao() {
      const { data } = await supabase.auth.getSession()
      if (!ativo) return
      if (data.session?.user) router.replace('/feed')
      setCheckingSession(false)
    }
    verificarSessao()
    return () => { ativo = false }
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) {
      setError('E-mail ou senha inválidos. Confira os dados e tente novamente.')
      setLoading(false)
      return
    }
    try {
      if (data.user) await ensureUserProfile({ userId: data.user.id, email: data.user.email, username: data.user.user_metadata?.username })
      router.push('/feed')
      router.refresh()
    } catch (profileError: unknown) {
      setError(profileError instanceof Error ? profileError.message : 'Erro ao preparar o perfil do usuário.')
      await supabase.auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return <AuthBackground><AuthCard><div className="flex items-center justify-center gap-2 py-10 text-xs font-black uppercase tracking-[0.18em] text-blue-100"><Loader2 size={16} className="animate-spin" /> Verificando sessão</div></AuthCard></AuthBackground>
  }

  return (
    <AuthBackground>
      <AuthCard>
        <div className="mb-7 text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] border border-blue-300/30 bg-white/[0.06] shadow-[0_0_45px_rgba(37,99,235,0.22)]">
            <DropZoneLogo className="w-20" animated />
          </div>
          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.34em] text-orange-300">Drop Zone</div>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.08em] text-white">Entrar</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">Acesse sua conta competitiva para continuar.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Field icon={Mail} label="E-mail" value={email} type="email" placeholder="seu@email.com" onChange={(e: any) => setEmail(e.target.value)} required />
          <Field icon={Lock} label="Senha" value={password} type="password" placeholder="Sua senha" onChange={(e: any) => setPassword(e.target.value)} required />

          {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-200">{error}</div> : null}

          <button disabled={loading} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_rgba(37,99,235,0.34)] transition hover:bg-blue-500 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><span>Entrar</span><ChevronRight size={18} /></>}
          </button>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href="/cadastro" className="rounded-2xl border border-orange-300/30 bg-orange-500/10 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-orange-200 hover:bg-orange-500/20">Criar conta</Link>
          <Link href="/recuperar" className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-300 hover:border-blue-300/40 hover:text-blue-100">Esqueci senha</Link>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/70"><ShieldCheck size={14} /> Acesso seguro</div>
      </AuthCard>
    </AuthBackground>
  )
}
