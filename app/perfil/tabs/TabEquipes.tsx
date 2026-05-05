'use client'
import { Users as UsersIcon } from 'lucide-react'

export default function TabEquipes() {
 return (
 <div className="bg-white border border-zinc-200 p-8 text-center">
 <UsersIcon className="mx-auto mb-4 opacity-10" size={40} />
 <p className="text-[10px] text-zinc-500 uppercase ">Módulo de Equipes em standby. Conecte-se a uma organização para ver detalhes.</p>
 </div>
 )
}