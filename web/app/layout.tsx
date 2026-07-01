'use client'

import './globals.css'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Check,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  User,
  UserPlus,
  X,
  Gamepad2,
  Shield,
  Building2,
} from 'lucide-react'
import { PerfilProvider, usePerfil } from './contexts/PerfilContext'
import { supabase } from '../lib/supabase'
import HeaderAlerts from '@/app/components/HeaderAlerts'
import SidebarNavigation, { MobileBottomNavigation } from '@/app/components/SidebarNavigation'
import PWARegister from '@/app/components/PWARegister'
import PWAInstallPrompt from '@/app/components/PWAInstallPrompt'

type ItemPerfilProps = {
  ativo?: boolean
  titulo: string
  subtitulo: string
  corBorda: string
  icone: React.ReactNode
  avatar?: string | null
  onClick: () => void
}

function PerfilItem({ ativo = false, titulo, subtitulo, corBorda, icone, avatar, onClick }: ItemPerfilProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex w-full items-center gap-3 border p-3 text-left transition-all duration-200',
        ativo ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
      ].join(' ')}
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden border bg-white p-0.5" style={{ borderColor: ativo ? corBorda : '#e4e4e7' }}>
        <div className="flex h-full w-full items-center justify-center overflow-hidden bg-slate-100">
          {avatar ? <img src={avatar} alt={titulo} className="h-full w-full object-cover" /> : icone}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-slate-950">{titulo}</p>
        <p className="truncate text-[11px] font-medium text-slate-500">{subtitulo}</p>
      </div>
      {ativo ? <Check size={16} style={{ color: corBorda }} /> : null}
    </button>
  )
}

function TopHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
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

  const nomePerfilAtivo = useMemo(() => {
    if (!perfilAtivo) return 'Usuário'
    return perfilAtivo.nome || perfilAtivo.nome_exibicao || perfilAtivo.username || perfilAtivo.nick || 'Usuário'
  }, [perfilAtivo])

  const avatarPerfilAtivo = perfilAtivo?.avatar_url || perfilAtivo?.foto_url || perfilAtivo?.logo_url || perfilAtivo?.foto_capa || null
  const usuarioLogado = Boolean(user)




  async function encerrarSessao() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-[100] border-b border-slate-200/90 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 xl:hidden"
            aria-label="Abrir menu lateral"
            aria-expanded={false}
          >
            <Menu size={19} />
          </button>
          <div className="hidden min-w-0 md:block">
            <div className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">Central Drop Zone</div>
            <div className="truncate text-[14px] font-bold text-slate-950">Competitivo, equipes, campeonatos e alertas</div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {usuarioLogado ? <HeaderAlerts /> : null}



          {usuarioLogado ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => !prev)}
                className="group flex items-center gap-2 border border-slate-200 bg-white px-2 py-2 transition hover:bg-slate-50 md:gap-3 md:px-3"
              >
                <div className="hidden text-right lg:block">
                  <p className="max-w-[180px] truncate text-[13px] font-bold text-slate-950">{loading ? 'Carregando...' : nomePerfilAtivo}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-[#2563eb]">
                    {tipoPerfil === 'usuario' ? 'Perfil pessoal' : `Perfil ${tipoPerfil}`}
                  </p>
                </div>
                <div className="h-10 w-10 overflow-hidden border border-slate-200 bg-slate-100 p-0.5">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden bg-slate-100">
                    {avatarPerfilAtivo ? <img src={avatarPerfilAtivo} className="h-full w-full object-cover" alt="Perfil ativo" /> : <User size={16} className="text-slate-500" />}
                  </div>
                </div>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${activeDropdown ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown ? (
                <>
                  <div className="fixed inset-0 z-[150]" onClick={() => setActiveDropdown(false)} />
                  <div className="absolute right-0 top-[56px] z-[200] w-[360px] max-w-[92vw] border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
                    <div className="mb-3 border-b border-slate-200 px-1 pb-3">
                      <p className="text-[12px] font-bold text-slate-950">Selecionar perfil</p>
                      <p className="mt-1 text-[11px] text-slate-500">Escolha com qual identidade deseja usar o sistema.</p>
                      <Link
                        href="/perfil"
                        onClick={() => setActiveDropdown(false)}
                        className="mt-3 inline-flex h-8 items-center justify-center border border-zinc-300 bg-white px-3 text-[11px] font-bold uppercase tracking-wide text-[#142340] transition hover:bg-zinc-50 hover:text-[#2563eb]"
                      >
                        Abrir meu perfil
                      </Link>
                    </div>

                    <div className="custom-scrollbar max-h-[520px] space-y-3 overflow-y-auto pr-1">
                      {perfilUsuario ? (
                        <div className="space-y-2">
                          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Perfil de usuário</p>
                          <PerfilItem
                            ativo={tipoPerfil === 'usuario'}
                            titulo={perfilUsuario.nome_exibicao || perfilUsuario.username || 'Meu perfil'}
                            subtitulo={perfilUsuario.username || 'Conta principal'}
                            corBorda="#2563eb"
                            avatar={perfilUsuario.avatar_url || perfilUsuario.foto_url || null}
                            icone={<User size={16} className="text-slate-950" />}
                            onClick={() => {
                              setPerfilAtivoByTipo('usuario')
                              setActiveDropdown(false)
                            }}
                          />
                        </div>
                      ) : null}

                      {perfisJogo?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Perfis de jogo</p>
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
                      ) : null}

                      {equipes?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Equipes</p>
                          {equipes.map((equipe) => (
                            <PerfilItem
                              key={equipe.id}
                              ativo={tipoPerfil === 'equipe' && perfilAtivo?.id === equipe.id}
                              titulo={equipe.nome || 'Equipe'}
                              subtitulo="Perfil coletivo"
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
                      ) : null}

                      {produtoras?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Produtoras</p>
                          {produtoras.map((produtora) => (
                            <PerfilItem
                              key={produtora.id}
                              ativo={tipoPerfil === 'produtora' && perfilAtivo?.id === produtora.id}
                              titulo={produtora.nome || 'Produtora'}
                              subtitulo="Organizador de campeonatos"
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
                      ) : null}
                    </div>

                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <button
                        type="button"
                        onClick={encerrarSessao}
                        className="flex w-full items-center gap-3 px-3 py-3 text-[13px] font-bold text-red-500 transition-colors hover:bg-red-50"
                      >
                        <LogOut size={16} />
                        Encerrar sessão
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/cadastro" className="hidden h-10 items-center gap-2 border border-orange-300 bg-orange-50 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-orange-700 transition hover:bg-orange-100 sm:inline-flex">
                <UserPlus size={14} />
                Registre-se
              </Link>
              <Link href="/login" className="inline-flex h-10 items-center gap-2 border border-blue-300 bg-blue-600 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-blue-700">
                <LogIn size={14} />
                Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const isAuthRoute = ['/login', '/cadastro', '/recuperar', '/confirmar', '/redefinir-senha'].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
  const isCleanRoute = pathname === '/stream' || pathname.startsWith('/stream/') || pathname.startsWith('/escala/')
  const { user, perfisJogo } = usePerfil()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSiteAdmin, setIsSiteAdmin] = useState(false)

  useEffect(() => {
    if (isAuthRoute || isCleanRoute) return

    const originalOverflow = document.body.style.overflow
    if (mobileMenuOpen) document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mobileMenuOpen, isAuthRoute, isCleanRoute])
  const [isModerador, setIsModerador] = useState(false)
  const [isManager, setIsManager] = useState(false)

  useEffect(() => {
    if (isAuthRoute || isCleanRoute) return

    let ativo = true

    async function carregarPermissoes() {
      try {
        const uid = user?.id
        if (!uid) {
          if (!ativo) return
          setIsSiteAdmin(false)
          setIsModerador(false)
          setIsManager(false)
          return
        }

        const [siteAdminRes, moderadorRes] = await Promise.all([
          supabase.from('site_administradores').select('id').eq('user_id', uid).eq('ativo', true).limit(1),
          supabase.from('administradores_evento').select('id').eq('user_id', uid).eq('status', 'aprovado').limit(1),
        ])

        if (!ativo) return
        setIsSiteAdmin(Boolean(siteAdminRes.data && siteAdminRes.data.length > 0))
        setIsModerador(Boolean(moderadorRes.data && moderadorRes.data.length > 0))
      } catch {
        if (!ativo) return
        setIsSiteAdmin(false)
        setIsModerador(false)
      }
    }

    carregarPermissoes()
    return () => {
      ativo = false
    }
  }, [user, isAuthRoute, isCleanRoute])

  useEffect(() => {
    if (isAuthRoute || isCleanRoute) return

    let ativo = true

    async function carregarManager() {
      try {
        if (!user || !perfisJogo?.length) {
          if (ativo) setIsManager(false)
          return
        }

        const perfilIds = perfisJogo.map((perfil: any) => perfil.id).filter(Boolean)
        if (!perfilIds.length) {
          if (ativo) setIsManager(false)
          return
        }

        const { data } = await supabase
          .from('lines_jogadores')
          .select('id')
          .in('perfil_jogo_id', perfilIds)
          .limit(1)

        if (ativo) setIsManager(Boolean(data && data.length > 0))
      } catch {
        if (ativo) setIsManager(false)
      }
    }

    carregarManager()
    return () => {
      ativo = false
    }
  }, [user, perfisJogo, isAuthRoute, isCleanRoute])

  if (isAuthRoute) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white [color-scheme:dark]">
        {children}
      </div>
    )
  }

  if (isCleanRoute) {
    return <>{children}</>
  }

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 opacity-[0.55] [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:24px_24px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[220px] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.10),transparent_55%)]" />

      <div className="fixed inset-y-0 left-0 z-[110] hidden w-[280px] xl:block">
        <SidebarNavigation isSiteAdmin={isSiteAdmin} isModerador={isModerador} isManager={isManager} />
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[300] xl:hidden" role="dialog" aria-modal="true" aria-label="Menu lateral">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[88vw] overflow-hidden border-r border-white/10 bg-[#070b18] shadow-[20px_0_60px_rgba(2,6,23,0.45)]">
            <SidebarNavigation isSiteAdmin={isSiteAdmin} isModerador={isModerador} isManager={isManager} onNavigate={() => setMobileMenuOpen(false)} />
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute left-[min(292px,calc(88vw+12px))] top-4 flex h-10 w-10 items-center justify-center border border-white/20 bg-white/10 text-white backdrop-blur"
            aria-label="Fechar menu lateral"
          >
            <X size={19} />
          </button>
        </div>
      ) : null}

      <div className="relative xl:pl-[280px]">
        <TopHeader onOpenMenu={() => setMobileMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] px-3 pb-24 pt-4 md:px-5 md:pb-8 md:pt-5">
          {children}
        </main>
      </div>

      <PWAInstallPrompt />
      {!mobileMenuOpen ? <MobileBottomNavigation /> : null}
    </div>
  )
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="min-h-screen bg-[var(--dz-bg)] font-sans text-slate-950 selection:bg-blue-200 selection:text-slate-950">
        <PerfilProvider>
          <PWARegister />
          <AppChrome>{children}</AppChrome>
        </PerfilProvider>
      </body>
    </html>
  )
}
