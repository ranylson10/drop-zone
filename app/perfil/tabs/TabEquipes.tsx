'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, Check, Crown, Loader2, LogOut, Shield, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type EquipeResumo = {
 id: string
 nome: string | null
 logo_url?: string | null
 cover_url?: string | null
 criado_por?: string | null
}

type VinculoEquipe = {
 id: string
 equipe_id: string
 tipo: string | null
 ativo: boolean
 entrou_em: string | null
 equipes?: EquipeResumo | null
}

type ConviteManager = {
 id: string
 equipe_id: string
 convidado_user_id: string
 convidado_por_user_id: string
 status: string
 mensagem?: string | null
 created_at: string
 equipes?: EquipeResumo | null
}

type OrganizacaoRpc = {
 relacao: string
 vinculo_id: string | null
 equipe_id: string
 nome: string | null
 logo_url: string | null
 cover_url: string | null
 criado_por: string | null
 entrou_em: string | null
}

function formatarData(valor?: string | null) {
 if (!valor) return 'N/I'
 return new Intl.DateTimeFormat('pt-BR').format(new Date(valor))
}

function equipeDoVinculo(vinculo: VinculoEquipe): EquipeResumo | null {
 return vinculo.equipes || null
}

function adicionarEquipeUnica(map: Map<string, EquipeResumo>, equipe?: EquipeResumo | null) {
 if (!equipe?.id) return
 if (!map.has(equipe.id)) map.set(equipe.id, equipe)
}

function adicionarVinculoUnico(map: Map<string, VinculoEquipe>, vinculo?: VinculoEquipe | null) {
 if (!vinculo?.id) return
 if (!map.has(vinculo.id)) map.set(vinculo.id, vinculo)
}

