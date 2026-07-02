'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo } from 'react'
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
import {
  getIdentityName,
  getModeDashboardPath,
  getModoUsoLabel,
  getModoUsoResumo,
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
    description: 'Atalhos para líder cuidar de elenco, lines, inscrições, escalações e estatísticas.',
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

const actions: Record<TipoModoUso, Array<{ title: string; desc: string; href: string; icon: typeof Trophy; primary?: boolean }>> = {
  jogador: [
    { title: 'Criar/editar perfil de jogo', desc: 'Nick, UID, servidor, função e foto.', href: '/identidade?modo=jogador', icon: Gamepad2, primary: true },
    { title: 'Ver campeonatos disponíveis', desc: 'Encontre eventos abertos para disputar.', href: '/campeonatos', icon: Trophy },
    { title: 'Entrar em uma equipe', desc: 'Veja convites ou procure times.', href: '/equipe/convites', icon: UserPlus },
    { title: 'Minhas estatísticas', desc: 'Acompanhe desempenho, ranking e histórico.', href: '/perfil?tab=gamer', icon: BarChart3 },
  ],
  equipe: [
    { title: 'Ver campeonatos disponíveis', desc: 'Ache vagas abertas para sua equipe.', href: '/campeonatos', icon: Trophy, primary: true },
    { title: 'Inscrever minha equipe', desc: 'Comprar/reservar vaga via PIX.', href: '/campeonatos', icon: Ticket },
    { title: 'Escalar jogadores', desc: 'Organize titulares, reservas e lines.', href: '/equipe', icon: ClipboardList },
    { title: 'Formar elenco', desc: 'Gerencie jogadores, convites e membros.', href: '/equipe', icon: Users },
    { title: 'Criar/gerenciar lines', desc: 'Monte line principal e variações.', href: '/equipe', icon: Target },
    { title: 'Ver estatísticas da equipe', desc: 'Resultados, pontuação e evolução.', href: '/ranking', icon: LineChart },
  ],
  produtora: [
    { title: 'Criar campeonato', desc: 'Diário, copa, liga ou xtreino.', href: '/campeonatos/nova', icon: Trophy, primary: true },
    { title: 'Gerenciar meus campeonatos', desc: 'Vagas, equipes, fases e súmulas.', href: '/produtora', icon: CalendarDays },
    { title: 'Vender vagas / PIX', desc: 'Acompanhe pagamentos e reservas.', href: '/admin/configuracoes/pagamentos', icon: Ticket },
    { title: 'Stream e overlays', desc: 'Projetos OBS, pontuador e placar ao vivo.', href: '/stream/projects', icon: Radio },
    { title: 'Equipe de trabalho', desc: 'Convide admins, narradores e operadores.', href: '/produtora', icon: Users },
    { title: 'Links de inscrição', desc: 'Compartilhe vagas com equipes.', href: '/campeonatos', icon: UserPlus },
  ],
  manager: [
    { title: 'Abrir painel manager', desc: 'Central de gestão operacional.', href: '/manager', icon: Medal, primary: true },
    { title: 'Equipes que gerencio', desc: 'Acompanhe elencos e pendências.', href: '/equipe', icon: Shield },
    { title: 'Escalar jogadores', desc: 'Organize lines e escalações.', href: '/equipe', icon: ClipboardList },
    { title: 'Campeonatos disponíveis', desc: 'Procure eventos para indicar ao time.', href: '/campeonatos', icon: Trophy },
  ],
  visitante: [
    { title: 'Ver campeonatos abertos', desc: 'Explore eventos e vagas públicas.', href: '/campeonatos', icon: Trophy, primary: true },
    { title: 'Ver equipes', desc: 'Conheça times cadastrados.', href: '/equipe', icon: Shield },
    { title: 'Ver produtoras', desc: 'Acompanhe organizadores de eventos.', href: '/produtora', icon: Building2 },
    { title: 'Criar conta', desc: 'Entre como jogador, equipe ou produtora.', href: '/', icon: UserPlus },
  ],
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const { user, loading, perfilAtivo, tipoPerfil, perfisJogo, equipes, produtoras } = usePerfil()

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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions[modo].map((action) => {
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
                  <ActionIcon size={21} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.16em] opacity-50 group-hover:opacity-100">Abrir</span>
              </div>
              <h2 className="mt-5 text-lg font-black uppercase tracking-[-0.04em]">{action.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 opacity-70">{action.desc}</p>
            </Link>
          )
        })}
      </section>

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
