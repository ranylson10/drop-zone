'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2, Plus, Save, ShieldAlert, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCampeonatoHref } from '@/app/campeonatos/utils/getCampeonatoHref'
import PlayerCard from '@/app/components/PlayerCard'

type Vaga = {
  id: string
  campeonato_id: string
  equipe_id: string | null
  line_id: string | null
  numero_vaga: number | null
  nome_exibicao: string | null
  status: string | null
  campeonatos?: any
  equipes?: any
  equipes_lines?: any
}

type PerfilJogo = {
  id: string
  nick: string | null
  uid_jogo: string | null
  funcao: string | null
  plataforma: string | null
  equipe_id: string | null
}

type Line = {
  id: string
  nome: string
  tipo: string | null
  ativa: boolean | null
}

type JogadorCampeonato = {
  id: string
  perfil_jogo_id: string | null
  status: string | null
}

type Quedas = {
  jogador_campeonato_id: string
  partida_id: string
  abates: number | null
}

type Jogo = {
  id: string
  nome: string | null
  data_jogo: string | null
  hora_jogo: string | null
  data_inicio: string | null
  rodada: number | null
  numero: number | null
}

function normalizarRel<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null
  return Array.isArray(valor) ? valor[0] || null : valor
}

function Logo({ url, nome }: { url?: string | null; nome: string }) {
  return (
    <div className="relative h-16 w-16 shrink-0 border border-slate-200 bg-slate-100">
      {url ? <Image src={url} alt={nome} fill className="object-cover" /> : <div className="grid h-full w-full place-items-center text-sm font-black text-slate-500">{nome.slice(0, 2)}</div>}
    </div>
  )
}

