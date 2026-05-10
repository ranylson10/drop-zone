'use client'

import { useState } from 'react'
import PlayerCard from '@/app/components/PlayerCard'

const tiers = ['SS', 'S', 'A', 'B', 'C', 'D', 'E'] as const

export default function CardPreviewPage() {
  const [tier, setTier] = useState<'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E'>('SS')
  const [variant, setVariant] = useState<'oficial' | 'avulso' | 'empty'>('oficial')
  const [name, setName] = useState('SIX')

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl gap-10 p-8">
        <div className="w-[340px] shrink-0 rounded-2xl border border-white/10 bg-[#0b1728] p-6">
          <div className="mb-6 text-2xl font-black">CARD CONFIG</div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Nome</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-[#111c2e] px-4 outline-none"
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Tier</div>
              <div className="grid grid-cols-4 gap-2">
                {tiers.map((item) => (
                  <button
                    key={item}
                    onClick={() => setTier(item)}
                    className={`h-11 rounded-xl border text-sm font-black ${
                      tier === item ? 'border-[#2563eb] bg-[#2563eb]' : 'border-white/10 bg-[#111c2e]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Tipo</div>
              <div className="space-y-2">
                {[
                  ['oficial', 'OFICIAL'],
                  ['avulso', 'AVULSO'],
                  ['empty', 'VAZIO']
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setVariant(value as any)}
                    className={`flex h-11 w-full items-center justify-center rounded-xl border text-sm font-black ${
                      variant === value ? 'border-[#2563eb] bg-[#2563eb]' : 'border-white/10 bg-[#111c2e]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,#17253b_0%,#07111f_55%)] p-10">
          <div className="w-[320px]">
            <PlayerCard name={name} tier={tier} variant={variant} number={1} />
          </div>
        </div>
      </div>
    </main>
  )
}
