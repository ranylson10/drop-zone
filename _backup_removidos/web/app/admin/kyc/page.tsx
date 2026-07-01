'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type KycRow = {
 user_id: string
 status?: string | null
 nome_completo?: string | null
 cpf?: string | null
 telefone?: string | null
 score_verificacao?: number | null
 resultado_automatico?: string | null
 motivo_reprovacao?: string | null
 revisao_manual_necessaria?: boolean | null
 created_at?: string | null
}

function formatarData(valor?: string | null) {
 if (!valor) return '—'
 try {
 return new Date(valor).toLocaleString('pt-BR')
 } catch {
 return valor
 }
}

export default function AdminKycPage() {
 const [lista, setLista] = useState<KycRow[]>([])
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 carregar()
 }, [])

 async function carregar() {
 setLoading(true)
 const { data } = await supabase
 .from('wallet_kyc')
 .select('user_id, status, nome_completo, cpf, telefone, score_verificacao, resultado_automatico, motivo_reprovacao, revisao_manual_necessaria, created_at')
 .order('created_at', { ascending: false })

 setLista((data as KycRow[]) || [])
 setLoading(false)
 }

 async function atualizarStatus(userId: string, status: 'verificada' | 'rejeitada') {
 const updates: any = {
 status,
 updated_at: new Date().toISOString(),
 revisao_manual_necessaria: false,
 }

 if (status === 'verificada') {
 updates.verificado_em = new Date().toISOString()
 updates.motivo_reprovacao = null
 }

 const { error } = await supabase
 .from('wallet_kyc')
 .update(updates)
 .eq('user_id', userId)

 if (!error) await carregar()
 }

 return (
 <div className="mx-auto max-w-6xl p-8">
 <h1 className="text-2xl font-semibold uppercase text-[#142340]">Painel KYC</h1>

 <div className="mt-6 border border-zinc-200 bg-white">
 <div className="grid grid-cols-[1.2fr,1fr,120px,120px,160px,220px] gap-3 border-b border-zinc-200 bg-[#f3f3ef] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 <div>Usuário</div>
 <div>CPF / Telefone</div>
 <div>Status</div>
 <div>Score</div>
 <div>Automático</div>
 <div>Ações</div>
 </div>

 {loading ? (
 <div className="p-6 text-sm font-semibold text-zinc-500">Carregando...</div>
 ) : lista.length === 0 ? (
 <div className="p-6 text-sm font-semibold text-zinc-500">Nenhum KYC encontrado.</div>
 ) : (
 <div className="divide-y divide-black">
 {lista.map((item) => (
 <div key={item.user_id} className="grid grid-cols-[1.2fr,1fr,120px,120px,160px,220px] gap-3 px-4 py-4">
 <div>
 <div className="text-sm font-semibold uppercase text-[#142340]">{item.nome_completo || 'Sem nome'}</div>
 <div className="text-[11px] font-semibold text-zinc-500">{formatarData(item.created_at)}</div>
 {item.motivo_reprovacao ? (
 <div className="mt-1 text-[11px] font-semibold text-red-700">{item.motivo_reprovacao}</div>
 ) : null}
 </div>
 <div className="text-sm font-semibold text-zinc-700">
 <div>{item.cpf || '—'}</div>
 <div>{item.telefone || '—'}</div>
 </div>
 <div className="text-sm font-semibold uppercase text-[#142340]">{item.status || '—'}</div>
 <div className="text-sm font-semibold text-[#142340]">{item.score_verificacao ?? '—'}</div>
 <div className="text-sm font-semibold text-zinc-700">
 {item.resultado_automatico || '—'}
 {item.revisao_manual_necessaria ? ' • revisar' : ''}
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => atualizarStatus(item.user_id, 'verificada')}
 className="border border-zinc-200 bg-[#2563eb] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#142340]"
 >
 Aprovar
 </button>
 <button
 onClick={() => atualizarStatus(item.user_id, 'rejeitada')}
 className="border border-zinc-200 bg-[#ffe5e0] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#142340]"
 >
 Reprovar
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )
}
