'use client'

import { Bell, Search, User, Wallet, Menu, LogIn, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePerfil } from '../contexts/PerfilContext'
import { DropZoneLogo } from './DropZoneLogo'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function formatarDinheiro(valor: number) {
 return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Navbar() {
 const { user, perfilAtivo, tipoPerfil, loading } = usePerfil()
 const router = useRouter()
 const [saldo, setSaldo] = useState(0)
 const usuarioLogado = Boolean(user)

 useEffect(() => {
 let ativo = true

 async function carregarSaldo() {
 try {
 const { data } = await supabase.auth.getUser()
 const uid = data.user?.id
 if (!uid) return

 const { data: wallet } = await supabase
 .from('wallet_saldo')
 .select('saldo')
 .eq('user_id', uid)
 .single()

 if (!ativo) return
 setSaldo(Number(wallet?.saldo || 0))
 } catch {
 if (!ativo) return
 setSaldo(0)
 }
 }

 carregarSaldo()

 return () => {
 ativo = false
 }
 }, [])

 const corDestaque =
 tipoPerfil === 'produtora'
 ? '#ff7a00'
 : tipoPerfil === 'equipe'
 ? '#7c3aed'
 : tipoPerfil === 'jogo'
 ? '#00d5ff'
 : '#2563eb'

 return (
 <nav className="dz-topbar sticky top-0 z-50 flex h-[60px] items-center justify-between px-3 md:px-5">
 <div className="flex min-w-0 items-center gap-3">
 <button className="dz-icon-btn lg:hidden" type="button" aria-label="Menu">
 <Menu size={16} />
 </button>

 <button
 type="button"
 className="flex min-w-0 items-center gap-3"
 onClick={() => router.push('/')}
 >
 <div className="grid h-10 w-10 shrink-0 place-items-center border border-slate-200 bg-white ">
 <DropZoneLogo size="sm" animated />
 </div>
 <div className="hidden min-w-0 text-left sm:block">
 <h1 className="truncate text-[14px] font-semibold tracking-[-0.03em] text-slate-950">
 DROP <span className="text-[#ff7a00]">ZONE</span>
 </h1>
 <span className="block truncate text-[9px] font-bold uppercase tracking-[0.24em] text-zinc-500">
 Gaming System
 </span>
 </div>
 </button>
 </div>

 <div className="hidden flex-1 justify-center px-6 md:flex">
 <div className="flex h-9 w-full max-w-md items-center gap-2 border border-slate-200 bg-white px-3 text-zinc-500 ">
 <Search size={15} />
 <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Buscar...</span>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button className="dz-icon-btn hidden md:inline-flex" type="button" aria-label="Notificações">
 <Bell size={16} />
 </button>

 {usuarioLogado ? (
 <>
 <button
 type="button"
 onClick={() => router.push('/carteira')}
 className="hidden items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-left md:flex"
 >
 <Wallet size={15} className="text-emerald-600" />
 <div className="leading-none">
 <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Carteira</div>
 <div className="mt-1 text-[11px] font-semibold text-slate-950">{formatarDinheiro(saldo)}</div>
 </div>
 </button>

 <button
 type="button"
 className="flex items-center gap-2 border border-slate-200 bg-white px-2 py-1.5 "
 onClick={() => router.push('/perfil')}
 >
 <div className="hidden text-right leading-none sm:block">
 <div className="max-w-[150px] truncate text-[11px] font-extrabold text-slate-950">
 {loading ? 'CARREGANDO...' : perfilAtivo?.nome || perfilAtivo?.username || 'USUÁRIO'}
 </div>
 <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: corDestaque }}>
 {tipoPerfil === 'usuario' ? 'Conta pessoal' : tipoPerfil}
 </div>
 </div>

 <div className="grid h-9 w-9 place-items-center overflow-hidden border bg-slate-50" style={{ borderColor: `${corDestaque}55` }}>
 {perfilAtivo?.avatar_url ? (
 <img src={perfilAtivo.avatar_url} className="h-full w-full object-cover" alt="Avatar" />
 ) : (
 <User className="text-zinc-500" size={17} />
 )}
 </div>
 </button>

 </>
 ) : (
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => router.push('/cadastro')}
 className="hidden h-10 items-center gap-2 border border-orange-300 bg-orange-50 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-orange-700 transition hover:bg-orange-100 sm:inline-flex"
 >
 <UserPlus size={14} />
 Registre-se
 </button>
 <button
 type="button"
 onClick={() => router.push('/login')}
 className="inline-flex h-10 items-center gap-2 border border-blue-300 bg-blue-600 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-blue-700"
 >
 <LogIn size={14} />
 Login
 </button>
 </div>
 )}
 </div>
 </nav>
 )
}
