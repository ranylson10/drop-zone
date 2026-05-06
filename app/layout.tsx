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

  useEffect(() => {
    let ativo = true

    async function carregarDadosUsuario() {
      try {
        const { data } = await supabase.auth.getUser()
        const uid = data.user?.id

        if (!uid) {
          if (!ativo) return
          setSaldoCarteira(0)
          setIsSiteAdmin(false)
          setIsModerador(false)
          return
        }

        const [walletRes, siteAdminRes, moderadorRes] = await Promise.all([
          supabase
            .from('wallet_saldo')
            .select('saldo')
            .eq('user_id', uid)
            .maybeSingle(),
          supabase
            .from('site_administradores')
            .select('id')
            .eq('user_id', uid)
            .eq('ativo', true)
            .limit(1),
          supabase
            .from('administradores_evento')
            .select('id')
            .eq('user_id', uid)
            .eq('status', 'aprovado')
            .limit(1),
        ])

        if (!ativo) return

        setSaldoCarteira(Number(walletRes.data?.saldo || 0))
        setIsSiteAdmin(Boolean(siteAdminRes.data && siteAdminRes.data.length > 0))
        setIsModerador(Boolean(moderadorRes.data && moderadorRes.data.length > 0))
      } catch {
        if (!ativo) return
        setSaldoCarteira(0)
        setIsSiteAdmin(false)
        setIsModerador(false)
      }
    }

    carregarDadosUsuario()

    return () => {
      ativo = false
    }
  }, [])

  async function encerrarSessao() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = useMemo<NavItem[]>(() => {
    const base: NavItem[] = [
      { href: '/feed', label: 'Início' },
      { href: '/equipe', label: 'Equipes' },
      { href: '/jogadores', label: 'Jogadores' },
      {
        href: '/campeonatos',
        label: 'Campeonatos',
        children: [
          { href: '/campeonatos', label: 'Todos os campeonatos' },
          { href: '/campeonatos/diarios', label: 'Diários' },
          { href: '/campeonatos/copas', label: 'Copas' },
          { href: '/campeonatos/ligas', label: 'Ligas' },
          { href: '/campeonatos/xtreinos', label: 'Xtreinos' },
          { href: '/campeonatos/confrontos', label: 'Confrontos 4x4' },
          { href: '/produtora', label: 'Produtoras' },
        ],
      },
      {
        href: '/transparencia',
        label: 'Transparência',
        children: [
          { href: '/transparencia', label: 'Denúncias públicas' },
          { href: '/transparencia/minhas', label: 'Minhas denúncias' },
        ],
      },
    ]

    if (isModerador || isSiteAdmin) {
      base.push({
        href: '/moderadores',
        label: 'Moderadores',
        children: [
          { href: '/moderadores', label: 'Painel do moderador' },
        ],
      })
    }

    if (isSiteAdmin) {
      base.push({
        href: '/admin',
        label: 'Administração',
        children: [
          { href: '/admin', label: 'Painel geral' },
          { href: '/admin/produtoras', label: 'Produtoras' },
          { href: '/admin/administradores', label: 'Administradores' },
          { href: '/admin/moderacao', label: 'Moderação' },
          { href: '/admin/kyc', label: 'KYC' },
        ],
      })
    }

    return base
  }, [isModerador, isSiteAdmin])

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-slate-200/80 bg-white text-slate-950 ">
      <div className="mx-auto flex h-[68px] w-full max-w-[1500px] items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/feed" className="group flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center  border border-slate-200 bg-white transition-all duration-200 group-hover:border-blue-200 group-hover:bg-slate-50">
              <DropZoneLogo size="sm" animated />
            </div>

            <div className="hidden min-w-0 flex-col sm:flex">
              <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
                Drop Zone
              </span>
              <span className="truncate text-[11px] text-slate-500">
                Plataforma competitiva
              </span>
            </div>
          </Link>

          <nav className="ml-3 hidden items-center gap-1 xl:flex">
            {navItems.map((item) => {
              const ativo = isActive(item.href)
              const hasChildren = Boolean(item.children?.length)

              if (hasChildren) {
                return (
                  <div key={item.href} className="group relative">
                    <Link
                      href={item.href}
                      className={[
                        'inline-flex h-9 items-center gap-1 border px-3 text-[12px] font-medium transition',
                        ativo
                          ? 'border-blue-200 bg-[#eaf6ff] text-[#2563eb]'
                          : 'border-transparent text-[#142340] hover:border-zinc-200 hover:bg-zinc-50 hover:text-[#2563eb]',
                      ].join(' ')}
                    >
                      {item.label}
                      <ChevronDown size={13} className="transition group-hover:rotate-180" />
                    </Link>

                    <div className="invisible absolute left-0 top-full z-[220] w-56 border border-zinc-200 bg-white opacity-0 transition group-hover:visible group-hover:opacity-100">
                      <div className="border-b border-zinc-100 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {item.label}
                      </div>
                      {item.children?.map((child) => (
                        <NavLinkItem
                          key={child.href}
                          item={child}
                          ativo={isActive(child.href)}
                        />
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'inline-flex h-9 items-center border px-3 text-[12px] font-medium transition',
                    ativo
                      ? 'border-blue-200 bg-[#eaf6ff] text-[#2563eb]'
                      : 'border-transparent text-[#142340] hover:border-zinc-200 hover:bg-zinc-50 hover:text-[#2563eb]',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center  border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 xl:hidden"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <ApostadosHeaderCard />



          {usuarioLogado ? (
            <>
          <button
            onClick={() => router.push('/carteira')}
            className="hidden md:flex items-center gap-3  border border-[#2563eb]/20 bg-white px-3 py-2 transition-all duration-200 hover:border-[#2563eb]/50 hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 items-center justify-center  border border-[#2563eb]/25 bg-[#2563eb]/10">
              <Wallet size={16} className="text-[#2563eb]" />
            </div>

            <div className="text-left leading-none">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Carteira
              </div>
              <div className="mt-1 text-[12px] font-semibold uppercase text-slate-950">
                {formatarDinheiro(saldoCarteira)}
              </div>
            </div>
          </button>

          <div className="relative">
            <button
              onClick={() => setActiveDropdown((prev) => !prev)}
              className="group flex items-center gap-3  border border-slate-200 bg-white px-2.5 py-2 transition-all duration-200 hover:bg-slate-50"
            >
              <div className="hidden text-right lg:block">
                <p className="max-w-[180px] truncate text-[13px] font-medium text-slate-950">
                  {loading ? 'Carregando...' : nomePerfilAtivo}
                </p>

                <p
                  className="mt-0.5 text-[11px] font-medium"
                  style={{ color: corTema }}
                >
                  {tipoPerfil === 'usuario'
                    ? 'Perfil pessoal'
                    : `Perfil ${tipoPerfil}`}
                </p>
              </div>

              <div
                className="h-10 w-10 overflow-hidden  border p-0.5"
                style={{
                  borderColor: activeDropdown ? corTema : 'rgba(255,255,255,0.10)',
                }}
              >
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[10px] bg-slate-100">
                  {avatarPerfilAtivo ? (
                    <img
                      src={avatarPerfilAtivo}
                      className="h-full w-full object-cover"
                      alt="Perfil ativo"
                    />
                  ) : (
                    <User size={16} className="text-slate-500" />
                  )}
                </div>
              </div>

              <ChevronDown
                size={16}
                className={`text-slate-500 transition-transform duration-200 ${
                  activeDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {activeDropdown && (
              <>
                <div
                  className="fixed inset-0 z-[150]"
                  onClick={() => setActiveDropdown(false)}
                />

                <div className="absolute right-0 top-[58px] z-[200] w-[360px] max-w-[92vw]  border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.16)] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="mb-3 border-b border-slate-200 px-1 pb-3">
                    <p className="text-[12px] font-semibold text-slate-950">
                      Selecionar perfil
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Escolha com qual identidade deseja usar o sistema.
                    </p>

                    <Link
                      href="/perfil"
                      onClick={() => setActiveDropdown(false)}
                      className="mt-3 inline-flex h-8 items-center justify-center border border-zinc-300 bg-white px-3 text-[11px] font-medium uppercase tracking-wide text-[#142340] transition hover:bg-zinc-50 hover:text-[#2563eb]"
                    >
                      Abrir meu perfil
                    </Link>
                  </div>

                  <div className="custom-scrollbar max-h-[520px] space-y-3 overflow-y-auto pr-1">
                    {perfilUsuario && (
                      <div className="space-y-2">
                        <p className="px-1 text-[11px] font-medium text-slate-500">
                          Perfil de usuário
                        </p>

                        <PerfilItem
                          ativo={tipoPerfil === 'usuario'}
                          titulo={
                            perfilUsuario.nome_exibicao ||
                            perfilUsuario.username ||
                            'Meu perfil'
                          }
                          subtitulo={perfilUsuario.username || 'Conta principal'}
                          corBorda="#ffffff"
                          avatar={perfilUsuario.avatar_url || perfilUsuario.foto_url || null}
                          icone={<User size={16} className="text-slate-950" />}
                          onClick={() => {
                            setPerfilAtivoByTipo('usuario')
                            setActiveDropdown(false)
                          }}
                        />
                      </div>
                    )}

                    {perfisJogo?.length > 0 && (
                      <div className="space-y-2">
                        <p className="px-1 text-[11px] font-medium text-slate-500">
                          Perfis de jogo
                        </p>

                        {perfisJogo.map((perfil) => (
                          <PerfilItem
                            key={perfil.id}
                            ativo={tipoPerfil === 'jogo' && perfilAtivo?.id === perfil.id}
                            titulo={perfil.nick || 'Perfil de jogo'}
                            subtitulo="Identidade competitiva"
                            corBorda="#2563eb"
                            avatar={perfil.foto_capa || perfil.avatar_url || null}
                            icone={<Gamepad2 size={16} className="text-[#2563eb]" />}
                            onClick={() => {
                              setPerfilAtivoByTipo('jogo', perfil.id)
                              setActiveDropdown(false)
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {equipes?.length > 0 && (
                      <div className="space-y-2">
                        <p className="px-1 text-[11px] font-medium text-slate-500">
                          Equipes
                        </p>

                        {equipes.map((equipe) => (
                          <PerfilItem
                            key={equipe.id}
                            ativo={tipoPerfil === 'equipe' && perfilAtivo?.id === equipe.id}
                            titulo={equipe.nome || 'Equipe'}
                            subtitulo="Perfil coletivo para inscrições"
                            corBorda="#2563eb"
                            avatar={equipe.logo_url || null}
                            icone={<Shield size={16} className="text-[#2563eb]" />}
                            onClick={() => {
                              setPerfilAtivoByTipo('equipe', equipe.id)
                              setActiveDropdown(false)
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {produtoras?.length > 0 && (
                      <div className="space-y-2">
                        <p className="px-1 text-[11px] font-medium text-slate-500">
                          Produtoras
                        </p>

                        {produtoras.map((produtora) => (
                          <PerfilItem
                            key={produtora.id}
                            ativo={
                              tipoPerfil === 'produtora' && perfilAtivo?.id === produtora.id
                            }
                            titulo={produtora.nome || 'Produtora'}
                            subtitulo="Perfil organizador de campeonatos"
                            corBorda="#2563eb"
                            avatar={produtora.logo_url || null}
                            icone={<Building2 size={16} className="text-[#2563eb]" />}
                            onClick={() => {
                              setPerfilAtivoByTipo('produtora', produtora.id)
                              setActiveDropdown(false)
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <button
                      onClick={encerrarSessao}
                      className="flex w-full items-center gap-3  px-3 py-3 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                    >
                      <LogOut size={16} />
                      Encerrar sessão
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/cadastro"
                className="hidden h-10 items-center gap-2 border border-orange-300 bg-orange-50 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-orange-700 transition hover:bg-orange-100 sm:inline-flex"
              >
                <UserPlus size={14} />
                Registre-se
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 items-center gap-2 border border-blue-300 bg-blue-600 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-blue-700"
              >
                <LogIn size={14} />
                Login
              </Link>
            </div>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 xl:hidden">
          <nav className="mx-auto flex max-w-[1500px] flex-col border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 p-2">
              <ApostadosHeaderCard compacto />
            </div>
            {navItems.map((item) => {
              const ativo = isActive(item.href)
              const hasChildren = Boolean(item.children?.length)

              return (
                <div key={item.href} className="border-b border-zinc-100 last:border-b-0">
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={[
                      'flex min-h-10 items-center justify-between px-3 py-2 text-[13px] font-medium transition',
                      ativo
                        ? 'bg-[#eaf6ff] text-[#2563eb]'
                        : 'text-[#142340] hover:bg-zinc-50 hover:text-[#2563eb]',
                    ].join(' ')}
                  >
                    {item.label}
                    {hasChildren && <ChevronDown size={14} />}
                  </Link>

                  {hasChildren && (
                    <div className="bg-zinc-50">
                      {item.children?.map((child) => (
                        <NavLinkItem
                          key={child.href}
                          item={child}
                          ativo={isActive(child.href)}
                          onClick={() => setMobileMenuOpen(false)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}


function AuthenticatedOnlyToast() {
  const { user } = usePerfil()
  if (!user) return null
  return <ModeradorMatchToast />
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.body.classList.remove('dark')
    document.documentElement.style.colorScheme = 'only light'
    document.body.style.colorScheme = 'only light'
    document.documentElement.style.background = '#f5f7fb'
    document.body.style.background = '#f5f7fb'

    let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null
    if (!colorSchemeMeta) {
      colorSchemeMeta = document.createElement('meta')
      colorSchemeMeta.name = 'color-scheme'
      document.head.appendChild(colorSchemeMeta)
    }
    colorSchemeMeta.content = 'only light'

    let supportedMeta = document.querySelector('meta[name="supported-color-schemes"]') as HTMLMetaElement | null
    if (!supportedMeta) {
      supportedMeta = document.createElement('meta')
      supportedMeta.name = 'supported-color-schemes'
      document.head.appendChild(supportedMeta)
    }
    supportedMeta.content = 'light'
  }, [pathname])

  return (
    <html
      lang="pt-br"
      suppressHydrationWarning
      className="light"
      style={{ colorScheme: 'only light' as any, background: '#f5f7fb' }}
    >
      <head>
        <meta name="color-scheme" content="only light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="theme-color" content="#f5f7fb" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#f5f7fb" media="(prefers-color-scheme: dark)" />
      </head>
      <body
        className="min-h-screen bg-[var(--dz-bg)] text-slate-950 font-sans selection:bg-blue-200 selection:text-slate-950"
        style={{ colorScheme: 'only light' as any, background: '#f5f7fb' }}
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