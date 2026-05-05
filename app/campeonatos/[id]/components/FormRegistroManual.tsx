'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, Camera, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface FormRegistroManualProps {
 campeonatoId: string
 equipePadraoId?: string
 onSuccess: () => void
}

export default function FormRegistroManual({
 campeonatoId,
 equipePadraoId,
 onSuccess,
}: FormRegistroManualProps) {
 const [loading, setLoading] = useState(false)
 const [uploading, setUploading] = useState(false)
 const [equipes, setEquipes] = useState<any[]>([])

 const [nome, setNome] = useState('')
 const [gameId, setGameId] = useState('')
 const [funcao, setFuncao] = useState('SUPORTE')
 const [equipeSelecionada, setEquipeSelecionada] = useState('')
 const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

 // Carrega as equipes vinculadas ao campeonato
 useEffect(() => {
 async function carregarEquipes() {
 const { data, error } = await supabase
 .from('campeonato_equipes')
 .select(`equipe_id, equipes:equipe_id ( id, nome )`)
 .eq('campeonato_id', campeonatoId)

 if (error) {
 console.error('Erro ao carregar equipes:', error)
 toast.error('Erro ao carregar equipes.')
 return
 }

 if (data) {
 const formatadas = data
 .filter((item: any) => item.equipes !== null)
 .map((item: any) => ({
 id: item.equipes.id,
 nome: item.equipes.nome,
 }))
 setEquipes(formatadas)
 }
 }

 carregarEquipes()
 }, [campeonatoId])

 useEffect(() => {
 if (equipePadraoId) setEquipeSelecionada(equipePadraoId)
 }, [equipePadraoId])

 const handleUploadFoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
 try {
 setUploading(true)
 if (!event.target.files || event.target.files.length === 0) return

 const file = event.target.files[0]
 const fileExt = file.name.split('.').pop()
 const fileName = `jogadores/${Date.now()}.${fileExt}`

 const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
 if (uploadError) throw uploadError

 const {
 data: { publicUrl },
 } = supabase.storage.from('avatars').getPublicUrl(fileName)

 setAvatarUrl(publicUrl)
 toast.success('Foto carregada!')
 } catch (error: any) {
 console.dir(error)
 toast.error('Erro no upload: ' + (error?.message || 'desconhecido'))
 } finally {
 setUploading(false)
 }
 }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()

 if (!equipeSelecionada) return toast.error('Selecione uma equipe.')
 if (!nome.trim()) return toast.error('Informe o nome.')
 if (!gameId.trim()) return toast.error('Informe o ID do jogo.')

 setLoading(true)

 try {
 // ETAPA 0: pegar usuário logado (necessário se sua RLS exigir perfil_id = auth.uid())
 const { data: userRes, error: userErr } = await supabase.auth.getUser()
 if (userErr) throw userErr
 if (!userRes?.user) throw new Error('Você precisa estar logado para registrar um atleta.')

 const userId = userRes.user.id

 // ETAPA 1: Criar o perfil do jogo
 // (Melhor confiar na UNIQUE e tratar erro 23505 do que depender de select com RLS)
 const { data: novoPerfil, error: errPerfil } = await supabase
 .from('perfil_jogo')
 .insert([
 {
 nome: nome.toUpperCase(),
 game_id: String(gameId),
 funcao,
 avatar_url: avatarUrl ?? null,
 is_capitao: false,
 perfil_id: userId, // ✅ ESSENCIAL se a policy exigir
 },
 ])
 .select()
 .single()

 if (errPerfil) {
 // Unique violation (Postgres)
 if (errPerfil.code === '23505') {
 throw new Error(`O Game ID ${gameId} já está registrado em outro perfil.`)
 }

 // RLS / not null / outros
 throw errPerfil
 }

 // ETAPA 2: Vincular à equipe (membros_equipe)
 const { error: errMembro } = await supabase.from('membros_equipe').insert([
 {
 equipe_id: equipeSelecionada,
 perfil_id: novoPerfil.id,
 status: 'ativo',
 },
 ])

 if (errMembro) {
 console.warn('Aviso: Falha ao vincular em membros_equipe:', errMembro)
 // Não dá throw: deixa seguir para registrar no campeonato
 }

 // ETAPA 3: Registrar no campeonato
 const { error: errCamp } = await supabase.from('jogadores_campeonato').insert([
 {
 campeonato_id: campeonatoId,
 equipe_id: equipeSelecionada,
 perfil_id: novoPerfil.id,
 metodo_inscricao: 'manual',
 tipo_inscricao: 'titular',
 },
 ])

 if (errCamp) throw errCamp

 toast.success('Atleta registrado com sucesso!')
 onSuccess()
 } catch (error: any) {
 console.dir(error)
 console.error('Erro Completo:', error)
 console.error('Erro JSON:', JSON.stringify(error, null, 2))

 const msg =
 error?.message ||
 error?.details ||
 error?.hint ||
 error?.error_description ||
 'Erro inesperado ao salvar'

 toast.error(msg, { duration: 5000 })
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="bg-white border border-[#2563eb]/30 p-8 max-w-lg mx-auto ">
 <div className="flex items-center gap-3 mb-8 border-b border-zinc-200 pb-4">
 <UserPlus className="text-[#2563eb]" size={24} />
 <h2 className="text-[#142340] font-semibold uppercase text-xl tracking-tighter">
 Registro de Atleta
 </h2>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 {/* UPLOAD DE FOTO */}
 <div className="flex flex-col items-center justify-center gap-3 py-4 bg-white/30 border border-zinc-200">
 <label className="group relative w-32 h-32 rounded-full border-2 border-dashed border-[#2563eb]/20 flex items-center justify-center cursor-pointer hover:border-[#2563eb] transition-all overflow-hidden bg-white">
 {avatarUrl ? (
 <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
 ) : uploading ? (
 <Loader2 className="animate-spin text-[#2563eb]" />
 ) : (
 <Camera className="text-zinc-600 group-hover:text-[#2563eb]" size={32} />
 )}
 <input
 type="file"
 className="hidden"
 accept="image/*"
 onChange={handleUploadFoto}
 disabled={uploading}
 />
 </label>

 {avatarUrl && (
 <p className="text-[9px] text-[#2563eb] font-bold flex items-center gap-1 uppercase ">
 <CheckCircle2 size={10} /> Imagem Pronta
 </p>
 )}
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] font-semibold text-zinc-500 uppercase ">
 Nickname / Nome
 </label>
 <input
 required
 type="text"
 value={nome}
 onChange={(e) => setNome(e.target.value)}
 placeholder="NOME DO ATLETA"
 className="w-full bg-white border border-zinc-200 p-3 text-[#142340] text-xs uppercase outline-none focus:border-[#2563eb]"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-semibold text-zinc-500 uppercase ">
 ID do Jogo (Unique)
 </label>
 <input
 required
 type="text"
 value={gameId}
 onChange={(e) => setGameId(e.target.value)}
 placeholder="EX: 237676"
 className="w-full bg-white border border-zinc-200 p-3 text-[#142340] text-xs uppercase outline-none focus:border-[#2563eb]"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] font-semibold text-zinc-500 uppercase ">Função</label>
 <select
 value={funcao}
 onChange={(e) => setFuncao(e.target.value)}
 className="w-full bg-white border border-zinc-200 p-3 text-[#142340] text-xs uppercase outline-none focus:border-[#2563eb] cursor-pointer"
 >
 <option value="SUPORTE">SUPORTE</option>
 <option value="RUSH">RUSH</option>
 <option value="SNIPER">SNIPER</option>
 <option value="GRANADEIRO">GRANADEIRO</option>
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-semibold text-[#2563eb] uppercase ">
 Equipe de Destino
 </label>
 <select
 required
 value={equipeSelecionada}
 onChange={(e) => setEquipeSelecionada(e.target.value)}
 className="w-full bg-white border border-[#2563eb]/30 p-3 text-[#2563eb] text-xs font-semibold uppercase outline-none cursor-pointer"
 >
 <option value="">SELECIONE...</option>
 {equipes.map((eq) => (
 <option key={eq.id} value={eq.id}>
 {eq.nome}
 </option>
 ))}
 </select>
 </div>
 </div>

 <button
 type="submit"
 disabled={loading || uploading}
 className="w-full bg-[#2563eb] text-[#142340] font-semibold uppercase py-4 text-sm hover:tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {loading ? (
 <>
 <Loader2 className="animate-spin" size={18} /> SALVANDO NO BANCO...
 </>
 ) : (
 'FINALIZAR REGISTRO'
 )}
 </button>
 </form>
 </div>
 )
}