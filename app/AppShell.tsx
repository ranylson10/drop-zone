'use client'

import Navbar from './components/Navbar'
import ModeradorMatchToast from '@/app/components/ModeradorMatchToast'
import { PerfilProvider } from './contexts/PerfilContext'

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PerfilProvider>
      <div className="relative min-h-screen bg-[#f5f7fb] text-slate-950">
        <div className="pointer-events-none fixed inset-0 opacity-[0.55] [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="pointer-events-none fixed inset-x-0 top-0 h-[220px] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.10),transparent_55%)]" />

        <Navbar />

        <main className="relative mx-auto w-full max-w-[1500px] px-4 py-4 md:px-5 md:py-5">
          {children}
        </main>

        <ModeradorMatchToast />
      </div>
    </PerfilProvider>
  )
}
