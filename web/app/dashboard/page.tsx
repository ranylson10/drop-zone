'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Eye,
  Gamepad2,
  LineChart,
  Medal,
  Radio,
  Shield,
  Target,
  Ticket,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react'
import { usePerfil } from '@/app/contexts/PerfilContext'
import { supabase } from '@/lib/supabase'
import {
  getIdentityName,
  getModoUsoLabel,
  MODE_STORAGE_KEY,
  normalizarModoUso,
  tipoIdentidadeParaModo,
  type TipoModoUso,
} from '@/lib/identity'

const modoMeta: Record<TipoModoUso, { icon: typeof Gamepad2; tone: string; title: string; description: string }> = {
  jogador: {
    icon: Gamepad2,
    tone: 'border-cyan-200 bg-cyan-50 text-cyan-950',
    title: 'Painel do jogador',
    description: 'Tudo que você precisa para jogar, entrar em equipes e acompanhar campeonatos.',
  },
  equipe: {
    icon: Shield,
    tone: 'border-violet-200 bg-violet-50 text-violet-950',
    title: 'Painel da equipe',
    description: 'Atalhos para líder cuidar de elenco, lines, inscrições, cronograma e estatísticas.',
  },
  produtora: {
    icon: Building2,
    tone: 'border-orange-200 bg-orange-50 text-orange-950',
    title: 'Painel da produtora',
    description: 'Crie eventos, venda vagas, acompanhe PIX e controle transmissão em um só lugar.',
  },
  manager: {
    icon: Medal,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    title: 'Painel do manager',
    description: 'Gerencie equipes, jogadores, lines e pendências competitivas.',
  },
  visitante: {
    icon: Eye,
    tone: 'border-slate-200 bg-white text-slate-950',
    title: 'Explorar plataforma',
    description: 'Veja campeonatos, equipes, rankings e produtoras antes de entrar.',
  },
}

type DashboardAction = { title: string; desc: string; href: string; icon: typeof Trophy; primary?: boolean }
type EquipePanelKey = 'campeonatos' | 'elenco' | 'lines' | 'cronograma' | 'estatisticas' | 'comando'
type EquipeAction = { key: EquipePanelKey; title: string; desc: string; icon: typeof Trophy; primary?: boolean }
type CampeonatoDisponivel = { id: string; nome?: string | null; status?: string | null; tipo_competicao?: string | null; modelo_competicao?: string | null; formato?: string | null; valor_vaga?: number | string | null; created_at?: string | null }

const actions: Record<Exclude<TipoModoUso, 'equipe'>, DashboardAction[]> = {
  jogador: [
    { title: 'Perfil de jogo', desc: 'Nick, UID, servidor, função e foto.', href: '/identidade?modo=jogador', icon: Gamepad2, primary: true },
    { title: 'Campeonatos', desc: 'Eventos abertos para disputar.', href: '/campeonatos', icon: Trophy },
    { title: 'Convites', desc: 'Entrar em equipe ou aceitar convite.', href: '/equipe/convites', icon: UserPlus },
    { title: 'Estatísticas', desc: 'Ranking, histórico e desempenho.', href: '/perfil?tab=gamer', icon: BarChart3 },
  ],
  produtora: [
    { title: 'Criar campeonato', desc: 'Diário, copa, liga ou xtreino.', href: '/campeonatos/nova', icon: Trophy, primary: true },
    { title: 'Meus campeonatos', desc: 'Vagas, equipes, fases e súmulas.', href: '/produtora', icon: CalendarDays },
    { title: 'Pagamentos PIX', desc: 'Acompanhe cobranças e reservas.', href: '/admin/configuracoes/pagamentos', icon: Ticket },
    { title: 'Stream e overlays', desc: 'Projetos OBS, pontuador e placar ao vivo.', href: '/stream/projects', icon: Radio },
    { title: 'Equipe de trabalho', desc: 'Admins, narradores e operadores.', href: '/produtora', icon: Users },
    { title: 'Links de inscrição', desc: 'Compartilhe vagas com equipes.', href: '/campeonatos', icon: UserPlus },
  ],
  manager: [
    { title: 'Painel manager', desc: 'Central de gestão operacional.', href: '/manager', icon: Medal, primary: true },
    { title: 'Equipes', desc: 'Acompanhe elencos e pendências.', href: '/equipe', icon: Shield },
    { title: 'Jogadores', desc: 'Organize vínculos e permissões.', href: '/jogadores', icon: Users },
    { title: 'Campeonatos', desc: 'Procure eventos para indicar ao time.', href: '/campeonatos', icon: Trophy },
  ],
  visitante: [
    { title: 'Campeonatos abertos', desc: 'Explore eventos e vagas públicas.', href: '/campeonatos', icon: Trophy, primary: true },
    { title: 'Equipes', desc: 'Conheça times cadastrados.', href: '/equipe', icon: Shield },
    { title: 'Produtoras', desc: 'Acompanhe organizadores de eventos.', href: '/produtora', icon: Building2 },
    { title: 'Criar conta', desc: 'Entre como jogador, equipe ou produtora.', href: '/', icon: UserPlus },
  ],
}

