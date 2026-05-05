'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function labelStatus(status?: string) {
  const s = String(status || 'aberta')

  if (s === 'respondida') return 'Respondida'
  if (s === 'resolvida') return 'Resolvida'
  if (s === 'recusada') return 'Recusada'
  if (s === 'arquivada') return 'Arquivada'
  if (s === 'aguardando_resposta_usuario') return 'Aguardando usuário'
  if (s === 'aguardando_resposta_organizacao') return 'Aguardando organização'

  return 'Aberta'
}

function statusStyle(status?: string) {
  const s = String(status || 'aberta')

  if (s === 'resolvida') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (s === 'respondida') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (s === 'recusada') return 'bg-red-50 text-red-700 border-red-200'

  return 'bg-zinc-100 text-zinc-600 border-zinc-200'
}

export default function MinhasDenunciasPage() {
  const [denuncias, setDenuncias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user

    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('denuncias_campeonato')
      .select('*')
      .eq('denunciante_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
    }

    setDenuncias(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-6 text-[13px] text-zinc-500">
        Carregando denúncias...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      
      {/* HEADER */}
      <div className="mb-4 border border-zinc-200 bg-white p-4">
        <h1 className="text-[18px] font-semibold text-[#111827]">
          Minhas denúncias
        </h1>

        <p className="mt-1 text-[12px] text-zinc-500">
          Acompanhe status, respostas e histórico dos seus casos
        </p>
      </div>

      {/* LISTA VAZIA */}
      {denuncias.length === 0 && (
        <div className="border border-zinc-200 bg-white p-6 text-[13px] text-zinc-500">
          Nenhuma denúncia encontrada.
        </div>
      )}

      {/* LISTA */}
      <div className="space-y-3">
        {denuncias.map((d) => (
          <div
            key={d.id}
            className="border border-zinc-200 bg-white p-4 hover:bg-zinc-50 transition"
          >
            <div className="flex items-start justify-between gap-4">

              {/* INFO */}
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-[#111827]">
                  {d.titulo}
                </div>

                <div className="mt-1 line-clamp-2 text-[13px] text-zinc-600">
                  {d.descricao}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`border px-2 py-1 text-[10px] font-medium uppercase ${statusStyle(d.status)}`}
                  >
                    {labelStatus(d.status)}
                  </span>

                  <span className="text-[11px] text-zinc-400">
                    {d.created_at
                      ? new Date(d.created_at).toLocaleDateString('pt-BR')
                      : ''}
                  </span>
                </div>
              </div>

              {/* AÇÃO */}
              <Link
                href={`/transparencia/denuncia/${d.id}`}
                className="shrink-0 border border-zinc-200 px-3 py-2 text-[11px] font-medium uppercase text-[#2563eb] hover:bg-[#2563eb] hover:text-white transition"
              >
                Ver
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}