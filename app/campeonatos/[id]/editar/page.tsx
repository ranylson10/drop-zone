'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Copy, ExternalLink, Loader2, MessageCircle, Save, Settings } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'inscricoes', label: 'Inscrições abertas' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' },
]

type WhatsContato = { nome: string; numero: string }

function limparNumeroWhatsApp(numero: string) {
  return String(numero || '').replace(/\D/g, '')
}

function normalizarContatosWhatsApp(contatos: WhatsContato[]) {
  return contatos
    .slice(0, 3)
    .map((contato) => ({
      nome: String(contato.nome || '').trim(),
      numero: limparNumeroWhatsApp(contato.numero),
    }))
    .filter((contato) => contato.nome && contato.numero)
}

function contatosIniciais(data: any): WhatsContato[] {
  const lista = Array.isArray(data?.whatsapp_contatos) ? data.whatsapp_contatos : []
  const normalizados = normalizarContatosWhatsApp(lista)
  if (normalizados.length) return normalizados
  if (data?.whatsapp_suporte) return [{ nome: 'Vendas', numero: String(data.whatsapp_suporte) }]
  return [{ nome: '', numero: '' }]
}

function extrairMensagemErro(error: any) {
  if (!error) return 'Erro desconhecido.'
  if (typeof error === 'string') return error
  if (error.message) return error.message
  if (error.details) return error.details
  if (error.hint) return error.hint

  try {
    const serializado = JSON.stringify(error, Object.getOwnPropertyNames(error))
    if (serializado && serializado !== '{}') return serializado
  } catch {}

  return 'Erro desconhecido ao salvar. Confira se você é dono/admin da produtora deste campeonato.'
}

function normalizarStatusBanco(value?: string | null) {
  const raw = String(value || 'rascunho').trim().toLowerCase()
  const mapa: Record<string, string> = {
    rascunho: 'rascunho',
    inscricoes: 'inscricoes',
    inscricao: 'inscricoes',
    aberto: 'inscricoes',
    acontecendo: 'em_andamento',
    andamento: 'em_andamento',
    em_andamento: 'em_andamento',
    encerrado: 'finalizado',
    finalizado: 'finalizado',
    cancelado: 'cancelado',
  }
  return mapa[raw] || 'rascunho'
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  const data = new Date(value)
  if (Number.isNaN(data.getTime())) return ''
  const offset = data.getTimezoneOffset() * 60000
  return new Date(data.getTime() - offset).toISOString().slice(0, 16)
}

function toIsoOrNull(value: string) {
  if (!value) return null
  const data = new Date(value)
  if (Number.isNaN(data.getTime())) return null
  return data.toISOString()
}

