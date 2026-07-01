import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { InfoGrid } from "@/components/InfoGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { CompactRow } from "@/components/CompactRow";
import { LogoAvatar } from "@/components/LogoAvatar";
import { HeroBanner } from "@/components/HeroBanner";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Body, Subtitle, Tiny } from "@/components/AppText";
import { CompetitiveEvolution } from "@/components/CompetitiveEvolution";
import {
  CompetitiveTierBadge,
  formatCompactScore,
} from "@/components/CompetitiveTierBadge";
import { TeamRosterManager } from "@/components/TeamRosterManager";
import { mock } from "@/data/mock";
import { normalizeTeam } from "@/lib/adapters";
import { pickImage } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import { syncChampionshipLineRoster } from "@/lib/championshipRoster";
import { useRemoteItem } from "@/lib/useRemoteItem";
import {
  loadTeamCompetitiveStats,
  type CompetitiveStats,
} from "@/lib/competitiveStats";
import { colors } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";

type TabKey =
  | "calendario"
  | "elenco"
  | "lideres"
  | "campeonatos"
  | "estatisticas";

type Player = {
  id: string;
  nick?: string | null;
  foto_capa?: string | null;
  funcao?: string | null;
  servidor?: string | null;
  plataforma?: string | null;
  tipo?: string | null;
  entrou_em?: string | null;
};

type Member = {
  id: string;
  user_id?: string | null;
  tipo?: string | null;
  entrou_em?: string | null;
  perfil_jogo_id?: string | null;
  perfis_jogo?: Player | Player[] | null;
};

type Invite = {
  id: string;
  tipo?: string | null;
  status?: string | null;
  mensagem?: string | null;
  created_at?: string | null;
  perfil?: Player | Player[] | null;
};

type Championship = {
  id: string;
  nome?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  status?: string | null;
  formato?: string | null;
  tipo?: string | null;
  tipo_campeonato?: string | null;
  categoria?: string | null;
  plataforma?: string | null;
  regiao?: string | null;
  servidor?: string | null;
  vagas?: number | string | null;
  quantidade_equipes?: number | string | null;
  valor_vaga?: number | string | null;
  valor_premiacao?: number | string | null;
  data_inicio?: string | null;
  horario_inicio?: string | null;
  jogadores_por_equipe?: number | string | null;
  inscrita?: boolean;
  inscricao_status?: string | null;
};

type TeamEntry = {
  id: string;
  campeonato_id?: string | null;
  status?: string | null;
  line_id?: string | null;
  campeonatos?: Championship | Championship[] | null;
};

type TeamLine = {
  id: string;
  nome?: string | null;
  tipo?: string | null;
  logo_url?: string | null;
  equipe_id?: string | null;
  lines_jogadores?: LinePlayer[];
};
type LinePlayer = {
  id: string;
  perfil_jogo_id?: string | null;
  tipo_slot?: string | null;
  ordem?: number | null;
  perfis_jogo?: Player | Player[] | null;
};

type CalendarEvent = {
  id: string;
  campeonato_id?: string | null;
  title: string;
  subtitle: string;
  date?: string | null;
  time?: string | null;
  logo_url?: string | null;
};

const tabs: {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "calendario", label: "Calendario", icon: "calendar-outline" },
  { key: "elenco", label: "Elenco", icon: "people-outline" },
  { key: "lideres", label: "Lideres", icon: "shield-checkmark-outline" },
  { key: "campeonatos", label: "Campeonatos", icon: "trophy-outline" },
  { key: "estatisticas", label: "Estatisticas", icon: "stats-chart-outline" },
];

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

function money(value: unknown) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "Gratis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(number);
}

function numberLabel(value: unknown, fallback = "0") {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? String(number) : fallback;
}

