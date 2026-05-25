"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getClientCache, setClientCache } from "../../lib/clientCache";
import { optimizeImage } from "../../lib/imageOptimize";
import { usePerfil } from "../contexts/PerfilContext";
import Image from "next/image";
import Link from "next/link";
import MessageShortcut from "../components/chat/MessageShortcut";
import FormCriarEquipe from "../components/FormCriarEquipe";
import RankingTierBadge, { formatScore } from "../components/RankingTierBadge";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Clock3,
  Crown,
  Flame,
  Hash,
  Image as ImageIcon,
  Mail,
  Plus,
  Search,
  Shield,
  Trophy,
  Upload,
  Users,
  Waypoints,
  Link2,
  Unlink,
} from "lucide-react";

type Equipe = {
  id: string;
  nome: string;
  tag?: string | null;
  logo_url: string | null;
  cover_url?: string | null;
  descricao: string | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
  data_fundacao?: string | null;
  criado_por: string;
  created_at?: string | null;
  updated_at?: string | null;
  minha_funcao?: "dono" | "admin" | "membro" | null;
  membros_count?: number;
  eventos_count?: number;
  interacoes_count?: number;
  rank_score?: number;
  rank_posicao?: number;
  score_bruto?: number;
  tier?: string | null;
  score_total?: number | null;
};

type Line = {
  id: string;
  nome: string;
  tipo?: string | null;
  plataforma?: string | null;
  visibilidade?: string | null;
  equipe_id?: string | null;
  created_by?: string | null;
  ativa?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  jogadores_count?: number;
  campeonatos_count?: number;
  equipe?: Equipe | null;
};

type FormEquipe = {
  nome: string;
  descricao: string;
  tag: string;
  cidade: string;
  estado: string;
  pais: string;
  data_fundacao: string;
};

const formInicial: FormEquipe = {
  nome: "",
  descricao: "",
  tag: "",
  cidade: "",
  estado: "",
  pais: "",
  data_fundacao: "",
};

function getCountryFlagEmoji(country?: string | null) {
  if (!country) return "🏳️";

  const normalized = country
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const countryMap: Record<string, string> = {
    brasil: "🇧🇷",
    brazil: "🇧🇷",
    portugal: "🇵🇹",
    angola: "🇦🇴",
    "estados unidos": "🇺🇸",
    "united states": "🇺🇸",
    eua: "🇺🇸",
    argentina: "🇦🇷",
    chile: "🇨🇱",
    paraguai: "🇵🇾",
    paraguay: "🇵🇾",
    uruguai: "🇺🇾",
    uruguay: "🇺🇾",
    bolivia: "🇧🇴",
    colombia: "🇨🇴",
    peru: "🇵🇪",
    mexico: "🇲🇽",
  };

  return countryMap[normalized] || "🏳️";
}

function calcularScoreBruto(equipe: Equipe) {
  const eventos = equipe.eventos_count || 0;
  const membros = equipe.membros_count || 0;
  const interacoes = equipe.interacoes_count || 0;
  return eventos * 2 + membros * 3 + interacoes * 4;
}

function medalha(posicao?: number) {
  if (posicao === 1) return "🥇";
  if (posicao === 2) return "🥈";
  if (posicao === 3) return "🥉";
  return posicao || "-";
}

function dataCurta(data?: string | null) {
  if (!data) return "N/I";
  return new Date(data).toLocaleDateString("pt-BR");
}

function normalizarTipoLine(tipo?: string | null) {
  if (!tipo) return "LINE";
  return tipo.replaceAll("_", " ").toUpperCase();
}

function lineKey(line: Line) {
  return [line.nome, line.tipo, line.plataforma, line.equipe?.nome].filter(Boolean).join(" ").toLowerCase();
}

function BadgeFuncao({ funcao }: { funcao?: Equipe["minha_funcao"] }) {
  if (funcao === "dono") {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
        <Crown size={10} />
        Dono
      </span>
    );
  }

  if (funcao === "admin") {
    return (
      <span className="inline-flex items-center gap-1 bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
        Admin
      </span>
    );
  }

  if (funcao === "membro") {
    return (
      <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
        Membro
      </span>
    );
  }

  return null;
}

function LogoEquipe({ equipe, nome, size = "h-10 w-10" }: { equipe?: Equipe | null; nome: string; size?: string }) {
  return (
    <div className={`relative ${size} shrink-0 overflow-hidden border border-slate-200 bg-white`}>
      {equipe?.logo_url ? (
        <Image src={equipe.logo_url} alt={equipe.nome || nome} fill className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[12px] font-black uppercase text-slate-500">
          {(nome || "L").slice(0, 2)}
        </div>
      )}
    </div>
  );
}

