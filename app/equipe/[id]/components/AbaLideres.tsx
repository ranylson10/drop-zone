'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Crown, Shield, UserPlus, UserMinus, Loader2, Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ProfileResumo = {
 id: string
 username: string | null
 nome_exibicao: string | null
 foto_url: string | null
}

type TipoMembroEquipe = 'dono' | 'admin' | 'manager' | 'membro'

type LiderComando = {
 id: string
 tipo: TipoMembroEquipe
 entrou_em: string | null
 perfilUsuario: ProfileResumo | null
 perfilJogo: { id: string; nick: string | null; foto_capa: string | null; funcao: string | null } | null
}

type MembroEquipeNormalizado = {
 id: string
 equipe_id: string
 perfil_jogo_id: string
 tipo: TipoMembroEquipe
 ativo: boolean
 entrou_em: string | null
 saiu_em: string | null
 perfil: {
 id: string
 nick: string | null
 foto_capa: string | null
 funcao: string | null
 user_id: string | null
 profile: ProfileResumo | null
 } | null
}

type ManagerConta = {
 membroId: string
 profileId: string
 entrou_em: string | null
 profile: ProfileResumo | null
}

type Props = {
 equipeId: string
 membros: LiderComando[]
 todosMembros: MembroEquipeNormalizado[]
 canManageAdmins: boolean
 onAtualizado?: () => void | Promise<void>
}

function nomeUsuario(profile?: ProfileResumo | null) {
 return profile?.nome_exibicao || profile?.username || 'Usuário sem nome'
}

function nomeLider(m: LiderComando) {
 return m.perfilUsuario?.nome_exibicao || m.perfilUsuario?.username || m.perfilJogo?.nick || 'Usuário sem nome'
}

function dataBR(data?: string | null) {
 if (!data) return 'N/I'
 const d = new Date(data)
 return Number.isNaN(d.getTime()) ? 'N/I' : new Intl.DateTimeFormat('pt-BR').format(d)
}

function uidCurto(id?: string | null) {
 if (!id) return ''
 return `${id.slice(0, 8)}...`
}

