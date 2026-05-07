'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Loader2, LogOut, Shield, Users, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ProfileResumo = {
 id: string
 username: string | null
 nome_exibicao: string | null
 foto_url: string | null
}

type EquipeResumo = {
 id: string
 nome: string
 tag: string | null
 logo_url: string | null
 criado_por: string | null
}

type ConviteManager = {
 id: string
 equipe_id: string
 convidado_user_id: string
 convidado_por_user_id: string
 status: string
 mensagem: string | null
 created_at: string | null
 equipes: EquipeResumo | EquipeResumo[] | null
 convidado_por: ProfileResumo | ProfileResumo[] | null
}

type VinculoEquipe = {
 id: string
 equipe_id: string
 user_id: string | null
 tipo: 'dono' | 'admin' | 'manager' | 'membro'
 ativo: boolean
 entrou_em: string | null
 equipes: EquipeResumo | EquipeResumo[] | null
}

function normalizar<T>(valor: T | T[] | null | undefined): T | null {
 if (!valor) return null
 return Array.isArray(valor) ? valor[0] || null : valor
}

function dataBR(data?: string | null) {
 if (!data) return 'N/I'
 const d = new Date(data)
 return Number.isNaN(d.getTime()) ? 'N/I' : new Intl.DateTimeFormat('pt-BR').format(d)
}

function nomeProfile(profile?: ProfileResumo | null) {
 return profile?.nome_exibicao || profile?.username || 'Usuário'
}

