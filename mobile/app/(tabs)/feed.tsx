import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { LogoAvatar } from "@/components/LogoAvatar";
import { Body, Tiny } from "@/components/AppText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { mock } from "@/data/mock";
import { normalizeChampionship } from "@/lib/adapters";
import { pickImage, resolveImageUrl } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import { useRemoteList } from "@/lib/useRemoteList";
import { colors } from "@/theme/colors";

type Story = {
  id: string;
  user_id?: string | null;
  equipe_id?: string | null;
  produtora_id?: string | null;
  tipo?: string | null;
  media_url?: string | null;
  descricao?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
};

type StoryStats = Record<
  string,
  {
    likes: number;
    comments: number;
    reposts: number;
    views: number;
    liked: boolean;
    reposted: boolean;
    viewed: boolean;
  }
>;

type StoryAudience = {
  id: string;
  nome: string;
  foto?: string | null;
  created_at?: string | null;
};

type AutoFeedCard = {
  id: string;
  type:
    | "ranking"
    | "campeao"
    | "agenda"
    | "vagas"
    | "hoje"
    | "resultado"
    | "escalacao"
    | "destaque";
  section?: "today" | "open" | "results" | "team";
  title: string;
  subtitle?: string;
  image?: string | null;
  championshipId?: string | null;
  href?: string | null;
  cta?: string;
  rows?: Array<{
    label: string;
    value?: string | number | null;
    image?: string | null;
    matches?: number;
    booyahs?: number;
    kills?: number;
    points?: number;
  }>;
};

