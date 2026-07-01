"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { usePerfil } from "../../contexts/PerfilContext";
import Image from "next/image";
import Link from "next/link";
import {
 Mail,
 Check,
 X,
 Loader2,
 ArrowLeft,
 Shield,
 User,
 Smartphone,
 Monitor,
} from "lucide-react";

type Convite = {
 id: string;
 status: "pendente" | "aceito" | "recusado" | "cancelado";
 mensagem: string | null;
 created_at: string;
 equipe: {
 id: string;
 nome: string;
 logo_url: string | null;
 } | null;
 perfil: {
 id: string;
 nick: string;
 foto_capa: string | null;
 uid_jogo: string;
 funcao: string | null;
 plataforma: "mobile" | "emulador";
 equipe_id: string | null;
 } | null;
};

export default function ConvitesEquipePage() {
 const { user } = usePerfil();

 const [loading, setLoading] = useState(true);
 const [processandoId, setProcessandoId] = useState<string | null>(null);
 const [convites, setConvites] = useState<Convite[]>([]);

 const carregarConvites = useCallback(async () => {
 if (!user?.id) {
 setConvites([]);
 setLoading(false);
 return;
 }

 try {
 setLoading(true);

 const { data, error } = await supabase
 .from("convites_equipe")
 .select(`
 id,
 status,
 mensagem,
 created_at,
 equipe:equipe_id (
 id,
 nome,
 logo_url
 ),
 perfil:perfil_jogo_id (
 id,
 nick,
 foto_capa,
 uid_jogo,
 funcao,
 plataforma,
 equipe_id,
 user_id
 )
 `)
 .eq("status", "pendente")
 .order("created_at", { ascending: false });

 if (error) throw error;

 const filtrados: Convite[] = (data || [])
 .map((item: any) => ({
 id: item.id,
 status: item.status,
 mensagem: item.mensagem,
 created_at: item.created_at,
 equipe: Array.isArray(item.equipe) ? item.equipe[0] || null : item.equipe || null,
 perfil: Array.isArray(item.perfil) ? item.perfil[0] || null : item.perfil || null,
 }))
 .filter((item: any) => item?.perfil?.user_id === user.id);

 setConvites(filtrados);
 } catch (error: any) {
 console.error("Erro ao carregar convites:", error.message);
 } finally {
 setLoading(false);
 }
 }, [user?.id]);

 useEffect(() => {
 carregarConvites();
 }, [carregarConvites]);

 async function aceitarConvite(conviteId: string) {
 try {
 setProcessandoId(conviteId);

 const { error } = await supabase.rpc("aceitar_convite_equipe", {
 p_convite_id: conviteId,
 });

 if (error) throw error;

 await carregarConvites();
 alert("Convite aceito com sucesso.");
 } catch (error: any) {
 console.error("Erro ao aceitar convite:", error);
 alert(error?.message || "Erro ao aceitar convite.");
 } finally {
 setProcessandoId(null);
 }
 }

 async function recusarConvite(conviteId: string) {
 try {
 setProcessandoId(conviteId);

 const { error } = await supabase.rpc("recusar_convite_equipe", {
 p_convite_id: conviteId,
 });

 if (error) throw error;

 await carregarConvites();
 alert("Convite recusado.");
 } catch (error: any) {
 console.error("Erro ao recusar convite:", error);
 alert(error?.message || "Erro ao recusar convite.");
 } finally {
 setProcessandoId(null);
 }
 }

 function formatarFuncao(funcao: string | null) {
 const mapa: Record<string, string> = {
 suporte: "Suporte",
 rush: "Rush",
 granadeiro: "Granadeiro",
 sniper: "Sniper",
 };
 return mapa[String(funcao || "").toLowerCase()] || "Sem função";
 }

 const quantidade = useMemo(() => convites.length, [convites.length]);

 return (
 <div className="min-h-screen bg-[#f3f4f6]">
 <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
 <div className="border border-zinc-200 bg-zinc-100 ">
 <div className="p-6 flex items-center justify-between gap-4 flex-wrap">
 <div>
 <h1 className="text-3xl font-semibold uppercase tracking-tight text-zinc-900 flex items-center gap-3">
 <Mail size={28} />
 Convites de equipe
 </h1>
 <p className="text-zinc-500 mt-2">
 Você tem <strong>{quantidade}</strong> convite(s) pendente(s).
 </p>
 </div>

 <Link
 href="/equipe"
 className="px-5 py-3 border border-zinc-200 text-zinc-900 font-semibold uppercase tracking-tight flex items-center gap-2 hover:bg-zinc-200 transition"
 >
 <ArrowLeft size={18} />
 Voltar
 </Link>
 </div>
 </div>

 <div className="border border-zinc-200 bg-zinc-200">
 {loading ? (
 <div className="flex justify-center py-20">
 <Loader2 className="animate-spin text-zinc-500" size={32} />
 </div>
 ) : convites.length === 0 ? (
 <div className="p-10 text-center text-zinc-500 font-semibold uppercase tracking-wide">
 Nenhum convite pendente.
 </div>
 ) : (
 <div className="divide-y divide-zinc-300">
 {convites.map((convite) => (
 <div
 key={convite.id}
 className="p-5 flex items-center justify-between gap-4 flex-wrap"
 >
 <div className="flex items-center gap-4 min-w-0">
 <div className="relative w-20 h-20 border border-zinc-200 bg-white overflow-hidden shrink-0">
 {convite.equipe?.logo_url ? (
 <Image
 src={convite.equipe.logo_url}
 alt={convite.equipe.nome}
 fill
 className="object-cover"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-zinc-500">
 <Shield size={28} />
 </div>
 )}
 </div>

 <div className="min-w-0 space-y-2">
 <div className="flex items-center gap-2 flex-wrap">
 <h3 className="text-xl font-semibold uppercase tracking-tight text-zinc-900">
 {convite.equipe?.nome || "Equipe"}
 </h3>

 <span className="px-2 py-1 text-[10px] bg-yellow-300 text-[#142340] font-semibold uppercase">
 Convite pendente
 </span>
 </div>

 <div className="text-zinc-600 text-sm">
 Perfil convidado:{" "}
 <strong>{convite.perfil?.nick || "Jogador"}</strong>
 </div>

 <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-500">
 <span className="inline-flex items-center gap-1">
 <User size={12} />
 UID: {convite.perfil?.uid_jogo || "---"}
 </span>

 <span>{formatarFuncao(convite.perfil?.funcao || null)}</span>

 <span className="inline-flex items-center gap-1">
 {convite.perfil?.plataforma === "emulador" ? (
 <Monitor size={12} />
 ) : (
 <Smartphone size={12} />
 )}
 {convite.perfil?.plataforma === "emulador"
 ? "Emulador"
 : "Mobile"}
 </span>
 </div>

 {convite.mensagem && (
 <div className="text-sm text-zinc-600 border-l-2 border-zinc-400 pl-3">
 {convite.mensagem}
 </div>
 )}
 </div>
 </div>

 <div className="flex items-center gap-2 flex-wrap">
 <button
 onClick={() => aceitarConvite(convite.id)}
 disabled={processandoId === convite.id}
 className="px-4 py-2 bg-lime-400 text-[#142340] font-semibold uppercase tracking-tight flex items-center gap-2 disabled:opacity-50"
 >
 {processandoId === convite.id ? (
 <Loader2 size={16} className="animate-spin" />
 ) : (
 <Check size={16} />
 )}
 Aceitar
 </button>

 <button
 onClick={() => recusarConvite(convite.id)}
 disabled={processandoId === convite.id}
 className="px-4 py-2 border border-red-900 text-red-500 font-semibold uppercase tracking-tight flex items-center gap-2 hover:bg-red-950/10 disabled:opacity-50"
 >
 {processandoId === convite.id ? (
 <Loader2 size={16} className="animate-spin" />
 ) : (
 <X size={16} />
 )}
 Recusar
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}