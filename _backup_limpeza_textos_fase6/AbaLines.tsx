"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import PlayerCard from "@/app/components/PlayerCard";
import {
  Copy,
  Layers3,
  Link2,
  Loader2,
  Save,
  Shield,
  Trash2,
  UserPlus2,
  Users,
  X,
  Zap,
  Crosshair,
  Pencil,
  Plus,
  ImagePlus,
  Upload,
} from "lucide-react";

type PerfilEquipe = {
  id: string;
  nick: string | null;
  foto_capa: string | null;
  funcao: string | null;
};

type JogadorAvulso = {
  id: string;
  nick: string | null;
  foto_url: string | null;
  funcao: string | null;
};

type LineJogador = {
  id: string;
  line_id?: string | null;
  perfil_jogo_id: string | null;
  jogador_avulso_id: string | null;
  tipo_slot: "titular" | "reserva";
  ordem: number;
  funcao_line: string | null;
  perfis_jogo?: PerfilEquipe | PerfilEquipe[] | null;
  jogadores_avulsos_campeonato?: JogadorAvulso | JogadorAvulso[] | null;
};

type LineRow = {
  id: string;
  nome: string;
  tipo: string | null;
  visibilidade: string | null;
  plataforma: string | null;
  ativa: boolean | null;
  created_by?: string | null;
  equipe_id?: string | null;
  tipo_vinculo?: string | null;
  created_at: string | null;
  updated_at: string | null;
  logo_url?: string | null;
  lines_jogadores?: LineJogador[] | null;
};

type SlotLine = {
  perfil_jogo_id: string | null;
  tipo_slot: "titular" | "reserva";
  ordem: number;
  funcao_line: string | null;
};

function normalizarPerfil(
  perfil: PerfilEquipe | PerfilEquipe[] | null | undefined,
): PerfilEquipe | null {
  if (!perfil) return null;
  return Array.isArray(perfil) ? perfil[0] || null : perfil;
}

function normalizarAvulso(
  jogador: JogadorAvulso | JogadorAvulso[] | null | undefined,
): JogadorAvulso | null {
  if (!jogador) return null;
  return Array.isArray(jogador) ? jogador[0] || null : jogador;
}

function getRoleIcon(role: string | null) {
  switch ((role || "").toLowerCase()) {
    case "sniper":
      return <Crosshair size={14} className="text-red-500" />;
    case "suporte":
      return <Shield size={14} className="text-blue-500" />;
    case "granadeiro":
      return <Zap size={14} className="text-yellow-500" />;
    default:
      return <Users size={14} className="text-zinc-500" />;
  }
}

function buildEmptySlots(tipo: "titular" | "reserva", total: number) {
  return Array.from({ length: total }, (_, index) => ({
    perfil_jogo_id: null,
    tipo_slot: tipo,
    ordem: index,
    funcao_line: null,
  }));
}

