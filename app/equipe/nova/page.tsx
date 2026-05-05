'use client'
import FormCriarEquipe from '@/app/components/FormCriarEquipe'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function NovaEquipePage() {
 const router = useRouter()

 // Simulação de ID de usuário (Substitua pela sua lógica de Auth)
 const userId = "cc7e9db7-e6fc-4..." 

 return (
 <div className="max-w-2xl mx-auto py-10 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
 {/* Voltar */}
 <button 
 onClick={() => router.back()}
 className="flex items-center gap-2 text-zinc-500 hover:text-[#142340] transition-colors mb-8 group"
 >
 <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
 <span className="text-[10px] font-semibold uppercase tracking-widest">Voltar para Equipes</span>
 </button>

 <div className="space-y-2 mb-8 text-center">
 <h1 className="text-3xl font-semibold uppercase tracking-tighter text-[#142340]">
 Nova <span className="text-[#2563eb]">Organização</span>
 </h1>
 <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
 Preencha os dados oficiais da sua line-up no sistema
 </p>
 </div>

 {/* Componente que criamos anteriormente */}
 <FormCriarEquipe 
 userId={userId} 
 onSuccess={() => {
 setTimeout(() => router.push('/equipe'), 2000)
 }} 
 />
 </div>
 )
}