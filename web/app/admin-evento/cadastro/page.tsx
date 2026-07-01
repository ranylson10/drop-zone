'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'

type TipoEvento = 'diario' | 'xtreino' | 'copa' | 'liga'
type StatusAdminEvento = 'pendente' | 'aprovado' | 'recusado' | 'suspenso'

type CandidaturaExistente = {
  id: string
  user_id: string
  nome_exibicao: string | null
  descricao: string | null
  status: StatusAdminEvento
  taxa_padrao: number | null
  motivo_recusa: string | null
  aprovado_em: string | null
}

const TIPOS: Array<{ value: TipoEvento; label: string; desc: string }> = [
  { value: 'diario', label: 'Diários', desc: 'Eventos de grupo único com fechamento e premiação do dia.' },
  { value: 'xtreino', label: 'Xtreinos', desc: 'Treinos e eventos mais flexíveis, com operação simplificada.' },
  { value: 'copa', label: 'Copas', desc: 'Eventos eliminatórios, chaveados, mata-mata.' },
  { value: 'liga', label: 'Ligas', desc: 'Eventos de pontos corridos, rodadas e classificação acumulada.' },
]

const statusLabel: Record<StatusAdminEvento, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  suspenso: 'Suspenso',
}

export default function CadastroAdminEventoPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const [nomeExibicao, setNomeExibicao] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tiposSelecionados, setTiposSelecionados] = useState<TipoEvento[]>([])
  const [candidatura, setCandidatura] = useState<CandidaturaExistente | null>(null)

  const temCandidatura = !!candidatura

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    setErro(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      const { data: adminExistente, error: adminError } = await supabase
        .from('administradores_evento')
        .select('id, user_id, nome_exibicao, descricao, status, taxa_padrao, motivo_recusa, aprovado_em')
        .eq('user_id', user.id)
        .maybeSingle()

      if (adminError) throw adminError

      if (adminExistente) {
        const admin = adminExistente as CandidaturaExistente
        setCandidatura(admin)
        setNomeExibicao(admin.nome_exibicao || '')
        setDescricao(admin.descricao || '')

        const { data: tiposData, error: tiposError } = await supabase
          .from('administradores_evento_tipos')
          .select('tipo_evento')
          .eq('administrador_evento_id', admin.id)

        if (tiposError) throw tiposError

        setTiposSelecionados(
          ((tiposData || []).map((item: any) => item.tipo_evento) as TipoEvento[]).filter(Boolean)
        )
      }
    } catch (e: any) {
      console.error('Erro ao carregar cadastro de admin de evento:', e)
      setErro(e?.message || 'Não foi possível carregar seu cadastro.')
    } finally {
      setLoading(false)
    }
  }

  function alternarTipo(tipo: TipoEvento) {
    setTiposSelecionados((prev) =>
      prev.includes(tipo) ? prev.filter((item) => item !== tipo) : [...prev, tipo]
    )
  }

  const statusAtual = useMemo(() => candidatura?.status || null, [candidatura])

  async function salvarCandidatura() {
    if (!userId) return

    setErro(null)
    setSucesso(null)

    const nome = nomeExibicao.trim()
    const desc = descricao.trim()

    if (!nome) {
      setErro('Informe o nome de exibição do administrador.')
      return
    }

    if (tiposSelecionados.length === 0) {
      setErro('Selecione ao menos um tipo de evento para gerenciar.')
      return
    }

    try {
      setSalvando(true)

      let adminId = candidatura?.id || null

      if (!adminId) {
        const { data: inserted, error: insertError } = await supabase
          .from('administradores_evento')
          .insert({
            user_id: userId,
            nome_exibicao: nome,
            descricao: desc || null,
            status: 'pendente',
          })
          .select('id, user_id, nome_exibicao, descricao, status, taxa_padrao, motivo_recusa, aprovado_em')
          .single()

        if (insertError) throw insertError

        adminId = inserted.id
        setCandidatura(inserted as CandidaturaExistente)
      } else {
        const payload: Record<string, unknown> = {
          nome_exibicao: nome,
          descricao: desc || null,
        }

        if (statusAtual === 'recusado' || statusAtual === 'suspenso') {
          payload.status = 'pendente'
          payload.motivo_recusa = null
          payload.aprovado_em = null
          payload.aprovado_por = null
          payload.suspenso_em = null
          payload.taxa_padrao = 0
        }

        const { data: updated, error: updateError } = await supabase
          .from('administradores_evento')
          .update(payload)
          .eq('id', adminId)
          .select('id, user_id, nome_exibicao, descricao, status, taxa_padrao, motivo_recusa, aprovado_em')
          .single()

        if (updateError) throw updateError
        setCandidatura(updated as CandidaturaExistente)
      }

      const { error: deleteTiposError } = await supabase
        .from('administradores_evento_tipos')
        .delete()
        .eq('administrador_evento_id', adminId)

      if (deleteTiposError) throw deleteTiposError

      const tiposPayload = tiposSelecionados.map((tipo) => ({
        administrador_evento_id: adminId,
        tipo_evento: tipo,
      }))

      const { error: insertTiposError } = await supabase
        .from('administradores_evento_tipos')
        .insert(tiposPayload)

      if (insertTiposError) throw insertTiposError

      if (!candidatura) {
        setSucesso('Cadastro enviado com sucesso. Agora é só aguardar a análise do site.')
      } else if (statusAtual === 'recusado' || statusAtual === 'suspenso') {
        setSucesso('Solicitação reenviada para análise. O status voltou para pendente.')
      } else {
        setSucesso('Cadastro atualizado com sucesso.')
      }

      await carregar()
    } catch (e: any) {
      console.error('Erro ao salvar candidatura:', e)
      setErro(e?.message || 'Não foi possível salvar sua candidatura.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f7f7]">
        <Loader2 className="animate-spin text-[#2563eb]" size={42} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <section className="border border-zinc-200 bg-white p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
          Cadastro público
        </p>
        <h1 className="mt-3 text-3xl font-semibold uppercase text-[#142340]">
          Administrador de evento
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
          Candidate-se para operar eventos da plataforma e de produtoras aprovadas. O site faz a análise,
          aprova seu perfil e define sua taxa padrão antes de liberar seu nome nos formulários de eventos.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="border border-zinc-200 bg-[#f7f7f7] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Fluxo</p>
            <p className="mt-2 text-sm text-zinc-600">Cadastro → análise do site → aprovação → liberação nos eventos.</p>
          </div>
          <div className="border border-zinc-200 bg-[#f7f7f7] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Taxa</p>
            <p className="mt-2 text-sm text-zinc-600">A taxa padrão não é definida por você. Ela é ajustada pelo site no painel admin.</p>
          </div>
          <div className="border border-zinc-200 bg-[#f7f7f7] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Acesso</p>
            <p className="mt-2 text-sm text-zinc-600">Depois de aprovado, você passa a aparecer nas telas de criação dos eventos compatíveis.</p>
          </div>
        </div>
      </section>

      {temCandidatura ? (
        <section className="border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Status atual</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="border border-zinc-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
                  {statusAtual ? statusLabel[statusAtual] : 'Sem status'}
                </span>
                {candidatura?.taxa_padrao ? (
                  <span className="text-sm text-zinc-600">Taxa atual do site: {Number(candidatura.taxa_padrao).toFixed(2)}%</span>
                ) : null}
              </div>
            </div>

            <div className="max-w-xl text-sm text-zinc-500">
              {statusAtual === 'pendente' && 'Sua candidatura está aguardando análise do site.'}
              {statusAtual === 'aprovado' && 'Seu perfil já está aprovado e pode ser usado nos eventos compatíveis.'}
              {statusAtual === 'recusado' && 'Seu cadastro foi recusado. Você pode ajustar os dados e reenviar para análise.'}
              {statusAtual === 'suspenso' && 'Seu perfil foi suspenso. Ajuste o cadastro e reenvie se quiser nova análise.'}
            </div>
          </div>

          {candidatura?.motivo_recusa ? (
            <div className="mt-4 border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700">
              <span className="font-semibold uppercase tracking-[0.18em]">Motivo informado pelo site:</span>{' '}
              {candidatura.motivo_recusa}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="border border-zinc-200 bg-white p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Nome de exibição
              </label>
              <input
                value={nomeExibicao}
                onChange={(e) => setNomeExibicao(e.target.value)}
                placeholder="Ex: Six Admin, Ranilson Staff, Arbitragem Elite"
                className="mt-2 w-full border border-zinc-200 bg-[#f7f7f7] px-4 py-3 text-sm text-[#142340] outline-none transition focus:border-[#2563eb]"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Descrição do perfil
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={6}
                placeholder="Explique sua experiência com salas, organização, análise de provas, resultados, regras e operação dos eventos."
                className="mt-2 w-full resize-none border border-zinc-200 bg-[#f7f7f7] px-4 py-3 text-sm text-[#142340] outline-none transition focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Tipos de evento que você quer gerenciar
              </p>
              <div className="mt-3 grid gap-3">
                {TIPOS.map((tipo) => {
                  const ativo = tiposSelecionados.includes(tipo.value)
                  return (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => alternarTipo(tipo.value)}
                      className={[
                        'w-full border p-4 text-left transition',
                        ativo
                          ? 'border-[#2563eb] bg-[#2563eb]/10'
                          : 'border-zinc-200 bg-[#f7f7f7] hover:border-[#2563eb]/50',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#142340]">
                            {tipo.label}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-zinc-500">{tipo.desc}</p>
                        </div>
                        {ativo ? <CheckCircle2 className="shrink-0 text-[#2563eb]" size={18} /> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {erro ? (
          <div className="mt-6 flex items-start gap-3 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span>{erro}</span>
          </div>
        ) : null}

        {sucesso ? (
          <div className="mt-6 flex items-start gap-3 border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            <ShieldCheck className="mt-0.5 shrink-0" size={18} />
            <span>{sucesso}</span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={salvarCandidatura}
            disabled={salvando}
            className="inline-flex items-center gap-2 bg-[#2563eb] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {temCandidatura ? 'Salvar cadastro' : 'Enviar candidatura'}
          </button>

          <Link
            href="/"
            className="border border-zinc-200 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600 transition hover:border-[#2563eb] hover:text-[#142340]"
          >
            Voltar ao início
          </Link>
        </div>
      </section>
    </div>
  )
}