function relationOne(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function createStoryId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (randomUUID) return randomUUID.call(globalThis.crypto);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

const emptyStat = {
  likes: 0,
  comments: 0,
  reposts: 0,
  views: 0,
  liked: false,
  reposted: false,
  viewed: false,
};
const createOptions = [
  { label: "Novo story 24h", type: "post", icon: "time-outline" },
  { label: "Novo campeonato", type: "campeonato", icon: "trophy-outline" },
  { label: "Nova equipe", type: "equipe", icon: "shield-outline" },
  {
    label: "Novo perfil de jogo",
    type: "perfil-jogo",
    icon: "person-circle-outline",
  },
] as const;

function timeLeft(expiresAt?: string | null) {
  const diff = expiresAt
    ? new Date(expiresAt).getTime() - Date.now()
    : 24 * 3600000;
  if (diff <= 0) return "expirado";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${Math.max(1, m)}m`;
}

function authorKey(story: Story) {
  if (story.equipe_id) return `equipe:${story.equipe_id}`;
  if (story.produtora_id) return `produtora:${story.produtora_id}`;
  if (story.user_id) return `usuario:${story.user_id}`;
  return "usuario:dropzone";
}

export default function Feed() {
  const [stories, setStories] = useState<Story[]>([]);
  const [stats, setStats] = useState<StoryStats>({});
  const [authors, setAuthors] = useState<
    Record<string, { nome: string; foto?: string | null }>
  >({});
  const [selected, setSelected] = useState<Story | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [autoCards, setAutoCards] = useState<AutoFeedCard[]>([]);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [audienceTab, setAudienceTab] = useState<"views" | "likes">("views");
  const [viewers, setViewers] = useState<StoryAudience[]>([]);
  const [likers, setLikers] = useState<StoryAudience[]>([]);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [repostCaption, setRepostCaption] = useState("");
  const [repostStory, setRepostStory] = useState<Story | null>(null);
  const [dashboardCounts, setDashboardCounts] = useState({
    today: 0,
    open: 0,
    results: 0,
    team: 0,
  });
  const progress = useRef(new Animated.Value(0)).current;

  const { data: recentChamps } = useRemoteList({
    table: ["campeonatos"],
    select:
      "id,nome,slug,logo_url,banner_url,valor_vaga,valor_premiacao,vagas,quantidade_equipes,status,formato,tipo,tipo_campeonato,tipo_competicao,modelo_competicao,regiao,plataforma,categoria,created_at",
    limit: 8,
    fallback: mock.campeonatos,
    mapRow: normalizeChampionship,
  });

  const buildAutoCards = useCallback(async () => {
    if (!supabase) {
      const fallbackCards: AutoFeedCard[] = recentChamps
        .slice(0, 3)
        .map((champ: any) => ({
          id: `destaque:${champ.id || champ.nome}`,
          type: "destaque",
          title: champ.nome || "Campeonato em destaque",
          subtitle: champ.meta || `${champ.status || "ativo"} • campeonato`,
          image: pickImage(
            champ,
            ["banner_url", "logo_url"],
            "imagem_campeonatos",
          ),
          championshipId: champ.id,
          cta: "Saiba mais",
        }));
      setAutoCards(fallbackCards);
      return;
    }

    const cards: AutoFeedCard[] = [];
    const champs = (recentChamps || []).filter((champ: any) => champ?.id);
    const principal = champs[0];

    if (principal) {
      try {
        const { data } = await supabase
          .from("classificacao_geral")
          .select(
            "campeonato_id,equipe_id,nome_equipe,equipe_nome,tag,pontos,total,abates,kills,posicao,logo_url,equipes(nome,tag,logo_url)",
          )
          .eq("campeonato_id", principal.id)
          .order("posicao", { ascending: true })
          .limit(6);
        const rows = (data || []).map((row: any, index: number) => ({
          label:
            row.nome_equipe ||
            row.equipe_nome ||
            relationOne(row.equipes)?.tag ||
            relationOne(row.equipes)?.nome ||
            row.tag ||
            `Equipe ${index + 1}`,
          value: row.pontos ?? row.total ?? row.abates ?? row.kills ?? 0,
          image: row.logo_url || relationOne(row.equipes)?.logo_url || null,
        }));
        if (rows.length) {
          cards.push({
            id: `ranking:${principal.id}`,
            type: "ranking",
            title: `Top 6 • ${principal.nome}`,
            subtitle: "Tabela parcial do campeonato",
            image: pickImage(
              principal,
              ["banner_url", "logo_url"],
              "imagem_campeonatos",
            ),
            championshipId: principal.id,
            cta: "Ver tabela completa",
            rows,
          });
        }
      } catch {}
    }

    try {
      const finalizados = champs.filter((champ: any) =>
        String(champ.status || "")
          .toLowerCase()
          .includes("final"),
      );
      const alvo =
        finalizados[0] ||
        champs.find((champ: any) =>
          String(champ.status || "")
            .toLowerCase()
            .includes("ativo"),
        ) ||
        principal;
      if (alvo) {
        const { data } = await supabase
          .from("classificacao_geral")
          .select(
            "campeonato_id,equipe_id,nome_equipe,equipe_nome,tag,pontos,total,posicao,logo_url,equipes(nome,tag,logo_url)",
          )
          .eq("campeonato_id", alvo.id)
          .order("posicao", { ascending: true })
          .limit(1);
        const winner = data?.[0];
        if (winner) {
          cards.push({
            id: `campeao:${alvo.id}`,
            type: "campeao",
            title:
              winner.nome_equipe ||
              winner.equipe_nome ||
              relationOne(winner.equipes)?.nome ||
              winner.tag ||
              "Campeão definido",
            subtitle: `Campeão • ${alvo.nome}`,
            image:
              winner.logo_url ||
              relationOne(winner.equipes)?.logo_url ||
              pickImage(alvo, ["logo_url", "banner_url"], "imagem_campeonatos"),
            championshipId: alvo.id,
            cta: "Ver campeonato",
          });
        }
      }
    } catch {}

    try {
      const today = new Date();
      const end = new Date(Date.now() + 7 * 24 * 3600000);
      const { data } = await supabase
        .from("agenda_eventos")
        .select(
          "id,titulo,descricao,data_evento,horario,campeonato_id,campeonatos(nome,logo_url,banner_url)",
        )
        .gte("data_evento", today.toISOString().slice(0, 10))
        .lte("data_evento", end.toISOString().slice(0, 10))
        .order("data_evento", { ascending: true })
        .limit(3);
      (data || []).forEach((event: any) => {
        cards.push({
          id: `agenda:${event.id}`,
          type: "agenda",
          title: event.titulo || "Próximo jogo",
          subtitle: `${event.campeonatos?.nome || "Agenda"} • ${event.data_evento || ""}${event.horario ? ` ${String(event.horario).slice(0, 5)}` : ""}`,
          image:
            event.campeonatos?.banner_url ||
            event.campeonatos?.logo_url ||
            null,
          championshipId: event.campeonato_id,
          cta: "Ver agenda",
        });
      });
    } catch {}

    const vagasCards = champs
      .filter(
        (champ: any) =>
          Number(champ.vagas || champ.quantidade_equipes || 0) > 0 &&
          !String(champ.status || "")
            .toLowerCase()
            .includes("final"),
      )
      .slice(0, 2)
      .map((champ: any) => ({
        id: `vagas:${champ.id}`,
        type: "vagas" as const,
        title: champ.nome || "Campeonato com vagas",
        subtitle: `${champ.vagas || champ.quantidade_equipes || 0} vagas • ${champ.valor_vaga ? `R$ ${Number(champ.valor_vaga).toFixed(2).replace(".", ",")}` : "inscrições abertas"}`,
        image: pickImage(
          champ,
          ["banner_url", "logo_url"],
          "imagem_campeonatos",
        ),
        championshipId: champ.id,
        cta: "Saiba mais",
      }));
    cards.push(...vagasCards);

    if (!cards.length) {
      cards.push(
        ...champs.slice(0, 4).map((champ: any) => ({
          id: `destaque:${champ.id}`,
          type: "destaque" as const,
          title: champ.nome || "Campeonato em destaque",
          subtitle: champ.meta || `${champ.status || "ativo"} • campeonato`,
          image: pickImage(
            champ,
            ["banner_url", "logo_url"],
            "imagem_campeonatos",
          ),
          championshipId: champ.id,
          cta: "Saiba mais",
        })),
      );
    }
    setAutoCards(cards.slice(0, 8));
  }, [recentChamps]);

  const buildPriorityFeed = useCallback(async () => {
    if (!supabase) return buildAutoCards();

    const cards: AutoFeedCard[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id || "";
    const [champResult, agendaResult, resultsResult] = await Promise.all([
      supabase
        .from("campeonatos")
        .select(
          "id,nome,logo_url,banner_url,status,vagas,quantidade_equipes,valor_vaga,data_inicio,data_encerramento_inscricoes,horario_inicio",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("agenda_eventos")
        .select(
          "id,titulo,data_evento,horario,campeonato_id,campeonatos(nome,logo_url,banner_url)",
        )
        .eq("data_evento", today)
        .order("horario", { ascending: true })
        .limit(5),
      supabase
        .from("resultados_jogos")
        .select(
          "id,campeonato_id,jogo_id,equipe_id,posicao,abates,total_pontos,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(40),
    ]);

    const champs = (champResult.data || []) as any[];
    const champIds = champs.map((champ) => String(champ.id));
    const registrations = champIds.length
      ? await supabase
          .from("campeonato_equipes")
          .select("id,campeonato_id")
          .in("campeonato_id", champIds)
      : { data: [] as any[] };
    const occupiedByChamp = new Map<string, number>();
    (registrations.data || []).forEach((row: any) => {
      const id = String(row.campeonato_id);
      occupiedByChamp.set(id, (occupiedByChamp.get(id) || 0) + 1);
    });

    const openChamps = champs.filter((champ) => {
      const status = String(champ.status || "").toLowerCase();
      const capacity = Number(champ.vagas || champ.quantidade_equipes || 0);
      return (
        capacity > (occupiedByChamp.get(String(champ.id)) || 0) &&
        !status.includes("final") &&
        !status.includes("cancel")
      );
    });
    const todayChamps = openChamps.filter(
      (champ) =>
        String(champ.data_inicio || "").slice(0, 10) === today ||
        String(champ.data_encerramento_inscricoes || "").slice(0, 10) === today,
    );

    (agendaResult.data || []).slice(0, 3).forEach((event: any) => {
      const champ = relationOne(event.campeonatos);
      cards.push({
        id: `agenda:${event.id}`,
        type: "hoje",
        section: "today",
        title: event.titulo || champ?.nome || "Evento de hoje",
        subtitle: `${event.horario ? String(event.horario).slice(0, 5) : "Hoje"} - ${champ?.nome || "Agenda"}`,
        image: champ?.logo_url || champ?.banner_url || null,
        championshipId: event.campeonato_id,
        cta: "Abrir",
      });
    });
    todayChamps.slice(0, 3).forEach((champ) => {
      const capacity = Number(champ.vagas || champ.quantidade_equipes || 0);
      const left = Math.max(
        0,
        capacity - (occupiedByChamp.get(String(champ.id)) || 0),
      );
      cards.push({
        id: `today:${champ.id}`,
        type: "hoje",
        section: "today",
        title: champ.nome,
        subtitle: `${left} vagas restantes - ${champ.horario_inicio ? String(champ.horario_inicio).slice(0, 5) : "hoje"}`,
        image: champ.banner_url || champ.logo_url,
        championshipId: champ.id,
        cta: "Inscrever",
      });
    });

    openChamps.slice(0, 5).forEach((champ) => {
      const capacity = Number(champ.vagas || champ.quantidade_equipes || 0);
      const left = Math.max(
        0,
        capacity - (occupiedByChamp.get(String(champ.id)) || 0),
      );
      cards.push({
        id: `open:${champ.id}`,
        type: "vagas",
        section: "open",
        title: champ.nome,
        subtitle: `${left} de ${capacity} vagas - ${champ.valor_vaga ? `R$ ${Number(champ.valor_vaga).toFixed(2).replace(".", ",")}` : "gratis"}`,
        image: champ.banner_url || champ.logo_url,
        championshipId: champ.id,
        cta: "Ver vaga",
      });
    });

    const latestResults = (resultsResult.data || []) as any[];
    const resultChampIds = Array.from(
      new Set(latestResults.map((row) => String(row.campeonato_id))),
    ).slice(0, 3);
    const resultEntryIds = Array.from(
      new Set(
        latestResults
          .filter((row) =>
            resultChampIds.includes(String(row.campeonato_id)),
          )
          .map((row) => String(row.equipe_id)),
      ),
    );
    const resultEntries = resultEntryIds.length
      ? await supabase
          .from("campeonato_equipes")
          .select("id,nome_exibicao,equipes(nome,tag,logo_url)")
          .in("id", resultEntryIds)
      : { data: [] as any[] };
    const entryById = new Map(
      (resultEntries.data || []).map((entry: any) => [
        String(entry.id),
        entry,
      ]),
    );
    resultChampIds.forEach((championshipId) => {
      const champ = champs.find(
        (item) => String(item.id) === championshipId,
      );
      const accumulated = new Map<
        string,
        {
          matches: Set<string>;
          booyahs: number;
          kills: number;
          points: number;
        }
      >();
      latestResults
        .filter((row) => String(row.campeonato_id) === championshipId)
        .forEach((row) => {
          const entryId = String(row.equipe_id);
          const current = accumulated.get(entryId) || {
            matches: new Set<string>(),
            booyahs: 0,
            kills: 0,
            points: 0,
          };
          current.matches.add(String(row.jogo_id || row.id));
          current.booyahs += Number(row.posicao) === 1 ? 1 : 0;
          current.kills += Number(row.abates || 0);
          current.points += Number(row.total_pontos || 0);
          accumulated.set(entryId, current);
        });
      const rows = Array.from(accumulated.entries())
        .map(([entryId, totals]) => {
          const entry: any = entryById.get(entryId);
          const team = relationOne(entry?.equipes);
          return {
            label:
              entry?.nome_exibicao || team?.tag || team?.nome || "Equipe",
            value: `${totals.points} pts`,
            image: team?.logo_url || null,
            matches: totals.matches.size,
            booyahs: totals.booyahs,
            kills: totals.kills,
            points: totals.points,
          };
        })
        .sort(
          (a, b) =>
            Number(b.points) - Number(a.points) ||
            Number(b.booyahs) - Number(a.booyahs) ||
            Number(b.kills) - Number(a.kills),
        )
        .slice(0, 4);
      if (rows.length) {
        cards.push({
          id: `result:${championshipId}`,
          type: "resultado",
          section: "results",
          title: champ?.nome || "Resultado recente",
          subtitle: "Previa da ultima atualizacao",
          image: champ?.logo_url || champ?.banner_url || rows[0]?.image,
          championshipId,
          cta: "Ver resultado",
          rows,
        });
      }
    });

    if (userId) {
      const [ownedResult, membershipResult] = await Promise.all([
        supabase
          .from("equipes")
          .select("id,nome,tag,logo_url")
          .eq("criado_por", userId),
        supabase
          .from("membros_equipe")
          .select("equipe_id")
          .eq("user_id", userId)
          .eq("ativo", true),
      ]);
      const memberIds = (membershipResult.data || []).map((row: any) =>
        String(row.equipe_id),
      );
      const memberTeams = memberIds.length
        ? await supabase
            .from("equipes")
            .select("id,nome,tag,logo_url")
            .in("id", memberIds)
        : { data: [] as any[] };
      const teamMap = new Map<string, any>();
      [...(ownedResult.data || []), ...(memberTeams.data || [])].forEach(
        (team: any) => teamMap.set(String(team.id), team),
      );
      const teams = Array.from(teamMap.values());
      const teamIds = teams.map((team) => String(team.id));
      const linesResult = teamIds.length
        ? await supabase
            .from("lines")
            .select("id,nome,equipe_id")
            .in("equipe_id", teamIds)
            .eq("ativa", true)
        : { data: [] as any[] };
      const lineIds = (linesResult.data || []).map((line: any) =>
        String(line.id),
      );
      const playersResult = lineIds.length
        ? await supabase
            .from("lines_jogadores")
            .select("line_id,removido_em")
            .in("line_id", lineIds)
            .is("removido_em", null)
        : { data: [] as any[] };
      teams.slice(0, 3).forEach((team) => {
        const teamLines = (linesResult.data || []).filter(
          (line: any) => String(line.equipe_id) === String(team.id),
        );
        cards.push({
          id: `team:${team.id}`,
          type: "escalacao",
          section: "team",
          title: team.tag || team.nome || "Minha equipe",
          subtitle: `${teamLines.length} lines - gerencie sua escalacao`,
          image: team.logo_url,
          href: `/equipe/${team.id}`,
          cta: "Abrir elenco",
          rows: teamLines.slice(0, 3).map((line: any) => {
            const count = (playersResult.data || []).filter(
              (row: any) => String(row.line_id) === String(line.id),
            ).length;
            return {
              label: line.nome || "Line principal",
              value: `${count} jogadores`,
            };
          }),
        });
      });
    }

    setDashboardCounts({
      today: cards.filter((card) => card.section === "today").length,
      open: openChamps.length,
      results: cards.filter((card) => card.section === "results").length,
      team: cards.filter((card) => card.section === "team").length,
    });
    setAutoCards(cards);
  }, [buildAutoCards]);

  const storyIds = useMemo(
    () => stories.map((item) => String(item.id)).filter(Boolean),
    [stories],
  );
  const storyGroups = useMemo(() => {
    const grouped = new Map<string, Story[]>();
    stories.forEach((story) => {
      const key = authorKey(story);
      grouped.set(key, [...(grouped.get(key) || []), story]);
    });
    return Array.from(grouped.entries()).map(([key, items]) => ({
      key,
      stories: [...items].sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime(),
      ),
    }));
  }, [stories]);
  const viewerStories = useMemo(
    () => storyGroups.flatMap((group) => group.stories),
    [storyGroups],
  );
  const selectedId = selected?.id ? String(selected.id) : "";

  const loadStories = useCallback(async () => {
    if (!supabase) return;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("stories")
      .select(
        "id,user_id,equipe_id,produtora_id,tipo,media_url,descricao,created_at,expires_at",
      )
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(80);

    if (!error) {
      setStories((data || []) as Story[]);
      return;
    }

    // Nao buscar mais posts antigos/permanentes.
    // O feed agora usa apenas stories 24h + cards automaticos do sistema.
    setStories([]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [loadStories]),
  );

  useEffect(() => {
    buildPriorityFeed();
  }, [buildPriorityFeed]);

  useEffect(() => {
    let alive = true;
    async function loadAuthors() {
      if (!supabase || !stories.length) return;
      const ids = {
        users: new Set<string>(),
        teams: new Set<string>(),
        producers: new Set<string>(),
      };
      stories.forEach((story) => {
        if (story.user_id) ids.users.add(String(story.user_id));
        if (story.equipe_id) ids.teams.add(String(story.equipe_id));
        if (story.produtora_id) ids.producers.add(String(story.produtora_id));
      });
      const [profiles, gamers, teams, producers] = await Promise.all([
        ids.users.size
          ? supabase
              .from("profiles")
              .select("id,username,nome_exibicao,foto_url")
              .in("id", Array.from(ids.users))
          : Promise.resolve({ data: [] as any[] }),
        ids.users.size
          ? supabase
              .from("perfis_jogo")
              .select("id,user_id,nick,foto_capa,ativo,updated_at")
              .in("user_id", Array.from(ids.users))
              .eq("ativo", true)
              .order("updated_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        ids.teams.size
          ? supabase
              .from("equipes")
              .select("id,nome,tag,logo_url")
              .in("id", Array.from(ids.teams))
          : Promise.resolve({ data: [] as any[] }),
        ids.producers.size
          ? supabase
              .from("produtoras")
              .select("id,nome,logo_url")
              .in("id", Array.from(ids.producers))
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (!alive) return;
      const next: Record<string, { nome: string; foto?: string | null }> = {};
      const gamerByUser = new Map<string, any>();
      (gamers.data || []).forEach((item: any) => {
        if (item.user_id && !gamerByUser.has(String(item.user_id))) {
          gamerByUser.set(String(item.user_id), item);
        }
      });
      (profiles.data || []).forEach((item: any) => {
        const gamer = gamerByUser.get(String(item.id));
        next[`usuario:${item.id}`] = {
          nome: item.nome_exibicao || item.username || gamer?.nick || "usuario",
          foto: item.foto_url || gamer?.foto_capa || null,
        };
      });
      (gamers.data || []).forEach((item: any) => {
        const key = `usuario:${item.user_id}`;
        if (!next[key]) {
          next[key] = {
            nome: item.nick || "jogador",
            foto: item.foto_capa,
          };
        }
      });
      (teams.data || []).forEach((item: any) => {
        next[`equipe:${item.id}`] = {
          nome: item.tag || item.nome || "equipe",
          foto: item.logo_url,
        };
      });
      (producers.data || []).forEach((item: any) => {
        next[`produtora:${item.id}`] = {
          nome: item.nome || "produtora",
          foto: item.logo_url,
        };
      });
      setAuthors(next);
    }
    loadAuthors();
    return () => {
      alive = false;
    };
  }, [storyIds.join("|")]);

  useEffect(() => {
    let alive = true;
    async function loadStats() {
      if (!supabase || !storyIds.length) return;
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id || "";
      const [likes, storyComments, reposts, views] = await Promise.all([
        supabase
          .from("story_curtidas")
          .select("story_id,user_id")
          .in("story_id", storyIds),
        supabase
          .from("story_comentarios")
          .select("story_id")
          .in("story_id", storyIds),
        supabase
          .from("story_reposts")
          .select("story_id,user_id")
          .in("story_id", storyIds),
        supabase
          .from("story_visualizacoes")
          .select("story_id,user_id")
          .in("story_id", storyIds),
      ]);
      if (!alive) return;
      const next: StoryStats = {};
      storyIds.forEach((id) => {
        next[id] = { ...emptyStat };
      });
      (likes.data || []).forEach((row: any) => {
        const id = String(row.story_id);
        next[id].likes += 1;
        if (row.user_id === userId) next[id].liked = true;
      });
      (storyComments.data || []).forEach((row: any) => {
        const id = String(row.story_id);
        next[id].comments += 1;
      });
      (reposts.data || []).forEach((row: any) => {
        const id = String(row.story_id);
        next[id].reposts += 1;
        if (row.user_id === userId) next[id].reposted = true;
      });
      (views.data || []).forEach((row: any) => {
        const id = String(row.story_id);
        if (next[id]) {
          next[id].views += 1;
          if (row.user_id === userId) next[id].viewed = true;
        }
      });
      setStats(next);
    }
    loadStats();
    return () => {
      alive = false;
    };
  }, [storyIds.join("|")]);

  useEffect(() => {
    async function loadComments() {
      if (!supabase || !selectedId) return setComments([]);
      const { data } = await supabase
        .from("story_comentarios")
        .select("id,user_id,comentario,created_at")
        .eq("story_id", selectedId)
        .order("created_at");
      setComments(data || []);
    }
    loadComments();
  }, [selectedId, stats[selectedId]?.comments]);

  const selectedStoryIndex = useMemo(
    () => viewerStories.findIndex((story) => String(story.id) === selectedId),
    [selectedId, viewerStories],
  );
  const selectedGroup = useMemo(
    () =>
      storyGroups.find((group) =>
        group.stories.some((story) => String(story.id) === selectedId),
      ),
    [selectedId, storyGroups],
  );
  const selectedGroupIndex = useMemo(
    () =>
      selectedGroup?.stories.findIndex(
        (story) => String(story.id) === selectedId,
      ) ?? -1,
    [selectedGroup, selectedId],
  );

  const goToStory = useCallback(
    (offset: number) => {
      if (selectedStoryIndex < 0) return;
      const next = viewerStories[selectedStoryIndex + offset];
      if (next) setSelected(next);
      else setSelected(null);
    },
    [selectedStoryIndex, viewerStories],
  );

  useEffect(() => {
    if (
      !selectedId ||
      selectedStoryIndex < 0 ||
      audienceOpen ||
      repostOpen
    )
      return;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 7000,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) goToStory(1);
    });
    return () => animation.stop();
  }, [
    audienceOpen,
    goToStory,
    progress,
    repostOpen,
    selectedId,
    selectedStoryIndex,
  ]);

  useEffect(() => {
    let alive = true;
    async function registerView() {
      if (!supabase || !selectedId || selectedStoryIndex < 0) return;
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId || selected?.user_id === userId) return;
      const { error } = await supabase
        .from("story_visualizacoes")
        .upsert(
          { story_id: selectedId, user_id: userId },
          { onConflict: "story_id,user_id" },
        );
      if (error || !alive) return;
      const { count } = await supabase
        .from("story_visualizacoes")
        .select("id", { count: "exact", head: true })
        .eq("story_id", selectedId);
      if (!alive || count == null) return;
      setStats((prev) => ({
        ...prev,
        [selectedId]: {
          ...(prev[selectedId] || emptyStat),
          views: count,
          viewed: true,
        },
      }));
    }
    registerView();
    return () => {
      alive = false;
    };
  }, [selected?.user_id, selectedId, selectedStoryIndex]);

  async function getUserOrAlert() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    if (!data.user) Alert.alert("Stories", "Faca login para interagir.");
    return data.user || null;
  }

  async function toggleLike(storyId: string) {
    if (!supabase || saving) return;
    const user = await getUserOrAlert();
    if (!user) return;
    const current = stats[storyId] || { ...emptyStat };
    setSaving(`like:${storyId}`);
    const { error } = current.liked
      ? await supabase
          .from("story_curtidas")
          .delete()
          .eq("story_id", storyId)
          .eq("user_id", user.id)
      : await supabase
          .from("story_curtidas")
          .upsert(
            { story_id: storyId, user_id: user.id },
            { onConflict: "story_id,user_id" },
          );
    setSaving(null);
    if (error) return Alert.alert("Curtir", error.message);
    setStats((prev) => ({
      ...prev,
      [storyId]: {
        ...(prev[storyId] || emptyStat),
        liked: !current.liked,
        likes: Math.max(
          0,
          (prev[storyId]?.likes || 0) + (current.liked ? -1 : 1),
        ),
      },
    }));
  }

  async function sendComment() {
    if (!supabase || !selectedId || !commentText.trim() || saving) return;
    const user = await getUserOrAlert();
    if (!user) return;
    setSaving(`comment:${selectedId}`);
    const { error } = await supabase
      .from("story_comentarios")
      .insert({
        story_id: selectedId,
        user_id: user.id,
        comentario: commentText.trim(),
      });
    setSaving(null);
    if (error) return Alert.alert("Comentario", error.message);
    setCommentText("");
    setStats((prev) => ({
      ...prev,
      [selectedId]: {
        ...(prev[selectedId] || emptyStat),
        comments: (prev[selectedId]?.comments || 0) + 1,
      },
    }));
  }

  function resolveAudiencePeople(rows: any[], profiles: any[], gamers: any[]) {
    const profilesById = new Map(
      profiles.map((item: any) => [String(item.id), item]),
    );
    const gamersByUser = new Map<string, any>();
    gamers.forEach((item: any) => {
      const userId = String(item.user_id || "");
      if (userId && !gamersByUser.has(userId)) gamersByUser.set(userId, item);
    });
    return rows.map((row: any) => {
      const userId = String(row.user_id || "");
      const profile = profilesById.get(userId);
      const gamer = gamersByUser.get(userId);
      return {
        id: `${userId}:${row.created_at || ""}`,
        nome:
          profile?.nome_exibicao ||
          profile?.username ||
          gamer?.nick ||
          "Usuario",
        foto: profile?.foto_url || gamer?.foto_capa || null,
        created_at: row.created_at,
      };
    });
  }

  async function openAudience(tab: "views" | "likes") {
    if (!supabase || !selectedId) return;
    setAudienceTab(tab);
    setAudienceOpen(true);
    setAudienceLoading(true);
    const [viewsResult, likesResult] = await Promise.all([
      supabase
        .from("story_visualizacoes")
        .select("user_id,created_at")
        .eq("story_id", selectedId)
        .not("user_id", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("story_curtidas")
        .select("user_id,created_at")
        .eq("story_id", selectedId)
        .order("created_at", { ascending: false }),
    ]);
    const rows = [...(viewsResult.data || []), ...(likesResult.data || [])];
    const userIds = Array.from(
      new Set(rows.map((row: any) => String(row.user_id || "")).filter(Boolean)),
    );
    if (!userIds.length) {
      setViewers([]);
      setLikers([]);
      setAudienceLoading(false);
      return;
    }
    const [profilesResult, gamersResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,username,nome_exibicao,foto_url")
        .in("id", userIds),
      supabase
        .from("perfis_jogo")
        .select("user_id,nick,foto_capa,ativo,updated_at")
        .in("user_id", userIds)
        .eq("ativo", true)
        .order("updated_at", { ascending: false }),
    ]);
    setViewers(
      resolveAudiencePeople(
        viewsResult.data || [],
        profilesResult.data || [],
        gamersResult.data || [],
      ),
    );
    setLikers(
      resolveAudiencePeople(
        likesResult.data || [],
        profilesResult.data || [],
        gamersResult.data || [],
      ),
    );
    setAudienceLoading(false);
  }

  function prepareRepost(story: Story) {
    setRepostStory(story);
    setRepostCaption(story.descricao || "");
    setRepostOpen(true);
  }

  async function repost(story: Story, caption: string) {
    if (!supabase || saving) return;
    const user = await getUserOrAlert();
    if (!user) return;
    const storyId = String(story.id);
    if (stats[storyId]?.reposted)
      return Alert.alert("Repostar", "Voce ja repostou este story.");
    setSaving(`repost:${storyId}`);
    const { error } = await supabase
      .from("story_reposts")
      .upsert(
        { story_id: storyId, user_id: user.id },
        { onConflict: "story_id,user_id" },
      );
    if (!error) {
      await supabase
        .from("stories")
        .insert({
          id: createStoryId(),
          user_id: user.id,
          tipo: "usuario",
          media_url: story.media_url || null,
          descricao: caption.trim(),
          expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
        });
    }
    setSaving(null);
    if (error) return Alert.alert("Repostar", error.message);
    setStats((prev) => ({
      ...prev,
      [storyId]: {
        ...(prev[storyId] || emptyStat),
        reposted: true,
        reposts: (prev[storyId]?.reposts || 0) + 1,
      },
    }));
    setRepostOpen(false);
    setRepostStory(null);
    setRepostCaption("");
    loadStories();
  }

  async function shareExternal(story: Story) {
    const author = storyAuthor(story);
    const message = [
      story.descricao || `Story de ${author.nome} no Drop Zone`,
      story.media_url || "",
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await Share.share(
        {
          title: `Story de ${author.nome}`,
          message,
          url: story.media_url || undefined,
        },
        { dialogTitle: "Compartilhar story" },
      );
    } catch (error: any) {
      Alert.alert(
        "Compartilhar",
        error?.message || "Nao foi possivel abrir o compartilhamento.",
      );
    }
  }

  function openCreate(type: string) {
    setCreateOpen(false);
    router.push(`/criar/${type}` as any);
  }

  function storyAuthor(story: Story) {
    return (
      authors[authorKey(story)] || {
        nome: story.tipo || "Drop Zone",
        foto: null,
      }
    );
  }

  function openAuthor(story: Story) {
    if (story.equipe_id) router.push(`/equipe/${story.equipe_id}` as any);
    else if (story.produtora_id)
      router.push(`/produtora/${story.produtora_id}` as any);
  }

  function renderStory(story: Story) {
    const author = storyAuthor(story);
    const image =
      resolveImageUrl(story.media_url, "post-images") ||
      resolveImageUrl(story.media_url, "imagem_campeonatos");
    const stat = stats[story.id] || { ...emptyStat };
    return (
      <Pressable
        key={story.id}
        onPress={() => setSelected(story)}
        style={styles.storyCard}
      >
        <View style={styles.head}>
          <Pressable onPress={() => openAuthor(story)}>
            <LogoAvatar
              name={author.nome}
              uri={author.foto || undefined}
              size={36}
              type="player"
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Body style={styles.author}>{author.nome}</Body>
            <Tiny>{timeLeft(story.expires_at)} restantes</Tiny>
          </View>
          <Tiny style={styles.badge24}>24H</Tiny>
        </View>
        {image ? (
          <Image source={{ uri: image }} style={styles.storyImage} />
        ) : (
          <View style={styles.textOnly}>
            <Body style={styles.textOnlyText}>
              {story.descricao || "Story"}
            </Body>
          </View>
        )}
        {story.descricao && image ? (
          <Body style={styles.caption}>{story.descricao}</Body>
        ) : null}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => toggleLike(story.id)}
          >
            <Ionicons
              name={stat.liked ? "heart" : "heart-outline"}
              size={22}
              color={stat.liked ? colors.danger : colors.text}
            />
            <Tiny>{stat.likes}</Tiny>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => setSelected(story)}
          >
            <Ionicons name="chatbubble-outline" size={21} color={colors.text} />
            <Tiny>{stat.comments}</Tiny>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => prepareRepost(story)}
          >
            <Ionicons
              name={stat.reposted ? "repeat" : "repeat-outline"}
              size={22}
              color={stat.reposted ? colors.primary : colors.text}
            />
            <Tiny>{stat.reposts}</Tiny>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  function openAutoCard(card: AutoFeedCard) {
    if (card.href) router.push(card.href as any);
    else if (card.championshipId)
      router.push(`/campeonato/${card.championshipId}` as any);
    else router.push("/(tabs)/campeonatos" as any);
  }

  function renderAutoCard(card: AutoFeedCard) {
    return (
      <Pressable
        key={card.id}
        onPress={() => openAutoCard(card)}
        style={[
          styles.autoCard,
          card.type === "resultado" && styles.resultAutoCard,
        ]}
      >
        {card.type !== "resultado" ? <Pressable
          onPress={() =>
            card.image &&
            setSelected({
              id: card.id,
              media_url: card.image,
              descricao: card.title,
              expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
            })
          }
          style={styles.autoImageWrap}
        >
          {card.image ? (
            <Image source={{ uri: card.image }} style={styles.autoImage} />
          ) : (
            <View style={styles.autoImageFallback}>
              <Ionicons
                name={
                  card.type === "ranking" ? "podium-outline" : "trophy-outline"
                }
                size={30}
                color={colors.primary}
              />
            </View>
          )}
        </Pressable> : null}
        <View
          style={[
            styles.autoContent,
            card.type === "resultado" && styles.resultAutoContent,
          ]}
        >
          <View style={styles.autoBadge}>
            <Ionicons
              name={
                card.type === "ranking"
                  ? "bar-chart-outline"
                  : card.type === "campeao"
                    ? "trophy-outline"
                    : card.type === "agenda"
                      ? "calendar-outline"
                      : card.type === "hoje"
                        ? "today-outline"
                        : card.type === "resultado"
                          ? "podium-outline"
                          : card.type === "escalacao"
                            ? "people-outline"
                      : "flash-outline"
              }
              size={12}
              color={colors.primary}
            />
            <Tiny style={styles.autoBadgeText}>
              {card.type === "ranking"
                ? "TABELA"
                : card.type === "campeao"
                  ? "CAMPEÃO"
                : card.type === "agenda"
                    ? "AGENDA"
                    : card.type === "hoje"
                      ? "HOJE"
                      : card.type === "resultado"
                        ? "RESULTADO"
                        : card.type === "escalacao"
                          ? "MINHA EQUIPE"
                    : card.type === "vagas"
                      ? "VAGAS"
                      : "DESTAQUE"}
            </Tiny>
          </View>
          <Body numberOfLines={2} style={styles.autoTitle}>
            {card.title}
          </Body>
          {card.subtitle ? (
            <Tiny numberOfLines={2} style={styles.autoSubtitle}>
              {card.subtitle}
            </Tiny>
          ) : null}
          {card.type === "resultado" && card.rows?.length ? (
            <View style={styles.resultTable}>
              <View style={styles.resultHead}>
                <Tiny style={styles.resultPos}>POS</Tiny>
                <Tiny style={styles.resultTeam}>EQUIPE</Tiny>
                <Tiny style={styles.resultStat}>QD</Tiny>
                <Tiny style={styles.resultStat}>B!</Tiny>
                <Tiny style={styles.resultStat}>KILL</Tiny>
                <Tiny style={[styles.resultStat, styles.resultPoints]}>PTS</Tiny>
              </View>
              {card.rows.slice(0, 4).map((row, index) => (
                <View key={`${card.id}:result:${index}`} style={styles.resultRow}>
                  <Tiny style={styles.resultPos}>{index + 1}</Tiny>
                  <View style={styles.resultTeam}>
                    <LogoAvatar
                      name={row.label}
                      uri={row.image || undefined}
                      size={22}
                      rounded={5}
                      type="team"
                    />
                    <Tiny numberOfLines={1} style={styles.resultName}>
                      {row.label}
                    </Tiny>
                  </View>
                  <Tiny style={styles.resultStat}>{row.matches || 0}</Tiny>
                  <Tiny style={styles.resultStat}>{row.booyahs || 0}</Tiny>
                  <Tiny style={styles.resultStat}>{row.kills || 0}</Tiny>
                  <Tiny style={[styles.resultStat, styles.resultPoints]}>
                    {row.points || 0}
                  </Tiny>
                </View>
              ))}
            </View>
          ) : card.rows?.length ? (
            <View style={styles.rankRows}>
              {card.rows.slice(0, 6).map((row, index) => (
                <View key={`${card.id}:row:${index}`} style={styles.rankRow}>
                  <Tiny style={styles.rankPos}>#{index + 1}</Tiny>
                  <Tiny numberOfLines={1} style={styles.rankName}>
                    {row.label}
                  </Tiny>
                  <Tiny style={styles.rankValue}>{row.value ?? 0}</Tiny>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.moreBtn}>
            <Tiny style={styles.moreText}>{card.cta || "Saiba mais"}</Tiny>
            <Ionicons name="chevron-forward" size={14} color={colors.white} />
          </View>
        </View>
      </Pressable>
    );
  }

  const selectedAuthor = selected ? storyAuthor(selected) : null;
  const selectedImage = selected
    ? resolveImageUrl(selected.media_url, "post-images") ||
      resolveImageUrl(selected.media_url, "imagem_campeonatos")
    : undefined;
  const selectedStats = selectedId
    ? stats[selectedId] || { ...emptyStat }
    : { ...emptyStat };
  const prioritySections = [
    {
      key: "today",
      title: "Para hoje",
      subtitle: "Jogos, prazos e vagas que exigem atencao agora",
      icon: "today-outline",
    },
    {
      key: "team",
      title: "Minha equipe",
      subtitle: "Lines e atalhos para ajustar a escalacao",
      icon: "people-outline",
    },
    {
      key: "open",
      title: "Vagas abertas",
      subtitle: "Campeonatos que ainda aceitam inscricoes",
      icon: "ticket-outline",
    },
    {
      key: "results",
      title: "Resultados recentes",
      subtitle: "Previas das ultimas sumulas atualizadas",
      icon: "podium-outline",
    },
  ] as const;

  return (
    <Screen showTopBar={false}>
      <View style={styles.feedTop}>
        <Pressable onPress={() => setCreateOpen(true)} style={styles.topIcon}>
          <Ionicons name="add-outline" size={28} color={colors.text} />
        </Pressable>
        <Body style={styles.brand}>Stories 24h</Body>
        <Pressable
          onPress={() => router.push("/(tabs)/chat")}
          style={styles.topIcon}
        >
          <Ionicons name="chatbubbles-outline" size={25} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        <Pressable
          onPress={() => router.push("/criar/post" as any)}
          style={styles.newStoryBubble}
        >
          <Ionicons name="add" size={26} color={colors.white} />
          <Tiny style={styles.newStoryText}>Novo</Tiny>
        </Pressable>
        {storyGroups.slice(0, 12).map((group) => {
          const preview = group.stories[group.stories.length - 1];
          const firstUnseen =
            group.stories.find((story) => !stats[story.id]?.viewed) ||
            group.stories[0];
          const groupViewed = group.stories.every(
            (story) => stats[story.id]?.viewed,
          );
          const previewImage =
            resolveImageUrl(preview.media_url, "post-images") ||
            resolveImageUrl(preview.media_url, "imagem_campeonatos");
          return (
            <Pressable
              key={`rail:${group.key}`}
              onPress={() => setSelected(firstUnseen)}
              style={[
                styles.storyBubble,
                groupViewed && styles.storyBubbleViewed,
              ]}
            >
              <View
                style={[
                  styles.storyRing,
                  groupViewed && styles.storyRingViewed,
                ]}
              >
                <LogoAvatar
                  name={storyAuthor(preview).nome}
                  uri={
                    previewImage ||
                    storyAuthor(preview).foto ||
                    undefined
                  }
                  size={54}
                  type="player"
                />
                {group.stories.length > 1 ? (
                  <View style={styles.storyCount}>
                    <Tiny style={styles.storyCountText}>
                      {group.stories.length}
                    </Tiny>
                  </View>
                ) : null}
              </View>
              <Tiny numberOfLines={1} style={styles.bubbleName}>
                {storyAuthor(preview).nome}
              </Tiny>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.priorityIntro}>
        <View style={styles.blockHead}>
          <View>
            <Tiny style={styles.priorityEyebrow}>CENTRAL DO JOGADOR</Tiny>
            <Body style={styles.priorityTitle}>O que importa agora</Body>
          </View>
          <Pressable onPress={() => buildPriorityFeed()}>
            <Ionicons name="refresh-outline" size={21} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.shortcutGrid}>
          {[
            {
              label: "Hoje",
              value: dashboardCounts.today,
              icon: "today-outline",
              route: "/(tabs)/calendario",
            },
            {
              label: "Vagas",
              value: dashboardCounts.open,
              icon: "ticket-outline",
              route: "/(tabs)/campeonatos",
            },
            {
              label: "Resultados",
              value: dashboardCounts.results,
              icon: "podium-outline",
              route: "/(tabs)/campeonatos",
            },
            {
              label: "Equipes",
              value: dashboardCounts.team,
              icon: "shield-outline",
              route: "/(tabs)/equipes",
            },
          ].map((shortcut) => (
            <Pressable
              key={shortcut.label}
              onPress={() => router.push(shortcut.route as any)}
              style={styles.shortcut}
            >
              <View style={styles.shortcutIcon}>
                <Ionicons
                  name={shortcut.icon as any}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Body style={styles.shortcutValue}>{shortcut.value}</Body>
              <Tiny style={styles.shortcutLabel}>{shortcut.label}</Tiny>
            </Pressable>
          ))}
        </View>
      </View>

      {prioritySections.map((section) => {
        const items = autoCards.filter((card) => card.section === section.key);
        if (!items.length && section.key !== "today") return null;
        return (
          <View key={section.key} style={styles.prioritySection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name={section.icon}
                  size={19}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Body style={styles.sectionTitle}>{section.title}</Body>
                <Tiny>{section.subtitle}</Tiny>
              </View>
              <Tiny style={styles.sectionCount}>{items.length}</Tiny>
            </View>
            {section.key === "team" && items.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.teamLogoRail}
              >
                {items.map((card) => (
                  <Pressable
                    key={card.id}
                    onPress={() => openAutoCard(card)}
                    style={styles.teamLogoShortcut}
                  >
                    <LogoAvatar
                      name={card.title}
                      uri={card.image || undefined}
                      size={58}
                      rounded={12}
                      type="team"
                    />
                    <Tiny numberOfLines={1} style={styles.teamLogoName}>
                      {card.title}
                    </Tiny>
                  </Pressable>
                ))}
              </ScrollView>
            ) : items.length ? (
              items.slice(0, section.key === "open" ? 4 : 3).map(renderAutoCard)
            ) : (
              <View style={styles.emptyPriority}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color={colors.success}
                />
                <Tiny>Nenhuma pendencia importante para hoje.</Tiny>
              </View>
            )}
          </View>
        );
      })}

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.viewerOverlay}>
          {selectedGroup && selectedGroupIndex >= 0 ? (
            <View style={styles.progressRow}>
              {selectedGroup.stories.map((story, index) => (
                <View key={`progress:${story.id}`} style={styles.progressTrack}>
                  {index < selectedGroupIndex ? (
                    <View style={styles.progressComplete} />
                  ) : index === selectedGroupIndex ? (
                    <Animated.View
                      style={[
                        styles.progressComplete,
                        {
                          width: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          }),
                        },
                      ]}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.viewerTop}>
            {selectedAuthor ? (
              <LogoAvatar
                name={selectedAuthor.nome}
                uri={selectedAuthor.foto || undefined}
                size={38}
                type="player"
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Body style={styles.viewerAuthor}>
                {selectedAuthor?.nome || "Story"}
              </Body>
              <Tiny>{timeLeft(selected?.expires_at)} restantes</Tiny>
            </View>
            <Pressable
              onPress={() => setSelected(null)}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={28} color={colors.white} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.viewerBody}
            contentContainerStyle={styles.viewerContent}
          >
            {selectedImage ? (
              <View style={styles.viewerMedia}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
                <Pressable
                  onPress={() => goToStory(-1)}
                  disabled={selectedStoryIndex <= 0}
                  style={styles.previousZone}
                />
                <Pressable
                  onPress={() => goToStory(1)}
                  style={styles.nextZone}
                />
              </View>
            ) : (
              <View style={[styles.viewerTextOnly, styles.viewerMedia]}>
                <Body style={styles.viewerText}>
                  {selected?.descricao || "Story"}
                </Body>
                <Pressable
                  onPress={() => goToStory(-1)}
                  disabled={selectedStoryIndex <= 0}
                  style={styles.previousZone}
                />
                <Pressable
                  onPress={() => goToStory(1)}
                  style={styles.nextZone}
                />
              </View>
            )}
            {selected?.descricao ? (
              <Body style={styles.viewerCaption}>{selected.descricao}</Body>
            ) : null}
            <View style={styles.viewerActions}>
              <Pressable
                style={styles.viewerAction}
                onPress={() => selectedId && toggleLike(selectedId)}
              >
                <Ionicons
                  name={selectedStats.liked ? "heart" : "heart-outline"}
                  size={22}
                  color={selectedStats.liked ? colors.danger : colors.white}
                />
                <Tiny style={styles.viewerActionText}>
                  {selectedStats.likes} curtidas
                </Tiny>
              </Pressable>
              <Pressable
                style={styles.viewerAction}
                onPress={() => openAudience("likes")}
              >
                <Ionicons
                  name="people-outline"
                  size={22}
                  color={colors.white}
                />
                <Tiny style={styles.viewerActionText}>
                  {selectedStats.likes} curtiram
                </Tiny>
              </Pressable>
              <Pressable
                style={styles.viewerAction}
                onPress={() => openAudience("views")}
              >
                <Ionicons name="eye-outline" size={22} color={colors.white} />
                <Tiny style={styles.viewerActionText}>
                  {selectedStats.views} viram
                </Tiny>
              </Pressable>
            </View>
            <View style={styles.shareRow}>
              <Pressable
                style={styles.shareOption}
                onPress={() => selected && prepareRepost(selected)}
              >
                <Ionicons name="repeat-outline" size={22} color={colors.white} />
                <Tiny style={styles.viewerActionText}>Repostar no app</Tiny>
              </Pressable>
              <Pressable
                style={styles.shareOption}
                onPress={() => selected && shareExternal(selected)}
              >
                <Ionicons
                  name="share-social-outline"
                  size={22}
                  color={colors.white}
                />
                <Tiny style={styles.viewerActionText}>Outros apps</Tiny>
              </Pressable>
            </View>
            <View style={styles.commentsPanel}>
              <Body style={styles.commentsTitle}>Comentarios</Body>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Body style={styles.commentText}>{comment.comentario}</Body>
                  <Tiny>
                    {new Date(comment.created_at).toLocaleString("pt-BR")}
                  </Tiny>
                </View>
              ))}
              <Input
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Comentar story..."
                multiline
              />
              <Button
                label={
                  saving === `comment:${selectedId}`
                    ? "Enviando..."
                    : "Enviar comentario"
                }
                onPress={sendComment}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={audienceOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAudienceOpen(false)}
      >
        <Pressable
          style={styles.audienceBackdrop}
          onPress={() => setAudienceOpen(false)}
        />
        <View style={styles.audienceSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.audienceTabs}>
            <Pressable
              onPress={() => setAudienceTab("views")}
              style={[
                styles.audienceTab,
                audienceTab === "views" && styles.audienceTabActive,
              ]}
            >
              <Ionicons
                name="eye-outline"
                size={19}
                color={
                  audienceTab === "views" ? colors.primary : colors.muted
                }
              />
              <Body style={styles.audienceTabText}>
                Visualizaram {viewers.length}
              </Body>
            </Pressable>
            <Pressable
              onPress={() => setAudienceTab("likes")}
              style={[
                styles.audienceTab,
                audienceTab === "likes" && styles.audienceTabActive,
              ]}
            >
              <Ionicons
                name="heart-outline"
                size={19}
                color={
                  audienceTab === "likes" ? colors.primary : colors.muted
                }
              />
              <Body style={styles.audienceTabText}>
                Curtiram {likers.length}
              </Body>
            </Pressable>
          </View>
          <ScrollView style={styles.audienceList}>
            {audienceLoading ? (
              <Tiny style={styles.audienceEmpty}>Carregando...</Tiny>
            ) : (audienceTab === "views" ? viewers : likers).length ? (
              (audienceTab === "views" ? viewers : likers).map((person) => (
                <View key={person.id} style={styles.audiencePerson}>
                  <LogoAvatar
                    name={person.nome}
                    uri={person.foto || undefined}
                    size={44}
                    type="player"
                  />
                  <View style={{ flex: 1 }}>
                    <Body style={styles.audienceName}>{person.nome}</Body>
                    <Tiny>
                      {person.created_at
                        ? new Date(person.created_at).toLocaleString("pt-BR")
                        : ""}
                    </Tiny>
                  </View>
                </View>
              ))
            ) : (
              <Tiny style={styles.audienceEmpty}>
                Nenhuma pessoa nesta lista ainda.
              </Tiny>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={repostOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRepostOpen(false)}
      >
        <Pressable
          style={styles.audienceBackdrop}
          onPress={() => setRepostOpen(false)}
        />
        <View style={styles.repostSheet}>
          <View style={styles.sheetHandle} />
          <Body style={styles.repostTitle}>Repostar no Drop Zone</Body>
          {repostStory?.media_url ? (
            <Image
              source={{ uri: repostStory.media_url }}
              style={styles.repostPreview}
              resizeMode="cover"
            />
          ) : null}
          <Input
            value={repostCaption}
            onChangeText={setRepostCaption}
            placeholder="Adicione ou edite a legenda..."
            multiline
          />
          <Button
            label={
              saving === `repost:${repostStory?.id}`
                ? "Publicando..."
                : "Publicar story"
            }
            onPress={() =>
              repostStory && repost(repostStory, repostCaption)
            }
          />
        </View>
      </Modal>

      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setCreateOpen(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {createOptions.map((item) => (
            <Pressable
              key={item.type}
              onPress={() => openCreate(item.type)}
              style={styles.createOption}
            >
              <Ionicons name={item.icon as any} size={22} color={colors.text} />
              <Body style={styles.createText}>{item.label}</Body>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.muted2}
              />
            </Pressable>
          ))}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  feedTop: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  topIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 23, fontWeight: "900", color: colors.text },
  rail: { gap: 10, paddingVertical: 8, paddingRight: 14 },
  newStoryBubble: {
    width: 70,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.primary,
    gap: 4,
  },
  newStoryText: { color: colors.white },
  storyBubble: { width: 70, alignItems: "center", gap: 5 },
  storyBubbleViewed: { opacity: 0.68 },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  storyRingViewed: { borderColor: colors.muted2 },
  storyCount: {
    position: "absolute",
    right: -4,
    bottom: -3,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
  },
  storyCountText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "900",
  },
  bubbleName: { width: 68, textAlign: "center" },
  storyCard: {
    marginHorizontal: -10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingBottom: 16,
    backgroundColor: colors.bg,
  },
  head: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  author: { fontWeight: "900", fontSize: 14 },
  badge24: { color: colors.primary, fontWeight: "900" },
  storyImage: { width: "100%", aspectRatio: 1, backgroundColor: colors.panel2 },
  textOnly: {
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.panel2,
  },
  textOnlyText: { textAlign: "center", fontSize: 18, fontWeight: "900" },
  caption: {
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 13.5,
    lineHeight: 19,
  },
  actionRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 12,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  champsBlock: {
    marginHorizontal: -10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  priorityIntro: {
    marginHorizontal: -10,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: 12,
  },
  priorityEyebrow: {
    color: colors.primary,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  priorityTitle: { marginTop: 2, fontSize: 19, fontWeight: "900" },
  shortcutGrid: {
    flexDirection: "row",
    gap: 7,
  },
  shortcut: {
    flex: 1,
    minWidth: 0,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  shortcutIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
  },
  shortcutValue: { fontSize: 17, fontWeight: "900", lineHeight: 20 },
  shortcutLabel: { fontSize: 9, fontWeight: "800", textAlign: "center" },
  prioritySection: {
    marginHorizontal: -10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: 8,
  },
  sectionHeader: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    backgroundColor: colors.primarySoft,
  },
  sectionTitle: { fontSize: 15, fontWeight: "900" },
  sectionCount: {
    minWidth: 26,
    height: 24,
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: 12,
    color: colors.primary,
    fontWeight: "900",
    backgroundColor: colors.primarySoft,
  },
  emptyPriority: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  blockHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  blockTitle: { fontWeight: "900", fontSize: 14 },
  blockAction: { color: colors.primary, fontWeight: "800" },
  champCard: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 8,
    padding: 8,
    backgroundColor: colors.card,
  },
  champInfo: { flex: 1, minWidth: 0 },
  champName: { fontWeight: "900", fontSize: 13 },
  joinBtn: {
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
  },
  joinText: { color: colors.white, fontWeight: "900", fontSize: 9.5 },

  autoCard: {
    minHeight: 122,
    maxHeight: 190,
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    padding: 8,
    backgroundColor: colors.card,
  },
  resultAutoCard: {
    maxHeight: 340,
    minHeight: 250,
    flexDirection: "column",
  },
  resultAutoContent: { width: "100%" },
  autoImageWrap: {
    width: 104,
    height: 104,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.panel2,
  },
  autoImage: { width: 104, height: 104, resizeMode: "cover" },
  autoImageFallback: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  autoContent: { flex: 1, minWidth: 0, gap: 4, alignSelf: "stretch" },
  autoBadge: {
    alignSelf: "flex-start",
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
  },
  autoBadgeText: { color: colors.primary, fontWeight: "900", fontSize: 9 },
  autoTitle: { fontSize: 14.5, fontWeight: "900", lineHeight: 18 },
  autoSubtitle: { lineHeight: 15 },
  rankRows: { gap: 1, marginTop: 1, maxHeight: 108 },
  rankRow: { height: 16, flexDirection: "row", alignItems: "center", gap: 5 },
  rankPos: { width: 24, color: colors.primary, fontWeight: "900", fontSize: 9 },
  rankName: { flex: 1, fontWeight: "700", fontSize: 10.5 },
  rankValue: {
    minWidth: 28,
    textAlign: "right",
    fontWeight: "900",
    fontSize: 10.5,
  },
  resultTable: {
    marginTop: 3,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 6,
    overflow: "hidden",
  },
  resultHead: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.panel2,
    paddingHorizontal: 5,
  },
  resultRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingHorizontal: 5,
  },
  resultPos: {
    width: 25,
    textAlign: "center",
    fontSize: 8,
    fontWeight: "900",
  },
  resultTeam: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  resultName: { flex: 1, fontSize: 9, fontWeight: "900" },
  resultStat: {
    width: 30,
    textAlign: "center",
    fontSize: 8,
    fontWeight: "800",
  },
  resultPoints: { color: colors.primary, fontWeight: "900" },
  teamLogoRail: { gap: 12, paddingRight: 12 },
  teamLogoShortcut: {
    width: 76,
    alignItems: "center",
    gap: 5,
  },
  teamLogoName: {
    width: 76,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "900",
  },
  moreBtn: {
    alignSelf: "flex-start",
    marginTop: "auto",
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
  },
  moreText: { color: colors.white, fontWeight: "900", fontSize: 9.5 },
  emptyAuto: {
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
  emptyBox: {
    minHeight: 210,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    backgroundColor: colors.card,
    padding: 18,
  },
  emptyTitle: { fontWeight: "900", fontSize: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.bg,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  createOption: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  createText: { flex: 1, fontWeight: "800" },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.96)",
    paddingTop: 30,
  },
  progressRow: {
    height: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    overflow: "hidden",
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressComplete: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: colors.white,
  },
  viewerTop: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  viewerAuthor: { color: colors.white, fontWeight: "900" },
  closeBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerBody: { flex: 1 },
  viewerContent: { paddingBottom: 32 },
  viewerMedia: { position: "relative" },
  viewerImage: { width: "100%", height: 470, backgroundColor: "#000" },
  previousZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "28%",
  },
  nextZone: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "28%",
  },
  viewerTextOnly: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  viewerText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 22,
    textAlign: "center",
  },
  viewerCaption: {
    color: colors.white,
    padding: 14,
    fontSize: 15,
    lineHeight: 21,
  },
  viewerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexWrap: "wrap",
  },
  viewerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 38,
  },
  viewerActionText: { color: colors.white },
  shareRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  shareOption: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  commentsPanel: {
    margin: 14,
    borderRadius: 12,
    backgroundColor: colors.bg,
    padding: 12,
    gap: 8,
  },
  commentsTitle: { fontWeight: "900" },
  commentItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingBottom: 8,
    gap: 2,
  },
  commentText: { fontSize: 13.5 },
  audienceBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.68)",
  },
  audienceSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "70%",
    minHeight: 320,
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 24,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.bg,
  },
  audienceTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  audienceTab: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderSoft,
  },
  audienceTabActive: { borderBottomColor: colors.primary },
  audienceTabText: { fontSize: 12, fontWeight: "800" },
  audienceList: { flexGrow: 0 },
  audiencePerson: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  audienceName: { fontWeight: "900" },
  audienceEmpty: { paddingVertical: 42, textAlign: "center" },
  repostSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.bg,
  },
  repostTitle: { fontSize: 17, fontWeight: "900" },
  repostPreview: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    backgroundColor: colors.panel2,
  },
});