const equipeActions: EquipeAction[] = [
  { key: 'campeonatos', title: 'Meus campeonatos', desc: 'Inscrições, jogos e escalações.', icon: Trophy, primary: true },
  { key: 'elenco', title: 'Elenco', desc: 'Jogadores, convites e pedidos.', icon: Users },
  { key: 'lines', title: 'Lines', desc: 'Titulares, reservas e variações.', icon: Target },
  { key: 'cronograma', title: 'Cronograma', desc: 'Agenda e próximos eventos.', icon: CalendarDays },
  { key: 'estatisticas', title: 'Estatísticas', desc: 'Histórico e desempenho.', icon: LineChart },
  { key: 'comando', title: 'Comando', desc: 'Dono, managers e permissões.', icon: Shield },
]

function formatarMoeda(valor: number | string | null | undefined) {
  const numero = Number(valor || 0)
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusAberto(status?: string | null) {
  const s = String(status || '').toLowerCase()
  return s.includes('abert') || s.includes('inscri') || s.includes('vaga') || s === 'publicado' || s === 'ativo' || s === 'em_andamento'
}

function tipoCampeonato(camp: CampeonatoDisponivel) {
  return String(camp.tipo_competicao || camp.modelo_competicao || camp.formato || 'campeonato').replace(/_/g, ' ')
}

function EmptyBox({ title, desc, action }: { title: string; desc: string; action?: string }) {
  return (
    <div className="border border-dashed border-slate-300 bg-slate-50 p-5">
      <div className="text-sm font-black uppercase text-slate-950">{title}</div>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{desc}</p>
      {action ? <div className="mt-4 inline-flex border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">{action}</div> : null}
    </div>
  )
}

function EquipePanel({ active, equipeNome, equipeCount, perfisCount }: { active: EquipePanelKey; equipeNome: string; equipeCount: number; perfisCount: number }) {
  const titleMap: Record<EquipePanelKey, string> = {
    campeonatos: 'Meus campeonatos',
    elenco: 'Elenco',
    lines: 'Lines',
    cronograma: 'Cronograma da equipe',
    estatisticas: 'Estatísticas',
    comando: 'Comando',
  }

  return (
    <section
      id={`painel-equipe-${active}`}
      role="tabpanel"
      aria-labelledby={`aba-equipe-${active}`}
      className="border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Aba ativa</div>
        <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.04em] text-slate-950">{titleMap[active]}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">{equipeNome}</p>
      </div>

      <div className="p-4">
        {active === 'campeonatos' ? (
          <div className="space-y-4">
            <EmptyBox
              title="Meus campeonatos"
              desc="Aqui entram os campeonatos onde sua equipe já comprou vaga, reservou vaga ou está inscrita. Dentro de cada campeonato ficam escalação, jogadores, horários, grupo, slot e status do pagamento."
              action="Escalação fica dentro do campeonato selecionado"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="border border-slate-200 p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inscrições</div><div className="mt-2 text-2xl font-black">0</div></div>
              <div className="border border-slate-200 p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escalações pendentes</div><div className="mt-2 text-2xl font-black">0</div></div>
              <div className="border border-slate-200 p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próximos jogos</div><div className="mt-2 text-2xl font-black">0</div></div>
            </div>
          </div>
        ) : null}

        {active === 'elenco' ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <EmptyBox
              title="Elenco da equipe"
              desc="Jogadores ativos, convites enviados, pedidos de entrada e vínculo com perfil de jogo devem aparecer aqui."
              action="Gerenciar jogadores sem sair do painel"
            />
            <div className="border border-slate-200 p-5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo</div>
              <div className="mt-3 text-3xl font-black">{perfisCount}</div>
              <p className="mt-1 text-sm font-semibold text-slate-500">perfis de jogo na conta</p>
            </div>
          </div>
        ) : null}

        {active === 'lines' ? (
          <EmptyBox
            title="Lines da equipe"
            desc="Monte line principal, reservas e variações. O mesmo jogador pode estar em mais de uma line, conforme a lógica definida para o projeto."
            action="Criar e organizar lines aqui"
          />
        ) : null}

        {active === 'cronograma' ? (
          <EmptyBox
            title="Cronograma da equipe"
            desc="Agenda com campeonatos, horários de partidas, quedas, treinos, prazos de check-in e pendências de escalação."
            action="Agenda operacional da equipe"
          />
        ) : null}

        {active === 'estatisticas' ? (
          <div className="grid gap-3 md:grid-cols-4">
            <div className="border border-slate-200 p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Campeonatos</div><div className="mt-2 text-2xl font-black">0</div></div>
            <div className="border border-slate-200 p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Booyahs</div><div className="mt-2 text-2xl font-black">0</div></div>
            <div className="border border-slate-200 p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Abates</div><div className="mt-2 text-2xl font-black">0</div></div>
            <div className="border border-slate-200 p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pontos</div><div className="mt-2 text-2xl font-black">0</div></div>
          </div>
        ) : null}

        {active === 'comando' ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <EmptyBox
              title="Comando da organização"
              desc="Dono, líderes, managers, coach, analista e permissões da equipe devem ser controlados aqui."
              action="Convites e permissões"
            />
            <div className="border border-slate-200 p-5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipes vinculadas</div>
              <div className="mt-3 text-3xl font-black">{equipeCount}</div>
              <p className="mt-1 text-sm font-semibold text-slate-500">identidades de equipe disponíveis</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const { user, loading, perfilAtivo, tipoPerfil, perfisJogo, equipes, produtoras } = usePerfil()
  const [equipePanel, setEquipePanel] = useState<EquipePanelKey>('campeonatos')
  const [campeonatosDisponiveis, setCampeonatosDisponiveis] = useState<CampeonatoDisponivel[]>([])
  const [loadingCampeonatos, setLoadingCampeonatos] = useState(false)

  const modo = useMemo<TipoModoUso>(() => {
    const fromUrl = normalizarModoUso(searchParams.get('modo'))
    if (fromUrl) return fromUrl
    if (typeof window !== 'undefined') {
      const saved = normalizarModoUso(window.localStorage.getItem(MODE_STORAGE_KEY))
      if (saved) return saved
    }
    return tipoIdentidadeParaModo(tipoPerfil)
  }, [searchParams, tipoPerfil])

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(MODE_STORAGE_KEY, modo)
  }, [modo])

  useEffect(() => {
    if (modo !== 'equipe') return

    let mounted = true

    async function carregarCampeonatosDisponiveis() {
      setLoadingCampeonatos(true)
      try {
        const { data, error } = await supabase
          .from('campeonatos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8)

        if (error) throw error

        const lista = ((data || []) as CampeonatoDisponivel[]).filter((camp) => statusAberto(camp.status)).slice(0, 6)
        if (mounted) setCampeonatosDisponiveis(lista)
      } catch (error) {
        console.warn('Não foi possível carregar campeonatos disponíveis no dashboard:', error)
        if (mounted) setCampeonatosDisponiveis([])
      } finally {
        if (mounted) setLoadingCampeonatos(false)
      }
    }

    carregarCampeonatosDisponiveis()

    return () => {
      mounted = false
    }
  }, [modo])

  const meta = modoMeta[modo]
  const Icon = meta.icon
  const nome = getIdentityName(perfilAtivo, user?.email?.split('@')?.[0] || 'visitante')
  const precisaConfigurar =
    !loading && user &&
    ((modo === 'jogador' && perfisJogo.length === 0) ||
      (modo === 'equipe' && equipes.length === 0) ||
      (modo === 'produtora' && produtoras.length === 0))

  return (
    <div className="space-y-5">
      <section className={`border p-5 shadow-sm ${meta.tone}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
              <Icon size={15} /> Usando como {getModoUsoLabel(modo)}
            </div>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em] md:text-4xl">{meta.title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 opacity-70">{meta.description}</p>
          </div>
          <div className="border border-current/15 bg-white/50 px-4 py-3 text-right">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] opacity-60">Identidade ativa</div>
            <div className="mt-1 max-w-[260px] truncate text-sm font-black uppercase">{loading ? 'Carregando...' : nome}</div>
            <Link href="/identidade" className="mt-2 inline-flex text-[10px] font-black uppercase tracking-[0.14em] underline">Trocar modo</Link>
          </div>
        </div>
      </section>

      {precisaConfigurar ? (
        <section className="border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <div className="text-sm font-black uppercase">Complete esse modo para liberar todos os atalhos</div>
          <p className="mt-1 text-xs font-semibold leading-5 opacity-75">Você entrou como {getModoUsoLabel(modo)}, mas ainda precisa criar ou vincular o perfil correspondente.</p>
          <Link href={`/identidade?modo=${modo}`} className="mt-3 inline-flex border border-amber-300 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]">Configurar agora</Link>
        </section>
      ) : null}

      {modo === 'equipe' ? (
        <>
          <section className="border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label="Funções da equipe">
            {equipeActions.map((action) => {
              const ActionIcon = action.icon
              const active = equipePanel === action.key
              return (
                <button
                  key={action.key}
                  id={`aba-equipe-${action.key}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`painel-equipe-${action.key}`}
                  onClick={() => setEquipePanel(action.key)}
                  className={[
                    'group flex min-h-[58px] items-center gap-2 border px-3 py-2 text-left transition',
                    active
                      ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-950 hover:border-blue-200 hover:bg-white',
                  ].join(' ')}
                >
                  <span className={['grid h-8 w-8 shrink-0 place-items-center border', active ? 'border-white/20 bg-white/15' : 'border-slate-200 bg-white'].join(' ')}>
                    <ActionIcon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-black uppercase tracking-[-0.02em]">{action.title}</span>
                    <span className="hidden truncate text-[10px] font-bold opacity-70 sm:block">{action.desc}</span>
                  </span>
                </button>
              )
            })}
            </div>
          </section>

          <EquipePanel active={equipePanel} equipeNome={nome} equipeCount={equipes.length} perfisCount={perfisJogo.length} />

          <section className="border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Comprar mais vagas</div>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.04em] text-slate-950">Campeonatos disponíveis</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Veja vagas abertas, escolha um evento e reserve/compre vaga via PIX.</p>
              </div>
              <Link href="/campeonatos" className="border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 hover:border-blue-300 hover:text-blue-700">Ver todos</Link>
            </div>

            <div className="p-5">
              {loadingCampeonatos ? (
                <div className="border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-500">Carregando campeonatos disponíveis...</div>
              ) : campeonatosDisponiveis.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {campeonatosDisponiveis.map((camp) => (
                    <Link key={camp.id} href={`/campeonatos/${camp.id}`} className="group border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{tipoCampeonato(camp)}</div>
                          <h3 className="mt-1 text-lg font-black uppercase tracking-[-0.03em] text-slate-950">{camp.nome || 'Campeonato sem nome'}</h3>
                        </div>
                        <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">Vagas abertas</span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">Vaga: {formatarMoeda(camp.valor_vaga)}</span>
                        <span className="border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">Comprar vaga</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyBox
                  title="Nenhum campeonato aberto encontrado"
                  desc="Quando houver campeonatos com vagas abertas, eles aparecem aqui para o líder comprar ou reservar vaga sem precisar procurar no menu."
                  action="Acompanhar campeonatos disponíveis"
                />
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {actions[modo as Exclude<TipoModoUso, 'equipe'>].map((action) => {
            const ActionIcon = action.icon
            return (
              <Link
                key={action.title}
                href={action.href}
                className={[
                  'group min-h-[170px] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl',
                  action.primary ? 'border-blue-300 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-950 hover:border-blue-200',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={['grid h-11 w-11 place-items-center border', action.primary ? 'border-white/20 bg-white/15' : 'border-slate-200 bg-slate-50'].join(' ')}>
                    <ActionIcon size={18} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] opacity-50 group-hover:opacity-100">Abrir</span>
                </div>
                <h2 className="mt-5 text-lg font-black uppercase tracking-[-0.04em]">{action.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 opacity-70">{action.desc}</p>
              </Link>
            )
          })}
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Perfis de jogo</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{perfisJogo.length}</div>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Equipes</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{equipes.length}</div>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Produtoras</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{produtoras.length}</div>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Modo atual</div>
          <div className="mt-2 text-lg font-black uppercase text-slate-950">{getModoUsoLabel(modo)}</div>
        </div>
      </section>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500">Carregando painel...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
