'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/app/contexts/PerfilContext'
import { resolverTipoCompeticao } from '@/app/campeonatos/components/tiposCompeticao'
import { getCampeonatoHref } from '@/app/campeonatos/utils/getCampeonatoHref'

type CampeonatoResumo = {
 id: string
 nome: string | null
 logo_url?: string | null
 status?: string | null
 tipo_competicao?: string | null
 modelo_competicao?: string | null
 formato?: string | null
 valor_vaga?: number | string | null
 valor_premiacao?: number | string | null
 produtora_id?: string | null
 created_at?: string | null
}

type ProdutoraResumo = {
 id: string
}

type SupabaseErrorLike = {
 message?: string
}

function formatarMoeda(valor?: string | number | null) {
 return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function TabCampeonatos() {
 const { produtoras } = usePerfil()
 const [loading, setLoading] = useState(true)
 const [campeonatos, setCampeonatos] = useState<CampeonatoResumo[]>([])
 const [erro, setErro] = useState<string | null>(null)

 const carregar = useCallback(async () => {
  setLoading(true)
  setErro(null)

  const produtoraIds = ((produtoras || []) as ProdutoraResumo[]).map((item) => item.id).filter(Boolean)

  if (produtoraIds.length === 0) {
   setCampeonatos([])
   setLoading(false)
   return
  }

  try {
   const { data, error } = await supabase
    .from('campeonatos')
    .select('id, nome, logo_url, status, tipo_competicao, modelo_competicao, formato, valor_vaga, valor_premiacao, produtora_id, created_at')
    .in('produtora_id', produtoraIds)
    .order('created_at', { ascending: false })

   if (error) throw error
   setCampeonatos((data || []) as CampeonatoResumo[])
  } catch (error: unknown) {
   console.error('Erro ao carregar campeonatos do perfil:', error)
   setErro((error as SupabaseErrorLike)?.message || 'Nao foi possivel carregar seus campeonatos.')
  } finally {
   setLoading(false)
  }
 }, [produtoras])

 useEffect(() => {
  carregar()
 }, [carregar])

 if (loading) {
  return (
   <div className="flex items-center justify-center gap-2 p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
    <Loader2 size={15} className="animate-spin" />
    Carregando campeonatos...
   </div>
  )
 }

 return (
  <div className="space-y-4 p-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-[#2563eb]">Campeonatos das produtoras</h2>
     <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
      Torneios criados pelas produtoras que voce administra.
     </p>
    </div>
    <Link href={produtoras.length > 0 ? '/campeonatos/nova' : '/produtora'} className="inline-flex items-center gap-2 border border-[#2563eb] bg-[#2563eb] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white hover:bg-[#1d4ed8]">
     <Plus size={14} />
     {produtoras.length > 0 ? 'Novo campeonato' : 'Criar produtora'}
    </Link>
   </div>

   {erro ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-600">{erro}</div> : null}

   {produtoras.length === 0 ? (
    <div className="border border-amber-200 bg-amber-50 p-5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
     Para criar campeonato voce precisa ter uma produtora. Use o botao acima para criar uma.
    </div>
   ) : campeonatos.length > 0 ? (
    <div className="grid gap-2 md:grid-cols-2">
     {campeonatos.map((camp) => {
      const tipo = resolverTipoCompeticao(camp)
      return (
       <Link key={camp.id} href={getCampeonatoHref(camp.id, tipo)} className="flex items-center gap-3 border border-zinc-200 bg-white p-3 hover:border-[#2563eb]">
        <div className="flex h-12 w-12 items-center justify-center border border-zinc-200 bg-zinc-50 text-[11px] font-black uppercase text-zinc-500">
         {camp.logo_url ? <img src={camp.logo_url} className="h-full w-full object-cover" alt="" /> : <Trophy size={20} />}
        </div>
        <div className="min-w-0 flex-1">
         <div className="truncate text-sm font-black uppercase text-[#142340]">{camp.nome || 'Campeonato'}</div>
         <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
          {tipo} - {camp.status || 'status N/I'} - vaga {formatarMoeda(camp.valor_vaga)}
         </div>
        </div>
        <div className="text-right text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">
         {formatarMoeda(camp.valor_premiacao)}
        </div>
       </Link>
      )
     })}
    </div>
   ) : (
    <div className="border border-zinc-200 bg-zinc-50 p-5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
     Nenhum campeonato encontrado para suas produtoras.
    </div>
   )}
  </div>
 )
}
