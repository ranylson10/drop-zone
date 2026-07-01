'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Denuncia = {
  id: string
  titulo: string
  descricao: string
  status: string
  prioridade: string
  created_at: string
  denunciante_user_id: string
}

type Resposta = {
  id: string
  mensagem: string
  created_at: string
  autor_user_id: string
  tipo: string
}

export default function AdminDenunciasPage() {
  const [denuncias, setDenuncias] = useState<Denuncia[]>([])
  const [selected, setSelected] = useState<Denuncia | null>(null)
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    carregarDenuncias()
  }, [])

  async function carregarDenuncias() {
    setLoading(true)
    const { data } = await supabase
      .from('denuncias_campeonato')
      .select('*')
      .order('created_at', { ascending: false })

    setDenuncias(data || [])
    setLoading(false)
  }

  async function abrirDenuncia(d: Denuncia) {
    setSelected(d)

    const { data } = await supabase
      .from('denuncias_respostas')
      .select('*')
      .eq('denuncia_id', d.id)
      .order('created_at', { ascending: true })

    setRespostas(data || [])
  }

  async function responder() {
    if (!mensagem || !selected) return

    await supabase.rpc('admin_responder_denuncia', {
      p_denuncia_id: selected.id,
      p_mensagem: mensagem,
    })

    setMensagem('')
    abrirDenuncia(selected)
  }

  async function atualizarStatus(status: string) {
    if (!selected) return

    await supabase.rpc('admin_atualizar_denuncia_status', {
      p_denuncia_id: selected.id,
      p_status: status,
      p_mensagem: `Status alterado para ${status}`,
    })

    carregarDenuncias()
    abrirDenuncia(selected)
  }

  return (
    <div className="p-6 bg-[#f7f7f7] min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">Central de Denúncias</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-white border p-4">
          <h2 className="font-medium mb-3">Denúncias</h2>

          {loading && <p>Carregando...</p>}

          <div className="space-y-2 max-h-[600px] overflow-auto">
            {denuncias.map((d) => (
              <div
                key={d.id}
                onClick={() => abrirDenuncia(d)}
                className={`p-3 border cursor-pointer ${
                  selected?.id === d.id ? 'border-blue-500' : ''
                }`}
              >
                <p className="font-medium text-sm">{d.titulo}</p>
                <p className="text-xs text-gray-500">{d.status}</p>
                <p className="text-xs">{d.prioridade}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 bg-white border p-4 flex flex-col">
          {!selected && <p>Selecione uma denúncia</p>}

          {selected && (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  {selected.titulo}
                </h2>
                <p className="text-sm text-gray-500">
                  {selected.descricao}
                </p>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => atualizarStatus('resolvida')}
                  className="px-3 py-1 bg-green-500 text-white text-sm"
                >
                  Resolver
                </button>

                <button
                  onClick={() => atualizarStatus('recusada')}
                  className="px-3 py-1 bg-red-500 text-white text-sm"
                >
                  Recusar
                </button>

                <button
                  onClick={() => atualizarStatus('em_analise')}
                  className="px-3 py-1 bg-yellow-500 text-white text-sm"
                >
                  Em análise
                </button>
              </div>

              <div className="flex-1 overflow-auto border p-3 mb-4 space-y-2">
                {respostas.map((r) => (
                  <div key={r.id} className="text-sm">
                    <div className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div>{r.mensagem}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="flex-1 border px-2 py-1 text-sm"
                  placeholder="Responder..."
                />
                <button
                  onClick={responder}
                  className="px-3 bg-blue-600 text-white text-sm"
                >
                  Enviar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
