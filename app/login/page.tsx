'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2, Lock, Mail, ShieldCheck, Trophy, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ensureUserProfile } from '@/lib/profileBootstrap'
import { DropZoneLogo } from '@/app/components/DropZoneLogo'

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

    return () => {
      ativo = false
    }
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha inválidos. Confira os dados e tente novamente.')
      setLoading(false)
      return
    }

    try {
      if (data.user) {
        await ensureUserProfile({
          userId: data.user.id,
          email: data.user.email,
          username: data.user.user_metadata?.username,
        })
      }

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
    return (
      <section className="flex min-h-[calc(100vh-120px)] items-center justify-center">
        <div className="border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          Verificando sessão...
        </div>
      </section>
    )
  }

  return (
    <section className="flex min-h-[calc(100vh-120px)] items-center justify-center px-3 py-8 text-slate-950">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.10)] lg:grid-cols-[1fr_440px]">
        <aside className="hidden border-r border-slate-200 bg-slate-50 p-8 lg:block">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center border border-slate-200 bg-white">
              <DropZoneLogo size="md" animated />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Drop Zone</div>
              <h1 className="mt-1 text-3xl font-black uppercase tracking-[-0.04em] text-slate-950">
                Plataforma competitiva
              </h1>
            </div>
          </div>

          <p className="mt-8 max-w-xl text-sm font-semibold leading-7 text-slate-600">
            Entre para gerenciar equipes, lines, campeonatos, apostados, carteira e toda sua operação competitiva em um painel profissional.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3">
            <div className="border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3 text-sm font-black uppercase text-slate-950">
                <Trophy size={18} className="text-blue-600" />
                Campeonatos e ranking
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Organização completa para diários, copas, ligas e confrontos.</p>
            </div>
            <div className="border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3 text-sm font-black uppercase text-slate-950">
                <Users size={18} className="text-blue-600" />
                Equipes, jogadores e lines
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Perfis separados para jogador, equipe, produtora e conta principal.</p>
            </div>
            <div className="border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3 text-sm font-black uppercase text-slate-950">
                <ShieldCheck size={18} className="text-blue-600" />
                Segurança e validação
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Sistema preparado para histórico, transparência e moderação.</p>
            </div>
          </div>
        </aside>

        <div className="p-6 sm:p-8">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="grid h-16 w-16 place-items-center border border-slate-200 bg-white">
              <DropZoneLogo size="md" animated />
            </div>
            <h1 className="mt-4 text-2xl font-black uppercase tracking-[-0.04em] text-slate-950">Drop Zone</h1>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Plataforma competitiva</p>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Acesso ao sistema</div>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] text-slate-950">Entrar na conta</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Use suas credenciais para continuar.</p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">E-mail</span>
              <div className="flex h-12 items-center border border-slate-200 bg-white focus-within:border-blue-500">
                <div className="grid h-full w-12 place-items-center border-r border-slate-200 text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  value={email}
                  type="email"
                  placeholder="seu@email.com"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Senha</span>
              <div className="flex h-12 items-center border border-slate-200 bg-white focus-within:border-blue-500">
                <div className="grid h-full w-12 place-items-center border-r border-slate-200 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  value={password}
                  type="password"
                  placeholder="Sua senha"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            {error && (
              <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><span>Entrar</span><ChevronRight size={18} /></>}
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/cadastro" className="border border-orange-200 bg-orange-50 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-orange-700 hover:bg-orange-100">
              Criar conta
            </Link>
            <Link href="/recuperar" className="border border-slate-200 bg-white px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 hover:border-blue-200 hover:text-blue-600">
              Esqueci a senha
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
