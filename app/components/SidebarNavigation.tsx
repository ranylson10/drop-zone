'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  ChevronDown,
  Flame,
  Home,
  Medal,
  MonitorCog,
  Shield,
  Trophy,
  Users,
  Wallet,
  Gavel,
  MessageCircle,
  User,
  Radio,
} from 'lucide-react'
import { useMemo, useState } from 'react'

type NavChild = {
  href: string
  label: string
}

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string
  children?: NavChild[]
  adminOnly?: boolean
  moderatorOnly?: boolean
}

type SidebarNavigationProps = {
  isSiteAdmin?: boolean
  isModerador?: boolean
  isManager?: boolean
  onNavigate?: () => void
}

const baseItems: NavItem[] = [
  { href: '/feed', label: 'Início', icon: <Home size={18} /> },
  { href: '/equipe', label: 'Equipes', icon: <Shield size={18} /> },
  { href: '/jogadores', label: 'Jogadores', icon: <Users size={18} /> },
  { href: '/ranking', label: 'Rankings', icon: <BarChart3 size={18} /> },
  {
    href: '/campeonatos',
    label: 'Campeonatos',
    icon: <Trophy size={18} />,
    children: [
      { href: '/campeonatos', label: 'Todos' },
      { href: '/campeonatos/diarios', label: 'Diários' },
      { href: '/campeonatos/copas', label: 'Copas' },
      { href: '/campeonatos/ligas', label: 'Ligas' },
      { href: '/campeonatos/xtreinos', label: 'Xtreinos' },
      { href: '/campeonatos/confrontos', label: 'Confrontos 4x4' },
      { href: '/produtora', label: 'Produtoras' },
    ],
  },

  {
    href: '/stream/projects',
    label: 'Stream',
    icon: <Radio size={18} />,
    badge: 'OBS',
    children: [
      { href: '/stream/projects', label: 'Projetos' },
      { href: '/stream/controller', label: 'Controlador OBS' },
    ],
  },
  {
    href: '/apostados',
    label: 'Apostados',
    icon: <Flame size={18} />,
    badge: 'LIVE',
    children: [
      { href: '/apostados', label: 'Filas automáticas' },
      { href: '/confrontos/ranking', label: 'Ranking apostados' },
      { href: '/moderadores/online', label: 'Moderadores online' },
    ],
  },
  {
    href: '/transparencia',
    label: 'Transparência',
    icon: <Gavel size={18} />,
    children: [
      { href: '/transparencia', label: 'Denúncias públicas' },
      { href: '/transparencia/minhas', label: 'Minhas denúncias' },
    ],
  },
  { href: '/chat', label: 'Chat', icon: <MessageCircle size={18} /> },
  { href: '/carteira', label: 'Carteira', icon: <Wallet size={18} /> },
]

const managerItem: NavItem = {
  href: '/manager',
  label: 'Manager',
  icon: <Medal size={18} />,
  badge: 'HUB',
}

const moderadorItem: NavItem = {
  href: '/moderadores',
  label: 'Moderadores',
  icon: <MonitorCog size={18} />,
  children: [{ href: '/moderadores', label: 'Painel do moderador' }],
}

