"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
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
import FormCriarEquipe from "@/app/components/FormCriarEquipe";
import AuthLinkCampeonato from "@/app/components/AuthLinkCampeonato";

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
  servidor: string | null;
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
  avatar_url?: string | null;
  foto_url?: string | null;
  uid_jogo?: string | null;
  servidor?: string | null;
  plataforma?: string | null;
  funcao?: string | null;
  ativo?: boolean | null;
  tier?: string | null;
  ranking_tier?: string | null;
  tier_atual?: string | null;
  overall_tier?: string | null;
};

type ConviteEquipeBeta = {
  id: string;
  equipe_id: string;
  perfil_jogo_id: string;
  convidado_por_user_id?: string | null;
  status: string;
  tipo?: string | null;
  tipo_convite?: string | null;
  origem?: string | null;
  situacao?: string | null;
  mensagem?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  perfil_id?: string | null;
  convidado_perfil_jogo_id?: string | null;
  perfil_jogo_destino_id?: string | null;
  para_perfil_jogo_id?: string | null;
  solicitante_perfil_jogo_id?: string | null;
  de_perfil_jogo_id?: string | null;
  perfil_solicitante_id?: string | null;
  jogador_perfil_jogo_id?: string | null;
  perfil?: PerfilJogo | null;
  equipe?: Equipe | Equipe[] | null;
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

const SERVIDORES_FREE_FIRE = [
  { value: "BR", label: "Brasil (BR)" },
  { value: "LATAM", label: "Latam (LATAM)" },
  { value: "NA", label: "América do Norte (NA)" },
  { value: "US", label: "Estados Unidos (US)" },
  { value: "SAC", label: "América do Sul (SAC)" },
  { value: "EU", label: "Europa (EU)" },
  { value: "MEA", label: "Oriente Médio e África (MEA)" },
  { value: "IND", label: "Índia (IND)" },
  { value: "PK", label: "Paquistão (PK)" },
  { value: "BD", label: "Bangladesh (BD)" },
  { value: "TH", label: "Tailândia (TH)" },
  { value: "VN", label: "Vietnã (VN)" },
  { value: "ID", label: "Indonésia (ID)" },
  { value: "TW", label: "Taiwan (TW)" },
  { value: "SG", label: "Singapura (SG)" },
  { value: "CIS", label: "Comunidade dos Estados Independentes (CIS)" },
];

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

function getFotoPerfilMobile(perfil?: PerfilJogo | null) {
  return perfil?.foto_capa || perfil?.avatar_url || perfil?.foto_url || null;
}

function getCapaPerfilMobile(perfil?: PerfilJogo | null) {
  return null;
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


function normalizarEquipeBeta(equipe: ConviteEquipeBeta["equipe"] | Equipe | Equipe[] | null | undefined) {
  if (!equipe) return null;
  return Array.isArray(equipe) ? equipe[0] || null : equipe;
}

function valorNormalizadoBeta(valor: unknown) {
  return String(valor || "").trim().toLowerCase();
}

function conviteTemPerfilBeta(convite: ConviteEquipeBeta, perfilId: string) {
  const id = String(perfilId || "").trim();
  if (!id) return false;

  return [
    convite.perfil_jogo_id,
    convite.perfil_id,
    convite.convidado_perfil_jogo_id,
    convite.perfil_jogo_destino_id,
    convite.para_perfil_jogo_id,
    convite.solicitante_perfil_jogo_id,
    convite.de_perfil_jogo_id,
    convite.jogador_perfil_jogo_id,
  ].some((valor) => String(valor || "").trim() === id);
}

function ehDestinoDoConviteBeta(convite: ConviteEquipeBeta, perfilId: string) {
  const id = String(perfilId || "").trim();

  return [
    convite.convidado_perfil_jogo_id,
    convite.perfil_jogo_destino_id,
    convite.para_perfil_jogo_id,
    convite.jogador_perfil_jogo_id,
    convite.perfil_jogo_id,
  ].some((valor) => String(valor || "").trim() === id);
}

function ehOrigemDoPedidoBeta(convite: ConviteEquipeBeta, perfilId: string) {
  const id = String(perfilId || "").trim();

  return [
    convite.solicitante_perfil_jogo_id,
    convite.de_perfil_jogo_id,
    convite.perfil_solicitante_id,
    convite.perfil_jogo_id,
  ].some((valor) => String(valor || "").trim() === id);
}

function statusPendenteBeta(convite: ConviteEquipeBeta) {
  const status = valorNormalizadoBeta(convite.status || convite.situacao);
  return !status || ["pendente", "enviado", "aguardando", "aberto", "solicitado"].includes(status);
}

async function rpcFallbackBeta(nameList: string[], payload: Record<string, unknown>) {
  let lastError: unknown = null;

  for (const fn of nameList) {
    const { error } = await supabase.rpc(fn, payload);
    if (!error) return;
    lastError = error;
  }

  throw lastError;
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
  const [tipoAcesso, setTipoAcesso] = useState<"jogador" | "equipe" | null>(null);
  const [aba, setAba] = useState<"escala" | "equipe" | "jogador">("equipe");
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState<string | null>(null);
  const [lineSelecionadaPorEquipe, setLineSelecionadaPorEquipe] = useState<Record<string, string>>({});
  const [managerBusca, setManagerBusca] = useState("");
  const [linePickerAberto, setLinePickerAberto] = useState<{ equipeId: string; lineId: string } | null>(null);
  const [painelEquipeAtivo, setPainelEquipeAtivo] = useState<"jogadores" | "lideres">("jogadores");
  const [subJogadoresAtiva, setSubJogadoresAtiva] = useState<"elenco" | "convites" | "pedidos">("elenco");
  const [buscaJogadorEquipe, setBuscaJogadorEquipe] = useState("");
  const [jogadorElencoSelecionado, setJogadorElencoSelecionado] = useState<string | null>(null);
  const [resultadosBuscaJogadorSite, setResultadosBuscaJogadorSite] = useState<PerfilJogo[]>([]);
  const [buscandoJogadorSite, setBuscandoJogadorSite] = useState(false);
  const [operandoJogadorId, setOperandoJogadorId] = useState<string | null>(null);
  const [convitesPorEquipe, setConvitesPorEquipe] = useState<Record<string, ConviteEquipeBeta[]>>({});
  const [convitesJogador, setConvitesJogador] = useState<ConviteEquipeBeta[]>([]);
  const [subAbaJogadorEquipe, setSubAbaJogadorEquipe] = useState<"convites" | "pedidos">("convites");
  const [buscaEquipeJogador, setBuscaEquipeJogador] = useState("");
  const [mensagemPedidoJogador, setMensagemPedidoJogador] = useState("");
  const [equipesBuscaJogador, setEquipesBuscaJogador] = useState<Equipe[]>([]);
  const [carregandoBuscaEquipeJogador, setCarregandoBuscaEquipeJogador] = useState(false);
  const [enviandoPedidoJogadorId, setEnviandoPedidoJogadorId] = useState<string | null>(null);
  const [processandoConviteJogadorId, setProcessandoConviteJogadorId] = useState<string | null>(null);
  const [modoFormularioBeta, setModoFormularioBeta] = useState<"perfil" | "equipe" | null>(null);
  const [salvandoFormularioBeta, setSalvandoFormularioBeta] = useState(false);
  const [formPerfilBeta, setFormPerfilBeta] = useState({
    nick: "",
    uid_jogo: "",
    servidor: "BR",
    plataforma: "mobile",
    funcao: "",
    foto_capa: "",
  });
  const [formEquipeBeta, setFormEquipeBeta] = useState({
    nome: "",
    tag: "",
    servidor: "BR",
    logo_url: "",
    descricao: "",
  });
  const [vagaAtivaPorEquipe, setVagaAtivaPorEquipe] = useState<
    Record<string, string>
  >({});
  const [erro, setErro] = useState<string | null>(null);
  const [authModoBeta, setAuthModoBeta] = useState<"login" | "cadastro" | "recuperar" | "confirmar">("login");
  const [authEmailBeta, setAuthEmailBeta] = useState("");
  const [authSenhaBeta, setAuthSenhaBeta] = useState("");
  const [authConfirmarSenhaBeta, setAuthConfirmarSenhaBeta] = useState("");
  const [authCodigoBeta, setAuthCodigoBeta] = useState("");
  const [authNomeBeta, setAuthNomeBeta] = useState("");
  const [authLoadingBeta, setAuthLoadingBeta] = useState(false);
  const [resetSenhaBeta, setResetSenhaBeta] = useState(false);
  const [novaSenhaBeta, setNovaSenhaBeta] = useState("");
  const [confirmarNovaSenhaBeta, setConfirmarNovaSenhaBeta] = useState("");

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [authModo, setAuthModo] = useState<"login" | "cadastro" | "recuperar" | "confirmar">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authSenha, setAuthSenha] = useState("");
  const [authConfirmarSenha, setAuthConfirmarSenha] = useState("");
  const [authCodigo, setAuthCodigo] = useState("");
  const [authOtpTipo, setAuthOtpTipo] = useState<"signup" | "recovery">("signup");
  const [authNome, setAuthNome] = useState("");
  const [authMensagem, setAuthMensagem] = useState<string | null>(null);
  const [authProcessando, setAuthProcessando] = useState(false);

  useEffect(() => {
    async function verificarAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUsuarioLogado(session?.user || null);
      setCheckingAuth(false);
    }

    verificarAuth();
  }, []);


  async function entrarContaBeta() {
    const email = authEmailBeta.trim();

    if (!email || !authSenhaBeta) {
      alert("Informe e-mail e senha.");
      return;
    }

    try {
      setAuthLoadingBeta(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: authSenhaBeta,
      });

      if (error) throw error;

      await carregar();
    } catch (error: any) {
      alert(error?.message || "Não foi possível entrar na conta.");
    } finally {
      setAuthLoadingBeta(false);
    }
  }

  async function criarContaBeta() {
    const email = authEmailBeta.trim();

    if (!email || !authSenhaBeta) {
      alert("Informe e-mail e senha.");
      return;
    }

    if (authSenhaBeta !== authConfirmarSenhaBeta) {
      alert("As senhas não conferem.");
      return;
    }

    try {
      setAuthLoadingBeta(true);

      const { error } = await supabase.auth.signUp({
        email,
        password: authSenhaBeta,
        options: {
          data: {
            nome: authNomeBeta.trim() || email,
          },
          emailRedirectTo:
            typeof window !== "undefined"
              ? window.location.href.split("#")[0]
              : undefined,
        },
      });

      if (error) throw error;

      setAuthCodigoBeta("");
      setAuthModoBeta("confirmar");
      alert("Enviamos o código de verificação para seu e-mail.");
    } catch (error: any) {
      alert(error?.message || "Não foi possível criar a conta.");
    } finally {
      setAuthLoadingBeta(false);
    }
  }

  async function confirmarCodigoCadastroBeta() {
    const email = authEmailBeta.trim();
    const token = authCodigoBeta.trim();

    if (!email || !token) {
      alert("Informe o e-mail e o código de verificação.");
      return;
    }

    try {
      setAuthLoadingBeta(true);

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });

      if (error) throw error;

      alert("E-mail confirmado com sucesso.");
      setAuthCodigoBeta("");
      setAuthModoBeta("login");
      await carregar();
    } catch (error: any) {
      alert(error?.message || "Código inválido ou expirado.");
    } finally {
      setAuthLoadingBeta(false);
    }
  }

  async function reenviarCodigoCadastroBeta() {
    const email = authEmailBeta.trim();

    if (!email) {
      alert("Informe o e-mail usado no cadastro.");
      return;
    }

    try {
      setAuthLoadingBeta(true);

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? window.location.href.split("#")[0]
              : undefined,
        },
      });

      if (error) throw error;

      alert("Código reenviado para seu e-mail.");
    } catch (error: any) {
      alert(error?.message || "Não foi possível reenviar o código.");
    } finally {
      setAuthLoadingBeta(false);
    }
  }

  async function recuperarSenhaBeta() {
    const email = authEmailBeta.trim();

    if (!email) {
      alert("Informe seu e-mail.");
      return;
    }

    try {
      setAuthLoadingBeta(true);

      const redirectTo =
        typeof window !== "undefined"
          ? window.location.href.split("#")[0]
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      alert("Enviamos o link de recuperação para seu e-mail.");
      setAuthModoBeta("login");
    } catch (error: any) {
      alert(error?.message || "Não foi possível enviar recuperação de senha.");
    } finally {
      setAuthLoadingBeta(false);
    }
  }


  async function salvarNovaSenhaBeta() {
    if (!novaSenhaBeta || novaSenhaBeta.length < 6) {
      alert("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (novaSenhaBeta !== confirmarNovaSenhaBeta) {
      alert("As senhas não conferem.");
      return;
    }

    try {
      setAuthLoadingBeta(true);

      const { error } = await supabase.auth.updateUser({
        password: novaSenhaBeta,
      });

      if (error) throw error;

      alert("Senha atualizada com sucesso.");
      setResetSenhaBeta(false);
      setNovaSenhaBeta("");
      setConfirmarNovaSenhaBeta("");

      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }

      await carregar();
    } catch (error: any) {
      alert(error?.message || "Não foi possível atualizar a senha.");
    } finally {
      setAuthLoadingBeta(false);
    }
  }

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
        setConvitesPorEquipe({});
        setConvitesJogador([]);
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
          .select("id,nome,tag,logo_url,criado_por,servidor")
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

      if (perfil?.id) {
        const { data: convitesPerfilRaw } = await supabase
          .from("convites_equipe")
          .select(`
            *,
            equipe:equipe_id (
              id,
              nome,
              tag,
              logo_url,
              criado_por,
              servidor
            )
          `)
          .limit(500);

        setConvitesJogador(
          ((convitesPerfilRaw || []) as ConviteEquipeBeta[]).filter((convite) =>
            conviteTemPerfilBeta(convite, perfil.id),
          ),
        );
      } else {
        setConvitesJogador([]);
      }


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

        const { data: convitesEquipeData } = await supabase
          .from("convites_equipe")
          .select("id,equipe_id,perfil_jogo_id,status,tipo,created_at")
          .in("equipe_id", equipeIds)
          .eq("status", "pendente")
          .order("created_at", { ascending: false });

        const convitesLista = (convitesEquipeData || []) as ConviteEquipeBeta[];
        const convitesPerfilIds = convitesLista
          .map((convite) => convite.perfil_jogo_id)
          .filter(Boolean);

        let perfisConvitesMapa = new Map<string, PerfilJogo>();

        if (convitesPerfilIds.length) {
          const { data: perfisConvitesData } = await supabase
            .from("perfis_jogo")
            .select("*")
            .in("id", convitesPerfilIds);

          perfisConvitesMapa = new Map(
            ((perfisConvitesData || []) as PerfilJogo[]).map((perfil) => [
              perfil.id,
              perfil,
            ]),
          );
        }

        const convitesAgrupados: Record<string, ConviteEquipeBeta[]> = {};
        convitesLista.forEach((convite) => {
          if (!convitesAgrupados[convite.equipe_id]) {
            convitesAgrupados[convite.equipe_id] = [];
          }

          convitesAgrupados[convite.equipe_id].push({
            ...convite,
            perfil: perfisConvitesMapa.get(convite.perfil_jogo_id) || null,
          });
        });

        setConvitesPorEquipe(convitesAgrupados);


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
            .select("id,nome,tag,logo_url,criado_por,servidor")
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";
    const paramsHash = new URLSearchParams(hash.replace(/^#/, ""));
    const tipo = paramsHash.get("type");

    if (hash.includes("access_token") && tipo === "recovery") {
      setResetSenhaBeta(true);
      setAuthModoBeta("recuperar");
    }
  }, []);



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

  useEffect(() => {
    const termo = buscaJogadorEquipe.trim();

    if (!termo || termo.length < 2) {
      setResultadosBuscaJogadorSite([]);
      return;
    }

    const buscarJogadoresSiteTimer = window.setTimeout(async () => {
      setBuscandoJogadorSite(true);

      try {
        const { data, error } = await supabase
          .from("perfis_jogo")
          .select("*")
          .eq("ativo", true)
          .or(`nick.ilike.%${termo}%,uid_jogo.ilike.%${termo}%`)
          .limit(15);

        if (error) throw error;

        setResultadosBuscaJogadorSite((data || []) as PerfilJogo[]);
      } catch (error) {
        console.error("Erro ao pesquisar jogador:", error);
        setResultadosBuscaJogadorSite([]);
      } finally {
        setBuscandoJogadorSite(false);
      }
    }, 350);

    return () => window.clearTimeout(buscarJogadoresSiteTimer);
  }, [buscaJogadorEquipe]);



  useEffect(() => {
    let ignore = false;

    async function buscarEquipesJogador() {
      if (
        !perfilJogo ||
        equipePrincipalDoJogador?.id ||
        buscaEquipeJogador.trim().length < 2
      ) {
        setEquipesBuscaJogador([]);
        return;
      }

      try {
        setCarregandoBuscaEquipeJogador(true);
        const termo = `%${buscaEquipeJogador.trim()}%`;
        const { data, error } = await supabase
          .from("equipes")
          .select("id,nome,tag,logo_url,criado_por,servidor")
          .or(`nome.ilike.${termo},tag.ilike.${termo}`)
          .limit(8);

        if (error) throw error;
        if (!ignore) setEquipesBuscaJogador((data || []) as Equipe[]);
      } catch (error) {
        console.error("Erro ao buscar equipes:", error);
        if (!ignore) setEquipesBuscaJogador([]);
      } finally {
        if (!ignore) setCarregandoBuscaEquipeJogador(false);
      }
    }

    const timer = window.setTimeout(buscarEquipesJogador, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [buscaEquipeJogador, perfilJogo, equipePrincipalDoJogador]);

  const convitesDoPerfilJogador = useMemo(() => {
    if (!perfilJogo) return [];

    return convitesJogador
      .filter((convite) => conviteTemPerfilBeta(convite, perfilJogo.id) && statusPendenteBeta(convite))
      .filter((convite) => {
        const tipo = valorNormalizadoBeta(convite.tipo || convite.tipo_convite || convite.origem);
        if (tipo.includes("pedido") || tipo.includes("solicit")) return false;
        return ehDestinoDoConviteBeta(convite, perfilJogo.id);
      });
  }, [convitesJogador, perfilJogo]);

  const pedidosDoPerfilJogador = useMemo(() => {
    if (!perfilJogo) return [];

    return convitesJogador
      .filter((convite) => conviteTemPerfilBeta(convite, perfilJogo.id))
      .filter((convite) => {
        const tipo = valorNormalizadoBeta(convite.tipo || convite.tipo_convite || convite.origem);
        return tipo.includes("pedido") || tipo.includes("solicit") || ehOrigemDoPedidoBeta(convite, perfilJogo.id);
      });
  }, [convitesJogador, perfilJogo]);

  const pedidoPendentePorEquipeJogador = useMemo(() => {
    const mapa = new Map<string, ConviteEquipeBeta>();

    pedidosDoPerfilJogador.forEach((pedido) => {
      const equipeId = String(pedido.equipe_id || normalizarEquipeBeta(pedido.equipe)?.id || "").trim();
      if (!equipeId || !statusPendenteBeta(pedido)) return;
      mapa.set(equipeId, pedido);
    });

    return mapa;
  }, [pedidosDoPerfilJogador]);

  async function responderConviteJogador(conviteId: string, acao: "aceito" | "recusado") {
    try {
      setProcessandoConviteJogadorId(conviteId);

      const conviteAtual = convitesJogador.find((convite) => convite.id === conviteId);

      if (acao === "aceito" && conviteAtual?.perfil_jogo_id && conviteAtual?.equipe_id) {
        const { data: vinculoExistente, error: vinculoError } = await supabase
          .from("membros_equipe")
          .select("id, ativo")
          .eq("equipe_id", conviteAtual.equipe_id)
          .eq("perfil_jogo_id", conviteAtual.perfil_jogo_id)
          .eq("ativo", true)
          .maybeSingle();

        if (vinculoError) throw vinculoError;

        if (vinculoExistente?.id) {
          const { error: conviteError } = await supabase
            .from("convites_equipe")
            .update({
              status: "aceito",
              updated_at: new Date().toISOString(),
            })
            .eq("id", conviteId);

          if (conviteError) throw conviteError;

          setConvitesJogador((atual) =>
            atual.filter((convite) => convite.id !== conviteId),
          );

          alert("Este perfil já estava vinculado nesta equipe. Convite removido da lista.");
          return;
        }
      }

      if (acao === "aceito") {
        await rpcFallbackBeta(["aceitar_convite_equipe_v2", "aceitar_convite_equipe"], {
          p_convite_id: conviteId,
        });
      } else {
        await rpcFallbackBeta(["recusar_convite_equipe_v2", "recusar_convite_equipe"], {
          p_convite_id: conviteId,
        });
      }

      setConvitesJogador((atual) =>
        atual.filter((convite) => convite.id !== conviteId),
      );

      await carregar();
      alert(acao === "aceito" ? "Convite aceito com sucesso." : "Convite recusado.");
    } catch (error: any) {
      console.error("Erro ao responder convite do jogador:", error);

      const mensagem = String(error?.message || error?.details || "");
      if (
        mensagem.includes("uq_membros_equipe_perfil_jogo_ativo") ||
        mensagem.includes("duplicate key value")
      ) {
        if (acao === "aceito") {
          await supabase
            .from("convites_equipe")
            .update({
              status: "aceito",
              updated_at: new Date().toISOString(),
            })
            .eq("id", conviteId);

          setConvitesJogador((atual) =>
            atual.filter((convite) => convite.id !== conviteId),
          );

          alert("Este perfil já tinha vínculo ativo. Convite removido da lista.");
        } else {
          setConvitesJogador((atual) =>
            atual.filter((convite) => convite.id !== conviteId),
          );
        }
      } else {
        alert(error?.message || "Não foi possível responder o convite.");
      }
    } finally {
      setProcessandoConviteJogadorId(null);
    }
  }

  async function enviarPedidoJogador(equipeId: string) {
    if (!perfilJogo) return;

    const mensagem = mensagemPedidoJogador.trim() || null;
    const pedidoExistente = pedidoPendentePorEquipeJogador.get(equipeId);

    try {
      setEnviandoPedidoJogadorId(equipeId);

      if (pedidoExistente?.id) {
        const { error } = await supabase
          .from("convites_equipe")
          .update({
            mensagem,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pedidoExistente.id);

        if (error) throw error;

        setConvitesJogador((atual) =>
          atual.map((convite) =>
            convite.id === pedidoExistente.id
              ? { ...convite, mensagem, updated_at: new Date().toISOString() }
              : convite,
          ),
        );

        alert("Pedido atualizado para a equipe.");
        return;
      }

      await rpcFallbackBeta(["fn_solicitar_entrada_equipe", "solicitar_entrada_equipe"], {
        p_equipe_id: equipeId,
        p_perfil_jogo_id: perfilJogo.id,
        p_mensagem: mensagem,
      });

      const equipe = equipesBuscaJogador.find((item) => item.id === equipeId) || null;
      const pedidoLocal: ConviteEquipeBeta = {
        id: `local-pedido-${equipeId}-${Date.now()}`,
        equipe_id: equipeId,
        perfil_jogo_id: perfilJogo.id,
        status: "pendente",
        tipo: "pedido",
        mensagem,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        equipe,
      };

      setConvitesJogador((atual) => [pedidoLocal, ...atual]);
      setBuscaEquipeJogador("");
      setMensagemPedidoJogador("");
      setEquipesBuscaJogador([]);
      setSubAbaJogadorEquipe("pedidos");
      alert("Pedido enviado para a equipe.");
    } catch (error: any) {
      console.error("Erro ao enviar pedido:", error);
      alert(
        pedidoExistente
          ? error?.message || "Não foi possível atualizar o pedido."
          : error?.message || "Não foi possível enviar o pedido.",
      );
    } finally {
      setEnviandoPedidoJogadorId(null);
    }
  }

  function jogadoresDaLineMobile(lineId?: string | null) {
    if (!lineId) return [];
    const vagasDaLine = inscricoesEquipe.filter((vaga) => vaga.line_id === lineId);
    const jogadoresMap = new Map<string, JogadorEquipe>();

    vagasDaLine.forEach((vaga) => {
      (jogadoresPorEquipe[vaga.id] || []).forEach((jogador) => {
        if (jogador.status === "ativo") jogadoresMap.set(jogador.id, jogador);
      });
    });

    return Array.from(jogadoresMap.values());
  }

  function adicionarJogadorLineBeta(equipe: Equipe, line: LineMobile) {
    setLinePickerAberto({ equipeId: equipe.id, lineId: line.id });
  }

  async function adicionarPerfilNaLineBeta(equipe: Equipe, line: LineMobile, perfil: PerfilJogo) {
    const vagaDaLine = inscricoesEquipe.find((vaga) => vaga.line_id === line.id && vaga.equipe_id === equipe.id);
    if (!vagaDaLine?.id) {
      alert("Esta line não possui vaga vinculada neste campeonato.");
      return;
    }

    try {
      const { data: jogadorId, error: garantirError } = await supabase.rpc(
        "fn_garantir_jogador_campeonato_vaga",
        {
          p_campeonato_id: campeonato.id,
          p_campeonato_equipe_id: vagaDaLine.id,
          p_perfil_jogo_id: perfil.id,
          p_jogador_avulso_id: null,
          p_criado_por: null,
        },
      );

      if (garantirError) throw garantirError;

      const jogadoresAtuais = jogadoresDaLineMobile(line.id);
      const tipoSlot =
        jogadoresAtuais.length < Number(campeonato.jogadores_por_equipe || 4)
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
        .eq("line_id", line.id)
        .eq("perfil_jogo_id", perfil.id)
        .maybeSingle();

      if (!existenteLine?.id) {
        const { data: ordemData } = await supabase
          .from("lines_jogadores")
          .select("ordem")
          .eq("line_id", line.id)
          .order("ordem", { ascending: false })
          .limit(1);

        const ordem = Math.max(0, Number((ordemData || [])[0]?.ordem ?? -1) + 1);

        const { error: lineError } = await supabase
          .from("lines_jogadores")
          .insert({
            line_id: line.id,
            perfil_jogo_id: perfil.id,
            jogador_avulso_id: null,
            tipo_slot: tipoSlot,
            ordem,
          });

        if (lineError) throw lineError;
      }

      const novoJogador: JogadorEquipe = {
        id: String(jogadorId),
        campeonato_id: campeonato.id,
        equipe_id: equipe.id,
        campeonato_equipe_id: vagaDaLine.id,
        perfil_jogo_id: perfil.id,
        jogador_avulso_id: null,
        status: "ativo",
        nick_snapshot: getNomePerfil(perfil),
        uid_jogo_snapshot: getUidPerfil(perfil),
        perfil,
        avulso: null,
      };

      setJogadoresPorEquipe((atual) => {
        const listaAtual = atual[vagaDaLine.id] || [];
        const semDuplicado = listaAtual.filter((item) => item.perfil_jogo_id !== perfil.id);

        return {
          ...atual,
          [vagaDaLine.id]: [...semDuplicado, novoJogador],
        };
      });

      setLinePickerAberto(null);
    } catch (error: any) {
      alert(error?.message || error?.details || "Erro ao adicionar jogador na line.");
    }
  }

  async function removerJogadorLineBeta(jogador: JogadorEquipe) {
    const confirmar = window.confirm("Remover este jogador da line?");
    if (!confirmar) return;

    try {
      setOperandoJogadorId(jogador.id);

      if (jogador.id) {
        const { error } = await supabase
          .from("jogadores_campeonato")
          .update({ status: "removido" })
          .eq("id", jogador.id);

        if (error) throw error;
      }

      setJogadoresPorEquipe((atual) => {
        const proximo: Record<string, JogadorEquipe[]> = {};

        Object.entries(atual).forEach(([vagaId, lista]) => {
          proximo[vagaId] = lista.map((item) =>
            item.id === jogador.id ? { ...item, status: "removido" } : item,
          );
        });

        return proximo;
      });
    } catch (error: any) {
      alert(error?.message || "Erro ao remover jogador da line.");
    } finally {
      setOperandoJogadorId(null);
    }
  }

  function adicionarManagerBeta() {
    if (!managerBusca.trim()) {
      alert("Digite o e-mail ou ID do manager.");
      return;
    }
    alert("Convite de manager será enviado aqui no beta.");
  }

  function removerManagerBeta() {
    alert("Remoção de manager será executada aqui no beta.");
  }

  async function removerJogadorElencoBeta(equipe: Equipe, perfil: PerfilJogo) {
    const confirmar = window.confirm(`Remover ${getNomePerfil(perfil)} do elenco da equipe?`);
    if (!confirmar) return;

    try {
      setOperandoJogadorId(perfil.id);

      const { error: membroError } = await supabase
        .from("membros_equipe")
        .update({
          ativo: false,
          saiu_em: new Date().toISOString(),
        })
        .eq("equipe_id", equipe.id)
        .eq("perfil_jogo_id", perfil.id)
        .eq("ativo", true);

      if (membroError) throw membroError;

      const { error: perfilError } = await supabase
        .from("perfis_jogo")
        .update({ equipe_id: null })
        .eq("id", perfil.id)
        .eq("equipe_id", equipe.id);

      if (perfilError) throw perfilError;

      const lineIds = (linesPorEquipe[equipe.id] || []).map((line) => line.id);
      if (lineIds.length) {
        await supabase
          .from("lines_jogadores")
          .update({ removido_em: new Date().toISOString() })
          .in("line_id", lineIds)
          .eq("perfil_jogo_id", perfil.id)
          .is("removido_em", null);
      }

      const vagasEquipe = inscricoesEquipe
        .filter((vaga) => vaga.equipe_id === equipe.id)
        .map((vaga) => vaga.id);

      if (vagasEquipe.length) {
        await supabase
          .from("jogadores_campeonato")
          .update({ status: "removido" })
          .in("campeonato_equipe_id", vagasEquipe)
          .eq("perfil_jogo_id", perfil.id);
      }

      setElencoPorEquipe((atual) => ({
        ...atual,
        [equipe.id]: (atual[equipe.id] || []).filter((item) => item.id !== perfil.id),
      }));

      setJogadoresPorEquipe((atual) => {
        const proximo: Record<string, JogadorEquipe[]> = {};

        Object.entries(atual).forEach(([vagaId, lista]) => {
          proximo[vagaId] = lista.map((jogador) =>
            jogador.perfil_jogo_id === perfil.id ? { ...jogador, status: "removido" } : jogador,
          );
        });

        return proximo;
      });

      setJogadorElencoSelecionado(null);
    } catch (error: any) {
      alert(error?.message || error?.details || "Erro ao remover jogador do elenco.");
    } finally {
      setOperandoJogadorId(null);
    }
  }

  async function adicionarJogadorElencoBeta(equipe: Equipe, perfil: PerfilJogo) {
    try {
      setOperandoJogadorId(perfil.id);

      const { error } = await supabase.rpc("enviar_convite_equipe", {
        p_equipe_id: equipe.id,
        p_perfil_jogo_id: perfil.id,
        p_mensagem: "Convite enviado pela central beta do campeonato.",
      });

      if (error) throw error;

      alert("Convite enviado para o jogador.");

      const conviteLocal: ConviteEquipeBeta = {
        id: `local-${perfil.id}-${Date.now()}`,
        equipe_id: equipe.id,
        perfil_jogo_id: perfil.id,
        status: "pendente",
        tipo: "convite",
        created_at: new Date().toISOString(),
        perfil,
      };

      setConvitesPorEquipe((atual) => ({
        ...atual,
        [equipe.id]: [
          conviteLocal,
          ...(atual[equipe.id] || []).filter(
            (convite) => convite.perfil_jogo_id !== perfil.id,
          ),
        ],
      }));

      setResultadosBuscaJogadorSite((atual) =>
        atual.filter((item) => item.id !== perfil.id),
      );

      setSubJogadoresAtiva("convites");
      setBuscaJogadorEquipe("");
    } catch (error: any) {
      alert(
        error?.message ||
          error?.details ||
          "Erro ao enviar convite para o jogador.",
      );
    } finally {
      setOperandoJogadorId(null);
    }
  }


  async function entrarNoLinkBeta() {
    const email = authEmail.trim().toLowerCase();

    if (!email || !authSenha) {
      setAuthMensagem("Digite e-mail e senha.");
      return;
    }

    setAuthProcessando(true);
    setAuthMensagem(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: authSenha,
      });

      if (error) throw error;

      setUsuarioLogado(data.user || null);
      setUserId(data.user?.id || null);
      setTipoAcesso(null);
      setAba("equipe");
      await carregar();
    } catch (error: any) {
      setAuthMensagem(error?.message || "Não foi possível entrar na conta.");
    } finally {
      setAuthProcessando(false);
    }
  }

  async function criarContaNoLinkBeta() {
    const email = authEmail.trim().toLowerCase();
    const nome = authNome.trim();

    if (!nome || !email || !authSenha) {
      setAuthMensagem("Informe nome, e-mail e senha para criar a conta.");
      return;
    }

    if (authSenha.length < 6) {
      setAuthMensagem("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (authSenha !== authConfirmarSenha) {
      setAuthMensagem("As senhas nao conferem.");
      return;
    }

    setAuthProcessando(true);
    setAuthMensagem(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: authSenha,
        options: {
          data: {
            username: nome,
            nome_exibicao: nome,
            nome,
          },
        },
      });

      if (error) throw error;

      if (data.session?.user) {
        setUsuarioLogado(data.session.user);
        setUserId(data.session.user.id);
        setTipoAcesso(null);
        setAba("equipe");
        await carregar();
        return;
      }

      setAuthOtpTipo("signup");
      setAuthModo("confirmar");
      setAuthMensagem("Conta criada. Digite o codigo de 6 digitos enviado para seu e-mail.");
    } catch (error: any) {
      setAuthMensagem(error?.message || "Nao foi possivel criar a conta.");
    } finally {
      setAuthProcessando(false);
    }
  }

  async function recuperarSenhaNoLinkBeta() {
    const email = authEmail.trim().toLowerCase();

    if (!email) {
      setAuthMensagem("Digite seu e-mail para recuperar a senha.");
      return;
    }

    setAuthProcessando(true);
    setAuthMensagem(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      setAuthOtpTipo("recovery");
      setAuthModo("confirmar");
      setAuthMensagem("Enviamos um codigo de 6 digitos para seu e-mail.");
    } catch (error: any) {
      setAuthMensagem(error?.message || "Nao foi possivel enviar a recuperacao.");
    } finally {
      setAuthProcessando(false);
    }
  }

  async function confirmarCodigoNoLinkBeta() {
    const email = authEmail.trim().toLowerCase();
    const token = authCodigo.replace(/\D/g, "");

    if (!email || token.length !== 6) {
      setAuthMensagem("Informe o codigo de 6 digitos enviado no e-mail.");
      return;
    }

    setAuthProcessando(true);
    setAuthMensagem(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: authOtpTipo,
      });

      if (error) throw error;

      setAuthCodigo("");

      if (authOtpTipo === "recovery") {
        setUsuarioLogado(data.user || null);
        setUserId(data.user?.id || null);
        setResetSenhaBeta(true);
        return;
      }

      setUsuarioLogado(data.user || null);
      setUserId(data.user?.id || null);
      setTipoAcesso(null);
      setAba("equipe");
      await carregar();
    } catch (error: any) {
      setAuthMensagem(error?.message || "Codigo invalido ou expirado.");
    } finally {
      setAuthProcessando(false);
    }
  }

  async function reenviarCodigoNoLinkBeta() {
    const email = authEmail.trim().toLowerCase();
    if (!email) {
      setAuthMensagem("Informe o e-mail para reenviar o codigo.");
      return;
    }

    setAuthProcessando(true);
    setAuthMensagem(null);

    try {
      const { error } = authOtpTipo === "signup"
        ? await supabase.auth.resend({ type: "signup", email })
        : await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;
      setAuthMensagem("Codigo reenviado para seu e-mail.");
    } catch (error: any) {
      setAuthMensagem(error?.message || "Nao foi possivel reenviar o codigo.");
    } finally {
      setAuthProcessando(false);
    }
  }

  function executarAuthLinkBeta() {
    if (authModo === "login") return entrarNoLinkBeta();
    if (authModo === "cadastro") return criarContaNoLinkBeta();
    if (authModo === "confirmar") return confirmarCodigoNoLinkBeta();
    return recuperarSenhaNoLinkBeta();
  }


  if (checkingAuth) {
    return (
      <main className="escala-beta-page grid min-h-screen place-items-center bg-[#f5f7fb] px-4 text-slate-950 [color-scheme:light]">
        <div className="border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          <Loader2 className="mr-2 inline animate-spin" size={16} /> Carregando
        </div>
      </main>
    );
  }

  if (!usuarioLogado) {
    return (
      <AuthLinkCampeonato
        modo={authModo}
        setModo={(modo) => {
          setAuthModo(modo);
          setAuthMensagem(null);
        }}
        email={authEmail}
        setEmail={setAuthEmail}
        senha={authSenha}
        setSenha={setAuthSenha}
        confirmarSenha={authConfirmarSenha}
        setConfirmarSenha={setAuthConfirmarSenha}
        codigo={authCodigo}
        setCodigo={setAuthCodigo}
        nome={authNome}
        setNome={setAuthNome}
        mensagem={authMensagem}
        loading={authProcessando}
        otpTipo={authOtpTipo}
        campeonatoNome={campeonato?.nome}
        onSubmit={executarAuthLinkBeta}
        onReenviarCodigo={reenviarCodigoNoLinkBeta}
        onVoltarInicio={() => window.location.href = "/"}
      />
    );
  }


  async function uploadFotoPerfilBeta(file: File | null) {
    if (!file) return;

    if (!userId) {
      alert("Faça login para enviar foto.");
      return;
    }

    try {
      setSalvandoFormularioBeta(true);

      const extensao = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const nomeArquivo = `${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extensao}`;
      const buckets = ["perfis-jogo", "perfil-jogo", "avatars", "imagens"];
      let publicUrl = "";
      let ultimoErro: any = null;

      for (const bucket of buckets) {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(nomeArquivo, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (!error) {
          const { data } = supabase.storage.from(bucket).getPublicUrl(nomeArquivo);
          publicUrl = data.publicUrl;
          break;
        }

        ultimoErro = error;
      }

      if (!publicUrl) {
        throw ultimoErro || new Error("Não foi possível enviar a foto.");
      }

      setFormPerfilBeta((atual) => ({
        ...atual,
        foto_capa: publicUrl,
      }));
    } catch (error: any) {
      alert(error?.message || error?.details || "Erro ao enviar foto do perfil.");
    } finally {
      setSalvandoFormularioBeta(false);
    }
  }

  async function salvarPerfilBeta() {
    const nick = formPerfilBeta.nick.trim();
    const uidJogo = formPerfilBeta.uid_jogo.trim();

    if (!userId) {
      alert("Faça login para criar perfil.");
      return;
    }

    if (!nick || !uidJogo) {
      alert("Informe nick e ID de jogo.");
      return;
    }

    try {
      setSalvandoFormularioBeta(true);

      const payload = {
        user_id: userId,
        nick,
        uid_jogo: uidJogo,
        servidor: formPerfilBeta.servidor || null,
        plataforma: formPerfilBeta.plataforma || "mobile",
        funcao: formPerfilBeta.funcao || null,
        foto_capa: formPerfilBeta.foto_capa.trim() || null,
        ativo: true,
      };

      if (perfilJogo?.id) {
        const { data, error } = await supabase
          .from("perfis_jogo")
          .update(payload)
          .eq("id", perfilJogo.id)
          .select("*")
          .single();

        if (error) throw error;
        setPerfilJogo(data as PerfilJogo);
      } else {
        const { data, error } = await supabase
          .from("perfis_jogo")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;
        setPerfilJogo(data as PerfilJogo);
      }

      setModoFormularioBeta(null);
    } catch (error: any) {
      alert(error?.message || error?.details || "Erro ao salvar perfil de jogo.");
    } finally {
      setSalvandoFormularioBeta(false);
    }
  }

  async function uploadLogoEquipeBeta(file: File | null) {
    if (!file) return;

    if (!userId) {
      alert("Faça login para enviar logo.");
      return;
    }

    try {
      setSalvandoFormularioBeta(true);

      const extensao = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const nomeArquivo = `${userId}/equipes/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extensao}`;
      const buckets = ["equipes", "logos-equipes", "imagens", "avatars"];
      let publicUrl = "";
      let ultimoErro: any = null;

      for (const bucket of buckets) {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(nomeArquivo, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (!error) {
          const { data } = supabase.storage.from(bucket).getPublicUrl(nomeArquivo);
          publicUrl = data.publicUrl;
          break;
        }

        ultimoErro = error;
      }

      if (!publicUrl) {
        throw ultimoErro || new Error("Não foi possível enviar a logo.");
      }

      setFormEquipeBeta((atual) => ({
        ...atual,
        logo_url: publicUrl,
      }));
    } catch (error: any) {
      alert(error?.message || error?.details || "Erro ao enviar logo da equipe.");
    } finally {
      setSalvandoFormularioBeta(false);
    }
  }

  async function salvarEquipeBeta() {
    const nome = formEquipeBeta.nome.trim();

    if (!userId) {
      alert("Faça login para criar equipe.");
      return;
    }

    if (!nome) {
      alert("Informe o nome da equipe.");
      return;
    }

    try {
      setSalvandoFormularioBeta(true);

      const payload = {
        nome,
        tag: formEquipeBeta.tag.trim() || null,
        servidor: formEquipeBeta.servidor || "BR",
        logo_url: formEquipeBeta.logo_url.trim() || null,
        descricao: formEquipeBeta.descricao.trim() || null,
        criado_por: userId,
      };

      const { data, error } = await supabase
        .from("equipes")
        .insert(payload)
        .select("id,nome,tag,logo_url,criado_por,servidor")
        .single();

      if (error) throw error;

      const equipeCriada = data as Equipe;

      await supabase
        .from("membros_equipe")
        .insert({
          equipe_id: equipeCriada.id,
          user_id: userId,
          tipo: "dono",
          ativo: true,
          entrou_em: new Date().toISOString(),
        });

      setEquipes((atual) => [equipeCriada, ...atual]);
      setEquipeSelecionadaId(equipeCriada.id);
      setModoFormularioBeta(null);
    } catch (error: any) {
      alert(error?.message || error?.details || "Erro ao criar equipe.");
    } finally {
      setSalvandoFormularioBeta(false);
    }
  }




  if (loading) {
    return (
      <main className="escala-beta-page grid min-h-screen place-items-center bg-[#f5f7fb] px-4 text-slate-950 [color-scheme:light]">
        <div className="border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          <Loader2 className="mr-2 inline animate-spin" size={16} /> Carregando
          link
        </div>
      </main>
    );
  }

  if (!campeonato) {
    return (
      <main className="escala-beta-page grid min-h-screen place-items-center bg-[#f5f7fb] px-4 text-slate-950 [color-scheme:light]">
        <div className="w-full max-w-sm border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-lg font-black uppercase tracking-[-0.03em]">
            Campeonato não encontrado
          </h1>
          <Link
            href="#"
            className="mt-4 inline-flex h-11 items-center justify-center border border-blue-600 bg-blue-600 px-5 text-xs font-black uppercase text-white"
          >
            Voltar ao painel
          </Link>
        </div>
      </main>
    );
  }



  if (resetSenhaBeta) {
    return (
      <main className="escala-beta-page flex min-h-screen items-center justify-center bg-slate-50 px-3 py-4 text-slate-950 [color-scheme:light]">
        <section className="w-full max-w-md overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-slate-950 p-4 text-white">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#2563eb_0,transparent_28%),linear-gradient(135deg,transparent_0_45%,rgba(255,255,255,.12)_45%_47%,transparent_47%)]" />
            <div className="relative">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-300">
                Recuperação de senha
              </p>
              <h1 className="mt-1 text-xl font-black uppercase tracking-[-0.05em]">
                Definir nova senha
              </h1>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
                Digite uma nova senha para continuar usando o link do campeonato.
              </p>
            </div>
          </div>

          <div className="grid gap-2 bg-white p-3 dark:bg-black">
            <input
              value={novaSenhaBeta}
              onChange={(event) => setNovaSenhaBeta(event.target.value)}
              placeholder="Nova senha"
              type="password"
              className="h-11 border border-slate-200 bg-white px-3 text-xs font-bold text-slate-950 outline-none dark:border-zinc-700 dark:bg-black dark:text-white dark:placeholder:text-slate-500"
            />

            <input
              value={confirmarNovaSenhaBeta}
              onChange={(event) => setConfirmarNovaSenhaBeta(event.target.value)}
              placeholder="Confirmar nova senha"
              type="password"
              className="h-11 border border-slate-200 bg-white px-3 text-xs font-bold text-slate-950 outline-none dark:border-zinc-700 dark:bg-black dark:text-white dark:placeholder:text-slate-500"
            />

            <button
              type="button"
              disabled={authLoadingBeta}
              onClick={salvarNovaSenhaBeta}
              className="flex h-12 items-center justify-center gap-2 border border-blue-600 bg-blue-600 text-xs font-black uppercase text-white shadow-sm disabled:opacity-60"
            >
              {authLoadingBeta ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              Salvar nova senha
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="escala-beta-page min-h-screen bg-white px-2 py-2 text-slate-950 [color-scheme:light] dark:bg-black dark:text-white dark:[color-scheme:dark]">
      <div className="mx-auto max-w-md pb-5">
        {tipoAcesso !== "jogador" ? (
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
        ) : null}

        {!userId ? (
          <div className="mt-3 overflow-hidden rounded-[36px]">
            <AuthLinkCampeonato
              modo={authModoBeta}
              setModo={setAuthModoBeta}
              email={authEmailBeta}
              setEmail={setAuthEmailBeta}
              senha={authSenhaBeta}
              setSenha={setAuthSenhaBeta}
              confirmarSenha={authConfirmarSenhaBeta}
              setConfirmarSenha={setAuthConfirmarSenhaBeta}
              codigo={authCodigoBeta}
              setCodigo={setAuthCodigoBeta}
              nome={authNomeBeta}
              setNome={setAuthNomeBeta}
              loading={authLoadingBeta}
              campeonatoNome={campeonato.nome}
              onSubmit={
                authModoBeta === "login"
                  ? entrarContaBeta
                  : authModoBeta === "cadastro"
                    ? criarContaBeta
                    : authModoBeta === "confirmar"
                      ? confirmarCodigoCadastroBeta
                      : recuperarSenhaBeta
              }
              onReenviarCodigo={reenviarCodigoCadastroBeta}
              onVoltarInicio={() => window.location.href = "/"}
              className="min-h-0 rounded-[36px] px-0 py-0"
            />
          </div>
        ) : (
          <>
            <div className="mt-2">
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUserId(null);
                  setTipoAcesso(null);
                  setAba("equipe");
                }}
                className="flex h-10 w-full items-center justify-center border border-red-200 bg-red-50 text-[10px] font-black uppercase tracking-[0.16em] text-red-600"
              >
                Sair da conta
              </button>
            </div>

            {!tipoAcesso ? (
              <section className="mt-2">
                <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-600">
                      Acesso beta
                    </p>
                    <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.05em] text-slate-950">
                      Como você quer entrar?
                    </h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      Escolha uma área para abrir somente as ferramentas necessárias.
                    </p>
                  </div>

                  <div className="grid gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoAcesso("jogador");
                        setAba("jogador");
                      }}
                      className="group relative overflow-hidden border border-slate-200 bg-white p-0 text-left shadow-sm transition hover:border-blue-500"
                    >
                      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(135deg,rgba(37,99,235,.08)_0_25%,transparent_25%_50%,rgba(37,99,235,.06)_50%_75%,transparent_75%)] [background-size:24px_24px]" />
                      <div className="relative flex min-h-[96px] items-center gap-3 p-3">
                        <div className="grid h-14 w-14 shrink-0 place-items-center border border-blue-200 bg-blue-50 text-blue-600">
                          <Gamepad2 size={26} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                            Jogador
                          </p>
                          <h3 className="mt-1 text-lg font-black uppercase tracking-[-0.04em] text-slate-950">
                            Perfil competitivo
                          </h3>
                          <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                            Perfil, convites, pedidos, equipe e agenda.
                          </p>
                        </div>
                        <ChevronRight size={20} className="text-blue-600 transition group-hover:translate-x-1" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTipoAcesso("equipe");
                        setAba("equipe");
                      }}
                      className="group relative overflow-hidden border border-blue-700 bg-slate-950 p-0 text-left text-white shadow-sm transition hover:border-blue-500"
                    >
                      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_20%,rgba(37,99,235,.55)_0,transparent_35%),linear-gradient(135deg,transparent_0_44%,rgba(255,255,255,.12)_44%_46%,transparent_46%)]" />
                      <div className="relative flex min-h-[96px] items-center gap-3 p-3">
                        <div className="grid h-14 w-14 shrink-0 place-items-center border border-white/15 bg-white/10 text-blue-200">
                          <Users size={26} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">
                            Equipe
                          </p>
                          <h3 className="mt-1 text-lg font-black uppercase tracking-[-0.04em]">
                            Gestão da equipe
                          </h3>
                          <p className="mt-1 text-[11px] font-semibold leading-4 text-blue-100">
                            Equipes próprias, equipes como manager, lines e escalação.
                          </p>
                        </div>
                        <ChevronRight size={20} className="text-blue-200 transition group-hover:translate-x-1" />
                      </div>
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <>
                {modoFormularioBeta === "perfil" ? (
                  <section className="mt-2 border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                          Perfil de jogo
                        </p>
                        <h2 className="text-lg font-black uppercase tracking-[-0.04em] text-slate-950">
                          {perfilJogo ? "Editar perfil" : "Criar perfil"}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModoFormularioBeta(null)}
                        className="h-8 border border-slate-200 bg-white px-2 text-[8px] font-black uppercase text-slate-500"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="grid gap-2">
                      <CampoBeta
                        label="Nick"
                        value={formPerfilBeta.nick}
                        onChange={(value) => setFormPerfilBeta((atual) => ({ ...atual, nick: value }))}
                        placeholder="Nick do jogador"
                      />
                      <CampoBeta
                        label="ID de jogo / UID"
                        value={formPerfilBeta.uid_jogo}
                        onChange={(value) => setFormPerfilBeta((atual) => ({ ...atual, uid_jogo: value }))}
                        placeholder="Ex: 239387947"
                      />
                      <label className="block">
                        <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Servidor
                        </span>
                        <select
                          value={formPerfilBeta.servidor}
                          onChange={(event) =>
                            setFormPerfilBeta((atual) => ({
                              ...atual,
                              servidor: event.target.value,
                            }))
                          }
                          disabled={salvandoFormularioBeta}
                          className="h-10 w-full border border-slate-200 bg-white px-2 text-xs font-bold uppercase outline-none disabled:opacity-60"
                        >
                          {SERVIDORES_FREE_FIRE.map((servidor) => (
                            <option key={servidor.value} value={servidor.value}>
                              {servidor.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Plataforma
                          </span>
                          <select
                            value={formPerfilBeta.plataforma}
                            onChange={(event) => setFormPerfilBeta((atual) => ({ ...atual, plataforma: event.target.value }))}
                            className="h-10 w-full border border-slate-200 bg-white px-2 text-xs font-bold uppercase outline-none"
                          >
                            <option value="mobile">Mobile</option>
                            <option value="emulador">Emulador</option>
                            <option value="misto">Misto</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Função
                          </span>
                          <select
                            value={formPerfilBeta.funcao}
                            onChange={(event) => setFormPerfilBeta((atual) => ({ ...atual, funcao: event.target.value }))}
                            className="h-10 w-full border border-slate-200 bg-white px-2 text-xs font-bold uppercase outline-none"
                          >
                            <option value="">Não definido</option>
                            <option value="rush">Rush</option>
                            <option value="suporte">Suporte</option>
                            <option value="granadeiro">Granadeiro</option>
                            <option value="capitao">Capitão</option>
                            <option value="sniper">Sniper</option>
                          </select>
                        </label>
                      </div>
                      <label className="block">
                        <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Foto do perfil
                        </span>
                        <div className="flex items-center gap-2 border border-slate-200 bg-white p-2">
                          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-100 text-blue-600">
                            {formPerfilBeta.foto_capa ? (
                              <img
                                src={formPerfilBeta.foto_capa}
                                alt="Foto do perfil"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserRound size={22} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) =>
                                uploadFotoPerfilBeta(event.target.files?.[0] || null)
                              }
                              className="w-full text-[10px] font-bold uppercase text-slate-500 file:mr-2 file:h-8 file:border-0 file:bg-blue-600 file:px-3 file:text-[8px] file:font-black file:uppercase file:text-white"
                            />
                            <p className="mt-1 text-[8px] font-bold uppercase text-slate-400">
                              Envie uma imagem para aparecer no card do jogador.
                            </p>
                          </div>
                        </div>
                      </label>

                      <button
                        type="button"
                        disabled={salvandoFormularioBeta}
                        onClick={salvarPerfilBeta}
                        className="mt-1 h-11 border border-blue-600 bg-blue-600 text-xs font-black uppercase text-white disabled:opacity-50"
                      >
                        {salvandoFormularioBeta ? "Salvando..." : "Salvar perfil"}
                      </button>
                    </div>
                  </section>
                ) : null}

                {modoFormularioBeta === "equipe" ? (
                  <FormCriarEquipe
                    modal
                    onCancel={() => setModoFormularioBeta(null)}
                    onSuccess={async (equipeCriada) => {
                      setModoFormularioBeta(null);
                      if (equipeCriada?.id) {
                        setEquipeSelecionadaId(equipeCriada.id);
                      }
                      await carregar();
                    }}
                  />
                ) : null}

                <section className="mt-2 flex flex-wrap items-center justify-end gap-1">
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
                </section>

                {(tipoAcesso === "equipe") && equipes.length > 1 ? (
                  <section className="mt-2 border border-slate-200 bg-white p-2">
                    <p className="mb-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Selecionar equipe
                    </p>
                    <select
                      value={equipeSelecionadaId || ""}
                      onChange={(event) => setEquipeSelecionadaId(event.target.value || null)}
                      className="h-10 w-full border border-slate-200 bg-white px-2 text-xs font-black uppercase outline-none"
                    >
                      <option value="">Todas as equipes vinculadas</option>
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
                  <div className="border border-slate-200 bg-white p-4 text-center">
                    <h3 className="text-sm font-black uppercase text-slate-950">Você ainda não tem equipe</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Crie sua organização direto pelo link beta.</p>
                    <button
                      type="button"
                      onClick={() => setModoFormularioBeta("equipe")}
                      className="mt-3 h-10 w-full border border-blue-600 bg-blue-600 text-xs font-black uppercase text-white"
                    >
                      Criar equipe
                    </button>
                  </div>
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
                  <div className="border border-slate-200 bg-white p-4 text-center">
                    <h3 className="text-sm font-black uppercase text-slate-950">Você ainda não tem equipe</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Crie sua organização direto pelo link beta.</p>
                    <button
                      type="button"
                      onClick={() => setModoFormularioBeta("equipe")}
                      className="mt-3 h-10 w-full border border-blue-600 bg-blue-600 text-xs font-black uppercase text-white"
                    >
                      Criar equipe
                    </button>
                  </div>
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

                        <div className="mt-2 grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setPainelEquipeAtivo("jogadores")}
                            className={`h-9 border px-2 text-[9px] font-black uppercase ${
                              painelEquipeAtivo === "jogadores"
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-800"
                            }`}
                          >
                            Jogadores
                          </button>
                          <button
                            type="button"
                            onClick={() => setPainelEquipeAtivo("lideres")}
                            className={`h-9 border px-2 text-[9px] font-black uppercase ${
                              painelEquipeAtivo === "lideres"
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-800"
                            }`}
                          >
                            Líderes
                          </button>
                        </div>

                        {painelEquipeAtivo === "jogadores" ? (
                          <div className="mt-2 border border-slate-200 bg-white p-2">
                            <div className="grid grid-cols-4 gap-1">
                              <button
                                type="button"
                                onClick={() => setSubJogadoresAtiva("elenco")}
                                className={`h-8 border px-1 text-[8px] font-black uppercase ${
                                  subJogadoresAtiva === "elenco"
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-200 bg-white text-slate-700"
                                }`}
                              >
                                Elenco
                              </button>
                              <button
                                type="button"
                                onClick={() => setSubJogadoresAtiva("convites")}
                                className={`h-8 border px-1 text-[8px] font-black uppercase ${
                                  subJogadoresAtiva === "convites"
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-200 bg-white text-slate-700"
                                }`}
                              >
                                Convites
                              </button>
                              <button
                                type="button"
                                onClick={() => setSubJogadoresAtiva("pedidos")}
                                className={`h-8 border px-1 text-[8px] font-black uppercase ${
                                  subJogadoresAtiva === "pedidos"
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-200 bg-white text-slate-700"
                                }`}
                              >
                                Pedidos
                              </button>
                            </div>

                            {subJogadoresAtiva === "elenco" ? (
                              <div className="mt-2 border border-slate-200 bg-slate-50">
                                <div className="border-b border-slate-200 bg-white p-1.5">
                                  <input
                                    value={buscaJogadorEquipe}
                                    onChange={(event) => setBuscaJogadorEquipe(event.target.value)}
                                    placeholder="Digite para filtrar por nick ou ID de jogo"
                                    className="h-9 w-full border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold uppercase text-slate-700 outline-none"
                                  />
                                  {buscandoJogadorSite ? (
                                    <p className="mt-1 text-[8px] font-black uppercase text-blue-600">
                                      Pesquisando...
                                    </p>
                                  ) : null}
                                </div>

                                <div className="divide-y divide-slate-100">
                                  {(elencoPorEquipe[equipe.id] || [])
                                    .filter((perfil) => {
                                      const busca = buscaJogadorEquipe.trim().toLowerCase();
                                      if (!busca) return true;

                                      const nome = String(getNomePerfil(perfil) || "").toLowerCase();
                                      const uid = String(getUidPerfil(perfil) || "").toLowerCase();

                                      return nome.includes(busca) || uid.includes(busca);
                                    }).length ? (
                                    (elencoPorEquipe[equipe.id] || [])
                                      .filter((perfil) => {
                                        const busca = buscaJogadorEquipe.trim().toLowerCase();
                                        if (!busca) return true;

                                        const nome = String(getNomePerfil(perfil) || "").toLowerCase();
                                        const uid = String(getUidPerfil(perfil) || "").toLowerCase();

                                        return nome.includes(busca) || uid.includes(busca);
                                      })
                                      .map((perfil) => (
                                        <div
                                          key={perfil.id}
                                          className={`bg-white px-2 py-1.5 ${
                                            jogadorElencoSelecionado === perfil.id ? "ring-1 ring-blue-600" : ""
                                          }`}
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setJogadorElencoSelecionado(
                                                jogadorElencoSelecionado === perfil.id ? null : perfil.id,
                                              )
                                            }
                                            className="flex w-full items-center gap-2 text-left"
                                          >
                                            <div className="h-8 w-8 overflow-hidden border border-slate-200 bg-slate-100">
                                              {perfil.foto_capa ? (
                                                <img
                                                  src={perfil.foto_capa}
                                                  alt={getNomePerfil(perfil)}
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : null}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate text-[10px] font-black uppercase text-slate-950">
                                                {getNomePerfil(perfil)}
                                              </p>
                                              <p className="text-[8px] font-bold uppercase text-slate-500">
                                                UID {getUidPerfil(perfil)}
                                              </p>
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-blue-600">
                                              {jogadorElencoSelecionado === perfil.id ? "Selecionado" : "Jogador"}
                                            </span>
                                          </button>

                                          {jogadorElencoSelecionado === perfil.id ? (
                                            <button
                                              type="button"
                                              onClick={() => removerJogadorElencoBeta(equipe, perfil)}
                                              disabled={operandoJogadorId === perfil.id}
                                              className="mt-1 h-8 w-full border border-red-200 bg-red-50 text-[8px] font-black uppercase text-red-600"
                                            >
                                              Remover do elenco
                                            </button>
                                          ) : null}
                                        </div>
                                      ))
                                  ) : resultadosBuscaJogadorSite.filter((perfil) => perfil.equipe_id !== equipe.id).length ? (
                                    resultadosBuscaJogadorSite
                                      .filter((perfil) => perfil.equipe_id !== equipe.id)
                                      .map((perfil) => (
                                        <div key={perfil.id} className="flex items-center gap-2 bg-white px-2 py-1.5">
                                          <div className="h-8 w-8 overflow-hidden border border-slate-200 bg-slate-100">
                                            {perfil.foto_capa ? (
                                              <img
                                                src={perfil.foto_capa}
                                                alt={getNomePerfil(perfil)}
                                                className="h-full w-full object-cover"
                                              />
                                            ) : null}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-[10px] font-black uppercase text-slate-950">
                                              {getNomePerfil(perfil)}
                                            </p>
                                            <p className="text-[8px] font-bold uppercase text-slate-500">
                                              UID {getUidPerfil(perfil)}
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            disabled={operandoJogadorId === perfil.id}
                                            onClick={() => adicionarJogadorElencoBeta(equipe, perfil)}
                                            className="h-8 border border-blue-600 bg-blue-600 px-2 text-[8px] font-black uppercase text-white disabled:opacity-50"
                                          >
                                            Adicionar
                                          </button>
                                        </div>
                                      ))
                                  ) : (
                                    <div className="p-2 text-center text-[10px] font-bold text-slate-500">
                                      Nenhum jogador encontrado.
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}

                            {subJogadoresAtiva === "convites" ? (
                              <div className="mt-2 border border-slate-200 bg-slate-50">
                                {(convitesPorEquipe[equipe.id] || []).length ? (
                                  <div className="divide-y divide-slate-100">
                                    {(convitesPorEquipe[equipe.id] || []).map((convite) => {
                                      const perfil = convite.perfil;

                                      return (
                                        <div
                                          key={convite.id}
                                          className="flex items-center gap-2 bg-white px-2 py-1.5"
                                        >
                                          <div className="h-8 w-8 overflow-hidden border border-slate-200 bg-slate-100">
                                            {perfil?.foto_capa ? (
                                              <img
                                                src={perfil.foto_capa}
                                                alt={getNomePerfil(perfil)}
                                                className="h-full w-full object-cover"
                                              />
                                            ) : null}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-[10px] font-black uppercase text-slate-950">
                                              {getNomePerfil(perfil, "Jogador")}
                                            </p>
                                            <p className="text-[8px] font-bold uppercase text-slate-500">
                                              UID {getUidPerfil(perfil)}
                                            </p>
                                          </div>
                                          <span className="text-[8px] font-black uppercase text-amber-600">
                                            Pendente
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="border border-dashed border-slate-200 bg-white p-2 text-center text-[10px] font-bold text-slate-500">
                                    Nenhum convite enviado.
                                  </div>
                                )}
                              </div>
                            ) : null}

                            {subJogadoresAtiva === "pedidos" ? (
                              <div className="mt-2 border border-dashed border-slate-200 bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-500">
                                Lista de pedidos recebidos será exibida aqui.
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {painelEquipeAtivo === "lideres" ? (
                          <div className="mt-2 border border-slate-200 bg-white p-2">
                            <p className="mb-2 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Líderes / Managers
                            </p>
                            <div className="flex gap-1">
                              <input
                                value={managerBusca}
                                onChange={(event) => setManagerBusca(event.target.value)}
                                placeholder="E-mail ou ID do líder/manager"
                                className="min-w-0 flex-1 border border-slate-200 bg-white px-2 text-[10px] font-bold outline-none"
                              />
                              <button
                                type="button"
                                onClick={adicionarManagerBeta}
                                className="h-9 border border-blue-600 bg-blue-600 px-2 text-[8px] font-black uppercase text-white"
                              >
                                Adicionar
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={removerManagerBeta}
                              className="mt-1 h-8 w-full border border-red-200 bg-red-50 text-[8px] font-black uppercase text-red-600"
                            >
                              Remover líder/manager selecionado
                            </button>
                          </div>
                        ) : null}

                        {painelEquipeAtivo === "jogadores" ? (
                          <>
                        {(() => {
                          const linhas = linesPorEquipe[equipe.id] || [];
                          const lineAtivaId = lineSelecionadaPorEquipe[equipe.id] || linhas[0]?.id || "";
                          const lineAtiva = linhas.find((line) => line.id === lineAtivaId) || linhas[0];
                          const jogadoresLine = jogadoresDaLineMobile(lineAtiva?.id);

                          return (
                            <div className="mt-2 space-y-2">
                              <div className="border border-slate-200 bg-slate-50 p-2">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                    Lines da equipe
                                  </p>
                                  <button
                                    type="button"
                                    className="h-7 border border-blue-600 bg-blue-600 px-2 text-[8px] font-black uppercase text-white"
                                    onClick={() => alert("Criação de line será adicionada depois dos formulários princiservidor.")}
                                  >
                                    + Line
                                  </button>
                                </div>

                                {linhas.length ? (
                                  <div className="flex gap-1 overflow-x-auto pb-1">
                                    {linhas.map((line) => {
                                      const ativa = line.id === lineAtiva?.id;
                                      const total = jogadoresDaLineMobile(line.id).length;

                                      return (
                                        <button
                                          key={line.id}
                                          type="button"
                                          onClick={() =>
                                            setLineSelecionadaPorEquipe((atual) => ({
                                              ...atual,
                                              [equipe.id]: line.id,
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
                                            {line.nome}
                                          </p>
                                          <p className={["mt-0.5 text-[8px] font-black", ativa ? "text-blue-100" : "text-blue-600"].join(" ")}>
                                            {total} jogador{total === 1 ? "" : "es"}
                                          </p>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="border border-dashed border-slate-200 bg-white p-2 text-center text-[10px] font-bold text-slate-500">
                                    Nenhuma line ativa encontrada.
                                  </div>
                                )}
                              </div>

                              {lineAtiva ? (
                                <div className="border border-slate-200 bg-white">
                                  <div className="flex items-center justify-between border-b border-slate-200 px-2 py-1.5">
                                    <div className="min-w-0">
                                      <p className="truncate text-[10px] font-black uppercase text-slate-950">
                                        {lineAtiva.nome}
                                      </p>
                                      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-600">
                                        Line selecionada
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => adicionarJogadorLineBeta(equipe, lineAtiva)}
                                      className="h-8 border border-blue-600 bg-blue-600 px-2 text-[8px] font-black uppercase text-white"
                                    >
                                      + Jogador
                                    </button>
                                  </div>

                                  {jogadoresLine.length ? (
                                    <div className="divide-y divide-slate-100">
                                      {jogadoresLine.map((jogador) => (
                                        <div key={jogador.id} className="flex items-center gap-2 px-2 py-1.5">
                                          <div className="h-8 w-8 overflow-hidden border border-slate-200 bg-slate-100">
                                            {getFotoJogador(jogador) ? (
                                              <img
                                                src={getFotoJogador(jogador) || ""}
                                                alt={getNomeJogador(jogador)}
                                                className="h-full w-full object-cover"
                                              />
                                            ) : null}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-[10px] font-black uppercase text-slate-950">
                                              {getNomeJogador(jogador)}
                                            </p>
                                            <p className="text-[8px] font-bold uppercase text-slate-500">
                                              UID {getUidJogador(jogador)}
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => removerJogadorLineBeta(jogador)}
                                            disabled={operandoJogadorId === jogador.id}
                                            className="h-7 border border-red-200 bg-red-50 px-2 text-[8px] font-black uppercase text-red-600"
                                          >
                                            Remover
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="border-t border-slate-100 p-2 text-center text-[10px] font-bold text-slate-500">
                                      Nenhum jogador nesta line.
                                    </div>
                                  )}
                                </div>
                              ) : null}

                              {lineAtiva && linePickerAberto?.equipeId === equipe.id && linePickerAberto?.lineId === lineAtiva.id ? (
                                <div className="border border-blue-200 bg-blue-50 p-2">
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-600">
                                      Adicionar jogador na line
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setLinePickerAberto(null)}
                                      className="h-7 border border-slate-200 bg-white px-2 text-[8px] font-black uppercase text-slate-500"
                                    >
                                      Fechar
                                    </button>
                                  </div>

                                  {(elencoPorEquipe[equipe.id] || []).filter((perfil) => {
                                    const usados = new Set(jogadoresLine.map((jogador) => jogador.perfil_jogo_id).filter(Boolean));
                                    return perfil.id && !usados.has(perfil.id);
                                  }).length ? (
                                    <div className="space-y-1">
                                      {(elencoPorEquipe[equipe.id] || [])
                                        .filter((perfil) => {
                                          const usados = new Set(jogadoresLine.map((jogador) => jogador.perfil_jogo_id).filter(Boolean));
                                          return perfil.id && !usados.has(perfil.id);
                                        })
                                        .slice(0, 20)
                                        .map((perfil) => (
                                          <button
                                            key={perfil.id}
                                            type="button"
                                            onClick={() => adicionarPerfilNaLineBeta(equipe, lineAtiva, perfil)}
                                            className="flex w-full items-center gap-2 border border-slate-200 bg-white p-1.5 text-left"
                                          >
                                            <div className="h-8 w-8 overflow-hidden border border-slate-200 bg-slate-100">
                                              {perfil.foto_capa ? (
                                                <img
                                                  src={perfil.foto_capa}
                                                  alt={getNomePerfil(perfil)}
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : null}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate text-[10px] font-black uppercase text-slate-950">
                                                {getNomePerfil(perfil)}
                                              </p>
                                              <p className="text-[8px] font-bold uppercase text-slate-500">
                                                UID {getUidPerfil(perfil)}
                                              </p>
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-blue-600">
                                              Adicionar
                                            </span>
                                          </button>
                                        ))}
                                    </div>
                                  ) : (
                                    <div className="border border-dashed border-blue-200 bg-white p-2 text-center text-[10px] font-bold text-slate-500">
                                      Nenhum jogador disponível no elenco.
                                    </div>
                                  )}
                                </div>
                              ) : null}


                            </div>
                          );
                        })()}
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </section>
            ) : null}

            {aba === "jogador" ? (
              <section className="mt-2 space-y-2">
                {!perfilJogo && modoFormularioBeta !== "perfil" ? (
                  <div className="border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                      Perfil de jogo
                    </p>
                    <h2 className="mt-1 text-lg font-black uppercase tracking-[-0.04em] text-slate-950">
                      Você ainda não tem perfil
                    </h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      Crie ou entre com seu perfil de jogo para aceitar convites, enviar pedidos e ver agenda.
                    </p>
                    <button
                      type="button"
                      className="mt-3 flex h-10 w-full items-center justify-center gap-1 border border-blue-600 bg-blue-600 text-[10px] font-black uppercase text-white"
                      onClick={() => { setFormPerfilBeta((atual) => ({ ...atual, nick: perfilJogo?.nick || "", uid_jogo: perfilJogo?.uid_jogo || "", servidor: perfilJogo?.servidor || "BR", plataforma: perfilJogo?.plataforma || "mobile", funcao: perfilJogo?.funcao || "", foto_capa: perfilJogo?.foto_capa || "" })); setModoFormularioBeta("perfil"); }}
                    >
                      <Edit3 size={14} /> Criar perfil
                    </button>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
                    <div className="relative h-28 bg-gradient-to-r from-slate-900 to-blue-700">
                      {getCapaPerfilMobile(perfilJogo) ? (
                        <img
                          src={getCapaPerfilMobile(perfilJogo) || ""}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
                        <div className="h-16 w-16 overflow-hidden border-2 border-white bg-slate-100 shadow-sm">
                          {getFotoPerfilMobile(perfilJogo) ? (
                            <img
                              src={getFotoPerfilMobile(perfilJogo) || ""}
                              alt={getNomePerfil(perfilJogo)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-blue-600">
                              <UserRound size={26} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pb-1 text-white">
                          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-blue-100">
                            Perfil de jogo
                          </p>
                          <h2 className="truncate text-xl font-black uppercase tracking-[-0.05em]">
                            {getNomePerfil(perfilJogo)}
                          </h2>
                          <p className="text-[10px] font-bold text-blue-100">
                            UID {getUidPerfil(perfilJogo)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="mb-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setTipoAcesso(null);
                            setEquipeSelecionadaId(null);
                            setAba("equipe");
                          }}
                          className="inline-flex h-7 items-center justify-center border border-blue-600 bg-blue-600 px-3 text-[8px] font-black uppercase text-white"
                          title="Trocar perfil de acesso"
                        >
                          Jogador
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <InfoBox
                          label="Status"
                          value={jogadorNoCampeonato ? "Inscrito" : "Não inscrito"}
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
                        <button
                          type="button"
                          className="flex h-10 items-center justify-center gap-1 border border-blue-600 bg-blue-600 text-[10px] font-black uppercase text-white"
                          onClick={() => setModoFormularioBeta("perfil")}
                        >
                          <Edit3 size={14} /> Editar perfil
                        </button>
                        <button
                          type="button"
                          className="flex h-10 items-center justify-center gap-1 border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-800"
                          onClick={() =>
                            setSubAbaJogadorEquipe((atual) =>
                              atual === "convites" ? "pedidos" : "convites",
                            )
                          }
                        >
                          <MailPlus size={14} /> Convites/Pedidos
                        </button>
                      </div>

                      <div className="mt-3 border border-slate-200 bg-white p-2">
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setSubAbaJogadorEquipe("convites")}
                            className={`h-8 border px-1 text-[8px] font-black uppercase ${
                              subAbaJogadorEquipe === "convites"
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            Convites
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubAbaJogadorEquipe("pedidos")}
                            className={`h-8 border px-1 text-[8px] font-black uppercase ${
                              subAbaJogadorEquipe === "pedidos"
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            Pedidos
                          </button>
                        </div>

                        {subAbaJogadorEquipe === "convites" ? (
                          <div className="mt-2 space-y-1">
                            {convitesDoPerfilJogador.length ? (
                              convitesDoPerfilJogador.map((convite) => {
                                const equipe = normalizarEquipeBeta(convite.equipe);

                                return (
                                  <div
                                    key={convite.id}
                                    className="flex items-center gap-2 border border-slate-200 bg-slate-50 p-2"
                                  >
                                    <Logo url={equipe?.logo_url} nome={equipe?.nome || "Equipe"} />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-[10px] font-black uppercase text-slate-950">
                                        {equipe?.tag ? `[${equipe.tag}] ` : ""}
                                        {equipe?.nome || "Equipe"}
                                      </p>
                                      <p className="text-[8px] font-bold uppercase text-slate-500">
                                        {formatarData(convite.created_at)}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={processandoConviteJogadorId === convite.id}
                                      onClick={() => responderConviteJogador(convite.id, "aceito")}
                                      className="flex h-10 w-10 items-center justify-center border border-emerald-700 bg-emerald-500 px-2 text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
                                      title="Aceitar convite"
                                    >
                                      <span className="text-[18px] font-black leading-none text-white">✓</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={processandoConviteJogadorId === convite.id}
                                      onClick={() => responderConviteJogador(convite.id, "recusado")}
                                      className="flex h-10 w-10 items-center justify-center border border-red-700 bg-red-500 px-2 text-white shadow-sm hover:bg-red-600 disabled:opacity-60"
                                      title="Recusar convite"
                                    >
                                      <span className="text-[18px] font-black leading-none text-white">×</span>
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="border border-dashed border-slate-200 bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-500">
                                Nenhum convite pendente.
                              </div>
                            )}
                          </div>
                        ) : null}

                        {subAbaJogadorEquipe === "pedidos" ? (
                          <div className="mt-2 space-y-2">
                            {equipePrincipalDoJogador?.id ? (
                              <div className="border border-slate-200 bg-slate-50 p-2 text-[10px] font-bold uppercase text-slate-500">
                                Este perfil já está vinculado a uma equipe.
                              </div>
                            ) : (
                              <>
                                <input
                                  value={buscaEquipeJogador}
                                  onChange={(event) => setBuscaEquipeJogador(event.target.value)}
                                  placeholder="Buscar equipe por nome ou tag"
                                  className="h-9 w-full border border-slate-200 bg-white px-2 text-[10px] font-bold uppercase outline-none"
                                />
                                <input
                                  value={mensagemPedidoJogador}
                                  onChange={(event) => setMensagemPedidoJogador(event.target.value)}
                                  placeholder="Mensagem opcional"
                                  className="h-9 w-full border border-slate-200 bg-white px-2 text-[10px] font-bold uppercase outline-none"
                                />

                                <div className="space-y-1">
                                  {carregandoBuscaEquipeJogador ? (
                                    <div className="border border-slate-200 bg-slate-50 p-2 text-center text-[10px] font-bold uppercase text-slate-500">
                                      Buscando equipes...
                                    </div>
                                  ) : equipesBuscaJogador.length ? (
                                    equipesBuscaJogador.map((equipe) => {
                                      const pedidoExistente = pedidoPendentePorEquipeJogador.get(equipe.id);

                                      return (
                                        <div
                                          key={equipe.id}
                                          className="flex items-center gap-2 border border-slate-200 bg-slate-50 p-2"
                                        >
                                          <Logo url={equipe.logo_url} nome={equipe.nome} />
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-[10px] font-black uppercase text-slate-950">
                                              {equipe.tag ? `[${equipe.tag}] ` : ""}
                                              {equipe.nome}
                                            </p>
                                            <p className="text-[8px] font-bold uppercase text-slate-500">
                                              {pedidoExistente ? "Pedido já enviado" : "Equipe encontrada"}
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            disabled={enviandoPedidoJogadorId === equipe.id}
                                            onClick={() => enviarPedidoJogador(equipe.id)}
                                            className={[
                                              "h-8 shrink-0 border px-2 text-[8px] font-black uppercase disabled:opacity-50",
                                              pedidoExistente
                                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                                : "border-blue-600 bg-blue-600 text-white",
                                            ].join(" ")}
                                          >
                                            {pedidoExistente ? "Editar" : "Solicitar"}
                                          </button>
                                        </div>
                                      );
                                    })
                                  ) : buscaEquipeJogador.trim().length >= 2 ? (
                                    <div className="border border-dashed border-slate-200 bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-500">
                                      Nenhuma equipe encontrada.
                                    </div>
                                  ) : null}
                                </div>
                              </>
                            )}

                            <div className="space-y-1">
                              {pedidosDoPerfilJogador.length ? (
                                pedidosDoPerfilJogador.map((pedido) => {
                                  const equipe = normalizarEquipeBeta(pedido.equipe);

                                  return (
                                    <div
                                      key={pedido.id}
                                      className="flex items-center justify-between gap-2 border border-slate-200 bg-white p-2"
                                    >
                                      <span className="min-w-0 truncate text-[10px] font-black uppercase text-slate-950">
                                        {equipe?.tag ? `[${equipe.tag}] ` : ""}
                                        {equipe?.nome || "Equipe"}
                                      </span>
                                      <span className="text-[8px] font-black uppercase text-amber-600">
                                        {pedido.status || pedido.situacao || "pendente"}
                                      </span>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="border border-dashed border-slate-200 bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-500">
                                  Nenhum pedido enviado.
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
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
    (jogadoresPorEquipeLocal[inscricao.id] || []).forEach((jogador) => {
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
  const [jogadoresPorEquipeLocal, setJogadoresPorEquipeLocal] =
    useState<Record<string, JogadorEquipe[]>>(jogadoresPorEquipe);

  useEffect(() => {
    setJogadoresPorEquipeLocal(jogadoresPorEquipe);
  }, [jogadoresPorEquipe]);


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

      if (!silencioso) {
        setJogadoresPorEquipeLocal((atual) => {
          const proximo: Record<string, JogadorEquipe[]> = {};

          Object.entries(atual).forEach(([vagaId, lista]) => {
            proximo[vagaId] = lista.map((item) =>
              item.id === jogador.id ? { ...item, status: "removido" } : item,
            );
          });

          return proximo;
        });
      }
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

      const novoJogador: JogadorEquipe = {
        id: String(jogadorId),
        campeonato_id: campeonato.id,
        equipe_id: vagaPrincipal.equipe_id,
        campeonato_equipe_id: vagaPrincipal.id,
        perfil_jogo_id: perfil.id,
        jogador_avulso_id: null,
        status: "ativo",
        nick_snapshot: getNomePerfil(perfil),
        uid_jogo_snapshot: getUidPerfil(perfil),
        perfil,
        avulso: null,
      };

      setJogadoresPorEquipeLocal((atual) => {
        const listaAtual = atual[vagaPrincipal.id] || [];
        const semDuplicado = listaAtual.filter((item) => item.perfil_jogo_id !== perfil.id);

        return {
          ...atual,
          [vagaPrincipal.id]: [...semDuplicado, novoJogador],
        };
      });

      setPickerAberto(false);
      setBusca("");
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


function CampoBeta({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full border border-slate-200 bg-white px-2 text-xs font-bold outline-none"
      />
    </label>
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
