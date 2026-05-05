'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, UserPlus, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ModalAdicionarMembroProps {
 equipeId: string
 isOpen: boolean
 onClose: () => void
 onSuccess: () => void
}

export default function ModalAdicionarMembro({ equipeId, isOpen, onClose, onSuccess }: ModalAdicionarMembroProps) {
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const [success, setSuccess] = useState(false)
 const [email, setEmail] = useState('')

 if (!isOpen) return null

 const handleAddMembro = async (e: React.FormEvent) => {
 e.preventDefault()
 setLoading(true)
 setError('')

 try {
 // 1. Buscar o perfil do usuário pelo e-mail na tabela de perfis
 const { data: userData, error: userError } = await supabase
 .from('profiles') 
 .select('id')
 .eq('email', email.toLowerCase())
 .single()

 if (userError || !userData) {
 throw new Error("Usuário não encontrado. Verifique o e-mail digitado.")
 }

 // 2. Inserir o vínculo na tabela de membros
 // Nota: Certifique-se de que a tabela 'membros_equipe' existe com as colunas equipe_id e usuario_id
 const { error: insertError } = await supabase
 .from('membros_equipe')
 .insert([{
 equipe_id: equipeId,
 usuario_id: userData.id,
 cargo: 'MEMBRO'
 }])

 if (insertError) {
 if (insertError.code === '23505') throw new Error("Este atleta já faz parte da equipe.")
 throw insertError
 }

 // 3. Atualizar o total_membros na tabela equipes
 // Aqui usamos um comando RPC ou uma atualização direta simples para teste
 const { error: updateError } = await supabase.rpc('increment_membros', { row_id: equipeId })
 
 // Caso não tenha a função RPC ainda, você pode fazer um update manual (menos seguro contra concorrência):
 // await supabase.from('equipes').update({ total_membros: total + 1 }).eq('id', equipeId)

 setSuccess(true)
 
 // Delay para o usuário ver o feedback de sucesso
 setTimeout(() => {
 onSuccess()
 onClose()
 setSuccess(false)
 setEmail('')
 }, 2000)

 } catch (err: any) {
 console.error('ERRO AO ADICIONAR:', err)
 setError(err.message || "Erro ao processar convite.")
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/90 ">
 <div className="w-full max-w-md bg-white border border-zinc-200 rounded-sm p-8 relative ">
 
 {/* BOTÃO FECHAR */}
 <button 
 onClick={onClose} 
 className="absolute top-4 right-4 text-zinc-500 hover:text-[#142340] transition-colors"
 >
 <X size={20} />
 </button>

 <div className="flex items-center gap-3 mb-8 border-b border-zinc-200 pb-4">
 <UserPlus className="text-[#2563eb]" size={20} />
 <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#142340]">Convocação de Atleta</h2>
 </div>

 {success ? (
 <div className="py-10 text-center animate-in fade-in zoom-in duration-300">
 <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
 <p className="text-[#142340] text-[11px] font-semibold uppercase tracking-widest">Atleta Adicionado ao Elenco!</p>
 </div>
 ) : (
 <form onSubmit={handleAddMembro} className="space-y-6">
 <div className="space-y-2">
 <label className="text-[9px] font-semibold uppercase text-zinc-500 tracking-widest">
 E-mail do Usuário
 </label>
 <input 
 required
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="atleta@exemplo.com"
 className="w-full bg-white border border-zinc-200 p-4 rounded-sm text-xs font-bold text-[#142340] focus:border-[#2563eb] outline-none transition-colors"
 />
 <p className="text-[8px] text-zinc-600 font-bold uppercase mt-2">
 O atleta deve ter uma conta criada no sistema para ser localizado.
 </p>
 </div>

 {error && (
 <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-4 rounded-sm border border-red-500/20">
 <AlertTriangle size={16} />
 <span className="text-[9px] font-semibold uppercase leading-none">{error}</span>
 </div>
 )}

 <button 
 type="submit"
 disabled={loading}
 className="w-full bg-white hover:bg-[#2563eb] disabled:bg-zinc-800 text-[#142340] font-semibold uppercase py-4 rounded-sm transition-all text-[11px] flex items-center justify-center gap-2 tracking-tighter"
 >
 {loading ? (
 <Loader2 className="animate-spin" size={18} />
 ) : (
 <>
 <UserPlus size={18} />
 <span>Confirmar Ingresso</span>
 </>
 )}
 </button>
 </form>
 )}
 </div>
 </div>
 )
}