export default function TabEquipes() {
 const [userId, setUserId] = useState<string | null>(null)
 const [loading, setLoading] = useState(true)
 const [salvando, setSalvando] = useState<string | null>(null)
 const [equipesDono, setEquipesDono] = useState<EquipeResumo[]>([])
 const [vinculos, setVinculos] = useState<VinculoEquipe[]>([])
 const [convites, setConvites] = useState<ConviteManager[]>([])
 const [erro, setErro] = useState<string | null>(null)

 const carregar = useCallback(async () => {
  setLoading(true)
  setErro(null)

  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id || null
  setUserId(uid)

  if (!uid) {
   setLoading(false)
   return
  }

  const equipesDonoMap = new Map<string, EquipeResumo>()
  const vinculosMap = new Map<string, VinculoEquipe>()

  const { data: organizacoesRpc, error: organizacoesRpcError } = await supabase
   .rpc('fn_lealt_perfil_organizacoes_usuario', { p_user_id: uid })

  if (!organizacoesRpcError && Array.isArray(organizacoesRpc)) {
   ;(organizacoesRpc as OrganizacaoRpc[]).forEach((item) => {
    const equipe: EquipeResumo = {
     id: item.equipe_id,
     nome: item.nome,
     logo_url: item.logo_url,
     cover_url: item.cover_url,
     criado_por: item.criado_por,
    }

    if (item.relacao === 'manager') {
     adicionarVinculoUnico(vinculosMap, {
      id: item.vinculo_id || `manager-${item.equipe_id}`,
      equipe_id: item.equipe_id,
      tipo: 'manager',
      ativo: true,
      entrou_em: item.entrou_em,
      equipes: equipe,
     })
    } else {
     adicionarEquipeUnica(equipesDonoMap, equipe)
    }
   })
  } else if (organizacoesRpcError) {
   console.warn('RPC de organizações do perfil indisponível, usando fallback:', organizacoesRpcError)
  }

  const { data: perfis } = await supabase
   .from('perfis_jogo')
   .select('id')
   .eq('user_id', uid)

  const perfilIds = (perfis || []).map((p: any) => p.id).filter(Boolean)

  const { data: donoDireto, error: donoDiretoError } = await supabase
   .from('equipes')
   .select('id, nome, logo_url, cover_url, criado_por')
   .eq('criado_por', uid)
   .order('created_at', { ascending: false })

  if (donoDiretoError) console.error('Erro ao carregar equipes criadas:', donoDiretoError)
  ;((donoDireto || []) as EquipeResumo[]).forEach((equipe) => adicionarEquipeUnica(equipesDonoMap, equipe))

  const selectVinculo = 'id, equipe_id, tipo, ativo, entrou_em, equipes(id, nome, logo_url, cover_url, criado_por)'

  const { data: vinculosPorUser, error: vinculosPorUserError } = await supabase
   .from('membros_equipe')
   .select(selectVinculo)
   .eq('user_id', uid)
   .eq('ativo', true)
   .in('tipo', ['dono', 'admin', 'manager'])
   .order('entrou_em', { ascending: false })

  if (vinculosPorUserError) console.error('Erro ao carregar vínculos por conta:', vinculosPorUserError)
  ;((vinculosPorUser || []) as unknown as VinculoEquipe[]).forEach((vinculo) => {
   if (String(vinculo.tipo) === 'manager') adicionarVinculoUnico(vinculosMap, vinculo)
   if (['dono', 'admin'].includes(String(vinculo.tipo))) adicionarEquipeUnica(equipesDonoMap, equipeDoVinculo(vinculo))
  })

  if (perfilIds.length > 0) {
   const { data: vinculosPorPerfil, error: vinculosPorPerfilError } = await supabase
    .from('membros_equipe')
    .select(selectVinculo)
    .in('perfil_jogo_id', perfilIds)
    .eq('ativo', true)
    .in('tipo', ['dono', 'admin', 'manager'])
    .order('entrou_em', { ascending: false })

   if (vinculosPorPerfilError) console.error('Erro ao carregar vínculos por perfil gamer:', vinculosPorPerfilError)
   ;((vinculosPorPerfil || []) as unknown as VinculoEquipe[]).forEach((vinculo) => {
    if (String(vinculo.tipo) === 'manager') adicionarVinculoUnico(vinculosMap, vinculo)
    if (['dono', 'admin'].includes(String(vinculo.tipo))) adicionarEquipeUnica(equipesDonoMap, equipeDoVinculo(vinculo))
   })
  }

  const { data: convitesData, error: convitesError } = await supabase
   .from('equipe_manager_convites')
   .select('id, equipe_id, convidado_user_id, convidado_por_user_id, status, mensagem, created_at, equipes(id, nome, logo_url, cover_url, criado_por)')
   .eq('convidado_user_id', uid)
   .eq('status', 'pendente')
   .order('created_at', { ascending: false })

  if (convitesError) console.warn('Convites de manager ainda não disponíveis. Rode o SQL 02 se necessário.', convitesError)

  setEquipesDono(Array.from(equipesDonoMap.values()))
  setVinculos(Array.from(vinculosMap.values()))
  setConvites((convitesData || []) as unknown as ConviteManager[])
  setLoading(false)
 }, [])

 useEffect(() => {
  carregar()
 }, [carregar])

 const equipesManager = useMemo(() => {
  const idsDono = new Set(equipesDono.map((e) => e.id))
  return vinculos.filter((v) => String(v.tipo) === 'manager' && !idsDono.has(v.equipe_id))
 }, [vinculos, equipesDono])

 async function aceitarConvite(convite: ConviteManager) {
  if (!userId || salvando) return

  setSalvando(convite.id)
  setErro(null)

  const { error: insertError } = await supabase
   .from('membros_equipe')
   .upsert(
    {
     equipe_id: convite.equipe_id,
     user_id: userId,
     perfil_jogo_id: null,
     tipo: 'manager',
     ativo: true,
     entrou_em: new Date().toISOString(),
     saiu_em: null,
    },
    { onConflict: 'equipe_id,user_id,tipo' }
   )

  if (insertError) {
   console.error('Erro ao aceitar convite:', insertError)
   setErro(insertError.message || 'Não foi possível aceitar o convite.')
   setSalvando(null)
   return
  }

  const { error: updateError } = await supabase
   .from('equipe_manager_convites')
   .update({ status: 'aceito', respondido_em: new Date().toISOString() })
   .eq('id', convite.id)

  if (updateError) console.error('Erro ao atualizar convite:', updateError)

  try {
   await supabase.rpc('fn_lealt_sincronizar_selos_usuario', { p_user_id: userId })
  } catch {}
  await carregar()
  setSalvando(null)
 }

 async function recusarConvite(convite: ConviteManager) {
  if (salvando) return

  setSalvando(convite.id)
  setErro(null)

  const { error } = await supabase
   .from('equipe_manager_convites')
   .update({ status: 'recusado', respondido_em: new Date().toISOString() })
   .eq('id', convite.id)

  if (error) {
   console.error('Erro ao recusar convite:', error)
   setErro(error.message || 'Não foi possível recusar o convite.')
  }

  await carregar()
  setSalvando(null)
 }

 async function sairDaEquipe(vinculo: VinculoEquipe) {
  if (!confirm('Tem certeza que deseja sair como manager desta equipe?')) return

  setSalvando(vinculo.id)
  setErro(null)

  const { error } = await supabase
   .from('membros_equipe')
   .update({ ativo: false, saiu_em: new Date().toISOString() })
   .eq('id', vinculo.id)

  if (error) {
   console.error('Erro ao sair da equipe:', error)
   setErro(error.message || 'Não foi possível sair da equipe.')
  }

  if (userId) {
   try {
    await supabase.rpc('fn_lealt_sincronizar_selos_usuario', { p_user_id: userId })
   } catch {}
  }
  await carregar()
  setSalvando(null)
 }

 if (loading) {
  return (
   <div className="flex items-center justify-center gap-2 p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
    <Loader2 size={15} className="animate-spin" />
    Carregando organizações...
   </div>
  )
 }

 return (
  <div className="space-y-4 p-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-[#2563eb]">// Minhas organizações</h2>
     <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
      Equipes que você é dono, convites de manager e equipes onde atua como manager.
     </p>
    </div>

    <Link
     href="/manager"
     className="inline-flex items-center gap-2 border border-violet-300 bg-violet-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700 hover:bg-violet-100"
    >
     <Shield size={14} />
     Central do Manager
    </Link>
   </div>

   {erro ? (
    <div className="border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-600">
     {erro}
    </div>
   ) : null}

   {convites.length > 0 ? (
    <section className="border border-violet-200 bg-violet-50 p-3">
     <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">Convites pendentes</div>
     <div className="grid gap-2 md:grid-cols-2">
      {convites.map((convite) => (
       <div key={convite.id} className="border border-violet-200 bg-white p-3">
        <div className="flex items-center gap-3">
         <div className="flex h-12 w-12 items-center justify-center border border-zinc-200 bg-zinc-50 text-[11px] font-black uppercase text-zinc-500">
          {convite.equipes?.logo_url ? <img src={convite.equipes.logo_url} className="h-full w-full object-cover" alt="" /> : (convite.equipes?.nome || 'EQ').slice(0, 2)}
         </div>
         <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black uppercase text-[#142340]">{convite.equipes?.nome || 'Equipe'}</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">Convite para atuar como manager</div>
         </div>
        </div>

        {convite.mensagem ? <p className="mt-3 text-xs font-medium text-zinc-600">{convite.mensagem}</p> : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
         <button
          onClick={() => aceitarConvite(convite)}
          disabled={salvando === convite.id}
          className="inline-flex items-center justify-center gap-2 border border-emerald-300 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 disabled:opacity-60"
         >
          <Check size={13} /> Aceitar
         </button>
         <button
          onClick={() => recusarConvite(convite)}
          disabled={salvando === convite.id}
          className="inline-flex items-center justify-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-red-600 disabled:opacity-60"
         >
          <X size={13} /> Recusar
         </button>
        </div>
       </div>
      ))}
     </div>
    </section>
   ) : null}

   <section>
    <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#142340]">
     <Crown size={14} className="text-amber-500" />
     Equipes que sou dono
    </div>

    {equipesDono.length > 0 ? (
     <div className="grid gap-2 md:grid-cols-2">
      {equipesDono.map((equipe) => (
       <Link key={equipe.id} href={`/equipe/${equipe.id}`} className="flex items-center gap-3 border border-zinc-200 bg-white p-3 hover:border-[#2563eb]">
        <div className="flex h-12 w-12 items-center justify-center border border-zinc-200 bg-zinc-50 text-[11px] font-black uppercase text-zinc-500">
         {equipe.logo_url ? <img src={equipe.logo_url} className="h-full w-full object-cover" alt="" /> : (equipe.nome || 'EQ').slice(0, 2)}
        </div>
        <div className="min-w-0">
         <div className="truncate text-sm font-black uppercase text-[#142340]">{equipe.nome || 'Equipe'}</div>
         <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-600">Dono da equipe</div>
        </div>
       </Link>
      ))}
     </div>
    ) : (
     <div className="border border-zinc-200 bg-zinc-50 p-4 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
      Você ainda não possui equipes como dono.
     </div>
    )}
   </section>

   <section>
    <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#142340]">
     <BriefcaseBusiness size={14} className="text-violet-600" />
     Equipes onde sou manager
    </div>

    {equipesManager.length > 0 ? (
     <div className="grid gap-2 md:grid-cols-2">
      {equipesManager.map((vinculo) => (
       <div key={vinculo.id} className="border border-zinc-200 bg-white p-3">
        <div className="flex items-center gap-3">
         <Link href={`/equipe/${vinculo.equipe_id}`} className="flex h-12 w-12 items-center justify-center border border-zinc-200 bg-zinc-50 text-[11px] font-black uppercase text-zinc-500">
          {vinculo.equipes?.logo_url ? <img src={vinculo.equipes.logo_url} className="h-full w-full object-cover" alt="" /> : (vinculo.equipes?.nome || 'EQ').slice(0, 2)}
         </Link>
         <div className="min-w-0 flex-1">
          <Link href={`/equipe/${vinculo.equipe_id}`} className="truncate text-sm font-black uppercase text-[#142340] hover:text-[#2563eb]">
           {vinculo.equipes?.nome || 'Equipe'}
          </Link>
          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-violet-600">Manager desde {formatarData(vinculo.entrou_em)}</div>
         </div>
         <button
          onClick={() => sairDaEquipe(vinculo)}
          disabled={salvando === vinculo.id}
          className="inline-flex items-center gap-1 border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-red-600 disabled:opacity-60"
         >
          <LogOut size={12} /> Sair
         </button>
        </div>
       </div>
      ))}
     </div>
    ) : (
     <div className="border border-zinc-200 bg-zinc-50 p-4 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
      Você ainda não atua como manager em nenhuma equipe.
     </div>
    )}
   </section>
  </div>
 )
}