export default function AbaLideres({ equipeId, membros, canManageAdmins, onAtualizado }: Props) {
 const [busca, setBusca] = useState('')
 const [buscando, setBuscando] = useState(false)
 const [resultados, setResultados] = useState<ProfileResumo[]>([])
 const [selecionado, setSelecionado] = useState<ProfileResumo | null>(null)
 const [managers, setManagers] = useState<ManagerConta[]>([])
 const [salvando, setSalvando] = useState(false)
 const [msg, setMsg] = useState<string | null>(null)
 const [erro, setErro] = useState<string | null>(null)

 const donos = useMemo(() => membros.filter((m) => m.tipo === 'dono'), [membros])
 const donosIds = useMemo(() => new Set(donos.map((m) => m.perfilUsuario?.id).filter(Boolean) as string[]), [donos])
 const managersIds = useMemo(() => new Set(managers.map((m) => m.profileId)), [managers])

 const carregarManagers = useCallback(async () => {
  if (!equipeId) return

  const { data, error } = await supabase
   .from('membros_equipe')
   .select('id, perfil_jogo_id, entrou_em')
   .eq('equipe_id', equipeId)
   .eq('ativo', true)
   .eq('tipo', 'manager')
   .order('entrou_em', { ascending: true })

  if (error) {
   setErro(error.message || 'Erro ao carregar managers.')
   return
  }

  const rows = (data || []) as Array<{ id: string; perfil_jogo_id: string | null; entrou_em: string | null }>
  const profileIds = Array.from(new Set(rows.map((r) => r.perfil_jogo_id).filter(Boolean) as string[]))

  if (profileIds.length === 0) {
   setManagers([])
   return
  }

  const { data: profilesData, error: profilesError } = await supabase
   .from('profiles')
   .select('id, username, nome_exibicao, foto_url')
   .in('id', profileIds)

  if (profilesError) {
   setErro(profilesError.message || 'Erro ao carregar perfis dos managers.')
   return
  }

  const profileMap = new Map<string, ProfileResumo>()
  ;((profilesData || []) as ProfileResumo[]).forEach((p) => profileMap.set(p.id, p))

  setManagers(
   rows
    .filter((r) => r.perfil_jogo_id)
    .map((r) => ({
     membroId: r.id,
     profileId: String(r.perfil_jogo_id),
     entrou_em: r.entrou_em,
     profile: profileMap.get(String(r.perfil_jogo_id)) || null,
    }))
  )
 }, [equipeId])

 useEffect(() => {
  carregarManagers()
 }, [carregarManagers])

 useEffect(() => {
  const termo = busca.trim()
  setErro(null)
  setMsg(null)

  if (termo.length < 2) {
   setResultados([])
   return
  }

  const timer = window.setTimeout(async () => {
   try {
    setBuscando(true)

    let query = supabase
     .from('profiles')
     .select('id, username, nome_exibicao, foto_url')
     .limit(12)

    if (/^[0-9a-fA-F-]{8,}$/.test(termo)) {
     query = query.or(`username.ilike.%${termo}%,nome_exibicao.ilike.%${termo}%,id.eq.${termo}`)
    } else {
     query = query.or(`username.ilike.%${termo}%,nome_exibicao.ilike.%${termo}%`)
    }

    const { data, error } = await query

    if (error) throw error

    const filtrados = ((data || []) as ProfileResumo[]).filter((profile) => {
     if (donosIds.has(profile.id)) return false
     if (managersIds.has(profile.id)) return false
     return true
    })

    setResultados(filtrados)
   } catch (e: any) {
    setResultados([])
    setErro(e?.message || 'Não foi possível buscar perfis do site.')
   } finally {
    setBuscando(false)
   }
  }, 350)

  return () => window.clearTimeout(timer)
 }, [busca, donosIds, managersIds])

 async function adicionarManager() {
  if (!canManageAdmins || !selecionado) return

  try {
   setSalvando(true)
   setErro(null)
   setMsg(null)

   if (donosIds.has(selecionado.id)) {
    setErro('O dono da equipe já possui controle total e não precisa ser manager.')
    return
   }

   if (managersIds.has(selecionado.id)) {
    setErro('Este usuário já é manager desta equipe.')
    return
   }

   const { data: existente, error: existenteError } = await supabase
    .from('membros_equipe')
    .select('id, ativo, tipo')
    .eq('equipe_id', equipeId)
    .eq('perfil_jogo_id', selecionado.id)
    .maybeSingle()

   if (existenteError) throw existenteError

   if (existente?.id) {
    const { error } = await supabase
     .from('membros_equipe')
     .update({ tipo: 'manager', ativo: true, saiu_em: null })
     .eq('id', existente.id)
     .eq('equipe_id', equipeId)

    if (error) throw error
   } else {
    const { error } = await supabase.from('membros_equipe').insert({
     equipe_id: equipeId,
     perfil_jogo_id: selecionado.id,
     tipo: 'manager',
     ativo: true,
     entrou_em: new Date().toISOString(),
    })

    if (error) throw error
   }

   setBusca('')
   setSelecionado(null)
   setResultados([])
   setMsg('Manager adicionado com sucesso.')
   await carregarManagers()
   await onAtualizado?.()
  } catch (e: any) {
   setErro(e?.message || 'Não foi possível adicionar manager.')
  } finally {
   setSalvando(false)
  }
 }

 async function removerManager(membroId: string) {
  if (!canManageAdmins || !membroId) return

  try {
   setSalvando(true)
   setErro(null)
   setMsg(null)

   const { error } = await supabase
    .from('membros_equipe')
    .update({ ativo: false, saiu_em: new Date().toISOString() })
    .eq('id', membroId)
    .eq('equipe_id', equipeId)
    .eq('tipo', 'manager')

   if (error) throw error

   setMsg('Manager removido.')
   await carregarManagers()
   await onAtualizado?.()
  } catch (e: any) {
   setErro(e?.message || 'Não foi possível remover manager.')
  } finally {
   setSalvando(false)
  }
 }

 return (
  <div className="space-y-6">
   <div>
    <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
     // Comando da organização
    </h2>
    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
     Dono e managers da equipe
    </p>
   </div>

   {canManageAdmins ? (
    <div className="border border-zinc-200 bg-[#f8f8f8] p-4">
     <div className="grid gap-3 lg:grid-cols-[1fr_220px] lg:items-end">
      <div className="relative">
       <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8ea0be]">
        Adicionar manager
       </label>

       <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
         value={busca}
         onChange={(e) => {
          setBusca(e.target.value)
          setSelecionado(null)
         }}
         placeholder="Pesquisar por nome, usuário ou UID"
         className="h-12 w-full border border-zinc-300 bg-white pl-10 pr-10 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#142340] outline-none focus:border-[#2563eb]"
        />
        {busca ? (
         <button
          type="button"
          onClick={() => {
           setBusca('')
           setSelecionado(null)
           setResultados([])
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
         >
          <X size={15} />
         </button>
        ) : null}
       </div>

       {selecionado ? (
        <div className="mt-2 flex items-center justify-between border border-[#2563eb] bg-blue-50 px-3 py-2">
         <div className="min-w-0">
          <p className="truncate text-[12px] font-bold uppercase tracking-[0.12em] text-[#142340]">
           {nomeUsuario(selecionado)}
          </p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
           @{selecionado.username || 'sem_usuario'} · {uidCurto(selecionado.id)}
          </p>
         </div>
         <button type="button" onClick={() => setSelecionado(null)} className="text-zinc-500 hover:text-zinc-900">
          <X size={15} />
         </button>
        </div>
       ) : null}

       {busca.trim().length >= 2 && !selecionado ? (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto border border-zinc-200 bg-white shadow-sm">
         {buscando ? (
          <div className="flex h-14 items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
           <Loader2 size={14} className="animate-spin" /> Buscando perfis...
          </div>
         ) : resultados.length > 0 ? (
          resultados.map((profile) => (
           <button
            key={profile.id}
            type="button"
            onClick={() => {
             setSelecionado(profile)
             setBusca(nomeUsuario(profile))
             setResultados([])
            }}
            className="flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2 text-left hover:bg-zinc-50"
           >
            <div className="relative h-9 w-9 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
             {profile.foto_url ? (
              <Image src={profile.foto_url} alt={nomeUsuario(profile)} fill className="object-cover" />
             ) : (
              <div className="flex h-full items-center justify-center text-[11px] font-bold uppercase text-zinc-500">
               {nomeUsuario(profile).slice(0, 2)}
              </div>
             )}
            </div>
            <div className="min-w-0">
             <p className="truncate text-[12px] font-bold uppercase tracking-[0.1em] text-[#142340]">
              {nomeUsuario(profile)}
             </p>
             <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              @{profile.username || 'sem_usuario'} · {uidCurto(profile.id)}
             </p>
            </div>
           </button>
          ))
         ) : (
          <div className="px-3 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
           Nenhum perfil encontrado na tabela profiles.
          </div>
         )}
        </div>
       ) : null}
      </div>

      <button
       type="button"
       disabled={!selecionado || salvando}
       onClick={adicionarManager}
       className="inline-flex h-12 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500"
      >
       {salvando ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
       Adicionar manager
      </button>
     </div>

     <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
      Manager é vinculado pela conta geral do site. Não precisa ter perfil gamer.
     </p>

     {erro ? (
      <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
       {erro}
      </p>
     ) : null}

     {msg ? (
      <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
       {msg}
      </p>
     ) : null}
    </div>
   ) : null}

   <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {donos.map((m) => {
     const nome = nomeLider(m)
     const foto = m.perfilUsuario?.foto_url || null
     const gamer = m.perfilJogo?.nick || null

     return (
      <div key={m.id} className="border border-zinc-200 bg-white">
       <div className="h-2 bg-[#2563eb]" />
       <div className="flex gap-4 p-5">
        <div className="relative h-[82px] w-[82px] shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
         {foto ? (
          <Image src={foto} alt={nome} fill className="object-cover" />
         ) : (
          <div className="flex h-full items-center justify-center text-2xl font-semibold text-zinc-500">
           {nome.slice(0, 2).toUpperCase()}
          </div>
         )}
        </div>
        <div className="min-w-0 flex-1">
         <h3 className="truncate text-[22px] font-semibold uppercase tracking-tight text-[#142340]">
          {nome}
         </h3>
         <div className="mt-2 inline-flex items-center gap-1 bg-yellow-300 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#142340]">
          <Crown size={12} /> Dono
         </div>
         {m.perfilUsuario?.username ? (
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8ea0be]">
           Conta: @{m.perfilUsuario.username}
          </p>
         ) : null}
         {gamer ? (
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
           Perfil gamer vinculado: {gamer}
          </p>
         ) : null}
         <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Entrou em {dataBR(m.entrou_em)}
         </p>
        </div>
       </div>
      </div>
     )
    })}

    {managers.map((m) => {
     const nome = nomeUsuario(m.profile)
     const foto = m.profile?.foto_url || null

     return (
      <div key={m.membroId} className="border border-zinc-200 bg-white">
       <div className="h-2 bg-violet-600" />
       <div className="flex gap-4 p-5">
        <div className="relative h-[82px] w-[82px] shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
         {foto ? (
          <Image src={foto} alt={nome} fill className="object-cover" />
         ) : (
          <div className="flex h-full items-center justify-center text-2xl font-semibold text-zinc-500">
           {nome.slice(0, 2).toUpperCase()}
          </div>
         )}
        </div>
        <div className="min-w-0 flex-1">
         <h3 className="truncate text-[22px] font-semibold uppercase tracking-tight text-[#142340]">
          {nome}
         </h3>
         <div className="mt-2 inline-flex items-center gap-1 bg-violet-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
          <Shield size={12} /> Manager
         </div>
         <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8ea0be]">
          Conta: @{m.profile?.username || 'sem_usuario'}
         </p>
         <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          UID: {uidCurto(m.profileId)}
         </p>
         <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Entrou em {dataBR(m.entrou_em)}
         </p>
        </div>
       </div>

       {canManageAdmins ? (
        <div className="border-t border-zinc-200 p-4">
         <button
          type="button"
          disabled={salvando}
          onClick={() => removerManager(m.membroId)}
          className="inline-flex h-10 w-full items-center justify-center gap-2 border border-red-300 bg-red-50 px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
         >
          {salvando ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
          Remover manager
         </button>
        </div>
       ) : null}
      </div>
     )
    })}
   </div>

   {donos.length === 0 && managers.length === 0 ? (
    <div className="border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
     <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
      Nenhum comando cadastrado para esta equipe.
     </p>
    </div>
   ) : null}

   {canManageAdmins && managers.length === 0 ? (
    <div className="border border-zinc-200 bg-[#f8f8f8] p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
     Esta equipe ainda não possui managers cadastrados.
    </div>
   ) : null}
  </div>
 )
}
