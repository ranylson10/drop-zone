'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function Page() {
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
