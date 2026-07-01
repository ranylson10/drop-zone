'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { 
 Plus, Trash2, Users, Loader2, ThumbsUp, Eye
} from 'lucide-react'

interface WatchParty {
 id: string
 canal_nome: string
 url_live: string
 is_oficial: boolean
 viewers_manual: number
 likes_atual: number
 views_totais: number
 is_live: boolean
}

export default function GerenciarWatchParty({ campeonatoId, canEdit = false }: { campeonatoId: string; canEdit?: boolean }) {
 const [lives, setLives] = useState<WatchParty[]>([])
 const [loading, setLoading] = useState(true)
 const [nomeCanal, setNomeCanal] = useState('')
 const [urlLive, setUrlLive] = useState('')
 const [enviando, setEnviando] = useState(false)

 // Cálculos dos Totais do Cabeçalho
 const totais = useMemo(() => {
 return lives.reduce((acc, live) => ({
 viewers: acc.viewers + (live.is_live ? (Number(live.viewers_manual) || 0) : 0),
 likes: acc.likes + (Number(live.likes_atual) || 0),
 views: acc.views + (Number(live.views_totais) || 0)
 }), { viewers: 0, likes: 0, views: 0 })
 }, [lives])

 const carregarWatchParties = useCallback(async () => {
 try {
 const { data, error } = await supabase
 .from('campeonato_watch_parties')
 .select('*')
 .eq('campeonato_id', campeonatoId)
 .order('created_at', { ascending: false })

 if (error) throw error
 setLives(data || [])
 } catch (err) {
 console.error("Erro ao carregar dados:", err)
 } finally {
 setLoading(false)
 }
 }, [campeonatoId])

 useEffect(() => {
 carregarWatchParties()
 const channel = supabase
 .channel(`watch_party_${campeonatoId}`)
 .on('postgres_changes', { 
 event: '*', 
 schema: 'public', 
 table: 'campeonato_watch_parties', 
 filter: `campeonato_id=eq.${campeonatoId}` 
 }, () => carregarWatchParties())
 .subscribe()
 return () => { supabase.removeChannel(channel) }
 }, [campeonatoId, carregarWatchParties])

 async function adicionarLive() {
 if (!nomeCanal || !urlLive) return alert("Preencha os campos")
 setEnviando(true)
 try {
 const { error } = await supabase
 .from('campeonato_watch_parties')
 .insert([{
 campeonato_id: campeonatoId,
 canal_nome: nomeCanal,
 url_live: urlLive,
 viewers_manual: 0,
 likes_atual: 0,
 views_totais: 0,
 is_live: true
 }])
 if (error) throw error
 setNomeCanal(''); setUrlLive('')
 } catch (err) { alert("Erro ao salvar") } finally { setEnviando(false) }
 }

 async function deletarLive(id: string) {
 if (!confirm("Remover esta Watch Party?")) return
 await supabase.from('campeonato_watch_parties').delete().eq('id', id)
 }

 if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-[#142340]" /></div>

 if (!canEdit) {
  return (
   <div className="border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Watch Party bloqueada</div>
    <p className="mt-2 leading-6">Adicionar ou remover lives é permitido apenas para o dono do campeonato ou ajudantes autorizados.</p>
   </div>
  )
 }

 return (
 <div className="space-y-8">
 {/* HEADER DE ESTATÍSTICAS */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-white p-6 border-b-4 border-red-600">
 <p className="text-[10px] font-semibold text-zinc-500 uppercase">Total Ao Vivo</p>
 <h3 className="text-4xl font-semibold text-[#142340] ">{totais.viewers.toLocaleString('pt-BR')}</h3>
 </div>
 <div className="bg-white p-6 border-b-4 border-[#2563eb]">
 <p className="text-[10px] font-semibold text-zinc-500 uppercase">Total de Curtidas</p>
 <h3 className="text-4xl font-semibold text-[#142340] ">{totais.likes.toLocaleString('pt-BR')}</h3>
 </div>
 <div className="bg-white p-6 border-b-4 border-blue-500">
 <p className="text-[10px] font-semibold text-zinc-500 uppercase">Visualizações Totais</p>
 <h3 className="text-4xl font-semibold text-[#142340] ">{totais.views.toLocaleString('pt-BR')}</h3>
 </div>
 </div>

 {/* FORMULÁRIO */}
 <div className="bg-white border border-zinc-200 p-8 -[8px_8px_0px_rgba(0,0,0,1)]">
 <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
 <div className="md:col-span-4">
 <input value={nomeCanal} onChange={e => setNomeCanal(e.target.value)} placeholder="NOME DO CANAL" className="w-full bg-zinc-100 p-4 font-bold outline-none border-2 border-transparent focus:border-zinc-200" />
 </div>
 <div className="md:col-span-5">
 <input value={urlLive} onChange={e => setUrlLive(e.target.value)} placeholder="URL DO YOUTUBE" className="w-full bg-zinc-100 p-4 font-bold outline-none border-2 border-transparent focus:border-zinc-200" />
 </div>
 <div className="md:col-span-3">
 <button onClick={adicionarLive} disabled={enviando} className="w-full bg-white text-[#142340] py-4 font-semibold uppercase hover:bg-[#2563eb] hover:text-[#142340] transition-all">
 {enviando ? "Salvando..." : "Confirmar Live"}
 </button>
 </div>
 </div>
 </div>

 {/* LISTAGEM */}
 <div className="space-y-4">
 {lives.map((live) => {
 const videoId = live.url_live.includes('v=') ? live.url_live.split('v=')[1]?.split('&')[0] : live.url_live.split('/').pop();

 return (
 <div key={live.id} className={`flex flex-col md:flex-row items-center gap-6 p-5 bg-white border-2 ${!live.is_live ? 'grayscale border-dashed opacity-60' : 'border-zinc-200'}`}>
 <div className="w-48 h-28 bg-white relative">
 <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} className="w-full h-full object-cover" alt="thumb" />
 <div className={`absolute top-2 right-2 px-2 py-1 text-[8px] font-semibold text-[#142340] ${live.is_live ? 'bg-red-600 animate-pulse' : 'bg-zinc-500'}`}>
 {live.is_live ? "AO VIVO" : "ENCERRADA"}
 </div>
 </div>

 <div className="flex-1">
 <h4 className="text-2xl font-semibold uppercase leading-none">{live.canal_nome}</h4>
 <p className="text-zinc-500 text-[10px] uppercase truncate max-w-xs">{live.url_live}</p>
 </div>

 <div className="flex gap-8">
 <div className="text-center min-w-[100px]">
 <span className="text-[8px] font-semibold text-zinc-500 uppercase">{live.is_live ? "Público" : "Total Views"}</span>
 <div className="flex items-center justify-center gap-2">
 {live.is_live ? <Users size={16} className="text-red-600" /> : <Eye size={16} className="text-blue-500" />}
 <span className="text-2xl font-semibold ">
 {(live.is_live ? live.viewers_manual : live.views_totais).toLocaleString('pt-BR')}
 </span>
 </div>
 </div>

 <div className="text-center min-w-[100px]">
 <span className="text-[8px] font-semibold text-zinc-500 uppercase">Curtidas</span>
 <div className="flex items-center justify-center gap-2 text-[#2563eb] bg-white px-2 rounded-sm">
 <ThumbsUp size={14} />
 <span className="text-xl font-semibold ">{live.likes_atual.toLocaleString('pt-BR')}</span>
 </div>
 </div>
 </div>

 <button onClick={() => deletarLive(live.id)} className="p-4 bg-zinc-100 hover:bg-red-600 hover:text-[#142340] transition-all">
 <Trash2 size={20} />
 </button>
 </div>
 )
 })}
 </div>
 </div>
 )
}