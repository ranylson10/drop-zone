'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Waypoints } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/app/contexts/PerfilContext'

type LineResumo = {
 id: string
 nome: string | null
 tipo?: string | null
 plataforma?: string | null
 visibilidade?: string | null
 equipe_id?: string | null
 created_by?: string | null
 ativa?: boolean | null
 updated_at?: string | null
 created_at?: string | null
 equipe?: { id: string; nome: string | null; logo_url?: string | null } | null
}

type PerfilBaseResumo = {
 id: string
}

type SupabaseErrorLike = {
 message?: string
}

function formatarData(valor?: string | null) {
 if (!valor) return 'N/I'
 return new Intl.DateTimeFormat('pt-BR').format(new Date(valor))
}

export default function TabLines() {
 const { user, equipes } = usePerfil()
 const [loading, setLoading] = useState(true)
 const [lines, setLines] = useState<LineResumo[]>([])
 const [erro, setErro] = useState<string | null>(null)

 const carregar = useCallback(async () => {
  setLoading(true)
  setErro(null)

  if (!user?.id) {
   setLines([])
   setLoading(false)
   return
  }

  try {
   const equipeIds = ((equipes || []) as PerfilBaseResumo[]).map((item) => item.id).filter(Boolean)
   const lineMap = new Map<string, LineResumo>()

   const { data: minhasCriadas, error: criadasError } = await supabase
    .from('lines')
    .select('id, nome, tipo, visibilidade, plataforma, equipe_id, created_by, ativa, created_at, updated_at')
    .eq('created_by', user.id)
    .order('updated_at', { ascending: false })

   if (criadasError) throw criadasError
   ;((minhasCriadas || []) as LineResumo[]).forEach((line) => lineMap.set(line.id, line))

   if (equipeIds.length > 0) {
    const { data: porEquipe, error: porEquipeError } = await supabase
     .from('lines')
     .select('id, nome, tipo, visibilidade, plataforma, equipe_id, created_by, ativa, created_at, updated_at')
     .in('equipe_id', equipeIds)
     .order('updated_at', { ascending: false })

    if (porEquipeError) throw porEquipeError
    ;((porEquipe || []) as LineResumo[]).forEach((line) => lineMap.set(line.id, line))
   }

   const lista = Array.from(lineMap.values())
   const idsEquipesLine = Array.from(new Set(lista.map((line) => line.equipe_id).filter(Boolean))) as string[]
   const equipesMap = new Map<string, { id: string; nome: string | null; logo_url?: string | null }>()

   if (idsEquipesLine.length > 0) {
    const { data: equipesData, error: equipesError } = await supabase
     .from('equipes')
     .select('id, nome, logo_url')
     .in('id', idsEquipesLine)

    if (equipesError) throw equipesError
    ;((equipesData || []) as { id: string; nome: string | null; logo_url?: string | null }[]).forEach((equipe) => equipesMap.set(equipe.id, equipe))
   }

   setLines(lista.map((line) => ({ ...line, equipe: line.equipe_id ? equipesMap.get(line.equipe_id) || null : null })))
  } catch (error: unknown) {
   console.error('Erro ao carregar lines do perfil:', error)
   setErro((error as SupabaseErrorLike)?.message || 'Nao foi possivel carregar suas lines.')
  } finally {
   setLoading(false)
  }
 }, [user?.id, equipes])

 useEffect(() => {
  carregar()
 }, [carregar])

 if (loading) {
  return (
   <div className="flex items-center justify-center gap-2 p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
    <Loader2 size={15} className="animate-spin" />
    Carregando lines...
   </div>
  )
 }

 return (
  <div className="space-y-4 p-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-[#2563eb]">Minhas lines</h2>
     <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
      Lines criadas por voce ou ligadas as suas equipes.
     </p>
    </div>
    <Link href="/equipe" className="inline-flex items-center gap-2 border border-[#2563eb] bg-[#2563eb] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white hover:bg-[#1d4ed8]">
     <Plus size={14} />
     Nova line
    </Link>
   </div>

   {erro ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-600">{erro}</div> : null}

   {lines.length > 0 ? (
    <div className="grid gap-2 md:grid-cols-2">
     {lines.map((line) => (
      <Link key={line.id} href={`/line/${line.id}`} className="flex items-center gap-3 border border-zinc-200 bg-white p-3 hover:border-[#2563eb]">
       <div className="flex h-12 w-12 items-center justify-center border border-zinc-200 bg-zinc-50 text-[11px] font-black uppercase text-zinc-500">
        {line.equipe?.logo_url ? <img src={line.equipe.logo_url} className="h-full w-full object-cover" alt="" /> : <Waypoints size={20} />}
       </div>
       <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black uppercase text-[#142340]">{line.nome || 'Line'}</div>
        <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
         {line.equipe?.nome || 'Sem equipe'} - {line.plataforma || 'Plataforma N/I'} - {line.ativa === false ? 'Inativa' : 'Ativa'}
        </div>
       </div>
       <div className="text-right text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400">
        {formatarData(line.updated_at || line.created_at)}
       </div>
      </Link>
     ))}
    </div>
   ) : (
    <div className="border border-zinc-200 bg-zinc-50 p-5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
     Voce ainda nao possui lines vinculadas.
    </div>
   )}
  </div>
 )
}