const adminItem: NavItem = {
  href: '/admin',
  label: 'Administração',
  icon: <MonitorCog size={18} />,
  children: [
    { href: '/admin', label: 'Painel geral' },
    { href: '/admin/produtoras', label: 'Produtoras' },
    { href: '/admin/administradores', label: 'Administradores' },
    { href: '/admin/moderacao', label: 'Moderação' },
    { href: '/admin/kyc', label: 'KYC' },
  ],
}

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/feed') return pathname === '/' || pathname === '/feed'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname()
  const ativo = isActivePath(pathname, item.href)
  const childAtivo = item.children?.some((child) => isActivePath(pathname, child.href))
  const [open, setOpen] = useState(Boolean(ativo || childAtivo))
  const hasChildren = Boolean(item.children?.length)

  const rowClass = [
    'group flex min-h-11 w-full items-center gap-3 border px-3 text-left text-[12px] font-black uppercase tracking-[0.12em] transition',
    ativo || childAtivo
      ? 'border-[#2563eb]/40 bg-[#2563eb] text-white shadow-[0_8px_24px_rgba(37,99,235,0.22)]'
      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white',
  ].join(' ')

  return (
    <div>
      <div className="flex gap-2">
        <Link href={item.href} onClick={onNavigate} className={rowClass}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/15 bg-black/15 text-current">
            {item.icon}
          </span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.badge ? <span className="bg-orange-500 px-1.5 py-0.5 text-[8px] text-white">{item.badge}</span> : null}
        </Link>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white"
            aria-label={`Abrir submenu ${item.label}`}
          >
            <ChevronDown size={15} className={open ? 'rotate-180 transition' : 'transition'} />
          </button>
        ) : null}
      </div>

      {hasChildren && open ? (
        <div className="ml-5 mt-1 border-l border-white/10 pl-3">
          {item.children?.map((child) => {
            const ativoChild = isActivePath(pathname, child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={[
                  'block border border-transparent px-3 py-2 text-[11px] font-bold uppercase tracking-[0.10em] transition',
                  ativoChild ? 'bg-white text-[#142340]' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
                ].join(' ')}
              >
                {child.label}
              </Link>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default function SidebarNavigation({ isSiteAdmin = false, isModerador = false, isManager = false, onNavigate }: SidebarNavigationProps) {
  const items = useMemo(() => {
    const lista = [...baseItems]
    if (isManager) lista.push(managerItem)
    if (isModerador || isSiteAdmin) lista.push(moderadorItem)
    if (isSiteAdmin) lista.push(adminItem)
    return lista
  }, [isManager, isModerador, isSiteAdmin])

  return (
    <aside className="flex h-full flex-col bg-[#070b18] text-white">
      <div className="border-b border-cyan-400/10 px-3 py-4">
        <Link
          href="/feed"
          onClick={onNavigate}
          className="group flex min-h-[150px] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#111d35] via-[#0c172b] to-[#08111f] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_35px_rgba(37,99,235,0.10)] transition hover:border-cyan-400/45"
        >
          <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[28px] border border-cyan-300/25 bg-[#071225]/80 p-2.5 shadow-[0_0_34px_rgba(34,211,238,0.16)]">
            <img src="/brand/dropzone-icon.png" alt="Drop Zone" className="h-full w-full object-contain drop-shadow-[0_0_16px_rgba(56,189,248,0.22)]" />
          </div>
          <div className="text-center leading-none">
            <div className="text-[18px] font-black uppercase tracking-[-0.05em] text-white drop-shadow-[0_0_14px_rgba(56,189,248,0.20)]">DROP<span className="text-cyan-200">ZONE</span></div>
            <div className="mt-1 text-[9px] font-black uppercase tracking-[0.32em] text-cyan-200/60">Sistema competitivo</div>
          </div>
        </Link>
      </div>

      <nav className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
        {items.map((item) => (
          <NavRow key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-white/10 p-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Sistema competitivo LEALT
      </div>
    </aside>
  )
}

export function MobileBottomNavigation() {
  const pathname = usePathname()
  const items = [
    { href: '/feed', label: 'Home', icon: <Home size={19} /> },
    { href: '/campeonatos', label: 'Comp', icon: <Trophy size={19} /> },
    { href: '/apostados', label: 'Apostas', icon: <Flame size={19} /> },
    { href: '/chat', label: 'Chat', icon: <MessageCircle size={19} /> },
    { href: '/perfil', label: 'Perfil', icon: <User size={19} /> },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[120] grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 py-1 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur xl:hidden">
      {items.map((item) => {
        const ativo = isActivePath(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'flex min-h-12 flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-[0.08em]',
              ativo ? 'text-[#2563eb]' : 'text-slate-500',
            ].join(' ')}
          >
            <span className={ativo ? 'rounded-full bg-blue-50 px-3 py-1' : 'px-3 py-1'}>{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
