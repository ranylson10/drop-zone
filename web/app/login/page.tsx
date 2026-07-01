'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Facebook, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getRedirectParamFromBrowser, withRedirectParam } from '@/lib/authRedirect'
import { ensureUserProfile } from '@/lib/profileBootstrap'

function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#111827] px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#101827_0%,#1d2942_42%,#2563eb_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative w-full max-w-[380px]">{children}</div>
    </section>
  )
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/20 bg-[linear-gradient(160deg,rgba(124,58,237,0.94)_0%,rgba(37,99,235,0.96)_58%,rgba(17,24,39,0.94)_100%)] p-6 shadow-[0_28px_90px_rgba(2,6,23,0.58)] sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.16),transparent_36%,rgba(249,115,22,0.14))]" />
      {children}
    </div>
  )
}

function Field({ icon: Icon, label, ...props }: any) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <div className="flex h-12 items-center rounded-xl border border-white/45 bg-white text-slate-950 shadow-[0_12px_30px_rgba(2,6,23,0.12)] transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-white/20">
        <div className="grid h-full w-11 place-items-center text-blue-600"><Icon size={17} /></div>
        <input {...props} className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400" />
      </div>
    </label>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirectTo, setRedirectTo] = useState('/feed')
  const router = useRouter()

  useEffect(() => {
    let ativo = true
    async function verificarSessao() {
      const destinoSeguro = getRedirectParamFromBrowser('/feed')
      setRedirectTo(destinoSeguro)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dropzone_auth_redirect', destinoSeguro)
      }

      const { data } = await supabase.auth.getSession()
      if (!ativo) return
      if (data.session?.user) router.replace(destinoSeguro)
      setCheckingSession(false)
    }
    verificarSessao()
    return () => { ativo = false }
  }, [router])


  async function handleSocialLogin(provider: 'google' | 'facebook' | 'discord') {
    try {
      setError(null)
      setSocialLoading(provider)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dropzone_auth_redirect', redirectTo)
      }
      const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err?.message || 'Erro ao entrar com conta social.')
      setSocialLoading(null)
    }
  }

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
      if (data.user) {
        const meta = data.user.user_metadata || {}
        await ensureUserProfile({
          userId: data.user.id,
          email: data.user.email,
          username: meta.username || meta.nome_exibicao || meta.nome || meta.name || data.user.email?.split('@')[0],
          nomeExibicao: meta.nome_exibicao || meta.nome || meta.name || meta.username,
        })
      }
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('dropzone_auth_redirect')
      }
      router.push(redirectTo)
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
        <div className="relative mb-7 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] border border-white/25 bg-slate-950/28 p-3 shadow-[0_18px_50px_rgba(2,6,23,0.32)]">
            <img src="/brand/dropzone-logo.svg" alt="Drop Zone" className="h-full w-full object-contain" />
          </div>
          <div className="mt-4 text-[11px] font-black uppercase tracking-[0.28em] text-orange-200">Drop Zone</div>
          <h1 className="mt-2 text-4xl font-black uppercase text-white">Entrar</h1>
          <p className="mx-auto mt-2 max-w-[260px] text-sm font-semibold leading-5 text-white/72">Acesse sua conta competitiva para continuar.</p>
        </div>


        <div className="relative mb-5 space-y-3">
          <button type="button" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading || loading} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/25 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-900 shadow-[0_14px_32px_rgba(2,6,23,0.18)] transition hover:bg-orange-100 disabled:opacity-50">
            {socialLoading === 'google' ? <Loader2 className="animate-spin" size={17} /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-950 text-white">G</span>}
            Entrar com Google
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleSocialLogin('facebook')} disabled={!!socialLoading || loading} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/12 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/20 disabled:opacity-50">
              {socialLoading === 'facebook' ? <Loader2 className="animate-spin" size={15} /> : <Facebook size={15} />}
              Facebook
            </button>
            <button type="button" onClick={() => handleSocialLogin('discord')} disabled={!!socialLoading || loading} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/12 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/20 disabled:opacity-50">
              {socialLoading === 'discord' ? <Loader2 className="animate-spin" size={15} /> : <span className="text-sm font-black">◈</span>}
              Discord
            </button>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/60"><span className="h-px flex-1 bg-white/20" /> ou email <span className="h-px flex-1 bg-white/20" /></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Field icon={Mail} label="E-mail" value={email} type="email" placeholder="seu@email.com" onChange={(e: any) => setEmail(e.target.value)} required />
          <Field icon={Lock} label="Senha" value={password} type="password" placeholder="Sua senha" onChange={(e: any) => setPassword(e.target.value)} required />

          {error ? <div className="rounded-xl border border-white/25 bg-red-500/20 px-4 py-3 text-xs font-bold text-white">{error}</div> : null}

          <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-[0_16px_36px_rgba(2,6,23,0.22)] transition hover:bg-orange-100 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><span>Entrar</span><ChevronRight size={18} /></>}
          </button>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href={withRedirectParam('/cadastro', redirectTo)} className="rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white hover:bg-white/20">Criar conta</Link>
          <Link href={withRedirectParam('/recuperar', redirectTo)} className="rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white hover:bg-white/20">Esqueci senha</Link>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/65"><ShieldCheck size={14} /> Acesso seguro</div>
      </AuthCard>
    </AuthBackground>
  )
}