export default function EditarCampeonatoPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState<any>({
    nome: '',
    status: 'rascunho',
    descricao: '',
    valor_vaga: '',
    valor_premiacao: '',
    vagas: '',
    data_inicio: '',
    data_fim: '',
    data_abertura_inscricoes: '',
    data_encerramento_inscricoes: '',
    whatsapp_suporte: '',
    whatsapp_contatos: [{ nome: '', numero: '' }] as WhatsContato[],
  })

  useEffect(() => {
    async function carregar() {
      if (!id) return

      try {
        setLoading(true)
        setErro('')

        const { data, error } = await supabase
          .from('campeonatos')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        setForm({
          nome: data?.nome || '',
          status: data?.status || 'rascunho',
          descricao: data?.descricao || '',
          valor_vaga: data?.valor_vaga ?? '',
          valor_premiacao: data?.valor_premiacao ?? '',
          vagas: data?.vagas ?? data?.quantidade_equipes ?? '',
          data_inicio: toDatetimeLocal(data?.data_inicio),
          data_fim: toDatetimeLocal(data?.data_fim),
          data_abertura_inscricoes: toDatetimeLocal(data?.data_abertura_inscricoes),
          data_encerramento_inscricoes: toDatetimeLocal(data?.data_encerramento_inscricoes),
          whatsapp_suporte: data?.whatsapp_suporte || '',
          whatsapp_contatos: contatosIniciais(data),
        })
      } catch (error: any) {
        console.error('Erro ao carregar campeonato:', error)
        setErro(extrairMensagemErro(error))
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [id])

  function atualizar(campo: string, valor: any) {
    setForm((prev: any) => ({ ...prev, [campo]: valor }))
  }

  async function salvar() {
    try {
      setSalvando(true)
      setErro('')

      const payload: any = {
        nome: String(form.nome || '').trim(),
        status: normalizarStatusBanco(form.status),
        descricao: String(form.descricao || '').trim() || null,
        valor_vaga: form.valor_vaga === '' ? null : Number(form.valor_vaga),
        valor_premiacao: form.valor_premiacao === '' ? null : Number(form.valor_premiacao),
        vagas: form.vagas === '' ? null : Number(form.vagas),
        data_inicio: toIsoOrNull(form.data_inicio),
        data_fim: toIsoOrNull(form.data_fim),
        data_abertura_inscricoes: toIsoOrNull(form.data_abertura_inscricoes),
        data_encerramento_inscricoes: toIsoOrNull(form.data_encerramento_inscricoes),
        whatsapp_suporte: normalizarContatosWhatsApp(form.whatsapp_contatos)[0]?.numero || String(form.whatsapp_suporte || '').trim() || null,
        whatsapp_contatos: normalizarContatosWhatsApp(form.whatsapp_contatos),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('campeonatos')
        .update(payload)
        .eq('id', id)
        .select('id')
        .maybeSingle()

      if (error) throw error
      if (!data?.id) {
        throw new Error('Nenhum campeonato foi atualizado. Verifique se você é dono/admin da produtora deste campeonato.')
      }

      router.push(`/campeonatos/${id}`)
    } catch (error: any) {
      console.error('Erro ao salvar campeonato:', {
        mensagem: extrairMensagemErro(error),
        bruto: error,
        payloadStatus: normalizarStatusBanco(form.status),
        campeonatoId: id,
      })
      setErro(extrairMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }



  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const linkEscala = origem ? `${origem}/escala/${id}` : `/escala/${id}`
  const linkCompleto = origem ? `${origem}/campeonatos/${id}` : `/campeonatos/${id}`
  const mensagemWhatsApp = `Olá, vim pelo Drop Zone e quero comprar vaga no campeonato ${form.nome || ''}.`
  const contatoTesteWhatsApp = normalizarContatosWhatsApp(form.whatsapp_contatos)[0]
  const whatsappLimpo = contatoTesteWhatsApp?.numero || String(form.whatsapp_suporte || '').replace(/\D/g, '')
  const linkWhatsApp = whatsappLimpo ? `https://wa.me/${whatsappLimpo}?text=${encodeURIComponent(mensagemWhatsApp)}` : ''

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto)
      alert('Link copiado.')
    } catch {
      window.prompt('Copie o link:', texto)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] px-4 py-6 text-[#142340]">
        <div className="mx-auto flex max-w-5xl items-center justify-center border border-zinc-200 bg-white p-10 text-[12px] uppercase tracking-wide text-zinc-500">
          <Loader2 className="mr-2 animate-spin" size={16} /> Carregando configurações...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] px-3 py-4 text-[#142340] md:px-6 md:py-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="border border-zinc-200 bg-white p-4">
          <button
            type="button"
            onClick={() => router.push(`/campeonatos/${id}`)}
            className="mb-4 inline-flex h-8 items-center gap-2 border border-zinc-300 bg-white px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-600 hover:bg-zinc-50"
          >
            <ChevronLeft size={14} /> Voltar
          </button>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-[#2563eb]">
                <Settings size={14} /> Configurações do campeonato
              </div>
              <h1 className="text-[24px] font-semibold uppercase tracking-tight text-[#111827] md:text-[30px]">
                Editar campeonato
              </h1>
              <p className="mt-1 text-[12px] text-zinc-500">
                Altere status, datas, vagas, valores e informações principais do campeonato.
              </p>
            </div>

            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="inline-flex h-9 items-center justify-center gap-2 bg-[#2563eb] px-4 text-[12px] font-medium uppercase tracking-wide text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>

        {erro && (
          <div className="border border-red-200 bg-red-50 p-3 text-[12px] font-medium text-red-700">
            {erro}
          </div>
        )}


        <section className="grid gap-3 border border-zinc-200 bg-white p-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-[#2563eb]">
              <ExternalLink size={14} /> Links rápidos do campeonato
            </div>
            <p className="text-[12px] text-zinc-500">Use esses links na descrição dos grupos, WhatsApp, Discord ou Instagram.</p>
          </div>

          <button type="button" onClick={() => copiar(linkEscala)} className="flex h-10 items-center justify-center gap-2 border border-zinc-300 bg-white px-3 text-[11px] font-medium uppercase text-[#142340] hover:bg-zinc-50">
            <Copy size={14} /> Copiar link de escalação
          </button>

          <button type="button" onClick={() => copiar(linkCompleto)} className="flex h-10 items-center justify-center gap-2 border border-zinc-300 bg-white px-3 text-[11px] font-medium uppercase text-[#142340] hover:bg-zinc-50">
            <Copy size={14} /> Copiar link completo
          </button>

          {linkWhatsApp ? (
            <Link href={linkWhatsApp} target="_blank" className="flex h-10 items-center justify-center gap-2 bg-[#16a34a] px-3 text-[11px] font-medium uppercase text-white hover:bg-[#15803d]">
              <MessageCircle size={14} /> Testar WhatsApp
            </Link>
          ) : (
            <div className="flex h-10 items-center justify-center border border-dashed border-zinc-300 px-3 text-[11px] font-medium uppercase text-zinc-400">Informe WhatsApp abaixo</div>
          )}
        </section>

        <section className="grid gap-3 border border-zinc-200 bg-white p-4 md:grid-cols-2">
          <div className="md:col-span-2 border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Contatos WhatsApp para venda de vagas</span>
              {form.whatsapp_contatos.length < 3 ? (
                <button
                  type="button"
                  onClick={() => atualizar('whatsapp_contatos', [...form.whatsapp_contatos, { nome: '', numero: '' }])}
                  className="h-8 border border-zinc-300 bg-white px-3 text-[10px] font-black uppercase text-zinc-700"
                >
                  + Contato
                </button>
              ) : null}
            </div>

            <div className="space-y-2">
              {form.whatsapp_contatos.map((contato: WhatsContato, index: number) => (
                <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={contato.nome}
                    onChange={(event) => {
                      const proximos = [...form.whatsapp_contatos]
                      proximos[index] = { ...proximos[index], nome: event.target.value }
                      atualizar('whatsapp_contatos', proximos)
                    }}
                    placeholder={`Nome do vendedor ${index + 1}`}
                    className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                  />
                  <input
                    value={contato.numero}
                    onChange={(event) => {
                      const proximos = [...form.whatsapp_contatos]
                      proximos[index] = { ...proximos[index], numero: event.target.value }
                      atualizar('whatsapp_contatos', proximos)
                      if (index === 0) atualizar('whatsapp_suporte', event.target.value)
                    }}
                    placeholder="5591999999999"
                    className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const proximos = form.whatsapp_contatos.filter((_: WhatsContato, i: number) => i !== index)
                      atualizar('whatsapp_contatos', proximos.length ? proximos : [{ nome: '', numero: '' }])
                    }}
                    className="h-9 border border-red-200 bg-white px-3 text-[10px] font-black uppercase text-red-600"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="md:col-span-2">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Nome</span>
            <input
              value={form.nome}
              onChange={(event) => atualizar('nome', event.target.value)}
              className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
            />
          </label>

          <label>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Status</span>
            <select
              value={form.status}
              onChange={(event) => atualizar('status', event.target.value)}
              className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium uppercase text-[#142340] outline-none focus:border-[#2563eb]"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Vagas</span>
            <input
              type="number"
              value={form.vagas}
              onChange={(event) => atualizar('vagas', event.target.value)}
              className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
            />
          </label>

          <label>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Valor da vaga</span>
            <input
              type="number"
              step="0.01"
              value={form.valor_vaga}
              onChange={(event) => atualizar('valor_vaga', event.target.value)}
              className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
            />
          </label>

          <label>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Premiação</span>
            <input
              type="number"
              step="0.01"
              value={form.valor_premiacao}
              onChange={(event) => atualizar('valor_premiacao', event.target.value)}
              className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
            />
          </label>

          <label>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Início</span>
            <input
              type="datetime-local"
              value={form.data_inicio}
              onChange={(event) => atualizar('data_inicio', event.target.value)}
              className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
            />
          </label>

          <label>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Fim</span>
            <input
              type="datetime-local"
              value={form.data_fim}
              onChange={(event) => atualizar('data_fim', event.target.value)}
              className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
            />
          </label>

          <label>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Abertura das inscrições</span>
            <input
              type="datetime-local"
              value={form.data_abertura_inscricoes}
              onChange={(event) => atualizar('data_abertura_inscricoes', event.target.value)}
              className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
            />
          </label>

          <label>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Encerramento das inscrições</span>
            <input
              type="datetime-local"
              value={form.data_encerramento_inscricoes}
              onChange={(event) => atualizar('data_encerramento_inscricoes', event.target.value)}
              className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
            />
          </label>


          <label className="hidden">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">WhatsApp do responsável para compra de vaga</span>
            <input
              value={form.whatsapp_suporte}
              onChange={(event) => atualizar('whatsapp_suporte', event.target.value)}
              placeholder="Ex: 5591999999999"
              className="h-9 w-full border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Descrição</span>
            <textarea
              value={form.descricao}
              onChange={(event) => atualizar('descricao', event.target.value)}
              className="min-h-[90px] w-full border border-zinc-300 bg-white px-3 py-2 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
            />
          </label>
        </section>
      </div>
    </main>
  )
}
