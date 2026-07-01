'use client'

import { Suspense, useEffect, useState } from 'react'
import FormCriarEquipe from '@/app/components/FormCriarEquipe'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function NovaEquipeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const [carregandoLimite, setCarregandoLimite] = useState(true)
  const [podeCriarEquipe, setPodeCriarEquipe] = useState(false)

  useEffect(() => {
    let ativo = true

    async function carregarLimite() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(`/equipe/nova${redirectTo ? `?redirect=${redirectTo}` : ''}`)}`)
        return
      }

      const { count } = await supabase
        .from('equipes')
        .select('id', { count: 'exact', head: true })
        .eq('criado_por', user.id)

      if (ativo) {
        setPodeCriarEquipe(Number(count || 0) < 2)
        setCarregandoLimite(false)
      }
    }

    carregarLimite()

    return () => {
      ativo = false
    }
  }, [redirectTo, router])

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

        {carregandoLimite ? (
          <div className="inline-flex items-center gap-2 border border-slate-200 bg-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
            <Loader2 size={16} className="animate-spin" /> Verificando limite
          </div>
        ) : podeCriarEquipe ? (
          <FormCriarEquipe
            onSuccess={(equipe) => {
              if (redirectTo) {
                router.push(redirectTo)
                return
              }

              router.push(equipe?.id ? `/equipe/${equipe.id}` : '/equipe')
            }}
          />
        ) : (
          <div className="border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Organizacao</div>
            <h1 className="mt-2 text-xl font-black uppercase">Limite de equipes atingido</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Cada usuario pode criar ate 2 equipes. Use a central de equipes para gerenciar as equipes existentes.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function NovaEquipePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#f5f8fb] px-4 text-slate-950">
          <div className="inline-flex items-center gap-2 border border-slate-200 bg-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
            <Loader2 size={16} className="animate-spin" /> Carregando formulário
          </div>
        </main>
      }
    >
      <NovaEquipeContent />
    </Suspense>
  )
}
