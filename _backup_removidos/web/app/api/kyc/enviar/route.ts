import { NextResponse } from 'next/server'
import { getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

type Body = {
  nome?: string
  cpf?: string
  telefone?: string
  dataNascimento?: string
  chavePix?: string
  tipoChave?: string
  maioridade?: boolean
  termos?: boolean
}

function digits(value?: string | null) {
  return String(value || '').replace(/\D/g, '')
}

function idadeAnos(dataNascimento?: string | null) {
  if (!dataNascimento) return 0
  const nascimento = new Date(dataNascimento)
  if (Number.isNaN(nascimento.getTime())) return 0

  const hoje = new Date()
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const m = hoje.getMonth() - nascimento.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade -= 1
  return idade
}

function avaliarAutomaticamente(input: {
  nome: string
  cpf: string
  telefone: string
  dataNascimento: string
  chavePix: string
  tipoChave: string
  maioridade: boolean
  termos: boolean
}) {
  const idade = idadeAnos(input.dataNascimento)
  const cpfComoChave = input.tipoChave === 'cpf'
  const chavePixDigits = digits(input.chavePix)

  let score = 0
  const flags: string[] = []

  if (input.nome.trim().length >= 10) score += 25
  else flags.push('nome_curto')

  if (input.cpf.length === 11) score += 20
  else flags.push('cpf_invalido')

  if (input.telefone.trim().length >= 10) score += 10
  else flags.push('telefone_invalido')

  if (idade >= 18 && input.maioridade) score += 20
  else flags.push('menor_ou_nao_confirmado')

  if (input.termos) score += 5
  else flags.push('termos_nao_aceitos')

  if (!input.chavePix) {
    flags.push('sem_chave_pix')
  } else {
    score += 5
  }

  if (cpfComoChave && chavePixDigits === input.cpf) {
    score += 15
  } else if (cpfComoChave && chavePixDigits !== input.cpf) {
    flags.push('cpf_diferente_da_chave_pix')
  }

  let status = 'pendente'
  let motivoReprovacao: string | null = null
  let revisaoManualNecessaria = false

  if (idade < 18 || !input.maioridade) {
    status = 'rejeitada'
    motivoReprovacao = 'Usuário menor de idade ou sem confirmação de maioridade.'
  } else if (flags.includes('cpf_invalido')) {
    status = 'rejeitada'
    motivoReprovacao = 'CPF inválido.'
  } else if (score >= 80 && flags.length === 0) {
    status = 'verificada'
  } else {
    status = 'em_analise'
    revisaoManualNecessaria = true
  }

  return {
    score,
    status,
    flags,
    idade,
    motivoReprovacao,
    revisaoManualNecessaria,
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearerToken(req.headers.get('authorization'))

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const body = (await req.json()) as Body

    const nome = String(body.nome || '').trim()
    const cpf = digits(body.cpf)
    const telefone = String(body.telefone || '').trim()
    const dataNascimento = String(body.dataNascimento || '').trim()
    const chavePix = String(body.chavePix || '').trim()
    const tipoChave = String(body.tipoChave || 'cpf').trim()
    const maioridade = Boolean(body.maioridade)
    const termos = Boolean(body.termos)

    if (nome.length < 6) {
      return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 })
    }

    if (cpf.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
    }

    if (!telefone || !dataNascimento) {
      return NextResponse.json({ error: 'Preencha telefone e data de nascimento.' }, { status: 400 })
    }

    if (!maioridade || !termos) {
      return NextResponse.json(
        { error: 'Confirme maioridade e aceite dos termos.' },
        { status: 400 }
      )
    }

    const { data: cpfExistente } = await supabaseAdmin
      .from('wallet_kyc')
      .select('user_id')
      .eq('cpf', cpf)
      .neq('user_id', user.id)
      .maybeSingle()

    if (cpfExistente?.user_id) {
      return NextResponse.json(
        { error: 'Esse CPF já está vinculado a outra carteira.' },
        { status: 409 }
      )
    }

    const avaliacao = avaliarAutomaticamente({
      nome,
      cpf,
      telefone,
      dataNascimento,
      chavePix,
      tipoChave,
      maioridade,
      termos,
    })

    const { error: pagamentoError } = await supabaseAdmin.from('usuarios_pagamento').upsert({
      user_id: user.id,
      nome,
      cpf,
      chave_pix: chavePix || null,
      tipo_chave: tipoChave || null,
    })

    if (pagamentoError) {
      return NextResponse.json({ error: pagamentoError.message }, { status: 400 })
    }

    const payloadKyc = {
      user_id: user.id,
      status: avaliacao.status,
      nome_completo: nome,
      cpf,
      telefone,
      data_nascimento: dataNascimento || null,
      maioridade_confirmada: maioridade,
      termos_aceitos: termos,
      documento_status: 'nao_enviado',
      selfie_status: 'nao_enviada',
      tipo_verificacao: 'automatica_basica',
      motivo_reprovacao: avaliacao.motivoReprovacao,
      score_verificacao: avaliacao.score,
      resultado_automatico: avaliacao.status,
      flags_risco: avaliacao.flags,
      revisao_manual_necessaria: avaliacao.revisaoManualNecessaria,
      verificado_em: avaliacao.status === 'verificada' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    const { error: kycError } = await supabaseAdmin.from('wallet_kyc').upsert(payloadKyc)

    if (kycError) {
      return NextResponse.json({ error: kycError.message }, { status: 400 })
    }

    const { error: walletError } = await supabaseAdmin.from('wallet_saldo').upsert({
      user_id: user.id,
      saldo: 0,
      saldo_retido: 0,
      updated_at: new Date().toISOString(),
    })

    if (walletError) {
      console.error('wallet_saldo upsert', walletError)
    }

    return NextResponse.json({
      ok: true,
      status: avaliacao.status,
      score: avaliacao.score,
      flags: avaliacao.flags,
      revisaoManualNecessaria: avaliacao.revisaoManualNecessaria,
    })
  } catch (error) {
    console.error('POST /api/kyc/enviar', error)
    return NextResponse.json({ error: 'Não foi possível enviar a verificação.' }, { status: 500 })
  }
}
