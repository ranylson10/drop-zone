'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Facebook, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getRedirectParamFromBrowser, withRedirectParam } from '@/lib/authRedirect'
import { ensureUserProfile } from '@/lib/profileBootstrap'
import { IDENTITY_ONBOARDING_PATH } from '@/lib/identity'

type IntentKey = 'jogador' | 'equipe' | 'produtora' | 'manager' | 'visitante'

const intentData: Record<IntentKey, { titulo: string; descricao: string; cor: string }> = {
  jogador: {
    titulo: 'Entrar como jogador',
    descricao: 'Acesse para criar perfil de jogo, receber convites e acompanhar campeonatos.',
    cor: 'text-cyan-600',
  },
  equipe: {
    titulo: 'Entrar como líder',
    descricao: 'Acesse para gerenciar elenco, lines, escalações e inscrições da equipe.',
    cor: 'text-blue-600',
  },
  produtora: {
    titulo: 'Entrar como produtora',
    descricao: 'Acesse para criar campeonatos, vender vagas, acompanhar PIX e usar stream.',
    cor: 'text-orange-600',
  },
  manager: {
    titulo: 'Entrar como manager',
    descricao: 'Acesse para gerenciar equipes, jogadores, lines e pendências competitivas.',
    cor: 'text-emerald-600',
  },
  visitante: {
    titulo: 'Entrar',
    descricao: 'Acesse sua conta Drop Zone para continuar.',
    cor: 'text-slate-700',
  },
}

function getIntentFromBrowser(): IntentKey {
  if (typeof window === 'undefined') return 'visitante'
  const intent = new URLSearchParams(window.location.search).get('intent') as IntentKey | null
  if (intent && intent in intentData) return intent
  return 'visitante'
}

function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8fc] px-4 py-8 text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-[0.65] [background-image:linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[230px] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.14),transparent_58%)]" />
      <div className="relative w-full max-w-[430px]">{children}</div>
    </section>
  )
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 bg-white p-6 shadow-[7px_7px_0px_rgba(15,23,42,0.10)] sm:p-7">
      {children}
    </div>
  )
}

function Field({ icon: Icon, label, ...props }: any) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <div className="flex h-12 items-center border border-slate-300 bg-white text-slate-950 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
        <div className="grid h-full w-11 place-items-center border-r border-slate-200 text-blue-600"><Icon size={17} /></div>
        <input {...props} className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400" />
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
  const [redirectTo, setRedirectTo] = useState(IDENTITY_ONBOARDING_PATH)
  const [intent, setIntent] = useState<IntentKey>('visitante')
  const router = useRouter()

  const dadosIntent = useMemo(() => intentData[intent] || intentData.visitante, [intent])

  useEffect(() => {
    let ativo = true
    async function verificarSessao() {
      const destinoSeguro = getRedirectParamFromBrowser(IDENTITY_ONBOARDING_PATH)
      const modo = getIntentFromBrowser()
      setRedirectTo(destinoSeguro)
      setIntent(modo)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dropzone_auth_redirect', destinoSeguro)
        window.localStorage.setItem('dropzone_modo_uso', modo)
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
        window.localStorage.setItem('dropzone_modo_uso', intent)
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
        window.localStorage.setItem('dropzone_modo_uso', intent)
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
    return <AuthBackground><AuthCard><div className="flex items-center justify-center gap-2 py-10 text-xs font-black uppercase tracking-[0.18em] text-slate-500"><Loader2 size={16} className="animate-spin" /> Verificando sessão</div></AuthCard></AuthBackground>
  }

  return (
    <AuthBackground>
      <AuthCard>
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 hover:text-blue-700"><ArrowLeft size={14} /> Trocar modo</Link>

        <div className="mb-6 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center border border-slate-200 bg-slate-50 p-2">
              <img src="/brand/dropzone-logo.svg" alt="Drop Zone" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Drop Zone</div>
              <h1 className="text-2xl font-black uppercase tracking-[-0.05em] text-slate-950">{dadosIntent.titulo}</h1>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{dadosIntent.descricao}</p>
          <div className={`mt-3 inline-flex border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] ${dadosIntent.cor}`}>Modo selecionado: {intent}</div>
        </div>

        <div className="mb-5 space-y-3">
          <button type="button" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading || loading} className="flex h-12 w-full items-center justify-center gap-3 border border-slate-300 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-900 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50">
            {socialLoading === 'google' ? <Loader2 className="animate-spin" size={17} /> : <span className="grid h-6 w-6 place-items-center bg-slate-950 text-white">G</span>}
            Entrar com Google
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleSocialLogin('facebook')} disabled={!!socialLoading || loading} className="flex h-11 items-center justify-center gap-2 border border-slate-300 bg-white px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50">
              {socialLoading === 'facebook' ? <Loader2 className="animate-spin" size={15} /> : <Facebook size={15} />}
              Facebook
            </button>
            <button type="button" onClick={() => handleSocialLogin('discord')} disabled={!!socialLoading || loading} className="flex h-11 items-center justify-center gap-2 border border-slate-300 bg-white px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50">
              {socialLoading === 'discord' ? <Loader2 className="animate-spin" size={15} /> : <span className="text-sm font-black">◈</span>}
              Discord
            </button>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><span className="h-px flex-1 bg-slate-200" /> ou email <span className="h-px flex-1 bg-slate-200" /></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Field icon={Mail} label="E-mail" value={email} type="email" placeholder="seu@email.com" onChange={(e: any) => setEmail(e.target.value)} required />
          <Field icon={Lock} label="Senha" value={password} type="password" placeholder="Sua senha" onChange={(e: any) => setPassword(e.target.value)} required />

          {error ? <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div> : null}

          <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-blue-700 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><span>Entrar</span><ChevronRight size={18} /></>}
          </button>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href={`${withRedirectParam('/cadastro', redirectTo)}&intent=${intent}`} className="border border-orange-500 bg-orange-500 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white hover:bg-orange-600">Criar conta</Link>
          <Link href={withRedirectParam('/recuperar', redirectTo)} className="border border-slate-300 bg-white px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 hover:border-blue-500 hover:text-blue-700">Esqueci senha</Link>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"><ShieldCheck size={14} /> Acesso seguro</div>
      </AuthCard>
    </AuthBackground>
  )
}
