"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import {
  optimizeImageToWebp,
  sanitizeImageName,
} from "../../../lib/imageOptimize";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ClipboardList,
  Edit3,
  Gamepad2,
  Link2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Shield,
  Trash2,
  Trophy,
  Upload,
  Unlink,
  UserCog,
  Users,
  X,
  Zap,
} from "lucide-react";

type Equipe = {
  id: string;
  nome: string;
  tag?: string | null;
  logo_url?: string | null;
};

type Line = {
  id: string;
  nome: string;
  tipo?: string | null;
  visibilidade?: string | null;
  plataforma?: string | null;
  equipe_id?: string | null;
  created_by?: string | null;
  ativa?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  logo_url?: string | null;
  descricao?: string | null;
  coach_nome?: string | null;
  analista_nome?: string | null;
};

type PerfilJogo = {
  id: string;
  nick?: string | null;
  uid_jogo?: string | null;
  plataforma?: string | null;
  foto_capa?: string | null;
  funcao?: string | null;
};


type CargoStaff = "analista" | "coach";

type UsuarioStaff = {
  id: string;
  nome?: string | null;
  name?: string | null;
  full_name?: string | null;
  nome_completo?: string | null;
  username?: string | null;
  nome_usuario?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  foto_url?: string | null;
  [key: string]: any;
};

type JogadorLine = {
  id: string;
  line_id?: string;
  perfil_jogo_id?: string | null;
  jogador_avulso_id?: string | null;
  ordem?: number | null;
  tipo_slot?: string | null;
  perfis_jogo?: PerfilJogo | null;
};

type CampeonatoLine = {
  id: string;
  campeonato_id?: string | null;
  line_id?: string | null;
  status?: string | null;
  nome_exibicao?: string | null;
  created_at?: string | null;
};

type FormLine = {
  nome: string;
  tipo: string;
  plataforma: string;
  visibilidade: string;
  equipe_id: string;
  logo_url: string;
  descricao: string;
  coach_nome: string;
  analista_nome: string;
  ativa: boolean;
};

function dataCurta(data?: string | null) {
  if (!data) return "N/I";
  return new Date(data).toLocaleDateString("pt-BR");
}

