'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCampeonatoHref } from '@/app/campeonatos/utils/getCampeonatoHref'
import { resolverTipoCompeticao } from '@/app/campeonatos/components/tiposCompeticao'
import { CalendarDays, ExternalLink, Loader2, MessageCircle, ShieldCheck, Trophy, Users } from 'lucide-react'

type ProdutoraPublica = {
  id: string
  nome: string
  slug: string | null
  descricao: string | null
  logo_url: string | null
  capa_url: string | null
  whatsapp_suporte?: string | null
  instagram_url?: string | null
  discord_url?: string | null
}

type CampeonatoPublico = {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  banner_url: string | null
  status: string | null
  modelo_competicao: string | null
  tipo_competicao: string | null
  formato: string | null
  valor_vaga: number | null
  valor_premiacao: number | null
  vagas: number | null
  data_inicio: string | null
  horario_inicio: string | null
  whatsapp_suporte: string | null
  plataforma: string | null
  categoria: string | null
  regiao: string | null
}

function formatarMoeda(valor: number | null | undefined) {
  const numero = Number(valor || 0)
  if (!numero) return 'Grátis'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero)
}

function normalizarWhatsApp(numero?: string | null) {
  return String(numero || '').replace(/\D/g, '')
}

function criarLinkWhatsApp(numero: string, campeonatoNome: string) {
  const limpo = normalizarWhatsApp(numero)
  if (!limpo) return ''
  const msg = `Olá, vim pelo Drop Zone e quero comprar vaga no campeonato ${campeonatoNome}.`
  return `https://wa.me/${limpo}?text=${encodeURIComponent(msg)}`
}

