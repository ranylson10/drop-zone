'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCampeonatoHref } from '@/app/campeonatos/utils/getCampeonatoHref'
import { resolverTipoCompeticao } from '@/app/campeonatos/components/tiposCompeticao'
import { CalendarDays, ExternalLink, Loader2, ShieldCheck, Trophy, Users } from 'lucide-react'

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
      <main className="light flex min-h-screen items-center justify-center bg-white text-[#142340]" style={{ colorScheme: 'light' }}>
        <Loader2 className="animate-spin text-[#2563eb]" size={32} />
      </main>
    )
  }

  if (erro || !produtora) {
    return (
      <main className="light min-h-screen bg-white px-4 py-8 text-[#142340]" style={{ colorScheme: 'light' }}>
        <div className="mx-auto max-w-lg border border-zinc-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold uppercase">Link indisponível</h1>
          <p className="mt-2 text-sm text-zinc-500">{erro || 'Produtora não encontrada.'}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="light min-h-screen bg-white text-[#142340]" style={{ colorScheme: 'light' }}>
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
              <p className="text-[11px] text-zinc-500">Escolha o campeonato para se inscrever, escalar sua equipe ou ver detalhes.</p>
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
                return (
                  <article key={camp.id} className="border border-zinc-200 bg-white">
                    <div className="flex items-center gap-3 border-b border-zinc-100 bg-[#f8fafc] p-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-zinc-200 bg-white">
                        {camp.logo_url ? <img src={camp.logo_url} alt={camp.nome} className="h-full w-full object-cover" /> : <ShieldCheck size={22} className="text-zinc-300" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="border border-zinc-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#2563eb]">{String(tipo)}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{camp.status || 'rascunho'}</span>
                        </div>
                        <h3 className="mt-1 truncate text-base font-black uppercase leading-tight text-[#07111f]">{camp.nome}</h3>
                      </div>

                      <span className="shrink-0 border border-zinc-200 bg-white px-2 py-1 text-[10px] font-black uppercase text-[#2563eb]">{camp.vagas || 0} vagas</span>
                    </div>

                    <div className="grid grid-cols-3 border-b border-zinc-100 bg-white text-[10px]">
                      <div className="border-r border-zinc-100 p-2">
                        <div className="flex items-center gap-1 text-zinc-400"><CalendarDays size={12} /> Data</div>
                        <p className="mt-1 truncate text-xs font-black uppercase text-[#07111f]">{dataCurta(camp.data_inicio)}</p>
                      </div>
                      <div className="border-r border-zinc-100 p-2">
                        <div className="flex items-center gap-1 text-zinc-400"><Trophy size={12} /> Prêmio</div>
                        <p className="mt-1 truncate text-xs font-black uppercase text-[#07111f]">{formatarMoeda(camp.valor_premiacao)}</p>
                      </div>
                      <div className="p-2">
                        <div className="flex items-center gap-1 text-zinc-400"><Users size={12} /> Inscrição</div>
                        <p className="mt-1 truncate text-xs font-black uppercase text-[#07111f]">{formatarMoeda(camp.valor_vaga)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3">
                      <Link href={`/escala/${camp.id}`} className="flex h-10 items-center justify-center gap-2 bg-[#2563eb] px-3 text-[11px] font-black uppercase tracking-wide text-white">
                        <ShieldCheck size={14} /> Inscreva-se
                      </Link>

                      <Link href={hrefCompleto} className="flex h-10 items-center justify-center gap-2 border border-zinc-300 bg-white px-3 text-[11px] font-black uppercase tracking-wide text-[#142340]">
                        <ExternalLink size={14} /> Saiba mais
                      </Link>
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
