'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Lock, Mail, ShieldCheck, User, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DropZoneLogo } from '@/app/components/DropZoneLogo'

function Campo({
  icon: Icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  icon: any
  type: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
}) {
  return (
    <div className="flex h-12 items-center border border-slate-200 bg-white transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
      <div className="flex h-full w-12 shrink-0 items-center justify-center border-r border-slate-200 text-slate-400">
        <Icon size={17} />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold normal-case text-slate-950 outline-none placeholder:text-slate-400"
        required
      />
    </div>
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
  const router = useRouter()

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()

    const usernameLimpo = username.trim()
    const emailLimpo = email.trim().toLowerCase()

    setMessage(null)
    setError(null)

    if (!usernameLimpo) {
      setError('Informe o nome de usuário.')
      return
    }

    if (!emailLimpo) {
      setError('Informe o e-mail.')
      return
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não batem.')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email: emailLimpo,
        password,
        options: {
          data: {
            username: usernameLimpo,
            nome_exibicao: usernameLimpo,
          },
        },
      })

      if (error) throw error

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dropzone_pending_email', emailLimpo)
        window.localStorage.setItem('dropzone_pending_username', usernameLimpo)
      }

      setMessage('Conta criada. Enviamos um código de 6 dígitos para seu e-mail.')

      if (data.session) {
        router.push('/perfil')
        router.refresh()
        return
      }

      router.push(`/confirmar?email=${encodeURIComponent(emailLimpo)}&username=${encodeURIComponent(usernameLimpo)}`)
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-92px)] bg-transparent px-4 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-150px)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[1fr_440px]">
        <section className="hidden border border-slate-200 bg-white/80 p-8 lg:block">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center border border-orange-200 bg-orange-50">
              <DropZoneLogo size="md" animated />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600">
                Drop Zone
              </div>
              <h1 className="mt-1 text-4xl font-black uppercase tracking-tight text-slate-950">
                Nova conta
              </h1>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3">
            <div className="border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                <ShieldCheck size={16} />
                Verificação por código
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                Depois do cadastro, você recebe um código de 6 dígitos no e-mail e ativa a conta direto no site.
              </p>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Perfil principal
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                Esse usuário será usado para criar perfis de jogo, lines, equipes e produtoras.
              </p>
            </div>
          </div>
        </section>

        <section>
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft size={15} />
            Voltar
          </button>

          <div className="border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center border border-orange-200 bg-orange-50 lg:hidden">
                <DropZoneLogo size="sm" animated />
              </div>
              <div>
                <div className="flex items-center gap-2 text-blue-600">
                  <UserPlus size={20} />
                  <h2 className="text-2xl font-black uppercase tracking-tight">
                    Nova conta
                  </h2>
                </div>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Crie seu acesso competitivo
                </p>
              </div>
            </div>

            <form onSubmit={handleCadastro} className="space-y-3">
              <Campo
                icon={User}
                type="text"
                placeholder="Nome de usuário"
                value={username}
                onChange={setUsername}
                autoComplete="username"
              />

              <Campo
                icon={Mail}
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />

              <Campo
                icon={Lock}
                type="password"
                placeholder="Senha"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />

              <Campo
                icon={Lock}
                type="password"
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />

              {error ? (
                <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                  {message}
                </div>
              ) : null}

              <button
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-xs font-bold">
              <span className="text-slate-500">Já tem conta?</span>
              <Link href="/login" className="uppercase tracking-[0.14em] text-blue-600 hover:text-blue-700">
                Entrar
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
