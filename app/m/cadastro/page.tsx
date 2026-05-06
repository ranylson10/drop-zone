'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck, User, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DropZoneLogo } from '@/app/components/DropZoneLogo'

function BrandBox() {
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 scale-[0.58]">
        <DropZoneLogo size="md" animated />
      </div>
    </div>
  )
}

export default function MobileCadastroPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (password.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    if (password !== confirmPassword) return setErro('As senhas não batem.')
    setLoading(true)
    const emailLimpo = email.trim().toLowerCase()
    const nomeLimpo = username.trim()
    const { data, error } = await supabase.auth.signUp({ email: emailLimpo, password, options: { data: { username: nomeLimpo, nome_exibicao: nomeLimpo } } })
    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }
    if (data.session) router.push('/m')
    else router.push(`/confirmar?email=${encodeURIComponent(emailLimpo)}&username=${encodeURIComponent(nomeLimpo)}`)
  }

  const Campo = ({ icon: Icon, label, type, value, setValue, placeholder }: any) => (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <div className="flex h-12 border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <div className="grid w-12 place-items-center border-r border-slate-200 text-slate-400"><Icon size={16} /></div>
        <input value={value} onChange={(e) => setValue(e.target.value)} type={type} required className="min-w-0 flex-1 bg-white px-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400" placeholder={placeholder} />
      </div>
    </label>
  )

  return (
    <section className="flex min-h-[calc(100vh-92px)] items-center justify-center py-3">
      <form onSubmit={cadastrar} className="w-full overflow-hidden border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
          <div className="flex items-center gap-3">
            <BrandBox />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Primeiro acesso</p>
              <h1 className="mt-1 text-3xl font-black uppercase tracking-[-0.06em] text-slate-950">Criar conta</h1>
              <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Monte equipe, crie line, use carteira e entre em campeonatos.</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {erro && <div className="mb-4 border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div>}

          <div className="space-y-3">
            <Campo icon={User} label="Nome de usuário" type="text" value={username} setValue={setUsername} placeholder="Seu nome" />
            <Campo icon={Mail} label="E-mail" type="email" value={email} setValue={setEmail} placeholder="seu@email.com" />
            <Campo icon={Lock} label="Senha" type="password" value={password} setValue={setPassword} placeholder="Mínimo 6 caracteres" />
            <Campo icon={Lock} label="Confirmar senha" type="password" value={confirmPassword} setValue={setConfirmPassword} placeholder="Repita a senha" />
          </div>

          <button disabled={loading} className="mt-4 flex h-12 w-full items-center justify-center gap-2 bg-blue-600 text-[12px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Criar conta
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/m/login" className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-center text-[11px] font-black uppercase text-slate-700"><ShieldCheck size={14} /> Logar</Link>
            <Link href="/m/recuperar-senha" className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-center text-[11px] font-black uppercase text-slate-700">Esqueci senha <ArrowRight size={14} /></Link>
          </div>
        </div>
      </form>
    </section>
  )
}
