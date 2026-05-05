'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'

type WalletKyc = {
 status?: string | null
 nome_completo?: string | null
 cpf?: string | null
 telefone?: string | null
 data_nascimento?: string | null
 maioridade_confirmada?: boolean | null
 termos_aceitos?: boolean | null
 motivo_reprovacao?: string | null
 score_verificacao?: number | null
 resultado_automatico?: string | null
 revisao_manual_necessaria?: boolean | null
 tipo_documento?: string | null
 numero_documento?: string | null
 orgao_emissor?: string | null
 uf_documento?: string | null
 data_emissao_documento?: string | null
 documento_frente_url?: string | null
 documento_verso_url?: string | null
 selfie_url?: string | null
 selfie_status?: string | null
}

type UsuarioPagamento = {
 nome?: string | null
 cpf?: string | null
 chave_pix?: string | null
 tipo_chave?: string | null
}

function onlyDigits(value: string) {
 return value.replace(/\D/g, '')
}

function getStatusCard(status?: string | null) {
 if (status === 'verificada') return { cor: 'bg-[#e7ffe1]', titulo: 'Aprovado automaticamente' }
 if (status === 'em_analise' || status === 'pendente') return { cor: 'bg-[#fff3d6]', titulo: 'Em análise' }
 if (status === 'rejeitada') return { cor: 'bg-[#ffe5e0]', titulo: 'Reprovado' }
 return { cor: 'bg-[#f3f3ef]', titulo: 'Não iniciado' }
}

function getSelfieStatus(selfieStatus?: string | null, selfieUrl?: string | null) {
 if (selfieStatus === 'enviada' || selfieUrl) {
 return {
 titulo: 'Selfie recebida',
 cor: 'border-lime-500 bg-lime-50 text-lime-800',
 }
 }

 return {
 titulo: 'Selfie pendente',
 cor: 'border-amber-500 bg-amber-50 text-amber-800',
 }
}

