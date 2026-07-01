'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AdminTabs from '../../components/AdminTabs'

type TaxaCriacao = {
  tipo: string
  titulo: string
  valor: number | null
  ativo: boolean | null
  ordem: number | null
  updated_at?: string | null
}

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function numeroSeguro(value: unknown) {
  const n = Number(String(value ?? '0').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}

export default function TaxasCampeonatoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [autorizado, setAutorizado] = useState(false)
  const [dados, setDados] = useState<TaxaCriacao[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function carregar() {
    setLoading(true)
    setErro('')

    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user

    if (!user) {
      router.push('/login')
      return
    }

    const { data: admin } = await supabase
      .from('site_administradores')
      .select('id')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .limit(1)

    if (!admin || admin.length === 0) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    setAutorizado(true)

    const { data, error } = await supabase
      .from('campeonato_taxas_criacao')
      .select('tipo, titulo, valor, ativo, ordem, updated_at')
      .order('ordem', { ascending: true })

    if (error) {
      setErro(error.message)
      setDados([])
      setValores({})
    } else {
      const lista = (data || []) as TaxaCriacao[]
      setDados(lista)
      setValores(Object.fromEntries(lista.map((item) => [item.tipo, String(item.valor ?? 0)])))
    }

    setLoading(false)
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    carregar()
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps */

  async function salvar(item: TaxaCriacao) {
    setSalvando(item.tipo)
    setErro('')
    setSucesso('')

    const valor = numeroSeguro(valores[item.tipo])

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('campeonato_taxas_criacao')
      .update({
        valor,
        ativo: item.ativo !== false,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq('tipo', item.tipo)

    if (error) {
      setErro(error.message)
    } else {
      setSucesso(`Taxa de ${item.titulo} salva como ${moeda(valor)}.`)
      await carregar()
    }

    setSalvando(null)
  }

  async function alternarAtivo(item: TaxaCriacao) {
    const novoAtivo = !(item.ativo !== false)
    setDados((prev) => prev.map((row) => row.tipo === item.tipo ? { ...row, ativo: novoAtivo } : row))

    const { error } = await supabase
      .from('campeonato_taxas_criacao')
      .update({ ativo: novoAtivo, updated_at: new Date().toISOString() })
      .eq('tipo', item.tipo)

    if (error) {
      setErro(error.message)
      await carregar()
    }
  }

  const totalAtivo = useMemo(
    () => dados.filter((item) => item.ativo !== false).reduce((acc, item) => acc + numeroSeguro(valores[item.tipo] ?? item.valor), 0),
    [dados, valores],
  )

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#f7f7f7]"><Loader2 className="animate-spin text-[#2563eb]" size={42} /></div>
  }

  if (!autorizado) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="border border-red-200 bg-white p-8 text-center">
          <ShieldCheck className="mx-auto mb-4 text-red-500" size={42} />
          <h1 className="text-xl font-semibold uppercase text-[#142340]">Acesso restrito</h1>
          <p className="mt-3 text-sm text-zinc-500">Seu usuário não está cadastrado como administrador ativo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-[1200px] space-y-6 p-4 md:p-6">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">Configuração financeira</p>
            <h1 className="mt-2 text-2xl font-semibold uppercase text-[#142340] md:text-3xl">Taxas de criação</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">
              Defina o valor da taxa de criação para cada tipo de campeonato. A cobrança deve ser paga por PIX e também é validada no banco por trigger, não apenas no frontend.
            </p>
          </div>
          <AdminTabs />
        </div>

        {erro && <div className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{erro}</div>}
        {sucesso && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{sucesso}</div>}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Tipos configurados</p>
            <p className="mt-2 text-3xl font-semibold text-[#142340]">{dados.length}</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Tipos ativos</p>
            <p className="mt-2 text-3xl font-semibold text-[#142340]">{dados.filter((item) => item.ativo !== false).length}</p>
          </div>
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Soma das taxas ativas</p>
            <p className="mt-2 text-3xl font-semibold text-[#142340]">{moeda(totalAtivo)}</p>
          </div>
        </section>

        <section className="overflow-hidden border border-zinc-200 bg-white">
          <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <div className="col-span-4">Tipo</div>
            <div className="col-span-3">Valor</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3 text-right">Ação</div>
          </div>

          {dados.map((item) => {
            const ativo = item.ativo !== false
            const valor = numeroSeguro(valores[item.tipo] ?? item.valor)
            return (
              <div key={item.tipo} className="grid grid-cols-12 items-center gap-3 border-b border-zinc-100 px-4 py-4 last:border-b-0">
                <div className="col-span-12 md:col-span-4">
                  <p className="text-sm font-semibold uppercase text-[#142340]">{item.titulo}</p>
                  <p className="mt-1 text-xs text-zinc-400">Código: {item.tipo}</p>
                </div>

                <div className="col-span-12 md:col-span-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={valores[item.tipo] ?? '0'}
                    onChange={(e) => setValores((prev) => ({ ...prev, [item.tipo]: e.target.value }))}
                    className="h-11 w-full border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-[#2563eb]"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">Atual: {moeda(valor)}</p>
                </div>

                <div className="col-span-6 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => alternarAtivo(item)}
                    className={[
                      'h-10 w-full border px-3 text-[10px] font-bold uppercase tracking-[0.18em]',
                      ativo
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-500',
                    ].join(' ')}
                  >
                    {ativo ? 'Ativa' : 'Inativa'}
                  </button>
                </div>

                <div className="col-span-6 flex justify-end md:col-span-3">
                  <button
                    type="button"
                    disabled={salvando === item.tipo}
                    onClick={() => salvar(item)}
                    className="inline-flex h-11 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white disabled:opacity-60"
                  >
                    {salvando === item.tipo ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    Salvar
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
