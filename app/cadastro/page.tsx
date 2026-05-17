'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Loader2, Lock, Mail, ShieldCheck, User, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getRedirectParamFromBrowser, withRedirectParam } from '@/lib/authRedirect'

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

export default function Cadastro() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [redirectTo, setRedirectTo] = useState('/perfil')
  const router = useRouter()

  useEffect(() => {
    const destinoSeguro = getRedirectParamFromBrowser('/perfil')
    setRedirectTo(destinoSeguro)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dropzone_auth_redirect', destinoSeguro)
    }
  }, [])

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    const usernameLimpo = username.trim()
    const emailLimpo = email.trim().toLowerCase()
    setMessage(null)
    setError(null)

    if (!usernameLimpo) return setError('Informe o nome de usuário.')
    if (!emailLimpo) return setError('Informe o e-mail.')
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
    if (password !== confirmPassword) return setError('As senhas não batem.')

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email: emailLimpo,
        password,
        options: { data: { username: usernameLimpo, nome_exibicao: usernameLimpo } },
      })
      if (error) throw error
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dropzone_pending_email', emailLimpo)
        window.localStorage.setItem('dropzone_pending_username', usernameLimpo)
        window.localStorage.setItem('dropzone_auth_redirect', redirectTo)
      }
      setMessage('Conta criada. Enviamos um código de 6 dígitos para seu e-mail.')
      if (data.session) {
        router.push(redirectTo)
        router.refresh()
        return
      }
      router.push(`/confirmar?email=${encodeURIComponent(emailLimpo)}&username=${encodeURIComponent(usernameLimpo)}&redirect=${encodeURIComponent(redirectTo)}`)
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthBackground>
      <AuthCard>
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 hover:text-blue-200"><ArrowLeft size={14} /> Início</Link>

        <div className="mb-7 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[30px] border border-blue-300/30 bg-[#071225]/80 p-3 shadow-[0_0_55px_rgba(37,99,235,0.28)]">
            <img src="/brand/dropzone-icon.png" alt="Drop Zone" className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(56,189,248,0.28)]" />
          </div>
          <div className="mt-4 text-[10px] font-black uppercase tracking-[0.34em] text-orange-300">Drop Zone</div>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.08em] text-white">Nova conta</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">Crie seu acesso competitivo com verificação por código.</p>
        </div>

        <div className="mb-5 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200"><ShieldCheck size={15} /> Código no e-mail</div>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">Depois do cadastro você recebe um código de 6 dígitos para ativar a conta no site.</p>
        </div>

        <form onSubmit={handleCadastro} className="space-y-4">
          <Field icon={User} label="Nome de usuário" value={username} type="text" placeholder="Seu nick" onChange={(e: any) => setUsername(e.target.value)} autoComplete="username" required />
          <Field icon={Mail} label="E-mail" value={email} type="email" placeholder="seu@email.com" onChange={(e: any) => setEmail(e.target.value)} autoComplete="email" required />
          <Field icon={Lock} label="Senha" value={password} type="password" placeholder="Mínimo 6 caracteres" onChange={(e: any) => setPassword(e.target.value)} autoComplete="new-password" required />
          <Field icon={Lock} label="Confirmar senha" value={confirmPassword} type="password" placeholder="Repita a senha" onChange={(e: any) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />

          {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-200">{error}</div> : null}
          {message ? <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-200">{message}</div> : null}

          <button disabled={loading} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_rgba(37,99,235,0.34)] transition hover:bg-blue-500 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><UserPlus size={18} /><span>Criar conta</span><ChevronRight size={18} /></>}
          </button>
        </form>

        <div className="mt-5 text-center text-xs font-semibold text-slate-400">Já tem conta? <Link href={withRedirectParam('/login', redirectTo)} className="font-black uppercase tracking-[0.12em] text-blue-200 hover:text-white">Entrar</Link></div>
      </AuthCard>
    </AuthBackground>
  )
}
