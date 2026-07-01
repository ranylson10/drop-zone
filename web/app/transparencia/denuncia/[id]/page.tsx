'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  ShieldAlert,
  Loader2,
  MessageCircleMore,
  Paperclip,
  Send,
  CheckCircle2,
  X,
} from 'lucide-react'

type Denuncia = {
  id: string
  campeonato_id: string | null
  denunciante_user_id: string
  tipo_alvo: string
  equipe_id: string | null
  jogador_id: string | null
  alvo_user_id?: string | null
  produtora_id?: string | null
  perfil_jogo_id?: string | null
  categoria: string | null
  titulo: string
  descricao: string
  status: string | null
  prioridade: string | null
  publica: boolean | null
  anonima_para_publico: boolean | null
  created_at: string | null
  primeira_resposta_em?: string | null
  resolvida_em?: string | null
  campeonatos?: { id?: string; nome?: string | null; logo_url?: string | null } | null
}

type Prova = {
  id: string
  denuncia_id: string
  nome_arquivo: string
  url_arquivo: string
  mime_type: string | null
  tipo_arquivo: string | null
  uploaded_by_user_id: string
  created_at: string | null
}

type Resposta = {
  id: string
  denuncia_id: string
  autor_tipo: string
  autor_user_id: string | null
  mensagem: string
  interno: boolean
  created_at: string | null
}

