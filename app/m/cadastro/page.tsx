'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail, User, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
      <div className="flex h-12 border border-slate-200 bg-white focus-within:border-blue-500">
        <div className="grid w-12 place-items-center border-r border-slate-200 text-slate-400"><Icon size={16} /></div>
        <input value={value} onChange={(e) => setValue(e.target.value)} type={type} required className="min-w-0 flex-1 px-3 text-sm font-bold outline-none" placeholder={placeholder} />
      </div>
    </label>
  )

  return (
    <section className="py-4">
      <form onSubmit={cadastrar} className="border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Primeiro acesso</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">Criar conta</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Cadastro simples para usar equipe, lines, carteira e campeonatos.</p>
        {erro && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div>}
        <div className="mt-4 space-y-3">
          <Campo icon={User} label="Nome de usuário" type="text" value={username} setValue={setUsername} placeholder="Seu nome" />
          <Campo icon={Mail} label="E-mail" type="email" value={email} setValue={setEmail} placeholder="seu@email.com" />
          <Campo icon={Lock} label="Senha" type="password" value={password} setValue={setPassword} placeholder="Mínimo 6 caracteres" />
          <Campo icon={Lock} label="Confirmar senha" type="password" value={confirmPassword} setValue={setConfirmPassword} placeholder="Repita a senha" />
        </div>
        <button disabled={loading} className="mt-4 flex h-12 w-full items-center justify-center gap-2 bg-blue-600 text-[12px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-60">{loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Criar conta</button>
        <Link href="/m/login" className="mt-3 block border border-slate-200 bg-slate-50 px-3 py-3 text-center text-[11px] font-black uppercase text-slate-700">Já tenho conta</Link>
      </form>
    </section>
  )
}
