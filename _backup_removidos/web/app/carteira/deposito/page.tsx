'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Banknote, Copy, Loader2, RefreshCcw, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Saldo = {
  saldo: number
  saldo_retido: number
}

type WalletKyc = {
  status?: string | null
}

type Deposito = {
  id: string
  valor: number
  status: string
  provider?: string | null
  provider_payment_id?: string | null
  qr_code?: string | null
  qr_code_base64?: string | null
  ticket_url?: string | null
  created_at: string
}

function dinheiro(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function dataHora(valor?: string | null) {
  if (!valor) return 'N/I'
  return new Date(valor).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function normalizarStatus(status?: string | null) {
  return String(status || 'pendente').replaceAll('_', ' ').toUpperCase()
}

function statusClasse(status?: string | null) {
  const value = String(status || '').toLowerCase()

  if (['approved', 'aprovado', 'pago', 'concluido', 'concluído'].includes(value)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (['cancelado', 'cancelled', 'rejected', 'recusado', 'falhou'].includes(value)) {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export default function DepositoCarteiraPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [gerandoPix, setGerandoPix] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [valor, setValor] = useState('10')
  const [saldo, setSaldo] = useState<Saldo>({ saldo: 0, saldo_retido: 0 })
  const [kyc, setKyc] = useState<WalletKyc | null>(null)
  const [depositoAtual, setDepositoAtual] = useState<any>(null)
  const [depositos, setDepositos] = useState<Deposito[]>([])

  const carteiraVerificada = kyc?.status === 'verificada'

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    try {
      setErro(null)
      setLoading(true)

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const user = userData?.user
      if (!user) {
        router.push('/login')
        return
      }

      await supabase.rpc('lealt_garantir_wallet', { p_user_id: user.id })

      const [saldoRes, kycRes, depsRes] = await Promise.all([
        supabase.from('wallet_saldo').select('saldo, saldo_retido').eq('user_id', user.id).maybeSingle(),
        supabase.from('wallet_kyc').select('status').eq('user_id', user.id).maybeSingle(),
        supabase.from('wallet_depositos_pix').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])

      if (saldoRes.error) throw saldoRes.error
      if (kycRes.error) throw kycRes.error
      if (depsRes.error) throw depsRes.error

      setSaldo({
        saldo: Number(saldoRes.data?.saldo || 0),
        saldo_retido: Number(saldoRes.data?.saldo_retido || 0),
      })
      setKyc((kycRes.data || null) as WalletKyc | null)
      setDepositos((depsRes.data || []) as Deposito[])
    } catch (error: any) {
      console.error('Erro ao carregar depósitos:', error)
      setErro(error?.message || 'Erro ao carregar página de depósito.')
    } finally {
      setLoading(false)
    }
  }

  async function criarPix() {
    setErro(null)
    setSucesso(null)
    setCopiado(false)
    setDepositoAtual(null)
    setGerandoPix(true)

    try {
      if (!carteiraVerificada) {
        setErro('Sua carteira precisa estar verificada antes do primeiro depósito.')
        return
      }

      const valorNumerico = Number(valor)
      if (!valorNumerico || valorNumerico < 1) {
        setErro('Informe um valor válido para depósito.')
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/pagamentos/pix/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ valor: valorNumerico }),
      })

      const contentType = res.headers.get('content-type') || ''
      const json = contentType.includes('application/json') ? await res.json() : { error: await res.text() }

      if (!res.ok) {
        setErro(json?.error || 'Erro ao gerar Pix.')
        return
      }

      setDepositoAtual(json)
      setSucesso('Pix gerado com sucesso.')
      await carregar()
    } catch (error: any) {
      console.error('Erro ao gerar Pix:', error)
      setErro(error?.message || 'Erro ao gerar Pix.')
    } finally {
      setGerandoPix(false)
    }
  }

  async function copiarPix() {
    if (!depositoAtual?.qr_code) return
    await navigator.clipboard.writeText(depositoAtual.qr_code)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-92px)] bg-transparent px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-5xl border border-slate-200 bg-white p-6 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
          Carregando depósito...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-92px)] bg-transparent px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="border border-slate-200 bg-white p-5">
          <button
            type="button"
            onClick={() => router.push('/carteira')}
            className="mb-4 inline-flex h-9 items-center gap-2 border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-600 hover:border-blue-300 hover:text-blue-600"
          >
            <ArrowLeft size={15} />
            Voltar
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">Carteira Drop Zone</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight">Depositar saldo</h1>
              <p className="mt-2 max-w-xl text-sm font-medium text-slate-500">
                Gere um Pix pelo Mercado Pago para adicionar saldo na carteira.
              </p>
            </div>

            <button
              type="button"
              onClick={carregar}
              className="inline-flex h-10 items-center gap-2 border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
            >
              <RefreshCcw size={15} />
              Atualizar
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                <Wallet size={15} />
                Disponível
              </div>
              <div className="mt-3 text-3xl font-black text-slate-950">{dinheiro(saldo.saldo)}</div>
            </div>
            <div className="border border-amber-200 bg-amber-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Retido</div>
              <div className="mt-3 text-3xl font-black text-slate-950">{dinheiro(saldo.saldo_retido)}</div>
            </div>
            <div className={`border p-4 ${carteiraVerificada ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.16em]">Status</div>
              <div className="mt-3 text-lg font-black uppercase">{carteiraVerificada ? 'Carteira verificada' : 'Verificação pendente'}</div>
            </div>
          </div>
        </header>

        {erro ? <div className="border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{erro}</div> : null}
        {sucesso ? <div className="border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{sucesso}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <section className="border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600">
                  <Banknote size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black">Novo depósito</h2>
                  <p className="text-xs font-medium text-slate-500">Pix via Mercado Pago</p>
                </div>
              </div>

              <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Valor do depósito</label>
              <div className="mt-1 flex h-12 items-center border border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <span className="flex h-full items-center border-r border-slate-200 px-3 text-sm font-black text-slate-500">R$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold outline-none"
                />
              </div>

              <button
                onClick={criarPix}
                disabled={gerandoPix || !carteiraVerificada}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 bg-blue-600 px-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {gerandoPix ? <Loader2 size={16} className="animate-spin" /> : null}
                {gerandoPix ? 'Gerando Pix...' : 'Gerar Pix'}
              </button>

              {!carteiraVerificada ? (
                <button
                  type="button"
                  onClick={() => router.push('/carteira')}
                  className="mt-2 h-10 w-full border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-700"
                >
                  Verificar carteira
                </button>
              ) : null}
            </section>

            {depositoAtual ? (
              <section className="border border-slate-200 bg-white p-4">
                <div className="mb-3">
                  <h2 className="text-base font-black">Pix gerado</h2>
                  <p className="text-xs font-medium text-slate-500">Escaneie ou copie o código.</p>
                </div>

                {depositoAtual.qr_code_base64 ? (
                  <img src={`data:image/png;base64,${depositoAtual.qr_code_base64}`} alt="QR Code Pix" className="mx-auto mb-3 h-56 w-56 border border-slate-200 object-contain" />
                ) : null}

                <textarea readOnly value={depositoAtual.qr_code || ''} className="h-24 w-full border border-slate-200 bg-slate-50 p-2 text-xs font-medium outline-none" />

                <button onClick={copiarPix} className="mt-2 flex h-10 w-full items-center justify-center gap-2 border border-slate-900 bg-slate-950 px-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-blue-600">
                  <Copy size={15} />
                  {copiado ? 'Copiado' : 'Copiar código Pix'}
                </button>

                {depositoAtual.ticket_url ? (
                  <a href={depositoAtual.ticket_url} target="_blank" rel="noreferrer" className="mt-2 block border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                    Abrir Mercado Pago
                  </a>
                ) : null}
              </section>
            ) : null}
          </aside>

          <section className="border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 p-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Histórico</div>
                <h2 className="text-base font-black">Depósitos recentes</h2>
              </div>
              <span className="text-xs font-black text-slate-400">{depositos.length}</span>
            </div>

            <div className="divide-y divide-slate-200">
              {depositos.map((d) => (
                <div key={d.id} className="grid gap-2 p-3 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <div className="font-black text-slate-950">{dinheiro(d.valor)}</div>
                    <div className="text-xs font-medium text-slate-500">{dataHora(d.created_at)}</div>
                  </div>
                  <span className={`w-fit border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClasse(d.status)}`}>{normalizarStatus(d.status)}</span>
                  <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{d.provider || 'mercadopago'}</div>
                </div>
              ))}

              {depositos.length === 0 ? <div className="p-5 text-sm font-medium text-slate-500">Nenhum depósito ainda.</div> : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
