'use client'
import { useState, useEffect, useRef } from 'react'
import { Send, Image as ImageIcon, Smile, MoreVertical, CheckCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ChatGlobal({ usuarioId }: { usuarioId: string }) {
 const [mensagens, setMensagens] = useState<any[]>([])
 const [novoTexto, setNovoTexto] = useState('')
 const scrollRef = useRef<HTMLDivElement>(null)

 // Carrega mensagens e escuta Realtime
 useEffect(() => {
 const carregarMensagens = async () => {
 const { data } = await supabase
 .from('mensagens')
 .select('*')
 .order('created_at', { ascending: true })
 .limit(100);
 
 if (data) setMensagens(data);
 };

 carregarMensagens();

 const canal = supabase
 .channel('chat_global')
 .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, 
 payload => setMensagens(prev => [...prev, payload.new])
 )
 .subscribe();

 return () => { supabase.removeChannel(canal) };
 }, []);

 useEffect(() => {
 scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [mensagens]);

 const enviar = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!novoTexto.trim()) return;

 const { error } = await supabase.from('mensagens').insert({
 perfil_id: usuarioId,
 texto: novoTexto
 });

 if (!error) setNovoTexto('');
 };

 return (
 <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white border border-zinc-200 overflow-hidden mt-10">
 {/* Header Estilo WhatsApp */}
 <div className="bg-white p-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center font-bold text-[#142340] text-xl">G</div>
 <div>
 <h3 className="text-[#142340] text-sm font-bold">Chat Geral</h3>
 <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-widest">Comunidade Ativa</p>
 </div>
 </div>
 <MoreVertical className="text-zinc-500" size={20} />
 </div>

 {/* Área de Mensagens com Papel de Parede Clássico */}
 <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-10">
 {mensagens.map((msg) => {
 const eMinha = msg.perfil_id === usuarioId;
 return (
 <div key={msg.id} className={`flex ${eMinha ? 'justify-end' : 'justify-start'}`}>
 <div className={`max-w-[80%] p-3 relative ${
 eMinha ? 'bg-white text-[#142340] rounded-tr-none' : 'bg-white text-[#142340] rounded-tl-none'
 }`}>
 <p className="text-sm leading-relaxed pr-10">{msg.texto}</p>
 <div className="flex items-center justify-end gap-1 mt-1">
 <span className="text-[9px] text-zinc-500">
 {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 {eMinha && <CheckCheck size={12} className="text-blue-400" />}
 </div>
 </div>
 </div>
 );
 })}
 <div ref={scrollRef} />
 </div>

 {/* Input de Mensagem */}
 <form onSubmit={enviar} className="bg-white p-3 flex items-center gap-3">
 <div className="flex gap-4 text-zinc-500 px-2">
 <Smile className="cursor-pointer hover:text-[#142340] transition-colors" size={24} />
 <ImageIcon className="cursor-pointer hover:text-[#142340] transition-colors" size={24} />
 </div>
 
 <input
 value={novoTexto}
 onChange={(e) => setNovoTexto(e.target.value)}
 placeholder="Digite uma mensagem"
 className="flex-1 bg-white text-[#142340] text-sm px-4 py-3 outline-none placeholder:text-zinc-500"
 />

 <button type="submit" className="bg-emerald-500 p-3 rounded-full text-[#142340] hover:bg-emerald-400 transition-all active:scale-90">
 <Send size={20} fill="currentColor" />
 </button>
 </form>
 </div>
 );
}