"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  Eye,
  Gamepad2,
  ListChecks,
  Loader2,
  Lock,
  PlusCircle,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCampeonatoHref } from "@/app/campeonatos/utils/getCampeonatoHref";

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

type PerfilJogo = {
  id: string;
  user_id: string | null;
  equipe_id: string | null;
  nick?: string | null;
  nick_jogo?: string | null;
  nome?: string | null;
  uid_jogo?: string | null;
  game_id?: string | null;
  plataforma?: string | null;
  funcao?: string | null;
  ativo?: boolean | null;
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
  return (
    perfil?.nick || perfil?.nick_jogo || perfil?.nome || fallback || "Jogador"
  );
}

function getUidPerfil(perfil?: PerfilJogo | null, fallback?: string | null) {
  return perfil?.uid_jogo || perfil?.game_id || fallback || "-";
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

function Logo({ url, nome }: { url?: string | null; nome: string }) {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-100 text-sm font-black text-slate-500">
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
  const [perfilJogo, setPerfilJogo] = useState<PerfilJogo | null>(null);
  const [jogadorNoCampeonato, setJogadorNoCampeonato] =
    useState<JogadorCampeonato | null>(null);
  const [equipeDoJogador, setEquipeDoJogador] = useState<Equipe | null>(null);
  const [killsJogador, setKillsJogador] = useState(0);
  const [partidasJogador, setPartidasJogador] = useState(0);
  const [posicaoMvp, setPosicaoMvp] = useState<number | null>(null);
  const [aba, setAba] = useState<"equipe" | "jogador">("equipe");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const linkAtual = typeof window !== "undefined" ? window.location.href : "";

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
          let perfisMapa = new Map<string, PerfilJogo>();

          if (perfilIds.length) {
            const { data: perfisJogadores } = await supabase
              .from("perfis_jogo")
              .select("*")
              .in("id", perfilIds);
            perfisMapa = new Map(
              ((perfisJogadores || []) as PerfilJogo[]).map((p) => [p.id, p]),
            );
          }

          const agrupado: Record<string, JogadorEquipe[]> = {};
          jogadoresLista.forEach((jogador) => {
            const chave =
              jogador.campeonato_equipe_id || jogador.equipe_id || "sem-equipe";
            if (!agrupado[chave]) agrupado[chave] = [];
            agrupado[chave].push({
              ...jogador,
              perfil: jogador.perfil_jogo_id
                ? perfisMapa.get(jogador.perfil_jogo_id) || null
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

  const limiteJogadores = useMemo(
    () =>
      Number(campeonato?.jogadores_por_equipe || 0) +
      Number(campeonato?.reservas_permitidos || 0),
    [campeonato],
  );
  const abertas = inscricoesAbertas(campeonato);
  async function copiarLink() {
    if (!linkAtual) return;
    await navigator.clipboard.writeText(linkAtual);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

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
            href="/campeonatos"
            className="mt-4 inline-flex h-11 items-center justify-center border border-blue-600 bg-blue-600 px-5 text-xs font-black uppercase text-white"
          >
            Ver campeonatos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-3 text-slate-950 [color-scheme:light]">
      <div className="mx-auto max-w-md pb-8">
        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-blue-500 bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
            <div className="flex gap-3">
              <Logo url={campeonato.logo_url} nome={campeonato.nome} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                  Inscrição mobile
                </p>
                <h1 className="mt-1 truncate text-2xl font-black uppercase tracking-[-0.05em]">
                  {campeonato.nome}
                </h1>
                <div className="mt-2 flex flex-wrap gap-1.5">
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

          <div className="grid grid-cols-2 border-b border-slate-200 bg-white">
            <Info
              label="Status"
              value={abertas ? "Inscrições abertas" : "Inscrições fechadas"}
            />
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

          <div className="p-4">
            <button
              onClick={copiarLink}
              className="flex h-11 w-full items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-700"
            >
              <Copy size={15} />{" "}
              {copiado ? "Link copiado" : "Copiar link do grupo"}
            </button>
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
                href="/login"
                className="flex h-12 items-center justify-center border border-blue-600 bg-blue-600 text-xs font-black uppercase text-white"
              >
                Login
              </Link>
              <Link
                href="/cadastro"
                className="flex h-12 items-center justify-center border border-slate-300 bg-white text-xs font-black uppercase text-slate-800"
              >
                Criar conta
              </Link>
              <Link
                href="/recuperar"
                className="flex h-12 items-center justify-center border border-slate-300 bg-white text-xs font-black uppercase text-slate-800"
              >
                Recuperar senha
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setAba("equipe")}
                className={`h-11 border text-xs font-black uppercase ${aba === "equipe" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                Equipe
              </button>
              <button
                onClick={() => setAba("jogador")}
                className={`h-11 border text-xs font-black uppercase ${aba === "jogador" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                Jogador
              </button>
            </section>

            {aba === "equipe" ? (
              <section className="mt-3 space-y-3">
                {!equipes.length ? (
                  <CardVazio
                    titulo="Você ainda não tem equipe"
                    texto="Crie sua organização usando o formulário original do site."
                    href="/equipe/nova"
                    label="Criar equipe"
                  />
                ) : null}

                {equipes.map((equipe) => {
                  const inscricoes = inscricoesEquipe.filter(
                    (item) => item.equipe_id === equipe.id,
                  );
                  const inscrita = inscricoes.length > 0;
                  const primeiraVaga = inscricoes[0];

                  return (
                    <div
                      key={equipe.id}
                      className="border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex items-center gap-3 border-b border-slate-200 p-3">
                        <Logo url={equipe.logo_url} nome={equipe.nome} />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-black uppercase tracking-[-0.03em]">
                            {equipe.tag ? `[${equipe.tag}] ` : ""}
                            {equipe.nome}
                          </h3>
                          <p className="mt-1 text-[10px] font-black uppercase text-slate-500">
                            {inscrita
                              ? "Equipe inscrita neste campeonato"
                              : "Equipe ainda sem vaga neste campeonato"}
                          </p>
                        </div>
                        {inscrita ? (
                          <CheckCircle2
                            className="text-emerald-500"
                            size={20}
                          />
                        ) : null}
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-3">
                        <Link
                          href={
                            primeiraVaga
                              ? `/escala/vaga/${primeiraVaga.id}`
                              : getCampeonatoHref(campeonato as any)
                          }
                          className="flex min-h-16 flex-col items-center justify-center gap-1 border border-blue-600 bg-blue-600 px-2 text-center text-[10px] font-black uppercase leading-tight text-white"
                        >
                          <ListChecks size={17} />
                          Escalar
                        </Link>

                        <Link
                          href={`/equipe/${equipe.id}`}
                          className="flex min-h-16 flex-col items-center justify-center gap-1 border border-slate-200 bg-slate-50 px-2 text-center text-[10px] font-black uppercase leading-tight text-slate-800"
                        >
                          <Eye size={17} />
                          Ver equipe
                        </Link>

                        <Link
                          href={
                            perfilJogo?.id
                              ? `/jogadores/${perfilJogo.id}`
                              : "/jogadores"
                          }
                          className="flex min-h-16 flex-col items-center justify-center gap-1 border border-slate-200 bg-slate-50 px-2 text-center text-[10px] font-black uppercase leading-tight text-slate-800"
                        >
                          <Gamepad2 size={17} />
                          Perfil jogo
                        </Link>
                      </div>

                      {!inscrita ? (
                        <div className="border-t border-slate-100 p-3 text-xs font-semibold leading-5 text-slate-500">
                          Essa equipe existe no seu perfil, mas ainda não
                          comprou ou recebeu vaga neste campeonato.
                        </div>
                      ) : (
                        <div className="border-t border-slate-100 p-3">
                          <div className="mb-3 grid grid-cols-2 gap-2">
                            <InfoBox
                              label="Slots do campeonato"
                              value={String(limiteJogadores || 8)}
                            />
                            <InfoBox
                              label="Escalados"
                              value={String(
                                Object.values(jogadoresPorEquipe)
                                  .flat()
                                  .filter((jogador: any) =>
                                    inscricoes.some((inscricao) =>
                                      (
                                        jogadoresPorEquipe[inscricao.id] || []
                                      ).some((item) => item.id === jogador.id),
                                    ),
                                  ).length,
                              )}
                            />
                          </div>

                          <EscalacaoCards
                            campeonato={campeonato}
                            inscricoes={inscricoes}
                            jogadoresPorEquipe={jogadoresPorEquipe}
                            limiteJogadores={limiteJogadores || 8}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            ) : (
              <section className="mt-3 space-y-3">
                {!perfilJogo ? (
                  <CardVazio
                    titulo="Você ainda não tem conta de jogo"
                    texto="Crie seu perfil de jogador usando o cadastro original do site."
                    href="/jogadores"
                    label="Criar perfil de jogo"
                  />
                ) : (
                  <div className="border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center border border-slate-200 bg-slate-50 text-blue-600">
                        <UserRound size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                          Seu jogador
                        </p>
                        <h2 className="truncate text-xl font-black uppercase tracking-[-0.04em]">
                          {getNomePerfil(perfilJogo)}
                        </h2>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          UID {getUidPerfil(perfilJogo)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <InfoBox
                        label="Status"
                        value={
                          jogadorNoCampeonato ? "Inscrito" : "Não inscrito"
                        }
                      />
                      <InfoBox
                        label="Equipe"
                        value={equipeDoJogador?.nome || "-"}
                      />
                      <InfoBox label="Abates" value={String(killsJogador)} />
                      <InfoBox
                        label="Posição MVP"
                        value={posicaoMvp ? `#${posicaoMvp}` : "-"}
                      />
                      <InfoBox
                        label="Partidas"
                        value={String(partidasJogador)}
                      />
                      <InfoBox
                        label="Função"
                        value={perfilJogo.funcao || "-"}
                      />
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {erro ? (
          <div className="mt-3 border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
            {erro}
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={getCampeonatoHref(campeonato as any)}
            className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-700"
          >
            <Trophy size={14} /> Campeonato
          </Link>
          <Link
            href="/"
            className="flex h-11 items-center justify-center gap-2 border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-700"
          >
            <ShieldCheck size={14} /> Site
          </Link>
        </div>
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

function tierClasses(tier: string, avulso: boolean) {
  if (avulso) {
    return {
      borda: "border-zinc-400",
      fundo: "from-zinc-200 via-zinc-100 to-zinc-300",
      texto: "text-zinc-900",
      selo: "bg-zinc-900 text-white",
      glow: "shadow-zinc-300/50",
    };
  }

  switch (tier) {
    case "SS":
      return {
        borda: "border-yellow-400",
        fundo: "from-yellow-200 via-amber-300 to-yellow-500",
        texto: "text-yellow-950",
        selo: "bg-yellow-950 text-yellow-200",
        glow: "shadow-yellow-300/60",
      };
    case "S":
      return {
        borda: "border-amber-400",
        fundo: "from-amber-100 via-yellow-300 to-amber-500",
        texto: "text-amber-950",
        selo: "bg-amber-950 text-amber-200",
        glow: "shadow-amber-300/60",
      };
    case "A":
      return {
        borda: "border-violet-400",
        fundo: "from-violet-200 via-purple-400 to-violet-700",
        texto: "text-white",
        selo: "bg-white text-violet-700",
        glow: "shadow-violet-300/60",
      };
    case "B":
      return {
        borda: "border-blue-400",
        fundo: "from-blue-200 via-blue-500 to-blue-800",
        texto: "text-white",
        selo: "bg-white text-blue-700",
        glow: "shadow-blue-300/60",
      };
    case "D":
      return {
        borda: "border-slate-400",
        fundo: "from-slate-100 via-slate-300 to-slate-500",
        texto: "text-slate-950",
        selo: "bg-slate-950 text-white",
        glow: "shadow-slate-300/60",
      };
    case "E":
      return {
        borda: "border-zinc-500",
        fundo: "from-zinc-200 via-zinc-400 to-zinc-700",
        texto: "text-white",
        selo: "bg-white text-zinc-800",
        glow: "shadow-zinc-300/60",
      };
    case "C":
    default:
      return {
        borda: "border-emerald-400",
        fundo: "from-emerald-200 via-emerald-500 to-emerald-800",
        texto: "text-white",
        selo: "bg-white text-emerald-700",
        glow: "shadow-emerald-300/60",
      };
  }
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

function EscalacaoCards({
  campeonato,
  inscricoes,
  jogadoresPorEquipe,
  limiteJogadores,
}: {
  campeonato: Campeonato;
  inscricoes: CampeonatoEquipe[];
  jogadoresPorEquipe: Record<string, JogadorEquipe[]>;
  limiteJogadores: number;
}) {
  const vagaPrincipal = inscricoes[0];
  const jogadoresUnicosMap = new Map<string, JogadorEquipe>();

  inscricoes.forEach((inscricao) => {
    (jogadoresPorEquipe[inscricao.id] || []).forEach((jogador) => {
      jogadoresUnicosMap.set(jogador.id, jogador);
    });
  });

  const jogadores = Array.from(jogadoresUnicosMap.values()).filter(
    (jogador) => jogador.status !== "removido",
  );
  const totalSlots = Math.max(limiteJogadores || 8, jogadores.length, 1);
  const slots = Array.from({ length: totalSlots }).map(
    (_, index) => jogadores[index] || null,
  );
  const hrefAdicionar = vagaPrincipal
    ? `/escala/vaga/${vagaPrincipal.id}`
    : getCampeonatoHref(campeonato as any);

  return (
    <div className="overflow-hidden border border-slate-900 bg-[#07101f] text-white shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0b1628] px-3 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
            Escalação
          </p>
          <p className="text-xs font-black uppercase text-white">
            {jogadores.length}/{totalSlots} cards usados
          </p>
        </div>

        <Link
          href={hrefAdicionar}
          className="flex h-9 items-center justify-center gap-1 border border-violet-400 bg-violet-600 px-3 text-[10px] font-black uppercase text-white shadow-lg shadow-violet-950/40"
        >
          <PlusCircle size={14} /> Adicionar
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-2 p-3">
        {slots.map((jogador, index) => (
          <PlayerCardSlot
            key={jogador?.id || `card-slot-${index}`}
            jogador={jogador}
            index={index}
            href={hrefAdicionar}
          />
        ))}
      </div>
    </div>
  );
}

function PlayerCardSlot({
  jogador,
  index,
  href,
}: {
  jogador: JogadorEquipe | null;
  index: number;
  href: string;
}) {
  const vazio = !jogador;
  const avulso = Boolean(
    jogador?.jogador_avulso_id || (jogador && !jogador.perfil_jogo_id),
  );
  const tier = jogador ? getTierJogador(jogador) : "+";
  const cor = tierClasses(tier, avulso);
  const nome = jogador
    ? getNomePerfil(jogador.perfil, jogador.nick_snapshot)
    : "Adicionar";
  const foto =
    ((jogador?.perfil || {}) as any)?.foto_url ||
    ((jogador?.perfil || {}) as any)?.avatar_url ||
    ((jogador?.perfil || {}) as any)?.imagem_url ||
    null;

  const cardClass = vazio
    ? "border-violet-500 bg-gradient-to-b from-[#171032] via-[#111827] to-[#060b16] text-violet-200 shadow-violet-950/60"
    : `${cor.borda} bg-gradient-to-b ${cor.fundo} ${cor.texto} ${cor.glow}`;

  return (
    <Link
      href={href}
      className={`group relative flex aspect-[0.70] min-h-[124px] flex-col overflow-hidden border-2 p-1.5 text-center shadow-md transition active:scale-[0.98] ${cardClass}`}
      style={{
        clipPath:
          "polygon(10% 4%, 26% 2%, 34% 6%, 50% 0%, 66% 6%, 74% 2%, 90% 4%, 97% 14%, 92% 82%, 50% 100%, 8% 82%, 3% 14%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-1 border border-white/20 opacity-70"
        style={{
          clipPath:
            "polygon(10% 4%, 26% 2%, 34% 6%, 50% 0%, 66% 6%, 74% 2%, 90% 4%, 97% 14%, 92% 82%, 50% 100%, 8% 82%, 3% 14%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.28),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.16),transparent_45%)]" />

      <div className="relative z-10 flex items-start justify-between px-1 pt-1">
        <span
          className={`grid h-5 min-w-5 place-items-center rounded px-1 text-[10px] font-black ${vazio ? "bg-violet-500 text-white" : cor.selo}`}
        >
          {tier}
        </span>
        <span className="text-[9px] font-black text-white/55">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="relative z-10 mt-1 grid flex-1 place-items-center">
        {foto ? (
          <img
            src={foto}
            alt={nome}
            className={`h-[68px] w-[68px] object-cover object-top ${avulso ? "grayscale" : ""}`}
            style={{ clipPath: "ellipse(42% 48% at 50% 50%)" }}
          />
        ) : (
          <PlayerSilhouette muted={vazio} />
        )}
      </div>

      {!vazio ? (
        <div className="relative z-10 mb-1 bg-black/60 px-1 py-1 backdrop-blur-sm">
          <p className="truncate text-[10px] font-black uppercase leading-tight text-white">
            {nome}
          </p>
          <p className="mt-0.5 text-[8px] font-black uppercase text-white/70">
            {avulso ? "avulso" : `tier ${tier}`}
          </p>
        </div>
      ) : (
        <div className="relative z-10 mb-2 flex flex-col items-center justify-center gap-1">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-violet-300 bg-violet-600/40 text-violet-100">
            <PlusCircle size={17} />
          </span>
          <p className="text-[9px] font-black uppercase leading-tight text-violet-200">
            adicionar
          </p>
        </div>
      )}
    </Link>
  );
}

function PlayerSilhouette({ muted }: { muted?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`h-[76px] w-[76px] ${muted ? "opacity-55" : "opacity-80"}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="silhouetteGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(0,0,0,0.95)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.65)" />
        </linearGradient>
      </defs>
      <path
        fill="url(#silhouetteGradient)"
        d="M60 13c14.2 0 25 11.1 25 25.4 0 15.2-10.2 27.2-25 27.2S35 53.6 35 38.4C35 24.1 45.8 13 60 13Z"
      />
      <path
        fill="url(#silhouetteGradient)"
        d="M21 116c2.6-28.8 18.7-44.8 39-44.8s36.4 16 39 44.8H21Z"
      />
      <path
        fill="rgba(255,255,255,0.08)"
        d="M41 77c5.3 5.7 11.7 8.5 19 8.5s13.7-2.8 19-8.5c-4.9-3.8-11.4-5.8-19-5.8s-14.1 2-19 5.8Z"
      />
    </svg>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-b border-slate-200 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
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
