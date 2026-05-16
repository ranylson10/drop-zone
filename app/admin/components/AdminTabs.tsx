'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Database,
  FileSearch,
  Gavel,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react'

const tabs = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/denuncias', label: 'Denúncias', icon: Gavel },
  { href: '/admin/antifraude', label: 'Antifraude', icon: AlertTriangle },
  { href: '/admin/auditoria', label: 'Auditoria', icon: FileSearch },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/diagnostico', label: 'Diagnóstico', icon: Activity },
  { href: '/admin/produtoras', label: 'Produtoras', icon: ShieldCheck },
  { href: '/admin/administradores', label: 'Admins', icon: Database },
  { href: '/admin/moderacao', label: 'Moderação', icon: BarChart3 },
  { href: '/admin/configuracoes/taxas', label: 'Taxas', icon: CircleDollarSign },
]

export default function AdminTabs() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const ativo = pathname === tab.href || pathname.startsWith(`${tab.href}/`)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'inline-flex items-center gap-2 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition',
              ativo
                ? 'border-[#2563eb] bg-[#2563eb] text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-[#2563eb] hover:text-[#142340]',
            ].join(' ')}
          >
            <Icon size={14} />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