export default function TabEquipes() {
 const [userId, setUserId] = useState<string | null>(null)
 const [loading, setLoading] = useState(true)
 const [processando, setProcessando] = useState<string | null>(null)
 const [convites, setConvites] = useState<ConviteManager[]>([])
 const [vinculos, setVinculos] = useState<VinculoEquipe[]>([])
 const [minhasEquipes, setMinhasEquipes] = useState<EquipeResumo[]>([])
 const [erro, setErro] = useState<string | null>(null)
 const [msg, setMsg] = useState<string | null>(null)

 const carregar = useCallback(async () => {
  try {
   setLoading(true)
   setErro(null)

   const { data: authData, error: authError } = await supabase.auth.getUser()
   if (authError) throw authError

   const uid = authData?.user?.id || null
   setUserId(uid)

   if (!uid) {
    setConvites([])
    setVinculos([])
    setMinhasEquipes([])
    return
   }

   const [convitesRes, vinculosRes, minhasEquipesRes] = await Promise.all([
    supabase
     .from('equipe_manager_convites')
     .select(`
      id,
      equipe_id,
      convidado_user_id,
      convidado_por_user_id,
      status,
      mensagem,
      created_at,
      equipes:equipe_id (
       id,
       nome,
       tag,
       logo_url,
       criado_por
      ),
      convidado_por:convidado_por_user_id (
       id,
       username,
       nome_exibicao,
       foto_url
      )
     `)
     .eq('convidado_user_id', uid)
     .eq('status', 'pendente')
     .order('created_at', { ascending: false }),

    supabase
     .from('membros_equipe')
     .select(`
      id,
      equipe_id,
      user_id,
      tipo,
      ativo,
      entrou_em,
      equipes:equipe_id (
       id,
       nome,
       tag,
       logo_url,
       criado_por
      )
     `)
     .eq('user_id', uid)
     .eq('ativo', true)
     .in('tipo', ['manager', 'admin', 'dono'])
     .order('entrou_em', { ascending: false }),

    supabase
     .from('equipes')
     .select('id, nome, tag, logo_url, criado_por')
     .eq('criado_por', uid)
     .order('nome', { ascending: true }),
   ])

   if (convitesRes.error) throw convitesRes.error
   if (vinculosRes.error) throw vinculosRes.error
   if (minhasEquipesRes.error) throw minhasEquipesRes.error

   setConvites((convitesRes.data || []) as ConviteManager[])
   setVinculos((vinculosRes.data || []) as VinculoEquipe[])
   setMinhasEquipes((minhasEquipesRes.data || []) as EquipeResumo[])
  } catch (e: any) {
   setErro(e?.message || 'Não foi possível carregar suas equipes.')
  } finally {
   setLoading(false)
  }
 }, [])

 useEffect(() => {
  carregar()
 }, [carregar])

 const equipesDono = useMemo(() => {
  const mapa = new Map<string, EquipeResumo>()
  minhasEquipes.forEach((e) => mapa.set(e.id, e))
  vinculos.forEach((v) => {
   const equipe = normalizar(v.equipes)
   if (v.tipo === 'dono' && equipe) mapa.set(equipe.id, equipe)
  })
  return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
 }, [minhasEquipes, vinculos])

 const equipesManager = useMemo(
  () =>
   vinculos
    .filter((v) => v.tipo === 'manager')
    .map((v) => ({ vinculo: v, equipe: normalizar(v.equipes) }))
    .filter((item) => !!item.equipe),
  [vinculos]
 )

 async function responderConvite(conviteId: string, aceitar: boolean) {
  try {
   setProcessando(conviteId)
   setErro(null)
   setMsg(null)

   const { error } = await supabase.rpc(
    aceitar ? 'fn_aceitar_convite_manager_equipe' : 'fn_recusar_convite_manager_equipe',
    { p_convite_id: conviteId }
   )

   if (error) throw error

   setMsg(aceitar ? 'Convite aceito. A equipe foi adicionada à sua lista de managers.' : 'Convite recusado.')
   await carregar()
  } catch (e: any) {
   setErro(e?.message || 'Não foi possível responder o convite.')
  } finally {
   setProcessando(null)
  }
 }

 async function sairComoManager(vinculoId: string) {
  const confirmar = window.confirm('Sair como manager desta equipe?')
  if (!confirmar) return

  try {
   setProcessando(vinculoId)
   setErro(null)
   setMsg(null)

   const { error } = await supabase.rpc('fn_sair_manager_equipe', { p_membro_id: vinculoId })
   if (error) throw error

   setMsg('Você saiu como manager da equipe.')
   await carregar()
  } catch (e: any) {
   setErro(e?.message || 'Não foi possível sair como manager.')
  } finally {
   setProcessando(null)
  }
 }

 if (loading) {
  return (
   <div className="border border-zinc-200 bg-white p-8 text-center">
    <Loader2 className="mx-auto mb-4 animate-spin text-[#2563eb]" size={28} />
    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Carregando equipes...</p>
   </div>
  )
 }

 if (!userId) {
  return (
   <div className="border border-zinc-200 bg-white p-8 text-center">
    <Users className="mx-auto mb-4 opacity-20" size={40} />
    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Entre na conta para ver suas equipes.</p>
   </div>
  )
 }

 return (
  <div className="space-y-5 bg-white p-4 md:p-5">
   <div className="flex flex-wrap items-start justify-between gap-3 border border-zinc-200 bg-[#f8f8f8] p-4">
    <div>
     <h2 className="text-[12px] font-black uppercase tracking-[0.28em] text-[#2563eb]">// Minhas organizações</h2>
     <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
      Equipes que você é dono e equipes onde atua como manager.
     </p>
    </div>
    <Link href="/manager" className="inline-flex h-10 items-center gap-2 border border-violet-300 bg-violet-50 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-violet-800 hover:bg-violet-100">
     <Shield size={14} /> Central do manager
    </Link>
   </div>

   {erro ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-red-700">{erro}</div> : null}
   {msg ? <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">{msg}</div> : null}

   {convites.length > 0 ? (
    <section className="border border-violet-200 bg-violet-50/60 p-4">
     <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-violet-800">Convites para manager</h3>
     <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {convites.map((convite) => {
       const equipe = normalizar(convite.equipes)
       const convidador = normalizar(convite.convidado_por)
       return (
        <div key={convite.id} className="border border-violet-200 bg-white p-3">
         <div className="flex gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
           {equipe?.logo_url ? <Image src={equipe.logo_url} alt={equipe.nome} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-[11px] font-black text-zinc-500">{(equipe?.nome || 'EQ').slice(0, 2).toUpperCase()}</div>}
          </div>
          <div className="min-w-0 flex-1">
           <p className="truncate text-[14px] font-black uppercase text-[#142340]">{equipe?.nome || 'Equipe'}</p>
           <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Enviado por {nomeProfile(convidador)} em {dataBR(convite.created_at)}</p>
          </div>
         </div>
         <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={processando === convite.id} onClick={() => responderConvite(convite.id, true)} className="inline-flex h-10 items-center justify-center gap-2 border border-emerald-300 bg-emerald-50 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 disabled:opacity-50">
           {processando === convite.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Aceitar
          </button>
          <button type="button" disabled={processando === convite.id} onClick={() => responderConvite(convite.id, false)} className="inline-flex h-10 items-center justify-center gap-2 border border-red-300 bg-red-50 text-[10px] font-black uppercase tracking-[0.14em] text-red-700 disabled:opacity-50">
           <X size={13} /> Recusar
          </button>
         </div>
        </div>
       )
      })}
     </div>
    </section>
   ) : null}

   <section>
    <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#2563eb]">Equipes que sou dono</h3>
    {equipesDono.length > 0 ? (
     <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {equipesDono.map((equipe) => <EquipeCard key={equipe.id} equipe={equipe} tag="Dono" />)}
     </div>
    ) : (
     <div className="border border-zinc-200 bg-[#f8f8f8] p-4 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Você ainda não é dono de nenhuma equipe.</div>
    )}
   </section>

   <section>
    <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">Equipes que gerencio</h3>
    {equipesManager.length > 0 ? (
     <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {equipesManager.map(({ vinculo, equipe }) => (
       <EquipeCard key={vinculo.id} equipe={equipe!} tag="Manager" extra={`Entrou em ${dataBR(vinculo.entrou_em)}`}>
        <button type="button" disabled={processando === vinculo.id} onClick={() => sairComoManager(vinculo.id)} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 border border-red-300 bg-red-50 text-[10px] font-black uppercase tracking-[0.14em] text-red-700 disabled:opacity-50">
         {processando === vinculo.id ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />} Sair como manager
        </button>
       </EquipeCard>
      ))}
     </div>
    ) : (
     <div className="border border-zinc-200 bg-[#f8f8f8] p-4 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Você ainda não gerencia nenhuma equipe.</div>
    )}
   </section>
  </div>
 )
}

function EquipeCard({ equipe, tag, extra, children }: { equipe: EquipeResumo; tag: string; extra?: string; children?: ReactNode }) {
 return (
  <div className="border border-zinc-200 bg-white p-3">
   <div className="flex gap-3">
    <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
     {equipe.logo_url ? <Image src={equipe.logo_url} alt={equipe.nome} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-[12px] font-black text-zinc-500">{equipe.nome.slice(0, 2).toUpperCase()}</div>}
    </div>
    <div className="min-w-0 flex-1">
     <div className="flex items-center gap-2">
      <p className="truncate text-[15px] font-black uppercase text-[#142340]">{equipe.nome}</p>
      <span className={tag === 'Manager' ? 'bg-violet-100 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-violet-800' : 'bg-yellow-200 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#142340]'}>{tag}</span>
     </div>
     <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{equipe.tag ? `TAG ${equipe.tag}` : 'Sem tag cadastrada'}</p>
     {extra ? <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8ea0be]">{extra}</p> : null}
    </div>
   </div>
   <Link href={`/equipe/${equipe.id}`} className="mt-3 inline-flex h-9 w-full items-center justify-center border border-zinc-300 bg-[#f8f8f8] text-[10px] font-black uppercase tracking-[0.14em] text-[#142340] hover:bg-zinc-100">
    Abrir equipe
   </Link>
   {children}
  </div>
 )
}
