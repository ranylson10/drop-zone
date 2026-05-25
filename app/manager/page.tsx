'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/app/contexts/PerfilContext'
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Crown,
  Gamepad2,
  Link2,
  Loader2,
  RefreshCcw,
  Search,
  Trophy,
  UserCog,
  Users,
  WalletCards,
} from 'lucide-react'

type PerfilJogo = {
  id: string
  user_id?: string | null
  nick?: string | null
  uid_jogo?: string | null
  foto_capa?: string | null
  plataforma?: string | null
  funcao?: string | null
}

type MembroEquipe = {
  id: string
  equipe_id: string | null
  perfil_jogo_id: string | null
  tipo: string | null
  ativo: boolean
  entrou_em?: string | null
  perfis_jogo?: PerfilJogo | PerfilJogo[] | null
}

type Equipe = {
  id: string
  nome: string
  tag?: string | null
  logo_url?: string | null
  cover_url?: string | null
  descricao?: string | null
  criado_por?: string | null
  created_at?: string | null
}

type Line = {
  id: string
  equipe_id: string
  nome: string
  tipo?: string | null
  ativa?: boolean | null
  created_at?: string | null
}

type JogadorLine = {
  id: string
  line_id: string
  perfil_jogo_id?: string | null
  jogador_avulso_id?: string | null
  tipo_slot?: string | null
  ordem?: number | null
  perfis_jogo?: PerfilJogo | PerfilJogo[] | null
}

type CampeonatoEquipe = {
  id: string
  campeonato_id: string
  equipe_id: string | null
  grupo_id?: string | null
  status?: string | null
  status_pagamento?: string | null
  agendada_para?: string | null
  valor_vaga_pago?: number | null
  nome_exibicao?: string | null
  numero_vaga?: number | null
  data_pagamento_prevista?: string | null
  data_pagamento_confirmada?: string | null
  cancelada_em?: string | null
  line_id?: string | null
  campeonatos?: Campeonato | Campeonato[] | null
}

type Campeonato = {
  id: string
  nome: string
  logo_url?: string | null
  status?: string | null
  tipo?: string | null
  tipo_campeonato?: string | null
  data_inicio?: string | null
  data_fim?: string | null
  horario_inicio?: string | null
  valor_vaga?: number | null
  vagas?: number | null
}

type JogoEquipe = {
  id: string
  jogo_id: string
  campeonato_id: string
  campeonato_equipe_id: string
  created_at?: string | null
}

type Pendencia = {
  id: string
  tipo: 'line' | 'pagamento' | 'agenda' | 'jogo' | 'elenco'
  prioridade: 'alta' | 'media' | 'baixa'
  equipeId: string
  equipeNome: string
  titulo: string
  descricao: string
  href: string
}

type EquipeManager = {
  equipe: Equipe
  cargo: string
  isDono: boolean
  membros: number
  lines: Line[]
  jogadoresLine: number
  jogadoresEscalados: JogadorLine[]
  inscricoes: CampeonatoEquipe[]
  jogos: JogoEquipe[]
  pendencias: Pendencia[]
}

function normalizar(texto?: string | null) {
  return String(texto || '').replaceAll('_', ' ').trim()
}

function upper(texto?: string | null) {
  return normalizar(texto || 'N/I').toUpperCase()
}

function dataCurta(data?: string | null) {
  if (!data) return 'Sem data'
  return new Date(data).toLocaleDateString('pt-BR')
}

function dinheiro(valor?: number | null) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function isCargoGerenciavel(tipo?: string | null) {
  const cargo = String(tipo || '').toLowerCase()
  return ['dono', 'owner', 'admin', 'administrador', 'manager', 'gerente', 'capitao', 'capitão'].includes(cargo)
}

function prioridadeClasse(prioridade: Pendencia['prioridade']) {
  if (prioridade === 'alta') return 'border-red-200 bg-red-50 text-red-700'
  if (prioridade === 'media') return 'border-orange-200 bg-orange-50 text-orange-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function tipoPendenciaIcone(tipo: Pendencia['tipo']) {
  if (tipo === 'pagamento') return <WalletCards size={14} />
  if (tipo === 'agenda') return <CalendarClock size={14} />
  if (tipo === 'jogo') return <Gamepad2 size={14} />
  if (tipo === 'elenco') return <Users size={14} />
  return <ClipboardList size={14} />
}

