'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Medal, ShieldCheck, Star, Trophy } from 'lucide-react'

function reputacaoLabel(media: number) {
 if (media >= 4.8) return 'Elite'
 if (media >= 4.5) return 'Excelente'
 if (media >= 4.0) return 'Muito boa'
 if (media >= 3.5) return 'Boa'
 if (media >= 3.0) return 'Regular'
 return 'Em evolução'
}

function reputacaoCor(media: number) {
 if (media >= 4.5) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
 if (media >= 4.0) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
 if (media >= 3.0) return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
 return 'text-rose-400 border-rose-500/30 bg-rose-500/10'
}

function formatarData(valor?: string | null) {
 if (!valor) return '---'
 const data = new Date(valor)
 if (Number.isNaN(data.getTime())) return '---'
 return data.toLocaleDateString('pt-BR')
}

export default function ReputacaoCampeonato({
 campeonatoId,
}: {
 campeonatoId: string
}) {
 const [campAtual, setCampAtual] = useState<any>(null)
 const [lista, setLista] = useState<any[]>([])

 useEffect(() => {
 carregar()
 }, [campeonatoId])

 async function carregar() {
 const { data: campData } = await supabase
 .from('campeonatos')
 .select('id, nome, data_inicio, produtora_id, produtoras!produtora_id(id, nome)')
 .eq('id', campeonatoId)
 .single()

 setCampAtual(campData || null)

 if (!campData?.produtora_id) {
 setLista([])
 return
 }

 const { data: campeonatosData } = await supabase
 .from('campeonatos')
 .select('id, nome, data_inicio, status')
 .eq('produtora_id', campData.produtora_id)

 const ids = (campeonatosData || []).map((item: any) => item.id)
 if (ids.length === 0) {
 setLista([])
 return
 }

 const { data: avaliacoesData } = await supabase
 .from('avaliacoes_campeonato')
 .select('campeonato_id, nota')
 .in('campeonato_id', ids)

 const mapa = new Map<string, { soma: number; total: number }>()
 for (const item of avaliacoesData || []) {
 const atual = mapa.get(item.campeonato_id) || { soma: 0, total: 0 }
 atual.soma += Number(item.nota || 0)
 atual.total += 1
 mapa.set(item.campeonato_id, atual)
 }

 const final = (campeonatosData || []).map((item: any) => {
 const agg = mapa.get(item.id) || { soma: 0, total: 0 }
 return {
 ...item,
 total: agg.total,
 media: agg.total > 0 ? agg.soma / agg.total : 0,
 }
 })

 setLista(final)
 }

 const ranking = useMemo(() => {
 return [...lista].sort((a, b) => {
 if (b.media !== a.media) return b.media - a.media
 if (b.total !== a.total) return b.total - a.total
 return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
 })
 }, [lista])

 const atual = useMemo(() => ranking.find((i) => i.id === campeonatoId) || null, [ranking, campeonatoId])

 return (
 <div className="bg-white border border-zinc-200 -[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
 <div className="bg-white px-5 py-4 flex items-center justify-between">
 <div>
 <h3 className="text-sm font-semibold uppercase text-[#2563eb] flex items-center gap-2">
 <ShieldCheck size={16} />
 Reputação
 </h3>
 <p className="mt-1 text-[10px] font-semibold uppercase text-zinc-500">
 Histórico da organizadora
 </p>
 </div>

 {atual && (
 <div className={`px-3 py-1 border text-[9px] font-semibold uppercase ${reputacaoCor(atual.media || 0)}`}>
 {reputacaoLabel(atual.media || 0)}
 </div>
 )}
 </div>

 <div className="p-5 space-y-5 bg-[#f7f7f7]">
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-white border border-zinc-200 p-4">
 <div className="text-[9px] font-semibold uppercase text-zinc-500">Nota atual</div>
 <div className="mt-2 text-3xl font-semibold text-[#142340]">
 {atual ? Number(atual.media || 0).toFixed(1) : '0.0'}
 </div>
 </div>

 <div className="bg-white border border-zinc-200 p-4">
 <div className="text-[9px] font-semibold uppercase text-zinc-500">Avaliações</div>
 <div className="mt-2 text-3xl font-semibold text-[#142340]">{atual?.total || 0}</div>
 </div>
 </div>

 <div className="bg-white border border-zinc-200 p-4">
 <div className="flex items-center gap-2 mb-3">
 <Trophy size={14} className="text-[#2563eb]" />
 <span className="text-[10px] font-semibold uppercase text-[#142340]">Ranking da organizadora</span>
 </div>

 <div className="space-y-2">
 {ranking.length === 0 ? (
 <div className="text-[10px] font-semibold uppercase text-zinc-500">Sem histórico suficiente.</div>
 ) : (
 ranking.slice(0, 6).map((item, index) => (
 <div
 key={item.id}
 className={`flex items-center justify-between gap-3 p-3 border ${
 item.id === campeonatoId ? 'border-zinc-200 bg-[#eaffd7]' : 'border-zinc-200 bg-white'
 }`}
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-8 h-8 border border-zinc-200 flex items-center justify-center bg-white text-[#2563eb] text-[10px] font-semibold">
 {index === 0 ? <Trophy size={12} /> : index === 1 ? <Medal size={12} /> : index + 1}
 </div>

 <div className="min-w-0">
 <div className="text-[10px] font-semibold uppercase text-[#142340] truncate">{item.nome}</div>
 <div className="text-[8px] font-semibold uppercase text-zinc-500">
 {item.total} avaliação(ões) • {formatarData(item.data_inicio)}
 </div>
 </div>
 </div>

 <div className="text-right shrink-0">
 <div className="text-[14px] font-semibold text-[#142340] flex items-center justify-end gap-1">
 {Number(item.media || 0).toFixed(1)} <Star size={11} className="text-[#2563eb]" fill="currentColor" />
 </div>
 <div className="text-[8px] font-semibold uppercase text-zinc-500">
 {reputacaoLabel(item.media || 0)}
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 <div className="bg-white border border-zinc-200 p-4">
 <div className="text-[10px] font-semibold uppercase text-[#142340] mb-2">
 Como a reputação funciona
 </div>
 <ul className="space-y-2 text-[10px] text-zinc-500 font-semibold">
 <li>• Média das avaliações dos campeonatos da mesma organizadora.</li>
 <li>• Considera participação real de equipes e jogadores.</li>
 <li>• Quanto mais avaliações qualificadas, mais confiável o selo.</li>
 </ul>
 </div>
 </div>
 </div>
 )
}
