'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Copy, FileText, Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Transacao = {
  id: string
  user_id: string
  tipo: string | null
  valor: number | null
  status: string | null
  descricao: string | null
  referencia_tipo: string | null
  referencia_id: string | null
  payload: any
  created_at: string | null
}

function moeda(value: unknown) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataHora(value: unknown) {
  if (!value) return 'N/I'
  return new Date(String(value)).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

function Linha({ label, value }: { label: string; value: any }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-bold text-slate-900">{value || '-'}</div>
    </div>
  )
}

export default function ComprovanteCarteiraPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = String(params?.id || '')

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [transacao, setTransacao] = useState<Transacao | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function carregar() {
    try {
      setLoading(true)
      setErro(null)

      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('wallet_transacoes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error('Comprovante não encontrado.')

      setTransacao(data as Transacao)
    } catch (error: any) {
      setErro(error?.message || 'Erro ao carregar comprovante.')
    } finally {
      setLoading(false)
    }
  }

  const payload = useMemo(() => transacao?.payload || {}, [transacao])
  const txid = payload?.txid || transacao?.id
  const valorBruto = payload?.valor_bruto ?? transacao?.valor ?? 0

  async function copiar() {
    await navigator.clipboard.writeText(String(txid || ''))
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={38} />
      </div>
    )
  }

  if (erro || !transacao) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Link href="/carteira" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <div className="mt-6 border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">{erro}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/carteira" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          <ArrowLeft size={16} /> Voltar para carteira
        </Link>

        <section className="mt-5 overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-emerald-50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 border border-emerald-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  <CheckCircle2 size={16} /> Pagamento confirmado
                </div>
                <h1 className="mt-4 text-2xl font-black uppercase text-slate-950">Comprovante de pagamento</h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">Drop Zone • Carteira digital</p>
              </div>
              <FileText className="text-emerald-700" size={42} />
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-3">
            <div className="border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Valor</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{moeda(valorBruto)}</div>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Status</div>
              <div className="mt-2 text-lg font-black uppercase text-emerald-700">{String(transacao.status || 'pago')}</div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="border border-slate-200 bg-white p-5">
              <Linha label="Descrição" value={transacao.descricao || payload?.titulo} />
              <Linha label="Data e hora" value={dataHora(payload?.pago_em || transacao.created_at)} />
              <Linha label="Tipo" value={payload?.tipo || transacao.referencia_tipo || transacao.tipo} />
              <Linha label="Campeonato" value={payload?.campeonato_nome || payload?.campeonato_id || transacao.referencia_id} />
              <Linha label="Valor do site" value={payload?.valor_site !== undefined ? moeda(payload.valor_site) : '-'} />
              <Linha label="Valor da organização" value={payload?.valor_organizacao !== undefined ? moeda(payload.valor_organizacao) : '-'} />
              <Linha label="Valor da premiação" value={payload?.valor_premiacao !== undefined ? moeda(payload.valor_premiacao) : '-'} />

              <div className="pt-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Código do comprovante / TXID</div>
                <button onClick={copiar} className="mt-2 flex w-full items-center justify-between gap-3 border border-slate-200 bg-slate-50 p-3 text-left text-xs font-black text-slate-700">
                  <span className="break-all">{txid}</span>
                  <Copy size={16} />
                </button>
                {copiado ? <p className="mt-2 text-xs font-bold text-emerald-700">Copiado.</p> : null}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border border-blue-100 bg-blue-50 p-4 text-xs font-bold text-blue-900">
              <ShieldCheck size={18} />
              Este comprovante foi gerado automaticamente pela carteira Drop Zone.
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
