'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Bell, ChevronRight, CircleUserRound, CreditCard, Gamepad2, Home, LogOut, Menu, Rss, Shield, Trophy, UserRound, Users, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DropZoneLogo } from '@/app/components/DropZoneLogo'

type MobileShellProps = {
  title?: string
  subtitle?: string
  children: ReactNode
}

function dinheiro(valor: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

const mainLinks = [
  { href: '/m', label: 'Início', icon: Home },
  { href: '/m/feed', label: 'Feed', icon: Rss },
  { href: '/m/equipe', label: 'Equipe', icon: Users },
  { href: '/m/jogadores', label: 'Jogadores', icon: UserRound },
  { href: '/m/campeonatos', label: 'Campeonatos', icon: Trophy },
  { href: '/m/menu', label: 'Menu', icon: Menu },
]


function MobileBrandMark({ size = 'sm', animated = false }: { size?: 'sm' | 'lg'; animated?: boolean }) {
  const box = size === 'lg' ? 'h-24 w-24' : 'h-11 w-11'
  const logoSize = size === 'lg' ? 'md' : 'sm'
  return (
    <div className={`${box} relative grid shrink-0 place-items-center overflow-hidden border border-slate-200 bg-white`}>
      <DropZoneLogo size={logoSize as any} animated={animated} />
    </div>
  )
}

function MobileSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 1350)
    return () => window.clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-white">
      <style jsx>{`
        @keyframes dzEnter {
          0% { opacity: 0; transform: translateY(18px) scale(.82); filter: blur(8px); }
          55% { opacity: 1; transform: translateY(0) scale(1.04); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes dzLine {
          0% { transform: scaleX(0); opacity: .15; }
          100% { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
      <div className="flex flex-col items-center" style={{ animation: 'dzEnter 900ms cubic-bezier(.2,.9,.2,1) both' }}>
        <MobileBrandMark size="lg" animated />
        <h1 className="mt-4 text-2xl font-black uppercase tracking-[-0.06em] text-slate-950">Drop Zone</h1>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-blue-600">Mobile competitivo</p>
        <div className="mt-5 h-[3px] w-32 origin-left bg-blue-600" style={{ animation: 'dzLine 850ms ease 250ms both' }} />
      </div>
    </div>
  )
}

const menuGroups = [
  {
    title: 'Conta e perfil',
    items: [
      { href: '/m/perfil-jogo', label: 'Perfil de jogo', desc: 'Nick, ID, função e plataforma', icon: Gamepad2 },
      { href: '/perfil', label: 'Perfil completo', desc: 'Abrir painel avançado', icon: CircleUserRound },
      { href: '/m/login', label: 'Entrar em outra conta', desc: 'Login e acesso', icon: Shield },
    ],
  },
  {
    title: 'Equipe',
    items: [
      { href: '/m/equipe', label: 'Minha equipe', desc: 'Editar dados e elenco', icon: Users },
      { href: '/m/jogadores', label: 'Jogadores', desc: 'Cadastrar e organizar elenco', icon: UserRound },
      { href: '/m/lines', label: 'Lines', desc: 'Titulares, reservas e configuração', icon: Gamepad2 },
      { href: '/equipe', label: 'Equipe avançado', desc: 'Abrir painel completo', icon: ChevronRight },
    ],
  },
  {
    title: 'Competitivo',
    items: [
      { href: '/m/feed', label: 'Feed', desc: 'Postagens da comunidade', icon: Rss },
      { href: '/m/campeonatos', label: 'Campeonatos', desc: 'Inscrição rápida pelo celular', icon: Trophy },
      { href: '/apostados', label: 'Apostados', desc: 'Filas e confrontos', icon: Trophy },
      { href: '/moderadores', label: 'Moderação', desc: 'Área avançada', icon: Shield },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { href: '/m/carteira', label: 'Carteira mobile', desc: 'Saldo, PIX e histórico', icon: Wallet },
      { href: '/carteira', label: 'Carteira completa', desc: 'KYC, saques e comprovantes', icon: CreditCard },
    ],
  },
]

export function MobileShell({ title = 'Drop Zone', subtitle = 'LEALT Mobile', children }: MobileShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [saldo, setSaldo] = useState(0)
  const [userName, setUserName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('dropzone_mobile_splash_seen')) {
      sessionStorage.setItem('dropzone_mobile_splash_seen', '1')
      setShowSplash(true)
    }
  }, [])

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!ativo || !user) return
      setUserName(user.user_metadata?.username || user.user_metadata?.name || user.email?.split('@')[0] || 'Perfil')
      setAvatarUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture || null)

      const { data: perfilData } = await supabase
        .from('profiles')
        .select('nome_exibicao, username, foto_url')
        .eq('id', user.id)
        .maybeSingle()

      if (ativo && perfilData) {
        const perfil = perfilData as any
        setUserName(perfil.nome_exibicao || perfil.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Perfil')
        setAvatarUrl(perfil.foto_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null)
      }

      const { data } = await supabase.from('wallet_saldo').select('saldo').eq('user_id', user.id).maybeSingle()
      if (ativo && data) setSaldo(Number((data as any).saldo || 0))
    }
    carregar()
    return () => { ativo = false }
  }, [])

  const isAuthPage = useMemo(() => pathname?.startsWith('/m/login') || pathname?.startsWith('/m/cadastro') || pathname?.startsWith('/m/recuperar-senha'), [pathname])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/m/login')
    router.refresh()
  }

  return (
    <div
      data-lealt-mobile="light"
      className="min-h-screen bg-[#f8fafc] pb-24 text-[#0f172a]"
      style={{ colorScheme: 'light' }}
    >
      <style jsx global>{`
        html, body { color-scheme: light !important; background: #f8fafc !important; }
        body { color: #0f172a !important; }
        [data-lealt-mobile='light'], [data-lealt-mobile='light'] * { forced-color-adjust: none; }
        [data-lealt-mobile='light'] input, [data-lealt-mobile='light'] textarea, [data-lealt-mobile='light'] select { background: #ffffff !important; color: #0f172a !important; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 opacity-[0.55] [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:22px_22px]" />

      {showSplash && <MobileSplash onDone={() => setShowSplash(false)} />}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/m" className="flex min-w-0 items-center gap-2">
            <MobileBrandMark />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-black uppercase leading-none tracking-[-0.02em]">{title}</p>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{subtitle}</p>
            </div>
          </Link>

          {!isAuthPage && (
            <div className="flex items-center gap-2">
              <Link href="/m/perfil-jogo" className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-50" aria-label="Perfil">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={17} className="text-slate-500" />}
              </Link>
              <Link href="/m/carteira" className="border border-blue-200 bg-blue-50 px-2 py-1 text-right">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-blue-600">Saldo</p>
                <p className="text-[11px] font-black text-slate-950">{dinheiro(saldo)}</p>
              </Link>
              <button className="grid h-9 w-9 place-items-center border border-slate-200 bg-white text-slate-600">
                <Bell size={16} />
              </button>
              <button onClick={() => setMenuOpen(true)} className="grid h-9 w-9 place-items-center border border-slate-200 bg-white text-slate-700">
                <Menu size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[520px] px-4 py-3">{children}</main>

      {!isAuthPage && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
          <div className="mx-auto grid h-16 max-w-[520px] grid-cols-6">
            {mainLinks.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || (item.href !== '/m' && pathname?.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href} onClick={(e) => { if (item.href === '/m/menu') { e.preventDefault(); setMenuOpen(true) } }} className={['flex flex-col items-center justify-center gap-1 border-l border-slate-100 px-0.5 text-[8px] font-black uppercase tracking-[0.02em]', active ? 'bg-blue-50 text-blue-600' : 'text-slate-500'].join(' ')}>
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40" onClick={() => setMenuOpen(false)}>
          <aside className="ml-auto h-full w-[86vw] max-w-[390px] overflow-y-auto border-l border-slate-200 bg-white p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Menu mobile</p>
                <h2 className="mt-1 text-lg font-black uppercase tracking-[-0.04em]">{userName || 'Drop Zone'}</h2>
              </div>
              <button onClick={() => setMenuOpen(false)} className="border border-slate-200 px-3 py-2 text-[11px] font-black uppercase text-slate-600">Fechar</button>
            </div>

            <div className="mt-3 space-y-4">
              {menuGroups.map((group) => (
                <section key={group.title}>
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{group.title}</h3>
                  <div className="divide-y divide-slate-100 border border-slate-200 bg-white">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 p-3 active:bg-slate-50">
                          <div className="grid h-10 w-10 shrink-0 place-items-center border border-slate-200 bg-slate-50 text-blue-600"><Icon size={18} /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-black uppercase text-slate-950">{item.label}</p>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{item.desc}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-400" />
                        </Link>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>

            <button onClick={sair} className="mt-4 flex w-full items-center justify-center gap-2 border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-red-700">
              <LogOut size={16} /> Sair da conta
            </button>
          </aside>
        </div>
      )}
    </div>
  )
}

export function MobileCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${className}`}>{children}</div>
}

export function MobileSectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-[14px] font-black uppercase tracking-[-0.02em] text-slate-950">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">{subtitle}</p>}
    </div>
  )
}

export function MobileAction({ href, label, desc, icon: Icon }: { href: string; label: string; desc?: string; icon: any }) {
  return (
    <Link href={href} className="flex items-center gap-3 border border-slate-200 bg-white p-3.5 active:bg-slate-50">
      <div className="grid h-10 w-10 shrink-0 place-items-center border border-blue-200 bg-blue-50 text-blue-600"><Icon size={18} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-black uppercase text-slate-950">{label}</p>
        {desc && <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{desc}</p>}
      </div>
      <ChevronRight size={16} className="text-slate-400" />
    </Link>
  )
}
