'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Navbar from './components/Navbar'
import SidebarNavigation, { MobileBottomNavigation } from './components/SidebarNavigation'
import { PerfilProvider } from './contexts/PerfilContext'

const AUTH_ROUTES = ['/login', '/cadastro', '/recuperar', '/confirmar', '/redefinir-senha']

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname() || ''
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  const isCleanRoute = pathname.startsWith('/escala/') || pathname === '/stream' || pathname.startsWith('/stream/')

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    if (mobileMenuOpen) document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mobileMenuOpen])

  if (isAuthRoute) {
    return (
      <PerfilProvider>
        <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white [color-scheme:dark]">
          {children}
        </div>
      </PerfilProvider>
    )
  }

  if (isCleanRoute) {
    return <PerfilProvider>{children}</PerfilProvider>
  }

  return (
    <PerfilProvider>
      <div className="relative min-h-screen bg-[#f5f7fb] text-slate-950">
        <div className="pointer-events-none fixed inset-0 opacity-[0.55] [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="pointer-events-none fixed inset-x-0 top-0 h-[220px] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.10),transparent_55%)]" />

        <div className="fixed inset-y-0 left-0 z-[110] hidden w-[280px] xl:block">
          <SidebarNavigation />
        </div>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-[300] xl:hidden" role="dialog" aria-modal="true" aria-label="Menu lateral">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[280px] max-w-[88vw] overflow-hidden border-r border-white/10 bg-[#070b18] shadow-[20px_0_60px_rgba(2,6,23,0.45)]">
              <SidebarNavigation onNavigate={() => setMobileMenuOpen(false)} />
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
          <Navbar onOpenMenu={() => setMobileMenuOpen(true)} />

          <main className="relative mx-auto w-full max-w-[1500px] px-4 pb-24 pt-4 md:px-5 md:pb-5 md:pt-5">
            {children}
          </main>
        </div>

        {!mobileMenuOpen ? <MobileBottomNavigation /> : null}
      </div>
    </PerfilProvider>
  )
}
