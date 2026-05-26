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
  Plus,
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
      { href: '/stream/pontuador', label: 'Pontuador' },
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
  const current = Boolean(ativo || childAtivo)

  const rowClass = [
    'group flex min-h-10 w-full items-center gap-3 rounded-md border px-3 text-left text-[12px] font-semibold uppercase tracking-[0.06em] transition',
    current
      ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-[0_8px_18px_rgba(37,99,235,0.18)]'
      : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950',
  ].join(' ')

  return (
    <div>
      <div className="flex gap-1.5">
        <Link href={item.href} onClick={onNavigate} className={rowClass}>
          <span
            className={[
              'flex h-7 w-7 shrink-0 items-center justify-center rounded border text-current',
              current ? 'border-white/20 bg-white/15' : 'border-slate-200 bg-white',
            ].join(' ')}
          >
            {item.icon}
          </span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.badge ? <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[8px] font-bold text-orange-600">{item.badge}</span> : null}
        </Link>

        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            aria-label={`Abrir submenu ${item.label}`}
          >
            <ChevronDown size={15} className={open ? 'rotate-180 transition' : 'transition'} />
          </button>
        ) : null}
      </div>

      {hasChildren && open ? (
        <div className="ml-5 mt-1 border-l border-slate-200 pl-3">
          {item.children?.map((child) => {
            const ativoChild = isActivePath(pathname, child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={[
                  'block rounded-md border border-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] transition',
                  ativoChild ? 'bg-blue-50 text-[#2563eb]' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950',
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
    <aside className="flex h-full flex-col border-r border-slate-200 bg-[#f8fafc] text-slate-950">
      <div className="border-b border-slate-200 px-3 py-3">
        <Link
          href="/feed"
          onClick={onNavigate}
          className="group flex min-h-[118px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:border-blue-200"
        >
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 p-2 shadow-[0_8px_20px_rgba(37,99,235,0.10)]">
            <img src="/brand/dropzone-icon.png" alt="Drop Zone" className="h-full w-full object-contain" />
          </div>
          <div className="text-center leading-none">
            <div className="text-[17px] font-extrabold uppercase tracking-[-0.03em] text-slate-950">
              DROP<span className="text-[#2563eb]">ZONE</span>
            </div>
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400">Sistema competitivo</div>
          </div>
        </Link>
      </div>

      <nav className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto p-3">
        {items.map((item) => (
          <NavRow key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Sistema competitivo LEALT
      </div>
    </aside>
  )
}

export function MobileBottomNavigation() {
  const pathname = usePathname()
  const items = [
    { href: '/feed', label: 'Inicio', icon: <Home size={20} /> },
    { href: '/campeonatos', label: 'Comp', icon: <Trophy size={20} /> },
    { href: '/campeonatos/nova', label: 'Criar', icon: <Plus size={22} />, primary: true },
    { href: '/chat', label: 'Chat', icon: <MessageCircle size={20} /> },
    { href: '/perfil', label: 'Perfil', icon: <User size={20} /> },
  ]

  return (
    <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[120] grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur xl:hidden">
      {items.map((item) => {
        const ativo = isActivePath(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'flex min-h-12 flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-[0.08em]',
              item.primary ? '-mt-5 text-[#008069]' : ativo ? 'text-[#008069]' : 'text-slate-500',
            ].join(' ')}
          >
            <span
              className={[
                'flex items-center justify-center',
                item.primary
                  ? 'h-12 w-12 rounded-full border-4 border-white bg-[#008069] text-white shadow-[0_10px_30px_rgba(0,128,105,0.28)]'
                  : ativo
                    ? 'h-8 min-w-10 rounded-full bg-emerald-50 px-3 text-[#008069]'
                    : 'h-8 min-w-10 px-3',
              ].join(' ')}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