function LineStatus({ line }: { line: Line }) {
  const vinculada = !!line.equipe_id;
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
        vinculada
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-orange-200 bg-orange-50 text-orange-700"
      }`}
    >
      {vinculada ? <Link2 size={11} /> : <Unlink size={11} />}
      {vinculada ? "Com equipe" : "Sem equipe"}
    </span>
  );
}

export default function EquipePage() {
  const { user, recarregarPerfis } = usePerfil();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingLines, setLoadingLines] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<"equipes" | "lines">("equipes");
  const [filtroLine, setFiltroLine] = useState<"todas" | "com_equipe" | "sem_equipe">("todas");
  const [rankingEquipesExpandido, setRankingEquipesExpandido] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [form, setForm] = useState<FormEquipe>(formInicial);

  const [arquivoLogo, setArquivoLogo] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  const [arquivoCapa, setArquivoCapa] = useState<File | null>(null);
  const [previewCapa, setPreviewCapa] = useState<string | null>(null);

  useEffect(() => {
    if (!arquivoLogo) {
      setPreviewLogo(null);
      return;
    }

    const objectUrl = URL.createObjectURL(arquivoLogo);
    setPreviewLogo(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [arquivoLogo]);

  useEffect(() => {
    if (!arquivoCapa) {
      setPreviewCapa(null);
      return;
    }

    const objectUrl = URL.createObjectURL(arquivoCapa);
    setPreviewCapa(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [arquivoCapa]);

  const carregarEquipes = useCallback(async () => {
    try {
      const cacheKey = `page:equipe:equipes:${user?.id || "anon"}:v2`;
      const cached = getClientCache<Equipe[]>(cacheKey, 2 * 60_000);

      if (cached) {
        setEquipes(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }

      const { data: equipesData, error: equipesError } = await supabase
        .from("equipes")
        .select(
          "id, codigo_publico, nome, tag, logo_url, cover_url, descricao, cidade, estado, pais, data_fundacao, criado_por, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (equipesError) throw equipesError;

      const mapa = new Map<string, Equipe>();

      for (const item of equipesData || []) {
        mapa.set(item.id, {
          id: item.id,
          codigo_publico: item.codigo_publico || null,
          nome: item.nome,
          tag: item.tag,
          logo_url: item.logo_url,
          cover_url: item.cover_url,
          descricao: item.descricao,
          cidade: item.cidade,
          estado: item.estado,
          pais: item.pais,
          data_fundacao: item.data_fundacao,
          criado_por: item.criado_por,
          created_at: item.created_at,
          updated_at: item.updated_at,
          minha_funcao: user?.id && item.criado_por === user.id ? "dono" : null,
          membros_count: 0,
          eventos_count: 0,
          interacoes_count: 0,
        });
      }

      const equipeIds = Array.from(mapa.keys());

      if (equipeIds.length > 0) {
        const [membrosRes, eventosRes, interacoesRes] = await Promise.all([
          supabase
            .from("membros_equipe")
            .select("equipe_id, tipo, ativo, perfis_jogo:perfil_jogo_id ( id, user_id )")
            .in("equipe_id", equipeIds)
            .eq("ativo", true),

          supabase.from("campeonato_equipes").select("equipe_id").in("equipe_id", equipeIds),

          supabase.from("interacoes_sociais").select("alvo_id").in("alvo_id", equipeIds),
        ]);

        if (membrosRes.error) throw membrosRes.error;
        if (eventosRes.error) throw eventosRes.error;
        if (interacoesRes.error) throw interacoesRes.error;

        const membrosCountMap = new Map<string, number>();
        const eventosCountMap = new Map<string, number>();
        const interacoesCountMap = new Map<string, number>();
        const minhaFuncaoMap = new Map<string, Equipe["minha_funcao"]>();

        for (const item of membrosRes.data || []) {
          membrosCountMap.set(item.equipe_id, (membrosCountMap.get(item.equipe_id) || 0) + 1);

          const perfilJogo = Array.isArray(item.perfis_jogo) ? item.perfis_jogo[0] : item.perfis_jogo;

          if (user?.id && perfilJogo?.user_id === user.id) {
            minhaFuncaoMap.set(item.equipe_id, item.tipo || "membro");
          }
        }

        for (const item of eventosRes.data || []) {
          eventosCountMap.set(item.equipe_id, (eventosCountMap.get(item.equipe_id) || 0) + 1);
        }

        for (const item of interacoesRes.data || []) {
          interacoesCountMap.set(item.alvo_id, (interacoesCountMap.get(item.alvo_id) || 0) + 1);
        }

        for (const [id, equipe] of mapa.entries()) {
          mapa.set(id, {
            ...equipe,
            membros_count: membrosCountMap.get(id) || 0,
            eventos_count: eventosCountMap.get(id) || 0,
            interacoes_count: interacoesCountMap.get(id) || 0,
            minha_funcao: equipe.minha_funcao || minhaFuncaoMap.get(id) || null,
          });
        }
      }

      const equipesBase = Array.from(mapa.values());

      const { data: rankingData, error: rankingError } = await supabase
        .from("vw_lealt_ranking_equipes")
        .select("equipe_id, posicao, tier, score_total")
        .order("posicao", { ascending: true });

      if (rankingError) {
        console.error("Erro ao carregar ranking oficial de equipes:", rankingError);
      }

      const rankingMap = new Map<string, any>();
      (rankingData || []).forEach((row: any) => {
        if (row?.equipe_id) rankingMap.set(String(row.equipe_id), row);
      });

      const equipesFormatadas = equipesBase
        .map((equipe) => {
          const ranking = rankingMap.get(String(equipe.id));
          const scoreBruto = calcularScoreBruto(equipe);

          return {
            ...equipe,
            score_bruto: scoreBruto,
            rank_score: Number(ranking?.score_total || 0),
            score_total: Number(ranking?.score_total || 0),
            rank_posicao: ranking?.posicao || null,
            tier: ranking?.tier || "E",
          };
        })
        .sort((a, b) => {
          if ((a.rank_posicao || 999999) !== (b.rank_posicao || 999999)) {
            return (a.rank_posicao || 999999) - (b.rank_posicao || 999999);
          }

          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

      setEquipes(equipesFormatadas);
      setClientCache(cacheKey, equipesFormatadas);
    } catch (error: any) {
      console.error("Erro ao carregar equipes:", error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const carregarLines = useCallback(async () => {
    try {
      const cacheKey = "page:equipe:lines:v1";
      const cached = getClientCache<Line[]>(cacheKey, 2 * 60_000);

      if (cached) {
        setLines(cached);
        setLoadingLines(false);
      } else {
        setLoadingLines(true);
      }

      const { data: linesData, error: linesError } = await supabase
        .from("lines")
        .select("id, nome, tipo, visibilidade, plataforma, equipe_id, created_by, ativa, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (linesError) throw linesError;

      const base: Line[] = (linesData || []).map((line: any) => ({
        id: line.id,
        nome: line.nome,
        tipo: line.tipo,
        visibilidade: line.visibilidade,
        plataforma: line.plataforma,
        equipe_id: line.equipe_id,
        created_by: line.created_by,
        ativa: line.ativa,
        created_at: line.created_at,
        updated_at: line.updated_at,
        jogadores_count: 0,
        campeonatos_count: 0,
        equipe: null,
      }));

      const lineIds = base.map((line) => line.id);
      const equipeIds = Array.from(new Set(base.map((line) => line.equipe_id).filter(Boolean))) as string[];

      const [equipesRes, jogadoresRes, campeonatosRes] = await Promise.all([
        equipeIds.length
          ? supabase
              .from("equipes")
              .select("id, nome, tag, logo_url, cover_url, descricao, cidade, estado, pais, data_fundacao, criado_por, created_at, updated_at")
              .in("id", equipeIds)
          : Promise.resolve({ data: [], error: null } as any),
        lineIds.length ? supabase.from("lines_jogadores").select("line_id").in("line_id", lineIds) : Promise.resolve({ data: [], error: null } as any),
        lineIds.length ? supabase.from("campeonato_equipes").select("line_id").in("line_id", lineIds) : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (equipesRes.error) throw equipesRes.error;
      if (jogadoresRes.error) throw jogadoresRes.error;
      if (campeonatosRes.error) throw campeonatosRes.error;

      const equipeMap = new Map<string, Equipe>();
      for (const equipe of equipesRes.data || []) {
        equipeMap.set(equipe.id, {
          id: equipe.id,
          nome: equipe.nome,
          tag: equipe.tag,
          logo_url: equipe.logo_url,
          cover_url: equipe.cover_url,
          descricao: equipe.descricao,
          cidade: equipe.cidade,
          estado: equipe.estado,
          pais: equipe.pais,
          data_fundacao: equipe.data_fundacao,
          criado_por: equipe.criado_por,
          created_at: equipe.created_at,
          updated_at: equipe.updated_at,
        });
      }

      const jogadoresCountMap = new Map<string, number>();
      for (const item of jogadoresRes.data || []) {
        jogadoresCountMap.set(item.line_id, (jogadoresCountMap.get(item.line_id) || 0) + 1);
      }

      const campeonatosCountMap = new Map<string, number>();
      for (const item of campeonatosRes.data || []) {
        if (item.line_id) campeonatosCountMap.set(item.line_id, (campeonatosCountMap.get(item.line_id) || 0) + 1);
      }

      const linesFormatadas = base.map((line) => ({
          ...line,
          equipe: line.equipe_id ? equipeMap.get(line.equipe_id) || null : null,
          jogadores_count: jogadoresCountMap.get(line.id) || 0,
          campeonatos_count: campeonatosCountMap.get(line.id) || 0,
        }));

      setLines(linesFormatadas);
      setClientCache(cacheKey, linesFormatadas);
    } catch (error: any) {
      console.error("Erro ao carregar lines:", error?.message || error);
    } finally {
      setLoadingLines(false);
    }
  }, []);

  useEffect(() => {
    carregarEquipes();
    carregarLines();
  }, [carregarEquipes, carregarLines]);

  function abrirNovaEquipe() {
    if (equipes.filter((equipe) => user?.id && equipe.criado_por === user.id).length >= 2) {
      return;
    }

    setForm(formInicial);
    setArquivoLogo(null);
    setPreviewLogo(null);
    setArquivoCapa(null);
    setPreviewCapa(null);
    setModoEdicao(true);
  }

  function fecharFormulario() {
    setModoEdicao(false);
    setForm(formInicial);
    setArquivoLogo(null);
    setPreviewLogo(null);
    setArquivoCapa(null);
    setPreviewCapa(null);
  }

  async function uploadArquivo(bucket: string, arquivo: File | null) {
    if (!arquivo || !user?.id) return null;

    let arquivoFinal: File = arquivo;
    let extensao = arquivo.name.split(".").pop() || "png";

    if (bucket === "team-logos") {
      const blob = await optimizeImage(arquivo, 500, 500, 0.82);
      arquivoFinal = new File([blob], "logo.webp", { type: "image/webp" });
      extensao = "webp";
    }

    const nomeArquivo = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${extensao}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(nomeArquivo, arquivoFinal, {
      upsert: true,
      contentType: arquivoFinal.type || undefined,
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(nomeArquivo);
    return data.publicUrl;
  }

  async function salvarEquipe() {
    if (!user?.id) return;

    if (equipes.filter((equipe) => equipe.criado_por === user.id).length >= 2) {
      alert("Voce ja atingiu o limite de 2 equipes criadas por usuario.");
      return;
    }

    if (!form.nome.trim()) {
      alert("Informe o nome da equipe.");
      return;
    }

    try {
      setSalvando(true);

      const logoUrl = await uploadArquivo("team-logos", arquivoLogo);
      const coverUrl = await uploadArquivo("team-covers", arquivoCapa);

      const payload = {
        nome: form.nome.trim(),
        tag: form.tag.trim().toUpperCase() || null,
        descricao: form.descricao.trim() || null,
        logo_url: logoUrl,
        cover_url: coverUrl,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        pais: form.pais.trim() || null,
        data_fundacao: form.data_fundacao || null,
        criado_por: user.id,
      };

      const { data: equipeInserida, error } = await supabase.from("equipes").insert([payload]).select("id").single();

      if (error) throw error;

      await carregarEquipes();
      await recarregarPerfis();
      fecharFormulario();

      if (equipeInserida?.id) {
        router.push(`/equipe/${equipeInserida.id}`);
      }
    } catch (error: any) {
      console.error("Erro ao salvar equipe:", error);
      alert(error?.message || "Erro ao salvar equipe.");
    } finally {
      setSalvando(false);
    }
  }

  const equipesFiltradas = equipes.filter((equipe) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;

    return [equipe.nome, equipe.tag, equipe.pais, equipe.estado, equipe.cidade].some((valor) =>
      String(valor || "").toLowerCase().includes(termo)
    );
  });

  const linesFiltradas = lines.filter((line) => {
    const termo = busca.trim().toLowerCase();
    const bateBusca = !termo || lineKey(line).includes(termo);
    const bateFiltro =
      filtroLine === "todas" ||
      (filtroLine === "com_equipe" && !!line.equipe_id) ||
      (filtroLine === "sem_equipe" && !line.equipe_id);
    return bateBusca && bateFiltro;
  });

  const linhasComEquipe = lines.filter((line) => !!line.equipe_id).length;
  const linhasSemEquipe = lines.filter((line) => !line.equipe_id).length;
  const totalJogadoresLines = lines.reduce((total, line) => total + (line.jogadores_count || 0), 0);
  const totalEquipes = equipes.length;
  const totalMembros = equipes.reduce((total, equipe) => total + (equipe.membros_count || 0), 0);
  const totalEventos = equipes.reduce((total, equipe) => total + (equipe.eventos_count || 0), 0);
  const totalInteracoes = equipes.reduce((total, equipe) => total + (equipe.interacoes_count || 0), 0);
  const minhasEquipesCriadas = user?.id ? equipes.filter((equipe) => equipe.criado_por === user.id).length : 0;
  const podeCriarEquipe = Boolean(user?.id && minhasEquipesCriadas < 2);
  const mediaScore = equipes.length
    ? Math.round(equipes.reduce((total, equipe) => total + (equipe.rank_score || 0), 0) / equipes.length)
    : 0;
  const ultimasEquipes = [...equipes]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 6);
  const topEquipes = equipes.slice(0, 6);
  const rankingEquipesVisiveis = rankingEquipesExpandido ? equipes.slice(0, 12) : topEquipes;

  return (
    <main className="min-h-screen bg-[#f5f8fb] text-slate-900">
      <div className="mx-auto max-w-6xl px-2 py-3">
        <section className="mb-4 flex flex-col gap-3 border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">
              <Shield size={15} />
              Equipes e lines
            </div>
            <h1 className="text-[22px] font-semibold uppercase tracking-tight text-slate-950">
              Central competitiva
            </h1>
            <p className="mt-1 text-[13px] text-zinc-500">
              Lista de equipes e lines do app, com vínculo, membros, atividade e acesso ao perfil completo da line.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/equipe/convites"
              className="inline-flex h-10 items-center gap-2 border border-slate-300 bg-white px-4 text-[12px] font-semibold uppercase text-slate-700 hover:border-sky-400 hover:text-sky-700"
            >
              <Mail size={15} />
              Convites
            </Link>

            {podeCriarEquipe ? (
              <button
                onClick={abrirNovaEquipe}
                className="inline-flex h-10 items-center gap-2 bg-sky-500 px-4 text-[12px] font-semibold uppercase text-[#142340] hover:bg-sky-600"
              >
                <Plus size={15} />
                Nova equipe
              </button>
            ) : null}
          </div>
        </section>

        {modoEdicao && podeCriarEquipe ? (
          <FormCriarEquipe
            modal
            onCancel={fecharFormulario}
            onSuccess={async (equipeCriada) => {
              await carregarEquipes();
              await recarregarPerfis();
              fecharFormulario();

              if (equipeCriada?.id) {
                router.push(`/equipe/${equipeCriada.id}`);
              }
            }}
          />
        ) : null}

        <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Equipes", value: totalEquipes, desc: "cadastradas", icon: Shield },
            { label: "Lines", value: lines.length, desc: "no app", icon: Waypoints },
            { label: "Com equipe", value: linhasComEquipe, desc: "vinculadas", icon: Link2 },
            { label: "Sem equipe", value: linhasSemEquipe, desc: "livres", icon: Unlink },
            { label: "Jogadores", value: totalJogadoresLines || totalMembros, desc: "em lines", icon: Users },
            { label: "Score", value: mediaScore, desc: "média equipes", icon: BarChart3 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-zinc-500">
                  <Icon size={14} className="text-sky-500" />
                  {item.label}
                </div>
                <div className="mt-2 text-[24px] font-semibold leading-none text-sky-600">{item.value}</div>
                <div className="mt-1 text-[11px] uppercase text-zinc-500">{item.desc}</div>
              </div>
            );
          })}
        </section>

        <section className="mb-4 border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAba("equipes")}
                className={`h-9 border px-4 text-[12px] font-black uppercase tracking-[0.1em] ${
                  aba === "equipes" ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                Equipes
              </button>
              <button
                onClick={() => setAba("lines")}
                className={`h-9 border px-4 text-[12px] font-black uppercase tracking-[0.1em] ${
                  aba === "lines" ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                Lines
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {aba === "lines" && (
                <div className="flex items-center gap-1">
                  {[
                    ["todas", "Todas"],
                    ["com_equipe", "Com equipe"],
                    ["sem_equipe", "Sem equipe"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setFiltroLine(value as any)}
                      className={`h-9 border px-3 text-[11px] font-black uppercase ${
                        filtroLine === value ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative sm:w-[360px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={aba === "lines" ? "Buscar line, tipo ou equipe..." : "Buscar equipe..."}
                  className="h-9 w-full border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-900 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        </section>

        {aba === "lines" ? (
          <section className="border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold uppercase text-slate-800">
                <Waypoints size={15} className="text-sky-500" />
                Lista de lines
              </div>
              <span className="text-[11px] uppercase text-zinc-500">{linesFiltradas.length} resultado(s)</span>
            </div>

            {loadingLines ? (
              <div className="py-16 text-center text-[13px] text-zinc-500">Carregando lines...</div>
            ) : linesFiltradas.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {linesFiltradas.map((line) => (
                  <button
                    key={line.id}
                    onClick={() => router.push(`/line/${line.id}`)}
                    className="grid w-full grid-cols-1 items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 md:grid-cols-[minmax(280px,1fr)_150px_120px_120px_120px]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <LogoEquipe equipe={line.equipe} nome={line.nome} size="h-12 w-12" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-[15px] font-black uppercase text-slate-950">{line.nome}</h3>
                          <LineStatus line={line} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] uppercase text-zinc-500">
                          <span>{normalizarTipoLine(line.tipo)}</span>
                          <span>•</span>
                          <span>{line.plataforma || "plataforma N/I"}</span>
                          <span>•</span>
                          <span>{line.visibilidade || "visibilidade N/I"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[12px] uppercase text-slate-600">
                      <span className="block text-[10px] font-black tracking-[0.14em] text-zinc-400">Equipe</span>
                      <span className="font-bold text-slate-900">{line.equipe?.nome || "Sem equipe"}</span>
                    </div>

                    <div className="text-[12px] uppercase text-slate-600">
                      <span className="block text-[10px] font-black tracking-[0.14em] text-zinc-400">Jogadores</span>
                      <span className="font-bold text-slate-900">{line.jogadores_count || 0}</span>
                    </div>

                    <div className="text-[12px] uppercase text-slate-600">
                      <span className="block text-[10px] font-black tracking-[0.14em] text-zinc-400">Campeonatos</span>
                      <span className="font-bold text-slate-900">{line.campeonatos_count || 0}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[12px] uppercase text-slate-600 md:justify-end">
                      <span className="text-[11px] text-zinc-500">{dataCurta(line.updated_at || line.created_at)}</span>
                      <ChevronRight size={17} className="text-zinc-300" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-[12px] uppercase tracking-[0.12em] text-zinc-500">
                Nenhuma line encontrada.
              </div>
            )}
          </section>
        ) : loading ? (
          <div className="border border-slate-200 bg-white py-16 text-center text-[13px] text-zinc-500">Carregando equipes...</div>
        ) : (
          <>
            {ultimasEquipes.length > 0 && (
              <section className="mb-4 border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-2 text-[13px] font-semibold uppercase text-slate-800">
                    <Clock3 size={15} className="text-sky-500" />
                    Últimas equipes que entraram
                  </div>
                  <Flame size={15} className="text-orange-500" />
                </div>

                <div className="overflow-x-auto p-3">
                  <div className="flex min-w-max gap-2">
                    {ultimasEquipes.map((equipe) => (
                      <button
                        key={`ultima-${equipe.id}`}
                        onClick={() => router.push(`/equipe/${equipe.id}`)}
                        className="flex w-[210px] shrink-0 items-center gap-2 border border-slate-200 bg-slate-50 p-2 text-left hover:border-sky-300 max-md:w-[70px] max-md:flex-col max-md:border-0 max-md:bg-transparent max-md:p-0"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-slate-200 bg-white max-md:h-12 max-md:w-12">
                          {equipe.logo_url ? (
                            <Image src={equipe.logo_url} alt={equipe.nome} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-500">
                              <Users size={18} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 max-md:w-full max-md:text-center">
                          <div className="truncate text-[13px] font-semibold text-slate-900 max-md:text-[10px]">{equipe.nome}</div>
                          <div className="mt-0.5 text-[11px] text-zinc-500 max-md:hidden">
                            {getCountryFlagEmoji(equipe.pais)} {equipe.tag || "SEM TAG"}
                          </div>
                          <div className="text-[11px] text-zinc-500 max-md:hidden">{dataCurta(equipe.created_at)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section className="mb-4 border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold uppercase text-slate-800">
                  <Trophy size={15} className="text-sky-500" />
                  Ranking oficial das equipes
                </div>
                <Link href="/ranking?tab=equipes" className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-600 hover:underline">ver ranking geral</Link>
              </div>

              <div className="overflow-x-auto p-3">
                <div className="flex min-w-max gap-2">
                {rankingEquipesVisiveis.map((equipe) => (
                  <button
                    key={`rank-${equipe.id}`}
                    onClick={() => router.push(`/equipe/${equipe.id}`)}
                    className="flex w-[245px] shrink-0 items-center gap-2 border border-slate-200 bg-slate-50 p-2 text-left hover:border-sky-300 max-md:w-[78px] max-md:flex-col max-md:border-0 max-md:bg-transparent max-md:p-0"
                  >
                    <span className="grid h-10 w-8 shrink-0 place-items-center text-[16px] font-black max-md:h-5 max-md:w-full">{medalha(equipe.rank_posicao)}</span>
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-slate-200 bg-white max-md:h-12 max-md:w-12">
                      {equipe.logo_url ? (
                        <Image src={equipe.logo_url} alt={equipe.nome} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-500">
                          <Users size={18} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 max-md:w-full max-md:text-center">
                      <div className="flex items-center gap-1 max-md:justify-center">
                        <span className="truncate text-[13px] font-semibold text-slate-900 max-md:text-[10px]">{equipe.nome}</span>
                        <RankingTierBadge tier={equipe.tier} posicao={equipe.rank_posicao} score={equipe.score_total || equipe.rank_score} tipo="equipe" compacto />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500 max-md:hidden">
                        <span className="truncate">{getCountryFlagEmoji(equipe.pais)} {equipe.tag || equipe.pais || "N/I"}</span>
                        <BadgeFuncao funcao={equipe.minha_funcao} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 max-md:hidden">
                        <span className="w-14 text-[12px] font-semibold text-sky-600">{formatScore(equipe.score_total || equipe.rank_score || 0)}</span>
                        <div className="h-1.5 flex-1 bg-slate-200">
                          <div className="h-full bg-sky-500" style={{ width: `${Math.max(0, Math.min(100, Number(equipe.score_total || equipe.rank_score || 0)))}%` }} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                </div>
              </div>

              {equipes.length > topEquipes.length ? (
                <div className="border-t border-slate-100 px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setRankingEquipesExpandido((valor) => !valor)}
                    className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-600 hover:underline"
                  >
                    {rankingEquipesExpandido ? "ver menos" : "ver mais"}
                  </button>
                </div>
              ) : null}

              <div className="hidden">
                <table className="w-full min-w-[860px] border-collapse text-[13px]">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Posição</th>
                      <th className="px-3 py-2 text-left font-medium">Equipe</th>
                      <th className="px-3 py-2 text-left font-medium">País</th>
                      <th className="px-3 py-2 text-center font-medium">Membros</th>
                      <th className="px-3 py-2 text-center font-medium">Eventos</th>
                      <th className="px-3 py-2 text-center font-medium">Fans</th>
                      <th className="px-3 py-2 text-left font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEquipes.map((equipe) => (
                      <tr key={`rank-${equipe.id}`} onClick={() => router.push(`/equipe/${equipe.id}`)} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-3 py-2 whitespace-nowrap text-[16px]">{medalha(equipe.rank_posicao)}</td>
                        <td className="px-3 py-2">
                          <div className="flex min-w-[180px] items-center gap-2">
                            <div className="relative h-8 w-8 shrink-0 overflow-hidden border border-slate-200 bg-white">
                              {equipe.logo_url ? (
                                <Image src={equipe.logo_url} alt={equipe.nome} fill className="object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-zinc-500">
                                  <Users size={17} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2"><span className="truncate text-[13px] font-semibold text-slate-900">{equipe.nome}</span><RankingTierBadge tier={equipe.tier} posicao={equipe.rank_posicao} score={equipe.score_total || equipe.rank_score} tipo="equipe" compacto /></div>
                              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                                <span className="truncate">{equipe.tag || "SEM TAG"}</span>
                                <BadgeFuncao funcao={equipe.minha_funcao} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                          {getCountryFlagEmoji(equipe.pais)} {equipe.pais || "N/I"}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700">{equipe.membros_count || 0}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700">{equipe.eventos_count || 0}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700">{equipe.interacoes_count || 0}</td>
                        <td className="px-3 py-2">
                          <div className="flex min-w-[150px] items-center gap-2">
                            <span className="w-14 text-[13px] font-semibold text-sky-600">{formatScore(equipe.score_total || equipe.rank_score || 0)}</span>
                            <div className="h-1.5 flex-1 bg-slate-200">
                              <div className="h-full bg-sky-500" style={{ width: `${Math.max(0, Math.min(100, Number(equipe.score_total || equipe.rank_score || 0)))}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold uppercase text-slate-800">
                  <Users size={15} className="text-sky-500" />
                  Todas as equipes
                </div>
                <span className="text-[11px] uppercase text-zinc-500">{equipesFiltradas.length} resultado(s)</span>
              </div>

              {equipesFiltradas.length > 0 ? (
                <>
                  <div className="md:hidden">
                    {equipesFiltradas.map((equipe) => (
                      <button key={`equipe-mobile-${equipe.id}`} onClick={() => router.push(`/equipe/${equipe.id}`)} className="flex w-full items-center gap-3 border-t border-zinc-100 px-3 py-2 text-left active:bg-zinc-50">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden bg-zinc-100">
                          {equipe.logo_url ? (
                            <Image src={equipe.logo_url} alt={equipe.nome} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-zinc-500">
                              <Users size={17} />
                            </div>
                          )}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold uppercase text-[#142340]">{equipe.nome || "—"}</span>
                        <span className="shrink-0 text-[16px]">{getCountryFlagEmoji(equipe.pais)}</span>
                        <MessageShortcut referenciaTipo="equipe" referenciaId={equipe.id} titulo={equipe.nome || "Equipe"} avatarUrl={equipe.logo_url} tipo="equipe" />
                        <ChevronRight size={17} className="shrink-0 text-zinc-300" />
                      </button>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[980px] border-collapse text-[13px]">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Pos.</th>
                          <th className="px-3 py-2 text-left font-medium">Equipe</th>
                          <th className="px-3 py-2 text-left font-medium">Tag</th>
                          <th className="px-3 py-2 text-left font-medium">País</th>
                          <th className="px-3 py-2 text-center font-medium">Membros</th>
                          <th className="px-3 py-2 text-center font-medium">Eventos</th>
                          <th className="px-3 py-2 text-center font-medium">Fans</th>
                          <th className="px-3 py-2 text-left font-medium">Score</th>
                          <th className="px-3 py-2 text-right font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipesFiltradas.map((equipe) => (
                          <tr key={equipe.id} onClick={() => router.push(`/equipe/${equipe.id}`)} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50">
                            <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-700">#{equipe.rank_posicao || "-"}</td>
                            <td className="px-3 py-2">
                              <div className="flex min-w-[180px] items-center gap-2">
                                <div className="relative h-8 w-8 shrink-0 overflow-hidden border border-slate-200 bg-white">
                                  {equipe.logo_url ? (
                                    <Image src={equipe.logo_url} alt={equipe.nome} fill className="object-cover" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-zinc-500">
                                      <Users size={17} />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-[13px] font-semibold text-slate-900">{equipe.nome || "—"}</div>
                                  <div className="mt-0.5"><BadgeFuncao funcao={equipe.minha_funcao} /></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap uppercase text-slate-700">{equipe.tag || "—"}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                              {getCountryFlagEmoji(equipe.pais)} {equipe.pais || "N/I"}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700">{equipe.membros_count || 0}</td>
                            <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700">{equipe.eventos_count || 0}</td>
                            <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700">{equipe.interacoes_count || 0}</td>
                            <td className="px-3 py-2">
                              <div className="flex min-w-[150px] items-center gap-2">
                                <span className="w-14 text-[13px] font-semibold text-sky-600">{formatScore(equipe.score_total || equipe.rank_score || 0)}</span>
                                <div className="h-1.5 flex-1 bg-slate-200">
                                  <div className="h-full bg-sky-500" style={{ width: `${Math.max(0, Math.min(100, Number(equipe.score_total || equipe.rank_score || 0)))}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <MessageShortcut referenciaTipo="equipe" referenciaId={equipe.id} titulo={equipe.nome || "Equipe"} avatarUrl={equipe.logo_url} tipo="equipe" />
                                <span className="inline-flex border border-sky-500 px-3 py-1 text-[11px] font-semibold uppercase text-sky-600">
                                  Ver perfil
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="border-t border-slate-200 py-10 text-center text-[12px] uppercase tracking-[0.12em] text-zinc-500">
                  Nenhuma equipe encontrada.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
