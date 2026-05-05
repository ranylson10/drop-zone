'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Copy,
  FileCheck2,
  Loader2,
  Lock,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Saldo = {
  saldo: number
  saldo_retido: number
}

type WalletKyc = {
  id?: string
  user_id?: string
  status?: string | null
  tipo_verificacao?: string | null
  nome_completo?: string | null
  cpf?: string | null
  telefone?: string | null
  data_nascimento?: string | null
  maioridade_confirmada?: boolean | null
  termos_aceitos?: boolean | null
  documento_frente_url?: string | null
  documento_verso_url?: string | null
  selfie_url?: string | null
  documento_status?: string | null
  selfie_status?: string | null
  motivo_reprovacao?: string | null
  score_verificacao?: number | null
  resultado_automatico?: string | null
  revisao_manual_necessaria?: boolean | null
  tipo_documento?: string | null
  numero_documento?: string | null
  orgao_emissor?: string | null
  uf_documento?: string | null
  data_emissao_documento?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type UsuarioPagamento = {
  id?: string
  user_id?: string
  nome?: string | null
  cpf?: string | null
  chave_pix?: string | null
  tipo_chave?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type Deposito = {
  id: string
  user_id?: string | null
  valor: number
  status: string
  qr_code?: string | null
  qr_code_base64?: string | null
  ticket_url?: string | null
  created_at: string
}

type Transacao = {
  id: string
  user_id?: string | null
  tipo: string
  valor: number
  status?: string | null
  descricao?: string | null
  created_at: string
}

type FormKyc = {
  nome: string
  cpf: string
  telefone: string
  dataNascimento: string
  chavePix: string
  tipoChave: string
  maioridade: boolean
  termos: boolean
  tipoDocumento: string
  numeroDocumento: string
  orgaoEmissor: string
  ufDocumento: string
  dataEmissaoDocumento: string
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
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

  if (['verificada', 'approved', 'aprovado', 'pago', 'concluido', 'concluído'].includes(value)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (['cancelado', 'cancelled', 'rejected', 'recusado', 'rejeitada', 'falhou'].includes(value)) {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  if (['em_analise', 'em análise', 'pendente'].includes(value)) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function tipoTransacaoIcone(tipo?: string | null) {
  const value = String(tipo || '').toLowerCase()
  if (value.includes('liberado') || value.includes('credito') || value.includes('depósito') || value.includes('deposito')) {
    return <ArrowDownLeft size={16} className="text-emerald-600" />
  }

  return <ArrowUpRight size={16} className="text-blue-600" />
}

function getStatusTitulo(status?: string | null) {
  if (status === 'verificada') return 'Carteira verificada'
  if (status === 'em_analise' || status === 'pendente') return 'Verificação em análise'
  if (status === 'rejeitada') return 'Verificação reprovada'
  return 'Verificação não iniciada'
}

function getSelfieStatus(selfieStatus?: string | null, selfieUrl?: string | null) {
  if (selfieStatus === 'enviada' || selfieUrl) {
    return { titulo: 'Selfie recebida', classe: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
  }

  return { titulo: 'Selfie pendente', classe: 'border-amber-200 bg-amber-50 text-amber-700' }
}

function InputCampo({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  )
}

function ArquivoCampo({
  titulo,
  accept,
  atualUrl,
  onChange,
}: {
  titulo: string
  accept: string
  atualUrl?: string | null
  onChange: (file: File | null) => void
}) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        <Upload size={14} />
        {titulo}
      </div>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="block w-full text-xs font-bold text-slate-700 file:mr-3 file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.12em] file:text-white"
      />
      {atualUrl ? (
        <a
          href={atualUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-blue-700"
        >
          Ver arquivo atual
        </a>
      ) : null}
    </div>
  )
}


function EtapaItem({
  numero,
  titulo,
  ativo,
  concluida,
  onClick,
}: {
  numero: number
  titulo: string
  ativo: boolean
  concluida: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center gap-3 border px-3 text-left transition ${
        ativo ? 'border-blue-500 bg-blue-50 text-blue-700' : concluida ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
      }`}
    >
      <span className={`flex h-7 w-7 items-center justify-center border text-xs font-black ${ativo ? 'border-blue-500 bg-blue-600 text-white' : concluida ? 'border-emerald-300 bg-white text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
        {concluida ? '✓' : numero}
      </span>
      <span className="text-xs font-black uppercase tracking-[0.14em]">{titulo}</span>
    </button>
  )
}

export default function CarteiraPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [saldo, setSaldo] = useState<Saldo>({ saldo: 0, saldo_retido: 0 })
  const [kyc, setKyc] = useState<WalletKyc | null>(null)
  const [pagamento, setPagamento] = useState<UsuarioPagamento | null>(null)
  const [valor, setValor] = useState('10')
  const [depositoAtual, setDepositoAtual] = useState<any>(null)
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [salvandoKyc, setSalvandoKyc] = useState(false)
  const [gerandoPix, setGerandoPix] = useState(false)
  const [atualizandoSelfie, setAtualizandoSelfie] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [etapaKyc, setEtapaKyc] = useState<'dados' | 'arquivos' | 'selfie' | 'pix'>('dados')

  const [documentoFrente, setDocumentoFrente] = useState<File | null>(null)
  const [documentoVerso, setDocumentoVerso] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)

  const [form, setForm] = useState<FormKyc>({
    nome: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
    chavePix: '',
    tipoChave: 'cpf',
    maioridade: false,
    termos: false,
    tipoDocumento: 'rg',
    numeroDocumento: '',
    orgaoEmissor: '',
    ufDocumento: '',
    dataEmissaoDocumento: '',
  })

  const carteiraCriada = Boolean(kyc || pagamento)
  const carteiraVerificada = kyc?.status === 'verificada'
  const precisaVerificacao = !carteiraVerificada
  const saldoTotal = useMemo(() => Number(saldo.saldo || 0) + Number(saldo.saldo_retido || 0), [saldo])
  const selfieStatusCard = useMemo(() => getSelfieStatus(kyc?.selfie_status, kyc?.selfie_url), [kyc?.selfie_status, kyc?.selfie_url])

  const dadosOk = useMemo(() => {
    return (
      form.nome.trim().length >= 6 &&
      onlyDigits(form.cpf).length === 11 &&
      onlyDigits(form.telefone).length >= 10 &&
      Boolean(form.dataNascimento) &&
      form.maioridade &&
      form.termos
    )
  }, [form])

  const arquivosOk = useMemo(() => {
    return (
      Boolean(form.tipoDocumento) &&
      Boolean(form.numeroDocumento.trim()) &&
      Boolean(form.orgaoEmissor.trim()) &&
      Boolean(form.ufDocumento.trim()) &&
      Boolean(form.dataEmissaoDocumento) &&
      Boolean(documentoFrente || kyc?.documento_frente_url) &&
      Boolean(documentoVerso || kyc?.documento_verso_url)
    )
  }, [form, documentoFrente, documentoVerso, kyc])

  const selfieOk = useMemo(() => Boolean(selfie || kyc?.selfie_url), [selfie, kyc?.selfie_url])

  const pixOk = useMemo(() => Boolean(form.chavePix.trim()) && Boolean(form.tipoChave), [form.chavePix, form.tipoChave])

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://192.168.2.50:3000'
  const mobileSelfieUrl = userId ? `${baseUrl}/kyc/selfie?user=${userId}` : ''

  const podeEnviarKyc = dadosOk && arquivosOk && selfieOk && pixOk

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    let ativo = true

    async function gerarQr() {
      if (!mobileSelfieUrl) {
        setQrDataUrl('')
        return
      }

      try {
        const dataUrl = await QRCode.toDataURL(mobileSelfieUrl, { width: 256, margin: 1 })
        if (ativo) setQrDataUrl(dataUrl)
      } catch (error) {
        console.error('Erro ao gerar QR Code da selfie:', error)
        if (ativo) setQrDataUrl('')
      }
    }

    gerarQr()

    return () => {
      ativo = false
    }
  }, [mobileSelfieUrl])

  function preencherForm(pag: UsuarioPagamento | null, k: WalletKyc | null) {
    setForm({
      nome: k?.nome_completo || pag?.nome || '',
      cpf: formatCpf(k?.cpf || pag?.cpf || ''),
      telefone: formatPhone(k?.telefone || ''),
      dataNascimento: k?.data_nascimento || '',
      chavePix: pag?.chave_pix || '',
      tipoChave: pag?.tipo_chave || 'cpf',
      maioridade: Boolean(k?.maioridade_confirmada),
      termos: Boolean(k?.termos_aceitos),
      tipoDocumento: k?.tipo_documento || 'rg',
      numeroDocumento: k?.numero_documento || '',
      orgaoEmissor: k?.orgao_emissor || '',
      ufDocumento: k?.uf_documento || '',
      dataEmissaoDocumento: k?.data_emissao_documento || '',
    })
  }

  async function carregar() {
    try {
      setErro(null)
      setLoading(true)

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const user = userData?.user

      if (!user) {
        setUserId(null)
        router.push('/login')
        return
      }

      setUserId(user.id)
      await supabase.rpc('lealt_garantir_wallet', { p_user_id: user.id })

      const [saldoRes, kycRes, pagamentoRes, depsRes, txsRes] = await Promise.all([
        supabase.from('wallet_saldo').select('saldo, saldo_retido').eq('user_id', user.id).maybeSingle(),
        supabase.from('wallet_kyc').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('usuarios_pagamento').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('wallet_depositos_pix').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('wallet_transacoes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(25),
      ])

      if (saldoRes.error) throw saldoRes.error
      if (kycRes.error) throw kycRes.error
      if (pagamentoRes.error) throw pagamentoRes.error
      if (depsRes.error) throw depsRes.error
      if (txsRes.error) throw txsRes.error

      const pag = (pagamentoRes.data || null) as UsuarioPagamento | null
      const k = (kycRes.data || null) as WalletKyc | null

      setSaldo({
        saldo: Number(saldoRes.data?.saldo || 0),
        saldo_retido: Number(saldoRes.data?.saldo_retido || 0),
      })
      setKyc(k)
      setPagamento(pag)
      setDepositos((depsRes.data || []) as Deposito[])
      setTransacoes((txsRes.data || []) as Transacao[])
      preencherForm(pag, k)
    } catch (error: any) {
      console.error('Erro ao carregar carteira:', error)
      setErro(error?.message || 'Erro ao carregar carteira.')
    } finally {
      setLoading(false)
    }
  }

  async function uploadArquivo(uid: string, pasta: string, arquivo: File | null) {
    if (!arquivo) return null

    const ext = arquivo.name.split('.').pop() || 'bin'
    const nomeArquivo = `${uid}-${Date.now()}-${pasta}.${ext}`
    const caminho = `kyc/${nomeArquivo}`

    const { error } = await supabase.storage.from('documentos').upload(caminho, arquivo, { upsert: true })
    if (error) throw error

    const { data } = supabase.storage.from('documentos').getPublicUrl(caminho)
    return data.publicUrl
  }

  async function salvarKyc() {
    try {
      setErro(null)
      setSucesso(null)

      if (!podeEnviarKyc) {
        setErro('Conclua as 4 etapas da carteira antes de enviar para análise.')
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const uid = userData?.user?.id
      if (!uid) {
        router.push('/login')
        return
      }

      setSalvandoKyc(true)

      const [frenteUrl, versoUrl, selfieUrl] = await Promise.all([
        uploadArquivo(uid, 'documento-frente', documentoFrente),
        uploadArquivo(uid, 'documento-verso', documentoVerso),
        uploadArquivo(uid, 'selfie', selfie),
      ])

      const documentoFrenteUrl = frenteUrl || kyc?.documento_frente_url || null
      const documentoVersoUrl = versoUrl || kyc?.documento_verso_url || null
      const selfieFinalUrl = selfieUrl || kyc?.selfie_url || null

      const { error: pagamentoError } = await supabase.from('usuarios_pagamento').upsert(
        {
          user_id: uid,
          nome: form.nome.trim(),
          cpf: onlyDigits(form.cpf),
          chave_pix: form.chavePix.trim(),
          tipo_chave: form.tipoChave,
        },
        { onConflict: 'user_id' },
      )

      if (pagamentoError) throw pagamentoError

      const payloadKyc = {
        user_id: uid,
        status: 'pendente',
        tipo_verificacao: 'documental',
        nome_completo: form.nome.trim(),
        cpf: onlyDigits(form.cpf),
        telefone: onlyDigits(form.telefone),
        data_nascimento: form.dataNascimento,
        maioridade_confirmada: form.maioridade,
        termos_aceitos: form.termos,
        tipo_documento: form.tipoDocumento,
        numero_documento: form.numeroDocumento.trim(),
        orgao_emissor: form.orgaoEmissor.trim(),
        uf_documento: form.ufDocumento.trim().toUpperCase(),
        data_emissao_documento: form.dataEmissaoDocumento,
        documento_frente_url: documentoFrenteUrl,
        documento_verso_url: documentoVersoUrl,
        selfie_url: selfieFinalUrl,
        documento_status: documentoFrenteUrl && documentoVersoUrl ? 'enviado' : 'nao_enviado',
        selfie_status: selfieFinalUrl ? 'enviada' : 'nao_enviada',
        updated_at: new Date().toISOString(),
      }

      const { error: kycError } = await supabase.from('wallet_kyc').upsert(payloadKyc, { onConflict: 'user_id' })
      if (kycError) throw kycError

      await supabase.rpc('lealt_garantir_wallet', { p_user_id: uid })

      setDocumentoFrente(null)
      setDocumentoVerso(null)
      setSelfie(null)
      setSucesso('Dados e documentos enviados. Sua carteira foi enviada para análise.')
      await carregar()
    } catch (error: any) {
      console.error('Erro ao enviar KYC da carteira:', error)
      setErro(error?.message || 'Não foi possível salvar os dados da carteira.')
    } finally {
      setSalvandoKyc(false)
    }
  }

  async function atualizarStatusSelfie() {
    setAtualizandoSelfie(true)
    setErro(null)
    setSucesso(null)

    try {
      await carregar()
      setSucesso('Status da selfie atualizado.')
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível atualizar o status da selfie.')
    } finally {
      setAtualizandoSelfie(false)
    }
  }

  async function criarPix() {
    setErro(null)
    setSucesso(null)
    setCopiado(false)
    setGerandoPix(true)
    setDepositoAtual(null)

    try {
      if (!carteiraCriada) {
        setErro('Envie sua verificação de carteira antes de depositar.')
        return
      }

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
        setErro('Faça login para depositar.')
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
        <div className="mx-auto max-w-6xl border border-slate-200 bg-white p-6 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
          Carregando carteira...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-92px)] bg-transparent px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl space-y-4">
        <header>
          <section className="border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
                  Carteira Drop Zone
                </div>
                <h1 className="mt-1 text-3xl font-black tracking-tight">
                  {carteiraVerificada ? 'Saldo e depósitos Pix' : 'Verificação da carteira'}
                </h1>
                <p className="mt-2 max-w-xl text-sm font-medium text-slate-500">
                  {carteiraVerificada
                    ? 'Controle seu saldo, valores retidos em disputas e histórico financeiro da sua conta.'
                    : 'Envie seus dados Pix, documento frente e verso e selfie para liberar depósitos e premiações.'}
                </p>
              </div>

              <button
                onClick={carregar}
                className="inline-flex h-10 items-center gap-2 border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
              >
                <RefreshCcw size={15} />
                Atualizar
              </button>
            </div>

            {carteiraCriada ? (
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                    <Wallet size={15} />
                    Disponível
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-950">{dinheiro(saldo.saldo)}</div>
                </div>

                <div className="border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                    <Lock size={15} />
                    Retido
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-950">{dinheiro(saldo.saldo_retido)}</div>
                </div>

                <div className="border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                    <Banknote size={15} />
                    Total
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-950">{dinheiro(saldoTotal)}</div>
                </div>
              </div>
            ) : null}
          </section>

        </header>

        {erro ? <div className="border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{erro}</div> : null}
        {sucesso ? <div className="border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{sucesso}</div> : null}

        {precisaVerificacao ? (
          <section className="border border-slate-200 bg-white p-5">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="flex h-11 w-11 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600">
                <FileCheck2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black">Criar carteira por etapas</h2>
                <p className="text-sm font-medium text-slate-500">
                  Preencha uma etapa por vez para deixar o cadastro mais simples e organizado.
                </p>
              </div>
            </div>

            <div className="mb-5 grid gap-2 md:grid-cols-4">
              <EtapaItem numero={1} titulo="Dados" ativo={etapaKyc === 'dados'} concluida={dadosOk} onClick={() => setEtapaKyc('dados')} />
              <EtapaItem numero={2} titulo="Arquivos" ativo={etapaKyc === 'arquivos'} concluida={arquivosOk} onClick={() => setEtapaKyc('arquivos')} />
              <EtapaItem numero={3} titulo="Selfie" ativo={etapaKyc === 'selfie'} concluida={selfieOk} onClick={() => setEtapaKyc('selfie')} />
              <EtapaItem numero={4} titulo="Pix" ativo={etapaKyc === 'pix'} concluida={pixOk} onClick={() => setEtapaKyc('pix')} />
            </div>

            <div className={`mb-5 border p-4 ${statusClasse(kyc?.status || 'nao_iniciado')}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">Status atual</div>
              <div className="mt-1 text-lg font-black uppercase">{getStatusTitulo(kyc?.status)}</div>
              {kyc?.score_verificacao != null ? <div className="mt-2 text-sm font-bold">Score automático: {kyc.score_verificacao}</div> : null}
              {kyc?.motivo_reprovacao ? <div className="mt-2 text-sm font-bold text-red-700">Motivo: {kyc.motivo_reprovacao}</div> : null}
            </div>

            {etapaKyc === 'dados' ? (
              <div className="border border-slate-200 bg-white p-4">
                <div className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Etapa 1 de 4 • Dados pessoais</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <InputCampo label="Nome completo" value={form.nome} onChange={(value) => setForm((atual) => ({ ...atual, nome: value }))} placeholder="Ex: João da Silva" />
                  <InputCampo label="CPF" value={form.cpf} onChange={(value) => setForm((atual) => ({ ...atual, cpf: formatCpf(value) }))} placeholder="000.000.000-00" />
                  <InputCampo label="Telefone" value={form.telefone} onChange={(value) => setForm((atual) => ({ ...atual, telefone: formatPhone(value) }))} placeholder="(00) 00000-0000" />
                  <InputCampo label="Data de nascimento" type="date" value={form.dataNascimento} onChange={(value) => setForm((atual) => ({ ...atual, dataNascimento: value }))} />
                </div>

                <div className="mt-4 grid gap-2">
                  <label className="flex items-start gap-3 border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">
                    <input type="checkbox" checked={form.maioridade} onChange={(e) => setForm((atual) => ({ ...atual, maioridade: e.target.checked }))} className="mt-1" />
                    Confirmo que tenho 18 anos ou mais.
                  </label>
                  <label className="flex items-start gap-3 border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">
                    <input type="checkbox" checked={form.termos} onChange={(e) => setForm((atual) => ({ ...atual, termos: e.target.checked }))} className="mt-1" />
                    Aceito os termos da carteira, verificação de identidade, movimentações Pix e regras de segurança da plataforma.
                  </label>
                </div>

                <button type="button" onClick={() => setEtapaKyc('arquivos')} disabled={!dadosOk} className="mt-4 h-11 bg-blue-600 px-6 text-xs font-black uppercase tracking-[0.14em] text-white disabled:opacity-50">
                  Próxima etapa
                </button>
              </div>
            ) : null}

            {etapaKyc === 'arquivos' ? (
              <div className="border border-slate-200 bg-white p-4">
                <div className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Etapa 2 de 4 • Documento</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Tipo de documento</span>
                    <select value={form.tipoDocumento} onChange={(e) => setForm((atual) => ({ ...atual, tipoDocumento: e.target.value }))} className="h-11 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      <option value="rg">RG</option>
                      <option value="cnh">CNH</option>
                      <option value="rne">RNE</option>
                    </select>
                  </label>
                  <InputCampo label="Número do documento" value={form.numeroDocumento} onChange={(value) => setForm((atual) => ({ ...atual, numeroDocumento: value }))} />
                  <InputCampo label="Órgão emissor" value={form.orgaoEmissor} onChange={(value) => setForm((atual) => ({ ...atual, orgaoEmissor: value }))} />
                  <InputCampo label="UF" value={form.ufDocumento} onChange={(value) => setForm((atual) => ({ ...atual, ufDocumento: value.toUpperCase().slice(0, 2) }))} placeholder="PA" />
                  <InputCampo label="Data de emissão" type="date" value={form.dataEmissaoDocumento} onChange={(value) => setForm((atual) => ({ ...atual, dataEmissaoDocumento: value }))} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ArquivoCampo titulo="Documento frente" accept="image/*,.pdf" atualUrl={kyc?.documento_frente_url} onChange={setDocumentoFrente} />
                  <ArquivoCampo titulo="Documento verso" accept="image/*,.pdf" atualUrl={kyc?.documento_verso_url} onChange={setDocumentoVerso} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEtapaKyc('dados')} className="h-11 border border-slate-200 bg-white px-6 text-xs font-black uppercase tracking-[0.14em] text-slate-700">Voltar</button>
                  <button type="button" onClick={() => setEtapaKyc('selfie')} disabled={!arquivosOk} className="h-11 bg-blue-600 px-6 text-xs font-black uppercase tracking-[0.14em] text-white disabled:opacity-50">Próxima etapa</button>
                </div>
              </div>
            ) : null}

            {etapaKyc === 'selfie' ? (
              <div className="border border-slate-200 bg-white p-4">
                <div className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Etapa 3 de 4 • Verificação facial</div>
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <ArquivoCampo titulo="Selfie pelo computador" accept="image/*" atualUrl={kyc?.selfie_url} onChange={setSelfie} />

                  <div className="border border-slate-200 bg-slate-50 p-4">
                    <div className={`mb-3 border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${selfieStatusCard.classe}`}>{selfieStatusCard.titulo}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Selfie por celular</div>
                    <p className="mt-2 text-xs font-bold text-slate-600">Escaneie para abrir a captura guiada com enquadramento facial.</p>
                    {qrDataUrl ? <img src={qrDataUrl} alt="QR Code da selfie" className="mt-3 h-44 w-44 border border-slate-200 bg-white" /> : <div className="mt-3 border border-dashed border-slate-300 p-4 text-xs font-bold text-slate-500">Login necessário para gerar o QR.</div>}
                    {mobileSelfieUrl ? <a href={mobileSelfieUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-black uppercase tracking-[0.12em] text-blue-700">Abrir link direto no celular</a> : null}
                    <button type="button" onClick={atualizarStatusSelfie} disabled={atualizandoSelfie} className="mt-3 h-10 w-full border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.14em] text-slate-700 disabled:opacity-60">{atualizandoSelfie ? 'Atualizando...' : 'Atualizar status da selfie'}</button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEtapaKyc('arquivos')} className="h-11 border border-slate-200 bg-white px-6 text-xs font-black uppercase tracking-[0.14em] text-slate-700">Voltar</button>
                  <button type="button" onClick={() => setEtapaKyc('pix')} disabled={!selfieOk} className="h-11 bg-blue-600 px-6 text-xs font-black uppercase tracking-[0.14em] text-white disabled:opacity-50">Próxima etapa</button>
                </div>
              </div>
            ) : null}

            {etapaKyc === 'pix' ? (
              <div className="border border-slate-200 bg-white p-4">
                <div className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Etapa 4 de 4 • Dados Pix</div>
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <InputCampo label="Chave Pix" value={form.chavePix} onChange={(value) => setForm((atual) => ({ ...atual, chavePix: value }))} placeholder="Informe sua chave Pix" />
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Tipo de chave Pix</span>
                    <select value={form.tipoChave} onChange={(e) => setForm((atual) => ({ ...atual, tipoChave: e.target.value }))} className="h-11 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      <option value="cpf">CPF</option>
                      <option value="email">E-mail</option>
                      <option value="telefone">Telefone</option>
                      <option value="aleatoria">Chave aleatória</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEtapaKyc('selfie')} className="h-11 border border-slate-200 bg-white px-6 text-xs font-black uppercase tracking-[0.14em] text-slate-700">Voltar</button>
                  <button onClick={salvarKyc} disabled={!podeEnviarKyc || salvandoKyc} className="flex h-11 items-center justify-center gap-2 bg-blue-600 px-6 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-blue-700 disabled:opacity-50">
                    {salvandoKyc ? <Loader2 className="animate-spin" size={18} /> : <FileCheck2 size={18} />}
                    {salvandoKyc ? 'Enviando...' : 'Enviar para análise'}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <aside className="space-y-4">
              <section className="border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-black">Adicionar saldo</h2>
                    <p className="text-xs font-medium text-slate-500">Depósito via Pix</p>
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
              </section>

              {depositoAtual ? (
                <section className="border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600">
                      <Banknote size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-black">Pix gerado</h2>
                      <p className="text-xs font-medium text-slate-500">Escaneie ou copie o código</p>
                    </div>
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
                      Abrir página de pagamento
                    </a>
                  ) : null}
                </section>
              ) : null}
            </aside>

            <section className="space-y-4">
              <div className="border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 p-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Depósitos</div>
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
                      <div className="font-black text-slate-950">{dinheiro(d.valor)}</div>
                    </div>
                  ))}

                  {depositos.length === 0 ? <div className="p-5 text-sm font-medium text-slate-500">Nenhum depósito ainda.</div> : null}
                </div>
              </div>

              <div className="border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 p-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Extrato</div>
                    <h2 className="text-base font-black">Transações recentes</h2>
                  </div>
                  <span className="text-xs font-black text-slate-400">{transacoes.length}</span>
                </div>

                <div className="divide-y divide-slate-200">
                  {transacoes.map((t) => (
                    <div key={t.id} className="grid gap-2 p-3 text-sm md:grid-cols-[36px_1fr_auto] md:items-center">
                      <div className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-slate-50">{tipoTransacaoIcone(t.tipo)}</div>
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-950">{t.descricao || t.tipo}</div>
                        <div className="text-xs font-medium text-slate-500">{normalizarStatus(t.status)} • {dataHora(t.created_at)}</div>
                      </div>
                      <div className="text-right font-black text-slate-950">{dinheiro(t.valor)}</div>
                    </div>
                  ))}

                  {transacoes.length === 0 ? <div className="p-5 text-sm font-medium text-slate-500">Nenhuma transação ainda.</div> : null}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
