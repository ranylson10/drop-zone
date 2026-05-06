'use client'

import './globals.css'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LogOut,
  LogIn,
  UserPlus,
  User,
  Building2,
  Gamepad2,
  ChevronDown,
  Shield,
  Check,
  Menu,
  X,
  Wallet,
  Flame,
  BarChart3,
} from 'lucide-react'
import { PerfilProvider, usePerfil } from './contexts/PerfilContext'
import { DropZoneLogo } from './components/DropZoneLogo'
import { supabase } from '../lib/supabase'
import ModeradorMatchToast from '@/app/components/ModeradorMatchToast'

type NavChild = {
  href: string
  label: string
}

type NavItem = {
  href: string
  label: string
  children?: NavChild[]
}

type NavLinkItemProps = {
  item: NavChild
  ativo: boolean
  onClick?: () => void
}

function NavLinkItem({ item, ativo, onClick }: NavLinkItemProps) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={[
        'block border-t border-zinc-100 px-3 py-2 text-[12px] font-medium transition',
        ativo
          ? 'bg-[#eaf6ff] text-[#2563eb]'
          : 'text-[#142340] hover:bg-zinc-50 hover:text-[#2563eb]',
      ].join(' ')}
    >
      {item.label}
    </Link>
  )
}

type ItemPerfilProps = {
  ativo?: boolean
  titulo: string
  subtitulo: string
  corBorda: string
  icone: React.ReactNode
  avatar?: string | null
  onClick: () => void
}

function PerfilItem({
  ativo = false,
  titulo,
  subtitulo,
  corBorda,
  icone,
  avatar,
  onClick,
}: ItemPerfilProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3  border p-3 text-left transition-all duration-200',
        ativo
          ? 'border-blue-200 bg-blue-50 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'
          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-200',
      ].join(' ')}
    >
      <div
        className="h-11 w-11 shrink-0 overflow-hidden  border bg-black/30 p-0.5"
        style={{ borderColor: ativo ? corBorda : 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[10px] bg-slate-100">
          {avatar ? (
            <img src={avatar} alt={titulo} className="h-full w-full object-cover" />
          ) : (
            icone
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-950">{titulo}</p>
        <p className="truncate text-[11px] text-slate-500">{subtitulo}</p>
      </div>

      {ativo && (
        <div className="shrink-0">
          <Check size={16} style={{ color: corBorda }} />
        </div>
      )}
    </button>
  )
}

function ApostadosHeaderCard({ compacto = false }: { compacto?: boolean }) {
  const pathname = usePathname()
  const ativo = pathname === '/apostados' || pathname?.startsWith('/apostados/')

  const links = [
    { href: '/apostados', label: 'Filas automáticas' },
    { href: '/confrontos/ranking', label: 'Ranking', icon: BarChart3 },
    { href: '/moderadores/online', label: 'Moderadores online' },
  ]

  if (compacto) {
    return (
      <Link
        href="/apostados"
        className={[
          'flex min-h-11 items-center justify-between border border-orange-200 bg-orange-50 px-3 py-2 text-[13px] font-semibold uppercase tracking-wide text-orange-700',
          ativo ? 'ring-1 ring-orange-300' : '',
        ].join(' ')}
      >
        <span className="flex items-center gap-2">
          <Flame size={16} />
          Apostados
        </span>
        <span className="border border-orange-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-orange-700">
          Destaque
        </span>
      </Link>
    )
  }

  return (
    <div className="group relative hidden lg:block">
      <Link
        href="/apostados"
        className={[
          'relative inline-flex h-10 items-center gap-2 border px-3 text-[12px] font-semibold uppercase tracking-wide transition',
          ativo
            ? 'border-orange-300 bg-orange-100 text-orange-800'
            : 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:bg-orange-100',
        ].join(' ')}
      >
        <span className="flex h-6 w-6 items-center justify-center border border-orange-300 bg-white text-orange-600">
          <Flame size={14} />
        </span>
        <span>Apostados</span>
        <span className="border border-orange-400 bg-orange-500 px-1.5 py-0.5 text-[9px] leading-none text-white">
          LIVE
        </span>
        <ChevronDown size={13} className="transition group-hover:rotate-180" />
        <span className="absolute -right-1 -top-1 h-2 w-2 bg-orange-500" />
      </Link>

      <div className="invisible absolute right-0 top-full z-[230] w-60 border border-orange-200 bg-white opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="border-b border-orange-100 bg-orange-50 px-3 py-2">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
            <Flame size={13} />
            Área de apostados
          </div>
          <p className="mt-1 text-[11px] normal-case tracking-normal text-orange-700/80">
            Filas fixas, ranking e moderadores online.
          </p>
        </div>

        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 text-[12px] font-medium text-[#142340] transition hover:bg-orange-50 hover:text-orange-700"
            >
              <span className="flex items-center gap-2">
                {Icon ? <Icon size={13} className="text-orange-600" /> : <span className="h-1.5 w-1.5 bg-orange-500" />}
                {link.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function NavbarContent() {
  const pathname = usePathname()
  const router = useRouter()

  const {
    user,
    perfilAtivo,
    tipoPerfil,
    perfilUsuario,
    perfisJogo,
    equipes,
    produtoras,
    setPerfilAtivoByTipo,
    loading,
  } = usePerfil()

  const [activeDropdown, setActiveDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [saldoCarteira, setSaldoCarteira] = useState(0)
  const [isSiteAdmin, setIsSiteAdmin] = useState(false)
  const [isModerador, setIsModerador] = useState(false)

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(`${path}/`)

  const usuarioLogado = Boolean(user)

  const getTemaColor = () => '#2563eb'

  const corTema = getTemaColor()

  const nomePerfilAtivo = useMemo(() => {
    if (!perfilAtivo) return 'Usuário'
    return (
      perfilAtivo.nome ||
      perfilAtivo.nome_exibicao ||
      perfilAtivo.username ||
      perfilAtivo.nick ||
      'Usuário'
    )
  }, [perfilAtivo])

  const avatarPerfilAtivo =
    perfilAtivo?.avatar_url ||
    perfilAtivo?.foto_url ||
    perfilAtivo?.logo_url ||
    perfilAtivo?.foto_capa ||
    null


  function formatarDinheiro(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <html
      lang="pt-br"
      suppressHydrationWarning
      className="light"
      style={{ colorScheme: 'light', background: '#f5f7fb' }}
    >
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="theme-color" content="#f5f7fb" />
        <meta name="msapplication-TileColor" content="#f5f7fb" />
      </head>
      <body
        className="min-h-screen bg-[var(--dz-bg)] text-slate-950 font-sans selection:bg-blue-200 selection:text-slate-950"
        style={{ colorScheme: 'light dark' as any, background: '#f5f7fb' }}
      >
        <PerfilProvider>
          <div className="relative min-h-screen">
            <div className="pointer-events-none fixed inset-0 opacity-[0.55] [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:24px_24px]" />
            <div className="pointer-events-none fixed inset-x-0 top-0 h-[220px] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.10),transparent_55%)]" />

            <NavbarContent />

            <AuthenticatedOnlyToast />

            <main className="mx-auto w-full max-w-[1500px] px-4 py-4 md:px-5 md:py-5">
              {children}
            </main>
          </div>
        </PerfilProvider>
      </body>
    </html>
  )
}