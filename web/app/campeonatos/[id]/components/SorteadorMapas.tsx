'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
 X, Save, RefreshCw, Loader2, Dices, 
 Check, Trophy, Lock, Download, Target, FileCheck,
 ChevronDown, LayoutGrid
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { toPng } from 'html-to-image'

const MAPAS_DISPONIVEIS = [
 { id: 'Bermuda', nome: 'Bermuda', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/BERMUDA%201.png' },
 { id: 'Purgatório', nome: 'Purgatório', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/PURGATORIO%201.png' },
 { id: 'Kalahari', nome: 'Kalahari', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/KALAHARI%201.png' },
 { id: 'Alpine', nome: 'Alpine', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/ALPINE%201.png' },
 { id: 'Nova Terra', nome: 'Nova Terra', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/NOVA%20TERRA%201.png' },
 { id: 'Solara', nome: 'Solara', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/SOLARA%201.png' }
]

interface SorteadorMapasProps {
 isOpen: boolean;
 onClose: () => void;
 jogoId: string;
 campeonatoId: string;
}

export default function SorteadorMapas({ isOpen, onClose, jogoId, campeonatoId }: SorteadorMapasProps) {
 const bannerRef = useRef<HTMLDivElement>(null)
 const [loading, setLoading] = useState(false)
 const [salvando, setSalvando] = useState(false)
 const [exportando, setExportando] = useState(false)
 const [jaSalvo, setJaSalvo] = useState(false)
 const [dadosJogo, setDadosJogo] = useState<any>(null)
 const [mapasTravados, setMapasTravados] = useState<string[]>([]) 
 const [sequenciaSorteada, setSequenciaSorteada] = useState<any[]>([])
 const [animando, setAnimando] = useState(false)
 const [tentativas, setTentativas] = useState(0)
 const [killDobrada, setKillDobrada] = useState(false)

 const fetchDadosIniciais = useCallback(async () => {
 if (!jogoId || !isOpen) return
 try {
 setLoading(true)
 const { data, error } = await supabase
 .from('jogos')
 .select(`*, campeonatos (nome, logo_url)`)
 .eq('id', jogoId)
 .single()

 if (error) throw error
 setDadosJogo(data)
 
 if (data.quedas && Object.keys(data.quedas).length > 0) {
 const mapasExistentes = Object.values(data.quedas).map(nome => 
 MAPAS_DISPONIVEIS.find(m => m.nome === nome)
 ).filter(Boolean);
 setSequenciaSorteada(mapasExistentes as any[]);
 setJaSalvo(true);
 }
 } catch (error) {
 console.error(error)
 toast.error('Erro ao carregar dados')
 } finally {
 setLoading(false)
 }
 }, [jogoId, isOpen])

 useEffect(() => {
 fetchDadosIniciais()
 if (!isOpen) {
 setSequenciaSorteada([])
 setMapasTravados([])
 setTentativas(0)
 setKillDobrada(false)
 setJaSalvo(false)
 }
 }, [isOpen, fetchDadosIniciais])

 const realizarSorteio = () => {
 const totalQuedas = (dadosJogo?.num_quedas && dadosJogo.num_quedas > 0) ? dadosJogo.num_quedas : 6;
 setAnimando(true)
 setJaSalvo(false)
 
 setTimeout(() => {
 try {
 const fixos = MAPAS_DISPONIVEIS.filter(m => mapasTravados.includes(m.id))
 const disponiveis = MAPAS_DISPONIVEIS.filter(m => !mapasTravados.includes(m.id))
 const embaralhados = [...disponiveis].sort(() => Math.random() - 0.5)
 const faltam = totalQuedas - fixos.length
 const poolFinal = [...fixos, ...embaralhados.slice(0, Math.max(0, faltam))]
 const resultado = [...poolFinal].sort(() => Math.random() - 0.5)

 setSequenciaSorteada(resultado)
 setTentativas(prev => prev + 1)
 toast.success("Sorteio realizado!")
 } catch (err) {
 toast.error("Erro no sorteio")
 } finally {
 setAnimando(false)
 }
 }, 600)
 }

 const exportarBanner = async () => {
 if (!bannerRef.current) return
 try {
 setExportando(true)
 const dataUrl = await toPng(bannerRef.current, { 
 quality: 1, 
 pixelRatio: 2,
 cacheBust: true 
 })
 const link = document.createElement('a')
 link.download = `COMPROVANTE-DROPZONE-${jogoId.slice(0,5)}.png`
 link.href = dataUrl
 link.click()
 toast.success("Comprovante exportado!")
 } catch (err) {
 toast.error("Erro ao gerar comprovante")
 } finally {
 setExportando(false)
 }
 }

 async function salvarNoBanco() {
 if (sequenciaSorteada.length === 0) return toast.error("Faça o sorteio primeiro!")
 try {
 setSalvando(true)
 const quedasObjeto = sequenciaSorteada.reduce((acc: any, mapa, index) => {
 acc[index + 1] = mapa.nome
 return acc
 }, {})

 const { error } = await supabase.from('jogos').update({ 
 quedas: quedasObjeto,
 }).eq('id', jogoId)

 if (error) throw error
 setJaSalvo(true)
 toast.success("Salvo com sucesso!")
 } catch (error) {
 toast.error('Erro ao salvar no banco.')
 } finally {
 setSalvando(false)
 }
 }

 if (!isOpen) return null

 return (
 <div className="fixed inset-0 z-[999] bg-white/95 -md flex items-center justify-center p-4">
 <div className="bg-white relative w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col border border-slate-200 rounded-sm">
 
 {/* HEADER */}
 <div className="bg-white p-6 flex justify-between items-center">
 <div className="flex items-center gap-4">
 <div className="bg-[#2563eb] p-2">
 <Dices className="text-[#142340]" size={28} />
 </div>
 <div>
 <h2 className="text-2xl font-semibold uppercase text-[#142340] tracking-tighter leading-none">
 Sorteador de Mapas
 </h2>
 <p className="text-[10px] font-bold text-[#2563eb] uppercase tracking-[0.2em] mt-1">
 DropZone • Official Competition Tool
 </p>
 </div>
 </div>
 <button onClick={onClose} className="text-zinc-500 hover:text-[#142340] transition-colors">
 <X size={32} />
 </button>
 </div>

 <div className="h-1.5 bg-[#2563eb] w-full"></div>

 <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-12 bg-[#f1f5f9] no-scrollbar">
 
 {/* PAINEL DE CONTROLE (ESQUERDA) - AJUSTADO PARA ESTILO FASES/GRUPOS */}
 <div className="lg:col-span-4 space-y-6">
 
 {/* SEÇÃO REGRAS (ESTILO FASE) */}
 <div className="space-y-2">
 <div className="w-full flex items-center justify-between p-3 bg-white border border-zinc-200 -[4px_4px_0px_0px_rgba(124,252,0,1)]">
 <div className="flex items-center gap-3 text-[#142340]">
 <Target size={18} className="text-[#2563eb]" />
 <span className="font-semibold uppercase text-xs tracking-widest">Regras Extras</span>
 </div>
 <ChevronDown size={18} className="text-[#142340]" />
 </div>

 <div className="pl-3 border-l-2 border-slate-300 mt-3">
 <button 
 onClick={() => setKillDobrada(!killDobrada)}
 className={`w-full p-4 border border-zinc-200 transition-all flex items-center justify-between font-semibold uppercase text-xs -[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:translate-x-1 ${killDobrada ? 'bg-orange-500 text-[#142340] -[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-zinc-500'}`}
 >
 <span>Kill Dobrada na última?</span>
 {killDobrada ? <Check size={20} /> : <div className="w-5 h-5 border-2 border-slate-200" />}
 </button>
 </div>
 </div>

 {/* SEÇÃO MAPAS (ESTILO FASE) */}
 <div className="space-y-2">
 <div className="w-full flex items-center justify-between p-3 bg-white border border-zinc-200 -[4px_4px_0px_0px_rgba(124,252,0,1)]">
 <div className="flex items-center gap-3 text-[#142340]">
 <Lock size={18} className="text-[#2563eb]" />
 <span className="font-semibold uppercase text-xs tracking-widest">Mapas Obrigatórios</span>
 </div>
 <ChevronDown size={18} className="text-[#142340]" />
 </div>

 <div className="pl-3 border-l-2 border-slate-300 mt-3">
 <div className="grid grid-cols-2 gap-3 p-1">
 {MAPAS_DISPONIVEIS.map(m => {
 const isLocked = mapasTravados.includes(m.id);
 return (
 <button 
 key={m.id}
 onClick={() => setMapasTravados(prev => isLocked ? prev.filter(x => x !== m.id) : [...prev, m.id])}
 className={`relative aspect-video border border-zinc-200 transition-all overflow-hidden -[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 ${isLocked ? 'grayscale-0 scale-100 ring-2 ring-[#7cfc00]' : 'grayscale opacity-50'}`}
 >
 <img src={m.url} className="absolute inset-0 w-full h-full object-cover" alt={m.nome}/>
 <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
 <span className="text-[9px] text-[#142340] font-semibold uppercase">{m.nome}</span>
 </div>
 {isLocked && <div className="absolute top-1 right-1 bg-[#2563eb] p-0.5 border border-zinc-200"><Check size={10} /></div>}
 </button>
 )
 })}
 </div>
 </div>
 </div>

 {/* BOTÕES DE AÇÃO */}
 <div className="space-y-3 pt-4">
 <button 
 onClick={realizarSorteio}
 disabled={animando}
 className="w-full bg-white text-[#142340] p-5 font-semibold uppercase border border-zinc-200 -[4px_4px_0px_0px_rgba(124,252,0,1)] hover:-translate-y-1 transition-all flex flex-col items-center group disabled:opacity-50"
 >
 {animando ? <RefreshCw className="animate-spin text-[#2563eb]" size={28} /> : <Dices className="group-hover:rotate-12 transition-transform" size={28} />}
 <span className="text-sm mt-1 uppercase">Gerar Sequência</span>
 <span className="text-[9px] text-zinc-500 tracking-widest font-bold uppercase ">Tentativa #{tentativas}</span>
 </button>

 <button 
 onClick={salvarNoBanco}
 disabled={sequenciaSorteada.length === 0 || salvando}
 className="w-full bg-[#2563eb] text-[#142340] p-4 border border-zinc-200 font-semibold uppercase flex items-center justify-center gap-3 -[4px_4px_0px_0px_rgba(0,0,0,1)] hover:brightness-110 disabled:opacity-50"
 >
 {salvando ? <Loader2 className="animate-spin" /> : <Save size={20} />}
 Salvar no Banco
 </button>

 <button 
 onClick={exportarBanner}
 disabled={sequenciaSorteada.length === 0 || exportando}
 className="w-full bg-white text-slate-900 border border-zinc-200 p-4 font-semibold uppercase flex items-center justify-center gap-3 -[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 disabled:opacity-50"
 >
 {exportando ? <Loader2 className="animate-spin" /> : <Download size={20} />}
 Salvar Comprovante
 </button>
 </div>
 </div>

 {/* BANNER PREVIEW (DIREITA) - MANTIDO ORIGINAL */}
 <div className="lg:col-span-8 flex justify-center">
 <div 
 ref={bannerRef}
 className="w-[450px] bg-white text-slate-900 p-8 flex flex-col relative border border-slate-300 "
 style={{ minHeight: '780px' }}
 >
 <div className="absolute right-0 top-1/4 -rotate-90 origin-right text-slate-50 font-semibold text-6xl pointer-events-none uppercase select-none">
 DROPZONE
 </div>

 <div className="flex items-center gap-4 border-b-2 border-zinc-200 pb-6 mb-6 z-10">
 <div className="w-20 h-20 bg-white p-1 shrink-0 border-2 border-[#2563eb]">
 {dadosJogo?.campeonatos?.logo_url ? (
 <img src={dadosJogo.campeonatos.logo_url} className="w-full h-full object-cover" alt="Logo" />
 ) : <Trophy className="text-[#2563eb] w-full h-full p-2" />}
 </div>
 <div className="flex-1">
 <h1 className="text-2xl font-semibold uppercase leading-none text-slate-800 tracking-tighter">
 {dadosJogo?.campeonatos?.nome || 'CAMPEONATO'}
 </h1>
 <div className="inline-flex items-center gap-2 mt-2">
 <span className="bg-[#2563eb] text-[#142340] px-3 py-0.5 text-[10px] font-semibold uppercase">
 {dadosJogo?.nome_bloco || 'JOGO'}
 </span>
 <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-widest">OFFICIAL SORT</span>
 </div>
 </div>
 </div>

 <div className="space-y-4 flex-1 z-10">
 {sequenciaSorteada.map((mapa, i) => {
 const isLast = i === sequenciaSorteada.length - 1;
 const isKillDobrada = isLast && killDobrada;

 return (
 <div 
 key={`${mapa.id}-${i}`} 
 className={`relative flex items-center border p-3 gap-4 transition-all ${isKillDobrada ? 'border-orange-500 bg-orange-50' : 'border-zinc-200 bg-white'}`}
 >
 <div className="text-4xl font-semibold text-[#142340] absolute left-2 pointer-events-none">
 0{i + 1}
 </div>

 <div className={`w-24 h-14 border-2 overflow-hidden shrink-0 z-10 ${isKillDobrada ? 'border-orange-600' : 'border-zinc-200'}`}>
 <img src={mapa.url} className="w-full h-full object-cover" alt="" />
 </div>

 <div className="flex-1 z-10">
 <div className="flex items-center justify-between">
 <span className={`text-[9px] font-semibold uppercase ${isKillDobrada ? 'text-orange-600' : 'text-zinc-500'}`}>
 Queda nº {i+1}
 </span>
 {isKillDobrada && (
 <span className="text-[8px] bg-orange-500 text-[#142340] px-2 py-0.5 font-semibold flex items-center gap-1">
 <RefreshCw size={8} /> KILL DOBRADA
 </span>
 )}
 </div>
 <div className="text-xl font-semibold uppercase text-slate-800 leading-none mt-1">
 {mapa.nome}
 </div>
 </div>
 <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${isKillDobrada ? 'bg-orange-600' : 'bg-slate-800'}`}></div>
 </div>
 );
 })}

 {sequenciaSorteada.length === 0 && (
 <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-zinc-600">
 <Dices size={48} className="mb-2 opacity-20 animate-bounce" />
 <span className="text-[10px] font-semibold uppercase ">Aguardando Sorteio...</span>
 </div>
 )}
 </div>

 <div className="mt-8 pt-6 border-t-2 border-slate-200 flex justify-between items-end z-10">
 <div>
 <span className="text-[8px] font-semibold text-zinc-500 uppercase block mb-1">HASH / TENTATIVAS</span>
 <span className="text-[10px] font-semibold text-slate-800 uppercase ">
 #{jogoId.slice(0, 8).toUpperCase()} - T{tentativas}
 </span>
 </div>
 <div className="text-right">
 <div className="bg-white text-[#2563eb] px-3 py-1 text-[9px] font-semibold flex items-center gap-2">
 <FileCheck size={12} /> DROPZONE VERIFIED
 </div>
 <span className="text-[7px] text-zinc-500 font-bold uppercase mt-1 block">
 Gerado em {new Date().toLocaleDateString()}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}