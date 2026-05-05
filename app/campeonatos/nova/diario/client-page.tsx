'use client'

export const dynamic = 'force-dynamic'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PageInner() {
 const router = useRouter()
 const searchParams = useSearchParams()

 useEffect(() => {
 const qs = searchParams.toString()
 router.replace(`/campeonatos/diarios/criar${qs ? `?${qs}` : ''}`)
 }, [router, searchParams])

 return (
 <div className="flex min-h-screen items-center justify-center bg-white text-sm font-semibold uppercase tracking-[0.22em] text-[#142340]">
 Abrindo formulário do diário...
 </div>
 )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  )
}
