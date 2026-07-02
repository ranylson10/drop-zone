'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Facebook, Loader2, Lock, Mail, ShieldCheck, User, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getRedirectParamFromBrowser, withRedirectParam } from '@/lib/authRedirect'
import { normalizeUsername } from '@/lib/profileBootstrap'
import { IDENTITY_ONBOARDING_PATH } from '@/lib/identity'

type IntentKey = 'jogador' | 'equipe' | 'produtora' | 'manager' | 'visitante'

const intentData: Record<IntentKey, { titulo: string; descricao: string; cor: string }> = {
  jogador: {
    titulo: 'Criar conta de jogador',
    descricao: 'Crie a conta base. Depois você completa seu perfil de jogo.',
    cor: 'text-cyan-600',
  },
  equipe: {
    titulo: 'Criar conta de líder',
    descricao: 'Crie a conta base. Depois você cria ou gerencia sua equipe.',
    cor: 'text-blue-600',
  },
  produtora: {
    titulo: 'Criar conta de produtora',
    descricao: 'Crie a conta base. Depois você configura a produtora e seus eventos.',
    cor: 'text-orange-600',
  },
  manager: {
    titulo: 'Criar conta de manager',
    descricao: 'Crie a conta base. Depois você acessa suas gestões e permissões.',
    cor: 'text-emerald-600',
  },
  visitante: {
    titulo: 'Criar conta',
    descricao: 'Crie sua conta Drop Zone para continuar.',
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

export default function Cadastro() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [redirectTo, setRedirectTo] = useState(IDENTITY_ONBOARDING_PATH)
  const [intent, setIntent] = useState<IntentKey>('visitante')
  const router = useRouter()

  const dadosIntent = useMemo(() => intentData[intent] || intentData.visitante, [intent])

  useEffect(() => {
    const destinoSeguro = getRedirectParamFromBrowser(IDENTITY_ONBOARDING_PATH)
    const modo = getIntentFromBrowser()
    setRedirectTo(destinoSeguro)
    setIntent(modo)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dropzone_auth_redirect', destinoSeguro)
      window.localStorage.setItem('dropzone_modo_uso', modo)
    }
  }, [])

  async function handleSocialCadastro(provider: 'google' | 'facebook' | 'discord') {
    try {
      setMessage(null)
      setError(null)
      setSocialLoading(provider)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dropzone_auth_redirect', redirectTo)
        window.localStorage.setItem('dropzone_modo_uso', intent)
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}` },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta com login social.')
      setSocialLoading(null)
    }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    const usernameLimpo = normalizeUsername(username)
    const emailLimpo = email.trim().toLowerCase()
    setMessage(null)
    setError(null)

    if (!username.trim()) return setError('Informe o nome de usuário.')
    if (!emailLimpo) return setError('Informe o e-mail.')
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
    if (password !== confirmPassword) return setError('As senhas não batem.')

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email: emailLimpo,
        password,
        options: { data: { username: usernameLimpo, nome_exibicao: username.trim(), nome: username.trim(), name: username.trim() } },
      })
      if (error) throw error
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dropzone_pending_email', emailLimpo)
        window.localStorage.setItem('dropzone_pending_username', usernameLimpo)
        window.localStorage.setItem('dropzone_auth_redirect', redirectTo)
        window.localStorage.setItem('dropzone_modo_uso', intent)
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

        <div className="mb-4 border border-blue-100 bg-blue-50 p-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700"><ShieldCheck size={15} /> Código no e-mail</div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Depois do cadastro você recebe um código de 6 dígitos para ativar a conta.</p>
        </div>

        <div className="mb-5 space-y-3">
          <button type="button" onClick={() => handleSocialCadastro('google')} disabled={!!socialLoading || loading} className="flex h-12 w-full items-center justify-center gap-3 border border-slate-300 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-900 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50">
            {socialLoading === 'google' ? <Loader2 className="animate-spin" size={17} /> : <span className="grid h-6 w-6 place-items-center bg-slate-950 text-white">G</span>}
            Criar com Google
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleSocialCadastro('facebook')} disabled={!!socialLoading || loading} className="flex h-11 items-center justify-center gap-2 border border-slate-300 bg-white px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50">
              {socialLoading === 'facebook' ? <Loader2 className="animate-spin" size={15} /> : <Facebook size={15} />}
              Facebook
            </button>
            <button type="button" onClick={() => handleSocialCadastro('discord')} disabled={!!socialLoading || loading} className="flex h-11 items-center justify-center gap-2 border border-slate-300 bg-white px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50">
              {socialLoading === 'discord' ? <Loader2 className="animate-spin" size={15} /> : <span className="text-sm font-black">◈</span>}
              Discord
            </button>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><span className="h-px flex-1 bg-slate-200" /> ou email <span className="h-px flex-1 bg-slate-200" /></div>
        </div>

        <form onSubmit={handleCadastro} className="space-y-4">
          <Field icon={User} label="Nome de usuário" value={username} type="text" placeholder="Seu nick" minLength={3} maxLength={32} pattern="[A-Za-z0-9_ .-]+" onChange={(e: any) => setUsername(e.target.value)} autoComplete="username" required />
          <Field icon={Mail} label="E-mail" value={email} type="email" placeholder="seu@email.com" onChange={(e: any) => setEmail(e.target.value)} autoComplete="email" required />
          <Field icon={Lock} label="Senha" value={password} type="password" placeholder="Mínimo 6 caracteres" onChange={(e: any) => setPassword(e.target.value)} autoComplete="new-password" required />
          <Field icon={Lock} label="Confirmar senha" value={confirmPassword} type="password" placeholder="Repita a senha" onChange={(e: any) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />

          {error ? <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div> : null}
          {message ? <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{message}</div> : null}

          <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-blue-700 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><UserPlus size={18} /><span>Criar conta</span><ChevronRight size={18} /></>}
          </button>
        </form>

        <div className="mt-5 text-center text-xs font-semibold text-slate-500">Já tem conta? <Link href={`${withRedirectParam('/login', redirectTo)}&intent=${intent}`} className="font-black uppercase tracking-[0.12em] text-blue-700 hover:text-blue-900">Entrar</Link></div>
      </AuthCard>
    </AuthBackground>
  )
}