function formatarData(data?: string | null) {
  if (!data) return "N/I";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "N/I";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

export default function AbaLines({
  equipeId,
  canManage,
  onAtualizado,
}: {
  equipeId: string;
  canManage: boolean;
  onAtualizado?: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [membros, setMembros] = useState<PerfilEquipe[]>([]);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [lineAtivaId, setLineAtivaId] = useState<string | null>(null);
  const [editorAberto, setEditorAberto] = useState(false);
  const [lineEditandoId, setLineEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("principal");
  const [visibilidade, setVisibilidade] = useState("equipe");
  const [plataforma, setPlataforma] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [titulares, setTitulares] = useState<SlotLine[]>(
    buildEmptySlots("titular", 4),
  );
  const [reservas, setReservas] = useState<SlotLine[]>(
    buildEmptySlots("reserva", 4),
  );
  const [menuJogador, setMenuJogador] = useState<any | null>(null);

  const carregarTudo = useCallback(async () => {
    try {
      setLoading(true);

      const { data: membrosData, error: membrosError } = await supabase
        .from("membros_equipe")
        .select(
          `
          perfil_jogo_id,
          perfis_jogo:perfil_jogo_id (
            id,
            nick,
            foto_capa,
            funcao
          )
        `,
        )
        .eq("equipe_id", equipeId)
        .eq("ativo", true)
        .in("tipo", ["membro", "admin", "dono"]);

      if (membrosError) throw membrosError;

      const membrosNormalizados = ((membrosData || []) as any[])
        .map((item) => normalizarPerfil(item.perfis_jogo))
        .filter((item): item is PerfilEquipe => !!item);

      const { data: vinculosData, error: vinculosError } = await supabase
        .from("equipes_lines_vinculos")
        .select("id,line_id,tipo_vinculo,created_at")
        .eq("equipe_id", equipeId)
        .order("created_at", { ascending: false });

      if (vinculosError) throw vinculosError;

      const { data: linesDaEquipeData, error: linesDaEquipeError } =
        await supabase
          .from("lines")
          .select(
            "id,nome,tipo,visibilidade,plataforma,ativa,created_by,equipe_id,created_at,updated_at,logo_url",
          )
          .eq("equipe_id", equipeId)
          .order("updated_at", { ascending: false });

      if (linesDaEquipeError) throw linesDaEquipeError;

      const lineIds = Array.from(
        new Set([
          ...((linesDaEquipeData || []) as any[]).map((line) => line.id),
          ...((vinculosData || []) as any[]).map((item) => item.line_id),
        ].filter(Boolean)),
      ) as string[];

      if (!lineIds.length) {
        setMembros(membrosNormalizados);
        setLines([]);
        return;
      }

      const { data: linesData, error: linesError } = await supabase
        .from("lines")
        .select(
          "id,nome,tipo,visibilidade,plataforma,ativa,created_by,equipe_id,created_at,updated_at,logo_url",
        )
        .in("id", lineIds);

      if (linesError) throw linesError;

      const { data: jogadoresData, error: jogadoresError } = await supabase
        .from("lines_jogadores")
        .select(
          `
          id,
          line_id,
          perfil_jogo_id,
          jogador_avulso_id,
          tipo_slot,
          ordem,
          funcao_line,
          perfis_jogo:perfil_jogo_id (
            id,
            nick,
            foto_capa,
            funcao
          ),
          jogadores_avulsos_campeonato:jogador_avulso_id (
            id,
            nick,
            foto_url,
            funcao
          )
        `,
        )
        .in("line_id", lineIds);

      if (jogadoresError) throw jogadoresError;

      const vinculosPorLine = new Map<string, string>();
      ((vinculosData || []) as any[]).forEach((item) => {
        if (item.line_id) {
          vinculosPorLine.set(item.line_id, item.tipo_vinculo || "vinculada");
        }
      });

      const jogadoresPorLine = new Map<string, LineJogador[]>();
      ((jogadoresData || []) as any[]).forEach((item) => {
        if (!item.line_id) return;
        if (!jogadoresPorLine.has(item.line_id)) jogadoresPorLine.set(item.line_id, []);
        jogadoresPorLine.get(item.line_id)!.push(item as LineJogador);
      });

      const ordemPorLine = new Map<string, number>();
      ((vinculosData || []) as any[]).forEach((item, index) => {
        if (item.line_id) ordemPorLine.set(item.line_id, index);
      });
      ((linesDaEquipeData || []) as any[]).forEach((line, index) => {
        if (!ordemPorLine.has(line.id)) ordemPorLine.set(line.id, index + 1000);
      });

      const normalizadas = ((linesData || []) as LineRow[])
        .map((line) => ({
          ...line,
          tipo_vinculo: vinculosPorLine.get(line.id) || (line.equipe_id === equipeId ? "propria" : "vinculada"),
          lines_jogadores: jogadoresPorLine.get(line.id) || [],
        }))
        .sort((a, b) => {
          const ordemA = ordemPorLine.get(a.id) ?? 9999;
          const ordemB = ordemPorLine.get(b.id) ?? 9999;
          if (ordemA !== ordemB) return ordemA - ordemB;
          return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
        });

      setMembros(membrosNormalizados);
      setLines(normalizadas);
    } catch (error) {
      console.error("Erro ao carregar lines da equipe:", error);
    } finally {
      setLoading(false);
    }
  }, [equipeId]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  useEffect(() => {
    if (!lines.length) {
      setLineAtivaId(null);
      return;
    }
    if (!lineAtivaId || !lines.some((line) => line.id === lineAtivaId)) {
      setLineAtivaId(lines[0].id);
    }
  }, [lines, lineAtivaId]);

  const lineAtiva = useMemo(() => {
    if (!lines.length) return null;
    return lines.find((line) => line.id === lineAtivaId) || lines[0];
  }, [lines, lineAtivaId]);

  const idsSelecionados = useMemo(() => {
    return new Set(
      [...titulares, ...reservas]
        .map((slot) => slot.perfil_jogo_id)
        .filter((id): id is string => !!id),
    );
  }, [titulares, reservas]);

  function abrirNovaLine() {
    setLineEditandoId(null);
    setNome("");
    setTipo("principal");
    setVisibilidade("equipe");
    setPlataforma("");
    setLogoUrl("");
    setTitulares(buildEmptySlots("titular", 4));
    setReservas(buildEmptySlots("reserva", 4));
    setEditorAberto(true);
  }

  function editarLine(line: LineRow) {
    setLineEditandoId(line.id);
    setNome(line.nome || "");
    setTipo(line.tipo || "principal");
    setVisibilidade(line.visibilidade || "equipe");
    setPlataforma(line.plataforma || "");
    setLogoUrl(line.logo_url || "");

    const titularesBase = buildEmptySlots("titular", 4);
    const reservasBase = buildEmptySlots("reserva", 4);

    (line.lines_jogadores || []).forEach((item) => {
      if (!item.perfil_jogo_id) return;
      const slot: SlotLine = {
        perfil_jogo_id: item.perfil_jogo_id,
        tipo_slot: item.tipo_slot,
        ordem: Number(item.ordem || 0),
        funcao_line: item.funcao_line,
      };
      if (item.tipo_slot === "reserva") {
        if (slot.ordem >= 0 && slot.ordem < reservasBase.length) reservasBase[slot.ordem] = slot;
      } else {
        if (slot.ordem >= 0 && slot.ordem < titularesBase.length) titularesBase[slot.ordem] = slot;
      }
    });

    setTitulares(titularesBase);
    setReservas(reservasBase);
    setEditorAberto(true);
  }

  function atualizarSlot(
    grupo: "titular" | "reserva",
    index: number,
    campo: "perfil_jogo_id" | "funcao_line",
    valor: string,
  ) {
    const setter = grupo === "titular" ? setTitulares : setReservas;
    const atual = grupo === "titular" ? titulares : reservas;
    const copia = [...atual];
    const slot = { ...copia[index] };

    if (campo === "perfil_jogo_id") {
      slot.perfil_jogo_id = valor || null;
      const perfil = membros.find((item) => item.id === valor);
      slot.funcao_line = perfil?.funcao || null;
    } else {
      slot.funcao_line = valor || null;
    }

    copia[index] = slot;
    setter(copia);
  }

  async function uploadLogoLine(file: File) {
    try {
      setUploadingLogo(true);
      const ext = file.name.split(".").pop() || "png";
      const nomeArquivo = `lines/${equipeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(nomeArquivo, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(nomeArquivo);
      setLogoUrl(data.publicUrl);
    } catch (error: any) {
      console.error("Erro ao enviar logo da line:", error);
      alert(error?.message || "Erro ao enviar logo da line.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function salvarLine() {
    const jogadores = [...titulares, ...reservas]
      .filter((slot) => !!slot.perfil_jogo_id)
      .map((slot) => ({
        perfil_jogo_id: slot.perfil_jogo_id,
        jogador_avulso_id: null,
        tipo_slot: slot.tipo_slot,
        ordem: slot.ordem,
        funcao_line: slot.funcao_line,
      }));

    const totalTitulares = titulares.filter((slot) => !!slot.perfil_jogo_id).length;
    if (!nome.trim()) return alert("Informe um nome para a line.");
    if (totalTitulares === 0) return alert("Selecione pelo menos um titular para salvar a line.");

    try {
      setSalvando(true);
      const { data, error } = await supabase.rpc("salvar_line_completa", {
        p_line_id: lineEditandoId,
        p_nome: nome,
        p_tipo: tipo,
        p_visibilidade: visibilidade,
        p_plataforma: plataforma || null,
        p_equipe_id: equipeId,
        p_vincular_equipe: true,
        p_jogadores: jogadores,
      });
      if (error) throw error;

      const lineSalvaId = String(data?.line_id || data?.id || data?.lineId || lineEditandoId || "").trim();
      if (lineSalvaId) {
        const { error: logoError } = await supabase
          .from("lines")
          .update({ logo_url: logoUrl.trim() || null, updated_at: new Date().toISOString() })
          .eq("id", lineSalvaId);
        if (logoError) throw logoError;
      }

      setEditorAberto(false);
      await carregarTudo();
      await onAtualizado?.();
      alert(data?.modo === "atualizada" ? "Line atualizada com sucesso." : "Line criada com sucesso.");
    } catch (error: any) {
      console.error("Erro ao salvar line:", error);
      alert(error?.message || "Erro ao salvar line.");
    } finally {
      setSalvando(false);
    }
  }

  async function duplicarLine(lineId: string) {
    try {
      setProcessandoId(lineId);
      const { error } = await supabase.rpc("duplicar_line", { p_line_id: lineId, p_novo_nome: null });
      if (error) throw error;
      await carregarTudo();
      alert("Line duplicada com sucesso.");
    } catch (error: any) {
      console.error("Erro ao duplicar line:", error);
      alert(error?.message || "Erro ao duplicar line.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function importarLine(lineId: string) {
    try {
      setProcessandoId(lineId);
      const { data, error } = await supabase.rpc("importar_line_para_equipe", { p_line_id: lineId, p_equipe_id: equipeId });
      if (error) throw error;
      await onAtualizado?.();
      await carregarTudo();
      alert(`Importação concluída. ${data?.importados || 0} jogador(es) importado(s).`);
    } catch (error: any) {
      console.error("Erro ao importar line:", error);
      alert(error?.message || "Erro ao importar line para a equipe.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function desvincularLine(lineId: string) {
    try {
      setProcessandoId(lineId);
      const { error } = await supabase.rpc("desvincular_line_equipe", { p_line_id: lineId, p_equipe_id: equipeId });
      if (error) throw error;
      await carregarTudo();
      alert("Line desvinculada da equipe.");
    } catch (error: any) {
      console.error("Erro ao desvincular line:", error);
      alert(error?.message || "Erro ao desvincular line.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function apagarLine(line: LineRow) {
    if (line.equipe_id !== equipeId) {
      await desvincularLine(line.id);
      return;
    }

    const confirmar = window.confirm("Apagar esta line definitivamente? Isso só é permitido para lines criadas pela própria equipe e que não estejam em uso em campeonato.");
    if (!confirmar) return;

    try {
      setProcessandoId(line.id);
      const { count, error: usoError } = await supabase
        .from("campeonato_equipes")
        .select("id", { count: "exact", head: true })
        .eq("line_id", line.id);
      if (usoError) throw usoError;
      if ((count || 0) > 0) return alert("Esta line está vinculada a uma vaga de campeonato. Troque a line da vaga antes de apagar.");

      const { error: jogadoresError } = await supabase.from("lines_jogadores").delete().eq("line_id", line.id);
      if (jogadoresError) throw jogadoresError;
      const { error: vinculosError } = await supabase.from("equipes_lines_vinculos").delete().eq("line_id", line.id);
      if (vinculosError) throw vinculosError;
      const { error: lineError } = await supabase.from("lines").delete().eq("id", line.id);
      if (lineError) throw lineError;

      await carregarTudo();
      await onAtualizado?.();
      alert("Line apagada com sucesso.");
    } catch (error: any) {
      console.error("Erro ao apagar line:", error);
      alert(error?.message || "Erro ao apagar line.");
    } finally {
      setProcessandoId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#2563eb]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-zinc-200 bg-zinc-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
              // LINES DA EQUIPE
            </h2>
            <p className="mt-3 text-[12px] font-semibold text-zinc-600">
              Crie lines prontas para usar em campeonatos, diários, apostados e para importar o elenco inteiro.
            </p>
          </div>
          {canManage ? (
            <button onClick={abrirNovaLine} className="inline-flex h-12 items-center gap-2 border border-[#2563eb] bg-[#2563eb] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:opacity-90">
              <Plus size={14} /> Nova line
            </button>
          ) : null}
        </div>
      </div>

      {editorAberto ? (
        <div className="border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2563eb]">{lineEditandoId ? "Editar line" : "Criar line"}</p>
              <p className="mt-2 text-[12px] font-semibold text-zinc-500">Monte a composição da equipe e deixe pronta para aplicar depois.</p>
            </div>
            <button onClick={() => setEditorAberto(false)} className="inline-flex h-10 items-center gap-2 border border-zinc-200 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 hover:bg-zinc-50">
              <X size={12} /> Fechar
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da line" className="h-12 border border-zinc-200 px-4 text-[12px] font-bold uppercase text-[#142340] outline-none focus:border-[#2563eb]" />
            <div className="flex h-12 items-center gap-2 border border-zinc-200 bg-white px-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden border border-zinc-200 bg-zinc-50 text-[10px] font-semibold text-zinc-500">
                {logoUrl ? <img src={logoUrl} alt="Logo da line" className="h-full w-full object-cover" /> : <ImagePlus size={14} />}
              </div>
              <label className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-2 border border-zinc-200 px-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600 hover:bg-zinc-50">
                <Upload size={12} /> {uploadingLogo ? "Enviando..." : "Logo"}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadLogoLine(file); e.currentTarget.value = ""; }} />
              </label>
            </div>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-12 border border-zinc-200 px-4 text-[12px] font-bold uppercase text-[#142340] outline-none focus:border-[#2563eb]">
              <option value="principal">Principal</option><option value="rush">Rush</option><option value="safe">Safe</option><option value="mobile">Mobile</option><option value="emulador">Emulador</option>
            </select>
            <select value={visibilidade} onChange={(e) => setVisibilidade(e.target.value)} className="h-12 border border-zinc-200 px-4 text-[12px] font-bold uppercase text-[#142340] outline-none focus:border-[#2563eb]">
              <option value="privada">Privada</option><option value="equipe">Equipe</option><option value="publica">Pública</option>
            </select>
            <select value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className="h-12 border border-zinc-200 px-4 text-[12px] font-bold uppercase text-[#142340] outline-none focus:border-[#2563eb]">
              <option value="">Sem plataforma</option><option value="mobile">Mobile</option><option value="emulador">Emulador</option>
            </select>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#142340]">Titulares</p>
              {titulares.map((slot, index) => <SlotEditor key={`titular-${index}`} slot={slot} index={index} membros={membros} idsSelecionados={idsSelecionados} onChange={atualizarSlot} />)}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#142340]">Reservas</p>
              {reservas.map((slot, index) => <SlotEditor key={`reserva-${index}`} slot={slot} index={index} membros={membros} idsSelecionados={idsSelecionados} onChange={atualizarSlot} />)}
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button disabled={salvando || !canManage} onClick={salvarLine} className="inline-flex h-12 items-center gap-2 border border-[#2563eb] bg-[#2563eb] px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:opacity-90 disabled:opacity-50">
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar line
            </button>
          </div>
        </div>
      ) : null}

      {lines.length > 0 ? (
        <div className="border border-zinc-200 bg-white">
          <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-zinc-50 p-2">
            {lines.map((line) => {
              const total = line.lines_jogadores?.length || 0;
              const ativa = lineAtiva?.id === line.id;
              return (
                <button key={line.id} type="button" onClick={() => setLineAtivaId(line.id)} className={`min-w-[120px] border px-3 py-2 text-left transition ${ativa ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-zinc-200 bg-white text-[#142340] hover:border-[#2563eb]/50"}`}>
                  <p className="truncate text-[11px] font-black uppercase tracking-[0.08em]">{line.nome}</p>
                  <p className={`mt-1 text-[8px] font-black uppercase tracking-[0.12em] ${ativa ? "text-white/80" : "text-[#2563eb]"}`}>{total} jogador{total === 1 ? "" : "es"}</p>
                </button>
              );
            })}
          </div>
          {lineAtiva ? <LineDetalheCard line={lineAtiva} equipeId={equipeId} canManage={canManage} processandoId={processandoId} onEditar={editarLine} onDuplicar={duplicarLine} onImportar={importarLine} onApagar={apagarLine} onDesvincular={desvincularLine} /> : null}
        </div>
      ) : (
        <div className="border border-dashed border-zinc-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center border border-zinc-200 bg-zinc-50 text-zinc-500"><Layers3 size={26} /></div>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Nenhuma line vinculada à equipe</p>
          <p className="mt-3 text-[12px] font-semibold text-zinc-500">Crie a primeira line para reaproveitar composições em campeonatos e importar o elenco com 1 clique.</p>
        </div>
      )}

      <div className="border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex flex-wrap gap-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <span className="inline-flex items-center gap-2"><Link2 size={12} /> Vínculo da line com a equipe</span>
          <span className="inline-flex items-center gap-2"><UserPlus2 size={12} /> Importar jogadores da line</span>
          <span className="inline-flex items-center gap-2"><Layers3 size={12} /> Base pronta para campeonatos e apostados</span>
        </div>
      </div>
    </div>
  );
}

function LineDetalheCard({
  line,
  equipeId,
  canManage,
  processandoId,
  onEditar,
  onDuplicar,
  onImportar,
  onApagar,
  onDesvincular,
}: {
  line: LineRow;
  equipeId: string;
  canManage: boolean;
  processandoId: string | null;
  onEditar: (line: LineRow) => void;
  onDuplicar: (lineId: string) => void;
  onImportar: (lineId: string) => void;
  onApagar: (line: LineRow) => void;
  onDesvincular: (lineId: string) => void;
}) {
  const jogadores = (line.lines_jogadores || []).slice().sort((a, b) => {
    if (a.tipo_slot !== b.tipo_slot) return a.tipo_slot === "titular" ? -1 : 1;
    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });
  const titulares = jogadores.filter((item) => item.tipo_slot === "titular");
  const reservas = jogadores.filter((item) => item.tipo_slot === "reserva");
  const criadaPelaEquipe = line.equipe_id === equipeId;

  return (
    <div className="p-3">
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-zinc-200 bg-zinc-50 text-[#2563eb]">
            {line.logo_url ? <img src={line.logo_url} alt={line.nome} className="h-full w-full object-cover" /> : <span className="text-[18px] font-semibold uppercase">{String(line.nome || "L").charAt(0)}</span>}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[18px] font-black uppercase tracking-[-0.04em] text-[#142340]">{line.nome}</p>
              {line.tipo ? <span className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-zinc-500">{line.tipo}</span> : null}
              {line.plataforma ? <span className="border border-sky-200 bg-sky-50 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-sky-700">{line.plataforma}</span> : null}
              <span className={`border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${criadaPelaEquipe ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{criadaPelaEquipe ? "Criada pela equipe" : "Vinculada"}</span>
            </div>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">Atualizada em {formatarData(line.updated_at || line.created_at)} • {jogadores.length} jogador{jogadores.length === 1 ? "" : "es"}</p>
          </div>
        </div>
        {canManage ? (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button onClick={() => onEditar(line)} className="inline-flex h-9 items-center justify-center gap-2 border border-zinc-200 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-[#142340] hover:bg-zinc-50"><Pencil size={12} /> Editar</button>
            <button onClick={() => onDuplicar(line.id)} disabled={processandoId === line.id} className="inline-flex h-9 items-center justify-center gap-2 border border-zinc-200 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-[#142340] hover:bg-zinc-50 disabled:opacity-50">{processandoId === line.id ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />} Duplicar</button>
            <button onClick={() => onImportar(line.id)} disabled={processandoId === line.id} className="inline-flex h-9 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-3 text-[9px] font-black uppercase tracking-[0.14em] text-white hover:opacity-90 disabled:opacity-50">{processandoId === line.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus2 size={12} />} Importar</button>
            {criadaPelaEquipe ? (
              <button onClick={() => onApagar(line)} disabled={processandoId === line.id} className="inline-flex h-9 items-center justify-center gap-2 border border-red-200 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-red-500 hover:bg-red-50 disabled:opacity-50">{processandoId === line.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Apagar</button>
            ) : (
              <button onClick={() => onDesvincular(line.id)} disabled={processandoId === line.id} className="inline-flex h-9 items-center justify-center gap-2 border border-amber-200 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-amber-600 hover:bg-amber-50 disabled:opacity-50">{processandoId === line.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Desvincular</button>
            )}
          </div>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <LineJogadoresCartas titulo="Titulares" jogadores={titulares} offset={1} vazio="Sem titulares" />
        <LineJogadoresCartas titulo="Reservas" jogadores={reservas} offset={titulares.length + 1} vazio="Sem reservas" />
      </div>
    </div>
  );
}

function LineJogadoresCartas({ titulo, jogadores, offset, vazio }: { titulo: string; jogadores: LineJogador[]; offset: number; vazio: string }) {
  return (
    <div className="border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563eb]">{titulo}</p>
        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">{jogadores.length} jogador{jogadores.length === 1 ? "" : "es"}</p>
      </div>
      {jogadores.length ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-4 xl:grid-cols-5">
          {jogadores.map((item, index) => {
            const perfil = normalizarPerfil(item.perfis_jogo);
            const avulso = normalizarAvulso(item.jogadores_avulsos_campeonato);
            const nome = perfil?.nick || avulso?.nick || "Jogador";
            const foto = perfil?.foto_capa || avulso?.foto_url || null;
            return (
              <div key={item.id} className="min-w-0">
                <PlayerCard name={nome} tier="C" number={offset + index} photoUrl={foto} variant={item.jogador_avulso_id ? "avulso" : "oficial"} className="!max-w-none" />
                <p className="mt-1 truncate text-center text-[8px] font-black uppercase text-[#142340]">{item.funcao_line || perfil?.funcao || avulso?.funcao || "Sem função"}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 border border-dashed border-zinc-200 bg-white p-6 text-center text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{vazio}</div>
      )}
    </div>
  );
}

function SlotEditor({
  slot,
  index,
  membros,
  idsSelecionados,
  onChange,
}: {
  slot: SlotLine;
  index: number;
  membros: PerfilEquipe[];
  idsSelecionados: Set<string>;
  onChange: (
    grupo: "titular" | "reserva",
    index: number,
    campo: "perfil_jogo_id" | "funcao_line",
    valor: string,
  ) => void;
}) {
  const grupo = slot.tipo_slot;
  return (
    <div className="grid grid-cols-1 gap-3 border border-zinc-200 bg-zinc-50 p-3 lg:grid-cols-[minmax(0,1fr)_190px]">
      <select value={slot.perfil_jogo_id || ""} onChange={(e) => onChange(grupo, index, "perfil_jogo_id", e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-[11px] font-bold uppercase text-[#142340] outline-none focus:border-[#2563eb]">
        <option value="">Selecionar jogador...</option>
        {membros.map((membro) => {
          const disabled = idsSelecionados.has(membro.id) && membro.id !== slot.perfil_jogo_id;
          return <option key={membro.id} value={membro.id} disabled={disabled}>{(membro.nick || "Sem nick").toUpperCase()}{membro.funcao ? ` - ${membro.funcao}` : ""}</option>;
        })}
      </select>
      <input value={slot.funcao_line || ""} onChange={(e) => onChange(grupo, index, "funcao_line", e.target.value)} placeholder="Função na line" className="h-11 border border-zinc-200 bg-white px-3 text-[11px] font-bold uppercase text-[#142340] outline-none focus:border-[#2563eb]" />
    </div>
  );
}