function fmt(valor?: string | null) {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function labelStatus(status?: string | null) {
  const s = String(status || 'aberta')
  if (s === 'respondida') return 'Respondida'
  if (s === 'resolvida') return 'Resolvida'
  if (s === 'recusada') return 'Recusada'
  if (s === 'arquivada') return 'Arquivada'
  return 'Aberta'
}

function tipoAlvoLabel(tipo?: string | null) {
  switch (tipo) {
    case 'campeonato':
      return 'Campeonato'
    case 'equipe':
      return 'Equipe'
    case 'perfil_jogo':
      return 'Perfil de jogo'
    case 'usuario':
      return 'Usuário'
    case 'produtora':
      return 'Produtora'
    case 'jogador':
      return 'Jogador'
    default:
      return 'Alvo'
  }
}

export default function DetalheDenunciaPage() {
  const params = useParams<{ id: string }>()
  const denunciaId = String(params?.id || '')

  const [userId, setUserId] = useState<string | null>(null)
  const [denuncia, setDenuncia] = useState<Denuncia | null>(null)
  const [provas, setProvas] = useState<Prova[]>([])
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [mensagem, setMensagem] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const souDenunciante = !!userId && !!denuncia && denuncia.denunciante_user_id === userId

  const autorTipoResposta = useMemo(() => {
    if (!denuncia || !userId) return 'publico'
    if (souDenunciante) return 'denunciante'
    return 'denunciado'
  }, [denuncia, userId, souDenunciante])

  async function carregar() {
    setLoading(true)
    setErro('')

    try {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id || null
      setUserId(uid)

      const { data: denunciaData, error: denunciaError } = await supabase
        .from('denuncias_campeonato')
        .select(
          `
          *,
          campeonatos (
            id,
            nome,
            logo_url
          )
        `
        )
        .eq('id', denunciaId)
        .single()

      if (denunciaError) throw denunciaError

      const [{ data: provasData, error: provasError }, { data: respostasData, error: respostasError }] =
        await Promise.all([
          supabase.from('denuncias_provas').select('*').eq('denuncia_id', denunciaId).order('created_at', { ascending: true }),
          supabase
            .from('denuncias_respostas')
            .select('*')
            .eq('denuncia_id', denunciaId)
            .eq('interno', false)
            .order('created_at', { ascending: true }),
        ])

      if (provasError) throw provasError
      if (respostasError) throw respostasError

      setDenuncia(denunciaData as Denuncia)
      setProvas((provasData || []) as Prova[])
      setRespostas((respostasData || []) as Resposta[])
    } catch (err: any) {
      console.error(err)
      setErro(err?.message || 'Não foi possível carregar a denúncia.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (denunciaId) carregar()
  }, [denunciaId])

  async function enviarResposta(e: React.FormEvent) {
    e.preventDefault()

    if (!userId) {
      setErro('Você precisa estar logado para responder.')
      return
    }

    if (!mensagem.trim() && arquivos.length === 0) {
      setErro('Escreva uma resposta ou anexe uma prova.')
      return
    }

    setSalvando(true)
    setErro('')

    try {
      if (mensagem.trim()) {
        const { error } = await supabase.from('denuncias_respostas').insert({
          denuncia_id: denunciaId,
          autor_tipo: autorTipoResposta,
          autor_user_id: userId,
          mensagem: mensagem.trim(),
          interno: false,
        })

        if (error) throw error
      }

      if (arquivos.length > 0) {
        const provasParaSalvar: any[] = []

        for (const arquivo of arquivos) {
          const ext = arquivo.name.split('.').pop() || 'bin'
          const caminho = `denuncias/${denunciaId}/respostas/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('documentos')
            .upload(caminho, arquivo, { upsert: false })

          if (uploadError) throw uploadError

          const { data: publicData } = supabase.storage.from('documentos').getPublicUrl(caminho)

          provasParaSalvar.push({
            denuncia_id: denunciaId,
            nome_arquivo: arquivo.name,
            url_arquivo: publicData.publicUrl,
            mime_type: arquivo.type || null,
            tamanho_bytes: arquivo.size,
            tipo_arquivo: arquivo.type?.startsWith('image/') ? 'imagem' : arquivo.type?.startsWith('video/') ? 'video' : 'arquivo',
            visibilidade: 'publica',
            uploaded_by_user_id: userId,
          })
        }

        const { error: provasError } = await supabase.from('denuncias_provas').insert(provasParaSalvar)
        if (provasError) throw provasError
      }

      await supabase
        .from('denuncias_campeonato')
        .update({
          status: autorTipoResposta === 'denunciado' ? 'aguardando_resposta_usuario' : 'aguardando_resposta_organizacao',
          primeira_resposta_em:
            autorTipoResposta === 'denunciado' && !denuncia?.primeira_resposta_em
              ? new Date().toISOString()
              : denuncia?.primeira_resposta_em,
        })
        .eq('id', denunciaId)

      setMensagem('')
      setArquivos([])
      await carregar()
    } catch (err: any) {
      console.error(err)
      setErro(err?.message || 'Não foi possível enviar a resposta.')
    } finally {
      setSalvando(false)
    }
  }

  async function marcarResolvida() {
    if (!userId) return
    setSalvando(true)
    setErro('')

    try {
      const { error } = await supabase
        .from('denuncias_campeonato')
        .update({
          status: 'resolvida',
          resolvida_em: new Date().toISOString(),
          resolvida_por_user_id: userId,
        })
        .eq('id', denunciaId)

      if (error) throw error
      await carregar()
    } catch (err: any) {
      console.error(err)
      setErro(err?.message || 'Não foi possível marcar como resolvida.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#142340]">
      <main className="mx-auto max-w-[1280px] px-4 py-5">
        <section className="mb-3 border border-zinc-200 bg-white p-3">
          <Link
            href="/transparencia"
            className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500 hover:text-[#2563eb]"
          >
            <ArrowLeft size={14} />
            Voltar para transparência
          </Link>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-[#eaf6ff] text-[#2563eb]">
              <ShieldAlert size={21} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#2563eb]">
                Reclamação e resposta
              </p>
              <h1 className="text-[20px] font-semibold text-[#111827] md:text-[22px]">
                Detalhe da denúncia
              </h1>
            </div>
          </div>
        </section>
        {loading && (
          <div className="border border-zinc-200 bg-white p-3 flex items-center gap-3 text-zinc-500 font-semibold">
            <Loader2 size={18} className="animate-spin" />
            Carregando denúncia...
          </div>
        )}

        {!loading && erro && (
          <div className="border border-red-200 bg-red-950/30 p-3 text-sm font-semibold text-red-200">
            {erro}
          </div>
        )}

        {!loading && denuncia && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3">
            <section className="space-y-3">
              <article className="border border-zinc-200 bg-white">
                <div className="border-b border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-[#2563eb]/30 bg-[#eaf6ff] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[#2563eb]">
                      {labelStatus(denuncia.status)}
                    </span>
                    <span className="border border-zinc-300 bg-zinc-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                      {tipoAlvoLabel(denuncia.tipo_alvo)}
                    </span>
                    <span className="text-[12px] text-zinc-500">{fmt(denuncia.created_at)}</span>
                  </div>

                  <h2 className="mt-3 text-[20px] font-semibold text-[#111827] md:text-[22px]">{denuncia.titulo}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-zinc-600">
                    {denuncia.descricao}
                  </p>
                </div>

                <div className="p-3">
                  <h3 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Provas anexadas
                  </h3>

                  {provas.length === 0 && (
                    <div className="mt-3 border border-zinc-200 bg-zinc-50 p-3 text-[13px] text-zinc-500">
                      Nenhuma prova anexada até agora.
                    </div>
                  )}

                  {provas.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {provas.map((prova) => (
                        <a
                          key={prova.id}
                          href={prova.url_arquivo}
                          target="_blank"
                          rel="noreferrer"
                          className="border border-zinc-200 bg-zinc-50 p-3 hover:border-[#2563eb]/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-[13px] font-medium text-[#142340]">
                            <Paperclip size={15} className="text-[#2563eb]" />
                            <span className="truncate">{prova.nome_arquivo}</span>
                          </div>

                          {prova.mime_type?.startsWith('image/') && (
                            <img
                              src={prova.url_arquivo}
                              alt={prova.nome_arquivo}
                              className="mt-2 h-36 w-full border border-zinc-200 object-cover"
                            />
                          )}

                          <div className="mt-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                            Enviado em {fmt(prova.created_at)}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </article>

              <article className="border border-zinc-200 bg-white">
                <div className="flex items-center gap-3 border-b border-zinc-200 p-3">
                  <MessageCircleMore size={20} className="text-[#2563eb]" />
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#111827]">Histórico de respostas</h3>
                    <p className="text-[12px] text-zinc-500">
                      Denunciante e denunciado podem conversar para resolver o caso.
                    </p>
                  </div>
                </div>

                <div className="p-3 space-y-3">
                  {respostas.length === 0 && (
                    <div className="border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-500">
                      Ainda não existe resposta nessa denúncia.
                    </div>
                  )}

                  {respostas.map((resposta) => (
                    <div
                      key={resposta.id}
                      className="border border-zinc-200 bg-zinc-50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-[#2563eb]">
                          {resposta.autor_tipo}
                        </span>
                        <span className="text-[10px] font-medium text-zinc-500">{fmt(resposta.created_at)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-zinc-600">
                        {resposta.mensagem}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <form onSubmit={enviarResposta} className="space-y-3 border border-zinc-200 bg-white p-3">
                <h3 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Responder denúncia
                </h3>

                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="min-h-[130px] w-full border border-zinc-200 bg-white px-3 py-3 text-[13px] font-medium text-[#142340] outline-none focus:border-[#2563eb] resize-y"
                  placeholder="Digite sua resposta, proposta de solução ou complemento..."
                />

                <label className="flex cursor-pointer items-center gap-3 border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 transition-colors hover:border-[#2563eb]">
                  <Paperclip size={17} className="text-[#2563eb]" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-zinc-200">
                      Anexar novas provas na resposta
                    </div>
                    <div className="text-[12px] text-zinc-500">
                      Prints ou documentos ficam visíveis no histórico da denúncia.
                    </div>
                  </div>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setArquivos(Array.from(e.target.files || []))}
                  />
                </label>

                {arquivos.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {arquivos.map((arquivo) => (
                      <div key={`${arquivo.name}-${arquivo.size}`} className="truncate border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] font-medium text-zinc-600">
                        {arquivo.name}
                      </div>
                    ))}
                  </div>
                )}

                {erro && (
                  <div className="border border-red-200 bg-red-950/30 p-3 text-sm font-semibold text-red-200">
                    {erro}
                  </div>
                )}

                <div className="flex flex-wrap justify-between gap-3">
                  <button
                    type="button"
                    onClick={marcarResolvida}
                    disabled={salvando}
                    className="h-10 px-4 border border-[#2563eb]/40 bg-[#2563eb]/10 text-[#2563eb] text-[11px] font-semibold uppercase tracking-[0.18em] inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} />
                    Marcar resolvida
                  </button>

                  <button
                    type="submit"
                    disabled={salvando}
                    className="inline-flex h-9 items-center gap-2 bg-[#2563eb] px-4 text-[11px] font-medium uppercase tracking-wide text-white disabled:opacity-50"
                  >
                    {salvando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    Enviar resposta
                  </button>
                </div>
              </form>
            </section>

            <aside className="space-y-3">
              <div className="border border-zinc-200 bg-white p-3">
                <h3 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Resumo rápido
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Info label="Status" value={labelStatus(denuncia.status)} />
                  <Info label="Categoria" value={String(denuncia.categoria || '—')} />
                  <Info label="Tipo" value={tipoAlvoLabel(denuncia.tipo_alvo)} />
                  <Info label="Provas" value={String(provas.length)} />
                </div>
              </div>

              <div className="border border-zinc-200 bg-white p-3">
                <h3 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Regras da central
                </h3>
                <div className="mt-3 space-y-2 text-[13px] leading-5 text-zinc-500">
                  <p>As provas ficam disponíveis para quem precisa responder ao caso.</p>
                  <p>O denunciado pode responder e tentar resolver publicamente.</p>
                  <p>Quando o problema for resolvido, marque como resolvido para melhorar o histórico.</p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-200 bg-zinc-50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-medium text-[#142340]">{value}</div>
    </div>
  )
}