function dataCurta(valor?: string | null) {
  if (!valor) return 'Data a definir'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return 'Data a definir'
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function LinkPublicoProdutoraPage() {
  const params = useParams<{ slug: string }>()
  const identificador = decodeURIComponent(String(params?.slug || '')).trim()

  const [loading, setLoading] = useState(true)
  const [produtora, setProdutora] = useState<ProdutoraPublica | null>(null)
  const [campeonatos, setCampeonatos] = useState<CampeonatoPublico[]>([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      if (!identificador) return
      setLoading(true)
      setErro('')

      try {
        const { data: prodPorSlug, error: erroSlug } = await supabase
          .from('produtoras')
          .select('*')
          .eq('slug', identificador)
          .maybeSingle()

        if (erroSlug) throw erroSlug

        let prod = prodPorSlug as ProdutoraPublica | null

        if (!prod) {
          const { data: prodPorId, error: erroId } = await supabase
            .from('produtoras')
            .select('*')
            .eq('id', identificador)
            .maybeSingle()

          if (erroId) throw erroId
          prod = prodPorId as ProdutoraPublica | null
        }

        if (!prod) {
          setErro('Produtora não encontrada.')
          setProdutora(null)
          setCampeonatos([])
          return
        }

        setProdutora(prod)

        const { data: campeonatosData, error: erroCampeonatos } = await supabase
          .from('campeonatos')
          .select('id, nome, slug, logo_url, banner_url, status, modelo_competicao, tipo_competicao, formato, valor_vaga, valor_premiacao, vagas, data_inicio, horario_inicio, whatsapp_suporte, plataforma, categoria, regiao')
          .eq('produtora_id', prod.id)
          .in('status', ['rascunho', 'inscricoes', 'em_andamento'])
          .order('created_at', { ascending: false })

        if (erroCampeonatos) throw erroCampeonatos
        setCampeonatos((campeonatosData || []) as CampeonatoPublico[])
      } catch (error: any) {
        console.error('Erro ao carregar link público da produtora:', error)
        setErro(error?.message || 'Erro ao carregar link público.')
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [identificador])

  const iniciais = useMemo(() => {
    return (produtora?.nome || 'DZ').slice(0, 2).toUpperCase()
  }, [produtora?.nome])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] text-[#142340]">
        <Loader2 className="animate-spin text-[#2563eb]" size={32} />
      </main>
    )
  }

  if (erro || !produtora) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] px-4 py-8 text-[#142340]">
        <div className="mx-auto max-w-lg border border-zinc-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold uppercase">Link indisponível</h1>
          <p className="mt-2 text-sm text-zinc-500">{erro || 'Produtora não encontrada.'}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-[#142340]">
      <div className="mx-auto max-w-3xl px-3 py-3 pb-10">
        <section className="overflow-hidden border border-zinc-200 bg-white">
          <div className="h-28 bg-zinc-100 md:h-40">
            {produtora.capa_url ? (
              <img src={produtora.capa_url} alt={produtora.nome} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,#0f172a,#1d4ed8)]" />
            )}
          </div>

          <div className="px-4 pb-4">
            <div className="-mt-10 flex items-end gap-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border-4 border-white bg-zinc-100 text-2xl font-semibold uppercase text-zinc-500">
                {produtora.logo_url ? <img src={produtora.logo_url} alt={produtora.nome} className="h-full w-full object-cover" /> : iniciais}
              </div>

              <div className="min-w-0 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563eb]">Link oficial Drop Zone</p>
                <h1 className="truncate text-xl font-semibold uppercase text-[#142340]">{produtora.nome}</h1>
              </div>
            </div>

            {produtora.descricao ? <p className="mt-3 text-sm leading-6 text-zinc-600">{produtora.descricao}</p> : null}
          </div>
        </section>

        <section className="mt-3 border border-zinc-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase text-[#142340]">Campeonatos com vagas e inscrições</h2>
              <p className="text-[11px] text-zinc-500">Escolha o campeonato para comprar vaga ou escalar sua equipe.</p>
            </div>
            <span className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold uppercase text-zinc-500">{campeonatos.length}</span>
          </div>

          {campeonatos.length === 0 ? (
            <div className="border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">Nenhum campeonato aberto no momento.</div>
          ) : (
            <div className="space-y-2">
              {campeonatos.map((camp) => {
                const tipo = resolverTipoCompeticao(camp as any) || camp.modelo_competicao || 'campeonato'
                const hrefCompleto = getCampeonatoHref(camp.id, String(tipo))
                const whatsapp = criarLinkWhatsApp(camp.whatsapp_suporte || produtora.whatsapp_suporte || '', camp.nome)

                return (
                  <article key={camp.id} className="border border-zinc-200 bg-white p-3">
                    <div className="flex gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
                        {camp.logo_url ? <img src={camp.logo_url} alt={camp.nome} className="h-full w-full object-cover" /> : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold uppercase text-[#142340]">{camp.nome}</h3>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{String(tipo)} • {camp.status || 'rascunho'}</p>
                          </div>
                          <span className="shrink-0 border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold uppercase text-[#2563eb]">{camp.vagas || 0} vagas</span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                          <div className="border border-zinc-100 bg-zinc-50 p-2">
                            <CalendarDays size={13} className="mb-1 text-[#2563eb]" />
                            <p className="font-semibold uppercase text-[#142340]">{dataCurta(camp.data_inicio)}</p>
                          </div>
                          <div className="border border-zinc-100 bg-zinc-50 p-2">
                            <Trophy size={13} className="mb-1 text-emerald-600" />
                            <p className="font-semibold uppercase text-[#142340]">{formatarMoeda(camp.valor_premiacao)}</p>
                          </div>
                          <div className="border border-zinc-100 bg-zinc-50 p-2">
                            <Users size={13} className="mb-1 text-[#2563eb]" />
                            <p className="font-semibold uppercase text-[#142340]">{formatarMoeda(camp.valor_vaga)}</p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {whatsapp ? (
                            <Link href={whatsapp} target="_blank" className="flex h-9 items-center justify-center gap-2 bg-[#16a34a] px-3 text-[11px] font-semibold uppercase text-white">
                              <MessageCircle size={14} /> Comprar vaga
                            </Link>
                          ) : null}

                          <Link href={`/escala/${camp.id}`} className="flex h-9 items-center justify-center gap-2 bg-[#2563eb] px-3 text-[11px] font-semibold uppercase text-white">
                            <ShieldCheck size={14} /> Inscrever / escalar
                          </Link>

                          <Link href={hrefCompleto} className="flex h-9 items-center justify-center gap-2 border border-zinc-300 bg-white px-3 text-[11px] font-semibold uppercase text-[#142340]">
                            <ExternalLink size={14} /> Ver completo
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
