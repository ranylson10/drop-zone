'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function MobileRecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function recuperar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    const origem = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${origem}/redefinir-senha` })
    if (error) setErro(error.message)
    else setEnviado(true)
    setLoading(false)
  }

  return (
    <section className="py-4">
      <form onSubmit={recuperar} className="border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Acesso</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">Recuperar senha</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Informe seu e-mail e enviaremos um link seguro para redefinir a senha.</p>
        {erro && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div>}
        {enviado ? (
          <div className="mt-4 border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={18} className="mb-2" /> Link enviado. Verifique seu e-mail e spam.</div>
        ) : (
          <>
            <label className="mt-4 block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">E-mail</span>
              <div className="flex h-12 border border-slate-200 bg-white focus-within:border-blue-500">
                <div className="grid w-12 place-items-center border-r border-slate-200 text-slate-400"><Mail size={16} /></div>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="min-w-0 flex-1 px-3 text-sm font-bold outline-none" placeholder="seu@email.com" />
              </div>
            </label>
            <button disabled={loading} className="mt-4 flex h-12 w-full items-center justify-center gap-2 bg-blue-600 text-[12px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-60">{loading && <Loader2 size={16} className="animate-spin" />} Enviar link</button>
          </>
        )}
        <Link href="/m/login" className="mt-3 block border border-slate-200 bg-slate-50 px-3 py-3 text-center text-[11px] font-black uppercase text-slate-700">Voltar para login</Link>
      </form>
    </section>
  )
}
