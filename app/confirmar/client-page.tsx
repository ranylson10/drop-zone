'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, Mail, RefreshCcw, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ensureUserProfile } from '@/lib/profileBootstrap'
import { DropZoneLogo } from '@/app/components/DropZoneLogo'

const CODE_LENGTH = 6

export default function ConfirmarContaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const codigo = useMemo(() => digits.join(''), [digits])

  useEffect(() => {
    const emailUrl = searchParams.get('email')
    const usernameUrl = searchParams.get('username')

    const emailStorage =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('dropzone_pending_email')
        : ''
    const usernameStorage =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('dropzone_pending_username')
        : ''

    setEmail((emailUrl || emailStorage || '').trim().toLowerCase())
    setUsername((usernameUrl || usernameStorage || '').trim())

    setTimeout(() => inputsRef.current[0]?.focus(), 100)
  }, [searchParams])

  function setCodigoCompleto(valor: string) {
    const onlyNumbers = valor.replace(/\D/g, '').slice(0, CODE_LENGTH)
    const next = Array(CODE_LENGTH).fill('')
    onlyNumbers.split('').forEach((char, index) => {
      next[index] = char
    })
    setDigits(next)

    const foco = Math.min(onlyNumbers.length, CODE_LENGTH - 1)
    setTimeout(() => inputsRef.current[foco]?.focus(), 0)
  }

  function handleDigitChange(index: number, value: string) {
    const onlyNumbers = value.replace(/\D/g, '')

    if (onlyNumbers.length > 1) {
      setCodigoCompleto(onlyNumbers)
      return
    }

    const next = [...digits]
    next[index] = onlyNumbers
    setDigits(next)

    if (onlyNumbers && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  async function confirmar() {
    const emailLimpo = email.trim().toLowerCase()
    const usernameLimpo = username.trim()

    setError(null)
    setMessage(null)

    if (!emailLimpo) {
      setError('Informe o e-mail usado no cadastro.')
      return
    }

    if (codigo.length !== CODE_LENGTH) {
      setError('Digite o código de 6 dígitos.')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.verifyOtp({
        email: emailLimpo,
        token: codigo,
        type: 'signup',
      })

      if (error) throw error

      const user = data.user || (await supabase.auth.getUser()).data.user

      if (user) {
        await ensureUserProfile({
          userId: user.id,
          email: user.email || emailLimpo,
          username: user.user_metadata?.username || usernameLimpo,
        })
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('dropzone_pending_email')
        window.localStorage.removeItem('dropzone_pending_username')
      }

      setMessage('Conta confirmada. Entrando no perfil...')
      router.push('/perfil')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Código inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  async function reenviarCodigo() {
    const emailLimpo = email.trim().toLowerCase()

    setError(null)
    setMessage(null)

    if (!emailLimpo) {
      setError('Informe o e-mail para reenviar o código.')
      return
    }

    try {
      setResending(true)

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailLimpo,
      })

      if (error) throw error

      setMessage('Novo código enviado para seu e-mail.')
      setDigits(Array(CODE_LENGTH).fill(''))
      setTimeout(() => inputsRef.current[0]?.focus(), 100)
    } catch (err: any) {
      setError(err?.message || 'Erro ao reenviar código.')
    } finally {
      setResending(false)
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
                Verificação
              </h1>
            </div>
          </div>

          <div className="mt-8 border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              <ShieldCheck size={16} />
              Código de 6 dígitos
            </div>
            <p className="mt-2 text-sm font-medium leading-relaxed text-blue-900/70">
              Enviamos um código para seu e-mail. Digite no campo ao lado para ativar a conta e entrar direto no perfil.
            </p>
          </div>
        </section>

        <section>
          <Link
            href="/cadastro"
            className="mb-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft size={15} />
            Voltar
          </Link>

          <div className="border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center border border-orange-200 bg-orange-50 lg:hidden">
                <DropZoneLogo size="sm" animated />
              </div>
              <div>
                <div className="flex items-center gap-2 text-blue-600">
                  <CheckCircle2 size={20} />
                  <h2 className="text-2xl font-black uppercase tracking-tight">
                    Confirmar conta
                  </h2>
                </div>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Digite o código enviado por e-mail
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex h-12 items-center border border-slate-200 bg-white transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <div className="flex h-full w-12 shrink-0 items-center justify-center border-r border-slate-200 text-slate-400">
                  <Mail size={17} />
                </div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                  type="email"
                  placeholder="E-mail do cadastro"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold normal-case text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Código de confirmação
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputsRef.current[index] = el
                      }}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={(e) => {
                        e.preventDefault()
                        setCodigoCompleto(e.clipboardData.getData('text'))
                      }}
                      inputMode="numeric"
                      maxLength={1}
                      className="h-14 border border-slate-200 bg-slate-50 text-center text-xl font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  ))}
                </div>
              </div>

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
                onClick={confirmar}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                {loading ? 'Confirmando...' : 'Confirmar e entrar'}
              </button>

              <button
                onClick={reenviarCodigo}
                disabled={resending}
                className="flex h-11 w-full items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
              >
                {resending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={15} />}
                {resending ? 'Reenviando...' : 'Reenviar código'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
