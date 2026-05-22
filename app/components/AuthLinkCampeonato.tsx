'use client'

import type { ReactNode } from 'react'
import { ArrowLeft, ChevronRight, Loader2, Lock, Mail, RotateCcw, ShieldCheck, User, UserPlus } from 'lucide-react'

export type AuthLinkModo = 'login' | 'cadastro' | 'recuperar' | 'confirmar'

type Props = {
  modo: AuthLinkModo
  setModo: (modo: AuthLinkModo) => void
  email: string
  setEmail: (value: string) => void
  senha: string
  setSenha: (value: string) => void
  confirmarSenha: string
  setConfirmarSenha: (value: string) => void
  codigo: string
  setCodigo: (value: string) => void
  nome: string
  setNome: (value: string) => void
  mensagem?: string | null
  loading?: boolean
  otpTipo?: 'signup' | 'recovery'
  onSubmit: () => void
  onReenviarCodigo?: () => void
  onVoltarInicio?: () => void
  campeonatoNome?: string | null
  className?: string
}

function AuthBackground({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#111827] px-4 py-8 text-white ${className}`}>
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#101827_0%,#1d2942_42%,#2563eb_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative w-full max-w-[380px]">{children}</div>
    </section>
  )
}

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/20 bg-[linear-gradient(160deg,rgba(124,58,237,0.94)_0%,rgba(37,99,235,0.96)_58%,rgba(17,24,39,0.94)_100%)] p-6 shadow-[0_28px_90px_rgba(2,6,23,0.58)] sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.16),transparent_36%,rgba(249,115,22,0.14))]" />
      {children}
    </div>
  )
}

function Field({ icon: Icon, label, className = '', ...props }: any) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <div className="flex h-12 items-center rounded-xl border border-white/45 bg-white text-slate-950 shadow-[0_12px_30px_rgba(2,6,23,0.12)] transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-white/20">
        <div className="grid h-full w-11 shrink-0 place-items-center text-blue-600"><Icon size={17} /></div>
        <input {...props} className={`h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 ${className}`} />
      </div>
    </label>
  )
}

