"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Gamepad2,
  ListChecks,
  Loader2,
  Lock,
  MailPlus,
  CalendarDays,
  Edit3,
  GitBranch,
  Send,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCampeonatoHref } from "@/app/campeonatos/utils/getCampeonatoHref";
import PlayerCard from "@/app/components/PlayerCard";

type Campeonato = {
  id: string;
  nome: string;
  slug: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: string | null;
  tipo: string | null;
  tipo_campeonato: string | null;
  formato: string | null;
  plataforma: string | null;
  vagas: number | null;
  quantidade_equipes: number | null;
  valor_vaga: number | null;
  valor_premiacao: number | null;
  data_inicio: string | null;
  data_abertura_inscricoes: string | null;
  data_encerramento_inscricoes: string | null;
  jogadores_por_equipe: number | null;
  reservas_permitidos: number | null;
  troca_jogadores: string | null;
  checkin_obrigatorio: boolean | null;
};

type Equipe = {
  id: string;
  nome: string;
  tag: string | null;
  logo_url: string | null;
  criado_por: string | null;
};

type CampeonatoEquipe = {
  id: string;
  campeonato_id: string;
  equipe_id: string | null;
  line_id: string | null;
  numero_vaga: number | null;
  nome_exibicao: string | null;
  status: string | null;
  status_pagamento: string | null;
  grupo_id: string | null;
};

type LineMobile = {
  id: string;
  nome: string;
  tipo: string | null;
  equipe_id: string | null;
  ativa: boolean | null;
  simbolo?: string | null;
};

type PerfilJogo = {
  id: string;
  user_id: string | null;
  equipe_id: string | null;
  nick?: string | null;
  nome?: string | null;
  foto_capa?: string | null;
  uid_jogo?: string | null;
  plataforma?: string | null;
  funcao?: string | null;
  ativo?: boolean | null;
  tier?: string | null;
  ranking_tier?: string | null;
  tier_atual?: string | null;
  overall_tier?: string | null;
};

type JogadorAvulsoCampeonato = {
  id: string;
  campeonato_id: string;
  equipe_id: string | null;
  equipe_avulsa_id: string | null;
  nick: string;
  uid_jogo: string;
  funcao?: string | null;
  foto_url?: string | null;
};

type JogadorCampeonato = {
  id: string;
  campeonato_id: string;
  equipe_id: string | null;
  campeonato_equipe_id?: string | null;
  perfil_jogo_id: string | null;
  jogador_avulso_id?: string | null;
  status: string | null;
  nick_snapshot?: string | null;
  uid_jogo_snapshot?: string | null;
};

type JogadorEquipe = JogadorCampeonato & {
  perfil?: PerfilJogo | null;
  avulso?: JogadorAvulsoCampeonato | null;
};

