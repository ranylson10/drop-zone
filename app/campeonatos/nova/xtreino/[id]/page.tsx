'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CampeonatoDetalhePage from '@/app/campeonatos/[id]/page'
import DiarioDetalhePage from '@/app/campeonatos/diarios/[id]/page'

type XtreinoConfig = {
 campeonato_id: string
 modo_xtreino?: string | null
 tipo_regra?: string | null
 tipo_inscricao?: string | null
 tem_premiacao?: boolean | null
}

function normalizarModo(modo?: string | null) {
 const valor = String(modo || '').trim().toLowerCase()

 if (valor === 'jogo_unico') return 'jogo_unico'
 if (valor === 'mata_mata') return 'mata_mata'
 if (valor === 'pontos_corridos') return 'pontos_corridos'

 return null
}

export default function PageXtreinoDetalhe() {
 const params = useParams<{ id: string }>()
 const campeonatoId = String(params?.id || '')

 const [loading, setLoading] = useState(true)
 const [modo, setModo] = useState<string | null>(null)

 useEffect(() => {
 let ativo = true
 async function carregar() {
 if (!campeonatoId) {
 setLoading(false)
 return
 }

 try {
 const { data, error } = await supabase
 .from('campeonatos_xtreinos_config')
 .select('campeonato_id, modo_xtreino, tipo_regra, tipo_inscricao, tem_premiacao')
 .eq('campeonato_id', campeonatoId)
 .maybeSingle()

 if (error) {
 console.error('Erro ao carregar config do xtreino:', error)
 if (ativo) {
 setModo(null)
 }
 return
 }

 const config = (data || null) as XtreinoConfig | null
 const modoResolvido = normalizarModo(config?.modo_xtreino)

 if (ativo) {
 setModo(modoResolvido)
 }
 } finally {
 if (ativo) {
 setLoading(false)
 }
 }
 }

 carregar()

 return () => {
 ativo = false
 }
 }, [campeonatoId])

 if (loading) {
 return (
 <div className="min-h-screen bg-white text-[#142340] flex items-center justify-center">
 <div className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Carregando xtreino...
 </div>
 </div>
 )
 }

 // XTREINO em modo jogo único reaproveita a página de diário.
 if (modo === 'jogo_unico') {
 return <DiarioDetalhePage />
 }

 // Mata-mata e pontos corridos reaproveitam a página genérica atual
 // (mesma base usada por copa e liga).
 return <CampeonatoDetalhePage />
}
