"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { optimizeImageToWebp, sanitizeImageName } from "@/lib/imageOptimize";
import {
 Save,
 Loader2,
 Upload,
 Image as ImageIcon,
} from "lucide-react";

export default function FormCriarEquipe({ onSuccess }: any) {
 const [loading, setLoading] = useState(false);

 const [nome, setNome] = useState("");
 const [tag, setTag] = useState("");
 const [descricao, setDescricao] = useState("");

 const [cidade, setCidade] = useState("");
 const [estado, setEstado] = useState("");
 const [pais, setPais] = useState("");

 const [dataFundacao, setDataFundacao] = useState("");

 const [logo, setLogo] = useState<File | null>(null);
 const [capa, setCapa] = useState<File | null>(null);

 async function upload(bucket: string, file: File, userId: string, kind: 'logo' | 'original' = 'original') {
 const finalFile = kind === 'logo' ? await optimizeImageToWebp(file, 'logo') : file;
 const extension = kind === 'logo' ? 'webp' : (finalFile.name.split('.').pop() || 'png');
 const safeName = sanitizeImageName(finalFile.name, kind === 'logo' ? 'logo' : 'imagem');
 const fileName = `${userId}/${Date.now()}-${safeName}.${extension}`;

 const { error } = await supabase.storage
 .from(bucket)
 .upload(fileName, finalFile, { upsert: true, contentType: finalFile.type || undefined });

 if (error) throw error;

 const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
 return data.publicUrl;
 }

 async function handleSubmit(e: any) {
 e.preventDefault();
 setLoading(true);

 try {
 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) throw new Error("Usuário não autenticado");

 let logoUrl = null;
 let coverUrl = null;

 if (logo) {
 logoUrl = await upload("team-logos", logo, user.id, "logo");
 }

 if (capa) {
 coverUrl = await upload("team-covers", capa, user.id);
 }

 const { error } = await supabase.from("equipes").insert([
 {
 nome,
 tag: tag.toUpperCase(),
 descricao,
 logo_url: logoUrl,
 cover_url: coverUrl,
 cidade,
 estado,
 pais,
 data_fundacao: dataFundacao,
 criado_por: user.id,
 },
 ]);

 if (error) throw error;

 onSuccess();
 } catch (err: any) {
 alert(err.message);
 } finally {
 setLoading(false);
 }
 }

 return (
 <form onSubmit={handleSubmit} className="space-y-4">

 {/* LOGO */}
 <div>
 <label className="text-xs">Logo</label>
 <input type="file" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
 </div>

 {/* CAPA */}
 <div>
 <label className="text-xs">Capa</label>
 <input type="file" onChange={(e) => setCapa(e.target.files?.[0] || null)} />
 </div>

 {/* NOME */}
 <input
 required
 value={nome}
 onChange={(e) => setNome(e.target.value)}
 placeholder="Nome da equipe"
 className="input"
 />

 {/* TAG */}
 <input
 required
 value={tag}
 onChange={(e) => setTag(e.target.value)}
 placeholder="TAG"
 className="input uppercase"
 />

 {/* LOCAL */}
 <div className="grid grid-cols-3 gap-2">
 <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" />
 <input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="Estado" />
 <input value={pais} onChange={(e) => setPais(e.target.value)} placeholder="País" />
 </div>

 {/* DATA */}
 <input
 type="date"
 value={dataFundacao}
 onChange={(e) => setDataFundacao(e.target.value)}
 />

 {/* DESCRIÇÃO */}
 <textarea
 value={descricao}
 onChange={(e) => setDescricao(e.target.value)}
 placeholder="Descrição"
 />

 <button disabled={loading} className="btn">
 {loading ? <Loader2 className="animate-spin" /> : <Save />}
 Criar Equipe
 </button>
 </form>
 );
}