export default function PagamentoPerfil() {
 const [currentUserId, setCurrentUserId] = useState('')
 const [qrDataUrl, setQrDataUrl] = useState('')
 const [nome, setNome] = useState('')
 const [cpf, setCpf] = useState('')
 const [telefone, setTelefone] = useState('')
 const [dataNascimento, setDataNascimento] = useState('')
 const [chave, setChave] = useState('')
 const [tipo, setTipo] = useState('cpf')
 const [maioridade, setMaioridade] = useState(false)
 const [termos, setTermos] = useState(false)

 const [tipoDocumento, setTipoDocumento] = useState('rg')
 const [numeroDocumento, setNumeroDocumento] = useState('')
 const [orgaoEmissor, setOrgaoEmissor] = useState('')
 const [ufDocumento, setUfDocumento] = useState('')
 const [dataEmissaoDocumento, setDataEmissaoDocumento] = useState('')

 const [documentoFrente, setDocumentoFrente] = useState<File | null>(null)
 const [documentoVerso, setDocumentoVerso] = useState<File | null>(null)
 const [selfie, setSelfie] = useState<File | null>(null)

 const [kyc, setKyc] = useState<WalletKyc | null>(null)
 const [mensagem, setMensagem] = useState('')
 const [salvando, setSalvando] = useState(false)
 const [atualizandoSelfie, setAtualizandoSelfie] = useState(false)

 const statusCard = useMemo(() => getStatusCard(kyc?.status), [kyc?.status])
 const selfieStatusCard = useMemo(
 () => getSelfieStatus(kyc?.selfie_status, kyc?.selfie_url),
 [kyc?.selfie_status, kyc?.selfie_url]
 )

 const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://192.168.2.50:3000'
 const mobileSelfieUrl = currentUserId ? `${baseUrl}/kyc/selfie?user=${currentUserId}` : ''

 const podeEnviar = useMemo(() => {
 return (
 nome.trim().length >= 6 &&
 onlyDigits(cpf).length === 11 &&
 telefone.trim().length >= 10 &&
 !!dataNascimento &&
 maioridade &&
 termos &&
 !!chave.trim() &&
 !!tipoDocumento &&
 !!numeroDocumento.trim() &&
 !!orgaoEmissor.trim() &&
 !!ufDocumento.trim() &&
 !!dataEmissaoDocumento &&
 (!!documentoFrente || !!kyc?.documento_frente_url) &&
 (!!documentoVerso || !!kyc?.documento_verso_url) &&
 (!!selfie || !!kyc?.selfie_url)
 )
 }, [
 nome,
 cpf,
 telefone,
 dataNascimento,
 maioridade,
 termos,
 chave,
 tipoDocumento,
 numeroDocumento,
 orgaoEmissor,
 ufDocumento,
 dataEmissaoDocumento,
 documentoFrente,
 documentoVerso,
 selfie,
 kyc,
 ])

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
 const dataUrl = await QRCode.toDataURL(mobileSelfieUrl, {
 width: 256,
 margin: 1,
 })

 if (ativo) {
 setQrDataUrl(dataUrl)
 }
 } catch (error) {
 console.error('Erro ao gerar QR Code', error)
 if (ativo) {
 setQrDataUrl('')
 }
 }
 }

 gerarQr()

 return () => {
 ativo = false
 }
 }, [mobileSelfieUrl])

 async function uploadArquivo(uid: string, pasta: string, arquivo: File | null) {
 if (!arquivo) return null

 const ext = arquivo.name.split('.').pop() || 'bin'
 const nome = `${uid}-${Date.now()}-${pasta}.${ext}`
 const caminho = `kyc/${nome}`

 const { error } = await supabase.storage.from('documentos').upload(caminho, arquivo, { upsert: true })

 if (error) throw error

 const { data } = supabase.storage.from('documentos').getPublicUrl(caminho)
 return data.publicUrl
 }

 async function carregar() {
 const { data } = await supabase.auth.getUser()
 const uid = data.user?.id
 if (!uid) return

 setCurrentUserId(uid)

 const [pagRes, kycRes] = await Promise.all([
 supabase.from('usuarios_pagamento').select('*').eq('user_id', uid).single(),
 supabase.from('wallet_kyc').select('*').eq('user_id', uid).single(),
 ])

 const pag = pagRes.data as UsuarioPagamento | null
 const k = kycRes.data as WalletKyc | null

 if (pag) {
 setNome(pag.nome || '')
 setCpf(pag.cpf || '')
 setChave(pag.chave_pix || '')
 setTipo(pag.tipo_chave || 'cpf')
 }

 if (k) {
 setKyc(k)
 setTelefone(k.telefone || '')
 setDataNascimento(k.data_nascimento || '')
 setMaioridade(Boolean(k.maioridade_confirmada))
 setTermos(Boolean(k.termos_aceitos))
 if (k.nome_completo) setNome(k.nome_completo)
 if (k.cpf) setCpf(k.cpf)
 setTipoDocumento(k.tipo_documento || 'rg')
 setNumeroDocumento(k.numero_documento || '')
 setOrgaoEmissor(k.orgao_emissor || '')
 setUfDocumento(k.uf_documento || '')
 setDataEmissaoDocumento(k.data_emissao_documento || '')
 }
 }

 async function atualizarStatusSelfie() {
 setAtualizandoSelfie(true)
 setMensagem('')
 try {
 await carregar()
 setMensagem('Status da selfie atualizado.')
 } catch (error: any) {
 setMensagem(error?.message || 'Não foi possível atualizar o status da selfie.')
 } finally {
 setAtualizandoSelfie(false)
 }
 }

 async function salvar() {
 setMensagem('')

 if (!podeEnviar) {
 setMensagem('Preencha todos os campos e envie documento frente, verso e selfie.')
 return
 }

 setSalvando(true)
 try {
 const { data: authData } = await supabase.auth.getUser()
 const uid = authData.user?.id
 if (!uid) throw new Error('Usuário não autenticado')

 const [frenteUrl, versoUrl, selfieUrl] = await Promise.all([
 uploadArquivo(uid, 'documento-frente', documentoFrente),
 uploadArquivo(uid, 'documento-verso', documentoVerso),
 uploadArquivo(uid, 'selfie', selfie),
 ])

 const documentoFrenteUrl = frenteUrl || kyc?.documento_frente_url || null
 const documentoVersoUrl = versoUrl || kyc?.documento_verso_url || null
 const selfieFinalUrl = selfieUrl || kyc?.selfie_url || null

 const { error: pagamentoError } = await supabase.from('usuarios_pagamento').upsert({
 user_id: uid,
 nome,
 cpf,
 chave_pix: chave,
 tipo_chave: tipo,
 })

 if (pagamentoError) throw pagamentoError

 const payloadKyc = {
 user_id: uid,
 status: 'pendente',
 nome_completo: nome,
 cpf: onlyDigits(cpf),
 telefone,
 data_nascimento: dataNascimento,
 maioridade_confirmada: maioridade,
 termos_aceitos: termos,
 tipo_documento: tipoDocumento,
 numero_documento: numeroDocumento,
 orgao_emissor: orgaoEmissor,
 uf_documento: ufDocumento,
 data_emissao_documento: dataEmissaoDocumento,
 documento_frente_url: documentoFrenteUrl,
 documento_verso_url: documentoVersoUrl,
 selfie_url: selfieFinalUrl,
 documento_status: documentoFrenteUrl && documentoVersoUrl ? 'enviado' : 'nao_enviado',
 selfie_status: selfieFinalUrl ? 'enviada' : 'nao_enviada',
 tipo_verificacao: 'documental',
 updated_at: new Date().toISOString(),
 }

 const { error: kycError } = await supabase.from('wallet_kyc').upsert(payloadKyc)
 if (kycError) throw kycError

 setMensagem('Dados e documentos enviados. Sua carteira foi enviada para análise.')
 setDocumentoFrente(null)
 setDocumentoVerso(null)
 setSelfie(null)
 await carregar()
 } catch (error: any) {
 setMensagem(error?.message || 'Não foi possível salvar os dados.')
 } finally {
 setSalvando(false)
 }
 }

 return (
 <div className="mx-auto max-w-5xl p-8">
 <div className="mb-6">
 <h1 className="text-3xl font-semibold uppercase text-[#142340]">Dados Pix e carteira</h1>
 <p className="mt-2 text-sm font-semibold text-zinc-600">
 Complete os dados e envie documento frente, verso e selfie para validação.
 </p>
 </div>

 <div className={`mb-5 border border-zinc-200 p-5 ${statusCard.cor}`}>
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Status atual</div>
 <div className="mt-2 text-lg font-semibold uppercase text-[#142340]">{statusCard.titulo}</div>
 {kyc?.score_verificacao != null ? (
 <div className="mt-2 text-sm font-semibold text-zinc-700">Score automático: {kyc.score_verificacao}</div>
 ) : null}
 {kyc?.motivo_reprovacao ? (
 <div className="mt-2 text-sm font-semibold text-red-700">Motivo: {kyc.motivo_reprovacao}</div>
 ) : null}
 </div>

 <div className="grid gap-5">
 <div className="border border-zinc-200 bg-white p-5">
 <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 Identificação
 </div>

 <div className="grid gap-3 md:grid-cols-2">
 <input
 placeholder="Nome completo"
 value={nome}
 onChange={(e) => setNome(e.target.value)}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] placeholder:text-zinc-500 outline-none"
 />
 <input
 placeholder="CPF"
 value={cpf}
 onChange={(e) => setCpf(e.target.value)}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] placeholder:text-zinc-500 outline-none"
 />
 <input
 placeholder="Telefone"
 value={telefone}
 onChange={(e) => setTelefone(e.target.value)}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] placeholder:text-zinc-500 outline-none"
 />
 <input
 type="date"
 value={dataNascimento}
 onChange={(e) => setDataNascimento(e.target.value)}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] outline-none"
 />
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-5">
 <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Dados Pix</div>

 <div className="grid gap-3 md:grid-cols-[1fr,220px]">
 <input
 placeholder="Chave Pix"
 value={chave}
 onChange={(e) => setChave(e.target.value)}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] placeholder:text-zinc-500 outline-none"
 />

 <select
 value={tipo}
 onChange={(e) => setTipo(e.target.value)}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] outline-none"
 >
 <option value="cpf">CPF</option>
 <option value="email">Email</option>
 <option value="telefone">Telefone</option>
 <option value="aleatoria">Aleatória</option>
 </select>
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-5">
 <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Documento</div>

 <div className="grid gap-3 md:grid-cols-2">
 <select
 value={tipoDocumento}
 onChange={(e) => setTipoDocumento(e.target.value)}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] outline-none"
 >
 <option value="rg">RG</option>
 <option value="cnh">CNH</option>
 <option value="rne">RNE</option>
 </select>
 <input
 placeholder="Número do documento"
 value={numeroDocumento}
 onChange={(e) => setNumeroDocumento(e.target.value)}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] placeholder:text-zinc-500 outline-none"
 />
 <input
 placeholder="Órgão emissor"
 value={orgaoEmissor}
 onChange={(e) => setOrgaoEmissor(e.target.value)}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] placeholder:text-zinc-500 outline-none"
 />
 <input
 placeholder="UF"
 value={ufDocumento}
 onChange={(e) => setUfDocumento(e.target.value.toUpperCase())}
 maxLength={2}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] placeholder:text-zinc-500 outline-none"
 />
 <input
 type="date"
 value={dataEmissaoDocumento}
 onChange={(e) => setDataEmissaoDocumento(e.target.value)}
 className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] outline-none"
 />
 </div>

 <div className="mt-4 grid gap-3 md:grid-cols-3">
 <div className="border border-zinc-200 bg-[#f8f8f5] p-4">
 <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 Documento frente
 </div>
 <input
 type="file"
 accept="image/*,.pdf"
 onChange={(e) => setDocumentoFrente(e.target.files?.[0] || null)}
 className="block w-full text-sm font-semibold text-[#142340]"
 />
 {kyc?.documento_frente_url ? (
 <a
 href={kyc.documento_frente_url}
 target="_blank"
 rel="noreferrer"
 className="mt-2 inline-block text-sm font-semibold text-blue-700"
 >
 Ver arquivo atual
 </a>
 ) : null}
 </div>

 <div className="border border-zinc-200 bg-[#f8f8f5] p-4">
 <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 Documento verso
 </div>
 <input
 type="file"
 accept="image/*,.pdf"
 onChange={(e) => setDocumentoVerso(e.target.files?.[0] || null)}
 className="block w-full text-sm font-semibold text-[#142340]"
 />
 {kyc?.documento_verso_url ? (
 <a
 href={kyc.documento_verso_url}
 target="_blank"
 rel="noreferrer"
 className="mt-2 inline-block text-sm font-semibold text-blue-700"
 >
 Ver arquivo atual
 </a>
 ) : null}
 </div>

 <div className="border border-zinc-200 bg-[#f8f8f5] p-4">
 <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Selfie</div>
 <input
 type="file"
 accept="image/*"
 onChange={(e) => setSelfie(e.target.files?.[0] || null)}
 className="block w-full text-sm font-semibold text-[#142340]"
 />
 {kyc?.selfie_url ? (
 <a
 href={kyc.selfie_url}
 target="_blank"
 rel="noreferrer"
 className="mt-2 inline-block text-sm font-semibold text-blue-700"
 >
 Ver selfie atual
 </a>
 ) : null}

 <div className={`mt-4 border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${selfieStatusCard.cor}`}>
 {selfieStatusCard.titulo}
 </div>

 <div className="mt-4 border border-zinc-200 bg-white p-3">
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 Selfie por celular
 </div>
 <p className="mt-2 text-xs font-semibold text-zinc-600">
 Escaneie para abrir a captura guiada com enquadramento facial.
 </p>

 {qrDataUrl ? (
 <img src={qrDataUrl} alt="QR Code da selfie" className="mt-3 h-44 w-44 border border-zinc-200" />
 ) : (
 <div className="mt-3 border border-dashed border-zinc-400 p-4 text-xs font-semibold text-zinc-500">
 Gere login na conta para habilitar o QR.
 </div>
 )}

 {mobileSelfieUrl ? (
 <a
 href={mobileSelfieUrl}
 target="_blank"
 rel="noreferrer"
 className="mt-3 inline-block text-xs font-semibold text-blue-700"
 >
 Abrir link direto no celular
 </a>
 ) : null}

 <button
 type="button"
 onClick={atualizarStatusSelfie}
 disabled={atualizandoSelfie}
 className="mt-3 h-10 w-full border border-zinc-200 bg-white text-[10px] font-semibold uppercase tracking-[0.14em] text-[#142340] disabled:opacity-60"
 >
 {atualizandoSelfie ? 'Atualizando...' : 'Atualizar status da selfie'}
 </button>
 </div>
 </div>
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-5">
 <div className="space-y-3">
 <label className="flex items-start gap-3 text-sm font-semibold text-[#142340]">
 <input type="checkbox" checked={maioridade} onChange={(e) => setMaioridade(e.target.checked)} />
 <span>Confirmo que sou maior de 18 anos.</span>
 </label>

 <label className="flex items-start gap-3 text-sm font-semibold text-[#142340]">
 <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} />
 <span>Concordo com a verificação de identidade e com os termos financeiros da plataforma.</span>
 </label>
 </div>

 <button
 onClick={salvar}
 disabled={!podeEnviar || salvando}
 className="mt-5 h-12 w-full border border-zinc-200 bg-[#2563eb] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340] disabled:opacity-60"
 >
 {salvando ? 'Enviando...' : 'Enviar dados e documentos'}
 </button>

 {mensagem ? <p className="mt-3 text-sm font-semibold text-zinc-700">{mensagem}</p> : null}
 </div>
 </div>
 </div>
 )
}
