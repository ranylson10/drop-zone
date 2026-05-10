'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  MailPlus,
  PlusCircle,
  Search,
  Trash2,
  UserPlus2,
  Users,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PlayerCard from '@/app/components/PlayerCard'

type CampeonatoEquipe = {
  id: string
  campeonato_id: string
  equipe_id: string | null
  line_id: string | null
  numero_vaga: number | null
  nome_exibicao: string | null
  status: string | null
  grupo_id: string | null
}

type Campeonato = {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  status: string | null
  jogadores_por_equipe: number | null
  reservas_permitidos: number | null
  plataforma: string | null
  tipo: string | null
  tipo_campeonato: string | null
}

type Equipe = {
  id: string
  nome: string
  tag: string | null
  logo_url: string | null
  criado_por: string | null
}

type PerfilJogo = {
  id: string
  user_id: string | null
  equipe_id: string | null
  nick?: string | null
  nick_jogo?: string | null
  nome?: string | null
  uid_jogo?: string | null
  game_id?: string | null
  foto_capa?: string | null
  funcao?: string | null
  plataforma?: string | null
  ativo?: boolean | null
  tier?: string | null
  ranking_tier?: string | null
  tier_atual?: string | null
  overall_tier?: string | null
}

type JogadorCampeonato = {
  id: string
  campeonato_id: string
  equipe_id: string | null
  campeonato_equipe_id: string | null
  perfil_jogo_id: string | null
  jogador_avulso_id?: string | null
  status: string | null
  nick_snapshot?: string | null
  uid_jogo_snapshot?: string | null
  tipo_inscricao?: string | null
  origem?: string | null
  created_at?: string | null
  perfil?: PerfilJogo | null
}

type Convite = {
  id: string
  perfil_jogo_id: string | null
  status: string | null
  tipo: string | null
  created_at: string | null
  perfil?: PerfilJogo | null
}

function nomePerfil(perfil?: PerfilJogo | null, fallback?: string | null) {
  return perfil?.nick || perfil?.nick_jogo || perfil?.nome || fallback || 'Jogador'
}

function uidPerfil(perfil?: PerfilJogo | null, fallback?: string | null) {
  return perfil?.uid_jogo || perfil?.game_id || fallback || '---'
}

function normalizarTier(valor?: any) {
  const tier = String(valor || '').trim().toUpperCase()
  if (['SS', 'S', 'A', 'B', 'C', 'D', 'E'].includes(tier)) return tier
  return 'C'
}

function tierPerfil(perfil?: PerfilJogo | null) {
  return normalizarTier(perfil?.tier || perfil?.ranking_tier || perfil?.tier_atual || perfil?.overall_tier)
}

async function rpcFallback(nameList: string[], payload: Record<string, any>) {
  let lastError: any = null
  for (const fn of nameList) {
    const { error } = await supabase.rpc(fn, payload)
    if (!error) return
    lastError = error
  }
  throw lastError
}

function Logo({ equipe }: { equipe: Equipe | null }) {
  const nome = equipe?.nome || 'Equipe'
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-100 text-sm font-black text-slate-500">
      {equipe?.logo_url ? <img src={equipe.logo_url} alt={nome} className="h-full w-full object-cover" /> : nome.slice(0, 2).toUpperCase()}
    </div>
  )
}

