'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type UsuarioPagamento = {
  user_id?: string | null
  nome?: string | null
  cpf?: string | null
  chave_pix?: string | null
  tipo_chave?: string | null
  updated_at?: string | null
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function validarChavePix(tipo: string, chave: string) {
  const valor = chave.trim()
  if (!valor) return false

  if (tipo === 'cpf') return onlyDigits(valor).length === 11
  if (tipo === 'cnpj') return onlyDigits(valor).length === 14
  if (tipo === 'telefone') return onlyDigits(valor).length >= 10 && onlyDigits(valor).length <= 13
  if (tipo === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
  if (tipo === 'aleatoria') return valor.length >= 20

  return valor.length >= 3
}

export default function PagamentoPerfil() {
  const [currentUserId, setCurrentUserId] = useState('')
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [chave, setChave] = useState('')
  const [tipo, setTipo] = useState('cpf')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const podeSalvar = useMemo(() => {
    return nome.trim().length >= 3 && onlyDigits(cpf).length === 11 && validarChavePix(tipo, chave)
  }, [nome, cpf, tipo, chave])

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setCarregando(true)
    setErro('')

    const { data } = await supabase.auth.getUser()
    const uid = data.user?.id

    if (!uid) {
      setErro('Você precisa estar logado para editar os dados de pagamento.')
      setCarregando(false)
      return
    }

    setCurrentUserId(uid)

    const { data: pagamento, error } = await supabase
      .from('usuarios_pagamento')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()

    if (error) {
      console.error(error)
      setErro('Não foi possível carregar seus dados de pagamento.')
      setCarregando(false)
      return
    }

    const dados = pagamento as UsuarioPagamento | null

    if (dados) {
      setNome(dados.nome || '')
      setCpf(dados.cpf || '')
      setChave(dados.chave_pix || '')
      setTipo(dados.tipo_chave || 'cpf')
    }

    setCarregando(false)
  }

  async function salvar() {
    if (!currentUserId || !podeSalvar) return

    setSalvando(true)
    setMensagem('')
    setErro('')

    try {
      const payload = {
        user_id: currentUserId,
        nome: nome.trim(),
        cpf: onlyDigits(cpf),
        chave_pix: chave.trim(),
        tipo_chave: tipo,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('usuarios_pagamento')
        .upsert(payload, { onConflict: 'user_id' })

      if (error) throw error

      setMensagem('Dados de recebimento PIX salvos com sucesso.')
    } catch (error) {
      console.error(error)
      setErro('Não foi possível salvar os dados de pagamento.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f3eb] px-4 py-8 text-[#142340]">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f5a623]">Perfil</p>
          <h1 className="mt-2 text-3xl font-semibold uppercase">Dados de recebimento PIX</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Informe os dados que serão usados para pagamentos externos, como repasses de premiação ou valores destinados ao organizador. O sistema usa pagamento externo via PIX.
          </p>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          {carregando ? (
            <div className="rounded-2xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-600">Carregando dados...</div>
          ) : null}

          {erro ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{erro}</div>
          ) : null}

          {mensagem ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{mensagem}</div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Nome completo</span>
              <input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-[#f5a623]"
                placeholder="Nome do recebedor"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">CPF</span>
              <input
                value={cpf}
                onChange={(event) => setCpf(event.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-[#f5a623]"
                placeholder="Somente números"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Tipo da chave</span>
              <select
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-[#f5a623]"
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="telefone">Telefone</option>
                <option value="aleatoria">Chave aleatória</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Chave PIX</span>
              <input
                value={chave}
                onChange={(event) => setChave(event.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-[#f5a623]"
                placeholder="Digite sua chave PIX"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Esses dados não confirmam pagamento automaticamente. A confirmação de inscrição continua sendo feita pelo fluxo de cobrança PIX do sistema.
            </p>

            <button
              type="button"
              onClick={salvar}
              disabled={!podeSalvar || salvando || carregando}
              className="rounded-2xl bg-[#142340] px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar dados'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
