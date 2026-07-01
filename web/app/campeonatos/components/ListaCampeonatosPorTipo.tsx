'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTipoVisual } from '@/lib/getTipoVisual'
import { TipoCompeticao, TIPOS_COMPETICAO, resolverTipoCompeticao } from './tiposCompeticao'
import { getCampeonatoHref } from '../utils/getCampeonatoHref'

type Props = {
  tipo: TipoCompeticao
}

function formatarMoeda(valor: number | string | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

export default function ListaCampeonatosPorTipo({ tipo }: Props) {
  const [itens, setItens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const tipoMeta = TIPOS_COMPETICAO.find((item) => item.slug === tipo)
  const visual = getTipoVisual(tipo)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('campeonatos')
          .select('id, nome, logo_url, valor_vaga, valor_premiacao, vagas, status, formato, tipo_competicao, modelo_competicao, regiao, plataforma, categoria, created_at, produtoras(nome)')
          .order('created_at', { ascending: false })

        if (error) throw error
        setItens((data || []).filter((camp) => resolverTipoCompeticao(camp) === tipo))
      } catch (error) {
        console.error(error)
        setItens([])
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [tipo])

  const totalPremiacao = useMemo(
    () => itens.reduce((acc, item) => acc + Number(item.valor_premiacao || 0), 0),
    [itens],
  )

  return (
    <div className="min-h-screen bg-[#f7f7f7] px-3 py-3 text-[#142340] md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className={`border border-zinc-200 border-l-4 bg-white p-4 md:p-6 ${visual.borderStrong}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className={`mb-2 inline-flex items-center gap-2 px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${visual.badge}`}>
                <Trophy size={12} /> {tipoMeta?.badge || visual.label}
              </div>
              <h1 className={`text-[22px] font-semibold uppercase tracking-tight md:text-[30px] ${visual.text}`}>
                {tipoMeta?.titulo}
              </h1>
              <p className="mt-1 max-w-3xl text-[13px] text-zinc-500">
                {tipoMeta?.subtitulo}
              </p>
            </div>

            <Link
              href={tipoMeta?.hrefCriacao || '/campeonatos/nova'}
              className={`inline-flex h-9 items-center justify-center px-4 text-[12px] font-medium uppercase tracking-wide transition ${visual.button}`}
            >
              Criar {tipoMeta?.titulo}
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 md:gap-3">
            <div className="border border-zinc-200 bg-zinc-50 p-2 md:p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Quantidade</p>
              <p className={`mt-1 text-[22px] font-semibold leading-none md:text-[28px] ${visual.text}`}>{itens.length}</p>
            </div>
            <div className="border border-zinc-200 bg-zinc-50 p-2 md:p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Premiação</p>
              <p className={`mt-1 truncate text-[16px] font-semibold leading-none md:text-[24px] ${visual.text}`}>{formatarMoeda(totalPremiacao)}</p>
            </div>
            <div className="border border-zinc-200 bg-zinc-50 p-2 md:p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Modelo</p>
              <p className={`mt-1 truncate text-[16px] font-semibold leading-none md:text-[24px] ${visual.text}`}>{tipoMeta?.badge}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 border border-zinc-200 bg-white">
          {loading ? (
            <div className="p-10 text-center text-[13px] text-zinc-500">Carregando...</div>
          ) : itens.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-zinc-500">Nenhum item desse tipo foi encontrado ainda.</div>
          ) : (
            itens.map((camp) => {
              const tipoCompeticao = resolverTipoCompeticao(camp)
              const itemVisual = getTipoVisual(tipoCompeticao)

              return (
                <Link
                  key={camp.id}
                  href={getCampeonatoHref(camp.id, tipoCompeticao)}
                  className="flex items-center gap-3 border-t border-zinc-200 px-3 py-2 transition hover:bg-zinc-50 md:px-4 md:py-3"
                >
                  <img
                    src={camp.logo_url || 'https://via.placeholder.com/100'}
                    alt={camp.nome}
                    className="h-10 w-10 shrink-0 border border-zinc-200 bg-white object-cover md:h-12 md:w-12"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold uppercase text-[#142340] md:text-[15px]">{camp.nome}</div>
                    <div className="hidden text-[11px] text-zinc-500 md:block">
                      {(camp.produtoras as any)?.nome || 'Organização'} • {camp.regiao || '—'} • {camp.plataforma || '—'}
                    </div>
                  </div>

                  <span className={`hidden px-2 py-1 text-[10px] font-medium uppercase tracking-wide md:inline-flex ${itemVisual.badge}`}>
                    {itemVisual.label}
                  </span>

                  <div className="hidden text-right text-[12px] md:block">
                    <div className={`font-semibold ${itemVisual.text}`}>{formatarMoeda(camp.valor_premiacao)}</div>
                    <div className="text-[11px] text-zinc-500">{Number(camp.valor_vaga || 0) > 0 ? `Inscrição R$ ${camp.valor_vaga}` : 'Grátis'}</div>
                  </div>

                  <ChevronRight size={17} className={itemVisual.text} />
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