function dateLabel(date?: string | null, time?: string | null) {
  if (!date) return "A definir";
  const parsed = new Date(`${date}T${time || "00:00:00"}`);
  if (Number.isNaN(parsed.getTime())) return "A definir";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function roundsText(value: any) {
  if (!value) return "";
  if (Array.isArray(value)) return `${value.length} quedas`;
  if (typeof value === "object") return `${Object.keys(value).length} quedas`;
  return `${value} quedas`;
}

export default function EquipeDetalhe() {
  const theme = useTheme();
  const colors = theme.colors;
  const { id } = useLocalSearchParams<{ id: string }>();
  const fallback: any =
    mock.equipes.find((item) => item.id === id) || mock.equipes[0];
  const { data: item } = useRemoteItem({
    table: "equipes",
    id,
    select:
      "id, nome, tag, logo_url, cover_url, descricao, cidade, estado, pais, criado_por, created_at",
    fallback,
    mapRow: normalizeTeam,
  });

  const [tab, setTab] = useState<TabKey>("calendario");
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [requests, setRequests] = useState<Invite[]>([]);
  const [teamChampionships, setTeamChampionships] = useState<Championship[]>(
    [],
  );
  const [teamLines, setTeamLines] = useState<TeamLine[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [competitiveStats, setCompetitiveStats] =
    useState<CompetitiveStats | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadTeamData = useCallback(async () => {
    if (!supabase || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [
      { data: memberRows },
      { data: profileRows },
      { data: entries },
      { data: inviteRows },
      { data: ownLines },
      { data: linkedLines },
      competitive,
    ] = await Promise.all([
      supabase
        .from("membros_equipe")
        .select(
          "id,user_id,tipo,entrou_em,perfil_jogo_id,perfis_jogo:perfil_jogo_id(id,nick,foto_capa,funcao,servidor,plataforma)",
        )
        .eq("equipe_id", id)
        .eq("ativo", true)
        .order("entrou_em", { ascending: true }),
      supabase
        .from("perfis_jogo")
        .select("id,nick,foto_capa,funcao,servidor,plataforma,created_at")
        .eq("equipe_id", id)
        .eq("ativo", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("campeonato_equipes")
        .select(
          "id,campeonato_id,status,line_id,campeonatos(id,nome,logo_url,banner_url,status,formato,tipo,tipo_campeonato,categoria,plataforma,regiao,vagas,quantidade_equipes,valor_vaga,valor_premiacao,data_inicio,horario_inicio,jogadores_por_equipe)",
        )
        .eq("equipe_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("convites_equipe")
        .select(
          "id,tipo,status,mensagem,created_at,perfil:perfil_jogo_id(id,nick,foto_capa,funcao,servidor,plataforma)",
        )
        .eq("equipe_id", id)
        .eq("status", "pendente")
        .order("created_at", { ascending: false }),
      supabase
        .from("lines")
        .select("id,nome,tipo,logo_url,equipe_id")
        .eq("equipe_id", id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("equipes_lines_vinculos")
        .select("line_id,lines:line_id(id,nome,tipo,logo_url,equipe_id)")
        .eq("equipe_id", id),
      loadTeamCompetitiveStats(supabase, String(id)),
    ]);

    const normalizedMembers = (memberRows || []) as Member[];
    const memberPlayers: Player[] = normalizedMembers.reduce<Player[]>(
      (acc, member) => {
        const perfil = first(member.perfis_jogo);
        if (perfil)
          acc.push({
            ...perfil,
            tipo: member.tipo,
            entrou_em: member.entrou_em,
          });
        return acc;
      },
      [],
    );

    const profileMap = new Map<string, Player>();
    [...memberPlayers, ...((profileRows || []) as Player[])].forEach((player) =>
      profileMap.set(player.id, player),
    );

    const entriesList = (entries || []) as TeamEntry[];
    const subscribed: Championship[] = entriesList.reduce<Championship[]>(
      (acc, entry) => {
        const champ = first(entry.campeonatos);
        if (champ)
          acc.push({
            ...champ,
            inscrita: true,
            inscricao_status: entry.status,
            campeonato_equipe_id: entry.id,
            line_id: entry.line_id,
          } as any);
        return acc;
      },
      [],
    );

    const inviteList = (inviteRows || []) as Invite[];

    setMembers(normalizedMembers);
    setInvites(
      inviteList.filter(
        (invite) => String(invite.tipo || "").toLowerCase() !== "pedido",
      ),
    );
    setRequests(
      inviteList.filter(
        (invite) => String(invite.tipo || "").toLowerCase() === "pedido",
      ),
    );
    setPlayers(Array.from(profileMap.values()));
    const linked = ((linkedLines || []) as any[])
      .map((row) => first(row.lines))
      .filter(Boolean) as TeamLine[];
    const lineMap = new Map<string, TeamLine>();
    [...((ownLines || []) as TeamLine[]), ...linked].forEach((line) => {
      if (line?.id) lineMap.set(String(line.id), line);
    });

    const mergedLines = Array.from(lineMap.values());
    const lineIds = mergedLines.map((line) => String(line.id)).filter(Boolean);
    let linePlayersRows: any[] = [];
    if (lineIds.length) {
      const { data: rows } = await supabase
        .from("lines_jogadores")
        .select(
          "id,line_id,perfil_jogo_id,tipo_slot,ordem,perfis_jogo:perfil_jogo_id(id,nick,foto_capa,funcao,servidor,plataforma)",
        )
        .in("line_id", lineIds)
        .is("removido_em", null);
      linePlayersRows = rows || [];
    }
    setTeamLines(
      mergedLines.map((line) => ({
        ...line,
        lines_jogadores: linePlayersRows.filter(
          (row: any) => String(row.line_id) === String(line.id),
        ),
      })),
    );
    setTeamChampionships(subscribed);
    setCompetitiveStats(competitive);

    const campeonatoEquipeIds = entriesList
      .map((entry) => entry.id)
      .filter(Boolean);
    if (!campeonatoEquipeIds.length) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data: jogoEquipes } = await supabase
      .from("jogo_equipes")
      .select("jogo_id,campeonato_equipe_id")
      .in("campeonato_equipe_id", campeonatoEquipeIds);

    const jogoIds = Array.from(
      new Set(
        (jogoEquipes || []).map((row: any) => row.jogo_id).filter(Boolean),
      ),
    );
    if (!jogoIds.length) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data: jogos } = await supabase
      .from("jogos")
      .select(
        "id,campeonato_id,fase_id,nome,nome_bloco,data_jogo,hora_jogo,quantidade_partidas,quedas,agenda_publicada",
      )
      .in("id", jogoIds);

    const champMap = new Map(subscribed.map((champ) => [champ.id, champ]));
    const normalizedEvents: CalendarEvent[] = ((jogos || []) as any[])
      .filter((jogo) => jogo.agenda_publicada !== false)
      .map((jogo) => {
        const champ = champMap.get(jogo.campeonato_id);
        return {
          id: String(jogo.id),
          campeonato_id: jogo.campeonato_id,
          title: champ?.nome || "Campeonato",
          subtitle: [
            jogo.nome_bloco || jogo.nome || "Jogo",
            jogo.quantidade_partidas
              ? `${jogo.quantidade_partidas} partidas`
              : "",
            roundsText(jogo.quedas),
          ]
            .filter(Boolean)
            .join(" - "),
          date: jogo.data_jogo,
          time: jogo.hora_jogo,
          logo_url: champ?.logo_url || null,
        };
      })
      .sort(
        (a, b) =>
          new Date(
            `${a.date || "9999-12-31"}T${a.time || "00:00:00"}`,
          ).getTime() -
          new Date(
            `${b.date || "9999-12-31"}T${b.time || "00:00:00"}`,
          ).getTime(),
      );

    setEvents(normalizedEvents);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  useEffect(() => {
    supabase?.auth
      .getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  const leaders = useMemo(() => {
    const leaderTypes = new Set([
      "dono",
      "admin",
      "manager",
      "lider",
      "capitao",
    ]);
    return members.filter((member) =>
      leaderTypes.has(String(member.tipo || "").toLowerCase()),
    );
  }, [members]);

  const stats = useMemo(() => {
    const activeEvents = events.filter(
      (event) =>
        new Date(
          `${event.date || "1900-01-01"}T${event.time || "00:00:00"}`,
        ).getTime() >= Date.now(),
    ).length;
    return {
      players: players.length,
      leaders: leaders.length,
      championships: teamChampionships.length,
      events: activeEvents,
    };
  }, [events, leaders.length, players.length, teamChampionships.length]);

  const canManage = useMemo(() => {
    if (!currentUserId) return false;
    if (String(item?.criado_por || "") === currentUserId) return true;
    return members.some(
      (member: any) =>
        ["dono", "admin", "manager"].includes(
          String(member.tipo || "").toLowerCase(),
        ) && String(member.user_id || "") === currentUserId,
    );
  }, [currentUserId, item?.criado_por, members]);

  return (
    <Screen>
      <BackHeader eyebrow="EQUIPE" title={item.nome} />
      <HeroBanner
        title={item.nome}
        subtitle={item.meta || item.descricao}
        badge={item.status || item.tag}
        logo={item.sigla || item.tag || item.nome}
        logoUri={pickImage(
          item,
          ["logo_url", "avatar_url", "imagem_url"],
          "team-logos",
        )}
        imageUri={pickImage(
          item,
          ["banner_url", "capa_url", "cover_url"],
          "team-covers",
        )}
        type="team"
      />
      <InfoGrid
        items={[
          { label: "jogadores", value: stats.players },
          { label: "lideres", value: stats.leaders },
          { label: "campeonatos", value: stats.championships },
          { label: "agenda", value: stats.events },
        ]}
      />

      <View style={styles.tabs}>
        {tabs.map((current) => (
          <Pressable
            key={current.key}
            onPress={() => setTab(current.key)}
            style={[
              styles.tab,
              { backgroundColor: colors.card, borderColor: colors.border },
              tab === current.key && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name={current.icon}
              size={16}
              color={tab === current.key ? colors.bg : colors.primary}
            />
            <Tiny
              style={[
                styles.tabLabel,
                { color: tab === current.key ? colors.bg : colors.primary },
              ]}
            >
              {current.label}
            </Tiny>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && tab === "calendario" ? (
        <CalendarTab events={events} />
      ) : null}
      {!loading && tab === "elenco" ? (
        <TeamRosterManager
          teamId={String(id)}
          canManage={canManage}
          onUpdated={loadTeamData}
        />
      ) : null}
      {!loading && tab === "lideres" ? <LeadersTab leaders={leaders} /> : null}
      {!loading && tab === "campeonatos" ? (
        <ChampionshipsTab
          data={teamChampionships}
          teamId={String(id)}
          canManage={canManage}
          players={players}
          lines={teamLines}
          onUpdated={loadTeamData}
        />
      ) : null}
      {!loading && tab === "estatisticas" ? (
        <StatsTab
          stats={stats}
          competitive={competitiveStats}
          championships={teamChampionships}
          players={players}
        />
      ) : null}
    </Screen>
  );
}

function CalendarTab({ events }: { events: CalendarEvent[] }) {
  return (
    <View style={styles.block}>
      <SectionHeader
        title="Calendario da equipe"
        action={`${events.length} eventos`}
      />
      {!events.length ? (
        <Card>
          <Subtitle>Nenhum jogo encontrado para esta equipe.</Subtitle>
        </Card>
      ) : null}
      {events.map((event, index) => (
        <CompactRow
          key={`${event.id}-${index}`}
          type="champ"
          logo={event.title}
          logoUri={event.logo_url || undefined}
          title={event.title}
          meta={event.subtitle}
          tag={dateLabel(event.date, event.time)}
          right="ver"
        />
      ))}
    </View>
  );
}

function RosterTab({
  players,
  invites,
  requests,
}: {
  players: Player[];
  invites: Invite[];
  requests: Invite[];
}) {
  const [subtab, setSubtab] = useState<"jogadores" | "convites" | "pedidos">(
    "jogadores",
  );
  const visibleInvites = subtab === "convites" ? invites : requests;

  return (
    <View style={styles.block}>
      <SectionHeader title="Elenco" action={`${players.length} atletas`} />
      <View style={styles.subtabs}>
        <SubtabButton
          label="Jogadores"
          count={players.length}
          active={subtab === "jogadores"}
          onPress={() => setSubtab("jogadores")}
        />
        <SubtabButton
          label="Convites"
          count={invites.length}
          active={subtab === "convites"}
          onPress={() => setSubtab("convites")}
        />
        <SubtabButton
          label="Pedidos"
          count={requests.length}
          active={subtab === "pedidos"}
          onPress={() => setSubtab("pedidos")}
        />
      </View>

      {subtab === "jogadores" ? (
        <>
          {!players.length ? (
            <Card>
              <Subtitle>Nenhum jogador vinculado a esta equipe.</Subtitle>
            </Card>
          ) : null}
          {players.map((player, index) => (
            <CompactRow
              key={`${player.id}-${index}`}
              type="player"
              logo={player.nick || "J"}
              logoUri={pickImage(
                player,
                ["foto_capa", "foto_url", "avatar_url", "imagem_url"],
                "avatars",
              )}
              title={player.nick || "Jogador"}
              meta={[player.funcao, player.servidor, player.plataforma]
                .filter(Boolean)
                .join(" - ")}
              tag={player.tipo || player.funcao || "membro"}
              right="ver"
              href={`/jogador/${player.id}`}
            />
          ))}
        </>
      ) : (
        <>
          {!visibleInvites.length ? (
            <Card>
              <Subtitle>
                {subtab === "convites"
                  ? "Nenhum convite enviado pendente."
                  : "Nenhum pedido recebido pendente."}
              </Subtitle>
            </Card>
          ) : null}
          {visibleInvites.map((invite, index) => {
            const perfil = first(invite.perfil);
            return (
              <CompactRow
                key={`${invite.id}-${index}`}
                type="player"
                logo={perfil?.nick || "J"}
                logoUri={pickImage(
                  perfil,
                  ["foto_capa", "foto_url", "avatar_url", "imagem_url"],
                  "avatars",
                )}
                title={perfil?.nick || "Jogador"}
                meta={[invite.mensagem, perfil?.funcao, perfil?.servidor]
                  .filter(Boolean)
                  .join(" - ")}
                tag={invite.status || "pendente"}
                right={subtab === "convites" ? "enviado" : "pedido"}
                href={perfil?.id ? `/jogador/${perfil.id}` : undefined}
              />
            );
          })}
        </>
      )}
    </View>
  );
}

function SubtabButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.subtab, active && styles.subtabOn]}
    >
      <Tiny style={active && styles.subtabTextOn}>{label}</Tiny>
      <Tiny style={[styles.subtabCount, active && styles.subtabCountOn]}>
        {count}
      </Tiny>
    </Pressable>
  );
}

function LeadersTab({ leaders }: { leaders: Member[] }) {
  return (
    <View style={styles.block}>
      <SectionHeader title="Lideres" action={`${leaders.length} ativos`} />
      {!leaders.length ? (
        <Card>
          <Subtitle>Nenhum lider cadastrado.</Subtitle>
        </Card>
      ) : null}
      {leaders.map((leader, index) => {
        const perfil = first(leader.perfis_jogo);
        return (
          <CompactRow
            key={`${leader.id}-${perfil?.id || "sem-perfil"}-${index}`}
            type="player"
            logo={perfil?.nick || leader.tipo || "L"}
            logoUri={pickImage(
              perfil,
              ["foto_capa", "foto_url", "avatar_url", "imagem_url"],
              "avatars",
            )}
            title={perfil?.nick || leader.tipo || "Lider"}
            meta={[leader.tipo, perfil?.funcao, perfil?.servidor]
              .filter(Boolean)
              .join(" - ")}
            tag={leader.tipo || "lider"}
            right="comando"
            href={perfil?.id ? `/jogador/${perfil.id}` : undefined}
          />
        );
      })}
    </View>
  );
}

function cleanLineName(line: TeamLine | null | undefined) {
  const raw = String(line?.nome || "").trim();
  if (!raw) return "Line";
  if (/^VAGA[_-]/i.test(raw) || raw.length > 42)
    return line?.tipo ? `Line ${line.tipo}` : "Line adicionada";
  return raw;
}

function base64ToUint8Array(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function linePlayerList(line?: TeamLine | null) {
  return (line?.lines_jogadores || [])
    .slice()
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    .map((row) => ({ row, player: first(row.perfis_jogo) }));
}

function ChampionshipsTab({
  data,
  teamId,
  canManage,
  players,
  lines,
  onUpdated,
}: {
  data: Championship[];
  teamId: string;
  canManage: boolean;
  players: Player[];
  lines: TeamLine[];
  onUpdated?: () => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [newLineName, setNewLineName] = useState("");
  const [newLineLogoUrl, setNewLineLogoUrl] = useState("");
  const [showLineCreate, setShowLineCreate] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<
    Record<string, "titular" | "reserva">
  >({});
  const [saving, setSaving] = useState(false);
  const [champPlayers, setChampPlayers] = useState<
    Array<{
      id: string;
      nick: string;
      foto?: string | null;
      tipo: string;
      origem: "perfil" | "avulso";
    }>
  >([]);

  const selectedLine = useMemo(
    () =>
      lines.find((line) => String(line.id) === String(selectedLineId)) || null,
    [lines, selectedLineId],
  );
  const selectedLinePlayers = useMemo(
    () => linePlayerList(selectedLine),
    [selectedLine],
  );
  const playerLimit = Math.max(
    1,
    Number(
      selected?.jogadores_por_equipe || selected?.jogadores_por_time || 4,
    ) || 4,
  );
  const chosenCount = Object.keys(selectedPlayers).length;
  const selectedLineCount = selectedLinePlayers.length;

  const loadChampionshipPlayers = useCallback(
    async (champ: any) => {
      if (!supabase || !champ?.id) {
        setChampPlayers([]);
        return;
      }
      const { data: rows } = await supabase
        .from("jogadores_campeonato")
        .select(
          "id,perfil_jogo_id,jogador_avulso_id,equipe_id,equipe_avulsa_id,status",
        )
        .eq("campeonato_equipe_id", champ.campeonato_equipe_id)
        .eq("status", "ativo");
      const perfilIds = Array.from(
        new Set(
          (rows || [])
            .map((row: any) => String(row.perfil_jogo_id || ""))
            .filter(Boolean),
        ),
      );
      const avulsoIds = Array.from(
        new Set(
          (rows || [])
            .map((row: any) => String(row.jogador_avulso_id || ""))
            .filter(Boolean),
        ),
      );
      const [{ data: perfis }, { data: avulsos }] = await Promise.all([
        perfilIds.length
          ? supabase
              .from("perfis_jogo")
              .select("id,nick,foto_capa,funcao")
              .in("id", perfilIds)
          : Promise.resolve({ data: [] as any[] }),
        avulsoIds.length
          ? supabase
              .from("jogadores_avulsos_campeonato")
              .select("id,nick,foto_url,funcao")
              .in("id", avulsoIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const perfilMap = new Map(
        (perfis || []).map((row: any) => [String(row.id), row]),
      );
      const avulsoMap = new Map(
        (avulsos || []).map((row: any) => [String(row.id), row]),
      );
      setChampPlayers(
        (rows || []).map((row: any) => {
          const perfil = perfilMap.get(String(row.perfil_jogo_id || ""));
          const avulso = avulsoMap.get(String(row.jogador_avulso_id || ""));
          return {
            id: String(row.id),
            nick: String(perfil?.nick || avulso?.nick || "Jogador"),
            foto: perfil?.foto_capa || avulso?.foto_url || null,
            tipo: String(perfil?.funcao || avulso?.funcao || "escalado"),
            origem: perfil ? "perfil" : "avulso",
          };
        }),
      );
    },
    [teamId],
  );

  const openChamp = (champ: any) => {
    setSelected(champ);
    setSelectedLineId(String(champ.line_id || ""));
    setNewLineName("");
    setNewLineLogoUrl("");
    setShowLineCreate(false);
    setSelectedPlayers({});
    setChampPlayers([]);
    setSheetOpen(true);
    if (canManage && champ.line_id && champ.campeonato_equipe_id) {
      syncChampionshipLineRoster(supabase!, {
        championshipId: String(champ.id),
        championshipTeamId: String(champ.campeonato_equipe_id),
        teamId,
        lineId: String(champ.line_id),
      })
        .catch((error) =>
          console.warn(
            "Nao foi possivel reparar a escalacao existente.",
            error,
          ),
        )
        .finally(() => loadChampionshipPlayers(champ));
      return;
    }
    loadChampionshipPlayers(champ);
  };

  const uploadNewLineLogo = async () => {
    if (!supabase) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        return Alert.alert(
          "Logo",
          "Permita acesso às imagens para enviar a logo.",
        );
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error("Faça login para enviar logo.");
      const image = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 500, height: 500 } }],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.PNG,
          base64: true,
        },
      );
      if (!image.base64) throw new Error("Não foi possível preparar a imagem.");
      const path = `${userId}/lines/${teamId}-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const { error } = await supabase.storage
        .from("team-logos")
        .upload(path, base64ToUint8Array(image.base64).buffer, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/png",
        });
      if (error) throw error;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
      setNewLineLogoUrl(data.publicUrl);
    } catch (error: any) {
      Alert.alert("Logo", error?.message || "Não foi possível enviar a logo.");
    }
  };

  const assignExistingLine = async () => {
    if (!supabase || !selected?.campeonato_equipe_id || !selectedLineId) return;
    if (selectedLineCount > playerLimit) {
      return Alert.alert(
        "Limite do campeonato",
        `Este campeonato permite ${playerLimit} jogadores. Ajuste a line antes de escalar.`,
      );
    }
    try {
      setSaving(true);
      const { error } = await supabase.rpc("fn_aplicar_line_na_vaga", {
        p_campeonato_equipe_id: selected.campeonato_equipe_id,
        p_line_id: selectedLineId,
      });
      if (error) throw error;
      await syncChampionshipLineRoster(supabase, {
        championshipId: String(selected.id),
        championshipTeamId: String(selected.campeonato_equipe_id),
        teamId,
        lineId: selectedLineId,
      });
      await loadChampionshipPlayers(selected);
      Alert.alert(
        "Escalação",
        "Line aplicada ao campeonato e jogadores escalados.",
      );
      setSheetOpen(false);
      await onUpdated?.();
    } catch (error: any) {
      Alert.alert(
        "Escalação",
        error?.message || "Não foi possível vincular a line.",
      );
    } finally {
      setSaving(false);
    }
  };

  const createLineForChampionship = async () => {
    if (!supabase || !selected?.campeonato_equipe_id) return;
    const name = newLineName.trim();
    const chosen = Object.entries(selectedPlayers);
    if (!name) return Alert.alert("Line", "Informe o nome da line.");
    if (!chosen.length)
      return Alert.alert("Line", "Selecione pelo menos um jogador.");
    if (chosen.length > playerLimit)
      return Alert.alert(
        "Limite do campeonato",
        `Este campeonato permite ${playerLimit} jogadores. Remova ${chosen.length - playerLimit} jogador(es) da line.`,
      );
    try {
      setSaving(true);
      const counters = { titular: 0, reserva: 0 };
      const payload = chosen.map(([profileId, slot]) => ({
        perfil_jogo_id: profileId,
        jogador_avulso_id: null,
        tipo_slot: slot,
        ordem: counters[slot]++,
        funcao_line:
          players.find((player) => player.id === profileId)?.funcao || null,
      }));
      const { data: createdLine, error: rpcError } = await supabase.rpc(
        "salvar_line_completa",
        {
          p_line_id: null,
          p_nome: name,
          p_tipo: null,
          p_visibilidade: "equipe",
          p_plataforma: null,
          p_equipe_id: teamId,
          p_vincular_equipe: true,
          p_jogadores: payload,
        },
      );
      if (rpcError) throw rpcError;
      const createdLineId = String((createdLine as any)?.line_id || "");
      if (!createdLineId)
        throw new Error("Line criada, mas o banco não retornou o ID da line.");
      if (newLineLogoUrl) {
        const { error: logoError } = await supabase
          .from("lines")
          .update({ logo_url: newLineLogoUrl })
          .eq("id", createdLineId);
        if (logoError) throw logoError;
      }
      const { error: applyError } = await supabase.rpc(
        "fn_aplicar_line_na_vaga",
        {
          p_campeonato_equipe_id: selected.campeonato_equipe_id,
          p_line_id: createdLineId,
        },
      );
      if (applyError) throw applyError;
      await syncChampionshipLineRoster(supabase, {
        championshipId: String(selected.id),
        championshipTeamId: String(selected.campeonato_equipe_id),
        teamId,
        lineId: createdLineId,
      });
      await loadChampionshipPlayers(selected);
      Alert.alert(
        "Escalação",
        "Line criada, aplicada e jogadores escalados no campeonato.",
      );
      setSheetOpen(false);
      await onUpdated?.();
    } catch (error: any) {
      Alert.alert(
        "Escalação",
        error?.message || "Não foi possível criar a line.",
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((current) => {
      const currentSlot = current[playerId];
      const next = { ...current };
      if (!currentSlot) {
        if (Object.keys(current).length >= playerLimit) {
          Alert.alert(
            "Limite do campeonato",
            `Este campeonato permite ${playerLimit} jogadores.`,
          );
          return current;
        }
        next[playerId] = "titular";
      } else if (currentSlot === "titular") next[playerId] = "reserva";
      else delete next[playerId];
      return next;
    });
  };

  return (
    <View style={styles.block}>
      <SectionHeader
        title="Campeonatos da equipe"
        action={`${data.length} inscritos`}
      />
      {!data.length ? (
        <Card>
          <Subtitle>
            Esta equipe ainda nao esta vinculada a campeonatos.
          </Subtitle>
        </Card>
      ) : null}
      {data.map((champ: any, index) => {
        const meta = [
          champ.formato ||
            champ.tipo_campeonato ||
            champ.tipo ||
            champ.categoria,
          `${numberLabel(champ.vagas || champ.quantidade_equipes)} vagas`,
          champ.regiao || champ.servidor || champ.plataforma,
        ]
          .filter(Boolean)
          .join(" - ");
        return (
          <Card key={`${champ.id}-${index}`} style={styles.teamChampCard}>
            <CompactRow
              type="champ"
              logo={champ.nome || "C"}
              logoUri={champ.logo_url || undefined}
              title={champ.nome || "Campeonato"}
              meta={meta}
              tag={champ.inscricao_status || champ.status || "ativo"}
              right={money(champ.valor_vaga)}
              onPress={() => openChamp(champ)}
            />
            <View style={styles.marketFooter}>
              <Tiny>{dateLabel(champ.data_inicio, champ.horario_inicio)}</Tiny>
              <Tiny style={styles.price}>
                premio {money(champ.valor_premiacao)}
              </Tiny>
            </View>
          </Card>
        );
      })}

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <SectionHeader
                  title={selected?.nome || "Campeonato"}
                  action="inscrição"
                />
                <CompactRow
                  type="champ"
                  logo={selected?.nome || "C"}
                  logoUri={selected?.logo_url || undefined}
                  title={selected?.nome || "Campeonato"}
                  meta={[
                    selected?.tipo_campeonato || selected?.tipo,
                    `${numberLabel(selected?.vagas || selected?.quantidade_equipes)} vagas`,
                    selected?.regiao || selected?.plataforma,
                  ]
                    .filter(Boolean)
                    .join(" - ")}
                  tag={
                    selected?.status || selected?.inscricao_status || "ativo"
                  }
                  right={money(selected?.valor_vaga)}
                  href={selected?.id ? `/campeonato/${selected.id}` : undefined}
                />
                <Card>
                  <Tiny>Próximo jogo da equipe</Tiny>
                  <Body style={styles.statTitle}>
                    {dateLabel(selected?.data_inicio, selected?.horario_inicio)}
                  </Body>
                  <Subtitle>
                    A agenda completa aparece na aba Calendário da equipe.
                  </Subtitle>
                  <Tiny>Limite: {playerLimit} jogadores por line</Tiny>
                </Card>
                {canManage ? (
                  <>
                    <SectionHeader title="Escalar line" action="dono/admin" />
                    <View style={styles.lineSelectWrap}>
                      {lines.map((line) => (
                        <Pressable
                          key={line.id}
                          onPress={() => {
                            setSelectedLineId(line.id);
                            setShowLineCreate(false);
                          }}
                          style={[
                            styles.lineOption,
                            selectedLineId === line.id && styles.lineOptionOn,
                          ]}
                        >
                          <Tiny
                            style={
                              selectedLineId === line.id &&
                              styles.lineOptionTextOn
                            }
                          >
                            {cleanLineName(line)}
                          </Tiny>
                        </Pressable>
                      ))}
                      <Pressable
                        onPress={() => {
                          setShowLineCreate(true);
                          setSelectedLineId("");
                        }}
                        style={[styles.lineOption, styles.linePlusOption]}
                      >
                        <Ionicons name="add" size={18} color={colors.primary} />
                        <Tiny style={styles.linePlusText}>Nova line</Tiny>
                      </Pressable>
                    </View>
                    {selectedLine ? (
                      <Card
                        style={
                          selectedLineCount > playerLimit
                            ? styles.warnCard
                            : undefined
                        }
                      >
                        <View style={styles.lineHeaderMini}>
                          <LogoAvatar
                            name={cleanLineName(selectedLine)}
                            uri={selectedLine.logo_url || undefined}
                            size={38}
                            rounded={8}
                          />
                          <View style={styles.grow}>
                            <Body style={styles.statTitle}>
                              {cleanLineName(selectedLine)}
                            </Body>
                            <Tiny>
                              {selectedLineCount}/{playerLimit} jogadores{" "}
                              {selectedLineCount > playerLimit
                                ? "- excedente"
                                : ""}
                            </Tiny>
                          </View>
                        </View>
                        <View style={styles.selectedPlayersWrap}>
                          {selectedLinePlayers.map(({ row, player }) => (
                            <View
                              key={row.id}
                              style={styles.selectedPlayerChip}
                            >
                              <LogoAvatar
                                name={player?.nick || "J"}
                                uri={player?.foto_capa || undefined}
                                size={26}
                                rounded={6}
                              />
                              <View style={styles.grow}>
                                <Body
                                  numberOfLines={1}
                                  style={styles.smallName}
                                >
                                  {player?.nick || "Jogador"}
                                </Body>
                                <Tiny>{row.tipo_slot || "titular"}</Tiny>
                              </View>
                            </View>
                          ))}
                        </View>
                      </Card>
                    ) : (
                      <Subtitle>
                        Selecione uma line para ver os jogadores.
                      </Subtitle>
                    )}
                    <Button
                      label={saving ? "Salvando..." : "Usar line selecionada"}
                      onPress={assignExistingLine}
                    />
                    {champPlayers.length ? (
                      <Card
                        style={
                          champPlayers.length > playerLimit
                            ? styles.warnCard
                            : undefined
                        }
                      >
                        <Tiny>
                          Jogadores já vinculados na vaga do campeonato
                        </Tiny>
                        <View style={styles.selectedPlayersWrap}>
                          {champPlayers.map((player, index) => (
                            <View
                              key={player.id}
                              style={styles.selectedPlayerChip}
                            >
                              <LogoAvatar
                                name={player.nick}
                                uri={player.foto || undefined}
                                size={26}
                                rounded={6}
                              />
                              <View style={styles.grow}>
                                <Body
                                  numberOfLines={1}
                                  style={styles.smallName}
                                >
                                  {player.nick}
                                </Body>
                                <Tiny>
                                  {index >= playerLimit
                                    ? "excedente"
                                    : player.origem}
                                </Tiny>
                              </View>
                            </View>
                          ))}
                        </View>
                      </Card>
                    ) : null}
                    {showLineCreate ? (
                      <>
                        <SectionHeader
                          title="Criar line para este campeonato"
                          action={`${chosenCount}/${playerLimit}`}
                        />
                        <TextInput
                          value={newLineName}
                          onChangeText={setNewLineName}
                          placeholder="Nome da nova line"
                          style={styles.input}
                        />
                        <Pressable
                          onPress={uploadNewLineLogo}
                          style={styles.logoPicker}
                        >
                          {newLineLogoUrl ? (
                            <Image
                              source={{ uri: newLineLogoUrl }}
                              style={styles.logoPreview}
                            />
                          ) : (
                            <LogoAvatar
                              name={newLineName || "L"}
                              size={42}
                              rounded={9}
                            />
                          )}
                          <View style={styles.grow}>
                            <Body style={styles.statTitle}>
                              {newLineLogoUrl
                                ? "Trocar logo da line"
                                : "Adicionar logo da line"}
                            </Body>
                            <Tiny>Logo quadrada 500x500</Tiny>
                          </View>
                          <Ionicons
                            name="cloud-upload-outline"
                            size={20}
                            color={colors.primary}
                          />
                        </Pressable>
                        <ScrollView style={styles.playerPicker}>
                          {players.map((player) => {
                            const selectedSlot = selectedPlayers[player.id];
                            return (
                              <View key={player.id} style={styles.pickPlayer}>
                                <CompactRow
                                  type="player"
                                  logo={player.nick || "J"}
                                  logoUri={pickImage(
                                    player,
                                    ["foto_capa"],
                                    "avatars",
                                  )}
                                  title={player.nick || "Jogador"}
                                  meta={[player.funcao, player.servidor]
                                    .filter(Boolean)
                                    .join(" - ")}
                                  tag={selectedSlot || "fora"}
                                  onPress={() => togglePlayer(player.id)}
                                />
                              </View>
                            );
                          })}
                        </ScrollView>
                        <Button
                          label={
                            saving ? "Salvando..." : "Criar e escalar line"
                          }
                          onPress={createLineForChampionship}
                        />
                      </>
                    ) : null}
                  </>
                ) : null}
                <Button
                  label="Fechar"
                  variant="ghost"
                  onPress={() => setSheetOpen(false)}
                />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StatsTab({
  stats,
  competitive,
  championships,
  players,
}: {
  stats: any;
  competitive: CompetitiveStats | null;
  championships: Championship[];
  players: Player[];
}) {
  const servers =
    Array.from(
      new Set(players.map((player) => player.servidor).filter(Boolean)),
    ).join(", ") || "N/I";
  return (
    <View style={styles.block}>
      <SectionHeader title="Estatisticas totais" action="ranking oficial" />
      <CompetitiveTierBadge
        tier={competitive?.tier}
        position={competitive?.rankingPosicao}
      />
      <View style={styles.statsGrid}>
        <Metric label="Kills totais" value={competitive?.kills || 0} />
        <Metric label="Partidas" value={competitive?.partidas || 0} />
        <Metric label="Finais" value={competitive?.finais || 0} />
        <Metric label="Titulos" value={competitive?.titulos || 0} />
        <Metric label="Top 3" value={competitive?.podios || 0} />
        <Metric label="Booyahs" value={competitive?.booyahs || 0} />
        <Metric
          label="Media kills"
          value={(competitive?.mediaKills || 0).toFixed(1)}
        />
        <Metric
          label="Score LEALT"
          value={formatCompactScore(competitive?.score || 0)}
        />
      </View>
      <Card>
        <Tiny>Perfil competitivo</Tiny>
        <Body style={styles.statTitle}>
          Score {formatCompactScore(competitive?.score || 0)} no ranking LEALT
        </Body>
        <Subtitle>
          {competitive?.campeonatos || championships.length} campeonatos - taxa
          de titulo {(competitive?.taxaTitulos || 0).toFixed(0)}% - media de
          posicao {(competitive?.mediaPosicao || 0).toFixed(1)}
        </Subtitle>
        <Tiny>
          Servidores do elenco: {servers} - {stats.players} atletas
        </Tiny>
      </Card>
      <SectionHeader title="Evolucao competitiva" action="comparativos" />
      <CompetitiveEvolution
        comparisons={competitive?.comparativos || []}
        points={competitive?.evolucao || []}
      />
      <SectionHeader
        title="Historico competitivo"
        action={`${competitive?.historico.length || 0} finais`}
      />
      {!competitive?.historico.length ? (
        <Card>
          <Subtitle>Nenhum resultado oficial registrado.</Subtitle>
        </Card>
      ) : null}
      {competitive?.historico.map((row) => (
        <CompactRow
          key={row.campeonatoId}
          type="champ"
          logo={row.nome}
          title={row.nome}
          meta={`${row.partidas} partidas - ${row.kills} kills - ${row.booyahs} booyahs`}
          tag={row.posicao ? `${row.posicao}o lugar` : "N/I"}
          right={`${row.pontos} pts`}
          href={`/campeonato/${row.campeonatoId}`}
        />
      ))}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card style={styles.metric}>
      <Body style={styles.metricValue}>{value}</Body>
      <Tiny>{label}</Tiny>
    </Card>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 7, paddingVertical: 2 },
  tab: {
    width: "48%",
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { color: colors.primary },
  tabLabelOn: { color: colors.white },
  block: { gap: 8 },
  subtabs: { flexDirection: "row", gap: 7 },
  subtab: {
    flex: 1,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  subtabOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  subtabTextOn: { color: colors.white },
  subtabCount: { color: colors.primary },
  subtabCountOn: { color: colors.white },
  teamChampCard: { padding: 0, overflow: "hidden" },
  marketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  price: { color: colors.primary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "48%", gap: 2 },
  metricValue: { fontSize: 22, fontWeight: "800" },
  statTitle: { fontWeight: "800" },
  modalKeyboard: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 14,
    paddingTop: 42,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  modalCard: {
    maxHeight: "88%",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.bg,
  },
  modalScrollContent: { gap: 8, paddingBottom: 140 },
  lineSelectWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  lineOption: {
    minHeight: 34,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    paddingHorizontal: 11,
    backgroundColor: colors.card,
  },
  lineOptionOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  lineOptionTextOn: { color: colors.white },
  linePlusOption: { flexDirection: "row", alignItems: "center", gap: 4 },
  linePlusText: { color: colors.primary },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    color: colors.text,
    fontWeight: "800",
  },
  playerPicker: { maxHeight: 290 },
  pickPlayer: { marginBottom: 6 },

  lineHeaderMini: { flexDirection: "row", alignItems: "center", gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  selectedPlayersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 7,
  },
  selectedPlayerChip: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 6,
    padding: 5,
    backgroundColor: colors.card,
  },
  smallName: { fontSize: 11, fontWeight: "800" },
  warnCard: { borderColor: colors.warning, backgroundColor: "#fff8e6" },
  logoPicker: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    backgroundColor: colors.card,
  },
  logoPreview: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: colors.borderSoft,
  },
});