function getCampeonato(inscricao: CampeonatoEquipe) {
  return Array.isArray(inscricao.campeonatos) ? inscricao.campeonatos[0] : inscricao.campeonatos
}

function perfilDoJogador(jogador: JogadorLine) {
  return Array.isArray(jogador.perfis_jogo) ? jogador.perfis_jogo[0] : jogador.perfis_jogo
}

function LogoEquipe({ equipe, active = false }: { equipe: Equipe; active?: boolean }) {
  return (
    <div className={`relative h-11 w-11 shrink-0 overflow-hidden border ${active ? 'border-white/40 bg-white/10' : 'border-slate-200 bg-white'}`}>
      {equipe.logo_url ? (
        <Image src={equipe.logo_url} alt={equipe.nome} fill className="object-cover" />
      ) : (
        <div className={`grid h-full w-full place-items-center text-[11px] font-black uppercase ${active ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
          {(equipe.nome || 'EQ').slice(0, 2)}
        </div>
      )}
    </div>
  )
}

function MiniMetric({ label, value, tone = 'slate' }: { label: string; value: string | number; tone?: 'slate' | 'blue' | 'orange' | 'green' }) {
  const toneClass = {
    slate: 'text-slate-950',
    blue: 'text-blue-700',
    orange: 'text-orange-600',
    green: 'text-emerald-600',
  }[tone]

  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-1 text-[24px] font-black tracking-[-0.05em] ${toneClass}`}>{value}</p>
    </div>
  )
}

export default function ManagerPage() {
  const { user, loading: loadingPerfil } = usePerfil()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [equipesManager, setEquipesManager] = useState<EquipeManager[]>([])
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState('')

  const carregar = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setErro(null)

      const [perfisRes, equipesDonoRes] = await Promise.all([
        supabase
          .from('perfis_jogo')
          .select('id, user_id, nick, uid_jogo, foto_capa, plataforma, funcao')
          .eq('user_id', user.id),
        supabase
          .from('equipes')
          .select('id, nome, tag, logo_url, cover_url, descricao, criado_por, created_at')
          .eq('criado_por', user.id),
      ])

      if (perfisRes.error) throw perfisRes.error
      if (equipesDonoRes.error) throw equipesDonoRes.error

      const perfis = (perfisRes.data || []) as PerfilJogo[]
      const perfilIds = perfis.map((perfil) => perfil.id)
      const membrosRes = perfilIds.length
        ? await supabase
            .from('membros_equipe')
            .select('id, equipe_id, perfil_jogo_id, tipo, ativo, entrou_em, perfis_jogo:perfil_jogo_id ( id, user_id, nick, uid_jogo, foto_capa, plataforma, funcao )')
            .in('perfil_jogo_id', perfilIds)
            .eq('ativo', true)
        : { data: [], error: null }

      if (membrosRes.error) throw membrosRes.error

      const membrosUsuario = ((membrosRes.data || []) as MembroEquipe[]).filter((membro) => isCargoGerenciavel(membro.tipo))
      const idsEquipes = new Set<string>()

      for (const equipe of (equipesDonoRes.data || []) as Equipe[]) idsEquipes.add(equipe.id)
      for (const membro of membrosUsuario) if (membro.equipe_id) idsEquipes.add(membro.equipe_id)

      if (idsEquipes.size === 0) {
        setEquipesManager([])
        setEquipeSelecionadaId('')
        return
      }

      const equipeIds = Array.from(idsEquipes)
      const [equipesRes, todosMembrosRes, linesRes, inscricoesRes] = await Promise.all([
        supabase
          .from('equipes')
          .select('id, nome, tag, logo_url, cover_url, descricao, criado_por, created_at')
          .in('id', equipeIds),
        supabase
          .from('membros_equipe')
          .select('id, equipe_id, perfil_jogo_id, tipo, ativo')
          .in('equipe_id', equipeIds)
          .eq('ativo', true),
        supabase
          .from('equipes_lines')
          .select('id, equipe_id, nome, tipo, ativa, created_at')
          .in('equipe_id', equipeIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('campeonato_equipes')
          .select('id, campeonato_id, equipe_id, grupo_id, status, status_pagamento, agendada_para, valor_vaga_pago, nome_exibicao, numero_vaga, data_pagamento_prevista, data_pagamento_confirmada, cancelada_em, line_id, campeonatos:campeonato_id ( id, nome, logo_url, status, tipo, tipo_campeonato, data_inicio, data_fim, horario_inicio, valor_vaga, vagas )')
          .in('equipe_id', equipeIds)
          .is('cancelada_em', null)
          .order('created_at', { ascending: false }),
      ])

      if (equipesRes.error) throw equipesRes.error
      if (todosMembrosRes.error) throw todosMembrosRes.error
      if (linesRes.error) throw linesRes.error
      if (inscricoesRes.error) throw inscricoesRes.error

      const lines = (linesRes.data || []) as Line[]
      const lineIds = lines.map((line) => line.id)
      const inscricoes = (inscricoesRes.data || []) as CampeonatoEquipe[]
      const inscricaoIds = inscricoes.map((inscricao) => inscricao.id)
      const [jogadoresLineRes, jogosRes] = await Promise.all([
        lineIds.length
          ? supabase
              .from('lines_jogadores')
              .select('id, line_id, perfil_jogo_id, jogador_avulso_id, tipo_slot, ordem, perfis_jogo:perfil_jogo_id ( id, user_id, nick, uid_jogo, foto_capa, plataforma, funcao )')
              .in('line_id', lineIds)
          : Promise.resolve({ data: [], error: null }),
        inscricaoIds.length
          ? supabase
              .from('jogo_equipes')
              .select('id, jogo_id, campeonato_id, campeonato_equipe_id, created_at')
              .in('campeonato_equipe_id', inscricaoIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (jogadoresLineRes.error) throw jogadoresLineRes.error
      if (jogosRes.error) throw jogosRes.error

      const membrosPorEquipe = new Map<string, MembroEquipe[]>()
      const linesPorEquipe = new Map<string, Line[]>()
      const inscricoesPorEquipe = new Map<string, CampeonatoEquipe[]>()
      const jogosPorInscricao = new Map<string, JogoEquipe[]>()
      const jogadoresPorLine = new Map<string, JogadorLine[]>()
      const cargoPorEquipe = new Map<string, string>()

      for (const membro of membrosUsuario) {
        if (membro.equipe_id && !cargoPorEquipe.has(membro.equipe_id)) cargoPorEquipe.set(membro.equipe_id, membro.tipo || 'manager')
      }

      for (const membro of (todosMembrosRes.data || []) as MembroEquipe[]) {
        if (!membro.equipe_id) continue
        membrosPorEquipe.set(membro.equipe_id, [...(membrosPorEquipe.get(membro.equipe_id) || []), membro])
      }

      for (const line of lines) {
        linesPorEquipe.set(line.equipe_id, [...(linesPorEquipe.get(line.equipe_id) || []), line])
      }

      for (const jogador of (jogadoresLineRes.data || []) as JogadorLine[]) {
        jogadoresPorLine.set(jogador.line_id, [...(jogadoresPorLine.get(jogador.line_id) || []), jogador])
      }

      for (const inscricao of inscricoes) {
        if (!inscricao.equipe_id) continue
        inscricoesPorEquipe.set(inscricao.equipe_id, [...(inscricoesPorEquipe.get(inscricao.equipe_id) || []), inscricao])
      }

      for (const jogo of (jogosRes.data || []) as JogoEquipe[]) {
        jogosPorInscricao.set(jogo.campeonato_equipe_id, [...(jogosPorInscricao.get(jogo.campeonato_equipe_id) || []), jogo])
      }

      const dados = ((equipesRes.data || []) as Equipe[])
        .map((equipe) => {
          const isDono = equipe.criado_por === user.id
          const cargo = isDono ? 'dono' : cargoPorEquipe.get(equipe.id) || 'manager'
          const linesEquipe = linesPorEquipe.get(equipe.id) || []
          const inscricoesEquipe = inscricoesPorEquipe.get(equipe.id) || []
          const jogosEquipe = inscricoesEquipe.flatMap((inscricao) => jogosPorInscricao.get(inscricao.id) || [])
          const jogadoresEscalados = linesEquipe.flatMap((line) => jogadoresPorLine.get(line.id) || [])
          const membrosEquipe = membrosPorEquipe.get(equipe.id) || []
          const pendencias: Pendencia[] = []

          for (const inscricao of inscricoesEquipe.filter((item) => !item.line_id).slice(0, 3)) {
            const campeonato = getCampeonato(inscricao)
            pendencias.push({
              id: `line-${inscricao.id}`,
              tipo: 'line',
              prioridade: 'alta',
              equipeId: equipe.id,
              equipeNome: equipe.nome,
              titulo: 'Escalacao pendente',
              descricao: campeonato?.nome ? `Definir line para ${campeonato.nome}` : 'Definir line da inscricao',
              href: `/equipe/${equipe.id}`,
            })
          }

          for (const inscricao of inscricoesEquipe.filter((item) => {
            const status = String(item.status_pagamento || '').toLowerCase()
            return status && !['pago', 'confirmado', 'confirmada', 'gratuito', 'isento'].includes(status)
          }).slice(0, 3)) {
            const campeonato = getCampeonato(inscricao)
            pendencias.push({
              id: `pagamento-${inscricao.id}`,
              tipo: 'pagamento',
              prioridade: 'media',
              equipeId: equipe.id,
              equipeNome: equipe.nome,
              titulo: 'Pagamento da vaga',
              descricao: `${campeonato?.nome || 'Campeonato'} - ${upper(inscricao.status_pagamento)}`,
              href: `/campeonatos/${inscricao.campeonato_id}`,
            })
          }

          if (membrosEquipe.length < 4) {
            pendencias.push({
              id: `elenco-${equipe.id}`,
              tipo: 'elenco',
              prioridade: 'media',
              equipeId: equipe.id,
              equipeNome: equipe.nome,
              titulo: 'Elenco incompleto',
              descricao: `${membrosEquipe.length} membro(s) ativo(s) na equipe`,
              href: `/equipe/${equipe.id}`,
            })
          }

          if (!linesEquipe.length) {
            pendencias.push({
              id: `sem-line-${equipe.id}`,
              tipo: 'line',
              prioridade: 'alta',
              equipeId: equipe.id,
              equipeNome: equipe.nome,
              titulo: 'Nenhuma line criada',
              descricao: 'Crie uma line principal para usar nas inscricoes',
              href: `/equipe/${equipe.id}`,
            })
          }

          return {
            equipe,
            cargo,
            isDono,
            membros: membrosEquipe.length,
            lines: linesEquipe,
            jogadoresLine: jogadoresEscalados.length,
            jogadoresEscalados,
            inscricoes: inscricoesEquipe,
            jogos: jogosEquipe,
            pendencias,
          }
        })
        .sort((a, b) => b.pendencias.length - a.pendencias.length || a.equipe.nome.localeCompare(b.equipe.nome, 'pt-BR'))

      setEquipesManager(dados)
      setEquipeSelecionadaId((atual) => dados.some((item) => item.equipe.id === atual) ? atual : dados[0]?.equipe.id || '')
    } catch (e: unknown) {
      console.error('Erro ao carregar manager:', e)
      setErro(e instanceof Error ? e.message : 'Nao foi possivel carregar o centro de controle.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!loadingPerfil) carregar()
  }, [loadingPerfil, carregar])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return equipesManager
    return equipesManager.filter((item) => {
      const campeonatos = item.inscricoes.map((inscricao) => getCampeonato(inscricao)?.nome || '').join(' ')
      return `${item.equipe.nome} ${item.equipe.tag || ''} ${item.cargo} ${campeonatos}`.toLowerCase().includes(termo)
    })
  }, [busca, equipesManager])

  const equipeSelecionada = useMemo(() => {
    return equipesManager.find((item) => item.equipe.id === equipeSelecionadaId) || equipesManager[0] || null
  }, [equipeSelecionadaId, equipesManager])

  const jogadoresPorLineSelecionada = useMemo(() => {
    const mapa = new Map<string, JogadorLine[]>()
    for (const jogador of equipeSelecionada?.jogadoresEscalados || []) {
      mapa.set(jogador.line_id, [...(mapa.get(jogador.line_id) || []), jogador])
    }
    return mapa
  }, [equipeSelecionada])

  if (loading || loadingPerfil) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex items-center gap-3 border border-slate-200 bg-white px-4 py-3 text-[12px] font-black uppercase tracking-[0.2em] text-slate-600 shadow-sm">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          Carregando controle do manager
        </div>
      </div>
    )
  }

  if (!user?.id) {
    return (
      <div className="border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-600">Manager</p>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.06em] text-slate-950">Faca login para gerenciar suas equipes.</h1>
        <Link href="/login" className="mt-4 inline-flex h-10 items-center border border-blue-600 bg-blue-600 px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white">
          Entrar
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {erro ? <div className="border border-red-200 bg-red-50 p-3 text-[12px] font-bold text-red-700">{erro}</div> : null}

      <section className="border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            {filtradas.length === 0 ? (
              <div className="flex min-h-20 flex-1 items-center justify-center border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-[12px] font-bold text-slate-500">
                Nenhuma equipe real encontrada para este manager.
              </div>
            ) : (
              filtradas.map((item) => {
                const ativo = equipeSelecionada?.equipe.id === item.equipe.id
                return (
                  <button
                    key={item.equipe.id}
                    type="button"
                    onClick={() => setEquipeSelecionadaId(item.equipe.id)}
                    className={`flex h-20 min-w-[170px] items-center gap-3 border px-3 text-left transition ${ativo ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-200 hover:bg-white'}`}
                  >
                    <LogoEquipe equipe={item.equipe} active={ativo} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-[12px] font-black uppercase tracking-[0.08em]">{item.equipe.nome}</p>
                        {item.isDono ? <Crown size={12} className={ativo ? 'text-yellow-200' : 'text-amber-500'} /> : null}
                      </div>
                      <p className={`mt-1 truncate text-[9px] font-black uppercase tracking-[0.14em] ${ativo ? 'text-blue-100' : 'text-slate-500'}`}>{item.equipe.tag || upper(item.cargo)}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <div className="flex h-10 min-w-0 items-center gap-2 border border-slate-200 bg-slate-50 px-3 sm:w-[280px]">
              <Search size={14} className="text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar equipe..."
                className="h-full w-full bg-transparent text-[12px] font-semibold outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={carregar}
              className="inline-flex h-10 items-center justify-center gap-2 border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw size={14} />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      {!equipeSelecionada ? (
        <div className="border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <UserCog className="mx-auto text-slate-400" size={32} />
          <h3 className="mt-3 text-[16px] font-black tracking-[-0.04em] text-slate-950">Sem equipe para controlar</h3>
          <p className="mt-1 text-[12px] font-semibold text-slate-500">A pagina mostra apenas equipes criadas por voce ou equipes onde seu perfil aparece como dono, admin ou manager.</p>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <LogoEquipe equipe={equipeSelecionada.equipe} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-[24px] font-black uppercase tracking-[-0.05em] text-slate-950">{equipeSelecionada.equipe.nome}</h1>
                      <span className="border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-blue-700">{upper(equipeSelecionada.cargo)}</span>
                    </div>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">{equipeSelecionada.equipe.descricao || 'Equipe sem descricao cadastrada.'}</p>
                  </div>
                </div>
                <Link href={`/equipe/${equipeSelecionada.equipe.id}`} className="inline-flex h-10 items-center justify-center gap-2 border border-blue-600 bg-blue-600 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white hover:bg-blue-700">
                  Abrir equipe
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniMetric label="Elenco ativo" value={equipeSelecionada.membros} />
                <MiniMetric label="Lines" value={equipeSelecionada.lines.length} />
                <MiniMetric label="Jogadores escalados" value={equipeSelecionada.jogadoresLine} tone="blue" />
                <MiniMetric label="Pendencias" value={equipeSelecionada.pendencias.length} tone={equipeSelecionada.pendencias.length ? 'orange' : 'green'} />
              </div>
            </div>

            <div className="border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                <h2 className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-950">Campeonatos da equipe</h2>
                <Trophy size={15} className="text-blue-600" />
              </div>
              {equipeSelecionada.inscricoes.length === 0 ? (
                <div className="p-4 text-[12px] font-semibold text-slate-500">Nenhuma inscricao real encontrada para esta equipe.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {equipeSelecionada.inscricoes.map((inscricao) => {
                    const campeonato = getCampeonato(inscricao)
                    return (
                      <Link key={inscricao.id} href={`/campeonatos/${inscricao.campeonato_id}`} className="grid gap-3 p-3 hover:bg-slate-50 md:grid-cols-[1fr_120px_130px_120px] md:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-slate-950">{campeonato?.nome || inscricao.nome_exibicao || 'Campeonato'}</p>
                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Vaga {inscricao.numero_vaga || 'N/I'} - {upper(campeonato?.tipo_campeonato || campeonato?.tipo)}</p>
                        </div>
                        <div className="text-[11px] font-black uppercase text-slate-700">{upper(inscricao.status)}</div>
                        <div className="text-[11px] font-black uppercase text-slate-700">{upper(inscricao.status_pagamento || 'sem status')}</div>
                        <div className="text-[11px] font-black text-slate-700">{dataCurta(campeonato?.data_inicio)} · {dinheiro(campeonato?.valor_vaga)}</div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                  <h2 className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-950">Lines e jogadores</h2>
                  <Users size={15} className="text-blue-600" />
                </div>
                {equipeSelecionada.lines.length === 0 ? (
                  <div className="p-4 text-[12px] font-semibold text-slate-500">Nenhuma line real cadastrada nesta equipe.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {equipeSelecionada.lines.map((line) => {
                      const jogadores = jogadoresPorLineSelecionada.get(line.id) || []
                      return (
                        <div key={line.id} className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-black text-slate-950">{line.nome}</p>
                              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{upper(line.tipo || 'line')} - {line.ativa === false ? 'inativa' : 'ativa'}</p>
                            </div>
                            <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-700">{jogadores.length}</span>
                          </div>
                          <div className="mt-2 grid gap-2">
                            {jogadores.length === 0 ? (
                              <div className="border border-dashed border-slate-200 p-2 text-[11px] font-semibold text-slate-500">Sem jogador escalado nesta line.</div>
                            ) : (
                              jogadores.map((jogador) => {
                                const perfil = perfilDoJogador(jogador)
                                return (
                                  <div key={jogador.id} className="flex items-center justify-between gap-2 border border-slate-100 bg-slate-50 px-2 py-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-[12px] font-black text-slate-900">{perfil?.nick || jogador.jogador_avulso_id || 'Jogador sem perfil vinculado'}</p>
                                      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{perfil?.uid_jogo || 'UID N/I'} - {upper(perfil?.funcao || jogador.tipo_slot)}</p>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400">#{jogador.ordem || '-'}</span>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                  <h2 className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-950">Estatisticas reais</h2>
                  <Gamepad2 size={15} className="text-blue-600" />
                </div>
                <div className="grid grid-cols-2 gap-2 p-3">
                  <MiniMetric label="Inscricoes" value={equipeSelecionada.inscricoes.length} />
                  <MiniMetric label="Jogos vinculados" value={equipeSelecionada.jogos.length} />
                  <MiniMetric label="Pagamentos pend." value={equipeSelecionada.pendencias.filter((p) => p.tipo === 'pagamento').length} tone="orange" />
                  <MiniMetric label="Lines pend." value={equipeSelecionada.pendencias.filter((p) => p.tipo === 'line').length} tone="orange" />
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-950">Pendencias da equipe</h2>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Somente a equipe selecionada.</p>
                </div>
                <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600">{equipeSelecionada.pendencias.length}</span>
              </div>

              <div className="mt-3 space-y-2">
                {equipeSelecionada.pendencias.length === 0 ? (
                  <div className="border border-emerald-200 bg-emerald-50 p-3 text-[12px] font-bold text-emerald-700">
                    <CheckCircle2 className="mr-2 inline" size={14} />
                    Nenhuma pendencia critica encontrada.
                  </div>
                ) : (
                  equipeSelecionada.pendencias.map((pendencia) => (
                    <Link key={pendencia.id} href={pendencia.href} className="block border border-slate-200 bg-white p-3 hover:bg-slate-50">
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center border ${prioridadeClasse(pendencia.prioridade)}`}>{tipoPendenciaIcone(pendencia.tipo)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="truncate text-[12px] font-black text-slate-950">{pendencia.titulo}</h3>
                            <span className={`shrink-0 border px-1.5 py-0.5 text-[8px] font-black uppercase ${prioridadeClasse(pendencia.prioridade)}`}>{pendencia.prioridade}</span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-4 text-slate-500">{pendencia.descricao}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-950">Atalhos de controle</h2>
              <div className="mt-3 grid gap-2">
                <Link href={`/equipe/${equipeSelecionada.equipe.id}`} className="inline-flex h-10 items-center justify-between border border-slate-200 bg-slate-50 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-white">
                  Gerenciar equipe <ChevronRight size={13} />
                </Link>
                <Link href="/campeonatos" className="inline-flex h-10 items-center justify-between border border-slate-200 bg-slate-50 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-white">
                  Ver campeonatos <Trophy size={13} />
                </Link>
                <Link href="/equipe" className="inline-flex h-10 items-center justify-between border border-slate-200 bg-slate-50 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-white">
                  Todas as equipes <Link2 size={13} />
                </Link>
              </div>
            </div>
          </aside>
        </section>
      )}
    </div>
  )
}
