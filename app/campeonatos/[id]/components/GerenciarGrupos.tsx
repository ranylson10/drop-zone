"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import SocialActions from "@/app/components/SocialActions";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import MessageShortcut from "@/app/components/chat/MessageShortcut";
import { toast } from "react-hot-toast";

type CampConfig = {
  id: string;
  nome?: string | null;
  logo_url?: string | null;
  tipo_competicao: string | null;
  permitir_troca_grupos: boolean | null;
  permitir_troca_grupos_livre: boolean | null;
  permitir_troca_grupos_generica: boolean | null;
  exigir_aprovacao_organizacao_troca_grupo: boolean | null;
  formato: string | null;
};

const LETRAS_GRUPO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type Fase = {
  id: string;
  campeonato_id: string;
  nome: string;
  slug: string | null;
  ordem: number;
  created_at?: string | null;
  updated_at?: string | null;
};

type Grupo = {
  id: string;
  campeonato_id: string;
  nome: string;
  slug: string | null;
  fase_id: string | null;
  quantidade_equipes: number;
  qtd_quedas?: number | null;
  classificam?: number | null;
  mapas?: string[] | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  data_jogo?: string | null;
  configuracao?: Record<string, any> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EquipeBase = {
  inscricao_id: string;
  equipe_id?: string | null;
  equipe_avulsa_id?: string | null;
  line_id?: string | null;
  line_nome?: string | null;
  line_tipo?: string | null;
  tipo_origem: "oficial" | "avulsa";
  nome: string;
  nome_base: string;
  nome_exibicao: string;
  numero_repeticao: number;
  tag: string | null;
  logo_url: string | null;
  status: string | null;
  grupo_id?: string | null;
  fase_id?: string | null;
};

type SlotGrupo = {
  id: string;
  campeonato_id: string;
  fase_id: string;
  grupo_id: string;
  slot_numero: number;
  campeonato_equipe_id: string | null;
  equipe: EquipeBase | null;
};

type GrupoComSlots = Grupo & {
  slots: SlotGrupo[];
  vagas_preenchidas: number;
  vagas_totais: number;
  percentual_preenchimento: number;
};

type FaseComGrupos = Fase & {
  grupos: GrupoComSlots[];
};

type SolicitacaoTroca = {
  id: string;
  campeonato_id: string;
  fase_id: string | null;
  solicitante_campeonato_equipe_id: string;
  grupo_origem_id: string;
  grupo_desejado_id: string | null;
  aceita_qualquer_grupo: boolean;
  status: string;
  observacao: string | null;
  equipe_alvo_campeonato_equipe_id: string | null;
  quedas_jogadas_solicitante: number;
  quedas_jogadas_destino: number | null;
  tipo_validacao: string | null;
  aprovada_por_organizacao: boolean | null;
  created_at: string;
};

const ROMANOS = [
  "",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
];

function sufixoRomano(numero: number) {
  if (numero <= 1) return "";
  return ROMANOS[numero - 1] || String(numero);
}

function PainelSemPermissaoGrupos() {
  return (
    <div className="border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
        Edição de grupos bloqueada
      </div>
      <p className="mt-2 leading-6">
        Criar fases, criar grupos, mover equipes ou aceitar trocas é permitido
        apenas para o dono do campeonato ou ajudantes autorizados.
      </p>
    </div>
  );
}

function montarNomeComSufixo(nome: string, numero: number) {
  const sufixo = sufixoRomano(numero);
  return sufixo ? `${nome} ${sufixo}` : nome;
}

function extrairLetraGrupo(nome?: string | null) {
  const texto = String(nome || "").trim().toUpperCase();
  return texto.replace(/^GRUPO\s+/, "").slice(0, 2) || "A";
}

function montarNomeGrupo(letra: string) {
  return `GRUPO ${String(letra || "A").trim().toUpperCase()}`;
}

export default function GerenciarGrupos({
  campeonatoId,
  canEdit = false,
}: {
  campeonatoId: string;
  canEdit?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [campConfig, setCampConfig] = useState<CampConfig | null>(null);
  const [fases, setFases] = useState<Fase[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [equipesBase, setEquipesBase] = useState<EquipeBase[]>([]);
  const [slots, setSlots] = useState<SlotGrupo[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoTroca[]>([]);

  const [view, setView] = useState<"estrutura" | "equipes" | "trocas">(
    "estrutura",
  );
  const [fasesAbertas, setFasesAbertas] = useState<string[]>([]);
  const [gruposAbertos, setGruposAbertos] = useState<string[]>([]);
  const [slotsAbertos, setSlotsAbertos] = useState<string[]>([]);

  const [showModalFase, setShowModalFase] = useState(false);
  const [showModalGrupo, setShowModalGrupo] = useState(false);
  const [showModalEquipe, setShowModalEquipe] = useState(false);
  const [showModalTroca, setShowModalTroca] = useState(false);
  const [equipeDetalhe, setEquipeDetalhe] = useState<EquipeBase | null>(null);

  const [nomeFase, setNomeFase] = useState("");
  const [grupoEditando, setGrupoEditando] = useState<GrupoComSlots | null>(
    null,
  );
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [faseSelecionadaParaGrupo, setFaseSelecionadaParaGrupo] = useState("");
  const [quantidadeEquipesGrupo, setQuantidadeEquipesGrupo] = useState("12");
  const [quantidadeQuedasGrupo, setQuantidadeQuedasGrupo] = useState("4");
  const [intervaloGrupo, setIntervaloGrupo] = useState("15");
  const [dataJogoGrupo, setDataJogoGrupo] = useState("");
  const [horaJogoGrupo, setHoraJogoGrupo] = useState("");
  const [classificamGrupo, setClassificamGrupo] = useState("1");
  const [mapasGrupoSelecionados, setMapasGrupoSelecionados] = useState<
    string[]
  >(["Bermuda", "Purgatório", "Alpine", "Kalahari"]);
  const [buscaEquipe, setBuscaEquipe] = useState("");

  const [slotSelecionado, setSlotSelecionado] = useState<SlotGrupo | null>(
    null,
  );

  const [slotTrocaSelecionado, setSlotTrocaSelecionado] =
    useState<SlotGrupo | null>(null);
  const [grupoDesejadoTroca, setGrupoDesejadoTroca] = useState("");
  const [aceitaQualquerGrupo, setAceitaQualquerGrupo] = useState(false);
  const [observacaoTroca, setObservacaoTroca] = useState("");

  const normalizarSlug = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const OPCOES_MAPA = [
    "Bermuda",
    "Purgatório",
    "Alpine",
    "Kalahari",
    "Nexterra",
    "Solara",
  ];

  const ajustarMapasParaQuantidade = (quantidade: number) => {
    setMapasGrupoSelecionados((prev) => {
      const base = prev.length > 0 ? [...prev] : ["Bermuda"];
      while (base.length < quantidade) {
        base.push(OPCOES_MAPA[base.length % OPCOES_MAPA.length]);
      }
      return base.slice(0, quantidade);
    });
  };

  const atualizarMapaGrupo = (index: number, mapa: string) => {
    setMapasGrupoSelecionados((prev) =>
      prev.map((item, idx) => (idx === index ? mapa : item)),
    );
  };

  const toggleFase = (faseId: string) => {
    setFasesAbertas((prev) =>
      prev.includes(faseId)
        ? prev.filter((id) => id !== faseId)
        : [...prev, faseId],
    );
  };

  const toggleGrupo = (grupoId: string) => {
    setGruposAbertos((prev) =>
      prev.includes(grupoId)
        ? prev.filter((id) => id !== grupoId)
        : [...prev, grupoId],
    );
  };

  const toggleSlot = (slotId: string) => {
    setSlotsAbertos((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId],
    );
  };

  const resetModalFase = () => {
    setNomeFase("");
    setShowModalFase(false);
  };

  const resetModalGrupo = () => {
    setGrupoEditando(null);
    setNomeGrupo("");
    setFaseSelecionadaParaGrupo("");
    setQuantidadeEquipesGrupo("12");
    setQuantidadeQuedasGrupo("4");
    setIntervaloGrupo("15");
    setDataJogoGrupo("");
    setHoraJogoGrupo("");
    setClassificamGrupo("1");
    setMapasGrupoSelecionados(["Bermuda", "Purgatório", "Alpine", "Kalahari"]);
    setShowModalGrupo(false);
  };

  const resetModalEquipe = () => {
    setSlotSelecionado(null);
    setBuscaEquipe("");
    setShowModalEquipe(false);
  };

  const resetModalTroca = () => {
    setSlotTrocaSelecionado(null);
    setGrupoDesejadoTroca("");
    setAceitaQualquerGrupo(false);
    setObservacaoTroca("");
    setShowModalTroca(false);
  };

  const carregarDados = useCallback(async (mostrarLoading = true) => {
    if (mostrarLoading) setLoading(true);

    try {
      const [
        { data: campData, error: campError },
        { data: fasesData, error: fasesError },
        { data: gruposData, error: gruposError },
        { data: inscricoesData, error: inscricoesError },
        { data: slotsData, error: slotsError },
        { data: solicitacoesData, error: solicitacoesError },
      ] = await Promise.all([
        supabase
          .from("campeonatos")
          .select(
            "id, nome, logo_url, tipo_competicao, permitir_troca_grupos, permitir_troca_grupos_livre, permitir_troca_grupos_generica, exigir_aprovacao_organizacao_troca_grupo, formato",
          )
          .eq("id", campeonatoId)
          .single(),

        supabase
          .from("campeonato_fases")
          .select(
            "id, campeonato_id, nome, slug, ordem, created_at, updated_at",
          )
          .eq("campeonato_id", campeonatoId)
          .order("ordem", { ascending: true }),

        supabase
          .from("campeonato_grupos")
          .select(
            "id, campeonato_id, nome, slug, fase_id, quantidade_equipes, qtd_quedas, classificam, mapas, horario_inicio, horario_fim, configuracao, created_at, updated_at",
          )
          .eq("campeonato_id", campeonatoId)
          .order("created_at", { ascending: true }),

        supabase
          .from("campeonato_equipes")
          .select(
            `
            id,
            status,
            tipo_origem,
            equipe_id,
            equipe_avulsa_id,
            grupo_id,
            fase_id,
            nome_exibicao,
            numero_vaga,
            line_id,
            tipo_entrada,
            status_pagamento
          `,
          )
          .eq("campeonato_id", campeonatoId)
          .order("created_at", { ascending: true }),

        supabase
          .from("campeonato_grupo_slots")
          .select(
            "id, campeonato_id, fase_id, grupo_id, slot_numero, campeonato_equipe_id",
          )
          .eq("campeonato_id", campeonatoId)
          .order("slot_numero", { ascending: true }),

        supabase
          .from("campeonato_troca_grupos_solicitacoes")
          .select(
            `
            id,
            campeonato_id,
            fase_id,
            solicitante_campeonato_equipe_id,
            grupo_origem_id,
            grupo_desejado_id,
            aceita_qualquer_grupo,
            status,
            observacao,
            equipe_alvo_campeonato_equipe_id,
            quedas_jogadas_solicitante,
            quedas_jogadas_destino,
            tipo_validacao,
            aprovada_por_organizacao,
            created_at
          `,
          )
          .eq("campeonato_id", campeonatoId)
          .in("status", ["aberta", "aceita"])
          .order("created_at", { ascending: false }),
      ]);

      if (campError) throw campError;
      if (fasesError) throw fasesError;
      if (gruposError) throw gruposError;
      if (inscricoesError) throw inscricoesError;
      if (slotsError) throw slotsError;
      if (solicitacoesError) throw solicitacoesError;

      const inscricoes = inscricoesData || [];

      const idsOficiais = inscricoes
        .map((item: any) => item.equipe_id)
        .filter(Boolean);
      const idsAvulsas = inscricoes
        .map((item: any) => item.equipe_avulsa_id)
        .filter(Boolean);
      const idsLines = inscricoes
        .map((item: any) => item.line_id)
        .filter(Boolean);

      const [
        { data: oficiaisData, error: oficiaisError },
        { data: avulsasData, error: avulsasError },
        { data: linesData, error: linesError },
      ] = await Promise.all([
        idsOficiais.length > 0
          ? supabase
              .from("equipes")
              .select("id, nome, tag, logo_url")
              .in("id", idsOficiais)
          : Promise.resolve({ data: [], error: null }),
        idsAvulsas.length > 0
          ? supabase
              .from("equipes_avulsas_campeonato")
              .select("id, nome, tag, logo_url")
              .in("id", idsAvulsas)
          : Promise.resolve({ data: [], error: null }),
        idsLines.length > 0
          ? supabase
              .from("lines")
              .select("id, nome, tipo, simbolo")
              .in("id", idsLines)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (oficiaisError) throw oficiaisError;
      if (avulsasError) throw avulsasError;
      if (linesError) throw linesError;

      const mapaOficiais = new Map(
        ((oficiaisData || []) as any[]).map((item) => [item.id, item]),
      );
      const mapaAvulsas = new Map(
        ((avulsasData || []) as any[]).map((item) => [item.id, item]),
      );
      const mapaLines = new Map(
        ((linesData || []) as any[]).map((item) => [item.id, item]),
      );

      const contagemPorEquipe = new Map<string, number>();

      const equipesFormatadas: EquipeBase[] = inscricoes.map((item: any) => {
        const tipo: "oficial" | "avulsa" =
          item.tipo_origem === "avulsa" ||
          (!item.equipe_id && item.equipe_avulsa_id)
            ? "avulsa"
            : "oficial";

        const oficial = item.equipe_id
          ? mapaOficiais.get(item.equipe_id)
          : null;
        const avulsa = item.equipe_avulsa_id
          ? mapaAvulsas.get(item.equipe_avulsa_id)
          : null;
        const line = item.line_id ? mapaLines.get(item.line_id) : null;
        const nomeBase =
          oficial?.nome ||
          avulsa?.nome ||
          item.nome_exibicao ||
          "Equipe sem nome";
        const chaveDuplicidade = item.equipe_id
          ? `oficial:${item.equipe_id}`
          : item.equipe_avulsa_id
            ? `avulsa:${item.equipe_avulsa_id}`
            : `inscricao:${item.id}`;
        const numeroCalculado =
          (contagemPorEquipe.get(chaveDuplicidade) || 0) + 1;
        contagemPorEquipe.set(chaveDuplicidade, numeroCalculado);
        const numeroRepeticao = Number(
          item.numero_vaga || numeroCalculado || 1,
        );
        const nomeExibicao =
          item.nome_exibicao || montarNomeComSufixo(nomeBase, numeroRepeticao);

        return {
          inscricao_id: item.id,
          equipe_id: item.equipe_id || null,
          equipe_avulsa_id: item.equipe_avulsa_id || null,
          line_id: item.line_id || null,
          line_nome: line?.nome || null,
          line_tipo: line?.tipo || null,
          tipo_origem: tipo,
          nome: nomeExibicao,
          nome_base: nomeBase,
          nome_exibicao: nomeExibicao,
          numero_repeticao: numeroRepeticao,
          tag: oficial?.tag || avulsa?.tag || null,
          logo_url: oficial?.logo_url || avulsa?.logo_url || null,
          status: item.status || null,
          grupo_id: item.grupo_id || null,
          fase_id: item.fase_id || null,
        };
      });

      const mapaEquipesBase = new Map(
        equipesFormatadas.map((item) => [item.inscricao_id, item]),
      );

      const slotsFormatados: SlotGrupo[] = ((slotsData || []) as any[]).map(
        (item) => ({
          id: item.id,
          campeonato_id: item.campeonato_id,
          fase_id: item.fase_id,
          grupo_id: item.grupo_id,
          slot_numero: item.slot_numero,
          campeonato_equipe_id: item.campeonato_equipe_id,
          equipe: item.campeonato_equipe_id
            ? mapaEquipesBase.get(item.campeonato_equipe_id) || null
            : null,
        }),
      );

      setCampConfig((campData || null) as CampConfig | null);
      setFases((fasesData || []) as Fase[]);
      setGrupos((gruposData || []) as Grupo[]);
      setEquipesBase(equipesFormatadas);
      setSlots(slotsFormatados);
      setSolicitacoes((solicitacoesData || []) as SolicitacaoTroca[]);

      if ((fasesData || []).length > 0 && fasesAbertas.length === 0) {
        setFasesAbertas([(fasesData || [])[0].id]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar estrutura de grupos");
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  }, [campeonatoId, fasesAbertas.length]);

  useEffect(() => {
    carregarDados(true);
  }, [carregarDados]);

  const estrutura = useMemo<FaseComGrupos[]>(() => {
    return fases.map((fase) => {
      const gruposDaFase = grupos
        .filter((grupo) => grupo.fase_id === fase.id)
        .map((grupo) => {
          const slotsDoGrupo = slots
            .filter((slot) => slot.grupo_id === grupo.id)
            .sort((a, b) => a.slot_numero - b.slot_numero);

          const vagasPreenchidas = slotsDoGrupo.filter(
            (slot) => !!slot.campeonato_equipe_id,
          ).length;
          const vagasTotais =
            grupo.quantidade_equipes || slotsDoGrupo.length || 0;
          const percentualPreenchimento =
            vagasTotais > 0
              ? Math.round((vagasPreenchidas / vagasTotais) * 100)
              : 0;

          return {
            ...grupo,
            slots: slotsDoGrupo,
            vagas_preenchidas: vagasPreenchidas,
            vagas_totais: vagasTotais,
            percentual_preenchimento: percentualPreenchimento,
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

      return {
        ...fase,
        grupos: gruposDaFase,
      };
    });
  }, [fases, grupos, slots]);

  const mapaEquipes = useMemo(() => {
    return new Map(equipesBase.map((equipe) => [equipe.inscricao_id, equipe]));
  }, [equipesBase]);

  const mapaGrupos = useMemo(() => {
    return new Map(grupos.map((grupo) => [grupo.id, grupo]));
  }, [grupos]);

  const isCopa =
    String(campConfig?.tipo_competicao || "").toLowerCase() === "copa";

  const equipesDisponiveisParaSlot = useMemo(() => {
    if (!slotSelecionado) return [];

    const equipesUsadasNaFase = new Set(
      slots
        .filter(
          (slot) =>
            slot.fase_id === slotSelecionado.fase_id &&
            slot.campeonato_equipe_id &&
            slot.id !== slotSelecionado.id,
        )
        .map((slot) => slot.campeonato_equipe_id as string),
    );

    const termo = buscaEquipe.trim().toLowerCase();

    return equipesBase
      .filter((equipe) => !equipesUsadasNaFase.has(equipe.inscricao_id))
      .filter((equipe) => {
        const nome = String(
          equipe.nome || equipe.nome_exibicao || equipe.nome_base || "",
        );
        const nomeBase = String(
          equipe.nome_base || equipe.nome_exibicao || equipe.nome || "",
        );
        const tag = String(equipe.tag || "");

        if (!termo) return true;
        return (
          nome.toLowerCase().includes(termo) ||
          nomeBase.toLowerCase().includes(termo) ||
          tag.toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => {
        const nomeA = String(
          a.nome_base || a.nome_exibicao || a.nome || "Sem nome",
        );
        const nomeB = String(
          b.nome_base || b.nome_exibicao || b.nome || "Sem nome",
        );
        const porNome = nomeA.localeCompare(nomeB, "pt-BR");
        if (porNome !== 0) return porNome;
        return (
          Number(a.numero_repeticao || 1) - Number(b.numero_repeticao || 1)
        );
      });
  }, [slotSelecionado, slots, equipesBase, buscaEquipe]);

  const atualizarSlotLocal = useCallback((slotId: string, equipe: EquipeBase | null) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              campeonato_equipe_id: equipe?.inscricao_id || null,
              equipe,
            }
          : slot,
      ),
    );
  }, []);

  const atualizarVagaLocal = useCallback(
    (campeonatoEquipeId: string, dados: Partial<Pick<EquipeBase, "grupo_id" | "fase_id">>) => {
      setEquipesBase((prev) =>
        prev.map((equipe) =>
          equipe.inscricao_id === campeonatoEquipeId
            ? { ...equipe, ...dados }
            : equipe,
        ),
      );
    },
    [],
  );

  const gruposDisponiveisTroca = useMemo(() => {
    if (!slotTrocaSelecionado) return [];

    return grupos
      .filter(
        (grupo) =>
          grupo.fase_id === slotTrocaSelecionado.fase_id &&
          grupo.id !== slotTrocaSelecionado.grupo_id,
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [slotTrocaSelecionado, grupos]);

  const proximaLetraGrupo = useCallback((faseId: string) => {
    const usadas = new Set(
      grupos
        .filter((grupo) => grupo.fase_id === faseId)
        .map((grupo) => extrairLetraGrupo(grupo.nome)),
    );
    return LETRAS_GRUPO.find((letra) => !usadas.has(letra)) || LETRAS_GRUPO[0];
  }, [grupos]);

  const solicitacoesRelacionadasAoSlot = useMemo(() => {
    if (!slotTrocaSelecionado?.campeonato_equipe_id) return [];

    return solicitacoes.filter((solicitacao) => {
      if (solicitacao.status !== "aberta") return false;
      if (
        solicitacao.solicitante_campeonato_equipe_id ===
        slotTrocaSelecionado.campeonato_equipe_id
      )
        return true;

      if (solicitacao.fase_id !== slotTrocaSelecionado.fase_id) return false;

      if (solicitacao.grupo_desejado_id) {
        return solicitacao.grupo_desejado_id === slotTrocaSelecionado.grupo_id;
      }

      return solicitacao.aceita_qualquer_grupo === true;
    });
  }, [slotTrocaSelecionado, solicitacoes]);

  const solicitacoesPorGrupo = useMemo(() => {
    const mapa = new Map<string, SolicitacaoTroca[]>();

    for (const solicitacao of solicitacoes) {
      if (solicitacao.status !== "aberta") continue;

      if (solicitacao.grupo_desejado_id) {
        if (!mapa.has(solicitacao.grupo_desejado_id))
          mapa.set(solicitacao.grupo_desejado_id, []);
        mapa.get(solicitacao.grupo_desejado_id)!.push(solicitacao);
      }
    }

    return mapa;
  }, [solicitacoes]);

  const solicitacoesGenericasPorFase = useMemo(() => {
    const mapa = new Map<string, SolicitacaoTroca[]>();

    for (const solicitacao of solicitacoes) {
      if (solicitacao.status !== "aberta") continue;
      if (!solicitacao.aceita_qualquer_grupo) continue;
      if (!solicitacao.fase_id) continue;

      if (!mapa.has(solicitacao.fase_id)) mapa.set(solicitacao.fase_id, []);
      mapa.get(solicitacao.fase_id)!.push(solicitacao);
    }

    return mapa;
  }, [solicitacoes]);

  const handleCriarFase = async () => {
    const nome = nomeFase.trim().toUpperCase();

    if (!nome) {
      toast.error("Informe o nome da fase");
      return;
    }

    const duplicadoNome = fases.some(
      (fase) => fase.nome.trim().toLowerCase() === nome.toLowerCase(),
    );
    if (duplicadoNome) {
      toast.error("Já existe uma fase com esse nome");
      return;
    }

    const proximaOrdem =
      fases.length > 0
        ? Math.max(...fases.map((fase) => Number(fase.ordem || 0))) + 1
        : 1;

    setSalvando(true);

    try {
      const { error } = await supabase.from("campeonato_fases").insert({
        campeonato_id: campeonatoId,
        nome,
        slug: normalizarSlug(nome),
        ordem: proximaOrdem,
      });

      if (error) throw error;

      toast.success("Fase criada com sucesso");
      resetModalFase();
      await carregarDados(false);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao criar fase");
    } finally {
      setSalvando(false);
    }
  };

  const handleCriarGrupo = async () => {
    const letra = extrairLetraGrupo(nomeGrupo);
    const nome = montarNomeGrupo(letra);

    if (!nome) {
      toast.error("Informe o nome do grupo");
      return;
    }

    if (!faseSelecionadaParaGrupo) {
      toast.error("Selecione a fase");
      return;
    }

    const quantidade = Number(quantidadeEquipesGrupo);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      toast.error("Informe uma quantidade válida de equipes");
      return;
    }

    const qtdQuedas = Number(quantidadeQuedasGrupo);
    if (!Number.isFinite(qtdQuedas) || qtdQuedas <= 0) {
      toast.error("Informe uma quantidade válida de partidas");
      return;
    }

    const intervalo = Number(intervaloGrupo);
    if (!Number.isFinite(intervalo) || intervalo < 0) {
      toast.error("Informe um intervalo válido");
      return;
    }

    const mapas = mapasGrupoSelecionados.slice(0, qtdQuedas).filter(Boolean);
    if (mapas.length !== qtdQuedas) {
      toast.error("Selecione o mapa de todas as partidas");
      return;
    }

    const duplicado = grupos.some(
      (grupo) =>
        grupo.fase_id === faseSelecionadaParaGrupo &&
        grupo.nome.trim().toLowerCase() === nome.toLowerCase(),
    );

    if (duplicado) {
      toast.error("Já existe um grupo com esse nome nessa fase");
      return;
    }

    setSalvando(true);

    try {
      const { data: grupoCriado, error } = await supabase
        .from("campeonato_grupos")
        .insert({
          campeonato_id: campeonatoId,
          nome,
          slug: normalizarSlug(nome),
          fase_id: faseSelecionadaParaGrupo,
          quantidade_equipes: quantidade,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!grupoCriado?.id) throw new Error("Não foi possÃ­vel criar o grupo");

      const { error: slotsError } = await supabase.rpc("criar_slots_do_grupo", {
        p_grupo_id: grupoCriado.id,
        p_campeonato_id: campeonatoId,
        p_fase_id: faseSelecionadaParaGrupo,
        p_quantidade: quantidade,
      });

      if (slotsError) throw slotsError;

      if (isCopa) {
        const { error: updateGrupoError } = await supabase
          .from("campeonato_grupos")
          .update({
            classificam: Number(classificamGrupo || 0),
            horario_inicio: horaJogoGrupo || null,
            qtd_quedas: qtdQuedas,
            mapas,
            configuracao: {
              classificam: Number(classificamGrupo || 0),
              hora_jogo: horaJogoGrupo || null,
              data_jogo: dataJogoGrupo || null,
              intervalo_minutos: intervalo,
              quantidade_partidas: qtdQuedas,
              mapas,
            },
          })
          .eq("id", grupoCriado.id);

        if (updateGrupoError) {
          console.error(
            "Aviso ao salvar dados do grupo na copa:",
            updateGrupoError,
          );
        }

        const dataHoraBase =
          dataJogoGrupo && horaJogoGrupo
            ? new Date(`${dataJogoGrupo}T${horaJogoGrupo}`).toISOString()
            : null;

        const { error: jogosError } = await supabase.rpc(
          "fn_criar_jogos_do_grupo",
          {
            p_campeonato_id: campeonatoId,
            p_grupo_id: grupoCriado.id,
            p_qtd_quedas: qtdQuedas,
            p_mapas: mapas,
            p_data_base: dataHoraBase,
            p_intervalo_minutos: intervalo,
          },
        );

        if (jogosError) throw jogosError;
      }

      toast.success("Grupo criado com sucesso");
      setFasesAbertas((prev) =>
        prev.includes(faseSelecionadaParaGrupo)
          ? prev
          : [...prev, faseSelecionadaParaGrupo],
      );
      setGruposAbertos((prev) => [...prev, grupoCriado.id]);
      resetModalGrupo();
      await carregarDados(false);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao criar grupo");
    } finally {
      setSalvando(false);
    }
  };

  const ajustarQuantidadeSlotsGrupo = async (
    grupo: GrupoComSlots,
    quantidade: number,
    faseId: string,
  ) => {
    const slotsAtuais = [...grupo.slots].sort(
      (a, b) => Number(a.slot_numero || 0) - Number(b.slot_numero || 0),
    );
    const totalAtual = slotsAtuais.length;

    if (quantidade === totalAtual) return;

    if (quantidade < totalAtual) {
      const slotsRemover = slotsAtuais.filter(
        (slot) => Number(slot.slot_numero || 0) > quantidade,
      );
      const ocupados = slotsRemover.filter((slot) => slot.campeonato_equipe_id);
      if (ocupados.length > 0) {
        throw new Error(
          "Não dá para reduzir os slots porque existem equipes nas últimas vagas. Remova ou mova essas equipes primeiro.",
        );
      }

      const idsRemover = slotsRemover.map((slot) => slot.id);
      if (idsRemover.length > 0) {
        const { error } = await supabase
          .from("campeonato_grupo_slots")
          .delete()
          .in("id", idsRemover);
        if (error) throw error;
      }
      return;
    }

    const existentes = new Set(slotsAtuais.map((slot) => Number(slot.slot_numero || 0)));
    const novosSlots = [];
    for (let numero = 1; numero <= quantidade; numero += 1) {
      if (!existentes.has(numero)) {
        novosSlots.push({
          campeonato_id: campeonatoId,
          fase_id: faseId,
          grupo_id: grupo.id,
          slot_numero: numero,
        });
      }
    }

    if (novosSlots.length > 0) {
      const { error } = await supabase
        .from("campeonato_grupo_slots")
        .insert(novosSlots);
      if (error) throw error;
    }
  };

  const handleSalvarGrupo = async () => {
    if (!grupoEditando) {
      await handleCriarGrupo();
      return;
    }

    const letra = extrairLetraGrupo(nomeGrupo);
    const nome = montarNomeGrupo(letra);

    if (!nome) {
      toast.error("Informe o nome do grupo");
      return;
    }

    if (!faseSelecionadaParaGrupo) {
      toast.error("Selecione a fase");
      return;
    }

    const quantidade = Number(quantidadeEquipesGrupo);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      toast.error("Informe uma quantidade válida de equipes");
      return;
    }

    const qtdQuedas = Number(quantidadeQuedasGrupo);
    if (!Number.isFinite(qtdQuedas) || qtdQuedas <= 0) {
      toast.error("Informe uma quantidade válida de partidas");
      return;
    }

    const intervalo = Number(intervaloGrupo);
    if (!Number.isFinite(intervalo) || intervalo < 0) {
      toast.error("Informe um intervalo válido");
      return;
    }

    const mapas = mapasGrupoSelecionados.slice(0, qtdQuedas).filter(Boolean);
    if (mapas.length !== qtdQuedas) {
      toast.error("Selecione o mapa de todas as partidas");
      return;
    }

    const duplicado = grupos.some(
      (grupo) =>
        grupo.id !== grupoEditando.id &&
        grupo.fase_id === faseSelecionadaParaGrupo &&
        grupo.nome.trim().toLowerCase() === nome.toLowerCase(),
    );

    if (duplicado) {
      toast.error("Já existe um grupo com esse nome nessa fase");
      return;
    }

    setSalvando(true);

    try {
      await ajustarQuantidadeSlotsGrupo(
        grupoEditando,
        quantidade,
        faseSelecionadaParaGrupo,
      );

      const configuracaoAtual = (grupoEditando.configuracao || {}) as Record<
        string,
        any
      >;
      const configuracao = {
        ...configuracaoAtual,
        classificam: Number(classificamGrupo || 0),
        hora_jogo: horaJogoGrupo || null,
        data_jogo: dataJogoGrupo || null,
        intervalo_minutos: intervalo,
        quantidade_partidas: qtdQuedas,
        qtd_quedas: qtdQuedas,
        mapas,
      };

      const { error } = await supabase
        .from("campeonato_grupos")
        .update({
          nome,
          slug: normalizarSlug(nome),
          quantidade_equipes: quantidade,
          classificam: Number(classificamGrupo || 0),
          horario_inicio: horaJogoGrupo || null,
          qtd_quedas: qtdQuedas,
          mapas,
          configuracao,
        })
        .eq("id", grupoEditando.id);

      if (error) throw error;

      toast.success("Grupo atualizado com sucesso");
      setGruposAbertos((prev) =>
        prev.includes(grupoEditando.id) ? prev : [...prev, grupoEditando.id],
      );
      resetModalGrupo();
      await carregarDados(false);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao atualizar grupo");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirFase = async (fase: FaseComGrupos) => {
    const temGrupos = fase.grupos.length > 0;
    if (temGrupos) {
      toast.error("Remova os grupos da fase antes de excluir");
      return;
    }

    const confirmar = confirm(`Deseja excluir a fase ${fase.nome}?`);
    if (!confirmar) return;

    setSalvando(true);

    try {
      const { error } = await supabase
        .from("campeonato_fases")
        .delete()
        .eq("id", fase.id);
      if (error) throw error;

      toast.success("Fase removida com sucesso");
      await carregarDados(false);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao remover fase");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirGrupo = async (grupo: GrupoComSlots) => {
    const temEquipe = grupo.slots.some((slot) => slot.campeonato_equipe_id);
    if (temEquipe) {
      toast.error("Remova as equipes dos slots antes de excluir o grupo");
      return;
    }

    const confirmar = confirm(`Deseja excluir o grupo ${grupo.nome}?`);
    if (!confirmar) return;

    setSalvando(true);

    try {
      const { error: deleteSlotsError } = await supabase
        .from("campeonato_grupo_slots")
        .delete()
        .eq("grupo_id", grupo.id);

      if (deleteSlotsError) throw deleteSlotsError;

      const { error: deleteGrupoError } = await supabase
        .from("campeonato_grupos")
        .delete()
        .eq("id", grupo.id);

      if (deleteGrupoError) throw deleteGrupoError;

      toast.success("Grupo removido com sucesso");
      await carregarDados(false);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao remover grupo");
    } finally {
      setSalvando(false);
    }
  };

  const abrirCriarGrupoNaFase = (faseId: string) => {
    setGrupoEditando(null);
    setFaseSelecionadaParaGrupo(faseId);
    setNomeGrupo(proximaLetraGrupo(faseId));
    setQuantidadeEquipesGrupo("12");
    setQuantidadeQuedasGrupo("4");
    setIntervaloGrupo("15");
    setDataJogoGrupo("");
    setHoraJogoGrupo("");
    setClassificamGrupo("1");
    setMapasGrupoSelecionados(["Bermuda", "Purgatório", "Alpine", "Kalahari"]);
    setShowModalGrupo(true);
  };

  const abrirEditarGrupo = (grupo: GrupoComSlots) => {
    const cfg = (grupo.configuracao || {}) as Record<string, any>;
    const mapas = Array.isArray(grupo.mapas)
      ? grupo.mapas
      : Array.isArray(cfg.mapas)
        ? cfg.mapas
        : ["Bermuda", "Purgatório", "Alpine", "Kalahari"];
    const qtdQuedas = Number(
      grupo.qtd_quedas || cfg.qtd_quedas || cfg.quantidade_partidas || mapas.length || 4,
    );

    setGrupoEditando(grupo);
    setFaseSelecionadaParaGrupo(grupo.fase_id || "");
    setNomeGrupo(extrairLetraGrupo(grupo.nome));
    setQuantidadeEquipesGrupo(String(grupo.quantidade_equipes || grupo.vagas_totais || grupo.slots.length || 12));
    setQuantidadeQuedasGrupo(String(qtdQuedas || 4));
    setIntervaloGrupo(String(cfg.intervalo_minutos ?? 15));
    setDataJogoGrupo(String(cfg.data_jogo || ""));
    setHoraJogoGrupo(String(grupo.horario_inicio || cfg.horario_inicio || cfg.hora_jogo || ""));
    setClassificamGrupo(String(grupo.classificam || cfg.classificam || 0));
    setMapasGrupoSelecionados(mapas.slice(0, qtdQuedas || mapas.length || 4));
    setShowModalGrupo(true);
  };

  const abrirSelecaoEquipe = (slot: SlotGrupo) => {
    setSlotSelecionado(slot);
    setBuscaEquipe("");
    setShowModalEquipe(true);
  };

  const abrirModalTroca = (slot: SlotGrupo) => {
    if (!slot.campeonato_equipe_id || !slot.equipe) {
      toast.error("Selecione uma equipe ocupando o slot para solicitar troca");
      return;
    }

    if (!campConfig?.permitir_troca_grupos) {
      toast.error("Troca de grupos não está habilitada neste campeonato");
      return;
    }

    setSlotTrocaSelecionado(slot);
    setGrupoDesejadoTroca("");
    setAceitaQualquerGrupo(false);
    setObservacaoTroca("");
    setShowModalTroca(true);
  };

  const handleAdicionarEquipeNoSlot = async (campeonatoEquipeId: string) => {
    if (!slotSelecionado) return;

    const vagaSelecionada = equipesBase.find(
      (equipe) => equipe.inscricao_id === campeonatoEquipeId,
    );
    const nomeVaga =
      vagaSelecionada?.nome_exibicao || vagaSelecionada?.nome || "Equipe";

    setSalvando(true);

    try {
      // REGRA CERTA: a trava é por campeonato_equipes.id (inscricao_id), não por equipe_id.
      // ALOE, ALOE II e ALOE III são vagas diferentes e podem entrar na mesma fase.
      const vagaJaUsadaNaFase = slots.find(
        (slot) =>
          slot.fase_id === slotSelecionado.fase_id &&
          slot.id !== slotSelecionado.id &&
          slot.campeonato_equipe_id === campeonatoEquipeId,
      );

      if (vagaJaUsadaNaFase) {
        throw new Error(
          "Esta vaga especÃ­fica já está em outro slot desta fase.",
        );
      }

      if (slotSelecionado.campeonato_equipe_id) {
        throw new Error("Este slot já possui equipe.");
      }

      // Atualização direta por campeonato_equipes.id.
      // No modo line, o line_id fica em campeonato_equipes.line_id.
      // O slot guarda a vaga/inscrição; a line é resolvida por esse vÃ­nculo.
      const { error: slotError } = await supabase
        .from("campeonato_grupo_slots")
        .update({ campeonato_equipe_id: campeonatoEquipeId })
        .eq("id", slotSelecionado.id)
        .is("campeonato_equipe_id", null);

      if (slotError) {
        console.error(
          "Erro ao atualizar campeonato_grupo_slots:",
          JSON.stringify(slotError, null, 2),
        );
        throw slotError;
      }

      const { error: equipeError } = await supabase
        .from("campeonato_equipes")
        .update({
          grupo_id: slotSelecionado.grupo_id,
          fase_id: slotSelecionado.fase_id,
        })
        .eq("id", campeonatoEquipeId);

      if (equipeError) {
        console.error(
          "Erro ao atualizar campeonato_equipes:",
          JSON.stringify(equipeError, null, 2),
        );

        // rollback simples para não deixar slot preso se a segunda atualização falhar
        await supabase
          .from("campeonato_grupo_slots")
          .update({ campeonato_equipe_id: null })
          .eq("id", slotSelecionado.id);

        throw equipeError;
      }

      // Garante que a sÃºmula enxergue a vaga adicionada no grupo.
      // IMPORTANTE: jogo_equipes precisa receber campeonato_id/fase_id SEM depender dos campos antigos de jogos,
      // porque alguns jogos antigos estão com campeonato_id/fase_id nulos.
      const grupoContexto = grupos.find(
        (grupo) => grupo.id === slotSelecionado.grupo_id,
      );
      const campeonatoIdAlvo =
        slotSelecionado.campeonato_id ||
        grupoContexto?.campeonato_id ||
        campeonatoId;
      const faseIdAlvo =
        slotSelecionado.fase_id || grupoContexto?.fase_id || null;

      if (!campeonatoIdAlvo || !faseIdAlvo) {
        console.warn(
          "Sincronização de jogo_equipes ignorada: campeonato_id ou fase_id não encontrado.",
          {
            campeonatoIdAlvo,
            faseIdAlvo,
            slotSelecionado,
            grupoContexto,
          },
        );
      } else {
        const { data: jogosDoGrupo, error: jogosDoGrupoError } = await supabase
          .from("jogos")
          .select("id")
          .eq("grupo_id", slotSelecionado.grupo_id);

        if (jogosDoGrupoError) {
          console.error(
            "Erro ao buscar jogos do grupo para sincronizar sÃºmula:",
            JSON.stringify(jogosDoGrupoError, null, 2),
          );
        } else if ((jogosDoGrupo || []).length > 0) {
          const vinculos = (jogosDoGrupo || []).map((jogo: any) => ({
            jogo_id: jogo.id,
            campeonato_id: campeonatoIdAlvo,
            fase_id: faseIdAlvo,
            grupo_id: slotSelecionado.grupo_id,
            equipe_id: null,
            campeonato_equipe_id: campeonatoEquipeId,
            origem_slot_id: slotSelecionado.id,
          }));

          await supabase
            .from("jogo_equipes")
            .delete()
            .eq("origem_slot_id", slotSelecionado.id)
            .eq("campeonato_equipe_id", campeonatoEquipeId);

          const { error: jogoEquipesError } = await supabase
            .from("jogo_equipes")
            .insert(vinculos);

          if (jogoEquipesError) {
            console.error(
              "Erro ao sincronizar jogo_equipes:",
              JSON.stringify(jogoEquipesError, null, 2),
            );
          }
        }
      }

      atualizarSlotLocal(slotSelecionado.id, {
        ...vagaSelecionada!,
        grupo_id: slotSelecionado.grupo_id,
        fase_id: slotSelecionado.fase_id,
      });
      atualizarVagaLocal(campeonatoEquipeId, {
        grupo_id: slotSelecionado.grupo_id,
        fase_id: slotSelecionado.fase_id,
      });

      toast.success(`${nomeVaga} adicionada ao slot`);
      resetModalEquipe();
      carregarDados(false);
    } catch (error: any) {
      console.error(
        "Erro ao adicionar equipe no slot:",
        JSON.stringify(error, null, 2),
      );
      toast.error(
        error?.message ||
          error?.details ||
          error?.hint ||
          "Erro ao adicionar equipe ao slot",
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleRemoverEquipeDoSlot = async (slot: SlotGrupo) => {
    if (!slot.campeonato_equipe_id) return;

    const nomeVaga =
      slot.equipe?.nome_exibicao || slot.equipe?.nome || "esta equipe";
    const confirmar = window.confirm(
      `Remover ${nomeVaga} deste grupo?\n\nSe ela já tiver jogado ou possuir resultado salvo, o sistema deve bloquear pela regra do banco/resultado.`,
    );

    if (!confirmar) return;

    setSalvando(true);

    try {
      const campeonatoEquipeId = slot.campeonato_equipe_id;

      // Remoção direta do slot. Não usa RPC antiga.
      const { error: slotError } = await supabase
        .from("campeonato_grupo_slots")
        .update({ campeonato_equipe_id: null })
        .eq("id", slot.id)
        .eq("campeonato_equipe_id", campeonatoEquipeId);

      if (slotError) {
        console.error(
          "Erro ao limpar campeonato_grupo_slots:",
          JSON.stringify(slotError, null, 2),
        );
        throw slotError;
      }

      // Remove também da sÃºmula/jogos vinculados a este slot.
      const { error: jogoEquipesDeleteError } = await supabase
        .from("jogo_equipes")
        .delete()
        .eq("origem_slot_id", slot.id)
        .eq("campeonato_equipe_id", campeonatoEquipeId);

      if (jogoEquipesDeleteError) {
        console.error(
          "Erro ao remover vÃ­nculo em jogo_equipes:",
          JSON.stringify(jogoEquipesDeleteError, null, 2),
        );
        throw jogoEquipesDeleteError;
      }

      const aindaUsadaEmOutroSlot = slots.some(
        (item) =>
          item.id !== slot.id &&
          item.fase_id === slot.fase_id &&
          item.campeonato_equipe_id === campeonatoEquipeId,
      );

      if (!aindaUsadaEmOutroSlot) {
        const { error: equipeError } = await supabase
          .from("campeonato_equipes")
          .update({
            grupo_id: null,
            fase_id: null,
          })
          .eq("id", campeonatoEquipeId);

        if (equipeError) {
          console.error(
            "Erro ao limpar campeonato_equipes:",
            JSON.stringify(equipeError, null, 2),
          );
          throw equipeError;
        }
      }

      atualizarSlotLocal(slot.id, null);
      if (!aindaUsadaEmOutroSlot) {
        atualizarVagaLocal(campeonatoEquipeId, { grupo_id: null, fase_id: null });
      }

      toast.success("Equipe removida do slot");
      carregarDados(false);
    } catch (error: any) {
      console.error(
        "Erro ao remover equipe do slot:",
        JSON.stringify(error, null, 2),
      );
      toast.error(
        error?.message ||
          error?.details ||
          error?.hint ||
          "Erro ao remover equipe do slot",
      );
    } finally {
      setSalvando(false);
    }
  };

  const criarSolicitacaoTroca = async () => {
    if (
      !slotTrocaSelecionado?.campeonato_equipe_id ||
      !slotTrocaSelecionado.equipe
    )
      return;

    if (!aceitaQualquerGrupo && !grupoDesejadoTroca) {
      toast.error("Selecione um grupo desejado ou marque troca genérica");
      return;
    }

    if (aceitaQualquerGrupo && !campConfig?.permitir_troca_grupos_generica) {
      toast.error("Troca genérica não está habilitada neste campeonato");
      return;
    }

    setSalvando(true);

    try {
      const { error } = await supabase.rpc("criar_solicitacao_troca_grupo", {
        p_campeonato_id: campeonatoId,
        p_solicitante_campeonato_equipe_id:
          slotTrocaSelecionado.campeonato_equipe_id,
        p_grupo_desejado_id: aceitaQualquerGrupo
          ? null
          : grupoDesejadoTroca || null,
        p_aceita_qualquer_grupo: aceitaQualquerGrupo,
        p_observacao: observacaoTroca || null,
      });

      if (error) throw error;

      toast.success("Solicitação de troca criada com sucesso");
      resetModalTroca();
      await carregarDados(false);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao criar solicitação de troca");
    } finally {
      setSalvando(false);
    }
  };

  const aceitarSolicitacaoTroca = async (solicitacao: SolicitacaoTroca) => {
    if (
      !slotTrocaSelecionado?.campeonato_equipe_id ||
      !slotTrocaSelecionado.equipe
    )
      return;

    if (
      solicitacao.solicitante_campeonato_equipe_id ===
      slotTrocaSelecionado.campeonato_equipe_id
    ) {
      toast.error("A mesma equipe não pode aceitar a própria solicitação");
      return;
    }

    setSalvando(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.rpc("aceitar_troca_grupo", {
        p_solicitacao_id: solicitacao.id,
        p_equipe_destino_campeonato_equipe_id:
          slotTrocaSelecionado.campeonato_equipe_id,
        p_aprovado_por: user?.id || null,
      });

      if (error) throw error;

      const slotSolicitante = slots.find(
        (slot) =>
          slot.campeonato_equipe_id ===
          solicitacao.solicitante_campeonato_equipe_id,
      );
      const slotDestino = slots.find(
        (slot) =>
          slot.campeonato_equipe_id ===
          slotTrocaSelecionado.campeonato_equipe_id,
      );

      if (slotSolicitante && slotDestino) {
        const { error: e1 } = await supabase
          .from("campeonato_grupo_slots")
          .update({ campeonato_equipe_id: slotDestino.campeonato_equipe_id })
          .eq("id", slotSolicitante.id);

        if (e1) throw e1;

        const { error: e2 } = await supabase
          .from("campeonato_grupo_slots")
          .update({
            campeonato_equipe_id: slotSolicitante.campeonato_equipe_id,
          })
          .eq("id", slotDestino.id);

        if (e2) throw e2;
      }

      toast.success("Troca concluÃ­da com sucesso");
      resetModalTroca();
      await carregarDados(false);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao aceitar troca");
    } finally {
      setSalvando(false);
    }
  };

  const cancelarSolicitacaoTroca = async (solicitacaoId: string) => {
    const confirmar = confirm("Deseja cancelar esta solicitação de troca?");
    if (!confirmar) return;

    setSalvando(true);

    try {
      const { error } = await supabase.rpc("cancelar_solicitacao_troca_grupo", {
        p_solicitacao_id: solicitacaoId,
      });

      if (error) throw error;

      toast.success("Solicitação cancelada");
      await carregarDados(false);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao cancelar solicitação");
    } finally {
      setSalvando(false);
    }
  };

  const formatarTipoValidacao = (tipo: string | null) => {
    if (tipo === "mesma_fase_e_mesmas_quedas")
      return "Mesma fase + mesmas quedas";
    if (tipo === "mesma_fase") return "Mesma fase";
    if (tipo === "aprovacao_manual") return "Aprovação manual";
    return "Regra padrão";
  };

  const formatarMapasGrupo = (grupo: GrupoComSlots) => {
    const cfg = (grupo.configuracao || {}) as Record<string, any>;
    const mapasDiretos = Array.isArray(grupo.mapas) ? grupo.mapas : [];
    const mapasConfig = Array.isArray(cfg.mapas) ? cfg.mapas : [];
    const mapas = mapasDiretos.length > 0 ? mapasDiretos : mapasConfig;
    if (mapas.length === 0) return "Mapas não definidos";
    return mapas.join(" • ");
  };

  const formatarAgendaGrupo = (grupo: GrupoComSlots) => {
    const cfg = (grupo.configuracao || {}) as Record<string, any>;
    const dataRaw = cfg.data_jogo || cfg.dataJogo || null;
    const data = dataRaw ? new Date(dataRaw).toLocaleDateString("pt-BR") : null;
    const hora = grupo.horario_inicio || cfg.horario_inicio || cfg.hora_jogo || cfg.horaJogo || null;
    if (data && hora) return `${data} • ${String(hora).slice(0, 5)}`;
    if (data) return data;
    if (hora) return String(hora).slice(0, 5);
    return "Dia e hora não definidos";
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#7cfc00] mb-2" size={24} />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          Carregando fases e grupos.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 p-1">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setView("estrutura")}
            className={`px-4 py-2 text-[9px] font-black italic uppercase transition-all flex items-center gap-2 ${
              view === "estrutura"
                ? "bg-slate-900 text-[#7cfc00]"
                : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <LayoutGrid size={12} /> GRUPOS
          </button>

          <button
            onClick={() => setView("equipes")}
            className={`px-4 py-2 text-[9px] font-black italic uppercase transition-all flex items-center gap-2 ${
              view === "equipes"
                ? "bg-slate-900 text-[#7cfc00]"
                : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <Users size={12} /> EQUIPES
          </button>

          <button
            onClick={() => setView("trocas")}
            className={`px-4 py-2 text-[9px] font-black italic uppercase transition-all flex items-center gap-2 ${
              view === "trocas"
                ? "bg-slate-900 text-[#7cfc00]"
                : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <ArrowRightLeft size={12} /> TROCAS
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => carregarDados(true)}
            className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase italic border border-black flex items-center gap-2"
          >
            <RefreshCw size={12} />
            ATUALIZAR
          </button>

          {canEdit ? (
            <button
              onClick={() => setShowModalFase(true)}
              className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase italic border border-black flex items-center gap-2"
            >
              <Plus size={12} />
              NOVA FASE
            </button>
          ) : null}

          {canEdit ? (
            <button
              onClick={() => {
                if (fases.length === 0) {
                  toast.error("Crie uma fase primeiro");
                  return;
                }
                setFaseSelecionadaParaGrupo(fases[0]?.id || "");
                setNomeGrupo(proximaLetraGrupo(fases[0]?.id || ""));
                setQuantidadeEquipesGrupo("12");
                setQuantidadeQuedasGrupo("4");
                setIntervaloGrupo("15");
                setDataJogoGrupo("");
                setHoraJogoGrupo("");
                setClassificamGrupo("1");
                setMapasGrupoSelecionados([
                  "Bermuda",
                  "Purgatório",
                  "Alpine",
                  "Kalahari",
                ]);
                setShowModalGrupo(true);
              }}
              className="px-4 py-2 bg-[#7cfc00] text-black text-[9px] font-black uppercase italic border border-black flex items-center gap-2"
            >
              <Plus size={12} />
              NOVO GRUPO
            </button>
          ) : null}
        </div>
      </div>

      {campConfig && (
        <div className="bg-white border border-slate-200 p-4 flex flex-wrap gap-3 text-[10px] font-black uppercase italic">
          <span
            className={`px-3 py-1 border ${campConfig.permitir_troca_grupos ? "bg-[#7cfc00] text-black border-black" : "bg-zinc-100 text-zinc-500 border-zinc-200"}`}
          >
            Troca de grupos:{" "}
            {campConfig.permitir_troca_grupos ? "ATIVA" : "DESATIVADA"}
          </span>
          <span className="px-3 py-1 border border-zinc-200 bg-zinc-50 text-zinc-700">
            Troca livre:{" "}
            {campConfig.permitir_troca_grupos_livre ? "SIM" : "NÃO"}
          </span>
          <span className="px-3 py-1 border border-zinc-200 bg-zinc-50 text-zinc-700">
            Troca genérica:{" "}
            {campConfig.permitir_troca_grupos_generica ? "SIM" : "NÃO"}
          </span>
          <span className="px-3 py-1 border border-zinc-200 bg-zinc-50 text-zinc-700">
            Aprovação:{" "}
            {campConfig.exigir_aprovacao_organizacao_troca_grupo
              ? "OBRIGATÓRIA"
              : "LIVRE"}
          </span>
          <span className="px-3 py-1 border border-zinc-200 bg-zinc-50 text-zinc-700">
            Formato: {campConfig.formato || "---"}
          </span>
        </div>
      )}

      {view === "estrutura" && (
        <div className="grid grid-cols-1 gap-[2px] bg-slate-200 border border-slate-200 shadow-sm">
          {estrutura.length === 0 ? (
            <div className="bg-white p-10 text-center text-[10px] font-black uppercase italic text-slate-400">
              Nenhuma fase criada ainda.
            </div>
          ) : (
            estrutura.map((fase) => {
              const aberta = fasesAbertas.includes(fase.id);
              const genericasFase =
                solicitacoesGenericasPorFase.get(fase.id) || [];

              return (
                <div key={fase.id} className="bg-white">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleFase(fase.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleFase(fase.id);
                      }
                    }}
                    className="w-full flex items-center justify-between px-5 py-4 border-b border-black bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {aberta ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                      <span className="text-[11px] font-black uppercase italic text-white">
                        {fase.nome}
                      </span>
                      <span className="text-[9px] font-black uppercase italic text-slate-300">
                        {fase.grupos.length} grupo(s)
                      </span>
                      {genericasFase.length > 0 && (
                        <span className="text-[8px] font-black uppercase px-2 py-1 bg-orange-200 text-black">
                          {genericasFase.length} troca(s) genérica(s)
                        </span>
                      )}
                    </div>

                    {canEdit ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirCriarGrupoNaFase(fase.id);
                          }}
                          className="px-3 py-1 bg-[#7cfc00] text-black text-[8px] font-black uppercase italic border border-[#7cfc00]"
                        >
                          + Grupo
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExcluirFase(fase);
                          }}
                          className="px-3 py-1 bg-transparent text-white text-[8px] font-black uppercase italic border border-white/30"
                        >
                          Excluir
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {aberta && (
                    <div className="grid grid-cols-1 gap-[2px] bg-slate-100">
                      {fase.grupos.length === 0 ? (
                        <div className="bg-white p-6 text-center text-[10px] font-black uppercase italic text-slate-400">
                          Nenhum grupo nesta fase.
                        </div>
                      ) : (
                        fase.grupos.map((grupo) => {
                          const abertoGrupo = gruposAbertos.includes(grupo.id);
                          const solicitacoesDoGrupo =
                            solicitacoesPorGrupo.get(grupo.id) || [];

                          return (
                            <div key={grupo.id} className="bg-white">
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleGrupo(grupo.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    toggleGrupo(grupo.id);
                                  }
                                }}
                                className="w-full border-b border-slate-200 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                              >
                                <div className="flex items-start justify-between gap-4 px-5 py-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {abertoGrupo ? (
                                        <ChevronDown size={14} />
                                      ) : (
                                        <ChevronRight size={14} />
                                      )}
                                      <span className="text-[10px] font-black uppercase italic">
                                        {grupo.nome}
                                      </span>
                                      <MessageShortcut
                                        referenciaTipo="grupo_campeonato"
                                        referenciaId={grupo.id}
                                        titulo={`${campConfig?.nome || "Campeonato"} - ${fase.nome} - ${extrairLetraGrupo(grupo.nome)}`}
                                        avatarUrl={campConfig?.logo_url || null}
                                        tipo="grupo_campeonato"
                                        compact
                                        className="h-7 w-7 border-blue-200 bg-white"
                                        title="Chat do grupo"
                                      />
                                      <span className="text-[8px] font-black uppercase italic text-slate-400">
                                        {grupo.vagas_preenchidas}/
                                        {grupo.vagas_totais} slots
                                      </span>
                                      {solicitacoesDoGrupo.length > 0 && (
                                        <span className="text-[8px] font-black uppercase px-2 py-1 bg-[#7cfc00] text-black">
                                          {solicitacoesDoGrupo.length} pedido(s)
                                        </span>
                                      )}
                                    </div>

                                    {isCopa ? (
                                      <details
                                        className="mt-3 w-full border border-slate-200 bg-white"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-[8px] font-black uppercase italic tracking-[0.16em] text-slate-500">
                                          Informacoes do grupo
                                          <span className="text-slate-400">
                                            agenda, partidas, classificacao e mapas
                                          </span>
                                        </summary>
                                        <div className="grid gap-2 border-t border-slate-200 p-3 md:grid-cols-2 xl:grid-cols-4">
                                          <div className="border border-slate-200 bg-slate-50 px-3 py-2">
                                            <div className="text-[8px] font-black uppercase italic text-slate-400">
                                              Agenda
                                            </div>
                                            <div className="mt-1 text-[10px] font-black uppercase italic text-slate-800">
                                              {formatarAgendaGrupo(grupo)}
                                            </div>
                                          </div>

                                          <div className="border border-slate-200 bg-slate-50 px-3 py-2">
                                            <div className="text-[8px] font-black uppercase italic text-slate-400">
                                              Partidas
                                            </div>
                                            <div className="mt-1 text-[10px] font-black uppercase italic text-slate-800">
                                              {Number(grupo.qtd_quedas || grupo.configuracao?.qtd_quedas || grupo.configuracao?.quantidade_partidas || 0)}{" "}
                                              partida(s)
                                            </div>
                                          </div>

                                          <div className="border border-slate-200 bg-slate-50 px-3 py-2">
                                            <div className="text-[8px] font-black uppercase italic text-slate-400">
                                              Classificam
                                            </div>
                                            <div className="mt-1 text-[10px] font-black uppercase italic text-slate-800">
                                              {Number(grupo.classificam || grupo.configuracao?.classificam || 0)}{" "}
                                              equipe(s)
                                            </div>
                                          </div>

                                          <div className="border border-slate-200 bg-slate-50 px-3 py-2">
                                            <div className="text-[8px] font-black uppercase italic text-slate-400">
                                              Mapas
                                            </div>
                                            <div className="mt-1 text-[10px] font-black uppercase italic text-slate-800 line-clamp-2">
                                              {formatarMapasGrupo(grupo)}
                                            </div>
                                          </div>
                                        </div>
                                      </details>
                                    ) : null}
                                  </div>

                                  <div className="flex min-w-[180px] flex-col items-end gap-3">
                                    <div className="w-full">
                                      <div className="mb-1 flex items-center justify-between text-[8px] font-black uppercase italic text-slate-500">
                                        <span>Preenchimento</span>
                                        <span>
                                          {grupo.vagas_preenchidas}/
                                          {grupo.vagas_totais}
                                        </span>
                                      </div>
                                      <div className="h-3 w-full overflow-hidden border border-slate-300 bg-white">
                                        <div
                                          className="h-full bg-[#7cfc00]"
                                          style={{
                                            width: `${grupo.percentual_preenchimento}%`,
                                          }}
                                        />
                                      </div>
                                    </div>

                                    {canEdit ? (
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            abrirEditarGrupo(grupo);
                                          }}
                                          className="px-3 py-1 bg-[#7cfc00] text-black text-[8px] font-black uppercase italic border border-black"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleExcluirGrupo(grupo);
                                          }}
                                          className="px-3 py-1 bg-white text-black text-[8px] font-black uppercase italic border border-black"
                                        >
                                          Excluir
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              {abertoGrupo && (
                                <div className="p-4">
                                  <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                                    {grupo.slots.map((slot) => {
                                      const slotAberto = slotsAbertos.includes(
                                        slot.id,
                                      );

                                      return (
                                        <div
                                          key={slot.id}
                                          className="border border-slate-200 bg-slate-50"
                                        >
                                          <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                              if (slot.equipe) setEquipeDetalhe(slot.equipe);
                                            }}
                                            onKeyDown={(e) => {
                                              if (!slot.equipe) return;
                                              if (
                                                e.key === "Enter" ||
                                                e.key === " "
                                              ) {
                                                e.preventDefault();
                                                setEquipeDetalhe(slot.equipe);
                                              }
                                            }}
                                            className={`flex items-center justify-between gap-3 p-3 ${slot.equipe ? "cursor-pointer hover:bg-slate-100" : ""}`}
                                          >
                                            <div className="flex items-center gap-3 min-w-0">
                                              <span className="text-[8px] font-black uppercase italic text-slate-400 min-w-[44px]">
                                                Slot {slot.slot_numero}
                                              </span>

                                              {slot.equipe ? (
                                                <>
                                                  <div className="w-11 h-11 border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                                                    {slot.equipe.logo_url ? (
                                                      <img
                                                        src={
                                                          slot.equipe.logo_url
                                                        }
                                                        alt={slot.equipe.nome}
                                                        className="w-full h-full object-cover"
                                                      />
                                                    ) : (
                                                      <Users
                                                        size={15}
                                                        className="text-slate-300"
                                                      />
                                                    )}
                                                  </div>

                                                  <div className="min-w-0">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                      <p className="min-w-0 flex-1 truncate text-[10px] font-black uppercase italic text-slate-800">
                                                        {slot.equipe.nome}
                                                      </p>
                                                      {slot.equipe
                                                        .equipe_id && (
                                                        <MessageShortcut
                                                          referenciaTipo="equipe"
                                                          referenciaId={
                                                            slot.equipe
                                                              .equipe_id
                                                          }
                                                          titulo={
                                                            slot.equipe.nome ||
                                                            "Equipe"
                                                          }
                                                          avatarUrl={
                                                            slot.equipe.logo_url
                                                          }
                                                          tipo="equipe"
                                                        />
                                                      )}
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                      {slot.equipe.tag && (
                                                        <span className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-black text-[#7cfc00]">
                                                          {slot.equipe.tag}
                                                        </span>
                                                      )}

                                                      <span
                                                        className={`text-[7px] font-black uppercase px-1.5 py-0.5 ${
                                                          slot.equipe
                                                            .tipo_origem ===
                                                          "oficial"
                                                            ? "bg-[#7cfc00] text-black"
                                                            : "bg-orange-300 text-black"
                                                        }`}
                                                      >
                                                        {slot.equipe
                                                          .tipo_origem ===
                                                        "oficial"
                                                          ? "APP"
                                                          : "AVULSA"}
                                                      </span>

                                                      {slot.equipe.line_nome ? (
                                                        <span className="bg-[#2563eb]/10 px-1.5 py-0.5 text-[7px] font-black uppercase text-[#2563eb]">
                                                          {
                                                            slot.equipe
                                                              .line_nome
                                                          }
                                                        </span>
                                                      ) : null}
                                                    </div>
                                                  </div>
                                                </>
                                              ) : (
                                                <span className="text-[9px] font-black uppercase italic text-slate-400">
                                                  Slot vazio
                                                </span>
                                              )}
                                            </div>

                                            {canEdit ? (
                                              <div className="flex items-center gap-2 shrink-0">
                                                {slot.equipe ? (
                                                  <>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoverEquipeDoSlot(
                                                          slot,
                                                        );
                                                      }}
                                                      className="h-8 w-8 flex items-center justify-center border border-red-300 bg-white text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                      title="Remover equipe"
                                                    >
                                                      <Trash2 size={13} />
                                                    </button>

                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleSlot(slot.id);
                                                      }}
                                                      className="h-8 w-8 flex items-center justify-center border border-black bg-black text-[#7cfc00]"
                                                      title="Abrir açÃµes"
                                                    >
                                                      {slotAberto ? (
                                                        <ChevronDown
                                                          size={14}
                                                        />
                                                      ) : (
                                                        <ChevronRight
                                                          size={14}
                                                        />
                                                      )}
                                                    </button>
                                                  </>
                                                ) : (
                                                  <button
                                                    onClick={() =>
                                                      abrirSelecaoEquipe(slot)
                                                    }
                                                    className="h-8 w-8 flex items-center justify-center border border-dashed border-slate-300 bg-white text-slate-400 hover:border-black hover:text-black"
                                                    title="Adicionar equipe"
                                                  >
                                                    <Plus size={14} />
                                                  </button>
                                                )}
                                              </div>
                                            ) : null}
                                          </div>

                                          {canEdit &&
                                            slot.equipe &&
                                            slotAberto && (
                                              <div className="border-t border-slate-200 bg-white px-3 py-3">
                                                <div className="flex gap-2 justify-end">
                                                  <button
                                                    onClick={() =>
                                                      abrirSelecaoEquipe(slot)
                                                    }
                                                    className="h-9 w-9 flex items-center justify-center bg-white border border-black text-black"
                                                    title="Trocar equipe"
                                                  >
                                                    <Users size={14} />
                                                  </button>

                                                  <button
                                                    onClick={() =>
                                                      abrirModalTroca(slot)
                                                    }
                                                    className="h-9 w-9 flex items-center justify-center bg-black text-[#7cfc00] border border-black"
                                                    title="Troca de grupo"
                                                  >
                                                    <ArrowRightLeft size={14} />
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {view === "equipes" && (
        <div className="bg-white border border-slate-200 shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {equipesBase
              .slice()
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
              .map((equipe) => {
                const grupo = equipe.grupo_id
                  ? mapaGrupos.get(equipe.grupo_id)
                  : null;

                return (
                  <div
                    key={equipe.inscricao_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setEquipeDetalhe(equipe)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setEquipeDetalhe(equipe);
                      }
                    }}
                    className="cursor-pointer border border-slate-200 bg-slate-50 p-4 transition hover:bg-emerald-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                        {equipe.logo_url ? (
                          <img
                            src={equipe.logo_url}
                            alt={equipe.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users size={16} className="text-slate-300" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-[10px] font-black uppercase italic text-slate-800">
                            {equipe.nome}
                          </p>
                          {equipe.equipe_id && (
                            <MessageShortcut
                              referenciaTipo="equipe"
                              referenciaId={equipe.equipe_id}
                              titulo={equipe.nome || "Equipe"}
                              avatarUrl={equipe.logo_url}
                              tipo="equipe"
                            />
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {equipe.tag && (
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-black text-[#7cfc00]">
                              {equipe.tag}
                            </span>
                          )}
                          <span className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-white border border-slate-200 text-slate-500">
                            {grupo?.nome || "Sem grupo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {view === "trocas" && (
        <div className="bg-white border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[11px] font-black uppercase italic">
                SolicitaçÃµes de troca
              </h3>
              <p className="mt-1 text-[9px] font-black uppercase italic text-slate-400">
                Mesmo fase sempre • pontos corridos exige mesma quantidade de
                quedas na validação final
              </p>
            </div>

            <button
              onClick={() => carregarDados(true)}
              className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase italic border border-black flex items-center gap-2"
            >
              <RefreshCw size={12} />
              Atualizar
            </button>
          </div>

          {solicitacoes.length === 0 ? (
            <div className="p-10 text-center text-[10px] font-black uppercase italic text-slate-400">
              Nenhuma solicitação cadastrada.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {solicitacoes.map((solicitacao) => {
                const equipeSolicitante = mapaEquipes.get(
                  solicitacao.solicitante_campeonato_equipe_id,
                );
                const grupoOrigem = mapaGrupos.get(solicitacao.grupo_origem_id);
                const grupoDesejado = solicitacao.grupo_desejado_id
                  ? mapaGrupos.get(solicitacao.grupo_desejado_id)
                  : null;

                return (
                  <div
                    key={solicitacao.id}
                    className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-black uppercase italic text-black">
                          {equipeSolicitante?.nome || "Equipe"}
                        </span>
                        <span className="text-[8px] font-black uppercase px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200">
                          {grupoOrigem?.nome || "Grupo origem"}
                        </span>
                        {grupoDesejado ? (
                          <span className="text-[8px] font-black uppercase px-2 py-1 bg-[#7cfc00] text-black border border-black">
                            Deseja {grupoDesejado.nome}
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase px-2 py-1 bg-orange-200 text-black border border-black">
                            Troca genérica
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-[8px] font-black uppercase px-2 py-1 bg-white border border-slate-200 text-slate-500">
                          {formatarTipoValidacao(solicitacao.tipo_validacao)}
                        </span>
                        <span className="text-[8px] font-black uppercase px-2 py-1 bg-white border border-slate-200 text-slate-500">
                          Quedas: {solicitacao.quedas_jogadas_solicitante}
                        </span>
                        <span className="text-[8px] font-black uppercase px-2 py-1 bg-white border border-slate-200 text-slate-500">
                          {new Date(solicitacao.created_at).toLocaleString(
                            "pt-BR",
                          )}
                        </span>
                      </div>

                      {solicitacao.observacao && (
                        <p className="mt-2 text-[10px] text-slate-500">
                          {solicitacao.observacao}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => cancelarSolicitacaoTroca(solicitacao.id)}
                        className="px-3 py-2 bg-white text-black text-[8px] font-black uppercase italic border border-black"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {equipeDetalhe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => setEquipeDetalhe(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden border border-slate-200 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-5">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white">
                  {equipeDetalhe.logo_url ? (
                    <img
                      src={equipeDetalhe.logo_url}
                      alt={equipeDetalhe.nome_exibicao || equipeDetalhe.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Users size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
                    Equipe do grupo
                  </div>
                  <h3 className="mt-1 truncate text-2xl font-black uppercase text-slate-900">
                    {equipeDetalhe.nome_exibicao || equipeDetalhe.nome}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {equipeDetalhe.tag ? (
                      <span className="bg-black px-2 py-1 text-[9px] font-black uppercase text-[#7cfc00]">
                        {equipeDetalhe.tag}
                      </span>
                    ) : null}
                    {equipeDetalhe.line_nome ? (
                      <span className="border border-slate-200 bg-white px-2 py-1 text-[9px] font-black uppercase text-[#2563eb]">
                        {equipeDetalhe.line_nome}
                      </span>
                    ) : null}
                    <span className="border border-slate-200 bg-white px-2 py-1 text-[9px] font-black uppercase text-slate-600">
                      {equipeDetalhe.tipo_origem === "oficial" ? "Equipe app" : "Avulsa"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEquipeDetalhe(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-900"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Status</div>
                  <div className="mt-2 text-sm font-black uppercase text-slate-900">{equipeDetalhe.status || "Ativa"}</div>
                </div>
                <div className="border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Grupo</div>
                  <div className="mt-2 text-sm font-black uppercase text-slate-900">{equipeDetalhe.grupo_id ? "Vinculada" : "Sem grupo"}</div>
                </div>
                <div className="border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Origem</div>
                  <div className="mt-2 text-sm font-black uppercase text-slate-900">{equipeDetalhe.tipo_origem === "oficial" ? "App" : "Avulsa"}</div>
                </div>
                <div className="border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Vaga</div>
                  <div className="mt-2 text-sm font-black uppercase text-slate-900">#{equipeDetalhe.numero_repeticao || 1}</div>
                </div>
              </div>

              <SocialActions
                entityId={equipeDetalhe.equipe_id || null}
                entityType="equipe"
                variant="light"
                title="Torcida da equipe"
              />

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEquipeDetalhe(null)}
                  className="h-11 border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-wide text-slate-900"
                >
                  Fechar
                </button>
                {equipeDetalhe.equipe_id ? (
                  <Link
                    href={`/equipe/${equipeDetalhe.equipe_id}`}
                    className="inline-flex h-11 items-center justify-center gap-2 border border-emerald-700 bg-emerald-600 px-5 text-[10px] font-black uppercase tracking-wide text-white"
                  >
                    Visitar perfil
                    <ExternalLink size={13} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="h-11 cursor-not-allowed border border-slate-200 bg-slate-100 px-5 text-[10px] font-black uppercase tracking-wide text-slate-400"
                  >
                    Sem perfil no app
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModalFase && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black bg-black px-5 py-4">
              <div>
                <h3 className="text-sm font-black uppercase italic text-[#7cfc00]">
                  Nova fase
                </h3>
                <p className="mt-1 text-[10px] font-black uppercase italic text-zinc-400">
                  Crie uma nova etapa do campeonato
                </p>
              </div>

              <button onClick={resetModalFase} className="text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                  Nome da fase
                </label>
                <input
                  value={nomeFase}
                  onChange={(e) => setNomeFase(e.target.value)}
                  placeholder="Ex: FASE DE GRUPOS"
                  className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCriarFase}
                  disabled={salvando}
                  className="flex-1 bg-[#7cfc00] text-black p-3 text-[10px] font-black uppercase italic border border-black"
                >
                  {salvando ? "SALVANDO..." : "CRIAR FASE"}
                </button>

                <button
                  onClick={resetModalFase}
                  className="flex-1 bg-white border-2 border-black p-3 font-black uppercase text-[10px] italic"
                >
                  FECHAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModalGrupo && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-xl border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black bg-black px-5 py-4">
              <div>
                <h3 className="text-sm font-black uppercase italic text-[#7cfc00]">
                  {grupoEditando ? "Editar grupo" : "Novo grupo"}
                </h3>
                <p className="mt-1 text-[10px] font-black uppercase italic text-zinc-400">
                  {grupoEditando
                    ? "Ajuste agenda, slots, partidas e mapas do grupo"
                    : "Vincule o grupo a uma fase e defina os slots"}
                </p>
              </div>

              <button onClick={resetModalGrupo} className="text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                  Fase
                </label>
                <select
                  value={faseSelecionadaParaGrupo}
                  onChange={(e) => setFaseSelecionadaParaGrupo(e.target.value)}
                  disabled={Boolean(grupoEditando)}
                  className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                >
                  <option value="">Selecione</option>
                  {fases.map((fase) => (
                    <option key={fase.id} value={fase.id}>
                      {fase.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                  Letra do grupo
                </label>
                <select
                  value={extrairLetraGrupo(nomeGrupo)}
                  onChange={(e) => setNomeGrupo(e.target.value)}
                  className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                >
                  {LETRAS_GRUPO.map((letra) => {
                    const nomeCompleto = montarNomeGrupo(letra);
                    const usada = grupos.some(
                      (grupo) =>
                        grupo.id !== grupoEditando?.id &&
                        grupo.fase_id === faseSelecionadaParaGrupo &&
                        extrairLetraGrupo(grupo.nome) === letra,
                    );
                    return (
                      <option key={letra} value={letra} disabled={usada}>
                        {nomeCompleto}{usada ? " - JÃ EXISTE" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                  Quantidade de equipes
                </label>
                <input
                  value={quantidadeEquipesGrupo}
                  onChange={(e) => setQuantidadeEquipesGrupo(e.target.value)}
                  type="number"
                  min={1}
                  className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                />
              </div>

              {isCopa ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                      Número de partidas
                    </label>
                    <input
                      value={quantidadeQuedasGrupo}
                      onChange={(e) => {
                        const value = e.target.value;
                        setQuantidadeQuedasGrupo(value);
                        const qtd = Number(value);
                        if (Number.isFinite(qtd) && qtd > 0) {
                          ajustarMapasParaQuantidade(qtd);
                        }
                      }}
                      type="number"
                      min={1}
                      className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                      Classificam
                    </label>
                    <input
                      value={classificamGrupo}
                      onChange={(e) => setClassificamGrupo(e.target.value)}
                      type="number"
                      min={0}
                      className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                      Dia do jogo
                    </label>
                    <input
                      value={dataJogoGrupo}
                      onChange={(e) => setDataJogoGrupo(e.target.value)}
                      type="date"
                      className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                      Hora do jogo
                    </label>
                    <input
                      value={horaJogoGrupo}
                      onChange={(e) => setHoraJogoGrupo(e.target.value)}
                      type="time"
                      className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                      Intervalo entre partidas (min)
                    </label>
                    <input
                      value={intervaloGrupo}
                      onChange={(e) => setIntervaloGrupo(e.target.value)}
                      type="number"
                      min={0}
                      className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                      Mapas por partida
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                      {Array.from({
                        length: Number(quantidadeQuedasGrupo || 0),
                      }).map((_, index) => (
                        <div
                          key={`mapa-partida-${index}`}
                          className="border-2 border-black bg-white p-3"
                        >
                          <div className="mb-2 text-[10px] font-black uppercase italic text-slate-500">
                            Partida {index + 1}
                          </div>

                          <select
                            value={mapasGrupoSelecionados[index] || ""}
                            onChange={(e) =>
                              atualizarMapaGrupo(index, e.target.value)
                            }
                            className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                          >
                            {OPCOES_MAPA.map((mapa) => (
                              <option key={mapa} value={mapa}>
                                {mapa}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  onClick={handleSalvarGrupo}
                  disabled={salvando}
                  className="flex-1 bg-[#7cfc00] text-black p-3 text-[10px] font-black uppercase italic border border-black"
                >
                  {salvando
                    ? "SALVANDO..."
                    : grupoEditando
                      ? "SALVAR GRUPO"
                      : "CRIAR GRUPO"}
                </button>

                <button
                  onClick={resetModalGrupo}
                  className="flex-1 bg-white border-2 border-black p-3 font-black uppercase text-[10px] italic"
                >
                  FECHAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModalEquipe && slotSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black bg-black px-5 py-4">
              <div>
                <h3 className="text-sm font-black uppercase italic text-[#7cfc00]">
                  Selecionar equipe
                </h3>
                <p className="mt-1 text-[10px] font-black uppercase italic text-zinc-400">
                  {mapaGrupos.get(slotSelecionado.grupo_id)?.nome || "Grupo"} •
                  Slot {slotSelecionado.slot_numero}
                </p>
              </div>

              <button onClick={resetModalEquipe} className="text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <input
                value={buscaEquipe}
                onChange={(e) => setBuscaEquipe(e.target.value)}
                placeholder="Buscar equipe por nome ou tag"
                className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
              />

              <div className="mt-4 border border-slate-200 max-h-[420px] overflow-y-auto">
                {equipesDisponiveisParaSlot.length === 0 ? (
                  <div className="p-6 text-center text-[10px] font-black uppercase italic text-slate-400">
                    Nenhuma equipe disponÃ­vel
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {equipesDisponiveisParaSlot.map((equipe) => (
                      <button
                        key={equipe.inscricao_id}
                        onClick={() =>
                          handleAdicionarEquipeNoSlot(equipe.inscricao_id)
                        }
                        disabled={salvando}
                        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-slate-50 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                            {equipe.logo_url ? (
                              <img
                                src={equipe.logo_url}
                                alt={equipe.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users size={15} className="text-slate-300" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase italic text-slate-800 truncate">
                              {equipe.nome}
                            </p>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {equipe.tag && (
                                <span className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-black text-[#7cfc00]">
                                  {equipe.tag}
                                </span>
                              )}

                              <span
                                className={`text-[7px] font-black uppercase px-1.5 py-0.5 ${
                                  equipe.tipo_origem === "oficial"
                                    ? "bg-[#7cfc00] text-black"
                                    : "bg-orange-300 text-black"
                                }`}
                              >
                                {equipe.tipo_origem === "oficial"
                                  ? "APP"
                                  : "AVULSA"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {equipe.numero_repeticao > 1 && (
                            <span className="text-[8px] font-black uppercase italic text-slate-400">
                              {equipe.numero_repeticao}Âª VAGA
                            </span>
                          )}
                          <span className="border border-black bg-[#7cfc00] px-3 py-2 text-[8px] font-black uppercase italic text-black">
                            ADICIONAR
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={resetModalEquipe}
                  className="flex-1 bg-white border-2 border-black p-3 font-black uppercase text-[10px] italic"
                >
                  FECHAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModalTroca && slotTrocaSelecionado?.equipe && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black bg-black px-5 py-4">
              <div>
                <h3 className="text-sm font-black uppercase italic text-[#7cfc00]">
                  Troca de grupo
                </h3>
                <p className="mt-1 text-[10px] font-black uppercase italic text-zinc-400">
                  {slotTrocaSelecionado.equipe.nome} •{" "}
                  {mapaGrupos.get(slotTrocaSelecionado.grupo_id)?.nome ||
                    "Grupo atual"}
                </p>
              </div>

              <button onClick={resetModalTroca} className="text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-0">
              <div className="p-5 border-b xl:border-b-0 xl:border-r border-slate-200">
                <h4 className="text-[10px] font-black uppercase italic text-slate-500 mb-4">
                  Criar solicitação
                </h4>

                <div className="space-y-4">
                  <div className="border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                        {slotTrocaSelecionado.equipe.logo_url ? (
                          <img
                            src={slotTrocaSelecionado.equipe.logo_url}
                            alt={slotTrocaSelecionado.equipe.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users size={16} className="text-slate-300" />
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase italic text-slate-800">
                          {slotTrocaSelecionado.equipe.nome}
                        </p>
                        <p className="text-[9px] font-black uppercase italic text-slate-400">
                          Fase{" "}
                          {fases.find(
                            (f) => f.id === slotTrocaSelecionado.fase_id,
                          )?.nome || "---"}{" "}
                          • Grupo{" "}
                          {mapaGrupos.get(slotTrocaSelecionado.grupo_id)
                            ?.nome || "---"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-[10px] font-black uppercase italic">
                    <input
                      type="checkbox"
                      checked={aceitaQualquerGrupo}
                      onChange={(e) => setAceitaQualquerGrupo(e.target.checked)}
                      disabled={!campConfig?.permitir_troca_grupos_generica}
                    />
                    Aceitar troca com qualquer grupo da mesma fase
                  </label>

                  <div>
                    <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                      Grupo desejado
                    </label>
                    <select
                      value={grupoDesejadoTroca}
                      onChange={(e) => setGrupoDesejadoTroca(e.target.value)}
                      disabled={aceitaQualquerGrupo}
                      className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase outline-none"
                    >
                      <option value="">Selecione</option>
                      {gruposDisponiveisTroca.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase italic text-slate-500 mb-2">
                      Observação
                    </label>
                    <textarea
                      value={observacaoTroca}
                      onChange={(e) => setObservacaoTroca(e.target.value)}
                      rows={4}
                      className="w-full border-2 border-black bg-white px-4 py-3 text-[11px] font-black outline-none"
                      placeholder="Ex: preferimos trocar por horário de confronto"
                    />
                  </div>

                  <button
                    onClick={criarSolicitacaoTroca}
                    disabled={salvando}
                    className="w-full bg-[#7cfc00] text-black p-3 text-[10px] font-black uppercase italic border border-black"
                  >
                    {salvando ? "SALVANDO..." : "CRIAR SOLICITAÃ‡ÃƒO"}
                  </button>
                </div>
              </div>

              <div className="p-5">
                <h4 className="text-[10px] font-black uppercase italic text-slate-500 mb-4">
                  SolicitaçÃµes compatÃ­veis
                </h4>

                <div className="space-y-3 max-h-[520px] overflow-y-auto">
                  {solicitacoesRelacionadasAoSlot.length === 0 ? (
                    <div className="border border-slate-200 bg-slate-50 p-6 text-center text-[10px] font-black uppercase italic text-slate-400">
                      Nenhuma solicitação compatÃ­vel encontrada.
                    </div>
                  ) : (
                    solicitacoesRelacionadasAoSlot.map((solicitacao) => {
                      const equipeSolicitante = mapaEquipes.get(
                        solicitacao.solicitante_campeonato_equipe_id,
                      );
                      const grupoOrigem = mapaGrupos.get(
                        solicitacao.grupo_origem_id,
                      );
                      const grupoDesejado = solicitacao.grupo_desejado_id
                        ? mapaGrupos.get(solicitacao.grupo_desejado_id)
                        : null;

                      const ehMinhaSolicitacao =
                        solicitacao.solicitante_campeonato_equipe_id ===
                        slotTrocaSelecionado.campeonato_equipe_id;

                      return (
                        <div
                          key={solicitacao.id}
                          className="border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase italic text-slate-800">
                                {equipeSolicitante?.nome || "Equipe"}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="text-[8px] font-black uppercase px-2 py-1 bg-white border border-slate-200 text-slate-500">
                                  Origem: {grupoOrigem?.nome || "---"}
                                </span>
                                {grupoDesejado ? (
                                  <span className="text-[8px] font-black uppercase px-2 py-1 bg-[#7cfc00] text-black border border-black">
                                    Quer {grupoDesejado.nome}
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black uppercase px-2 py-1 bg-orange-200 text-black border border-black">
                                    Genérica
                                  </span>
                                )}
                                <span className="text-[8px] font-black uppercase px-2 py-1 bg-white border border-slate-200 text-slate-500">
                                  {formatarTipoValidacao(
                                    solicitacao.tipo_validacao,
                                  )}
                                </span>
                              </div>
                            </div>

                            {ehMinhaSolicitacao ? (
                              <button
                                onClick={() =>
                                  cancelarSolicitacaoTroca(solicitacao.id)
                                }
                                className="px-3 py-2 bg-white text-black text-[8px] font-black uppercase italic border border-black"
                              >
                                Cancelar
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  aceitarSolicitacaoTroca(solicitacao)
                                }
                                className="px-3 py-2 bg-black text-[#7cfc00] text-[8px] font-black uppercase italic border border-black flex items-center gap-2"
                              >
                                <Check size={12} />
                                Aceitar troca
                              </button>
                            )}
                          </div>

                          {solicitacao.observacao && (
                            <p className="mt-3 text-[10px] text-slate-500">
                              {solicitacao.observacao}
                            </p>
                          )}

                          <div className="mt-3 text-[8px] font-black uppercase italic text-slate-400">
                            Quedas do solicitante:{" "}
                            {solicitacao.quedas_jogadas_solicitante}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4">
                  <button
                    onClick={resetModalTroca}
                    className="w-full bg-white border-2 border-black p-3 font-black uppercase text-[10px] italic"
                  >
                    FECHAR
                  </button>
                </div>
              </div>
            </div>

            {campConfig?.exigir_aprovacao_organizacao_troca_grupo && (
              <div className="border-t border-slate-200 bg-amber-50 px-5 py-3 flex items-center gap-2 text-[9px] font-black uppercase italic text-amber-700">
                <Shield size={13} />
                Este campeonato exige aprovação da organização para concluir a
                troca.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
