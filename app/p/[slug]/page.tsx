'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CalendarDays, ExternalLink, ShieldCheck, Trophy, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Produtora = {
  id: string
  nome?: string | null
  slug?: string | null
  descricao?: string | null
  logo_url?: string | null
  banner_url?: string | null
  whatsapp?: string | null
  whatsapp_suporte?: string | null
  contato_whatsapp?: string | null
  instagram_url?: string | null
}

type Campeonato = {
  id: string
  nome: string
  modelo_competicao?: string | null
  tipo?: string | null
  status?: string | null
  logo_url?: string | null
  banner_url?: string | null
  data_inicio?: string | null
  horario_inicio?: string | null
  vagas?: number | null
  quantidade_equipes?: number | null
  valor_vaga?: number | null
  valor_premiacao?: number | null
  whatsapp_suporte?: string | null
  created_at?: string | null
}

const tipoVisual: Record<string, { label: string; cor: string; bg: string; border: string }> = {
  diario: { label: 'DIÁRIO', cor: '#009FE3', bg: '#EAF7FF', border: '#009FE3' },
  xtreino: { label: 'XTREINO', cor: '#00B96B', bg: '#E9FFF4', border: '#00B96B' },
  copa: { label: 'COPA', cor: '#7C3AED', bg: '#F3EEFF', border: '#7C3AED' },
  liga: { label: 'LIGA', cor: '#F59E0B', bg: '#FFF7E6', border: '#F59E0B' },
  confronto: { label: 'CONFRONTO', cor: '#DC2626', bg: '#FFF0F0', border: '#DC2626' },
  '4x4': { label: 'CONFRONTO', cor: '#DC2626', bg: '#FFF0F0', border: '#DC2626' },
}

