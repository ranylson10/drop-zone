'use client'

import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'
import { usePerfil } from '@/app/contexts/PerfilContext'

type ProdutoraResumo = {
 id: string
 nome?: string | null
 logo_url?: string | null
}

export default function TabProdutoras() {
 const { produtoras } = usePerfil()

 return (
  <div className="space-y-4 p-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-[#2563eb]">Minhas produtoras</h2>
     <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
      Produtoras criadas por voce ou onde voce participa como membro.
     </p>
    </div>
    <Link href="/produtora" className="inline-flex items-center gap-2 border border-[#2563eb] bg-[#2563eb] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white hover:bg-[#1d4ed8]">
     <Plus size={14} />
     Criar produtora
    </Link>
   </div>

   {produtoras.length > 0 ? (
    <div className="grid gap-2 md:grid-cols-2">
     {(produtoras as ProdutoraResumo[]).map((produtora) => (
      <Link key={produtora.id} href={`/produtora/${produtora.id}`} className="flex items-center gap-3 border border-zinc-200 bg-white p-3 hover:border-[#2563eb]">
       <div className="flex h-12 w-12 items-center justify-center border border-zinc-200 bg-zinc-50 text-[11px] font-black uppercase text-zinc-500">
        {produtora.logo_url ? <img src={produtora.logo_url} className="h-full w-full object-cover" alt="" /> : <Building2 size={20} />}
       </div>
       <div className="min-w-0">
        <div className="truncate text-sm font-black uppercase text-[#142340]">{produtora.nome || 'Produtora'}</div>
        <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Perfil de produtora</div>
       </div>
      </Link>
     ))}
    </div>
   ) : (
    <div className="border border-zinc-200 bg-zinc-50 p-5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
     Voce ainda nao possui produtora vinculada.
    </div>
   )}
  </div>
 )
}
