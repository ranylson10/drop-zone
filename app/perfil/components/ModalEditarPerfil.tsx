"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
 UserSquare2, 
 Gamepad2, 
 Camera, 
 Plus, 
 Check, 
 X,
 Loader2,
 Crown // Ícone de coroa para o Capitão
} from "lucide-react";

interface ModalProps {
 perfil: any;
 onClose: () => void;
 onUpdate: () => void;
}

export default function ModalEditarPerfil({ perfil, onClose, onUpdate }: ModalProps) {
 const [formData, setFormData] = useState({
 nome: perfil.nome || "",
 game_id: perfil.game_id || "",
 funcao: perfil.funcao || "RUSH",
 bio: perfil.bio || "",
 avatar_url: perfil.avatar_url || "",
 is_capitao: perfil.is_capitao || false // Novo campo baseado na sua tabela
 });
 
 const [isSaving, setIsSaving] = useState(false);
 const [isUploading, setIsUploading] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 try {
 if (!e.target.files || e.target.files.length === 0) return;
 
 setIsUploading(true);
 const file = e.target.files[0];
 const fileExt = file.name.split('.').pop();
 const fileName = `${perfil.id}-${Date.now()}.${fileExt}`;

 const { error: uploadError } = await supabase.storage
 .from('avatars')
 .upload(fileName, file, { upsert: true });

 if (uploadError) throw uploadError;

 const { data: { publicUrl } } = supabase.storage
 .from('avatars')
 .getPublicUrl(fileName);

 setFormData({ ...formData, avatar_url: publicUrl });

 } catch (error: any) {
 alert("Erro no upload: " + error.message);
 } finally {
 setIsUploading(false);
 }
 };

 const handleSalvar = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSaving(true);
 
 try {
 const { error } = await supabase
 .from("perfil_jogo")
 .update({
 nome: formData.nome,
 game_id: formData.game_id,
 funcao: formData.funcao,
 bio: formData.bio,
 avatar_url: formData.avatar_url,
 is_capitao: formData.is_capitao // Salvando o status de capitão
 })
 .eq("id", perfil.id);

 if (error) throw error;

 onUpdate();
 onClose();
 } catch (error: any) {
 alert("Erro ao salvar: " + error.message);
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/60 -md p-4 animate-in fade-in duration-300">
 
 <div className="relative w-full max-w-[450px] bg-white/90 p-8 -[0_0_50px_rgba(0,0,0,0.5)] border border-zinc-200 animate-in zoom-in-95 duration-200">
 
 {/* Cabeçalho */}
 <div className="mb-8 flex border-b border-zinc-200 justify-between items-center">
 <div className="border-b-2 border-[#73ff00] px-4 py-3 text-[12px] font-semibold uppercase text-[#73ff00] tracking-widest">
 Editar Perfil de Atleta
 </div>
 <button onClick={onClose} type="button" className="text-[#142340]/20 hover:text-[#142340] transition-colors p-2">
 <X size={20} />
 </button>
 </div>

 {/* Avatar/Foto */}
 <div className="mb-6 flex justify-center">
 <div 
 onClick={() => !isUploading && fileInputRef.current?.click()}
 className="relative group flex h-28 w-28 cursor-pointer items-center justify-center border-2 border-dashed border-zinc-200 bg-zinc-500 transition-all hover:border-[#73ff00]/50 overflow-hidden"
 >
 {formData.avatar_url ? (
 <img src={formData.avatar_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Preview" />
 ) : (
 <Camera className="text-3xl text-[#142340]/10" />
 )}

 {isUploading && (
 <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
 <Loader2 className="animate-spin text-[#73ff00]" size={28} />
 </div>
 )}

 <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb] text-[#142340] ring-4 ring-[#1a1b1f]">
 <Plus size={16} strokeWidth={4} />
 </div>

 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
 </div>
 </div>

 {/* Seletor de Capitão (Switch) */}
 <div className="mb-8 flex items-center justify-between p-4 bg-gradient-to-r from-[#73ff00]/5 to-transparent border border-[#73ff00]/10">
 <div className="flex items-center gap-3">
 <div className={`p-2 ${formData.is_capitao ? 'bg-[#2563eb] text-[#142340]' : 'bg-zinc-50 text-[#142340]/20'}`}>
 <Crown size={18} strokeWidth={formData.is_capitao ? 3 : 2} />
 </div>
 <div>
 <p className="text-xs font-semibold uppercase text-[#142340]/80">Capitão do Time</p>
 <p className="text-[10px] text-[#142340]/40">O capitão tem selo de liderança</p>
 </div>
 </div>
 
 <button 
 type="button"
 onClick={() => setFormData({...formData, is_capitao: !formData.is_capitao})}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.is_capitao ? 'bg-[#2563eb]' : 'bg-zinc-50'}`}
 >
 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_capitao ? 'translate-x-6' : 'translate-x-1'}`} />
 </button>
 </div>

 <form onSubmit={handleSalvar} className="space-y-5">
 {/* Nickname */}
 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#142340]/30 ml-1">Nickname</label>
 <div className="flex items-center bg-white/40 border border-zinc-200 focus-within:border-[#73ff00]/30 transition-all">
 <UserSquare2 className="ml-4 text-[#142340]/20" size={18} />
 <input 
 type="text"
 required
 className="w-full bg-transparent p-4 text-sm text-[#142340] outline-none"
 value={formData.nome}
 onChange={(e) => setFormData({...formData, nome: e.target.value})}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 {/* ID */}
 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#142340]/30 ml-1">ID do Jogo</label>
 <div className="flex items-center bg-white/40 border border-zinc-200 focus-within:border-[#73ff00]/30 transition-all">
 <Gamepad2 className="ml-4 text-[#142340]/20" size={18} />
 <input 
 type="text"
 required
 className="w-full bg-transparent p-4 text-sm text-[#142340] outline-none"
 value={formData.game_id}
 onChange={(e) => setFormData({...formData, game_id: e.target.value})}
 />
 </div>
 </div>
 {/* Função */}
 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#142340]/30 ml-1">Função</label>
 <div className=" bg-white/40 border border-zinc-200">
 <select 
 className="w-full bg-transparent p-4 text-sm text-[#73ff00] font-bold outline-none cursor-pointer appearance-none"
 value={formData.funcao}
 onChange={(e) => setFormData({...formData, funcao: e.target.value})}
 >
 <option value="RUSH" className="bg-white">RUSH</option>
 <option value="SNIPER" className="bg-white">SNIPER</option>
 <option value="SUPORTE" className="bg-white">SUPORTE</option>
 <option value="IGL" className="bg-white">IGL</option>
 <option value="CPT" className="bg-white">CPT (CAPITÃO)</option>
 <option value="GRANADEIRO" className="bg-white">GRANADEIRO</option>
 </select>
 </div>
 </div>
 </div>

 {/* Biografia */}
 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#142340]/30 ml-1">Biografia</label>
 <textarea 
 className="h-24 w-full resize-none bg-white/40 border border-zinc-200 p-4 text-sm text-zinc-600 outline-none focus:border-[#73ff00]/30 transition-all"
 value={formData.bio}
 onChange={(e) => setFormData({...formData, bio: e.target.value})}
 placeholder="Conte um pouco sobre sua trajetória..."
 />
 </div>

 <div className="pt-4 flex flex-col gap-3">
 <button 
 type="submit" 
 disabled={isSaving || isUploading}
 className="group relative flex w-full items-center justify-center gap-3 bg-[#2563eb] py-4 text-[14px] font-semibold uppercase text-[#142340] transition-all hover:brightness-110 active:scale-[0.98] -[0_10px_20px_rgba(115,255,0,0.15)] disabled:opacity-50"
 >
 {isSaving ? (
 <Loader2 size={18} className="animate-spin" />
 ) : (
 <Check size={18} strokeWidth={3} className="group-hover:scale-125 transition-transform" />
 )} 
 Salvar Alterações
 </button>
 <button 
 type="button" 
 onClick={onClose} 
 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#142340]/20 hover:text-zinc-500 transition-colors py-2"
 >
 Descartar Edição
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}