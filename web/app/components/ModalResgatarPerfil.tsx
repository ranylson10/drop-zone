'use client'
import { useState } from 'react'
import ModalResgatarPerfil from '@/app/components/ModalResgatarPerfil'
import FormCriarJogador from '@/app/components/FormCriarJogador' // Seu form antigo
import { UserPlus, KeyRound } from 'lucide-react'

export default function PaginaPerfilUser({ user }: any) {
 const [showFormCriar, setShowFormCriar] = useState(false)
 const [showModalResgatar, setShowModalResgatar] = useState(false)

 return (
 <div className="p-6">
 {/* Outros dados do perfil... */}

 <div className="flex gap-4 mt-6">
 {/* OPÇÃO 1: Criar do zero */}
 <button 
 onClick={() => setShowFormCriar(true)}
 className="flex items-center gap-2 bg-white border border-zinc-200 px-4 py-2 text-[10px] font-semibold uppercase hover:bg-zinc-50 transition-all"
 >
 <UserPlus size={14} className="text-[#ff5500]" />
 Criar Novo Perfil de Jogo
 </button>

 {/* OPÇÃO 2: Resgatar perfil órfão via Token */}
 <button 
 onClick={() => setShowModalResgatar(true)}
 className="flex items-center gap-2 bg-[#ff5500] px-4 py-2 text-[10px] text-[#142340] font-semibold uppercase hover:bg-[#ff7700] transition-all"
 >
 <KeyRound size={14} />
 Já tenho um Token de Vínculo
 </button>
 </div>

 {/* Renderização dos Modais */}
 {showModalResgatar && (
 <ModalResgatarPerfil 
 userId={user.id} 
 onCancel={() => setShowModalResgatar(false)}
 onSuccess={() => {
 setShowModalResgatar(false);
 window.location.reload(); // Recarrega para mostrar o novo perfil vinculado
 }}
 />
 )}

 {/* ... o restante do seu código de perfil ... */}
 </div>
 )
}