function dataHoraJogo(jogo: Jogo) {
  const data = jogo.data_jogo || jogo.data_inicio
  const dataFmt = data ? new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Data'
  const hora = jogo.hora_jogo || (jogo.data_inicio ? new Date(jogo.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'hora')
  return `${dataFmt} • ${String(hora).slice(0, 5)}`
}

export default function EscalaVagaPage() {
  const params = useParams<{ campeonatoEquipeId: string }>()
  const campeonatoEquipeId = String(params?.campeonatoEquipeId || '')
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [vaga, setVaga] = useState<Vaga | null>(null)
  const [perfis, setPerfis] = useState<PerfilJogo[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [lineSelecionada, setLineSelecionada] = useState<string>('')
  const [jogadoresCampeonato, setJogadoresCampeonato] = useState<JogadorCampeonato[]>([])
  const [quedas, setQuedas] = useState<Record<string, { quedas: number; abates: number }>>({})
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({})
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [novoNick, setNovoNick] = useState('')
  const [novoUid, setNovoUid] = useState('')

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      const { data: session } = await supabase.auth.getUser()
      const uid = session.user?.id || null
      setUserId(uid)
      if (!uid) {
        router.replace(`/escala/${campeonatoEquipeId}`)
        return
      }

      const { data: vagaData, error: vagaError } = await supabase
        .from('campeonato_equipes')
        .select('id, campeonato_id, equipe_id, line_id, numero_vaga, nome_exibicao, status, campeonatos:campeonato_id(*), equipes:equipe_id(id,nome,tag,logo_url,criado_por), equipes_lines:line_id(id,nome,tipo,ativa)')
        .eq('id', campeonatoEquipeId)
        .maybeSingle()

      if (vagaError) throw vagaError
      if (!vagaData) throw new Error('Vaga não encontrada.')

      const vagaNormalizada = vagaData as any as Vaga
      const equipe = normalizarRel<any>(vagaNormalizada.equipes)

      if (equipe?.criado_por && equipe.criado_por !== uid) {
        throw new Error('Você não tem permissão para editar esta vaga.')
      }

      setVaga(vagaNormalizada)
      setLineSelecionada(vagaNormalizada.line_id || '')

      const equipeId = vagaNormalizada.equipe_id
      const campeonatoId = vagaNormalizada.campeonato_id

      if (equipeId) {
        const [{ data: perfisData }, { data: linesData }] = await Promise.all([
          supabase
            .from('perfis_jogo')
            .select('id, nick, uid_jogo, funcao, plataforma, equipe_id')
            .eq('equipe_id', equipeId)
            .eq('ativo', true)
            .order('nick', { ascending: true }),
          supabase
            .from('equipes_lines')
            .select('id, nome, tipo, ativa')
            .eq('equipe_id', equipeId)
            .order('created_at', { ascending: false }),
        ])
        setPerfis((perfisData || []) as PerfilJogo[])
        setLines((linesData || []) as Line[])
      }

      const { data: jcData } = await supabase
        .from('jogadores_campeonato')
        .select('id, perfil_jogo_id, status')
        .eq('campeonato_equipe_id', campeonatoEquipeId)
        .eq('campeonato_id', campeonatoId)

      const jcLista = (jcData || []) as JogadorCampeonato[]
      setJogadoresCampeonato(jcLista)

      const marcados: Record<string, boolean> = {}
      jcLista.forEach((j) => {
        if (j.perfil_jogo_id && j.status !== 'removido') marcados[j.perfil_jogo_id] = true
      })
      setSelecionados(marcados)

      if (jcLista.length) {
        const ids = jcLista.map((j) => j.id)
        const { data: quedasData } = await supabase
          .from('resultados_partidas_jogadores')
          .select('jogador_campeonato_id, partida_id, abates')
          .in('jogador_campeonato_id', ids)
          .eq('campeonato_id', campeonatoId)

        const mapa: Record<string, { quedas: number; abates: number }> = {}
        const partidasPorJogador: Record<string, Set<string>> = {}
        for (const row of (quedasData || []) as Quedas[]) {
          if (!row.jogador_campeonato_id) continue
          if (!partidasPorJogador[row.jogador_campeonato_id]) partidasPorJogador[row.jogador_campeonato_id] = new Set()
          partidasPorJogador[row.jogador_campeonato_id].add(row.partida_id)
          mapa[row.jogador_campeonato_id] = {
            quedas: partidasPorJogador[row.jogador_campeonato_id].size,
            abates: (mapa[row.jogador_campeonato_id]?.abates || 0) + Number(row.abates || 0),
          }
        }
        setQuedas(mapa)
      } else {
        setQuedas({})
      }

      const { data: jogosData } = await supabase
        .from('jogos')
        .select('id, nome, data_jogo, hora_jogo, data_inicio, rodada, numero')
        .eq('campeonato_id', campeonatoId)
        .order('data_inicio', { ascending: true })
        .limit(8)

      setJogos((jogosData || []) as Jogo[])
    } catch (err: any) {
      setErro(err?.message || 'Erro ao carregar escalação.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campeonatoEquipeId])

  const jogadoresAtivos = useMemo(() => {
    const mapa = new Map(jogadoresCampeonato.map((j) => [j.perfil_jogo_id, j]))
    return perfis.map((perfil) => ({ perfil, jc: mapa.get(perfil.id) || null }))
  }, [perfis, jogadoresCampeonato])

  const campeonato = normalizarRel<any>(vaga?.campeonatos)
  const equipe = normalizarRel<any>(vaga?.equipes)
  const lineAtual = normalizarRel<any>(vaga?.equipes_lines)

  const limiteSlots = useMemo(() => {
    const titulares = Number(campeonato?.jogadores_por_equipe || 0)
    const reservas = Number(campeonato?.reservas_permitidos || 0)
    const total = titulares + reservas
    return total > 0 ? total : 8
  }, [campeonato])

  const jogadoresSelecionados = useMemo(() => {
    return jogadoresAtivos.filter(({ perfil }) => !!selecionados[perfil.id])
  }, [jogadoresAtivos, selecionados])

  function alternarJogador(perfilId: string) {
    const ativo = !!selecionados[perfilId]

    if (!ativo && jogadoresSelecionados.length >= limiteSlots) {
      setErro(`Limite de ${limiteSlots} jogadores atingido.`)
      return
    }

    setErro(null)
    setSelecionados((old) => ({ ...old, [perfilId]: !ativo }))
  }

  async function adicionarJogadorRapido(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!vaga?.equipe_id || !novoNick.trim()) return
    try {
      const { error } = await supabase.from('perfis_jogo').insert({
        nick: novoNick.trim(),
        uid_jogo: novoUid.trim() || null,
        equipe_id: vaga.equipe_id,
        user_id: userId,
        ativo: true,
      })
      if (error) throw error
      setNovoNick('')
      setNovoUid('')
      await carregar()
    } catch (err: any) {
      setErro(err?.message || 'Erro ao adicionar jogador.')
    }
  }

  async function salvarEscalacao() {
    if (!vaga) return
    setSalvando(true)
    setErro(null)
    setOk(null)
    try {
      const escolhidos = Object.entries(selecionados).filter(([, ativo]) => ativo).map(([id]) => id)
      const existentesPorPerfil = new Map(jogadoresCampeonato.map((j) => [j.perfil_jogo_id, j]))

      if (lineSelecionada !== (vaga.line_id || '')) {
        const { error } = await supabase.from('campeonato_equipes').update({ line_id: lineSelecionada || null }).eq('id', vaga.id)
        if (error) throw error
      }

      for (const perfil of perfis) {
        const existente = existentesPorPerfil.get(perfil.id)
        const deveAtivar = escolhidos.includes(perfil.id)

        if (existente) {
          const novoStatus = deveAtivar ? 'ativo' : 'removido'
          if (existente.status !== novoStatus) {
            const { error } = await supabase.from('jogadores_campeonato').update({ status: novoStatus }).eq('id', existente.id)
            if (error) throw error
          }
          continue
        }

        if (deveAtivar) {
          const { error } = await supabase.from('jogadores_campeonato').insert({
            campeonato_id: vaga.campeonato_id,
            equipe_id: vaga.equipe_id,
            perfil_jogo_id: perfil.id,
            origem: 'equipe',
            status: 'ativo',
            criado_automaticamente: false,
            criado_por: userId,
            campeonato_equipe_id: vaga.id,
          })
          if (error) throw error
        }
      }

      setOk('Escalação salva com sucesso.')
      await carregar()
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar escalação.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950 [color-scheme:light]"><div className="border border-slate-200 bg-white p-5 text-sm font-black uppercase text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={16}/> Carregando vaga</div></main>
  }

  if (erro && !vaga) {
    return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 [color-scheme:light]"><div className="mx-auto max-w-md border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{erro}</div></main>
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-950 [color-scheme:light]">
      <div className="mx-auto max-w-xl pb-24">
        <Link href={vaga ? `/escala/${vaga.campeonato_id}` : '/'} className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase text-slate-500"><ArrowLeft size={14}/> Voltar</Link>

        <section className="border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <Logo url={equipe?.logo_url} nome={vaga?.nome_exibicao || equipe?.nome || 'Equipe'} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Escalação da vaga</p>
              <h1 className="truncate text-xl font-black uppercase tracking-[-0.04em]">{vaga?.nome_exibicao || equipe?.nome || 'Vaga'}</h1>
              <p className="mt-1 truncate text-xs font-bold text-slate-500">{campeonato?.nome || 'Campeonato'} • Vaga {vaga?.numero_vaga || '-'}</p>
              <p className="mt-1 text-[10px] font-black uppercase text-slate-400">Line atual: {lineAtual?.nome || 'não definida'}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black uppercase tracking-[-0.03em]">Line da vaga</h2>
          <select value={lineSelecionada} onChange={(e) => setLineSelecionada(e.target.value)} className="mt-3 h-11 w-full border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-blue-500">
            <option value="">Sem line definida</option>
            {lines.map((line) => <option key={line.id} value={line.id}>{line.nome}</option>)}
          </select>
        </section>

        <section className="mt-4 border border-slate-200 bg-[#07111f] p-3 text-white shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[-0.03em]">Slots do campeonato</h2>
              <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Toque em um card vazio ou escolha no elenco abaixo</p>
            </div>
            <span className="border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-slate-300">
              {jogadoresSelecionados.length}/{limiteSlots}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: limiteSlots }).map((_, index) => {
              const item = jogadoresSelecionados[index]
              const perfil = item?.perfil
              const ativo = !!perfil

              return (
                <PlayerCard
                  key={perfil?.id || `slot-${index}`}
                  name={perfil?.nick || 'JOGADOR'}
                  tier="S"
                  number={index + 1}
                  variant={ativo ? 'oficial' : 'empty'}
                  active={ativo}
                  onClick={() => {
                    if (perfil?.id) alternarJogador(perfil.id)
                  }}
                />
              )
            })}
          </div>
        </section>

        <section className="mt-4 border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black uppercase tracking-[-0.03em]">Elenco da equipe</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Toque no card para adicionar ou remover da escalação.</p>
            </div>
            <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{perfis.length} jogadores</span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 rounded border border-slate-200 bg-[#07111f] p-3">
            {jogadoresAtivos.map(({ perfil }) => {
              const ativo = !!selecionados[perfil.id]
              return (
                <PlayerCard
                  key={perfil.id}
                  name={perfil.nick || 'JOGADOR'}
                  tier="S"
                  number={perfis.findIndex((p) => p.id === perfil.id) + 1}
                  variant="oficial"
                  active={ativo}
                  onClick={() => alternarJogador(perfil.id)}
                />
              )
            })}

            {!perfis.length ? (
              <div className="col-span-4 border border-dashed border-slate-600 bg-white/5 p-4 text-center text-xs font-bold uppercase text-slate-300">Nenhum jogador no elenco. Adicione abaixo.</div>
            ) : null}
          </div>
        </section>

        <section className="mt-4 border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black uppercase tracking-[-0.03em]">Adicionar jogador rápido</h2>
          <form onSubmit={adicionarJogadorRapido} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input value={novoNick} onChange={(e) => setNovoNick(e.target.value)} placeholder="Nick" className="h-11 border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-500" />
            <input value={novoUid} onChange={(e) => setNovoUid(e.target.value)} placeholder="ID Free Fire" className="h-11 border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-500" />
            <button className="flex h-11 items-center justify-center gap-2 border border-slate-950 bg-slate-950 px-4 text-xs font-black uppercase text-white"><Plus size={15}/> Add</button>
          </form>
        </section>
        {erro ? <div className="mt-4 border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700"><ShieldAlert size={14} className="mr-1 inline"/>{erro}</div> : null}
        {ok ? <div className="mt-4 border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"><Check size={14} className="mr-1 inline"/>{ok}</div> : null}

        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur [color-scheme:light]">
          <div className="mx-auto grid max-w-xl grid-cols-2 gap-2">
            {campeonato ? <Link href={getCampeonatoHref(campeonato as any)} className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-700"><Trophy size={14}/> Completo</Link> : null}
            <button onClick={salvarEscalacao} disabled={salvando} className="flex h-11 items-center justify-center gap-2 border border-blue-600 bg-blue-600 text-[10px] font-black uppercase text-white disabled:opacity-60">
              {salvando ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Salvar escalação
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
