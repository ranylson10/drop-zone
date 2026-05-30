'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Gamepad2, Loader2, LogIn, LogOut, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ConviteDetalhes = {
  token: string
  ativo: boolean
  expirado?: boolean
  limite_atingido?: boolean
  campeonato?: {
    id: string
    nome: string | null
    logo_url: string | null
    banner_url: string | null
    valor_vaga: number | null
    valor_premiacao: number | null
    plataforma: string | null
    status: string | null
  } | null
  equipe?: {
    id: string
    nome: string | null
    tag: string | null
    logo_url: string | null
    servidor: string | null
  } | null
  vaga?: {
    id: string
    numero_vaga: number | null
    nome_exibicao: string | null
  } | null
  line?: {
    id: string
    nome: string | null
    logo_url: string | null
    tipo: string | null
  } | null
}

type PerfilJogo = {
  id: string
  nick: string | null
  uid_jogo: string | null
  servidor: string | null
  plataforma: string | null
  funcao: string | null
  foto_capa: string | null
  equipe_id?: string | null
}

function labelPerfil(perfil: PerfilJogo) {
  return `${perfil.nick || 'Perfil gamer'}${perfil.uid_jogo ? ` • ID ${perfil.uid_jogo}` : ''}`
}

function LogoConvite({ url, nome }: { url?: string | null; nome?: string | null }) {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border border-white/25 bg-white/15 text-white">
      {url ? (
        <img src={url} alt={nome || 'Logo'} className="h-full w-full object-cover" />
      ) : (
        <Users size={24} />
      )}
    </div>
  )
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function InscricaoTokenPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = useMemo(() => String(params?.token || '').trim().toUpperCase(), [params])

  const [checking, setChecking] = useState(true)
  const [carregandoConvite, setCarregandoConvite] = useState(true)
  const [conviteDetalhes, setConviteDetalhes] = useState<ConviteDetalhes | null>(null)
  const [logado, setLogado] = useState(false)
  const [perfis, setPerfis] = useState<PerfilJogo[]>([])
  const [perfilSelecionadoId, setPerfilSelecionadoId] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<any>(null)
  const [equipesPerfis, setEquipesPerfis] = useState<Record<string, { id: string; nome: string | null; tag: string | null; logo_url: string | null }>>({})
  const [saindoEquipe, setSaindoEquipe] = useState(false)

  useEffect(() => {
    let ativo = true

    async function init() {
      setChecking(true)
      setCarregandoConvite(true)
      setErro(null)

      try {
        const resConvite = await fetch(`/api/inscricao-equipe/detalhes/${encodeURIComponent(token)}`)
        const jsonConvite = await resConvite.json().catch(() => null)
        if (ativo) {
          setConviteDetalhes(resConvite.ok ? jsonConvite : null)
        }
      } catch {
        if (ativo) setConviteDetalhes(null)
      } finally {
        if (ativo) setCarregandoConvite(false)
      }

      const { data } = await supabase.auth.getSession()
      if (!ativo) return

      const user = data.session?.user
      setLogado(Boolean(user))

      if (user?.id) {
        const { data: perfisData, error } = await supabase
          .from('perfis_jogo')
          .select('id,nick,uid_jogo,servidor,plataforma,funcao,foto_capa,equipe_id')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('created_at', { ascending: true })

        if (!ativo) return

        if (error) {
          setErro('Não foi possível carregar seus perfis gamer.')
          setPerfis([])
        } else {
          const lista = (perfisData || []) as PerfilJogo[]
          setPerfis(lista)
          setPerfilSelecionadoId(lista[0]?.id || '')

          const equipeIds = Array.from(new Set(lista.map((perfil) => perfil.equipe_id).filter(Boolean))) as string[]
          if (equipeIds.length) {
            const { data: equipesData } = await supabase
              .from('equipes')
              .select('id,nome,tag,logo_url')
              .in('id', equipeIds)

            const mapa: Record<string, { id: string; nome: string | null; tag: string | null; logo_url: string | null }> = {}
            ;((equipesData || []) as any[]).forEach((equipe) => {
              if (equipe?.id) mapa[equipe.id] = equipe
            })
            setEquipesPerfis(mapa)
          } else {
            setEquipesPerfis({})
          }
        }
      }

      setChecking(false)
    }

    init()
    return () => {
      ativo = false
    }
  }, [token])


  async function sairDaEquipeAtual() {
    if (!perfilSelecionadoId) return

    const perfilAtual = perfis.find((perfil) => perfil.id === perfilSelecionadoId)
    if (!perfilAtual?.equipe_id) return

    const confirmar = window.confirm('Deseja sair da equipe atual deste perfil gamer?')
    if (!confirmar) return

    setErro(null)
    setSaindoEquipe(true)
    try {
      const { error } = await supabase.rpc('sair_da_equipe', {
        p_perfil_jogo_id: perfilSelecionadoId,
      })
      if (error) throw error

      setPerfis((atuais) =>
        atuais.map((perfil) =>
          perfil.id === perfilSelecionadoId ? { ...perfil, equipe_id: null } : perfil,
        ),
      )
      setEquipesPerfis((atual) => {
        const copia = { ...atual }
        delete copia[perfilAtual.equipe_id as string]
        return copia
      })
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível sair da equipe.')
    } finally {
      setSaindoEquipe(false)
    }
  }

  async function entrarComPerfil() {
    setErro(null)
    setSucesso(null)

    if (!perfilSelecionadoId) {
      setErro('Selecione ou crie um perfil gamer primeiro.')
      return
    }

    const perfilAtual = perfis.find((perfil) => perfil.id === perfilSelecionadoId)
    const equipeTokenId = conviteDetalhes?.equipe?.id || null
    if (perfilAtual?.equipe_id && perfilAtual.equipe_id !== equipeTokenId) {
      setErro('Este perfil já está em outra equipe. Saia da equipe atual antes de entrar por este token.')
      return
    }

    setEnviando(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('Faça login para concluir a inscrição.')

      const res = await fetch('/api/inscricao-equipe/entrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          token,
          perfil_jogo_id: perfilSelecionadoId,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Não foi possível concluir a inscrição.')
      setSucesso(json)
      if (json?.equipe_id) {
        setPerfis((atuais) =>
          atuais.map((perfil) =>
            perfil.id === perfilSelecionadoId ? { ...perfil, equipe_id: json.equipe_id } : perfil,
          ),
        )
      }
    } catch (error: any) {
      setErro(error?.message || 'Erro ao concluir inscrição.')
    } finally {
      setEnviando(false)
    }
  }

  const perfilSelecionado = perfis.find((perfil) => perfil.id === perfilSelecionadoId) || null
  const equipeAtualPerfil = perfilSelecionado?.equipe_id ? equipesPerfis[perfilSelecionado.equipe_id] || null : null
  const mesmaEquipeDoToken = Boolean(perfilSelecionado?.equipe_id && conviteDetalhes?.equipe?.id && perfilSelecionado.equipe_id === conviteDetalhes.equipe.id)
  const outraEquipeAtual = Boolean(perfilSelecionado?.equipe_id && conviteDetalhes?.equipe?.id && perfilSelecionado.equipe_id !== conviteDetalhes.equipe.id)
  const redirectAtual = `/inscricao/${token}`

  return (
    <main className="min-h-screen bg-[#eef3f9] px-3 py-4 text-[#12213f] sm:px-4">
      <div className="mx-auto w-full max-w-[430px] overflow-hidden border border-[#d8e2ef] bg-white shadow-[0_16px_38px_rgba(16,36,70,.12)]">
        <header className="bg-gradient-to-r from-[#0ea5e9] to-[#6d5dfc] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center border border-white/30 bg-black/20">
              <ShieldCheck size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/80">Drop Zone</p>
              <h1 className="truncate text-lg font-black uppercase leading-none tracking-[-0.04em]">Convite de equipe</h1>
              <p className="mt-1 text-[11px] font-bold uppercase text-white/80">Use seu perfil gamer original</p>
            </div>
          </div>
        </header>

        <section className="space-y-3 p-4">
          <div className="overflow-hidden border border-slate-200 bg-slate-950 text-white">
            <div className="bg-gradient-to-r from-cyan-500 to-violet-600 p-3">
              <div className="flex items-center gap-3">
                <LogoConvite url={conviteDetalhes?.equipe?.logo_url} nome={conviteDetalhes?.equipe?.nome} />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/75">Você está entrando na equipe</p>
                  <h2 className="mt-1 truncate text-lg font-black uppercase tracking-[-0.04em]">
                    {carregandoConvite ? 'Carregando equipe...' : conviteDetalhes?.equipe?.nome || 'Equipe não encontrada'}
                  </h2>
                  <p className="mt-1 truncate text-[10px] font-bold uppercase text-white/80">
                    {conviteDetalhes?.line?.nome ? `Line ${conviteDetalhes.line.nome}` : conviteDetalhes?.vaga?.nome_exibicao || 'Vaga da equipe'}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-800 text-slate-950">
              <div className="bg-white p-2">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Campeonato</p>
                <p className="mt-0.5 truncate text-[11px] font-black uppercase text-slate-900">{conviteDetalhes?.campeonato?.nome || '-'}</p>
              </div>
              <div className="bg-white p-2">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Premiação</p>
                <p className="mt-0.5 truncate text-[11px] font-black uppercase text-slate-900">{moeda.format(Number(conviteDetalhes?.campeonato?.valor_premiacao || 0))}</p>
              </div>
            </div>
          </div>

          {conviteDetalhes && !conviteDetalhes.ativo ? (
            <div className="border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              Este convite não está ativo. Peça outro link para o dono da equipe.
            </div>
          ) : null}

          <div className="border border-cyan-200 bg-cyan-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-700">Token recebido</p>
            <p className="mt-1 break-all text-[22px] font-black tracking-[0.16em] text-[#142340]">{token || 'SEM TOKEN'}</p>
          </div>

          {checking ? (
            <div className="flex h-14 items-center justify-center gap-2 border border-zinc-200 bg-zinc-50 text-xs font-black uppercase text-zinc-600">
              <Loader2 className="animate-spin" size={17} /> Verificando conta
            </div>
          ) : !logado ? (
            <div className="space-y-3 border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-800">
                <LogIn size={17} /> Entre para continuar
              </div>
              <p className="text-xs font-semibold leading-relaxed text-amber-900/75">
                O jogador entra com a conta dele, escolhe o perfil gamer já cadastrado e o sistema escala automaticamente.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/login?redirect=${encodeURIComponent(redirectAtual)}`} className="grid h-11 place-items-center bg-[#142340] text-[11px] font-black uppercase text-white">
                  Entrar
                </Link>
                <Link href={`/cadastro?redirect=${encodeURIComponent(redirectAtual)}`} className="grid h-11 place-items-center border border-[#142340]/20 bg-white text-[11px] font-black uppercase text-[#142340]">
                  Criar conta
                </Link>
              </div>
            </div>
          ) : sucesso ? (
            <div className="space-y-3 border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-800">
                <CheckCircle2 size={17} /> Inscrição concluída
              </div>
              <p className="text-xs font-semibold leading-relaxed text-emerald-900/75">
                Você entrou na equipe e já foi escalado automaticamente neste campeonato.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/escala/${sucesso.campeonato_id}`)}
                className="h-11 w-full bg-emerald-500 text-[11px] font-black uppercase text-white"
              >
                Abrir campeonato
              </button>
            </div>
          ) : perfis.length === 0 ? (
            <div className="space-y-3 border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-800">
                <Gamepad2 size={17} /> Crie seu perfil gamer
              </div>
              <p className="text-xs font-semibold leading-relaxed text-blue-900/75">
                Não vamos criar perfil por este link. Use o formulário original do site e depois volte neste convite para entrar direto na equipe.
              </p>
              <Link
                href={`/perfil?aba=gamer&convite=${encodeURIComponent(token)}`}
                className="grid h-11 place-items-center bg-[#2563eb] text-[11px] font-black uppercase text-white"
              >
                Abrir formulário original
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Escolha o perfil gamer</label>
                <select
                  value={perfilSelecionadoId}
                  onChange={(e) => setPerfilSelecionadoId(e.target.value)}
                  className="h-12 w-full border border-zinc-300 bg-white px-3 text-xs font-black uppercase text-[#142340] outline-none focus:border-[#2563eb]"
                >
                  {perfis.map((perfil) => (
                    <option key={perfil.id} value={perfil.id}>{labelPerfil(perfil)}</option>
                  ))}
                </select>
              </div>

              {perfilSelecionado ? (
                <div className="flex items-center gap-3 border border-zinc-200 bg-zinc-50 p-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-zinc-200 bg-white">
                    {perfilSelecionado.foto_capa ? (
                      <img src={perfilSelecionado.foto_capa} alt="Perfil gamer" className="h-full w-full object-cover" />
                    ) : (
                      <Gamepad2 size={20} className="text-zinc-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase text-[#142340]">{perfilSelecionado.nick || 'Perfil gamer'}</p>
                    <p className="truncate text-[11px] font-bold uppercase text-zinc-500">
                      ID {perfilSelecionado.uid_jogo || '-'} • {perfilSelecionado.plataforma || 'mobile'} • {perfilSelecionado.funcao || 'função'}
                    </p>
                  </div>
                </div>
              ) : null}

              {equipeAtualPerfil ? (
                <div className={outraEquipeAtual ? 'border border-amber-200 bg-amber-50 p-3' : 'border border-emerald-200 bg-emerald-50 p-3'}>
                  <p className={outraEquipeAtual ? 'text-[9px] font-black uppercase tracking-[0.18em] text-amber-700' : 'text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700'}>
                    Equipe atual do perfil
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <LogoConvite url={equipeAtualPerfil.logo_url} nome={equipeAtualPerfil.nome} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black uppercase text-[#142340]">{equipeAtualPerfil.tag ? `[${equipeAtualPerfil.tag}] ` : ''}{equipeAtualPerfil.nome || 'Equipe'}</p>
                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        {mesmaEquipeDoToken ? 'Este perfil já faz parte da equipe deste convite.' : 'Saia desta equipe antes de entrar em outra.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={sairDaEquipeAtual}
                    disabled={saindoEquipe}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 border border-red-200 bg-white text-[10px] font-black uppercase text-red-600 disabled:opacity-60"
                  >
                    {saindoEquipe ? <Loader2 className="animate-spin" size={15} /> : <LogOut size={15} />}
                    Sair da equipe atual
                  </button>
                </div>
              ) : null}

              {erro ? <div className="border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div> : null}

              {mesmaEquipeDoToken ? (
                <button
                  type="button"
                  onClick={() => router.push(`/escala/${conviteDetalhes?.campeonato?.id}`)}
                  className="flex h-12 w-full items-center justify-center gap-2 bg-emerald-500 text-[11px] font-black uppercase text-white"
                >
                  <CheckCircle2 size={17} /> Abrir escalação
                </button>
              ) : (
                <button
                  type="button"
                  onClick={entrarComPerfil}
                  disabled={enviando || !perfilSelecionadoId || conviteDetalhes?.ativo === false || outraEquipeAtual}
                  className="flex h-12 w-full items-center justify-center gap-2 bg-emerald-500 text-[11px] font-black uppercase text-white disabled:opacity-60"
                >
                  {enviando ? <Loader2 className="animate-spin" size={17} /> : <UserPlus size={17} />}
                  Entrar na equipe e escalar
                </button>
              )}

              <Link href={`/perfil?aba=gamer&convite=${encodeURIComponent(token)}`} className="grid h-10 place-items-center border border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                Editar/criar perfil gamer original
              </Link>
            </div>
          )}

          {erro && !checking && (logado ? perfis.length === 0 : false) ? (
            <div className="border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
