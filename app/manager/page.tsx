'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/app/contexts/PerfilContext'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Crown,
  Gamepad2,
  LayoutDashboard,
  Link2,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
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

type EquipeManager = {
  equipe: Equipe
  cargo: string
  isDono: boolean
  membros: number
  lines: Line[]
  jogadoresLine: number
  inscricoes: CampeonatoEquipe[]
  jogos: JogoEquipe[]
  pendencias: Pendencia[]
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

function LogoEquipe({ equipe }: { equipe: Equipe }) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-slate-200 bg-white">
      {equipe.logo_url ? (
        <Image src={equipe.logo_url} alt={equipe.nome} fill className="object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-slate-100 text-[11px] font-black uppercase text-slate-500">
          {(equipe.nome || 'EQ').slice(0, 2)}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string | number; detail: string }) {
  return (
    <div className="border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-1 text-[22px] font-black tracking-[-0.06em] text-slate-950">{value}</p>
        </div>
        <div className="grid h-9 w-9 place-items-center border border-blue-100 bg-blue-50 text-blue-600">{icon}</div>
      </div>
      <p className="mt-2 truncate text-[11px] font-semibold text-slate-500">{detail}</p>
    </div>
  )
}

export default function ManagerPage() {
  const { user, loading: loadingPerfil } = usePerfil()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [equipesManager, setEquipesManager] = useState<EquipeManager[]>([])

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
              .select('id, line_id, perfil_jogo_id, jogador_avulso_id, tipo_slot, ordem')
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
      const jogadoresPorLine = new Map<string, number>()
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
        jogadoresPorLine.set(jogador.line_id, (jogadoresPorLine.get(jogador.line_id) || 0) + 1)
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
          const jogadoresLine = linesEquipe.reduce((total, line) => total + (jogadoresPorLine.get(line.id) || 0), 0)
          const membrosEquipe = membrosPorEquipe.get(equipe.id) || []
          const pendencias: Pendencia[] = []

          const inscricoesSemLine = inscricoesEquipe.filter((inscricao) => !inscricao.line_id)
          for (const inscricao of inscricoesSemLine.slice(0, 3)) {
            const campeonato = Array.isArray(inscricao.campeonatos) ? inscricao.campeonatos[0] : inscricao.campeonatos
            pendencias.push({
              id: `line-${inscricao.id}`,
              tipo: 'line',
              prioridade: 'alta',
              equipeId: equipe.id,
              equipeNome: equipe.nome,
              titulo: 'Escalação pendente',
              descricao: campeonato?.nome ? `Definir line para ${campeonato.nome}` : 'Definir line da inscrição',
              href: `/equipe/${equipe.id}`,
            })
          }

          const pagamentosPendentes = inscricoesEquipe.filter((inscricao) => {
            const status = String(inscricao.status_pagamento || '').toLowerCase()
            return status && !['pago', 'confirmado', 'confirmada', 'gratuito', 'isento'].includes(status)
          })
          for (const inscricao of pagamentosPendentes.slice(0, 3)) {
            const campeonato = Array.isArray(inscricao.campeonatos) ? inscricao.campeonatos[0] : inscricao.campeonatos
            pendencias.push({
              id: `pagamento-${inscricao.id}`,
              tipo: 'pagamento',
              prioridade: 'media',
              equipeId: equipe.id,
              equipeNome: equipe.nome,
              titulo: 'Pagamento da vaga',
              descricao: `${campeonato?.nome || 'Campeonato'} · ${upper(inscricao.status_pagamento)}`,
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
              descricao: 'Crie uma line principal para usar nas inscrições',
              href: `/equipe/${equipe.id}`,
            })
          }

          return {
            equipe,
            cargo,
            isDono,
            membros: membrosEquipe.length,
            lines: linesEquipe,
            jogadoresLine,
            inscricoes: inscricoesEquipe,
            jogos: jogosEquipe,
            pendencias,
          }
        })
        .sort((a, b) => b.pendencias.length - a.pendencias.length || a.equipe.nome.localeCompare(b.equipe.nome, 'pt-BR'))

      setEquipesManager(dados)
    } catch (e: unknown) {
      console.error('Erro ao carregar central do manager:', e)
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a central do manager.')
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
      const campeonatos = item.inscricoes
        .map((inscricao) => {
          const campeonato = Array.isArray(inscricao.campeonatos) ? inscricao.campeonatos[0] : inscricao.campeonatos
          return campeonato?.nome || ''
        })
        .join(' ')
      return `${item.equipe.nome} ${item.equipe.tag || ''} ${item.cargo} ${campeonatos}`.toLowerCase().includes(termo)
    })
  }, [busca, equipesManager])

  const pendencias = useMemo(() => equipesManager.flatMap((item) => item.pendencias), [equipesManager])
  const campeonatosAtivos = useMemo(() => new Set(equipesManager.flatMap((item) => item.inscricoes.map((inscricao) => inscricao.campeonato_id))).size, [equipesManager])
  const totalLines = useMemo(() => equipesManager.reduce((total, item) => total + item.lines.length, 0), [equipesManager])

  if (loading || loadingPerfil) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex items-center gap-3 border border-slate-200 bg-white px-4 py-3 text-[12px] font-black uppercase tracking-[0.2em] text-slate-600 shadow-sm">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          Carregando central do manager
        </div>
      </div>
    )
  }

  if (!user?.id) {
    return (
      <div className="border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-600">Central do Manager</p>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.06em] text-slate-950">Faça login para gerenciar suas equipes.</h1>
        <Link href="/login" className="mt-4 inline-flex h-10 items-center border border-blue-600 bg-blue-600 px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white">
          Entrar
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-blue-700">
              <LayoutDashboard size={13} />
              Central operacional
            </div>
            <h1 className="mt-3 text-[28px] font-black tracking-[-0.07em] text-slate-950 md:text-[34px]">Central do Manager</h1>
            <p className="mt-1 max-w-3xl text-[13px] font-medium leading-5 text-slate-500">
              Controle multi-equipe para acompanhar elenco, lines, inscrições, pagamentos, partidas e pendências sem entrar em cada equipe uma por uma.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={carregar}
              className="inline-flex h-10 items-center justify-center gap-2 border border-slate-200 bg-white px-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw size={14} />
              Atualizar
            </button>
            <Link href="/equipe" className="inline-flex h-10 items-center justify-center gap-2 border border-blue-600 bg-blue-600 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-white hover:bg-blue-700">
              <Users size={14} />
              Minhas equipes
            </Link>
          </div>
        </div>
      </section>

      {erro ? (
        <div className="border border-red-200 bg-red-50 p-3 text-[12px] font-bold text-red-700">{erro}</div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<ShieldCheck size={18} />} label="Equipes" value={equipesManager.length} detail="equipes onde você é dono, admin ou manager" />
        <StatCard icon={<Trophy size={18} />} label="Campeonatos" value={campeonatosAtivos} detail="inscrições ativas vinculadas às equipes" />
        <StatCard icon={<ClipboardList size={18} />} label="Pendências" value={pendencias.length} detail="ações que precisam de atenção" />
        <StatCard icon={<Link2 size={18} />} label="Lines" value={totalLines} detail="lines criadas nas equipes gerenciadas" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-slate-950">Equipes gerenciadas</h2>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">Visão compacta das equipes, lines e inscrições.</p>
            </div>
            <div className="flex h-9 items-center gap-2 border border-slate-200 bg-slate-50 px-3 md:w-[320px]">
              <Search size={14} className="text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar equipe ou campeonato..."
                className="h-full w-full bg-transparent text-[12px] font-semibold outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {filtradas.length === 0 ? (
            <div className="border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <UserCog className="mx-auto text-slate-400" size={32} />
              <h3 className="mt-3 text-[16px] font-black tracking-[-0.04em] text-slate-950">Nenhuma equipe encontrada</h3>
              <p className="mt-1 text-[12px] font-semibold text-slate-500">Você ainda não aparece como dono/admin/manager de uma equipe ou a busca não encontrou resultado.</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="hidden grid-cols-[1.4fr_90px_90px_120px_140px_90px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 lg:grid">
                <div>Equipe</div>
                <div>Cargo</div>
                <div>Elenco</div>
                <div>Campeonatos</div>
                <div>Pendências</div>
                <div>Ação</div>
              </div>

              {filtradas.map((item) => {
                const principal = item.inscricoes[0]
                const campeonato = principal ? (Array.isArray(principal.campeonatos) ? principal.campeonatos[0] : principal.campeonatos) : null
                return (
                  <div key={item.equipe.id} className="grid gap-3 border-b border-slate-100 p-3 last:border-b-0 lg:grid-cols-[1.4fr_90px_90px_120px_140px_90px] lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <LogoEquipe equipe={item.equipe} />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <h3 className="truncate text-[13px] font-black text-slate-950">{item.equipe.nome}</h3>
                          {item.isDono ? <Crown size={13} className="shrink-0 text-amber-500" /> : null}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                          {item.lines.length} line(s) · {item.jogadoresLine} jogador(es) em lines
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="inline-flex border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-blue-700">{upper(item.cargo)}</span>
                    </div>

                    <div className="text-[12px] font-black text-slate-800">{item.membros} ativo(s)</div>

                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-black text-slate-800">{item.inscricoes.length} inscrição(ões)</p>
                      <p className="truncate text-[10px] font-semibold text-slate-500">{campeonato?.nome || 'Sem campeonato ativo'}</p>
                    </div>

                    <div>
                      <span className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${item.pendencias.length ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {item.pendencias.length ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                        {item.pendencias.length ? `${item.pendencias.length} pend.` : 'OK'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/equipe/${item.equipe.id}`} className="inline-flex h-8 items-center gap-1 border border-slate-200 bg-white px-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-50">
                        Abrir
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-slate-950">Tarefas rápidas</h2>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">Prioridade para resolver primeiro.</p>
              </div>
              <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600">{pendencias.length}</span>
            </div>

            <div className="mt-3 space-y-2">
              {pendencias.length === 0 ? (
                <div className="border border-emerald-200 bg-emerald-50 p-3 text-[12px] font-bold text-emerald-700">Nenhuma pendência crítica encontrada agora.</div>
              ) : (
                pendencias.slice(0, 12).map((pendencia) => (
                  <Link key={pendencia.id} href={pendencia.href} className="block border border-slate-200 bg-white p-3 hover:bg-slate-50">
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center border ${prioridadeClasse(pendencia.prioridade)}`}>{tipoPendenciaIcone(pendencia.tipo)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-[12px] font-black text-slate-950">{pendencia.titulo}</h3>
                          <span className={`shrink-0 border px-1.5 py-0.5 text-[8px] font-black uppercase ${prioridadeClasse(pendencia.prioridade)}`}>{pendencia.prioridade}</span>
                        </div>
                        <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{pendencia.equipeNome}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-4 text-slate-500">{pendencia.descricao}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="border border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-slate-950">Campeonatos recentes</h2>
            <div className="mt-3 space-y-2">
              {equipesManager.flatMap((item) => item.inscricoes.map((inscricao) => ({ item, inscricao }))).slice(0, 8).map(({ item, inscricao }) => {
                const campeonato = Array.isArray(inscricao.campeonatos) ? inscricao.campeonatos[0] : inscricao.campeonatos
                return (
                  <Link key={inscricao.id} href={`/campeonatos/${inscricao.campeonato_id}`} className="block border border-slate-200 bg-slate-50 p-3 hover:bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-black text-slate-950">{campeonato?.nome || 'Campeonato'}</p>
                        <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{item.equipe.nome} · vaga {inscricao.numero_vaga || 'N/I'} · {upper(inscricao.status)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-700">{dataCurta(campeonato?.data_inicio)}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase text-slate-400">{dinheiro(campeonato?.valor_vaga)}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
              {equipesManager.every((item) => item.inscricoes.length === 0) ? (
                <div className="border border-dashed border-slate-300 p-3 text-[12px] font-semibold text-slate-500">Nenhuma inscrição encontrada nas equipes gerenciadas.</div>
              ) : null}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