type JogadorStats = {
  partidas: number;
  abates: number;
  posicaoMvp: number | null;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatarData(valor?: string | null) {
  if (!valor) return "Não definido";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Não definido";
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNomePerfil(perfil?: PerfilJogo | null, fallback?: string | null) {
  return perfil?.nick || perfil?.nome || fallback || "Jogador";
}

function getUidPerfil(perfil?: PerfilJogo | null, fallback?: string | null) {
  return perfil?.uid_jogo || fallback || "-";
}

function getNomeJogador(jogador?: JogadorEquipe | null) {
  return getNomePerfil(
    jogador?.perfil,
    jogador?.nick_snapshot || jogador?.avulso?.nick || null,
  );
}

function getUidJogador(jogador?: JogadorEquipe | null) {
  return getUidPerfil(
    jogador?.perfil,
    jogador?.uid_jogo_snapshot || jogador?.avulso?.uid_jogo || null,
  );
}

function getFotoJogador(jogador?: JogadorEquipe | null) {
  return jogador?.perfil?.foto_capa || jogador?.avulso?.foto_url || null;
}

function inscricoesAbertas(campeonato: Campeonato | null) {
  if (!campeonato) return false;
  const agora = Date.now();
  const abertura = campeonato.data_abertura_inscricoes
    ? new Date(campeonato.data_abertura_inscricoes).getTime()
    : null;
  const encerramento = campeonato.data_encerramento_inscricoes
    ? new Date(campeonato.data_encerramento_inscricoes).getTime()
    : null;

  if (abertura && agora < abertura) return false;
  if (encerramento && agora > encerramento) return false;
  return (
    String(campeonato.status || "")
      .toLowerCase()
      .includes("inscri") ||
    String(campeonato.status || "")
      .toLowerCase()
      .includes("abert") ||
    !campeonato.status
  );
}

function getHrefCampeonatoSeguro(campeonato?: Campeonato | null) {
  if (!campeonato?.id) return "/campeonatos";
  return getCampeonatoHref(
    campeonato.id,
    campeonato.tipo || campeonato.tipo_campeonato || campeonato.formato || null,
  );
}

async function validarAlteracaoEscala(
  campeonatoId: string,
  tipo: "adicionar" | "trocar" | "remover",
) {
  const { data, error } = await supabase.rpc(
    "fn_pode_alterar_escala_campeonato",
    {
      p_campeonato_id: campeonatoId,
      p_tipo: tipo,
    },
  );

  if (error) throw error;
  if (data === false) {
    throw new Error(
      "Alterações de jogadores estão bloqueadas neste campeonato.",
    );
  }
}

function Logo({ url, nome }: { url?: string | null; nome: string }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-100 text-[10px] font-black text-slate-500">
      {url ? (
        <img src={url} alt={nome} className="h-full w-full object-cover" />
      ) : (
        nome.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

export default function EscalaCampeonatoPage() {
  const params = useParams<{ campeonatoId: string }>();
  const campeonatoParam = String(params?.campeonatoId || "");

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [campeonato, setCampeonato] = useState<Campeonato | null>(null);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [inscricoesEquipe, setInscricoesEquipe] = useState<CampeonatoEquipe[]>(
    [],
  );
  const [jogadoresPorEquipe, setJogadoresPorEquipe] = useState<
    Record<string, JogadorEquipe[]>
  >({});
  const [elencoPorEquipe, setElencoPorEquipe] = useState<
    Record<string, PerfilJogo[]>
  >({});
  const [linesPorEquipe, setLinesPorEquipe] = useState<Record<string, LineMobile[]>>({});
  const [perfilJogo, setPerfilJogo] = useState<PerfilJogo | null>(null);
  const [jogadorNoCampeonato, setJogadorNoCampeonato] =
    useState<JogadorCampeonato | null>(null);
  const [equipeDoJogador, setEquipeDoJogador] = useState<Equipe | null>(null);
  const [killsJogador, setKillsJogador] = useState(0);
  const [partidasJogador, setPartidasJogador] = useState(0);
  const [posicaoMvp, setPosicaoMvp] = useState<number | null>(null);
  const [tipoAcesso, setTipoAcesso] = useState<"jogador" | "lider" | "manager" | null>(null);
  const [aba, setAba] = useState<"escala" | "equipe" | "jogador">("equipe");
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState<string | null>(null);
  const [vagaAtivaPorEquipe, setVagaAtivaPorEquipe] = useState<
    Record<string, string>
  >({});
  const [erro, setErro] = useState<string | null>(null);

  async function buscarCampeonato() {
    const ehUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        campeonatoParam,
      );
    const select =
      "id,nome,slug,logo_url,banner_url,status,tipo,tipo_campeonato,formato,plataforma,vagas,quantidade_equipes,valor_vaga,valor_premiacao,data_inicio,data_abertura_inscricoes,data_encerramento_inscricoes,jogadores_por_equipe,reservas_permitidos,troca_jogadores,checkin_obrigatorio";

    if (ehUuid) {
      const { data } = await supabase
        .from("campeonatos")
        .select(select)
        .eq("id", campeonatoParam)
        .maybeSingle();
      if (data) return data as Campeonato;
    }

    const { data } = await supabase
      .from("campeonatos")
      .select(select)
      .eq("slug", campeonatoParam)
      .maybeSingle();
    return (data as Campeonato | null) || null;
  }

  async function carregar() {
    setLoading(true);
    setErro(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || null;
      setUserId(uid);

      const camp = await buscarCampeonato();
      setCampeonato(camp);

      if (!camp || !uid) {
        setEquipes([]);
        setInscricoesEquipe([]);
        setJogadoresPorEquipe({});
        setElencoPorEquipe({});
        setLinesPorEquipe({});
        setPerfilJogo(null);
        setJogadorNoCampeonato(null);
        setEquipeDoJogador(null);
        setKillsJogador(0);
        setPartidasJogador(0);
        setPosicaoMvp(null);
        return;
      }

      const [
        { data: equipesCriadas },
        { data: vinculosEquipe },
        { data: perfis },
      ] = await Promise.all([
        supabase
          .from("equipes")
          .select("id,nome,tag,logo_url,criado_por")
          .eq("criado_por", uid),
        supabase
          .from("membros_equipe")
          .select(
            "equipe_id, equipes:equipe_id(id,nome,tag,logo_url,criado_por)",
          )
          .eq("user_id", uid),
        supabase
          .from("perfis_jogo")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      const mapaEquipes = new Map<string, Equipe>();
      ((equipesCriadas || []) as Equipe[]).forEach((equipe) =>
        mapaEquipes.set(equipe.id, equipe),
      );
      ((vinculosEquipe || []) as any[]).forEach((item) => {
        const equipe = Array.isArray(item.equipes)
          ? item.equipes[0]
          : item.equipes;
        if (equipe?.id) mapaEquipes.set(equipe.id, equipe);
      });

      const minhasEquipes = Array.from(mapaEquipes.values());
      setEquipes(minhasEquipes);

      const perfil = ((perfis || []) as PerfilJogo[])[0] || null;
      setPerfilJogo(perfil);

      if (minhasEquipes.length) {
        const equipeIds = minhasEquipes.map((equipe) => equipe.id);
        const { data: inscricoes } = await supabase
          .from("campeonato_equipes")
          .select(
            "id,campeonato_id,equipe_id,line_id,numero_vaga,nome_exibicao,status,status_pagamento,grupo_id",
          )
          .eq("campeonato_id", camp.id)
          .in("equipe_id", equipeIds)
          .order("numero_vaga", { ascending: true });

        const inscricoesLista = (inscricoes || []) as CampeonatoEquipe[];
        setInscricoesEquipe(inscricoesLista);

        const { data: elencoData } = await supabase
          .from("perfis_jogo")
          .select("*")
          .in("equipe_id", equipeIds);

        const elencoAgrupado: Record<string, PerfilJogo[]> = {};
        ((elencoData || []) as PerfilJogo[]).forEach((perfil) => {
          if (!perfil.equipe_id) return;
          if (!elencoAgrupado[perfil.equipe_id])
            elencoAgrupado[perfil.equipe_id] = [];
          elencoAgrupado[perfil.equipe_id].push(perfil);
        });
        setElencoPorEquipe(elencoAgrupado);

        const { data: linesData } = await supabase
          .from("lines")
          .select("id,nome,tipo,equipe_id,ativa,simbolo")
          .in("equipe_id", equipeIds)
          .eq("ativa", true)
          .order("nome", { ascending: true });

        const linesAgrupadas: Record<string, LineMobile[]> = {};
        ((linesData || []) as LineMobile[]).forEach((line) => {
          if (!line.equipe_id) return;
          if (!linesAgrupadas[line.equipe_id]) linesAgrupadas[line.equipe_id] = [];
          linesAgrupadas[line.equipe_id].push(line);
        });
        setLinesPorEquipe(linesAgrupadas);

        if (inscricoesLista.length) {
          const campeonatoEquipeIds = inscricoesLista.map((item) => item.id);
          const { data: jogadores } = await supabase
            .from("jogadores_campeonato")
            .select("*")
            .eq("campeonato_id", camp.id)
            .in("campeonato_equipe_id", campeonatoEquipeIds);

          const jogadoresLista = (jogadores || []) as JogadorEquipe[];
          const perfilIds = jogadoresLista
            .map((j) => j.perfil_jogo_id)
            .filter(Boolean) as string[];
          const avulsoIds = jogadoresLista
            .map((j) => j.jogador_avulso_id)
            .filter(Boolean) as string[];
          let perfisMapa = new Map<string, PerfilJogo>();
          let avulsosMapa = new Map<string, JogadorAvulsoCampeonato>();

          if (perfilIds.length) {
            const { data: perfisJogadores } = await supabase
              .from("perfis_jogo")
              .select("*")
              .in("id", perfilIds);
            perfisMapa = new Map(
              ((perfisJogadores || []) as PerfilJogo[]).map((p) => [p.id, p]),
            );
          }

          if (avulsoIds.length) {
            const { data: avulsosJogadores } = await supabase
              .from("jogadores_avulsos_campeonato")
              .select("*")
              .in("id", avulsoIds);
            avulsosMapa = new Map(
              ((avulsosJogadores || []) as JogadorAvulsoCampeonato[]).map(
                (a) => [a.id, a],
              ),
            );
          }

          const agrupado: Record<string, JogadorEquipe[]> = {};
          jogadoresLista.forEach((jogador) => {
            const chave = jogador.campeonato_equipe_id || "sem-vaga";
            if (!agrupado[chave]) agrupado[chave] = [];
            agrupado[chave].push({
              ...jogador,
              perfil: jogador.perfil_jogo_id
                ? perfisMapa.get(jogador.perfil_jogo_id) || null
                : null,
              avulso: jogador.jogador_avulso_id
                ? avulsosMapa.get(jogador.jogador_avulso_id) || null
                : null,
            });
          });
          setJogadoresPorEquipe(agrupado);
        } else {
          setJogadoresPorEquipe({});
        }
      } else {
        setInscricoesEquipe([]);
        setJogadoresPorEquipe({});
        setElencoPorEquipe({});
      }

      if (perfil?.id) {
        const { data: jogadorCamp } = await supabase
          .from("jogadores_campeonato")
          .select("*")
          .eq("campeonato_id", camp.id)
          .eq("perfil_jogo_id", perfil.id)
          .neq("status", "removido")
          .maybeSingle();

        const jogadorAtual = (jogadorCamp as JogadorCampeonato | null) || null;
        setJogadorNoCampeonato(jogadorAtual);

        if (jogadorAtual?.equipe_id) {
          const { data: equipe } = await supabase
            .from("equipes")
            .select("id,nome,tag,logo_url,criado_por")
            .eq("id", jogadorAtual.equipe_id)
            .maybeSingle();
          setEquipeDoJogador((equipe as Equipe | null) || null);
        } else {
          setEquipeDoJogador(null);
        }

        const { data: resultados } = await supabase
          .from("resultados_mvp")
          .select("perfil_jogo_id,abates,jogo_id")
          .eq("campeonato_id", camp.id);
        const mapaKills = new Map<
          string,
          { kills: number; jogos: Set<string> }
        >();

        ((resultados || []) as any[]).forEach((row) => {
          if (!row.perfil_jogo_id) return;
          const atual = mapaKills.get(row.perfil_jogo_id) || {
            kills: 0,
            jogos: new Set<string>(),
          };
          atual.kills += Number(row.abates || 0);
          if (row.jogo_id) atual.jogos.add(row.jogo_id);
          mapaKills.set(row.perfil_jogo_id, atual);
        });

        const stats = mapaKills.get(perfil.id) || {
          kills: 0,
          jogos: new Set<string>(),
        };
        setKillsJogador(stats.kills);
        setPartidasJogador(stats.jogos.size);

        const ranking = Array.from(mapaKills.entries()).sort(
          (a, b) => b[1].kills - a[1].kills,
        );
        const pos = ranking.findIndex(([perfilId]) => perfilId === perfil.id);
        setPosicaoMvp(pos >= 0 ? pos + 1 : null);
      } else {
        setJogadorNoCampeonato(null);
        setEquipeDoJogador(null);
        setKillsJogador(0);
        setPartidasJogador(0);
        setPosicaoMvp(null);
      }
    } catch (err: any) {
      setErro(err?.message || "Não foi possível carregar o link mobile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campeonatoParam]);


  const mostrarAbaJogador = Boolean(perfilJogo || jogadorNoCampeonato || equipeDoJogador);

  const agendaJogador = useMemo(() => {
    if (!jogadorNoCampeonato?.campeonato_equipe_id) return [];
    return inscricoesEquipe
      .filter((vaga) => vaga.id === jogadorNoCampeonato.campeonato_equipe_id)
      .map((vaga) => ({
        vaga,
        equipe: equipes.find((eq) => eq.id === vaga.equipe_id) || equipeDoJogador,
      }));
  }, [jogadorNoCampeonato, inscricoesEquipe, equipes, equipeDoJogador]);

  const equipePrincipalDoJogador =
    equipeDoJogador || equipes.find((eq) => eq.id === perfilJogo?.equipe_id) || null;

  const equipesVisiveis = useMemo(() => {
    if (!tipoAcesso) return [];
    if (tipoAcesso === "jogador") return equipePrincipalDoJogador ? [equipePrincipalDoJogador] : [];
    return equipeSelecionadaId
      ? equipes.filter((equipe) => equipe.id === equipeSelecionadaId)
      : equipes;
  }, [tipoAcesso, equipeSelecionadaId, equipes, equipePrincipalDoJogador]);

  const limiteJogadores = useMemo(
    () =>
      Number(campeonato?.jogadores_por_equipe || 0) +
      Number(campeonato?.reservas_permitidos || 0),
    [campeonato],
  );
  const abertas = inscricoesAbertas(campeonato);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950 [color-scheme:light]">
        <div className="border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          <Loader2 className="mr-2 inline animate-spin" size={16} /> Carregando
          link
        </div>
      </main>
    );
  }

  if (!campeonato) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950 [color-scheme:light]">
        <div className="w-full max-w-sm border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-lg font-black uppercase tracking-[-0.03em]">
            Campeonato não encontrado
          </h1>
          <Link
            href={`/escala/${campeonato?.id || campeonatoParam}`}
            className="mt-4 inline-flex h-11 items-center justify-center border border-blue-600 bg-blue-600 px-5 text-xs font-black uppercase text-white"
          >
            Voltar ao painel
          </Link>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-50 px-2 py-2 text-slate-950 [color-scheme:light]">
      <div className="mx-auto max-w-md pb-5">
        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-blue-500 bg-gradient-to-r from-blue-600 to-blue-700 p-2 text-white">
            <div className="flex gap-2">
              <Logo url={campeonato.logo_url} nome={campeonato.nome} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                  Inscrição mobile
                </p>
                <h1 className="mt-0.5 truncate text-lg font-black uppercase tracking-[-0.05em]">
                  {campeonato.nome}
                </h1>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-black uppercase">
                    {campeonato.tipo_campeonato ||
                      campeonato.tipo ||
                      "Campeonato"}
                  </span>
                  <span className="border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-black uppercase">
                    {campeonato.plataforma || "Plataforma"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 border-b border-slate-200 bg-white">
            <Info label="Status" value={abertas ? "Abertas" : "Fechadas"} />
            <Info label="Início" value={formatarData(campeonato.data_inicio)} />
            <Info
              label="Vagas"
              value={`${inscricoesEquipe.length}/${campeonato.vagas || campeonato.quantidade_equipes || "-"}`}
            />
            <Info
              label="Taxa"
              value={moeda.format(Number(campeonato.valor_vaga || 0))}
            />
          </div>
        </section>

        {!userId ? (
          <section className="mt-3 border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center border border-slate-200 bg-slate-50 text-blue-600">
                <Lock size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-[-0.04em]">
                  Acesse sua conta
                </h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Use o login, cadastro e recuperação que já existem no site.
                  Depois volte por este link para escolher equipe ou jogador.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <Link
                href={`/escala/${campeonato?.id || campeonatoParam}`}
                className="flex h-12 items-center justify-center border border-blue-600 bg-blue-600 text-xs font-black uppercase text-white"
              >
                Login
              </Link>
              <Link
                href={`/escala/${campeonato?.id || campeonatoParam}`}
                className="flex h-12 items-center justify-center border border-slate-300 bg-white text-xs font-black uppercase text-slate-800"
              >
                Criar conta
              </Link>
              <Link
                href={`/escala/${campeonato?.id || campeonatoParam}`}
                className="flex h-12 items-center justify-center border border-slate-300 bg-white text-xs font-black uppercase text-slate-800"
              >
                Recuperar senha
              </Link>
            </div>
          </section>
        ) : (
          <>
            {!tipoAcesso ? (
              <section className="mt-2 space-y-2">
                <div className="border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                    Acesso beta
                  </p>
                  <h2 className="mt-1 text-lg font-black uppercase tracking-[-0.04em] text-slate-950">
                    Como você quer entrar?
                  </h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Escolha seu perfil para abrir apenas as ferramentas necessárias deste campeonato.
                  </p>

                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoAcesso("jogador");
                        setAba("jogador");
                      }}
                      className="flex h-14 items-center justify-between border border-slate-200 bg-white px-3 text-left"
                    >
                      <span>
                        <strong className="block text-xs font-black uppercase text-slate-950">Jogador</strong>
                        <span className="text-[10px] font-bold text-slate-500">Perfil, convites, pedidos e agenda</span>
                      </span>
                      <Gamepad2 size={18} className="text-blue-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTipoAcesso("lider");
                        setAba("equipe");
                      }}
                      className="flex h-14 items-center justify-between border border-blue-600 bg-blue-600 px-3 text-left text-white"
                    >
                      <span>
                        <strong className="block text-xs font-black uppercase">Líder</strong>
                        <span className="text-[10px] font-bold text-blue-100">Gerenciar equipe, line e escalação</span>
                      </span>
                      <Users size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTipoAcesso("manager");
                        setAba("equipe");
                      }}
                      className="flex h-14 items-center justify-between border border-slate-200 bg-slate-50 px-3 text-left"
                    >
                      <span>
                        <strong className="block text-xs font-black uppercase text-slate-950">Manager</strong>
                        <span className="text-[10px] font-bold text-slate-500">Controlar várias equipes</span>
                      </span>
                      <ShieldCheck size={18} className="text-blue-600" />
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <>
                <section className="mt-2 grid grid-cols-2 gap-1">
                  {tipoAcesso !== "jogador" ? (
                    <>
                      <button
                        onClick={() => setAba("escala")}
                        className={`flex h-11 items-center justify-center gap-2 border px-2 text-[9px] font-black uppercase ${aba === "escala" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800"}`}
                      >
                        <ListChecks size={14} />
                        Escalação
                      </button>
                      <button
                        onClick={() => setAba("equipe")}
                        className={`flex h-11 items-center justify-center gap-2 border px-2 text-[9px] font-black uppercase ${aba === "equipe" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800"}`}
                      >
                        <Users size={14} />
                        Equipe
                      </button>
                    </>
                  ) : null}

                  {tipoAcesso === "jogador" || mostrarAbaJogador ? (
                    <button
                      onClick={() => setAba("jogador")}
                      className={`flex h-11 items-center justify-center gap-2 border px-2 text-[9px] font-black uppercase ${tipoAcesso !== "jogador" ? "col-span-2" : "col-span-2"} ${aba === "jogador" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-800"}`}
                    >
                      <Gamepad2 size={14} />
                      Jogador
                    </button>
                  ) : null}
                </section>

                <button
                  type="button"
                  onClick={() => {
                    setTipoAcesso(null);
                    setEquipeSelecionadaId(null);
                    setAba("equipe");
                  }}
                  className="mt-2 flex h-9 w-full items-center justify-center gap-2 border border-slate-200 bg-white text-[9px] font-black uppercase text-slate-700"
                >
                  <ArrowLeft size={13} /> Trocar perfil de acesso
                </button>

                {(tipoAcesso === "lider" || tipoAcesso === "manager") && equipes.length > 1 ? (
                  <section className="mt-2 border border-slate-200 bg-white p-2">
                    <p className="mb-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Selecionar equipe
                    </p>
                    <select
                      value={equipeSelecionadaId || ""}
                      onChange={(event) => setEquipeSelecionadaId(event.target.value || null)}
                      className="h-10 w-full border border-slate-200 bg-white px-2 text-xs font-black uppercase outline-none"
                    >
                      <option value="">Todas as equipes</option>
                      {equipes.map((equipe) => (
                        <option key={equipe.id} value={equipe.id}>
                          {equipe.tag ? `[${equipe.tag}] ` : ""}{equipe.nome}
                        </option>
                      ))}
                    </select>
                  </section>
                ) : null}

{aba === "escala" ? (
              <section className="mt-2 space-y-2">
                {equipes.length ? null : (
                  <CardVazio
                    titulo="Você ainda não tem equipe"
                    texto="Crie sua organização usando o formulário original do site."
                    href={`/escala/${campeonato?.id || campeonatoParam}`}
                    label="Criar equipe"
                  />
                )}

                {equipesVisiveis.map((equipe) => {
                  const inscricoes = inscricoesEquipe.filter(
                    (item) => item.equipe_id === equipe.id,
                  );
                  const inscrita = inscricoes.length > 0;

                  if (!inscrita) return null;

                  return (
                    <div
                      key={equipe.id}
                      className="border border-slate-200 bg-white p-2 shadow-sm"
                    >
                      <div className="mb-1.5 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                        <Logo url={equipe.logo_url} nome={equipe.nome} />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-black uppercase tracking-[-0.03em]">
                            {equipe.tag ? `[${equipe.tag}] ` : ""}
                            {equipe.nome}
                          </h3>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Escalação
                          </p>
                        </div>
                      </div>

                      {(() => {
                        const vagaAtivaId =
                          vagaAtivaPorEquipe[equipe.id] || inscricoes[0]?.id;
                        const inscricaoAtiva =
                          inscricoes.find((item) => item.id === vagaAtivaId) ||
                          inscricoes[0];

                        return (
                          <div className="space-y-2">
                            {inscricoes.length > 1 ? (
                              <div className="flex gap-1 overflow-x-auto border border-slate-200 bg-slate-50 p-1">
                                {inscricoes.map((inscricao) => {
                                  const ativa =
                                    inscricao.id === inscricaoAtiva?.id;
                                  const usados = (
                                    jogadoresPorEquipe[inscricao.id] || []
                                  ).filter(
                                    (jogador) =>
                                      jogador.status === "ativo",
                                  ).length;

                                  return (
                                    <button
                                      key={inscricao.id}
                                      type="button"
                                      onClick={() =>
                                        setVagaAtivaPorEquipe((atual) => ({
                                          ...atual,
                                          [equipe.id]: inscricao.id,
                                        }))
                                      }
                                      className={[
                                        "shrink-0 border px-2 py-1 text-left uppercase",
                                        ativa
                                          ? "border-blue-600 bg-blue-600 text-white"
                                          : "border-slate-200 bg-white text-slate-700",
                                      ].join(" ")}
                                    >
                                      <p className="max-w-[110px] truncate text-[9px] font-black tracking-[0.12em]">
                                        {inscricao.nome_exibicao ||
                                          `Vaga ${inscricao.numero_vaga || ""}`}
                                      </p>
                                      <p
                                        className={[
                                          "mt-0.5 text-[8px] font-black",
                                          ativa
                                            ? "text-blue-100"
                                            : "text-blue-600",
                                        ].join(" ")}
                                      >
                                        {usados}/{limiteJogadores || 8} cards
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}

                            {inscricaoAtiva ? (
                              <div className="border border-slate-200 bg-slate-50">
                                <div className="flex items-center justify-between border-b border-slate-200 px-2 py-1">
                                  <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                                    {inscricaoAtiva.nome_exibicao ||
                                      `Vaga ${inscricaoAtiva.numero_vaga || ""}`}
                                  </p>
                                  <span className="text-[9px] font-black uppercase text-blue-600">
                                    Line vinculada
                                  </span>
                                </div>
                                <EscalacaoCards
                                  campeonato={campeonato}
                                  inscricoes={[inscricaoAtiva]}
                                  jogadoresPorEquipe={jogadoresPorEquipe}
                                  limiteJogadores={limiteJogadores || 8}
                                  elenco={elencoPorEquipe[equipe.id] || []}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}

                {equipesVisiveis.length &&
                !equipesVisiveis.some((equipe) =>
                  inscricoesEquipe.some((item) => item.equipe_id === equipe.id),
                ) ? (
                  <CardVazio
                    titulo="Nenhuma equipe com vaga"
                    texto="Suas equipes ainda não compraram ou receberam vaga neste campeonato."
                    href={getHrefCampeonatoSeguro(campeonato)}
                    label="Ver campeonato"
                  />
                ) : null}
              </section>
            ) : null}

            {aba === "equipe" ? (
              <section className="mt-2 space-y-2">
                {!equipesVisiveis.length ? (
                  <CardVazio
                    titulo="Você ainda não tem equipe"
                    texto="Crie sua organização usando o formulário original do site."
                    href={`/escala/${campeonato?.id || campeonatoParam}`}
                    label="Criar equipe"
                  />
                ) : null}

                {equipesVisiveis.map((equipe) => {
                  const inscricoes = inscricoesEquipe.filter(
                    (item) => item.equipe_id === equipe.id,
                  );
                  const inscrita = inscricoes.length > 0;

                  return (
                    <div
                      key={equipe.id}
                      className="border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex items-center gap-2 p-2">
                        <Logo url={equipe.logo_url} nome={equipe.nome} />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-black uppercase tracking-[-0.03em]">
                            {equipe.tag ? `[${equipe.tag}] ` : ""}
                            {equipe.nome}
                          </h3>
                          <p className="mt-0.5 truncate text-[9px] font-black uppercase text-slate-500">
                            {inscrita
                              ? "Inscrita neste campeonato"
                              : "Sem vaga neste campeonato"}
                          </p>
                        </div>
                        {inscrita ? (
                          <CheckCircle2
                            className="text-emerald-500"
                            size={18}
                          />
                        ) : null}
                      </div>
                      <div className="border-t border-slate-100 p-2">
                        <div className="mb-2 grid grid-cols-2 gap-1.5">
                          <button type="button" onClick={() => setAba("equipe")}
                            className="flex h-10 items-center justify-center gap-1 border border-blue-600 bg-blue-600 text-[10px] font-black uppercase text-white"
                          ><GitBranch size={14} /> Montar lines</button>
                          <button
                            onClick={() => setAba("escala")}
                            className="flex h-10 items-center justify-center gap-1 border border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-800"
                          >
                            <ListChecks size={14} /> Escalar campeonato
                          </button>
                          <button type="button" onClick={() => setAba("equipe")}
                            className="flex h-10 items-center justify-center gap-1 border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-800"
                          ><Users size={14} /> Atletas</button>
                          <button type="button" onClick={() => setAba("equipe")}
                            className="flex h-10 items-center justify-center gap-1 border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-800"
                          ><Send size={14} /> Convites</button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <InfoMini
                            label="Lines"
                            value={String((linesPorEquipe[equipe.id] || []).length)}
                          />
                          <InfoMini
                            label="Elenco"
                            value={String((elencoPorEquipe[equipe.id] || []).length)}
                          />
                        </div>

                        {(linesPorEquipe[equipe.id] || []).length ? (
                          <div className="mt-2 space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Lines da equipe
                            </p>
                            {(linesPorEquipe[equipe.id] || []).slice(0, 4).map((line) => (
                              <div
                                key={line.id}
                                className="flex h-8 items-center justify-between border border-slate-200 bg-slate-50 px-2"
                              >
                                <span className="truncate text-[10px] font-black uppercase text-slate-800">
                                  {line.simbolo ? `${line.simbolo} ` : ""}{line.nome}
                                </span>
                                <span className="text-[8px] font-black uppercase text-blue-600">
                                  LINE ATIVA
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 border border-dashed border-slate-200 bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-500">
                            Nenhuma line ativa encontrada.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            ) : null}

            {aba === "jogador" ? (
              <section className="mt-2 space-y-2">
                {!perfilJogo ? (
                  <CardVazio
                    titulo="Você ainda não tem conta de jogo"
                    texto="Crie seu perfil de jogador usando o cadastro original do site."
                    href={`/escala/${campeonato?.id || campeonatoParam}`}
                    label="Criar perfil de jogo"
                  />
                ) : (
                  <div className="border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center border border-slate-200 bg-slate-50 text-blue-600">
                        <UserRound size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                          Perfil de jogo
                        </p>
                        <h2 className="truncate text-lg font-black uppercase tracking-[-0.04em]">
                          {getNomePerfil(perfilJogo)}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-500">
                          UID {getUidPerfil(perfilJogo)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      <InfoBox
                        label="Status"
                        value={
                          jogadorNoCampeonato ? "Inscrito" : "Não inscrito"
                        }
                      />
                      <InfoBox
                        label="Equipe"
                        value={equipePrincipalDoJogador?.nome || "-"}
                      />
                      <InfoBox label="Abates" value={String(killsJogador)} />
                      <InfoBox
                        label="MVP"
                        value={posicaoMvp ? `#${posicaoMvp}` : "-"}
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <Link
                        href={`/escala/${campeonato?.id || campeonatoParam}`}
                        className="flex h-10 items-center justify-center gap-1 border border-blue-600 bg-blue-600 text-[10px] font-black uppercase text-white"
                      >
                        <Edit3 size={14} /> Editar perfil
                      </Link>
                      <Link
                        href={`/escala/${campeonato?.id || campeonatoParam}`}
                        className="flex h-10 items-center justify-center gap-1 border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-800"
                      >
                        <MailPlus size={14} /> Convites
                      </Link>
                    </div>

                    <div className="mt-3 border border-slate-200 bg-slate-50 p-2">
                      <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-blue-600">
                        <CalendarDays size={13} /> Agenda do jogador
                      </div>
                      {agendaJogador.length ? (
                        <div className="space-y-1">
                          {agendaJogador.map((item) => (
                            <div
                              key={item.vaga.id}
                              className="flex items-center justify-between border border-slate-200 bg-white px-2 py-1.5"
                            >
                              <span className="truncate text-[10px] font-black uppercase text-slate-900">
                                {item.equipe?.nome || item.vaga.nome_exibicao || "Equipe"}
                              </span>
                              <span className="text-[8px] font-black uppercase text-slate-500">
                                {formatarData(campeonato?.data_inicio)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 bg-white p-2 text-center text-[10px] font-bold text-slate-500">
                          Nenhuma agenda encontrada para este perfil neste campeonato.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            ) : null}
              </>
            )}
          </>
        )}
        {erro ? (
          <div className="mt-3 border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
            {erro}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function normalizarTier(valor?: any) {
  const tier = String(valor || "")
    .trim()
    .toUpperCase();
  if (["SS", "S", "A", "B", "C", "D", "E"].includes(tier)) return tier;
  return "C";
}

function getTierJogador(jogador?: JogadorEquipe | null) {
  const perfilAny = (jogador?.perfil || {}) as any;
  const jogadorAny = (jogador || {}) as any;
  return normalizarTier(
    perfilAny.tier ||
      perfilAny.ranking_tier ||
      perfilAny.tier_atual ||
      perfilAny.overall_tier ||
      jogadorAny.tier ||
      jogadorAny.tier_snapshot,
  );
}

function tierPerfil(perfil?: PerfilJogo | null) {
  return normalizarTier(
    perfil?.tier ||
      perfil?.ranking_tier ||
      perfil?.tier_atual ||
      perfil?.overall_tier,
  );
}

function EscalacaoCards({
  campeonato,
  inscricoes,
  jogadoresPorEquipe,
  limiteJogadores,
  elenco,
}: {
  campeonato: Campeonato;
  inscricoes: CampeonatoEquipe[];
  jogadoresPorEquipe: Record<string, JogadorEquipe[]>;
  limiteJogadores: number;
  elenco: PerfilJogo[];
}) {
  const vagaPrincipal = inscricoes[0];
  const jogadoresUnicosMap = new Map<string, JogadorEquipe>();

  inscricoes.forEach((inscricao) => {
    (jogadoresPorEquipe[inscricao.id] || []).forEach((jogador) => {
      jogadoresUnicosMap.set(jogador.id, jogador);
    });
  });

  const jogadores = Array.from(jogadoresUnicosMap.values()).filter(
    (jogador) => jogador.status === "ativo",
  );

  const totalSlots = Math.max(limiteJogadores || 8, 1);
  const slots = Array.from({ length: totalSlots }).map(
    (_, index) => jogadores[index] || null,
  );
  const jogadoresExcedentes = jogadores.slice(totalSlots);

  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [infoAberta, setInfoAberta] = useState<JogadorEquipe | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [pickerAberto, setPickerAberto] = useState(false);
  const [trocarJogador, setTrocarJogador] = useState<JogadorEquipe | null>(
    null,
  );
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [candidatos, setCandidatos] = useState<PerfilJogo[]>([]);
  const [processando, setProcessando] = useState<string | null>(null);
  const [statsJogador, setStatsJogador] = useState<JogadorStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const idsEscaladosKey = jogadores
    .map((j) => j.perfil_jogo_id)
    .filter(Boolean)
    .join("|");

  const idsEscalados = useMemo(
    () => new Set(idsEscaladosKey ? idsEscaladosKey.split("|") : []),
    [idsEscaladosKey],
  );

  const candidatosElenco = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (elenco || []).filter((perfil) => {
      if (!perfil?.id || idsEscalados.has(perfil.id)) return false;
      if (!termo) return true;
      return (
        String(perfil.nick || "")
          .toLowerCase()
          .includes(termo) ||
        String(perfil.uid_jogo || "")
          .toLowerCase()
          .includes(termo)
      );
    });
  }, [elenco, busca, idsEscaladosKey]);

  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) {
      setCandidatos((atuais) => (atuais.length ? [] : atuais));
      return;
    }

    const timer = setTimeout(async () => {
      const termoSeguro = termo.replace(/[,()%]/g, " ").trim();
      if (termoSeguro.length < 2) return;

      const { data, error } = await supabase
        .from("perfis_jogo")
        .select("*")
        .eq("ativo", true)
        .or(`nick.ilike.%${termoSeguro}%,uid_jogo.ilike.%${termoSeguro}%`)
        .limit(12);

      if (error) {
        console.error("Erro ao buscar jogadores:", error);
        return;
      }

      setCandidatos(
        ((data || []) as PerfilJogo[]).filter(
          (perfil) => perfil.id && !idsEscalados.has(perfil.id),
        ),
      );
    }, 250);

    return () => clearTimeout(timer);
  }, [busca, idsEscaladosKey]);

  function abrirAdicionar(jogador?: JogadorEquipe | null) {
    setMenuAberto(null);
    setInfoAberta(null);
    setStatsJogador(null);
    setTrocarJogador(jogador || null);
    setPickerAberto(true);
  }

  async function abrirInformacoesJogador(jogador: JogadorEquipe) {
    setMenuAberto(null);
    setPickerAberto(false);
    setTrocarJogador(null);
    setInfoAberta(jogador);
    setStatsJogador(null);

    if (!jogador.perfil_jogo_id) {
      setStatsJogador({ partidas: 0, abates: 0, posicaoMvp: null });
      return;
    }

    setLoadingStats(true);
    try {
      const { data, error } = await supabase
        .from("resultados_mvp")
        .select("perfil_jogo_id,abates,jogo_id")
        .eq("campeonato_id", campeonato.id);

      if (error) throw error;

      const mapa = new Map<string, { abates: number; jogos: Set<string> }>();
      ((data || []) as any[]).forEach((row) => {
        if (!row.perfil_jogo_id) return;
        const atual = mapa.get(row.perfil_jogo_id) || {
          abates: 0,
          jogos: new Set<string>(),
        };
        atual.abates += Number(row.abates || 0);
        if (row.jogo_id) atual.jogos.add(String(row.jogo_id));
        mapa.set(row.perfil_jogo_id, atual);
      });

      const stats = mapa.get(jogador.perfil_jogo_id) || {
        abates: 0,
        jogos: new Set<string>(),
      };
      const ranking = Array.from(mapa.entries()).sort(
        (a, b) => b[1].abates - a[1].abates,
      );
      const pos = ranking.findIndex(
        ([perfilId]) => perfilId === jogador.perfil_jogo_id,
      );

      setStatsJogador({
        partidas: stats.jogos.size,
        abates: stats.abates,
        posicaoMvp: pos >= 0 ? pos + 1 : null,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas do jogador:", error);
      setStatsJogador({ partidas: 0, abates: 0, posicaoMvp: null });
    } finally {
      setLoadingStats(false);
    }
  }

  async function removerJogador(jogador: JogadorEquipe, silencioso = false) {
    if (!jogador?.id || removendoId) return false;

    if (!silencioso) {
      const confirmar = window.confirm("Remover este jogador da escalação?");
      if (!confirmar) return false;
    }

    setRemovendoId(jogador.id);

    try {
      await validarAlteracaoEscala(campeonato.id, "remover");

      const { error } = await supabase
        .from("jogadores_campeonato")
        .update({ status: "removido" })
        .eq("id", jogador.id);

      if (error) throw error;

      if (vagaPrincipal?.line_id) {
        let query = supabase
          .from("lines_jogadores")
          .delete()
          .eq("line_id", vagaPrincipal.line_id);

        if (jogador.perfil_jogo_id)
          query = query.eq("perfil_jogo_id", jogador.perfil_jogo_id);
        else if (jogador.jogador_avulso_id)
          query = query.eq("jogador_avulso_id", jogador.jogador_avulso_id);
        else query = query.eq("id", "__sem_jogador__");

        const { error: lineError } = await query;
        if (lineError) throw lineError;
      }

      if (!silencioso) window.location.reload();
      return true;
    } catch (error: any) {
      alert(error?.message || "Erro ao remover jogador. Tente novamente.");
      return false;
    } finally {
      setRemovendoId(null);
    }
  }

  async function adicionarPerfil(perfil: PerfilJogo) {
    if (!vagaPrincipal?.id) return alert("Vaga do campeonato não encontrada.");
    if (!vagaPrincipal.line_id)
      return alert("Esta vaga ainda não tem line vinculada.");

    try {
      setProcessando(perfil.id);
      await validarAlteracaoEscala(
        campeonato.id,
        trocarJogador ? "trocar" : "adicionar",
      );

      if (trocarJogador) {
        const ok = await removerJogador(trocarJogador, true);
        if (!ok) return;
      }

      const { data: jogadorId, error: garantirError } = await supabase.rpc(
        "fn_garantir_jogador_campeonato_vaga",
        {
          p_campeonato_id: campeonato.id,
          p_campeonato_equipe_id: vagaPrincipal.id,
          p_perfil_jogo_id: perfil.id,
          p_jogador_avulso_id: null,
          p_criado_por: null,
        },
      );
      if (garantirError) throw garantirError;

      const tipoSlot =
        jogadores.length < Number(campeonato.jogadores_por_equipe || 4)
          ? "titular"
          : "reserva";

      const { error: ativarError } = await supabase
        .from("jogadores_campeonato")
        .update({
          status: "ativo",
          origem: "app",
          criado_automaticamente: false,
          observacoes: tipoSlot,
        })
        .eq("id", jogadorId);
      if (ativarError) throw ativarError;

      const { data: existenteLine } = await supabase
        .from("lines_jogadores")
        .select("id")
        .eq("line_id", vagaPrincipal.line_id)
        .eq("perfil_jogo_id", perfil.id)
        .maybeSingle();

      if (!existenteLine?.id) {
        const { data: ordemData } = await supabase
          .from("lines_jogadores")
          .select("ordem")
          .eq("line_id", vagaPrincipal.line_id)
          .order("ordem", { ascending: false })
          .limit(1);
        const ordem = Math.max(
          0,
          Number((ordemData || [])[0]?.ordem ?? -1) + 1,
        );

        const { error: lineError } = await supabase
          .from("lines_jogadores")
          .insert({
            line_id: vagaPrincipal.line_id,
            perfil_jogo_id: perfil.id,
            jogador_avulso_id: null,
            tipo_slot: tipoSlot,
            ordem,
          });
        if (lineError) throw lineError;
      }

      window.location.reload();
    } catch (error: any) {
      console.error("Erro ao escalar jogador:", error);
      alert(error?.message || error?.details || "Erro ao escalar jogador.");
    } finally {
      setProcessando(null);
    }
  }

  async function enviarConvite(perfil: PerfilJogo) {
    if (!vagaPrincipal?.equipe_id)
      return alert("Esta vaga não está vinculada a uma equipe.");

    try {
      setProcessando(`convite-${perfil.id}`);
      const { error } = await supabase.rpc("enviar_convite_equipe", {
        p_equipe_id: vagaPrincipal.equipe_id,
        p_perfil_jogo_id: perfil.id,
        p_mensagem: mensagem.trim() || null,
      });
      if (error) throw error;
      alert("Convite enviado para o jogador.");
      setMensagem("");
    } catch (error: any) {
      alert(error?.message || error?.details || "Erro ao enviar convite.");
    } finally {
      setProcessando(null);
    }
  }

  const candidatosBusca = candidatos.filter(
    (perfil) => !idsEscalados.has(perfil.id),
  );

  return (
    <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-2 py-1">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {jogadores.length}/{totalSlots} cards usados
        </p>
        <p className="text-[9px] font-black uppercase text-blue-600">
          Toque na carta
        </p>
      </div>

      <div
        className="grid gap-1 p-1.5"
        style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
      >
        {slots.map((jogador, index) => {
          const avulso = Boolean(
            jogador?.jogador_avulso_id || (jogador && !jogador.perfil_jogo_id),
          );
          const slotId = jogador?.id || `card-slot-${index}`;

          return (
            <div key={slotId} className="relative min-w-0">
              <PlayerCard
                name={jogador ? getNomeJogador(jogador) : ""}
                tier={jogador ? (getTierJogador(jogador) as any) : "C"}
                number={index + 1}
                variant={jogador ? (avulso ? "avulso" : "oficial") : "slot"}
                photoUrl={getFotoJogador(jogador)}
                className="!max-w-none cursor-pointer"
                onClick={() => {
                  if (!jogador) {
                    abrirAdicionar(null);
                    return;
                  }

                  abrirInformacoesJogador(jogador);
                }}
              />

              {jogador && menuAberto === jogador.id ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 border border-slate-300 bg-white text-slate-950 shadow-xl">
                  <button
                    type="button"
                    onClick={() => abrirAdicionar(jogador)}
                    className="flex h-8 w-full items-center px-2 text-left text-[9px] font-black uppercase hover:bg-slate-100"
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(null);
                      setInfoAberta(jogador);
                    }}
                    className="flex h-8 w-full items-center px-2 text-left text-[9px] font-black uppercase hover:bg-slate-100"
                  >
                    Informações
                  </button>
                  <button
                    type="button"
                    disabled={removendoId === jogador.id}
                    onClick={() => removerJogador(jogador)}
                    className="flex h-8 w-full items-center px-2 text-left text-[9px] font-black uppercase text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {removendoId === jogador.id ? "Removendo..." : "Remover"}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {jogadoresExcedentes.length ? (
        <div className="border-t border-red-200 bg-red-50 p-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-red-600">
              {jogadoresExcedentes.length} excedente{jogadoresExcedentes.length > 1 ? "s" : ""}
            </p>
            <p className="text-[8px] font-black uppercase text-red-500">
              Remova para atender o limite
            </p>
          </div>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            {jogadoresExcedentes.map((jogador, index) => {
              const avulso = Boolean(
                jogador?.jogador_avulso_id ||
                  (jogador && !jogador.perfil_jogo_id),
              );

              return (
                <div
                  key={`excedente-${jogador.id}`}
                  className="relative min-w-0 border border-red-300 bg-white p-0.5"
                >
                  <PlayerCard
                    name={getNomeJogador(jogador)}
                    tier={getTierJogador(jogador) as any}
                    number={totalSlots + index + 1}
                    variant={avulso ? "avulso" : "oficial"}
                    photoUrl={getFotoJogador(jogador)}
                    className="!max-w-none cursor-pointer"
                    onClick={() => abrirInformacoesJogador(jogador)}
                  />
                  <div className="mt-0.5 text-center text-[7px] font-black uppercase text-red-600">
                    Excedente
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {pickerAberto ? (
        <div className="border-t border-slate-200 bg-white p-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                {trocarJogador ? "Trocar jogador" : "Adicionar jogador"}
              </p>
              <h4 className="text-sm font-black uppercase tracking-[-0.03em] text-slate-950">
                Escolha do elenco ou envie convite
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setPickerAberto(false);
                setTrocarJogador(null);
                setBusca("");
              }}
              className="grid h-8 w-8 place-items-center border border-slate-300 bg-white text-slate-700"
            >
              <XCircle size={16} />
            </button>
          </div>

          <div className="mt-2 flex h-10 items-center gap-2 border border-slate-200 bg-slate-50 px-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite nick ou UID"
              className="h-full min-w-0 flex-1 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="mt-2 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
              Jogadores da equipe
            </p>
            {candidatosElenco.length ? (
              <div className="grid grid-cols-4 gap-1">
                {candidatosElenco.slice(0, 12).map((perfil, index) => (
                  <div
                    key={perfil.id}
                    role="button"
                    tabIndex={0}
                    aria-disabled={processando === perfil.id}
                    onClick={() => {
                      if (processando === perfil.id) return;
                      adicionarPerfil(perfil);
                    }}
                    onKeyDown={(event) => {
                      if (processando === perfil.id) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        adicionarPerfil(perfil);
                      }
                    }}
                    className={`min-w-0 ${processando === perfil.id ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                  >
                    <PlayerCard
                      name={getNomePerfil(perfil)}
                      tier={tierPerfil(perfil) as any}
                      number={index + 1}
                      variant="oficial"
                      photoUrl={perfil.foto_capa || null}
                      className="!max-w-none"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-500">
                Nenhum jogador disponível no elenco para este filtro.
              </div>
            )}
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-600">
              Buscar jogador para convite
            </p>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Mensagem opcional para o convite"
              className="h-16 w-full resize-none border border-slate-200 bg-white p-2 text-xs font-bold outline-none placeholder:text-slate-400"
            />
            {busca.trim().length < 2 ? (
              <div className="border border-dashed border-slate-200 bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-500">
                Digite pelo menos 2 caracteres para buscar por nick ou UID.
              </div>
            ) : candidatosBusca.length ? (
              <div className="space-y-1">
                {candidatosBusca.map((perfil) => (
                  <div
                    key={perfil.id}
                    className="flex items-center gap-2 border border-slate-200 bg-white p-1.5"
                  >
                    <div className="h-8 w-8 overflow-hidden border border-slate-200 bg-slate-100">
                      {perfil.foto_capa ? (
                        <img
                          src={perfil.foto_capa}
                          alt={perfil.nick || "Jogador"}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black uppercase text-slate-950">
                        {perfil.nick}
                      </p>
                      <p className="truncate text-[9px] font-bold text-slate-500">
                        UID {perfil.uid_jogo || "-"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={processando === `convite-${perfil.id}`}
                      onClick={() => enviarConvite(perfil)}
                      className="flex h-8 items-center gap-1 border border-blue-600 bg-blue-600 px-2 text-[9px] font-black uppercase text-white disabled:opacity-50"
                    >
                      <MailPlus size={13} /> Convite
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-500">
                Nenhum jogador encontrado para convite.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {infoAberta ? (
        <div className="border-t border-slate-200 bg-slate-50 p-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                Informações do jogador
              </p>
              <h4 className="truncate text-sm font-black uppercase text-slate-950">
                {getNomeJogador(infoAberta)}
              </h4>
              <p className="text-[10px] font-bold text-slate-500">
                UID {getUidJogador(infoAberta)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setInfoAberta(null);
                setStatsJogador(null);
              }}
              className="h-7 border border-slate-300 bg-white px-2 text-[9px] font-black uppercase text-slate-700"
            >
              Fechar
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1">
            <InfoMini
              label="Tipo"
              value={infoAberta.jogador_avulso_id ? "Avulso" : "Oficial"}
            />
            <InfoMini label="Status" value={infoAberta.status || "Ativo"} />
            <InfoMini label="Tier" value={getTierJogador(infoAberta)} />
          </div>

          <div className="mt-1 grid grid-cols-3 gap-1">
            <InfoMini
              label="Partidas"
              value={loadingStats ? "..." : String(statsJogador?.partidas ?? 0)}
            />
            <InfoMini
              label="Abates"
              value={loadingStats ? "..." : String(statsJogador?.abates ?? 0)}
            />
            <InfoMini
              label="MVP"
              value={
                loadingStats
                  ? "..."
                  : statsJogador?.posicaoMvp
                    ? `#${statsJogador.posicaoMvp}`
                    : "-"
              }
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => abrirAdicionar(infoAberta)}
              className="flex h-8 items-center justify-center border border-slate-300 bg-white text-[9px] font-black uppercase text-slate-800"
            >
              Trocar
            </button>
            <button
              type="button"
              disabled={removendoId === infoAberta.id}
              onClick={() => removerJogador(infoAberta)}
              className="flex h-8 items-center justify-center border border-red-200 bg-red-50 text-[9px] font-black uppercase text-red-600 disabled:opacity-50"
            >
              {removendoId === infoAberta.id ? "Removendo" : "Remover"}
            </button>
          </div>

          {infoAberta.perfil_jogo_id ? (
            <Link
              href={`/jogadores/${infoAberta.perfil_jogo_id}`}
              className="mt-1 flex h-8 items-center justify-center border border-blue-600 bg-blue-600 text-[9px] font-black uppercase text-white"
            >
              Abrir perfil de jogo
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white px-1.5 py-1">
      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="truncate text-[10px] font-black text-slate-950">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-slate-200 px-1 py-1 text-center last:border-r-0">
      <p className="truncate text-[6px] font-black uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[9px] font-black leading-none text-slate-950">
        {value}
      </p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function CardVazio({
  titulo,
  texto,
  href,
  label,
}: {
  titulo: string;
  texto: string;
  href: string;
  label: string;
}) {
  return (
    <div className="border border-slate-200 bg-white p-4 text-center shadow-sm">
      <Users className="mx-auto text-slate-400" size={24} />
      <h2 className="mt-3 text-base font-black uppercase tracking-[-0.03em] text-slate-950">
        {titulo}
      </h2>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {texto}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex h-11 items-center justify-center border border-blue-600 bg-blue-600 px-5 text-xs font-black uppercase text-white"
      >
        {label}
      </Link>
    </div>
  );
}
