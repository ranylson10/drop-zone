'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Database, Download, Lock, Unlock, Shuffle, Target, Layers, Star } from 'lucide-react'

const MAPAS_DISPONIVEIS = [
 { id: 'bermuda', nome: 'Bermuda', thumb: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/campeonatos/mapas/mapa_bermuda_1769848689953.png' },
 { id: 'purgatorio', nome: 'Purgatório', thumb: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/campeonatos/mapas/mapa_purgatorio_1769848697898.png' },
 { id: 'kalahari', nome: 'Kalahari', thumb: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/campeonatos/mapas/mapa_kalahari_1769848703639.png' },
 { id: 'alpes', nome: 'Alpes', thumb: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/campeonatos/mapas/mapa_alpes_1769848718078.png' },
 { id: 'nova_terra', nome: 'Nova Terra', thumb: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/campeonatos/mapas/mapa_nova-terra_1769848727412.png' },
 { id: 'solara', nome: 'Solara', thumb: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/campeonatos/mapas/mapa_solara_1769848734086.png' }
]

export default function PaginaSorteio() {
 const searchParams = useSearchParams()
 const router = useRouter()
 const params = useParams()
 const canvasRef = useRef<HTMLCanvasElement>(null)
 
 const blocoId = searchParams.get('bloco')
 const faseId = searchParams.get('fase')
 const qtdUrl = parseInt(searchParams.get('qtd') || '0')
 
 const [jogos, setJogos] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [salvando, setSalvando] = useState(false)
 const [tentativas, setTentativas] = useState(0)
 const [mapasTravados, setMapasTravados] = useState<string[]>([])
 const [resultadoSorteio, setResultadoSorteio] = useState<any[]>([])
 const [destacarUltima, setDestacarUltima] = useState(false)
 const [qtdQuedasManual, setQtdQuedasManual] = useState<number>(qtdUrl)

 const [nomeCampeonato, setNomeCampeonato] = useState('CARREGANDO...')
 const [nomeJogoHeader, setNomeJogoHeader] = useState('') 
 const [logoUrl, setLogoUrl] = useState<string | null>(null)
 const [subtitulo, setSubtitulo] = useState('CARREGANDO...')
 const [campeonatoId, setCampeonatoId] = useState<string | null>(null)

 useEffect(() => {
 async function carregarDadosIniciais() {
 if (!blocoId) {
 setLoading(false)
 return
 }
 setLoading(true)
 const { data } = await supabase
 .from('jogos')
 .select(`
 *,
 fases!inner (
 id,
 nome,
 campeonato_id,
 campeonatos!inner (
 nome,
 logo_url
 )
 )
 `)
 .eq('bloco_id', blocoId)

 if (data && data.length > 0) {
 const primeiroJogo = data[0]
 const faseInfo = (primeiroJogo as any).fases
 const campInfo = faseInfo.campeonatos
 setNomeCampeonato(campInfo.nome)
 setLogoUrl(campInfo.logo_url)
 setCampeonatoId(faseInfo.campeonato_id)
 const nomeLimpo = primeiroJogo.nome_jogo.split(' - ')[0] || "Rodada"
 setNomeJogoHeader(nomeLimpo)
 setSubtitulo(faseInfo.nome.toUpperCase())
 const ordenados = data.sort((a: any, b: any) => 
 a.nome_jogo.localeCompare(b.nome_jogo, undefined, { numeric: true })
 )
 setJogos(ordenados)
 if (qtdUrl <= 0) setQtdQuedasManual(ordenados.length)
 }
 setLoading(false)
 }
 carregarDadosIniciais()
 }, [blocoId, qtdUrl])

 const handleVoltar = () => {
 const id = params.id || campeonatoId
 if (id) router.push(`/campeonatos/${id}?tab=jogos`)
 else router.back()
 }

 const toggleMapaPool = (id: string) => {
 setMapasTravados(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
 }

 const executarSorteio = () => {
 if (qtdQuedasManual <= 0) return alert("Defina a quantidade de quedas.")
 if (mapasTravados.length > qtdQuedasManual) return alert("Mais mapas travados que quedas.")
 setTentativas(prev => prev + 1)
 let listaFinal = MAPAS_DISPONIVEIS.filter(m => mapasTravados.includes(m.id))
 const vagasRestantes = qtdQuedasManual - listaFinal.length
 if (vagasRestantes > 0) {
 const poolDisponivel = MAPAS_DISPONIVEIS.filter(m => !mapasTravados.includes(m.id))
 for (let i = 0; i < vagasRestantes; i++) {
 const randomMap = poolDisponivel[Math.floor(Math.random() * poolDisponivel.length)]
 listaFinal.push(randomMap)
 }
 }
 setResultadoSorteio([...listaFinal].sort(() => Math.random() - 0.5))
 }

 const salvarResultados = async () => {
 if (resultadoSorteio.length === 0) return
 setSalvando(true)
 try {
 const updates = jogos.slice(0, resultadoSorteio.length).map((jogo, index) => (
 supabase.from('jogos').update({ 
 mapa: resultadoSorteio[index]?.nome,
 metodo_selecao: 'sorteado' 
 }).eq('id', jogo.id)
 ))
 await Promise.all(updates)
 alert("Sorteio aplicado com sucesso!")
 } catch (err: any) { alert(err.message) } finally { setSalvando(false) }
 }

 const baixarComprovante = async () => {
 const canvas = canvasRef.current
 if (!canvas || resultadoSorteio.length === 0) return
 const ctx = canvas.getContext('2d')
 if (!ctx) return

 const W = 1080
 const headerH = 400 
 const infoH = 150
 const cardH = 180 
 const gap = 25
 const footerH = 120
 const H = headerH + infoH + (resultadoSorteio.length * (cardH + gap)) + footerH
 
 canvas.width = W
 canvas.height = H

 ctx.fillStyle = '#ffffff' 
 ctx.fillRect(0, 0, W, H)

 ctx.fillStyle = '#ea580c'
 ctx.fillRect(0, 0, W, headerH)

 const logoSize = 180
 if (logoUrl) {
 const logoImg = new Image()
 logoImg.crossOrigin = "anonymous"
 logoImg.src = logoUrl
 await new Promise(r => {
 logoImg.onload = () => {
 ctx.drawImage(logoImg, (W/2) - (logoSize/2), 40, logoSize, logoSize)
 r(null)
 }
 logoImg.onerror = () => r(null)
 })
 }

 ctx.fillStyle = '#ffffff'
 ctx.textAlign = 'center'
 ctx.font = '900 70px sans-serif'
 ctx.fillText(nomeCampeonato.toUpperCase(), W/2, logoUrl ? 280 : 150)
 ctx.font = 'bold 50px sans-serif'
 ctx.fillText(nomeJogoHeader.toUpperCase(), W/2, logoUrl ? 345 : 220)

 ctx.fillStyle = '#71717a'
 ctx.font = 'bold 24px sans-serif'
 ctx.fillText(`SORTEIO REALIZADO EM: ${new Date().toLocaleString()}`, W/2, headerH + 65)
 ctx.font = '300 24px sans-serif'
 ctx.fillText(`TENTATIVAS: ${tentativas} | TOTAL DE QUEDAS: ${resultadoSorteio.length}`, W/2, headerH + 105)

 const cardW = 940
 const startY = headerH + infoH
 const startX = (W - cardW) / 2

 for (let i = 0; i < resultadoSorteio.length; i++) {
 const mapa = resultadoSorteio[i]
 const currentY = startY + (i * (cardH + gap))
 const isUltima = destacarUltima && i === resultadoSorteio.length - 1

 ctx.fillStyle = '#f4f4f5'
 ctx.fillRect(startX, currentY, cardW, cardH)
 ctx.strokeStyle = isUltima ? '#fbbf24' : '#e4e4e7'
 ctx.lineWidth = 4
 ctx.strokeRect(startX, currentY, cardW, cardH)

 const img = new Image()
 img.crossOrigin = "anonymous"
 img.src = mapa.thumb
 await new Promise(r => {
 img.onload = () => {
 ctx.drawImage(img, startX + 15, currentY + 15, 260, cardH - 30)
 r(null)
 }
 img.onerror = () => r(null)
 })

 ctx.textAlign = 'left'
 ctx.fillStyle = '#ea580c'
 ctx.font = 'bold 24px sans-serif'
 ctx.fillText(`${i + 1}ª QUEDA`, startX + 300, currentY + 60)
 
 ctx.fillStyle = '#18181b'
 ctx.font = '900 55px sans-serif'
 ctx.fillText(mapa.nome.toUpperCase(), startX + 300, currentY + 125)

 if (isUltima) {
 ctx.fillStyle = '#b45309'
 ctx.font = 'bold 22px sans-serif'
 // Desenha estrela simples via texto unicode ou desenho manual
 ctx.fillText('★ KILL VALENDO 2 PONTOS', startX + 300, currentY + 160)
 }
 }

 ctx.fillStyle = '#ea580c'
 ctx.fillRect(0, H - footerH, W, footerH)
 ctx.fillStyle = '#ffffff'
 ctx.textAlign = 'center'
 ctx.font = 'bold 36px sans-serif'
 ctx.fillText('VERIFICADO PELO SORTEADOR PRO', W/2, H - (footerH / 2) + 12)

 const link = document.createElement('a')
 link.download = `Sorteio_${nomeCampeonato}_${nomeJogoHeader}.png`
 link.href = canvas.toDataURL('image/png')
 link.click()
 }

 if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-orange-500" size={40} /></div>

 return (
 <div className="min-h-screen bg-white p-6 font-sans text-[#142340]">
 <canvas ref={canvasRef} className="hidden" />
 
 <div className="max-w-6xl mx-auto">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-l-4 border-orange-600 pl-6 gap-6">
 <div className="flex-1 w-full space-y-4">
 <button onClick={handleVoltar} className="flex items-center gap-2 text-zinc-500 hover:text-[#142340] mb-2 font-semibold uppercase text-[10px] tracking-widest transition-colors">
 <ArrowLeft size={14} /> Voltar para o Campeonato
 </button>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[9px] font-semibold text-orange-500 uppercase tracking-widest">Campeonato Identificado</label>
 <div className="flex items-center gap-3">
 {logoUrl && <img src={logoUrl} className="w-12 h-12 object-cover border border-zinc-200" />}
 <div>
 <h1 className="text-[#142340] text-2xl font-semibold uppercase tracking-tighter">{nomeCampeonato}</h1>
 <span className="text-orange-500 font-bold text-sm uppercase ">{nomeJogoHeader}</span>
 </div>
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-[9px] font-semibold text-orange-500 uppercase tracking-widest">Subtítulo (Fase / Rodada)</label>
 <input value={subtitulo} onChange={e => setSubtitulo(e.target.value.toUpperCase())} className="bg-transparent border-b border-zinc-200 text-[#142340] text-2xl font-semibold w-full outline-none focus:border-orange-500 transition-all uppercase " />
 </div>
 </div>
 </div>

 <div className="flex flex-wrap gap-3">
 <div className="flex items-center bg-white border border-zinc-200 px-3 py-1 gap-3 h-12">
 <Layers size={14} className="text-zinc-500" />
 <input type="number" value={qtdQuedasManual} onChange={e => setQtdQuedasManual(Number(e.target.value))} className="bg-transparent text-[#142340] font-semibold text-xl w-12 text-center outline-none" />
 </div>
 <button onClick={() => setDestacarUltima(!destacarUltima)} className={`h-12 px-4 py-2 text-[10px] font-semibold uppercase flex items-center gap-2 border transition-all ${destacarUltima ? 'bg-amber-500 text-[#142340] border-amber-500' : 'text-zinc-500 border-zinc-200'}`}>
 <Target size={14} /> Kill Dobrada
 </button>
 <button onClick={executarSorteio} className="bg-orange-600 h-12 text-[#142340] px-6 py-2 text-[10px] font-semibold uppercase flex items-center gap-2 hover:bg-orange-500 transition-all -[4px_4px_0px_#7c2d12]">
 <Shuffle size={14} /> Gerar Sequência
 </button>
 </div>
 </div>

 <div className="bg-white/20 p-6 border border-zinc-200 mb-8">
 <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-[0.3em] mb-4 block underline decoration-orange-600">1. Selecione Mapas Obrigatórios (Opcional)</span>
 <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
 {MAPAS_DISPONIVEIS.map((mapa) => (
 <div key={mapa.id} onClick={() => toggleMapaPool(mapa.id)} className={`relative cursor-pointer border-2 transition-all overflow-hidden aspect-[4/5] flex flex-col justify-end group ${mapasTravados.includes(mapa.id) ? 'border-orange-600 scale-[1.02]' : 'border-zinc-200 grayscale opacity-40'}`}>
 <img src={mapa.thumb} alt={mapa.nome} className="absolute inset-0 w-full h-full object-cover" />
 <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
 <div className="absolute top-3 right-3">{mapasTravados.includes(mapa.id) ? <Lock size={18} className="text-orange-500" /> : <Unlock size={18} className="text-[#142340]/20" />}</div>
 <div className="relative z-10 p-4 font-semibold uppercase text-[10px] tracking-widest text-[#142340]">{mapa.nome}</div>
 </div>
 ))}
 </div>
 </div>

 {resultadoSorteio.length > 0 && (
 <div className="bg-white/40 border border-zinc-200 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
 <h2 className="text-zinc-500 font-semibold uppercase text-[11px] tracking-[0.5em] ">2. Sequência Gerada</h2>
 <div className="flex gap-2">
 <button onClick={baixarComprovante} className="bg-white text-[#142340] px-4 py-2 text-[10px] font-semibold uppercase flex items-center gap-2 hover:bg-zinc-200 transition-all">
 <Download size={14} /> Baixar Comprovante
 </button>
 <button onClick={salvarResultados} disabled={salvando} className="bg-orange-600 text-[#142340] px-4 py-2 text-[10px] font-semibold uppercase flex items-center gap-2 hover:bg-orange-500 transition-all disabled:opacity-50">
 {salvando ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />} Salvar no Banco
 </button>
 </div>
 </div>

 <div className="flex flex-wrap gap-6 justify-center">
 {resultadoSorteio.map((mapa, idx) => {
 const isUltima = destacarUltima && idx === resultadoSorteio.length - 1;
 return (
 <div key={idx} className={`bg-[#f7f7f7] border-2 transition-all w-full md:w-[180px] ${isUltima ? 'border-amber-500 -[0_0_20px_rgba(245,158,11,0.2)]' : 'border-zinc-200'}`}>
 <div className="h-24 relative overflow-hidden">
 <img src={mapa.thumb} className={`w-full h-full object-cover ${isUltima ? 'opacity-100' : 'opacity-60'}`} />
 <div className="absolute top-2 left-2 bg-white/80 px-2 py-0.5 text-[7px] font-semibold text-[#142340] uppercase border border-zinc-200">Queda {idx + 1}</div>
 </div>
 <div className="p-3 text-center">
 <div className={`font-semibold uppercase text-[10px] tracking-widest ${isUltima ? 'text-amber-500' : 'text-[#142340]'}`}>{mapa.nome}</div>
 {isUltima && (
 <div className="text-[7px] text-amber-500 font-bold mt-1 uppercase flex items-center justify-center gap-1">
 <Star size={8} fill="currentColor" /> KILL VALENDO 2 PONTOS
 </div>
 )}
 </div>
 </div>
 )
 })}
 </div>
 </div>
 )}
 </div>
 </div>
 )
}