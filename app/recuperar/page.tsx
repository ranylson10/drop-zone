'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ChevronRight, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DropZoneLogo } from '@/app/components/DropZoneLogo'

type Etapa = 'email' | 'codigo' | 'senha' | 'ok'

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

export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [etapa, setEtapa] = useState<Etapa>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviarCodigo(e?: React.FormEvent) {
    e?.preventDefault()
    const emailLimpo = email.trim().toLowerCase()
    setError(null)
    if (!emailLimpo) return setError('Informe o e-mail da conta.')

    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo)
      if (error) throw error
      setEmail(emailLimpo)
      setEtapa('codigo')
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar o código.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmarCodigo(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    const token = codigo.replace(/\D/g, '')
    if (!email.trim() || token.length !== 6) return setError('Informe o código de 6 números enviado no e-mail.')

    try {
      setLoading(true)
      const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'recovery' })
      if (error) throw error
      setEtapa('senha')
    } catch (err: any) {
      setError(err?.message || 'Código inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  async function salvarSenha(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    if (senha.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
    if (senha !== confirmarSenha) return setError('As senhas não conferem.')

    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) throw error
      setEtapa('ok')
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar a senha.')
    } finally {
      setLoading(false)
    }
  }

  const titulo = etapa === 'email' ? 'Recuperar senha' : etapa === 'codigo' ? 'Código de acesso' : etapa === 'senha' ? 'Nova senha' : 'Senha atualizada'
  const texto = etapa === 'email'
    ? 'Receba um código de 6 dígitos no e-mail, sem link quebrado.'
    : etapa === 'codigo'
      ? 'Digite o código recebido para liberar a troca de senha.'
      : etapa === 'senha'
        ? 'Agora crie uma nova senha para sua conta.'
        : 'Sua senha foi atualizada com sucesso.'

  return (
    <AuthBackground>
      <AuthCard>
        <Link href="/login" className="mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 hover:text-blue-200"><ArrowLeft size={14} /> Login</Link>

        <div className="mb-7 text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] border border-blue-300/30 bg-white/[0.06] shadow-[0_0_45px_rgba(37,99,235,0.22)]">
            <DropZoneLogo className="w-20" animated />
          </div>
          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.34em] text-orange-300">Drop Zone</div>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.08em] text-white">{titulo}</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{texto}</p>
        </div>

        {etapa === 'email' ? (
          <form onSubmit={enviarCodigo} className="space-y-4">
            <Field icon={Mail} label="E-mail da conta" value={email} type="email" placeholder="seu@email.com" onChange={(e: any) => setEmail(e.target.value)} required />
            {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-200">{error}</div> : null}
            <button disabled={loading} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_rgba(37,99,235,0.34)] transition hover:bg-blue-500 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={18} /> : <><Mail size={18} /> Enviar código</>}</button>
          </form>
        ) : null}

        {etapa === 'codigo' ? (
          <form onSubmit={confirmarCodigo} className="space-y-4">
            <Field icon={KeyRound} label="Código de 6 números" value={codigo} type="text" inputMode="numeric" maxLength={6} placeholder="000000" onChange={(e: any) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
            {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-200">{error}</div> : null}
            <button disabled={loading} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_rgba(37,99,235,0.34)] transition hover:bg-blue-500 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={18} /> : <><ShieldCheck size={18} /> Validar código</>}</button>
            <button type="button" onClick={() => enviarCodigo()} className="w-full text-center text-[10px] font-black uppercase tracking-[0.16em] text-blue-200 hover:text-white">Reenviar código</button>
          </form>
        ) : null}

        {etapa === 'senha' ? (
          <form onSubmit={salvarSenha} className="space-y-4">
            <Field icon={Lock} label="Nova senha" value={senha} type="password" placeholder="Mínimo 6 caracteres" onChange={(e: any) => setSenha(e.target.value)} required />
            <Field icon={Lock} label="Confirmar senha" value={confirmarSenha} type="password" placeholder="Repita a nova senha" onChange={(e: any) => setConfirmarSenha(e.target.value)} required />
            {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-200">{error}</div> : null}
            <button disabled={loading} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_rgba(37,99,235,0.34)] transition hover:bg-blue-500 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={18} /> Salvar senha</>}</button>
          </form>
        ) : null}

        {etapa === 'ok' ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-emerald-300/30 bg-emerald-400/10 text-emerald-200"><CheckCircle2 size={28} /></div>
            <Link href="/login" className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_rgba(37,99,235,0.34)] transition hover:bg-blue-500">Ir para login <ChevronRight size={18} /></Link>
          </div>
        ) : null}
      </AuthCard>
    </AuthBackground>
  )
}
