import Link from 'next/link'
import ConfrontosPageClient from './ConfrontosPageClient'

export default function Page() {
 return (
 <div className="min-h-screen bg-[#f6f7f8]">
 <div className="border-b border-zinc-200 bg-white">
 <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-10 py-4">
 <div className="flex flex-wrap gap-3">
 <Link
 href="/confrontos"
 className="h-11 px-5 bg-white text-[#142340] font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center justify-center hover:bg-[#2563eb] transition-colors"
 >
 Lista de confrontos
 </Link>

 <Link
 href="/confrontos/nova"
 className="h-11 px-5 border border-zinc-300 bg-white text-zinc-800 font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center justify-center hover:bg-zinc-50 transition-colors"
 >
 Novo confronto
 </Link>

 <Link
 href="/confrontos/ranking"
 className="h-11 px-5 border border-zinc-300 bg-white text-zinc-800 font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center justify-center hover:bg-zinc-50 transition-colors"
 >
 Ranking
 </Link>

 <Link
 href="/confrontos/admin"
 className="h-11 px-5 border border-zinc-300 bg-white text-zinc-800 font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center justify-center hover:bg-zinc-50 transition-colors"
 >
 Área do admin
 </Link>

 <Link
 href="/carteira"
 className="h-11 px-5 border border-zinc-300 bg-white text-zinc-800 font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center justify-center hover:bg-zinc-50 transition-colors"
 >
 Carteira
 </Link>
 </div>
 </div>
 </div>

 <ConfrontosPageClient />
 </div>
 )
}