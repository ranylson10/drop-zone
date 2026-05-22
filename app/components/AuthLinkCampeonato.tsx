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
    <section className={`relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#090b16] px-4 py-8 text-white ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(124,58,237,0.22),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.12),transparent_38%),linear-gradient(180deg,#111525_0%,#080b15_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-violet-500/10 to-transparent" />
      <div className="relative w-full max-w-[380px]">{children}</div>
    </section>
  )
}

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-0 bg-transparent p-6 shadow-none sm:p-7">
      {children}
    </div>
  )
}

function Field({ icon: Icon, label, className = '', ...props }: any) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <div className="flex h-12 items-center rounded-[10px] border border-violet-400/24 bg-[#151928]/92 text-white shadow-none transition focus-within:border-violet-400/70 focus-within:ring-2 focus-within:ring-violet-500/15">
        <div className="grid h-full w-11 shrink-0 place-items-center border-r border-white/8 text-violet-400"><Icon size={17} /></div>
        <input {...props} className={`h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 ${className}`} />
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
        <button type="button" onClick={onVoltarInicio} className="relative mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300/80 transition hover:text-white">
          <ArrowLeft size={14} /> Início
        </button>

        <div className="relative mb-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center p-1">
            <img src="/brand/dropzone-icon.png" alt="Drop Zone" className="h-full w-full object-contain" />
          </div>
          <div className="mt-4 text-[11px] font-black uppercase tracking-[0.28em] text-violet-400">Drop Zone</div>
          <h1 className="mt-2 text-4xl font-black uppercase text-white">{titulo}</h1>
          <p className="mx-auto mt-2 max-w-[290px] text-sm font-semibold leading-5 text-slate-300">{texto}</p>
          {campeonatoNome ? <p className="mx-auto mt-2 max-w-[300px] truncate text-[10px] font-black uppercase tracking-[0.16em] text-violet-300/70">{campeonatoNome}</p> : null}
        </div>

        {modo === 'cadastro' || modo === 'confirmar' || modo === 'recuperar' ? (
          <div className="relative mb-4 rounded-[10px] border border-violet-400/28 bg-[#151928]/70 p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white"><ShieldCheck size={15} /> Código no e-mail</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">{modo === 'recuperar' ? 'Você recebe um código para validar a troca de senha.' : 'Depois do cadastro você recebe um código de 6 dígitos para ativar a conta.'}</p>
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

          {mensagem ? <div className="rounded-[10px] border border-violet-400/30 bg-violet-500/12 px-4 py-3 text-xs font-bold leading-5 text-slate-100">{mensagem}</div> : null}

          <button type="button" onClick={onSubmit} disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(90deg,#7c5cff_0%,#6d5dfc_45%,#4f46e5_100%)] px-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-none transition hover:brightness-110 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><ActionIcon size={18} /><span>{actionLabel}</span><ChevronRight size={18} /></>}
          </button>

          {modo === 'confirmar' && onReenviarCodigo ? (
            <button type="button" onClick={onReenviarCodigo} disabled={loading} className="h-11 w-full rounded-[10px] border border-violet-400/28 bg-[#151928]/70 text-[10px] font-black uppercase tracking-[0.16em] text-violet-300 transition hover:bg-violet-500/10 disabled:opacity-50">
              Reenviar código
            </button>
          ) : null}

          {modo === 'login' ? (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setModo('recuperar')} className="rounded-[10px] border border-violet-400/28 bg-[#151928]/70 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-violet-300 hover:bg-violet-500/10">Esqueci senha</button>
              <button type="button" onClick={() => setModo('cadastro')} className="rounded-[10px] border border-violet-400/28 bg-[#151928]/70 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-violet-300 hover:bg-violet-500/10">Cadastrar</button>
            </div>
          ) : (
            <button type="button" onClick={() => setModo('login')} className="w-full rounded-[10px] border border-violet-400/28 bg-[#151928]/70 px-3 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-violet-300 transition hover:bg-violet-500/10">Voltar para login</button>
          )}

          <p className="text-center text-[10px] font-bold leading-4 text-slate-400">Depois do login, você continua neste link e vai direto para a escolha de perfil.</p>
        </div>
      </AuthCard>
    </AuthBackground>
  )
}
