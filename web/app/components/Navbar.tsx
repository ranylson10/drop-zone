'use client'

import { Bell, Search, User, Menu, LogIn, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePerfil } from '../contexts/PerfilContext'
import { DropZoneLogo } from './DropZoneLogo'
import { getIdentityImage, getIdentityName } from '@/lib/identity'


export default function Navbar({ onOpenMenu }: { onOpenMenu?: () => void }) {
 const { user, perfilAtivo, tipoPerfil, loading } = usePerfil()
 const router = useRouter()
 const usuarioLogado = Boolean(user)
 const identityImage = getIdentityImage(perfilAtivo)

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
 <button
 className="dz-icon-btn lg:hidden"
 type="button"
 aria-label="Abrir menu lateral"
 onClick={onOpenMenu}
 >
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
 className="flex items-center gap-2 border border-slate-200 bg-white px-2 py-1.5 "
 onClick={() => router.push('/identidade')}
 >
 <div className="hidden text-right leading-none sm:block">
 <div className="max-w-[150px] truncate text-[11px] font-extrabold text-slate-950">
 {loading ? 'CARREGANDO...' : getIdentityName(perfilAtivo, 'USUARIO')}
 </div>
 <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: corDestaque }}>
 {tipoPerfil === 'usuario' ? 'Conta pessoal' : tipoPerfil}
 </div>
 </div>

 <div className="grid h-9 w-9 place-items-center overflow-hidden border bg-slate-50" style={{ borderColor: `${corDestaque}55` }}>
 {identityImage ? (
 <img src={identityImage} className="h-full w-full object-cover" alt="Avatar" />
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
