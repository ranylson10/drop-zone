"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Loader2, Save, Shield, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { optimizeImageToWebp, sanitizeImageName } from "@/lib/imageOptimize";

type EquipeCriada = {
  id: string;
  nome: string;
  tag?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
};

type FormCriarEquipeProps = {
  onSuccess?: (equipe?: EquipeCriada | null) => void | Promise<void>;
  onCancel?: () => void;
  modal?: boolean;
  titulo?: string;
  descricao?: string;
};

const campoClasse =
  "h-11 w-full border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10";

async function uploadImagem(bucket: string, file: File, userId: string, tipo: "logo" | "capa") {
  const arquivoFinal = tipo === "logo" ? await optimizeImageToWebp(file, "logo") : file;
  const extensao = tipo === "logo" ? "webp" : arquivoFinal.name.split(".").pop() || "png";
  const safeName = sanitizeImageName(arquivoFinal.name, tipo === "logo" ? "logo" : "capa");
  const fileName = `${userId}/${Date.now()}-${safeName}.${extensao}`;

  const { error } = await supabase.storage.from(bucket).upload(fileName, arquivoFinal, {
    upsert: true,
    contentType: arquivoFinal.type || undefined,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

export default function FormCriarEquipe({
  onSuccess,
  onCancel,
  modal = false,
  titulo = "Nova equipe",
  descricao = "Cadastre a equipe uma única vez e reutilize em campeonatos, lines e inscrições.",
}: FormCriarEquipeProps) {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [tag, setTag] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [pais, setPais] = useState("");
  const [descricaoEquipe, setDescricaoEquipe] = useState("");
  const [dataFundacao, setDataFundacao] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [capa, setCapa] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const logoPreview = useMemo(() => (logo ? URL.createObjectURL(logo) : null), [logo]);
  const capaPreview = useMemo(() => (capa ? URL.createObjectURL(capa) : null), [capa]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("Informe o nome da equipe.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Faça login para criar uma equipe.");

      const [logoUrl, coverUrl] = await Promise.all([
        logo ? uploadImagem("team-logos", logo, user.id, "logo") : Promise.resolve(null),
        capa ? uploadImagem("team-covers", capa, user.id, "capa") : Promise.resolve(null),
      ]);

      const { data, error } = await supabase
        .from("equipes")
        .insert({
          nome: nomeLimpo,
          tag: tag.trim().toUpperCase() || null,
          descricao: descricaoEquipe.trim() || null,
          logo_url: logoUrl,
          cover_url: coverUrl,
          cidade: cidade.trim() || null,
          estado: estado.trim() || null,
          pais: pais.trim() || null,
          data_fundacao: dataFundacao || null,
          criado_por: user.id,
        })
        .select("id,nome,tag,logo_url,cover_url")
        .single();

      if (error) throw error;

      await onSuccess?.(data as EquipeCriada);
    } catch (err: any) {
      setErro(err?.message || "Não foi possível criar a equipe.");
    } finally {
      setLoading(false);
    }
  }

  const conteudo = (
    <form onSubmit={handleSubmit} className="relative border border-slate-200 bg-white p-4 text-slate-950 shadow-xl sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
            <Shield size={14} /> Organização
          </div>
          <h2 className="text-xl font-black uppercase tracking-[-0.04em] text-slate-950">{titulo}</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{descricao}</p>
        </div>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="grid h-9 w-9 shrink-0 place-items-center border border-slate-200 bg-white text-slate-500 transition hover:border-red-300 hover:text-red-500"
            aria-label="Fechar"
          >
            <X size={17} />
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block md:col-span-1">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Logo</span>
          <div className="flex items-center gap-3 border border-slate-200 bg-slate-50 p-3">
            <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-white text-blue-600">
              {logoPreview ? <Image src={logoPreview} alt="Prévia da logo" fill className="object-cover" /> : <Upload size={24} />}
            </div>
            <div className="min-w-0 flex-1">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 border border-blue-600 bg-blue-600 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-white hover:bg-blue-500">
                Escolher logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
              </label>
              <p className="mt-2 truncate text-[11px] font-semibold text-slate-500">{logo?.name || "PNG/JPG quadrado recomendado"}</p>
            </div>
          </div>
        </label>

        <label className="block md:col-span-1">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Capa</span>
          <div className="flex items-center gap-3 border border-slate-200 bg-slate-50 p-3">
            <div className="relative grid h-20 w-32 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-white text-blue-600">
              {capaPreview ? <Image src={capaPreview} alt="Prévia da capa" fill className="object-cover" /> : <ImageIcon size={24} />}
            </div>
            <div className="min-w-0 flex-1">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 border border-slate-300 bg-white px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 hover:border-blue-500 hover:text-blue-600">
                Escolher capa
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCapa(e.target.files?.[0] || null)} />
              </label>
              <p className="mt-2 truncate text-[11px] font-semibold text-slate-500">{capa?.name || "Imagem horizontal opcional"}</p>
            </div>
          </div>
        </label>

        <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da equipe" className={campoClasse} />
        <input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 10))} placeholder="TAG" className={`${campoClasse} uppercase`} maxLength={10} />
        <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" className={campoClasse} />
        <input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="Estado" className={campoClasse} />
        <input value={pais} onChange={(e) => setPais(e.target.value)} placeholder="País" className={campoClasse} />
        <input type="date" value={dataFundacao} onChange={(e) => setDataFundacao(e.target.value)} className={campoClasse} />
        <textarea value={descricaoEquipe} onChange={(e) => setDescricaoEquipe(e.target.value)} placeholder="Descrição da equipe" className="min-h-24 w-full resize-none border border-slate-200 bg-white px-3 py-3 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 md:col-span-2" />
      </div>

      {erro ? <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</div> : null}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="h-11 border border-slate-300 bg-white px-5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 hover:border-slate-400">
            Cancelar
          </button>
        ) : null}
        <button disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 border border-blue-600 bg-blue-600 px-5 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)] hover:bg-blue-500 disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar equipe
        </button>
      </div>
    </form>
  );

  if (!modal) return conteudo;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-md">
      <div className="w-full max-w-3xl">{conteudo}</div>
    </div>
  );
}
