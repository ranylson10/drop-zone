'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DropZoneLogo } from '@/app/components/DropZoneLogo'

export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const origem = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origem}/redefinir-senha`,
    })

    if (error) {
      setError(error.message)
    } else {
      setEnviado(true)
    }

    setLoading(false)
  }

  return (
    <section className="flex min-h-[calc(100vh-120px)] items-center justify-center px-3 py-8 text-slate-950">
      <div className="w-full max-w-[460px] border border-slate-200 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.10)] sm:p-8">
        <Link href="/login" className="mb-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 transition hover:text-blue-600">
          <ArrowLeft size={15} /> Voltar para login
        </Link>

        <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center border border-slate-200 bg-white">
            <DropZoneLogo size="md" animated />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Drop Zone</div>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.04em] text-slate-950">Recuperar senha</h1>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Enviaremos um link seguro para redefinir sua senha.</p>
          </div>
        </div>

        {enviado ? (
          <div className="mt-6 border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3 text-sm font-black uppercase text-emerald-700">
              <CheckCircle2 size={18} /> Link enviado
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
              Verifique sua caixa de entrada e spam. O link foi enviado para <strong>{email}</strong>.
            </p>
            <Link href="/login" className="mt-4 inline-flex h-10 items-center justify-center border border-emerald-300 bg-white px-4 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700 hover:bg-emerald-100">
              Voltar para login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRecuperar} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">E-mail da conta</span>
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

            {error && <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div>}

            <button
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><span>Enviar link</span><ChevronRight size={18} /></>}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
