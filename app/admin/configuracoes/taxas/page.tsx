
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TaxasCampeonatoPage() {
  const [dados, setDados] = useState<any[]>([])

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const { data } = await supabase
      .from('taxas_campeonato')
      .select('*')
      .order('tipo')

    setDados(data || [])
  }

  async function salvar(id: string, valor: number) {
    await supabase
      .from('taxas_campeonato')
      .update({ valor })
      .eq('tipo', id)

    carregar()
  }

  return (
    <div className="p-6 bg-[#f7f7f7] min-h-screen">
      <h1 className="text-xl font-bold mb-4">Taxas de Campeonatos</h1>

      <div className="bg-white border">
        {dados.map((d) => (
          <div key={d.tipo} className="flex items-center justify-between border-b p-3">
            <div className="font-medium">{d.tipo}</div>

            <input
              type="number"
              defaultValue={d.valor}
              onBlur={(e) => salvar(d.tipo, Number(e.target.value))}
              className="border px-2 py-1 w-24"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
