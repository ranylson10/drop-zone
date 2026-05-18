'use client'

export const dynamic = 'force-dynamic'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(`/campeonatos/nova/diario${qs ? `?${qs}` : ''}`)
  }, [router, searchParams])

  return (
    <div className="grid min-h-screen place-items-center bg-[#f7f7f7] text-[11px] font-black uppercase tracking-[0.22em] text-[#2563eb]">
      Abrindo formulário oficial...
    </div>
  )
}

export default function ClientPage() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  )
}
