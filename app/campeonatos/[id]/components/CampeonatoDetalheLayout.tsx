'use client'

import React from 'react'
import { ChevronLeft, Settings } from 'lucide-react'
import { getTipoVisual } from '@/lib/getTipoVisual'

type Aba = {
  id: string
  label: string
  icon?: React.ReactNode
}

type Stat = {
  label: string
  value: React.ReactNode
  highlight?: boolean
}

type CampeonatoDetalheLayoutProps = {
  tipo?: string | null
  nome?: string | null
  logoUrl?: string | null
  bannerUrl?: string | null
  stats?: Stat[]
  abas: Aba[]
  abaAtiva: string
  onAbaChange: (id: string) => void
  onVoltar?: () => void
  onConfigurar?: () => void
  acoesTopo?: React.ReactNode
  compraVaga?: React.ReactNode
  children: React.ReactNode
}

export default function CampeonatoDetalheLayout({
  tipo,
  nome,
  logoUrl,
  bannerUrl,
  stats = [],
  abas,
  abaAtiva,
  onAbaChange,
  onVoltar,
  onConfigurar,
  acoesTopo,
  compraVaga,
  children,
}: CampeonatoDetalheLayoutProps) {
  const visual = getTipoVisual(tipo)

  return (
    <div className={`mx-auto w-full max-w-[1180px] overflow-hidden border border-zinc-200 border-l-4 bg-white ${visual.borderStrong}`}>
      <div className="flex flex-col border-b border-zinc-200 bg-white md:min-h-[350px] md:flex-row">
        <div className="relative h-[210px] w-full shrink-0 overflow-hidden bg-zinc-100 md:h-auto md:w-[300px] md:border-r md:border-zinc-200">
          {bannerUrl ? (
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center ${visual.bgSoft}`}>
              <span className={`text-[11px] font-medium uppercase tracking-wide ${visual.text}`}>{visual.label}</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between p-4 md:p-6 lg:p-8">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={onVoltar}
              className="inline-flex h-8 items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400 transition hover:text-[#142340]"
            >
              <ChevronLeft size={14} /> Voltar
            </button>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {acoesTopo}
              {onConfigurar && (
                <button
                  type="button"
                  onClick={onConfigurar}
                  className="inline-flex h-8 items-center gap-2 border border-zinc-200 bg-white px-3 text-[10px] font-medium uppercase tracking-wide text-[#142340] transition hover:border-[#2563eb] hover:text-[#2563eb]"
                >
                  <Settings size={13} /> Configurações
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className={`mb-2 inline-flex items-center px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${visual.badge}`}>
              {visual.label}
            </div>
            <h1 className={`break-words text-[32px] font-semibold uppercase leading-none tracking-tight md:text-[52px] ${visual.text}`}>
              {nome || 'Campeonato'}
            </h1>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-zinc-200 bg-white p-1">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className={`text-[11px] font-semibold uppercase ${visual.text}`}>{visual.label.slice(0, 2)}</span>
              )}
            </div>

            <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="min-w-0 border-l border-zinc-200 pl-3 first:border-l-0 first:pl-0">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{stat.label}</div>
                  <div className={`mt-1 truncate text-[16px] font-semibold ${stat.highlight ? 'text-emerald-600' : 'text-[#142340]'}`}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {compraVaga && <div className="mt-5">{compraVaga}</div>}
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-zinc-200 bg-white no-scrollbar">
        {abas.map((aba) => {
          const active = abaAtiva === aba.id
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => onAbaChange(aba.id)}
              className={`inline-flex h-11 shrink-0 items-center gap-2 border-r border-zinc-200 px-4 text-[12px] font-medium transition ${
                active ? `${visual.bg} ${visual.text}` : 'text-zinc-500 hover:bg-zinc-50 hover:text-[#142340]'
              }`}
            >
              {aba.icon}
              {aba.label}
            </button>
          )
        })}
      </div>

      <main className="min-h-[50vh] bg-white p-3 md:p-4">{children}</main>
    </div>
  )
}