function moeda(valor?: number | null) {
  const n = Number(valor || 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dataCurta(data?: string | null) {
  if (!data) return 'A definir'
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return 'A definir'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getTipo(camp: Campeonato) {
  const chave = String(camp.modelo_competicao || camp.tipo || 'diario').toLowerCase()
  return tipoVisual[chave] || { label: chave.toUpperCase(), cor: '#2563EB', bg: '#EFF6FF', border: '#2563EB' }
}

export default function LinkPublicoProdutoraPage() {
  const params = useParams<{ slug: string }>()
  const slug = decodeURIComponent(String(params?.slug || ''))

  const [loading, setLoading] = useState(true)
  const [produtora, setProdutora] = useState<Produtora | null>(null)
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])

  useEffect(() => {
    document.documentElement.style.colorScheme = 'only light'
    document.body.style.colorScheme = 'only light'
    document.documentElement.classList.remove('dark')
    document.body.classList.remove('dark')
    document.body.style.background = '#f5f7fb'
    document.body.style.color = '#0f172a'

    let meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'color-scheme'
      document.head.appendChild(meta)
    }
    meta.content = 'only light'
  }, [])

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      try {
        let query = supabase.from('produtoras').select('*')

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)
        if (isUuid) query = query.eq('id', slug)
        else query = query.or(`slug.eq.${slug},nome.ilike.${slug.replace(/-/g, ' ')}`)

        const { data: prod } = await query.limit(1).maybeSingle()
        if (!prod) {
          setProdutora(null)
          setCampeonatos([])
          return
        }

        setProdutora(prod as Produtora)

        const { data: camps } = await supabase
          .from('campeonatos')
          .select('id,nome,modelo_competicao,tipo,status,logo_url,banner_url,data_inicio,horario_inicio,vagas,quantidade_equipes,valor_vaga,valor_premiacao,whatsapp_suporte,created_at')
          .eq('produtora_id', prod.id)
          .in('status', ['rascunho', 'inscricoes', 'em_andamento'])
          .order('created_at', { ascending: false })

        setCampeonatos((camps || []) as Campeonato[])
      } finally {
        setLoading(false)
      }
    }

    if (slug) carregar()
  }, [slug])

  const logo = produtora?.logo_url || '/logo.png'
  const banner = produtora?.banner_url || null

  const pageStyle = useMemo(
    () => ({
      background: '#f5f7fb',
      color: '#0f172a',
      colorScheme: 'only light' as const,
      minHeight: '100vh',
    }),
    [],
  )

  if (loading) {
    return (
      <main style={pageStyle} className="px-3 py-6">
        <div className="mx-auto max-w-[760px] border border-[#d8e1ee] bg-white p-4 text-sm font-black uppercase text-[#0f172a]">
          Carregando link oficial...
        </div>
      </main>
    )
  }

  if (!produtora) {
    return (
      <main style={pageStyle} className="px-3 py-6">
        <div className="mx-auto max-w-[760px] border border-[#d8e1ee] bg-white p-4 text-sm font-black uppercase text-[#0f172a]">
          Produtora não encontrada.
        </div>
      </main>
    )
  }

  return (
    <main style={pageStyle} className="px-3 pb-8 pt-3 sm:px-4">
      <section className="mx-auto max-w-[760px] overflow-hidden border border-[#d8e1ee] bg-white shadow-sm">
        <div className="relative h-[116px] border-b border-[#d8e1ee] bg-[#eaf1f8]">
          {banner ? (
            <Image src={banner} alt="Banner da produtora" fill className="object-cover" unoptimized />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(120deg,#eaf1f8,#ffffff,#e8f6ff)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/30 to-transparent" />
          <div className="absolute bottom-[-28px] left-4 flex items-end gap-3">
            <div className="h-[72px] w-[72px] border-4 border-white bg-white shadow-sm">
              <Image src={logo} alt={produtora.nome || 'Produtora'} width={72} height={72} className="h-full w-full object-cover" unoptimized />
            </div>
            <div className="pb-7">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#009FE3]">Link oficial Drop Zone</p>
              <h1 className="text-2xl font-black uppercase leading-none text-[#0f172a]">{produtora.nome}</h1>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 pt-10">
          {produtora.descricao ? <p className="text-sm font-semibold leading-5 text-[#64748b]">{produtora.descricao}</p> : null}
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-[760px] border-t border-[#d8e1ee] pt-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-black uppercase leading-[0.95] tracking-[-0.04em] text-[#0f172a]">
              Campeonatos com vagas
              <br />e inscrições
            </h2>
            <p className="mt-2 text-sm font-semibold leading-5 text-[#64748b]">Escolha o campeonato para se inscrever, escalar sua equipe ou ver detalhes.</p>
          </div>
          <div className="border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-black text-[#0f172a]">{campeonatos.length}</div>
        </div>

        <div className="space-y-3">
          {campeonatos.map((camp) => {
            const tipo = getTipo(camp)
            const vagas = camp.vagas || camp.quantidade_equipes || 0
            return (
              <article key={camp.id} className="overflow-hidden border border-[#d8e1ee] bg-white shadow-sm" style={{ borderLeft: `5px solid ${tipo.cor}` }}>
                <div className="flex items-center gap-3 border-b border-[#d8e1ee] bg-white p-3">
                  <div className="h-[58px] w-[58px] shrink-0 border border-[#d8e1ee] bg-[#f8fafc]">
                    {camp.logo_url ? (
                      <Image src={camp.logo_url} alt={camp.nome} width={58} height={58} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-[#94a3b8]">DZ</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border px-2 py-1 text-[10px] font-black uppercase leading-none" style={{ borderColor: tipo.cor, color: tipo.cor, background: tipo.bg }}>
                        {tipo.label}
                      </span>
                      <span className="text-[11px] font-black uppercase text-[#94a3b8]">{camp.status || 'rascunho'}</span>
                    </div>
                    <h3 className="mt-1 truncate text-xl font-black uppercase leading-none tracking-[-0.03em] text-[#0f172a]">{camp.nome}</h3>
                  </div>

                  <div className="shrink-0 border border-[#cbd5e1] bg-[#f8fafc] px-2 py-2 text-center text-sm font-black uppercase leading-none text-[#0f172a]">
                    {vagas} vagas
                  </div>
                </div>

                <div className="grid grid-cols-3 border-b border-[#d8e1ee] bg-[#fbfdff]">
                  <InfoItem icon={<CalendarDays size={15} />} label="Data" value={dataCurta(camp.data_inicio)} />
                  <InfoItem icon={<Trophy size={15} />} label="Prêmio" value={moeda(camp.valor_premiacao)} />
                  <InfoItem icon={<Users size={15} />} label="Inscrição" value={moeda(camp.valor_vaga)} />
                </div>

                <div className="grid grid-cols-2 gap-2 bg-white p-3">
                  <Link
                    href={`/escala/${camp.id}`}
                    className="flex h-11 items-center justify-center gap-2 text-center text-[13px] font-black uppercase tracking-[-0.01em] text-white"
                    style={{ background: tipo.cor }}
                  >
                    <ShieldCheck size={17} />
                    Inscreva-se
                  </Link>
                  <Link
                    href={`/campeonatos/${camp.id}`}
                    className="flex h-11 items-center justify-center gap-2 border border-[#cbd5e1] bg-white text-center text-[13px] font-black uppercase tracking-[-0.01em] text-[#0f172a]"
                  >
                    <ExternalLink size={17} />
                    Saiba mais
                  </Link>
                </div>
              </article>
            )
          })}

          {campeonatos.length === 0 ? (
            <div className="border border-[#d8e1ee] bg-white p-4 text-sm font-black uppercase text-[#64748b]">Nenhum campeonato disponível no momento.</div>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-[#d8e1ee] px-2 py-2 last:border-r-0 sm:px-3">
      <div className="flex items-center gap-1 text-[10px] font-black uppercase leading-none text-[#64748b]">
        <span className="text-[#2563eb]">{icon}</span>
        {label}
      </div>
      <div className="mt-1 truncate text-[13px] font-black leading-none text-[#0f172a] sm:text-sm">{value}</div>
    </div>
  )
}
