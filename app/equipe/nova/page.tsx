'use client'

import FormCriarEquipe from '@/app/components/FormCriarEquipe'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function NovaEquipePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')

  return (
    <main className="min-h-screen bg-[#f5f8fb] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 hover:text-blue-600"
        >
          <ChevronLeft size={16} /> Voltar
        </button>

        <FormCriarEquipe
          onSuccess={(equipe) => {
            if (redirectTo) {
              router.push(redirectTo)
              return
            }

            router.push(equipe?.id ? `/equipe/${equipe.id}` : '/equipe')
          }}
        />
      </div>
    </main>
  )
}