function dataHoraCurta(data?: string | null) {
  if (!data) return "N/I";
  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function normalizarTexto(texto?: string | null) {
  return (texto || "").replaceAll("_", " ").toUpperCase();
}

function shortId(id?: string | null) {
  if (!id) return "—";
  return id.slice(0, 8).toUpperCase();
}


function getNomeUsuarioStaff(usuario?: UsuarioStaff | null) {
  if (!usuario) return "";
  return (
    usuario.nome ||
    usuario.name ||
    usuario.full_name ||
    usuario.nome_completo ||
    usuario.username ||
    usuario.nome_usuario ||
    usuario.email ||
    shortId(usuario.id)
  );
}

function getSubUsuarioStaff(usuario?: UsuarioStaff | null) {
  if (!usuario) return "";
  const apelido = usuario.username || usuario.nome_usuario || usuario.email || "";
  const principal = getNomeUsuarioStaff(usuario);
  if (apelido && apelido !== principal) return apelido;
  return shortId(usuario.id);
}

function getAvatarUsuarioStaff(usuario?: UsuarioStaff | null) {
  if (!usuario) return "";
  return (
    usuario.avatar_url ||
    usuario.foto_url ||
    usuario.foto_perfil ||
    usuario.imagem_url ||
    usuario.image_url ||
    usuario.photo_url ||
    usuario.user_metadata?.avatar_url ||
    ""
  );
}

function usuarioStaffCombinaNome(usuario: UsuarioStaff, nome?: string | null) {
  const alvo = String(nome || "").trim().toLowerCase();
  if (!alvo) return false;
  const campos = [
    usuario.nome,
    usuario.name,
    usuario.full_name,
    usuario.nome_completo,
    usuario.username,
    usuario.nome_usuario,
    usuario.email,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase());
  return campos.includes(alvo);
}

function getQuantidadeTitulares(tipo?: string | null) {
  const valor = String(tipo || "").toLowerCase();
  const match = valor.match(/(\d+)\s*x\s*\d+/);
  if (match?.[1]) return Number(match[1]);

  if (valor.includes("1x1")) return 1;
  if (valor.includes("2x2")) return 2;
  if (valor.includes("3x3")) return 3;
  if (valor.includes("4x4")) return 4;
  if (valor.includes("5x5")) return 5;
  if (valor.includes("6x6")) return 6;

  // Sem formato definido, mantém o padrão competitivo do Free Fire.
  return 4;
}

function getTipoSlotAutomatico(index: number, totalTitulares: number) {
  return index < totalTitulares ? "titular" : "reserva";
}

function LineLogo({
  line,
  equipe,
  compact = false,
}: {
  line?: Line | null;
  equipe?: Equipe | null;
  compact?: boolean;
}) {
  const src = line?.logo_url || equipe?.logo_url || "";
  const initials = (line?.nome || equipe?.nome || "LI")
    .slice(0, 2)
    .toUpperCase();
  const size = compact ? "h-11 w-11" : "h-20 w-20";

  if (src) {
    return (
      <div className={`${size} border border-slate-200 bg-white p-1`}>
        <img
          src={src}
          alt="Logo da line"
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`${size} flex items-center justify-center border border-cyan-200 bg-cyan-50 text-lg font-black text-cyan-700`}
    >
      {initials}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: any;
}) {
  return (
    <div className="border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        <Icon size={13} className="text-cyan-500" />
        {label}
      </div>
      <div className="mt-2 text-xl font-black uppercase leading-none text-slate-950">
        {value}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
      {children}
    </div>
  );
}

function StaffRosterCard({
  cargo,
  cargoKey,
  nome,
  usuario,
  destaque,
  podeEditar,
  aberto,
  busca,
  resultados,
  salvando,
  onAbrir,
  onCancelar,
  onBusca,
  onSelecionar,
  onRemover,
}: {
  cargo: "Analista" | "Coach";
  cargoKey: CargoStaff;
  nome?: string | null;
  usuario?: UsuarioStaff | null;
  destaque: "violet" | "amber";
  podeEditar: boolean;
  aberto: boolean;
  busca: string;
  resultados: UsuarioStaff[];
  salvando: boolean;
  onAbrir: (cargo: CargoStaff) => void;
  onCancelar: () => void;
  onBusca: (valor: string) => void;
  onSelecionar: (cargo: CargoStaff, usuario: UsuarioStaff) => void;
  onRemover: (cargo: CargoStaff) => void;
}) {
  const estilos =
    destaque === "violet"
      ? "border-violet-200 bg-violet-50 text-violet-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  const botaoClasse =
    destaque === "violet"
      ? "border-violet-300 bg-white text-violet-800 hover:bg-violet-100"
      : "border-amber-300 bg-white text-amber-800 hover:bg-amber-100";

  const nomeExibicao = usuario ? getNomeUsuarioStaff(usuario) : nome || "";
  const subExibicao = usuario ? getSubUsuarioStaff(usuario) : "Perfil de usuário";
  const avatar = getAvatarUsuarioStaff(usuario);

  return (
    <div className={`min-w-[260px] flex-1 border p-3 ${estilos}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-current/20 bg-white/70 text-xs font-black">
            {avatar ? (
              <img
                src={avatar}
                alt={`Foto de ${nomeExibicao || cargo}`}
                className="h-full w-full object-cover"
              />
            ) : nomeExibicao ? (
              nomeExibicao.slice(0, 2).toUpperCase()
            ) : (
              <UserCog size={16} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
              {cargo}
            </div>
            <div className="truncate text-sm font-black uppercase">
              {nomeExibicao || "Não informado"}
            </div>
            <div className="mt-0.5 truncate text-[9px] font-black uppercase tracking-[0.14em] opacity-70">
              {subExibicao}
            </div>
          </div>
        </div>

        {podeEditar ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onAbrir(cargoKey)}
              className={`border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${botaoClasse}`}
            >
              {nomeExibicao ? "Trocar" : "+ Adicionar"}
            </button>
            {nomeExibicao ? (
              <button
                type="button"
                onClick={() => onRemover(cargoKey)}
                className="border border-red-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-600 hover:bg-red-50"
              >
                Remover
              </button>
            ) : null}
          </div>
        ) : (
          <span className="border border-current/20 bg-white/70 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em]">
            Staff
          </span>
        )}
      </div>

      {aberto ? (
        <div className="mt-3 border border-current/20 bg-white/80 p-2 text-slate-950">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Buscar usuário para {cargo}
            </div>
            <button
              type="button"
              onClick={onCancelar}
              className="text-slate-400 hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center border border-slate-200 bg-white focus-within:border-cyan-400">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-slate-200 text-slate-400">
              <Search size={15} />
            </div>
            <input
              value={busca}
              onChange={(e) => onBusca(e.target.value)}
              className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold outline-none"
              placeholder="Digite nome, usuário ou e-mail"
              autoFocus
            />
          </div>

          {busca.trim().length > 0 && busca.trim().length < 2 ? (
            <div className="mt-2 border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Digite pelo menos 2 caracteres.
            </div>
          ) : null}

          {salvando ? (
            <div className="mt-2 border border-cyan-200 bg-cyan-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-700">
              Salvando...
            </div>
          ) : null}

          {resultados.length > 0 ? (
            <div className="mt-2 max-h-56 space-y-1 overflow-auto">
              {resultados.map((usuario) => (
                <button
                  key={usuario.id}
                  type="button"
                  onClick={() => onSelecionar(cargoKey, usuario)}
                  className="flex w-full items-center gap-3 border border-slate-200 bg-white p-2 text-left hover:border-cyan-400 hover:bg-cyan-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-700">
                    {getAvatarUsuarioStaff(usuario) ? (
                      <img
                        src={getAvatarUsuarioStaff(usuario)}
                        alt={`Foto de ${getNomeUsuarioStaff(usuario)}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getNomeUsuarioStaff(usuario).slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black uppercase text-slate-950">
                      {getNomeUsuarioStaff(usuario)}
                    </div>
                    <div className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      {getSubUsuarioStaff(usuario)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : busca.trim().length >= 2 && !salvando ? (
            <div className="mt-2 border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Nenhum usuário encontrado.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function LinePerfilPage() {
  const params = useParams();
  const router = useRouter();
  const lineId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [line, setLine] = useState<Line | null>(null);
  const [equipe, setEquipe] = useState<Equipe | null>(null);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [jogadores, setJogadores] = useState<JogadorLine[]>([]);
  const [campeonatos, setCampeonatos] = useState<CampeonatoLine[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [staffUsuarios, setStaffUsuarios] = useState<Record<CargoStaff, UsuarioStaff | null>>({
    analista: null,
    coach: null,
  });
  const [buscaPerfil, setBuscaPerfil] = useState("");
  const [resultadosPerfil, setResultadosPerfil] = useState<PerfilJogo[]>([]);
  const [perfilSelecionado, setPerfilSelecionado] = useState<PerfilJogo | null>(
    null,
  );
  const [tipoSlotNovo, setTipoSlotNovo] = useState("titular");
  const [form, setForm] = useState<FormLine>({
    nome: "",
    tipo: "principal",
    plataforma: "mobile",
    visibilidade: "privada",
    equipe_id: "",
    logo_url: "",
    descricao: "",
    coach_nome: "",
    analista_nome: "",
    ativa: true,
  });

  const [staffAberto, setStaffAberto] = useState<CargoStaff | null>(null);
  const [buscaStaff, setBuscaStaff] = useState("");
  const [resultadosStaff, setResultadosStaff] = useState<UsuarioStaff[]>([]);
  const [salvandoStaff, setSalvandoStaff] = useState(false);

  const podeEditar = useMemo(() => {
    if (!line || !userId) return false;
    return line.created_by === userId;
  }, [line, userId]);

  const carregar = useCallback(async () => {
    if (!lineId) return;

    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || null;
      setUserId(uid);

      const { data: lineData, error: lineError } = await supabase
        .from("lines")
        .select(
          "id, nome, tipo, visibilidade, plataforma, equipe_id, created_by, ativa, created_at, updated_at, logo_url, descricao, coach_nome, analista_nome",
        )
        .eq("id", lineId)
        .single();

      if (lineError) throw lineError;

      const lineBase = lineData as Line;
      setLine(lineBase);
      setForm({
        nome: lineBase.nome || "",
        tipo: lineBase.tipo || "principal",
        plataforma: lineBase.plataforma || "mobile",
        visibilidade: lineBase.visibilidade || "privada",
        equipe_id: lineBase.equipe_id || "",
        logo_url: lineBase.logo_url || "",
        descricao: lineBase.descricao || "",
        coach_nome: lineBase.coach_nome || "",
        analista_nome: lineBase.analista_nome || "",
        ativa: lineBase.ativa !== false,
      });

      setStaffUsuarios({ analista: null, coach: null });
      if (lineBase.analista_nome || lineBase.coach_nome) {
        const { data: usuariosStaffData, error: usuariosStaffError } = await supabase
          .from("profiles")
          .select("*")
          .limit(300);

        if (!usuariosStaffError) {
          const usuarios = (usuariosStaffData || []) as UsuarioStaff[];
          setStaffUsuarios({
            analista:
              usuarios.find((usuario) =>
                usuarioStaffCombinaNome(usuario, lineBase.analista_nome),
              ) || null,
            coach:
              usuarios.find((usuario) =>
                usuarioStaffCombinaNome(usuario, lineBase.coach_nome),
              ) || null,
          });
        }
      }

      const [equipeRes, equipesRes, jogadoresRes, campeonatosRes, agendaRes] =
        await Promise.all([
          lineBase.equipe_id
            ? supabase
                .from("equipes")
                .select("id, nome, tag, logo_url")
                .eq("id", lineBase.equipe_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null } as any),
          supabase
            .from("equipes")
            .select("id, nome, tag, logo_url")
            .order("nome", { ascending: true })
            .limit(300),
          supabase
            .from("lines_jogadores")
            .select(
              "id, line_id, perfil_jogo_id, jogador_avulso_id, ordem, tipo_slot, perfis_jogo:perfil_jogo_id(id, nick, uid_jogo, plataforma, foto_capa, funcao)",
            )
            .eq("line_id", lineId)
            .order("ordem", { ascending: true }),
          supabase
            .from("campeonato_equipes")
            .select(
              "id, campeonato_id, line_id, status, nome_exibicao, created_at",
            )
            .eq("line_id", lineId)
            .order("created_at", { ascending: false }),
          supabase
            .from("agenda_eventos")
            .select(
              "id, titulo, descricao, data_evento, horario, tipo_evento, campeonato_id, created_at",
            )
            .order("data_evento", { ascending: true })
            .limit(6),
        ]);

      if (equipeRes.error) throw equipeRes.error;
      if (equipesRes.error) throw equipesRes.error;
      if (jogadoresRes.error) throw jogadoresRes.error;
      if (campeonatosRes.error) throw campeonatosRes.error;

      setEquipe((equipeRes.data || null) as Equipe | null);
      setEquipes((equipesRes.data || []) as Equipe[]);
      setJogadores((jogadoresRes.data || []) as JogadorLine[]);
      setCampeonatos((campeonatosRes.data || []) as CampeonatoLine[]);
      setAgenda(agendaRes.error ? [] : agendaRes.data || []);
    } catch (error: any) {
      console.error("Erro ao carregar line:", error?.message || error);
      alert(error?.message || "Erro ao carregar line.");
      setLine(null);
    } finally {
      setLoading(false);
    }
  }, [lineId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const buscarPerfis = useCallback(async () => {
    const termo = buscaPerfil.trim();
    if (termo.length < 2) {
      setResultadosPerfil([]);
      return;
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        termo,
      );

    let query = supabase
      .from("perfis_jogo")
      .select("id, nick, uid_jogo, plataforma, foto_capa, funcao")
      .eq("ativo", true)
      .limit(20);

    if (isUuid) {
      query = query.eq("id", termo);
    } else {
      query = query.or(`nick.ilike.%${termo}%,uid_jogo.ilike.%${termo}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao buscar perfis:", error);
      alert(error.message || "Erro ao buscar jogadores.");
      return;
    }

    setResultadosPerfil((data || []) as PerfilJogo[]);
  }, [buscaPerfil]);

  useEffect(() => {
    const t = setTimeout(() => {
      buscarPerfis();
    }, 350);
    return () => clearTimeout(t);
  }, [buscarPerfis]);

  const buscarUsuariosStaff = useCallback(async () => {
    const termo = buscaStaff.trim().toLowerCase();
    if (!staffAberto || termo.length < 2) {
      setResultadosStaff([]);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .limit(300);

    if (error) {
      console.error("Erro ao buscar usuários para staff:", error);
      setResultadosStaff([]);
      return;
    }

    const filtrados = ((data || []) as UsuarioStaff[])
      .filter((usuario) => {
        const campos = [
          usuario.id,
          usuario.nome,
          usuario.name,
          usuario.full_name,
          usuario.nome_completo,
          usuario.username,
          usuario.nome_usuario,
          usuario.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return campos.includes(termo);
      })
      .slice(0, 20);

    setResultadosStaff(filtrados);
  }, [buscaStaff, staffAberto]);

  useEffect(() => {
    const t = setTimeout(() => {
      buscarUsuariosStaff();
    }, 250);
    return () => clearTimeout(t);
  }, [buscarUsuariosStaff]);

  function abrirBuscaStaff(cargo: CargoStaff) {
    setStaffAberto(cargo);
    setBuscaStaff("");
    setResultadosStaff([]);
  }

  async function salvarStaff(cargo: CargoStaff, usuario: UsuarioStaff) {
    if (!line || !podeEditar) return;

    const nomeUsuario = getNomeUsuarioStaff(usuario).trim();
    if (!nomeUsuario) {
      alert("Não foi possível identificar o nome do usuário.");
      return;
    }

    try {
      setSalvandoStaff(true);
      const payload =
        cargo === "analista"
          ? { analista_nome: nomeUsuario, updated_at: new Date().toISOString() }
          : { coach_nome: nomeUsuario, updated_at: new Date().toISOString() };

      const { error } = await supabase.from("lines").update(payload).eq("id", line.id);
      if (error) throw error;

      setStaffUsuarios((atual) => ({ ...atual, [cargo]: usuario }));
      setStaffUsuarios((atual) => ({ ...atual, [cargo]: null }));
      setStaffAberto(null);
      setBuscaStaff("");
      setResultadosStaff([]);
      await carregar();
    } catch (error: any) {
      console.error("Erro ao salvar staff da line:", error);
      alert(error?.message || "Erro ao salvar staff da line.");
    } finally {
      setSalvandoStaff(false);
    }
  }

  async function removerStaff(cargo: CargoStaff) {
    if (!line || !podeEditar) return;

    try {
      setSalvandoStaff(true);
      const payload =
        cargo === "analista"
          ? { analista_nome: null, updated_at: new Date().toISOString() }
          : { coach_nome: null, updated_at: new Date().toISOString() };

      const { error } = await supabase.from("lines").update(payload).eq("id", line.id);
      if (error) throw error;

      setStaffAberto(null);
      setBuscaStaff("");
      setResultadosStaff([]);
      await carregar();
    } catch (error: any) {
      console.error("Erro ao remover staff da line:", error);
      alert(error?.message || "Erro ao remover staff da line.");
    } finally {
      setSalvandoStaff(false);
    }
  }

  async function uploadLogoLine(file: File) {
    if (!line || !podeEditar) return;

    if (!file.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.");
      return;
    }

    try {
      setUploadingLogo(true);

      const finalFile = await optimizeImageToWebp(file, "logo");
      const safeName = sanitizeImageName(file.name, "logo-line");
      const fileName = `lines/${line.id}/${Date.now()}-${safeName}-500x500.webp`;

      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(fileName, finalFile, {
          upsert: true,
          contentType: finalFile.type || "image/webp",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("team-logos")
        .getPublicUrl(fileName);
      setForm((atual) => ({ ...atual, logo_url: data.publicUrl }));
    } catch (error: any) {
      console.error("Erro ao enviar logo da line:", error);
      alert(error?.message || "Erro ao enviar logo da line.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function salvarLine() {
    if (!line || !podeEditar) return;
    if (!form.nome.trim()) {
      alert("Informe o nome da line.");
      return;
    }

    try {
      setSalvando(true);
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo.trim() || "principal",
        plataforma: form.plataforma.trim() || null,
        visibilidade: form.visibilidade || "privada",
        equipe_id: form.equipe_id || null,
        logo_url: form.logo_url.trim() || null,
        descricao: form.descricao.trim() || null,
        coach_nome: form.coach_nome.trim() || null,
        analista_nome: form.analista_nome.trim() || null,
        ativa: form.ativa,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("lines")
        .update(payload)
        .eq("id", line.id);
      if (error) throw error;

      setEditando(false);
      await carregar();
    } catch (error: any) {
      console.error("Erro ao salvar line:", error);
      alert(error?.message || "Erro ao salvar line.");
    } finally {
      setSalvando(false);
    }
  }

  async function adicionarMembro() {
    if (!line || !podeEditar) return;
    if (!perfilSelecionado?.id) {
      alert("Selecione um jogador para adicionar.");
      return;
    }

    const jaExiste = jogadores.some(
      (j) => j.perfil_jogo_id === perfilSelecionado.id,
    );
    if (jaExiste) {
      alert("Esse jogador já está nessa line.");
      return;
    }

    try {
      setAdicionando(true);
      const proximaOrdem =
        Math.max(0, ...jogadores.map((j) => Number(j.ordem || 0))) + 1;
      const { error } = await supabase.from("lines_jogadores").insert({
        line_id: line.id,
        perfil_jogo_id: perfilSelecionado.id,
        tipo_slot: "membro",
        ordem: proximaOrdem,
      });

      if (error) throw error;

      setPerfilSelecionado(null);
      setBuscaPerfil("");
      setResultadosPerfil([]);
      setTipoSlotNovo("titular");
      await carregar();
    } catch (error: any) {
      console.error("Erro ao adicionar membro:", error);
      alert(error?.message || "Erro ao adicionar membro.");
    } finally {
      setAdicionando(false);
    }
  }

  async function removerMembro(membro: JogadorLine) {
    if (!podeEditar || !membro.id) return;
    const nome =
      membro.perfis_jogo?.nick ||
      shortId(membro.perfil_jogo_id || membro.jogador_avulso_id);
    const ok = window.confirm(`Remover ${nome} desta line?`);
    if (!ok) return;

    try {
      setRemovendoId(membro.id);
      const { error } = await supabase
        .from("lines_jogadores")
        .delete()
        .eq("id", membro.id);
      if (error) throw error;
      await carregar();
    } catch (error: any) {
      console.error("Erro ao remover membro:", error);
      alert(error?.message || "Erro ao remover membro.");
    } finally {
      setRemovendoId(null);
    }
  }

  const jogadoresOrdenados = [...jogadores]
    .filter((j) => !["coach", "analista", "staff"].includes(j.tipo_slot || ""))
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

  const quantidadeTitulares = getQuantidadeTitulares(line?.tipo);
  const titulares = jogadoresOrdenados.slice(0, quantidadeTitulares);
  const reservas = jogadoresOrdenados.slice(quantidadeTitulares);

  const atividade = Math.min(
    100,
    Math.round((jogadoresOrdenados.length / Math.max(1, quantidadeTitulares)) * 100),
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-6xl border border-slate-200 bg-white p-6 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
          Carregando line...
        </div>
      </main>
    );
  }

  if (!line) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-6xl border border-red-200 bg-white p-6">
          <h1 className="text-xl font-black uppercase">Line não encontrada</h1>
          <button
            onClick={() => router.back()}
            className="mt-4 border border-slate-300 px-4 py-2 text-xs font-black uppercase"
          >
            Voltar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <LineLogo line={line} equipe={equipe} />
              <div className="flex gap-2">
                <button
                  onClick={carregar}
                  className="border border-slate-200 bg-white p-2 text-slate-500 hover:border-cyan-400 hover:text-cyan-600"
                  title="Atualizar"
                >
                  <RefreshCcw size={16} />
                </button>
                <Link
                  href="/equipe"
                  className="border border-slate-200 bg-white p-2 text-slate-500 hover:border-cyan-400 hover:text-cyan-600"
                >
                  <ArrowLeft size={16} />
                </Link>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-500">
                Line OS
              </div>
              <h1 className="mt-1 text-3xl font-black uppercase leading-none tracking-tight">
                {line.nome}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
                <span className="border border-cyan-200 bg-cyan-50 px-2 py-1 text-cyan-700">
                  {normalizarTexto(line.tipo || "line")}
                </span>
                <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">
                  {normalizarTexto(line.plataforma || "plataforma")}
                </span>
                <span
                  className={`border px-2 py-1 ${line.ativa === false ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                >
                  {line.ativa === false ? "inativa" : "ativa"}
                </span>
              </div>
            </div>

            {line.descricao ? (
              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600">
                {line.descricao}
              </p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <MetricCard
                label="Membros"
                value={jogadores.length}
                icon={Users}
              />
              <MetricCard
                label="Jogos"
                value={campeonatos.length}
                icon={Trophy}
              />
              <MetricCard
                label="Equipe"
                value={equipe ? equipe.tag || equipe.nome : "Livre"}
                icon={Shield}
              />
              <MetricCard
                label="Ativa"
                value={`${atividade}%`}
                icon={BarChart3}
              />
            </div>

            {podeEditar ? (
              <button
                onClick={() => setEditando((v) => !v)}
                className="mt-4 flex w-full items-center justify-center gap-2 border border-slate-900 bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white hover:bg-cyan-600"
              >
                <Edit3 size={15} />
                {editando ? "Fechar edição" : "Editar line"}
              </button>
            ) : (
              <div className="mt-4 border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-500">
                Apenas o criador da line pode editar dados e membros.
              </div>
            )}
          </aside>

          <section className="space-y-4">
            {editando && podeEditar ? (
              <div className="border border-cyan-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-500">
                      Configuração
                    </div>
                    <h2 className="text-lg font-black uppercase">
                      Editar dados da line
                    </h2>
                  </div>
                  <button
                    onClick={salvarLine}
                    disabled={salvando}
                    className="flex items-center gap-2 bg-cyan-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white disabled:opacity-50"
                  >
                    <Save size={15} />
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Nome
                    <input
                      value={form.nome}
                      onChange={(e) =>
                        setForm({ ...form, nome: e.target.value })
                      }
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950 outline-none focus:border-cyan-400"
                    />
                  </label>
                  <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Logo da line
                    <div className="flex items-center gap-3 border border-slate-200 bg-white p-2">
                      <div className="flex h-12 w-12 items-center justify-center border border-slate-200 bg-slate-50 p-1">
                        {form.logo_url ? (
                          <img
                            src={form.logo_url}
                            alt="Logo da line"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-black text-slate-400">
                            500
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-bold normal-case tracking-normal text-slate-500">
                          {form.logo_url
                            ? "Logo enviada e compactada em 500x500."
                            : "Envie uma imagem para gerar a logo 500x500."}
                        </div>
                        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-600">
                          WEBP • 500x500
                        </div>
                      </div>
                      <span className="relative inline-flex">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingLogo || salvando}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.currentTarget.value = "";
                            if (file) uploadLogoLine(file);
                          }}
                          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        />
                        <span className="flex items-center gap-2 border border-cyan-200 bg-cyan-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-700">
                          <Upload size={14} />
                          {uploadingLogo ? "Enviando..." : "Upload"}
                        </span>
                      </span>
                    </div>
                  </label>
                  <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Tipo
                    <select
                      value={form.tipo}
                      onChange={(e) =>
                        setForm({ ...form, tipo: e.target.value })
                      }
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-cyan-400"
                    >
                      <option value="principal">Principal</option>
                      <option value="academy">Academy</option>
                      <option value="feminina">Feminina</option>
                      <option value="mista">Mista</option>
                      <option value="treino">Treino</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Plataforma
                    <select
                      value={form.plataforma}
                      onChange={(e) =>
                        setForm({ ...form, plataforma: e.target.value })
                      }
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-cyan-400"
                    >
                      <option value="mobile">Mobile</option>
                      <option value="emulador">Emulador</option>
                      <option value="misto">Misto</option>
                      <option value="a_combinar">A combinar</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Visibilidade
                    <select
                      value={form.visibilidade}
                      onChange={(e) =>
                        setForm({ ...form, visibilidade: e.target.value })
                      }
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-cyan-400"
                    >
                      <option value="privada">Privada</option>
                      <option value="publica">Pública</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Equipe vinculada
                    <select
                      value={form.equipe_id}
                      onChange={(e) =>
                        setForm({ ...form, equipe_id: e.target.value })
                      }
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-cyan-400"
                    >
                      <option value="">Sem equipe</option>
                      {equipes.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.tag ? `${eq.tag} - ${eq.nome}` : eq.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Coach
                    <input
                      value={form.coach_nome}
                      onChange={(e) =>
                        setForm({ ...form, coach_nome: e.target.value })
                      }
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950 outline-none focus:border-cyan-400"
                    />
                  </label>
                  <label className="space-y-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Analista
                    <input
                      value={form.analista_nome}
                      onChange={(e) =>
                        setForm({ ...form, analista_nome: e.target.value })
                      }
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950 outline-none focus:border-cyan-400"
                    />
                  </label>
                  <label className="md:col-span-2 space-y-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Descrição
                    <textarea
                      value={form.descricao}
                      onChange={(e) =>
                        setForm({ ...form, descricao: e.target.value })
                      }
                      className="min-h-20 w-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none focus:border-cyan-400"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.ativa}
                      onChange={(e) =>
                        setForm({ ...form, ativa: e.target.checked })
                      }
                    />
                    Line ativa
                  </label>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
              <section className="space-y-4">
                <div className="border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-500">
                        Roster
                      </div>
                      <h2 className="text-lg font-black uppercase">
                        Membros da line
                      </h2>
                    </div>
                    <div className="text-xs font-black uppercase text-slate-500">
                      {jogadoresOrdenados.length} jogador(es) • {quantidadeTitulares} titular(es)
                    </div>
                  </div>

                  {podeEditar ? (
                    <div className="mb-4 border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        <Plus size={14} className="text-cyan-500" />
                        Adicionar membro
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px]">
                        <div className="flex items-center border border-slate-200 bg-white focus-within:border-cyan-400">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-slate-200 text-slate-400">
                            <Search size={15} />
                          </div>
                          <input
                            value={buscaPerfil}
                            onChange={(e) => {
                              setBuscaPerfil(e.target.value);
                              setPerfilSelecionado(null);
                            }}
                            className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold outline-none"
                            placeholder="Buscar por nick, UID ou ID"
                          />
                        </div>
                        <button
                          onClick={adicionarMembro}
                          disabled={adicionando || !perfilSelecionado}
                          className="bg-cyan-500 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-40"
                        >
                          {adicionando ? "Adicionando" : "Adicionar"}
                        </button>
                      </div>
                      <div className="mt-2 border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        Titulares automáticos: formato {normalizarTexto(line.tipo || "4x4")} usa {quantidadeTitulares} titular(es). Todo jogador acima desse limite fica como reserva.
                      </div>

                      {perfilSelecionado ? (
                        <div className="mt-2 flex items-center justify-between border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">
                          <span>
                            Selecionado:{" "}
                            {perfilSelecionado.nick ||
                              shortId(perfilSelecionado.id)}
                          </span>
                          <button onClick={() => setPerfilSelecionado(null)}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : null}

                      {resultadosPerfil.length > 0 && !perfilSelecionado ? (
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {resultadosPerfil.map((perfil) => (
                            <button
                              key={perfil.id}
                              onClick={() => setPerfilSelecionado(perfil)}
                              className="flex items-center gap-3 border border-slate-200 bg-white p-2 text-left hover:border-cyan-400"
                            >
                              <div className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-slate-50 text-xs font-black">
                                {(perfil.nick || "?").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black uppercase">
                                  {perfil.nick || shortId(perfil.id)}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  UID {perfil.uid_jogo || "N/I"} •{" "}
                                  {perfil.plataforma || "N/I"}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div>
                      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Staff da line
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StaffRosterCard
                          cargo="Analista"
                          cargoKey="analista"
                          nome={line.analista_nome}
                          usuario={staffUsuarios.analista}
                          destaque="violet"
                          podeEditar={podeEditar}
                          aberto={staffAberto === "analista"}
                          busca={buscaStaff}
                          resultados={staffAberto === "analista" ? resultadosStaff : []}
                          salvando={salvandoStaff}
                          onAbrir={abrirBuscaStaff}
                          onCancelar={() => {
                            setStaffAberto(null);
                            setBuscaStaff("");
                            setResultadosStaff([]);
                          }}
                          onBusca={setBuscaStaff}
                          onSelecionar={salvarStaff}
                          onRemover={removerStaff}
                        />
                        <StaffRosterCard
                          cargo="Coach"
                          cargoKey="coach"
                          nome={line.coach_nome}
                          usuario={staffUsuarios.coach}
                          destaque="amber"
                          podeEditar={podeEditar}
                          aberto={staffAberto === "coach"}
                          busca={buscaStaff}
                          resultados={staffAberto === "coach" ? resultadosStaff : []}
                          salvando={salvandoStaff}
                          onAbrir={abrirBuscaStaff}
                          onCancelar={() => {
                            setStaffAberto(null);
                            setBuscaStaff("");
                            setResultadosStaff([]);
                          }}
                          onBusca={setBuscaStaff}
                          onSelecionar={salvarStaff}
                          onRemover={removerStaff}
                        />
                      </div>
                    </div>

                    {jogadores.length === 0 ? (
                      <EmptyState>
                        Nenhum jogador cadastrado na line.
                      </EmptyState>
                    ) : (
                      [
                        { titulo: "Titulares", itens: titulares },
                        { titulo: "Reservas", itens: reservas },
                      ].map((grupo) =>
                        grupo.itens.length ? (
                          <div key={grupo.titulo}>
                            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                              {grupo.titulo}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {grupo.itens.map((jogador, index) => {
                                const perfil = jogador.perfis_jogo;
                                const slotAutomatico =
                                  grupo.titulo === "Titulares" ? "titular" : "reserva";
                                return (
                                  <div
                                    key={jogador.id}
                                    className="flex min-w-[220px] items-center justify-between gap-3 border border-slate-200 bg-white p-3"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-slate-50 text-xs font-black">
                                        {jogador.ordem || "—"}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-black uppercase text-slate-950">
                                          {perfil?.nick ||
                                            shortId(
                                              jogador.perfil_jogo_id ||
                                                jogador.jogador_avulso_id,
                                            )}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                          {normalizarTexto(
                                            slotAutomatico,
                                          )}{" "}
                                          • {perfil?.plataforma || "N/I"}
                                        </div>
                                      </div>
                                    </div>
                                    {podeEditar ? (
                                      <button
                                        onClick={() => removerMembro(jogador)}
                                        disabled={removendoId === jogador.id}
                                        className="border border-red-200 bg-red-50 p-2 text-red-500 hover:bg-red-100 disabled:opacity-40"
                                        title="Remover membro"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null,
                      )
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-500">
                        Competição
                      </div>
                      <h2 className="text-lg font-black uppercase">
                        Campeonatos inscritos
                      </h2>
                    </div>
                    <div className="text-xs font-black uppercase text-slate-500">
                      {campeonatos.length} registro(s)
                    </div>
                  </div>
                  {campeonatos.length === 0 ? (
                    <EmptyState>Nenhum campeonato vinculado.</EmptyState>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {campeonatos.map((campeonato) => (
                        <div
                          key={campeonato.id}
                          className="border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="text-sm font-black uppercase">
                            {campeonato.nome_exibicao ||
                              `Campeonato ${shortId(campeonato.campeonato_id)}`}
                          </div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            {campeonato.status || "ativo"} •{" "}
                            {dataCurta(campeonato.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-4">
                <div className="border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <Shield size={14} className="text-cyan-500" />
                    Equipe vinculada
                  </div>
                  {equipe ? (
                    <div className="flex items-center gap-3">
                      <LineLogo equipe={equipe} compact />
                      <div>
                        <div className="text-sm font-black uppercase">
                          {equipe.nome}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          {equipe.tag || "sem tag"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">
                      Esta line ainda não está vinculada a uma equipe.
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <UserCog size={14} className="text-cyan-500" />
                    Staff
                  </div>
                  <div className="space-y-2">
                    <div className="border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Coach
                      </div>
                      <div className="mt-1 text-sm font-black uppercase">
                        {line.coach_nome || "Não informado"}
                      </div>
                    </div>
                    <div className="border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Analista
                      </div>
                      <div className="mt-1 text-sm font-black uppercase">
                        {line.analista_nome || "Não informado"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <CalendarDays size={14} className="text-cyan-500" />
                    Agenda
                  </div>
                  {agenda.length === 0 ? (
                    <EmptyState>Sem agenda.</EmptyState>
                  ) : (
                    <div className="space-y-2">
                      {agenda.map((item) => (
                        <div
                          key={item.id}
                          className="border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="text-sm font-black uppercase">
                            {item.titulo}
                          </div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            {dataCurta(item.data_evento)} •{" "}
                            {item.horario || "horário não informado"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <Zap size={14} className="text-cyan-500" />
                    Estatísticas da line
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard
                      label="Jogos"
                      value={campeonatos.length}
                      icon={Gamepad2}
                    />
                    <MetricCard
                      label="Membros"
                      value={jogadores.length}
                      icon={Users}
                    />
                    <MetricCard
                      label="Criada"
                      value={dataCurta(line.created_at)}
                      icon={ClipboardList}
                    />
                    <MetricCard
                      label="Atualizada"
                      value={dataHoraCurta(line.updated_at)}
                      icon={RefreshCcw}
                    />
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
