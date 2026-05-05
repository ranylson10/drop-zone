'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
 Loader2, 
 X, 
 UserPlus, 
 Camera, 
 Crown, 
 Ticket, 
 Search, 
 Check, 
 Shield, 
 Gamepad2,
 Plus // Importação que estava faltando
} from 'lucide-react'

interface FormCriarJogadorProps {
 equipeId?: string; 
 campeonatoId?: string;
 onCancel?: () => void;
 onSuccess: () => void;
}

export default function FormCriarJogador({ equipeId, campeonatoId, onCancel, onSuccess }: FormCriarJogadorProps) {
 const [aba, setAba] = useState<"novo" | "resgatar">("novo")
 const [loading, setLoading] = useState(false)
 const [uploading, setUploading] = useState(false)
 const [previewUrl, setPreviewUrl] = useState<string | null>(null)
 
 // States para Resgate via Token
 const [tokenInput, setTokenInput] = useState("")
 const [perfilEncontrado, setPerfilEncontrado] = useState<any>(null)

 const [formData, setFormData] = useState({
 nick: '',
 id_jogo: '',
 funcao: 'RUSH', 
 is_capitao: false,
 foto_url: '',
 bio: '' 
 })

 const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
 try {
 if (!e.target.files || e.target.files.length === 0) return
 setUploading(true)
 const file = e.target.files[0]
 const fileExt = file.name.split('.').pop()
 const fileName = `${crypto.randomUUID()}.${fileExt}`
 const filePath = `jogadores/${fileName}`
 
 const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
 if (uploadError) throw uploadError
 
 const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
 setFormData(prev => ({ ...prev, foto_url: publicUrl }))
 setPreviewUrl(publicUrl)
 } catch (error: any) {
 alert('Erro no upload: ' + error.message)
 } finally {
 setUploading(false)
 }
 }

 // --- LÓGICA DE CRIAÇÃO DO ZERO ---
 const handleSalvar = async () => {
 if (!formData.nick) return alert("O Nickname é obrigatório!")

 setLoading(true)
 try {
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) throw new Error("Sessão expirada. Faça login novamente.")

 // 1. Criar o Perfil do Jogador na tabela 'perfil_jogo'
 const { data: novoPerfil, error: errorPerfil } = await supabase
 .from('perfil_jogo')
 .insert([{
 perfil_id: user.id, 
 nome: formData.nick.toUpperCase(), 
 game_id: formData.id_jogo,
 funcao: formData.funcao, 
 is_capitao: formData.is_capitao,
 avatar_url: formData.foto_url || "EMPTY", 
 bio: formData.bio
 }])
 .select()
 .single()

 if (errorPerfil) throw errorPerfil

 // 2. Vincular o jogador à equipe na tabela 'membros_equipe'
 if (equipeId) {
 const { error: errorVinculo } = await supabase
 .from('membros_equipe')
 .insert([{
 equipe_id: equipeId,
 usuario_id: novoPerfil.id,
 status: 'ativo'
 }])

 if (errorVinculo) throw errorVinculo
 }

 // 3. Vincular ao Campeonato (se aplicável)
 if (campeonatoId && equipeId) {
 await supabase.from('jogadores_campeonato').insert([{
 campeonato_id: campeonatoId,
 equipe_id: equipeId,
 perfil_id: novoPerfil.id,
 nick_jogo: formData.nick.toUpperCase(),
 foto_url: formData.foto_url,
 funcao: formData.funcao.toLowerCase(),
 is_capitao: formData.is_capitao,
 id_jogo: formData.id_jogo,
 metodo_inscricao: 'manual'
 }])
 }

 alert(`Atleta ${formData.nick} recrutado com sucesso!`)
 onSuccess()
 } catch (error: any) {
 console.error(error)
 alert(`Erro ao processar: ${error.message}`)
 } finally {
 setLoading(false)
 }
 }

 // --- LÓGICA DE RESGATE VIA TOKEN ---
 async function buscarPerfilPorToken() {
 if (!tokenInput) return
 setLoading(true)
 setPerfilEncontrado(null)
 try {
 const { data, error } = await supabase
 .from("perfil_jogo")
 .select("*")
 .eq("link_token", tokenInput.toUpperCase())
 .is("perfil_id", null) 
 .single()

 if (error || !data) {
 alert("Token inválido, expirado ou perfil já resgatado.")
 } else {
 setPerfilEncontrado(data)
 }
 } catch (error) {
 console.error(error)
 } finally {
 setLoading(false)
 }
 }

 async function confirmarResgate() {
 if (!perfilEncontrado) return
 setLoading(true)
 try {
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return

 const { error: errorUpdate } = await supabase
 .from("perfil_jogo")
 .update({ 
 perfil_id: user.id,
 link_token: null 
 })
 .eq("id", perfilEncontrado.id)

 if (errorUpdate) throw errorUpdate

 if (equipeId) {
 await supabase.from('membros_equipe').insert([{
 equipe_id: equipeId,
 usuario_id: perfilEncontrado.id,
 status: 'ativo'
 }])
 }

 alert("Perfil resgatado e vinculado com sucesso!")
 onSuccess()
 } catch (error: any) {
 alert("Erro no resgate: " + error.message)
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="w-full max-w-md mx-auto">
 {/* SELETOR DE ABAS */}
 <div className="flex gap-2 mb-6 border-b border-zinc-200 pb-4">
 <button 
 onClick={() => setAba("novo")}
 className={`flex-1 py-3 text-[10px] font-semibold uppercase tracking-widest transition-all ${aba === "novo" ? "text-[#2563eb] bg-[#2563eb]/5 border-b-2 border-[#2563eb]" : "text-zinc-500 hover:text-zinc-600"}`}
 >
 Alistamento Novo
 </button>
 <button 
 onClick={() => setAba("resgatar")}
 className={`flex-1 py-3 text-[10px] font-semibold uppercase tracking-widest transition-all ${aba === "resgatar" ? "text-[#2563eb] bg-[#2563eb]/5 border-b-2 border-[#2563eb]" : "text-zinc-500 hover:text-zinc-600"}`}
 >
 Resgatar via Token
 </button>
 </div>

 <div className="space-y-6">
 {aba === "novo" ? (
 <>
 <div className="flex flex-col items-center justify-center mb-4">
 <label className="cursor-pointer group relative">
 <div className="w-24 h-24 bg-white border-2 border-dashed border-zinc-200 group-hover:border-[#2563eb]/50 overflow-hidden relative flex items-center justify-center transition-all ">
 {previewUrl ? (
 <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
 ) : (
 <Camera className="text-zinc-700 group-hover:text-[#2563eb] transition-colors" size={32} />
 )}
 {uploading && (
 <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
 <Loader2 className="animate-spin text-[#2563eb]" size={24} />
 </div>
 )}
 </div>
 <input type="file" className="hidden" accept="image/*" onChange={handleUploadFoto} disabled={uploading} />
 <div className="absolute -bottom-2 -right-2 bg-[#2563eb] text-[#142340] p-1.5 ">
 <Plus size={14} strokeWidth={4} />
 </div>
 </label>
 </div>

 <div className="grid grid-cols-1 gap-4">
 <div className="space-y-1">
 <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Nickname</label>
 <div className="relative">
 <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
 <input 
 placeholder="NOME DE GUERRA" 
 value={formData.nick} 
 onChange={e => setFormData({...formData, nick: e.target.value})} 
 className="w-full bg-white border border-zinc-200 p-4 pl-10 text-[#142340] text-xs font-bold uppercase outline-none focus:border-[#2563eb] transition-all" 
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">ID do Jogo</label>
 <div className="relative">
 <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
 <input 
 placeholder="87654321" 
 value={formData.id_jogo} 
 onChange={e => setFormData({...formData, id_jogo: e.target.value})} 
 className="w-full bg-white border border-zinc-200 p-4 pl-10 text-[#142340] text-xs font-bold outline-none focus:border-[#2563eb]" 
 />
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Função</label>
 <select 
 value={formData.funcao} 
 onChange={e => setFormData({...formData, funcao: e.target.value})} 
 className="w-full bg-white border border-zinc-200 p-4 text-[#2563eb] text-xs font-semibold uppercase outline-none focus:border-[#2563eb] appearance-none cursor-pointer"
 >
 <option value="RUSH">RUSH</option>
 <option value="SUPORTE">SUPORTE</option>
 <option value="GRANADEIRO">GRANADEIRO</option>
 <option value="SNIPER">SNIPER</option>
 </select>
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Cargo</label>
 <button 
 type="button" 
 onClick={() => setFormData({...formData, is_capitao: !formData.is_capitao})} 
 className={`w-full p-4 text-[10px] font-semibold uppercase border transition-all flex items-center justify-center gap-3 ${
 formData.is_capitao 
 ? 'bg-[#2563eb] border-[#2563eb] text-[#142340] -[0_0_20px_rgba(124,252,0,0.1)]' 
 : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-200'
 }`}
 >
 {formData.is_capitao ? <><Crown size={16} /> Capitão</> : 'Membro'}
 </button>
 </div>

 <div className="space-y-1">
 <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest ml-1">Biografia</label>
 <textarea 
 placeholder="Experiência em competitivos..." 
 value={formData.bio} 
 onChange={e => setFormData({...formData, bio: e.target.value})} 
 className="w-full bg-white border border-zinc-200 p-4 text-[#142340] text-xs font-medium outline-none focus:border-[#2563eb] h-24 resize-none" 
 />
 </div>
 </div>

 <button 
 onClick={handleSalvar} 
 disabled={loading || uploading} 
 className="w-full bg-[#2563eb] hover:bg-white text-[#142340] font-semibold py-5 uppercase flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
 >
 {loading ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} strokeWidth={3}/> Confirmar</>}
 </button>
 </>
 ) : (
 /* ABA DE RESGATE */
 <div className="space-y-8 py-4">
 <div className="flex flex-col items-center gap-3 text-center">
 <div className="w-16 h-16 bg-[#2563eb]/10 rounded-full flex items-center justify-center border border-[#2563eb]/20">
 <Ticket size={32} className="text-[#2563eb]" />
 </div>
 <p className="text-xs text-zinc-500 uppercase font-bold px-8">
 Insira o token para resgatar sua identidade digital.
 </p>
 </div>

 <div className="relative">
 <input 
 placeholder="LINK-XXXXXX"
 className="w-full bg-white border border-zinc-200 p-5 text-center text-[#2563eb] text-xl font-mono outline-none focus:border-[#2563eb] uppercase tracking-[0.3em]"
 value={tokenInput}
 onChange={(e) => setTokenInput(e.target.value)}
 />
 <button 
 onClick={buscarPerfilPorToken}
 disabled={loading || !tokenInput}
 className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-[#2563eb]"
 >
 {loading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
 </button>
 </div>

 {perfilEncontrado && (
 <div className="border border-[#2563eb]/30 bg-[#2563eb]/5 p-6 animate-in fade-in zoom-in-95">
 <div className="flex items-center gap-4 mb-6">
 <div className="w-14 h-14 bg-zinc-800 overflow-hidden border border-zinc-200">
 <img src={perfilEncontrado.avatar_url !== 'EMPTY' ? perfilEncontrado.avatar_url : '/DropZone-Logo.png'} className="w-full h-full object-cover" alt="" />
 </div>
 <div>
 <h4 className="text-[#142340] font-semibold uppercase text-lg">{perfilEncontrado.nome}</h4>
 <p className="text-[10px] text-[#2563eb] font-bold uppercase">{perfilEncontrado.funcao}</p>
 </div>
 </div>
 
 <button 
 onClick={confirmarResgate}
 disabled={loading}
 className="w-full bg-[#2563eb] text-[#142340] font-semibold uppercase text-xs py-4 flex items-center justify-center gap-2 hover:bg-white transition-all"
 >
 <Check size={18} strokeWidth={3} /> Vincular Identidade
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )
}