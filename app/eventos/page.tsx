'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Loader2, MessageCircle, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type WhatsContato = { nome?: string | null; numero?: string | null }

type CampeonatoEvento = {
  id: string
  nome: string | null
  logo_url: string | null
  banner_url: string | null
  status: string | null
  tipo: string | null
  tipo_campeonato: string | null
  plataforma: string | null
  valor_vaga: number | null
  valor_premiacao: number | null
  data_inicio: string | null
  whatsapp_suporte: string | null
  whatsapp_contato: string | null
  whatsapp_contatos: WhatsContato[] | null
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatarData(data?: string | null) {
  if (!data) return 'Data a definir'
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return 'Data a definir'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function numeroWhatsapp(campeonato: CampeonatoEvento) {
  const contatos = Array.isArray(campeonato.whatsapp_contatos) ? campeonato.whatsapp_contatos : []
  const primeiro = contatos
    .map((contato) => String(contato?.numero || '').replace(/\D/g, ''))
    .find(Boolean)

  return primeiro || String(campeonato.whatsapp_suporte || campeonato.whatsapp_contato || '').replace(/\D/g, '')
}

function linkInscricao(campeonato: CampeonatoEvento) {
  const numero = numeroWhatsapp(campeonato)
  if (!numero) return ''

  const mensagem = `Olá, vim pelo Drop Zone e quero me inscrever no campeonato ${campeonato.nome || ''}.`
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

function LogoEvento({ campeonato }: { campeonato: CampeonatoEvento }) {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border border-white/25 bg-white/15 text-white">
      {campeonato.logo_url ? (
        <img src={campeonato.logo_url} alt={campeonato.nome || 'Campeonato'} className="h-full w-full object-cover" />
      ) : (
        <Trophy size={24} />
      )}
    </div>
  )
}

export default function EventosPage() {
  const [campeonatos, setCampeonatos] = useState<CampeonatoEvento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro(null)

      const { data, error } = await supabase
        .from('campeonatos')
        .select('id,nome,logo_url,banner_url,status,tipo,tipo_campeonato,plataforma,valor_vaga,valor_premiacao,data_inicio,whatsapp_suporte,whatsapp_contato,whatsapp_contatos')
        .in('status', ['inscricoes', 'em_andamento', 'rascunho'])
        .order('data_inicio', { ascending: true, nullsFirst: false })
        .limit(60)

      if (!ativo) return

      if (error) {
        setErro('Não foi possível carregar os eventos.')
        setCampeonatos([])
      } else {
        setCampeonatos((data || []) as CampeonatoEvento[])
      }
      setCarregando(false)
    }

    carregar()
    return () => { ativo = false }
  }, [])

  const eventosComContato = useMemo(() => campeonatos.filter((campeonato) => Boolean(numeroWhatsapp(campeonato))), [campeonatos])
  const eventosSemContato = useMemo(() => campeonatos.filter((campeonato) => !numeroWhatsapp(campeonato)), [campeonatos])
  const lista = [...eventosComContato, ...eventosSemContato]

  return (
    <main className="min-h-screen bg-[#eef3f9] px-3 py-4 text-[#12213f]">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-cyan-500 to-violet-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <Link href="/" className="grid h-10 w-10 shrink-0 place-items-center border border-white/25 bg-white/10">
                <ArrowLeft size={18} />
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/75">Drop Zone</p>
                <h1 className="truncate text-xl font-black uppercase tracking-[-0.05em]">Outros eventos</h1>
                <p className="mt-1 text-[11px] font-bold uppercase text-white/80">Escolha um campeonato e fale com o organizador</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-3 space-y-2">
          {carregando ? (
            <div className="flex h-20 items-center justify-center gap-2 border border-slate-200 bg-white text-xs font-black uppercase text-slate-500">
              <Loader2 className="animate-spin" size={17} /> Carregando eventos
            </div>
          ) : erro ? (
            <div className="border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div>
          ) : lista.length === 0 ? (
            <div className="border border-slate-200 bg-white p-5 text-center">
              <p className="text-sm font-black uppercase text-slate-900">Nenhum evento disponível</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Assim que houver campeonato com WhatsApp, ele aparece aqui.</p>
            </div>
          ) : (
            lista.map((campeonato) => {
              const href = linkInscricao(campeonato)

              return (
                <article key={campeonato.id} className="overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <div className="relative bg-gradient-to-r from-cyan-500 to-violet-600 p-3 text-white">
                    <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(135deg,rgba(255,255,255,.30)_0_8%,transparent_8%_16%)] [background-size:24px_24px]" />
                    <div className="relative flex items-center gap-3">
                      <LogoEvento campeonato={campeonato} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/75">{campeonato.tipo_campeonato || campeonato.tipo || 'Campeonato'}</p>
                        <h2 className="mt-1 truncate text-lg font-black uppercase tracking-[-0.04em]">{campeonato.nome || 'Evento'}</h2>
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase text-white/80">
                          <CalendarDays size={12} /> {formatarData(campeonato.data_inicio)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-200">
                    <div className="bg-white p-2">
                      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Inscrição</p>
                      <p className="mt-0.5 text-xs font-black uppercase text-slate-950">{moeda.format(Number(campeonato.valor_vaga || 0))}</p>
                    </div>
                    <div className="bg-white p-2">
                      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Premiação</p>
                      <p className="mt-0.5 text-xs font-black uppercase text-slate-950">{moeda.format(Number(campeonato.valor_premiacao || 0))}</p>
                    </div>
                  </div>

                  <div className="p-2">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-11 w-full items-center justify-center gap-2 bg-emerald-500 text-[11px] font-black uppercase text-white"
                      >
                        <MessageCircle size={16} /> Inscrever pelo WhatsApp
                      </a>
                    ) : (
                      <button type="button" disabled className="h-11 w-full border border-slate-200 bg-slate-100 text-[11px] font-black uppercase text-slate-400">
                        WhatsApp não cadastrado
                      </button>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
