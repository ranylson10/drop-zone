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
    <section className={`auth-link-campeonato relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-hidden bg-[#111827] px-4 py-8 text-white ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(249,115,22,0.28),transparent_30%),radial-gradient(circle_at_100%_100%,rgba(234,88,12,0.20),transparent_38%),linear-gradient(180deg,#17111d_0%,#090d17_54%,#070b14_100%)]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(30deg,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(150deg,rgba(249,115,22,0.13)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute inset-0 opacity-[0.13] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.24)_1px,transparent_1.5px)] [background-size:22px_22px]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,11,20,0.14)_0%,transparent_24%,transparent_72%,rgba(7,11,20,0.24)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-orange-500/10 to-transparent" />
      <div className="relative w-full max-w-[380px]">{children}</div>
    </section>
  )
}

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-visible border-0 bg-transparent p-0 shadow-none">
      {children}
    </div>
  )
}

function Field({ icon: Icon, label, className = '', ...props }: any) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <div className="flex h-12 items-center rounded-xl border border-white/45 bg-[#fffaf3] text-slate-950 shadow-[0_12px_30px_rgba(2,6,23,0.12)] transition focus-within:border-orange-200 focus-within:ring-4 focus-within:ring-white/20">
        <div className="grid h-full w-11 shrink-0 place-items-center border-r border-orange-100 text-orange-600"><Icon size={17} /></div>
        <input {...props} className={`h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 ${className}`} />
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
          ? otpTipo === 'recovery' ? 'Codigo de senha' : 'Confirmar e-mail'
          : 'Recuperar senha'

  const texto =
    modo === 'login'
      ? 'Acesse sua conta para continuar neste campeonato.'
      : modo === 'cadastro'
        ? 'Crie seu acesso competitivo com verificacao por codigo.'
        : modo === 'confirmar'
          ? 'Digite o codigo de 6 digitos recebido no e-mail.'
          : 'Receba um codigo de 6 digitos para trocar sua senha.'

  const actionLabel = modo === 'login' ? 'Entrar' : modo === 'cadastro' ? 'Criar conta' : modo === 'confirmar' ? 'Validar codigo' : 'Enviar codigo'
  const ActionIcon = modo === 'cadastro' ? UserPlus : modo === 'recuperar' ? RotateCcw : Lock

  return (
    <AuthBackground className={className || ''}>
      <AuthCard>
        <button type="button" onClick={onVoltarInicio} className="relative mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/72 transition hover:text-white">
          <ArrowLeft size={14} /> Inicio
        </button>

        <div className="relative mb-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center p-1">
            <img src="/brand/dropzone-icon.png" alt="Drop Zone" className="h-full w-full object-contain" />
          </div>
          <div className="mt-4 text-[11px] font-black uppercase tracking-[0.28em] text-orange-400">Drop Zone</div>
          <h1 className="mt-2 text-4xl font-black uppercase text-white">{titulo}</h1>
          <p className="mx-auto mt-2 max-w-[290px] text-sm font-semibold leading-5 text-white/74">{texto}</p>
          {campeonatoNome ? <p className="mx-auto mt-2 max-w-[300px] truncate text-[10px] font-black uppercase tracking-[0.16em] text-orange-300/85">{campeonatoNome}</p> : null}
        </div>

        {modo === 'cadastro' || modo === 'confirmar' || modo === 'recuperar' ? (
          <div className="relative mb-4 rounded-xl border border-white/20 bg-white/10 p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white"><ShieldCheck size={15} /> Codigo no e-mail</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/70">{modo === 'recuperar' ? 'Voce recebe um codigo para validar a troca de senha.' : 'Depois do cadastro voce recebe um codigo de 6 digitos para ativar a conta.'}</p>
          </div>
        ) : null}

        <div className="relative space-y-4">
          {modo === 'cadastro' ? <Field icon={User} label="Nome" value={nome} type="text" placeholder="Seu nick" onChange={(event: any) => setNome(event.target.value)} autoComplete="username" /> : null}

          <Field icon={Mail} label="E-mail" value={email} type="email" inputMode="email" placeholder="seu@email.com" onChange={(event: any) => setEmail(event.target.value)} autoComplete="email" />

          {modo === 'confirmar' ? (
            <Field icon={ShieldCheck} label="Codigo" value={codigo} type="text" inputMode="numeric" maxLength={6} placeholder="000000" onChange={(event: any) => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))} className="text-center text-xl font-black tracking-[0.35em]" />
          ) : null}

          {modo !== 'recuperar' && modo !== 'confirmar' ? (
            <Field icon={Lock} label="Senha" value={senha} type="password" placeholder={modo === 'cadastro' ? 'Minimo 6 caracteres' : 'Senha'} onChange={(event: any) => setSenha(event.target.value)} autoComplete={modo === 'login' ? 'current-password' : 'new-password'} onKeyDown={(event: any) => { if (event.key === 'Enter') onSubmit() }} />
          ) : null}

          {modo === 'cadastro' ? <Field icon={Lock} label="Confirmar senha" value={confirmarSenha} type="password" placeholder="Repita a senha" onChange={(event: any) => setConfirmarSenha(event.target.value)} autoComplete="new-password" /> : null}

          {mensagem ? <div className="rounded-xl border border-white/25 bg-slate-950/22 px-4 py-3 text-xs font-bold leading-5 text-white">{mensagem}</div> : null}

          <button type="button" onClick={onSubmit} disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#f97316_0%,#ea580c_50%,#c2410c_100%)] px-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-none transition hover:brightness-110 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><ActionIcon size={18} /><span>{actionLabel}</span><ChevronRight size={18} /></>}
          </button>

          {modo === 'confirmar' && onReenviarCodigo ? (
            <button type="button" onClick={onReenviarCodigo} disabled={loading} className="h-11 w-full rounded-xl border border-white/25 bg-white/10 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/20 disabled:opacity-50">
              Reenviar codigo
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

          <p className="text-center text-[10px] font-bold leading-4 text-white/62">Depois do login, voce continua neste link e vai direto para a escolha de perfil.</p>
        </div>
      </AuthCard>
    </AuthBackground>
  )
}
