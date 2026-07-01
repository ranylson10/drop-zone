'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Deposito = {
  id: string
  user_id: string
  valor: number
  status: string
  provider_payment_id?: string | null
  provider_status?: string | null
  created_at: string
  aprovado_em?: string | null
}

export default function AdminFinanceiroDepositosPage() {
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    carregar()
  }, [filtro])

  async function carregar() {
    let q = supabase
      .from('wallet_depositos_pix')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filtro !== 'todos') q = q.eq('status', filtro)

    const { data } = await q
    setDepositos((data || []) as Deposito[])
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Admin financeiro</div>
          <h1 className="text-2xl font-bold">Depósitos Pix</h1>
        </div>

        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="border bg-white px-3 py-2 text-sm">
          <option value="todos">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="recusado">Recusado</option>
          <option value="cancelado">Cancelado</option>
          <option value="expirado">Expirado</option>
        </select>
      </div>

      <div className="border bg-white">
        <div className="grid grid-cols-[1fr_120px_120px_180px_180px] border-b bg-zinc-50 p-3 text-xs font-bold uppercase text-zinc-500">
          <div>Usuário / Depósito</div>
          <div>Valor</div>
          <div>Status</div>
          <div>Mercado Pago</div>
          <div>Data</div>
        </div>

        {depositos.map((d) => (
          <div key={d.id} className="grid grid-cols-[1fr_120px_120px_180px_180px] border-b p-3 text-sm">
            <div>
              <div className="font-semibold">{d.user_id}</div>
              <div className="text-xs text-zinc-400">{d.id}</div>
            </div>
            <div className="font-bold">R$ {Number(d.valor).toFixed(2)}</div>
            <div>
              <span className="border px-2 py-1 text-xs font-bold uppercase">{d.status}</span>
            </div>
            <div>
              <div>{d.provider_payment_id || '-'}</div>
              <div className="text-xs text-zinc-400">{d.provider_status || '-'}</div>
            </div>
            <div>{new Date(d.created_at).toLocaleString('pt-BR')}</div>
          </div>
        ))}

        {depositos.length === 0 && <div className="p-4 text-sm text-zinc-500">Nenhum depósito encontrado.</div>}
      </div>
    </div>
  )
}
