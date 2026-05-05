'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Swords, Trophy, ListOrdered } from 'lucide-react'

export default function Page() {
 const router = useRouter()
 const searchParams = useSearchParams()
 const produtoraId = searchParams.get('produtoraId')

 function abrir(href: string) {
 const extra = produtoraId ? `&produtoraId=${produtoraId}` : ''
 router.push(`${href}${extra}`)
 }

 return (
 <div className="min-h-screen bg-white text-[#142340]">
 <div className="mx-auto max-w-6xl px-6 py-16">
 <div className="mb-10">
 <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2563eb]/25 bg-[#2563eb]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#2563eb]">
 <Swords size={12} /> Xtreino
 </div>
 <h1 className="text-4xl font-semibold uppercase md:text-6xl">Criar xtreino</h1>
 <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-zinc-600">
 Escolhe o formato do treino e a gente abre o formulário certo.
 </p>
 </div>

 <div className="grid gap-6 md:grid-cols-3">
 <button onClick={() => abrir('/campeonatos/diarios/criar?xtreino=1&modo=jogo_unico')} className="rounded-[28px] border border-zinc-200 bg-white/[0.04] p-8 text-left transition hover:border-[#2563eb]/40 hover:bg-white/[0.06]">
 <div className="mb-5 flex h-14 w-14 items-center justify-center border border-zinc-200 bg-white/20 text-[#2563eb]"><Trophy size={24} /></div>
 <div className="text-2xl font-semibold">Jogo Único</div>
 <div className="mt-2 text-sm text-zinc-500">Usa o formulário real do diário com horários e slots.</div>
 </button>

 <button onClick={() => abrir('/campeonatos/nova/copa?xtreino=1&modo=mata_mata')} className="rounded-[28px] border border-zinc-200 bg-white/[0.04] p-8 text-left transition hover:border-[#2563eb]/40 hover:bg-white/[0.06]">
 <div className="mb-5 flex h-14 w-14 items-center justify-center border border-zinc-200 bg-white/20 text-[#2563eb]"><Swords size={24} /></div>
 <div className="text-2xl font-semibold">Mata-Mata</div>
 <div className="mt-2 text-sm text-zinc-500">Usa o formulário da copa e salva como xtreino mata-mata.</div>
 </button>

 <button onClick={() => abrir('/campeonatos/nova/liga?xtreino=1&modo=pontos_corridos')} className="rounded-[28px] border border-zinc-200 bg-white/[0.04] p-8 text-left transition hover:border-[#2563eb]/40 hover:bg-white/[0.06]">
 <div className="mb-5 flex h-14 w-14 items-center justify-center border border-zinc-200 bg-white/20 text-[#2563eb]"><ListOrdered size={24} /></div>
 <div className="text-2xl font-semibold">Pontos Corridos</div>
 <div className="mt-2 text-sm text-zinc-500">Usa o formulário da liga e salva como xtreino pontos corridos.</div>
 </button>
 </div>
 </div>
 </div>
 )
}
