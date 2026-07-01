'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Users } from 'lucide-react'
import { getCampeonatoHref } from '@/app/campeonatos/utils/getCampeonatoHref'

export default function ListaVagasAbertas() {
 const [campeonatos, setCampeonatos] = useState<any[]>([])
 const scrollRef = useRef<HTMLDivElement>(null)
 const [isDragging, setIsDragging] = useState(false)
 const [startX, setStartX] = useState(0)
 const [scrollLeft, setScrollLeft] = useState(0)

 useEffect(() => {
 const fetch = async () => {
 const { data } = await supabase.from('campeonatos').select('*').limit(10)
 if (data) setCampeonatos(data)
 }
 fetch()
 const stop = () => setIsDragging(false)
 window.addEventListener('mouseup', stop)
 return () => window.removeEventListener('mouseup', stop)
 }, [])

 const handleMouseDown = (e: React.MouseEvent) => {
 setIsDragging(true)
 setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0))
 setScrollLeft(scrollRef.current?.scrollLeft || 0)
 }

 const handleMouseMove = (e: React.MouseEvent) => {
 if (!isDragging || !scrollRef.current) return
 e.preventDefault()
 const x = e.pageX - scrollRef.current.offsetLeft
 const walk = (x - startX) * 2
 scrollRef.current.scrollLeft = scrollLeft - walk
 }

 return (
 <div className="w-full mb-10">
 <div className="flex items-center gap-2 mb-5">
 <div className="w-2 h-6 bg-[#2563eb] rounded-sm -[0_0_15px_rgba(255,94,0,0.4)]"></div>
 <h2 className="text-sm font-semibold uppercase tracking-widest text-[#142340]">Inscrições em Destaque</h2>
 </div>

 <div 
 ref={scrollRef}
 onMouseDown={handleMouseDown}
 onMouseMove={handleMouseMove}
 className="flex gap-4 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none pb-2"
 >
 {campeonatos.map((camp) => (
 <Link 
 key={camp.id} 
 href={getCampeonatoHref(camp.id, camp.tipo_competicao || camp.modelo_competicao || camp.tipo)}
 draggable="false"
 className="flex-none w-[280px] group relative aspect-video bg-white overflow-hidden border border-zinc-200 hover:border-[#2563eb]/50 transition-all duration-300"
 >
 <img 
 src={camp.banner_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600"} 
 className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
 alt=""
 draggable="false"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-[#1a242d] via-transparent to-transparent"></div>
 
 {/* Badge de Vagas */}
 <div className="absolute top-3 right-3 bg-[#2563eb] text-[#142340] text-[10px] font-semibold px-2.5 py-1 rounded-full ">
 {camp.vagas} VAGAS
 </div>

 <div className="absolute bottom-0 left-0 right-0 p-4">
 <p className="text-xs font-semibold text-[#142340] uppercase truncate mb-1">{camp.nome}</p>
 <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
 <span className="flex items-center gap-1"><Users size={12} /> TORNEIO ATIVO</span>
 <Trophy size={14} className="text-[#2563eb]" />
 </div>
 </div>
 </Link>
 ))}
 </div>
 </div>
 )
}
