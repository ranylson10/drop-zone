'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getSafeRedirectTo } from '@/lib/authRedirect'
import { ensureUserProfile } from '@/lib/profileBootstrap'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Finalizando login seguro...')

  useEffect(() => {
    let ativo = true

    async function finalizarLogin() {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const redirectSalvo = window.localStorage.getItem('dropzone_auth_redirect')
        const redirect = getSafeRedirectTo(params.get('redirect') || redirectSalvo, '/feed')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }

        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        if (data.user) {
          const meta = data.user.user_metadata || {}
          const username = meta.username || meta.nome_exibicao || meta.nome || meta.name || meta.full_name || data.user.email?.split('@')[0]
          const nomeExibicao = meta.nome_exibicao || meta.nome || meta.name || meta.full_name || username
          await ensureUserProfile({ userId: data.user.id, email: data.user.email, username, nomeExibicao })
        }

        if (!ativo) return
        window.localStorage.removeItem('dropzone_auth_redirect')
        router.replace(redirect)
        router.refresh()
      } catch (err: any) {
        if (!ativo) return
        setMessage(err?.message || 'Nao foi possivel finalizar o login social.')
        window.setTimeout(() => router.replace('/login'), 1800)
      }
    }

    finalizarLogin()
    return () => { ativo = false }
  }, [router])

  return (
    <section className="flex min-h-screen items-center justify-center bg-[#111827] px-4 text-white">
      <div className="rounded-3xl border border-white/15 bg-white/10 p-8 text-center shadow-2xl">
        <Loader2 className="mx-auto mb-4 animate-spin" size={26} />
        <div className="text-xs font-black uppercase tracking-[0.18em]">{message}</div>
      </div>
    </section>
  )
}