export default function AuthLinkCampeonato({
  modo,
  setModo,
  email,
  setEmail,
  senha,
  setSenha,
  confirmarSenha,
  setConfirmarSenha,
  codigo,
  setCodigo,
  nome,
  setNome,
  mensagem,
  loading = false,
  otpTipo = 'signup',
  onSubmit,
  onReenviarCodigo,
  onVoltarInicio,
  campeonatoNome,
  className,
}: Props) {
  const titulo =
    modo === 'login'
      ? 'Entrar'
      : modo === 'cadastro'
        ? 'Nova conta'
        : modo === 'confirmar'
          ? otpTipo === 'recovery' ? 'Código de senha' : 'Confirmar e-mail'
          : 'Recuperar senha'

  const texto =
    modo === 'login'
      ? 'Acesse sua conta para continuar neste campeonato.'
      : modo === 'cadastro'
        ? 'Crie seu acesso competitivo com verificação por código.'
        : modo === 'confirmar'
          ? 'Digite o código de 6 dígitos recebido no e-mail.'
          : 'Receba um código de 6 dígitos para trocar sua senha.'

  const actionLabel = modo === 'login' ? 'Entrar' : modo === 'cadastro' ? 'Criar conta' : modo === 'confirmar' ? 'Validar código' : 'Enviar código'
  const ActionIcon = modo === 'cadastro' ? UserPlus : modo === 'recuperar' ? RotateCcw : Lock

  return (
    <AuthBackground className={className || ''}>
      <AuthCard>
        <button type="button" onClick={onVoltarInicio} className="relative mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/65 transition hover:text-white">
          <ArrowLeft size={14} /> Início
        </button>

        <div className="relative mb-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] border border-white/25 bg-slate-950/28 p-3 shadow-[0_18px_50px_rgba(2,6,23,0.32)]">
            <img src="/brand/dropzone-icon.png" alt="Drop Zone" className="h-full w-full object-contain" />
          </div>
          <div className="mt-4 text-[11px] font-black uppercase tracking-[0.28em] text-orange-200">Drop Zone</div>
          <h1 className="mt-2 text-4xl font-black uppercase text-white">{titulo}</h1>
          <p className="mx-auto mt-2 max-w-[290px] text-sm font-semibold leading-5 text-white/72">{texto}</p>
          {campeonatoNome ? <p className="mx-auto mt-2 max-w-[300px] truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/50">{campeonatoNome}</p> : null}
        </div>

        {modo === 'cadastro' || modo === 'confirmar' || modo === 'recuperar' ? (
          <div className="relative mb-4 rounded-xl border border-white/20 bg-white/10 p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white"><ShieldCheck size={15} /> Código no e-mail</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/70">{modo === 'recuperar' ? 'Você recebe um código para validar a troca de senha.' : 'Depois do cadastro você recebe um código de 6 dígitos para ativar a conta.'}</p>
          </div>
        ) : null}

        <div className="relative space-y-4">
          {modo === 'cadastro' ? <Field icon={User} label="Nome" value={nome} type="text" placeholder="Seu nick" onChange={(event: any) => setNome(event.target.value)} autoComplete="username" /> : null}

          <Field icon={Mail} label="E-mail" value={email} type="email" inputMode="email" placeholder="seu@email.com" onChange={(event: any) => setEmail(event.target.value)} autoComplete="email" />

          {modo === 'confirmar' ? (
            <Field icon={ShieldCheck} label="Código" value={codigo} type="text" inputMode="numeric" maxLength={6} placeholder="000000" onChange={(event: any) => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))} className="text-center text-xl font-black tracking-[0.35em]" />
          ) : null}

          {modo !== 'recuperar' && modo !== 'confirmar' ? (
            <Field icon={Lock} label="Senha" value={senha} type="password" placeholder={modo === 'cadastro' ? 'Mínimo 6 caracteres' : 'Senha'} onChange={(event: any) => setSenha(event.target.value)} autoComplete={modo === 'login' ? 'current-password' : 'new-password'} onKeyDown={(event: any) => { if (event.key === 'Enter') onSubmit() }} />
          ) : null}

          {modo === 'cadastro' ? <Field icon={Lock} label="Confirmar senha" value={confirmarSenha} type="password" placeholder="Repita a senha" onChange={(event: any) => setConfirmarSenha(event.target.value)} autoComplete="new-password" /> : null}

          {mensagem ? <div className="rounded-xl border border-white/25 bg-orange-500/20 px-4 py-3 text-xs font-bold leading-5 text-white">{mensagem}</div> : null}

          <button type="button" onClick={onSubmit} disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-[0_16px_36px_rgba(2,6,23,0.22)] transition hover:bg-orange-100 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><ActionIcon size={18} /><span>{actionLabel}</span><ChevronRight size={18} /></>}
          </button>

          {modo === 'confirmar' && onReenviarCodigo ? (
            <button type="button" onClick={onReenviarCodigo} disabled={loading} className="h-11 w-full rounded-xl border border-white/25 bg-white/10 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/20 disabled:opacity-50">
              Reenviar código
            </button>
          ) : null}

          {modo === 'login' ? (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setModo('recuperar')} className="rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white hover:bg-white/20">Esqueci senha</button>
              <button type="button" onClick={() => setModo('cadastro')} className="rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white hover:bg-white/20">Cadastrar</button>
            </div>
          ) : (
            <button type="button" onClick={() => setModo('login')} className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/20">Voltar para login</button>
          )}

          <p className="text-center text-[10px] font-bold leading-4 text-white/60">Depois do login, você continua neste link e vai direto para a escolha de perfil.</p>
        </div>
      </AuthCard>
    </AuthBackground>
  )
}