export default function EscalacaoVagaPage() {
  const params = useParams<{ campeonatoEquipeId: string }>()
  const campeonatoEquipeId = String(params?.campeonatoEquipeId || '')

  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [vaga, setVaga] = useState<CampeonatoEquipe | null>(null)
  const [campeonato, setCampeonato] = useState<Campeonato | null>(null)
  const [equipe, setEquipe] = useState<Equipe | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [jogadores, setJogadores] = useState<JogadorCampeonato[]>([])
  const [elenco, setElenco] = useState<PerfilJogo[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [busca, setBusca] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [candidatos, setCandidatos] = useState<PerfilJogo[]>([])
  const [erro, setErro] = useState<string | null>(null)

  const limiteJogadores = useMemo(() => {
    const total = Number(campeonato?.jogadores_por_equipe || 0) + Number(campeonato?.reservas_permitidos || 0)
    return total > 0 ? total : 8
  }, [campeonato])

  const jogadoresAtivos = useMemo(() => jogadores.filter((j) => j.status !== 'removido' && j.status !== 'inativo'), [jogadores])
  const idsEscalados = useMemo(() => new Set(jogadoresAtivos.map((j) => j.perfil_jogo_id).filter(Boolean) as string[]), [jogadoresAtivos])
  const idsPendentes = useMemo(() => new Set(convites.map((c) => c.perfil_jogo_id).filter(Boolean) as string[]), [convites])
  const slots = useMemo(() => Array.from({ length: limiteJogadores }).map((_, i) => jogadoresAtivos[i] || null), [jogadoresAtivos, limiteJogadores])

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)

    try {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData.user?.id || null
      setUserId(uid)

      const { data: vagaData, error: vagaError } = await supabase
        .from('campeonato_equipes')
        .select('id,campeonato_id,equipe_id,line_id,numero_vaga,nome_exibicao,status,grupo_id')
        .eq('id', campeonatoEquipeId)
        .maybeSingle()

      if (vagaError) throw vagaError
      if (!vagaData) {
        setVaga(null)
        return
      }

      const vagaAtual = vagaData as CampeonatoEquipe
      setVaga(vagaAtual)

      const [{ data: campData }, { data: equipeData }] = await Promise.all([
        supabase
          .from('campeonatos')
          .select('id,nome,slug,logo_url,status,jogadores_por_equipe,reservas_permitidos,plataforma,tipo,tipo_campeonato')
          .eq('id', vagaAtual.campeonato_id)
          .maybeSingle(),
        vagaAtual.equipe_id
          ? supabase.from('equipes').select('id,nome,tag,logo_url,criado_por').eq('id', vagaAtual.equipe_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ])

      const equipeAtual = (equipeData as Equipe | null) || null
      setCampeonato((campData as Campeonato | null) || null)
      setEquipe(equipeAtual)

      let permissao = false
      if (uid && equipeAtual?.id) {
        if (equipeAtual.criado_por === uid) {
          permissao = true
        } else {
          const { data: membro } = await supabase
            .from('membros_equipe')
            .select('id,tipo,ativo,perfis_jogo:perfil_jogo_id(id,user_id)')
            .eq('equipe_id', equipeAtual.id)
            .eq('ativo', true)

          permissao = ((membro || []) as any[]).some((item) => {
            const perfil = Array.isArray(item.perfis_jogo) ? item.perfis_jogo[0] : item.perfis_jogo
            return perfil?.user_id === uid && ['dono', 'admin', 'manager'].includes(String(item.tipo || '').toLowerCase())
          })
        }
      }
      setCanManage(permissao)

      const { data: jogadoresData, error: jogadoresError } = await supabase
        .from('jogadores_campeonato')
        .select('*')
        .eq('campeonato_id', vagaAtual.campeonato_id)
        .eq('campeonato_equipe_id', vagaAtual.id)
        .order('created_at', { ascending: true })

      if (jogadoresError) throw jogadoresError

      const listaJogadores = (jogadoresData || []) as JogadorCampeonato[]
      const perfilIds = Array.from(new Set(listaJogadores.map((j) => j.perfil_jogo_id).filter(Boolean) as string[]))
      let mapaPerfis = new Map<string, PerfilJogo>()

      if (perfilIds.length) {
        const { data: perfisData } = await supabase.from('perfis_jogo').select('*').in('id', perfilIds)
        mapaPerfis = new Map(((perfisData || []) as PerfilJogo[]).map((p) => [p.id, p]))
      }

      setJogadores(listaJogadores.map((j) => ({ ...j, perfil: j.perfil_jogo_id ? mapaPerfis.get(j.perfil_jogo_id) || null : null })))

      if (equipeAtual?.id) {
        const [{ data: elencoMembros }, { data: perfisEquipe }, { data: convitesData }] = await Promise.all([
          supabase
            .from('membros_equipe')
            .select('id,ativo,perfis_jogo:perfil_jogo_id(*)')
            .eq('equipe_id', equipeAtual.id)
            .eq('ativo', true),
          supabase.from('perfis_jogo').select('*').eq('equipe_id', equipeAtual.id).eq('ativo', true),
          supabase
            .from('convites_equipe')
            .select('id,perfil_jogo_id,status,tipo,created_at,perfil:perfil_jogo_id(*)')
            .eq('equipe_id', equipeAtual.id)
            .eq('status', 'pendente')
            .order('created_at', { ascending: false }),
        ])

        const mapaElenco = new Map<string, PerfilJogo>()
        ;((elencoMembros || []) as any[]).forEach((item) => {
          const perfil = Array.isArray(item.perfis_jogo) ? item.perfis_jogo[0] : item.perfis_jogo
          if (perfil?.id) mapaElenco.set(perfil.id, perfil)
        })
        ;((perfisEquipe || []) as PerfilJogo[]).forEach((perfil) => {
          if (perfil?.id) mapaElenco.set(perfil.id, perfil)
        })
        setElenco(Array.from(mapaElenco.values()))

        setConvites(((convitesData || []) as any[]).map((item) => ({
          id: item.id,
          perfil_jogo_id: item.perfil_jogo_id,
          status: item.status,
          tipo: item.tipo,
          created_at: item.created_at,
          perfil: Array.isArray(item.perfil) ? item.perfil[0] || null : item.perfil || null,
        })))
      } else {
        setElenco([])
        setConvites([])
      }
    } catch (error: any) {
      console.error('Erro ao carregar escalação mobile:', error)
      setErro(error?.message || 'Não foi possível carregar a escalação.')
    } finally {
      setLoading(false)
    }
  }, [campeonatoEquipeId])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    const t = setTimeout(async () => {
      const termo = busca.trim()
      if (!termo || termo.length < 2 || !equipe?.id) {
        setCandidatos([])
        return
      }

      const { data, error } = await supabase
        .from('perfis_jogo')
        .select('*')
        .eq('ativo', true)
        .or(`nick.ilike.%${termo}%,nick_jogo.ilike.%${termo}%,uid_jogo.ilike.%${termo}%,game_id.ilike.%${termo}%`)
        .limit(12)

      if (error) {
        console.error('Erro ao buscar jogadores:', error)
        return
      }

      const bloqueados = new Set([...idsEscalados, ...idsPendentes])
      setCandidatos(((data || []) as PerfilJogo[]).filter((p) => !bloqueados.has(p.id)))
    }, 300)

    return () => clearTimeout(t)
  }, [busca, equipe?.id, idsEscalados, idsPendentes])

  async function escalarPerfil(perfil: PerfilJogo) {
    if (!vaga || !equipe || !campeonato) return
    if (!canManage) return alert('Você não tem permissão para escalar esta equipe.')
    if (jogadoresAtivos.length >= limiteJogadores) return alert('Todos os slots da escalação já estão preenchidos.')

    try {
      setProcessando(perfil.id)

      const row = {
        campeonato_id: campeonato.id,
        equipe_id: equipe.id,
        campeonato_equipe_id: vaga.id,
        perfil_jogo_id: perfil.id,
        status: 'ativo',
        origem: 'link_mobile',
        criado_automaticamente: false,
        criado_por: userId,
        observacoes: jogadoresAtivos.length < Number(campeonato.jogadores_por_equipe || 4) ? 'titular' : 'reserva',
      }

      const { error } = await supabase.from('jogadores_campeonato').insert(row)
      if (error) throw error

      await carregar()
      alert('Jogador escalado no campeonato.')
    } catch (error: any) {
      console.error('Erro ao escalar jogador:', error)
      alert(error?.message || 'Erro ao escalar jogador.')
    } finally {
      setProcessando(null)
    }
  }

  async function removerJogador(jogador: JogadorCampeonato) {
    if (!canManage) return alert('Você não tem permissão para remover jogador desta escalação.')
    const ok = confirm(`Remover ${nomePerfil(jogador.perfil, jogador.nick_snapshot)} da escalação?`)
    if (!ok) return

    try {
      setProcessando(jogador.id)
      const { error } = await supabase.from('jogadores_campeonato').update({ status: 'removido' }).eq('id', jogador.id)
      if (error) throw error
      await carregar()
    } catch (error: any) {
      console.error('Erro ao remover jogador:', error)
      alert(error?.message || 'Erro ao remover jogador.')
    } finally {
      setProcessando(null)
    }
  }

  async function enviarConvite(perfil: PerfilJogo) {
    if (!equipe) return
    if (!canManage) return alert('Você não tem permissão para convidar jogadores para esta equipe.')

    try {
      setProcessando(`convite-${perfil.id}`)
      await rpcFallback(['enviar_convite_equipe_v2', 'enviar_convite_equipe'], {
        p_equipe_id: equipe.id,
        p_perfil_jogo_id: perfil.id,
        p_mensagem: mensagem || `Convite para entrar na equipe ${equipe.nome}.`,
      })
      setMensagem('')
      setBusca('')
      setCandidatos([])
      await carregar()
      alert('Convite enviado. Quando o jogador aceitar, ele poderá ser escalado aqui.')
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error)
      alert(error?.message || 'Erro ao enviar convite.')
    } finally {
      setProcessando(null)
    }
  }

  async function copiarLink() {
    const url = `${window.location.origin}/escala/${campeonato?.slug || campeonato?.id}`
    await navigator.clipboard.writeText(url)
    alert('Link mobile copiado.')
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950 [color-scheme:light]">
        <div className="border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          <Loader2 className="mr-2 inline animate-spin" size={16} /> Carregando escalação
        </div>
      </main>
    )
  }

  if (!vaga || !campeonato || !equipe) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950 [color-scheme:light]">
        <div className="w-full max-w-sm border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-lg font-black uppercase tracking-[-0.03em]">Vaga não encontrada</h1>
          <Link href="/campeonatos" className="mt-4 inline-flex h-11 items-center justify-center border border-blue-600 bg-blue-600 px-5 text-xs font-black uppercase text-white">Ver campeonatos</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-3 text-slate-950 [color-scheme:light]">
      <div className="mx-auto max-w-md pb-10">
        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-blue-500 bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
            <div className="flex items-center gap-3">
              <Logo equipe={equipe} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">Escalação mobile</p>
                <h1 className="mt-1 truncate text-2xl font-black uppercase tracking-[-0.05em]">{equipe.tag ? `[${equipe.tag}] ` : ''}{equipe.nome}</h1>
                <p className="mt-1 truncate text-xs font-bold text-blue-100">{campeonato.nome}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-200">
            <Info label="Vaga" value={vaga.numero_vaga ? `#${vaga.numero_vaga}` : 'Inscrita'} />
            <Info label="Slots" value={`${jogadoresAtivos.length}/${limiteJogadores}`} />
            <Info label="Elenco" value={String(elenco.length)} />
            <Info label="Convites" value={String(convites.length)} />
          </div>
        </section>

        {!userId ? (
          <section className="mt-3 border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black uppercase tracking-[-0.04em]">Acesse sua conta</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Para escalar, convidar jogador ou aceitar convite, use o login/cadastro original do site.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/login" className="flex h-11 items-center justify-center border border-blue-600 bg-blue-600 text-xs font-black uppercase text-white">Login</Link>
              <Link href="/cadastro" className="flex h-11 items-center justify-center border border-slate-300 bg-white text-xs font-black uppercase text-slate-800">Criar conta</Link>
            </div>
          </section>
        ) : !canManage ? (
          <section className="mt-3 border border-yellow-300 bg-yellow-50 p-4 text-xs font-bold leading-5 text-yellow-900">
            Esta tela é da equipe, mas sua conta não tem permissão de dono/admin/manager para editar a escalação. Você ainda pode abrir seus convites abaixo.
          </section>
        ) : null}

        <section className="mt-3 overflow-hidden border border-slate-900 bg-[#07111f] text-white shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0b1628] px-3 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">Escalação</p>
              <p className="text-xs font-black uppercase text-white">{jogadoresAtivos.length}/{limiteJogadores} cards usados</p>
            </div>
            <button onClick={copiarLink} className="flex h-9 items-center justify-center gap-1 border border-white/10 bg-white/10 px-3 text-[10px] font-black uppercase text-white">
              <Copy size={14} /> Link
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 p-3">
            {slots.map((jogador, index) => (
              <div key={jogador?.id || `slot-${index}`} className="relative">
                <PlayerCard
                  name={jogador ? nomePerfil(jogador.perfil, jogador.nick_snapshot) : ''}
                  tier={jogador ? (tierPerfil(jogador.perfil) as any) : 'C'}
                  number={index + 1}
                  variant={jogador ? (jogador.jogador_avulso_id ? 'avulso' : 'oficial') : 'slot'}
                />
                {jogador && canManage ? (
                  <button
                    onClick={() => removerJogador(jogador)}
                    disabled={processando === jogador.id}
                    className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-red-300 bg-red-600 text-white disabled:opacity-50"
                    title="Remover da escalação"
                  >
                    {processando === jogador.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-3 border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Meu elenco</p>
              <h2 className="text-base font-black uppercase tracking-[-0.03em]">Escalar jogadores da equipe</h2>
            </div>
            <Users size={18} className="text-slate-400" />
          </div>

          {elenco.length === 0 ? (
            <CardAviso texto="Nenhum jogador ativo encontrado no elenco. Use a busca abaixo para enviar convite ou peça para o jogador solicitar entrada na equipe." />
          ) : (
            <div className="space-y-2">
              {elenco.map((perfil) => {
                const escalado = idsEscalados.has(perfil.id)
                return (
                  <div key={perfil.id} className="flex items-center gap-3 border border-slate-200 bg-slate-50 p-2">
                    <Avatar perfil={perfil} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black uppercase">{nomePerfil(perfil)}</p>
                      <p className="text-[11px] font-bold text-slate-500">UID {uidPerfil(perfil)} • {perfil.funcao || 'Sem função'}</p>
                    </div>
                    {escalado ? (
                      <span className="inline-flex h-9 items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-black uppercase text-emerald-700"><CheckCircle2 size={13} /> Escalado</span>
                    ) : (
                      <button onClick={() => escalarPerfil(perfil)} disabled={!canManage || processando === perfil.id || jogadoresAtivos.length >= limiteJogadores} className="inline-flex h-9 items-center gap-1 border border-blue-600 bg-blue-600 px-3 text-[10px] font-black uppercase text-white disabled:opacity-50">
                        {processando === perfil.id ? <Loader2 size={13} className="animate-spin" /> : <PlusCircle size={13} />} Escalar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-3 border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Convidar jogador</p>
            <h2 className="text-base font-black uppercase tracking-[-0.03em]">Buscar por nick ou UID</h2>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3">
            <Search size={15} className="text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite nick ou UID" className="h-11 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-slate-400" />
          </div>
          <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Mensagem opcional para o convite" className="mt-2 min-h-20 w-full border border-slate-200 bg-white p-3 text-sm font-semibold outline-none placeholder:text-slate-400" />

          <div className="mt-3 space-y-2">
            {candidatos.map((perfil) => (
              <div key={perfil.id} className="flex items-center gap-3 border border-slate-200 bg-slate-50 p-2">
                <Avatar perfil={perfil} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black uppercase">{nomePerfil(perfil)}</p>
                  <p className="text-[11px] font-bold text-slate-500">UID {uidPerfil(perfil)} • {perfil.plataforma || 'Plataforma'}</p>
                </div>
                <button onClick={() => enviarConvite(perfil)} disabled={!canManage || processando === `convite-${perfil.id}`} className="inline-flex h-9 items-center gap-1 border border-violet-600 bg-violet-600 px-3 text-[10px] font-black uppercase text-white disabled:opacity-50">
                  {processando === `convite-${perfil.id}` ? <Loader2 size={13} className="animate-spin" /> : <MailPlus size={13} />} Convidar
                </button>
              </div>
            ))}
          </div>

          {convites.length ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pendentes</p>
              <div className="space-y-2">
                {convites.map((convite) => (
                  <div key={convite.id} className="flex items-center gap-2 border border-yellow-200 bg-yellow-50 p-2 text-xs font-bold text-yellow-900">
                    <XCircle size={14} />
                    <span className="min-w-0 flex-1 truncate">{convite.tipo === 'pedido' ? 'Pedido recebido' : 'Convite enviado'}: {nomePerfil(convite.perfil)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-3 grid grid-cols-2 gap-2">
          <Link href={`/escala/${campeonato.slug || campeonato.id}`} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-700"><ArrowLeft size={14} /> Voltar</Link>
          <Link href="/equipe/convites" className="flex h-11 items-center justify-center gap-2 border border-blue-600 bg-blue-600 text-[10px] font-black uppercase text-white"><UserPlus2 size={14} /> Convites</Link>
        </section>

        {erro ? <div className="mt-3 border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div> : null}
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-b border-slate-200 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
    </div>
  )
}

function Avatar({ perfil }: { perfil: PerfilJogo }) {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-white text-xs font-black text-slate-500">
      {perfil.foto_capa ? <img src={perfil.foto_capa} alt={nomePerfil(perfil)} className="h-full w-full object-cover" /> : nomePerfil(perfil).slice(0, 2).toUpperCase()}
    </div>
  )
}

function CardAviso({ texto }: { texto: string }) {
  return <div className="border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">{texto}</div>
}
