import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { CompactRow } from "@/components/CompactRow";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { StatsStrip } from "@/components/StatsStrip";
import { Body, Subtitle, Tiny, Title } from "@/components/AppText";
import { LogoAvatar } from "@/components/LogoAvatar";
import { supabase } from "@/lib/supabase";
import { pickImage } from "@/lib/images";
import { colors } from "@/theme/colors";

type Produtora = {
  id: string;
  nome: string;
  slug?: string | null;
  logo_url?: string | null;
  capa_url?: string | null;
  descricao?: string | null;
  dono_id?: string | null;
  whatsapp_suporte?: string | null;
  instagram_url?: string | null;
  discord_url?: string | null;
};
type Campeonato = {
  id: string;
  nome: string;
  logo_url?: string | null;
  banner_url?: string | null;
  status?: string | null;
  tipo_competicao?: string | null;
  modelo_competicao?: string | null;
  formato?: string | null;
  valor_vaga?: number | null;
  valor_premiacao?: number | null;
  vagas?: number | null;
  plataforma?: string | null;
  regiao?: string | null;
};
type Membro = {
  id: string;
  user_id: string;
  tipo: string;
  created_at?: string | null;
  perfil?: any | null;
};
type Convite = {
  id: string;
  user_id: string;
  tipo: string;
  status: string;
  mensagem?: string | null;
  perfil?: any | null;
};

function initials(name?: string | null) {
  const parts = String(name || "PR")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

function tipoCamp(camp: Campeonato) {
  return String(
    camp.tipo_competicao ||
      camp.modelo_competicao ||
      camp.formato ||
      "campeonato",
  ).toLowerCase();
}

export default function ProdutoraDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [produtora, setProdutora] = useState<Produtora | null>(null);
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [permissaoOpen, setPermissaoOpen] = useState<Membro | null>(null);
  const [aba, setAba] = useState<"campeonatos" | "gestao">("campeonatos");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [donoPerfil, setDonoPerfil] = useState<any | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  const isOwner = !!produtora?.dono_id && produtora.dono_id === userId;
  const isAdmin =
    isOwner ||
    membros.some(
      (m) => m.user_id === userId && ["dono", "admin"].includes(String(m.tipo)),
    );

  async function load() {
    if (!supabase || !id) return;
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth.user?.id || "");

    const prodRes = await supabase
      .from("produtoras")
      .select(
        "id,nome,slug,logo_url,capa_url,descricao,dono_id,whatsapp_suporte,instagram_url,discord_url",
      )
      .eq("id", id)
      .maybeSingle();
    if (prodRes.error || !prodRes.data) {
      Alert.alert(
        "Produtora",
        prodRes.error?.message || "Produtora não encontrada.",
      );
      router.back();
      return;
    }
    setProdutora(prodRes.data as Produtora);

    const [campRes, membrosRes, convitesRes] = await Promise.all([
      supabase
        .from("campeonatos")
        .select(
          "id,nome,logo_url,banner_url,status,tipo_competicao,modelo_competicao,formato,valor_vaga,valor_premiacao,vagas,plataforma,regiao",
        )
        .eq("produtora_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("membros_produtora")
        .select("id,user_id,tipo,created_at")
        .eq("produtora_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("convites_produtora")
        .select("id,user_id,tipo,status,mensagem,created_at")
        .eq("produtora_id", id)
        .order("created_at", { ascending: false }),
    ]);

    const membrosBase = (membrosRes.data || []) as Membro[];
    const convitesBase = (convitesRes.data || []) as Convite[];
    const userIds = Array.from(
      new Set(
        [
          prodRes.data.dono_id,
          ...membrosBase.map((m) => m.user_id),
          ...convitesBase.map((c) => c.user_id),
        ].filter(Boolean),
      ),
    );
    let perfisMap = new Map<string, any>();
    if (userIds.length) {
      const perfisRes = await supabase
        .from("perfis")
        .select("id,nome,username,avatar_url")
        .in("id", userIds);
      perfisMap = new Map(
        (perfisRes.data || []).map((p: any) => [String(p.id), p]),
      );
    }

    setDonoPerfil(
      prodRes.data.dono_id
        ? perfisMap.get(String(prodRes.data.dono_id)) || null
        : null,
    );
    setCampeonatos((campRes.data || []) as Campeonato[]);
    setMembros(
      membrosBase.map((m) => ({
        ...m,
        perfil: perfisMap.get(String(m.user_id)) || null,
      })),
    );
    setConvites(
      convitesBase.map((c) => ({
        ...c,
        perfil: perfisMap.get(String(c.user_id)) || null,
      })),
    );
    setLoading(false);
  }

  async function buscarUsuarios(texto: string) {
    setBuscaUsuario(texto);
    if (!supabase || texto.trim().length < 2) {
      setUsuarios([]);
      return;
    }
    const like = `%${texto.trim()}%`;
    const { data, error } = await supabase
      .from("perfis")
      .select("id,nome,username,avatar_url")
      .or(`nome.ilike.${like},username.ilike.${like}`)
      .limit(12);
    if (!error) setUsuarios(data || []);
  }

  async function convidar(usuario: any) {
    if (!supabase || !id || !isAdmin) return;
    const { error } = await supabase
      .from("convites_produtora")
      .insert([
        {
          produtora_id: id,
          user_id: usuario.id,
          convidado_por: userId,
          tipo: "admin",
          mensagem: mensagem || null,
        },
      ]);
    if (error) Alert.alert("Convidar líder", error.message);
    else {
      Alert.alert("Convidar líder", "Convite enviado.");
      setInviteOpen(false);
      setBuscaUsuario("");
      setUsuarios([]);
      setMensagem("");
      load();
    }
  }

  async function salvarLimites(
    membro: Membro,
    campeonatoId: string,
    permissao: string,
    ativo: boolean,
  ) {
    if (!supabase || !id) return;
    const payload = {
      produtora_id: id,
      membro_produtora_id: membro.id,
      campeonato_id: campeonatoId,
      permissao,
      ativo,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("produtora_lider_campeonatos")
      .upsert([payload], {
        onConflict: "membro_produtora_id,campeonato_id,permissao",
      });
    if (error)
      Alert.alert(
        "Permissões",
        "Execute o SQL de permissões enviado para ativar limites por campeonato.",
      );
    else Alert.alert("Permissões", "Permissão salva.");
  }

  const pendentes = useMemo(
    () => convites.filter((c) => c.status === "pendente"),
    [convites],
  );
  const tiposDisponiveis = useMemo(() => {
    const base = [
      "todos",
      "confronto",
      "diario",
      "xtreino",
      "copa",
      "liga",
    ];
    const extras = campeonatos.map(tipoCamp).filter((tipo) => tipo && tipo !== "apostado");
    return Array.from(new Set([...base, ...extras]));
  }, [campeonatos]);
  const campeonatosValidos = useMemo(
    () => campeonatos.filter((camp) => tipoCamp(camp) !== "apostado"),
    [campeonatos],
  );
  const campeonatosFiltrados = useMemo(() => {
    if (tipoFiltro === "todos") return campeonatosValidos;
    return campeonatosValidos.filter((camp) => tipoCamp(camp) === tipoFiltro);
  }, [campeonatosValidos, tipoFiltro]);
  const tipoLabel =
    tipoFiltro === "todos" ? "TODOS OS TIPOS" : tipoFiltro.toUpperCase();

  if (!produtora) {
    return (
      <Screen>
        <BackHeader title={loading ? "Carregando produtora..." : "Produtora"} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title="Produtora" />
      <Card style={styles.hero}>
        <LogoAvatar
          name={initials(produtora.nome)}
          uri={pickImage(produtora, ["logo_url"], "imagem_produtoras")}
          size={68}
          rounded={8}
          type="champ"
        />
        <View style={{ flex: 1 }}>
          <Tiny style={styles.eyebrow}>PRODUTORA</Tiny>
          <Title style={styles.title}>{produtora.nome}</Title>
          <Subtitle numberOfLines={3}>
            {produtora.descricao ||
              produtora.slug ||
              "Organização cadastrada no Drop Zone."}
          </Subtitle>
        </View>
      </Card>
      <StatsStrip
        items={[
          { label: "campeonatos", value: campeonatos.length },
          { label: "líderes", value: membros.length },
          { label: "convites", value: pendentes.length },
        ]}
      />

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setAba("campeonatos")}
          style={[
            styles.tabButton,
            aba === "campeonatos" && styles.tabButtonActive,
          ]}
        >
          <Body
            style={[
              styles.tabText,
              aba === "campeonatos" && styles.tabTextActive,
            ]}
          >
            Campeonatos
          </Body>
        </Pressable>
        <Pressable
          onPress={() => setAba("gestao")}
          style={[styles.tabButton, aba === "gestao" && styles.tabButtonActive]}
        >
          <Body
            style={[styles.tabText, aba === "gestao" && styles.tabTextActive]}
          >
            Gestão
          </Body>
        </Pressable>
      </View>

      {aba === "campeonatos" ? (
        <>
          {isAdmin ? (
            <View style={styles.actions}>
              <Button
                label="Novo campeonato"
                onPress={() =>
                  router.push(`/criar/campeonato?produtoraId=${id}` as any)
                }
                style={{ flex: 1 }}
              />
              <Button
                label={tipoLabel}
                variant="ghost"
                onPress={() => setFiltroOpen(true)}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button
                label={tipoLabel}
                variant="ghost"
                onPress={() => setFiltroOpen(true)}
                style={{ flex: 1 }}
              />
            </View>
          )}

          <SectionHeader
            title="Campeonatos"
            action={`${campeonatosFiltrados.length}`}
          />
          {!campeonatosFiltrados.length ? (
            <Card>
              <Subtitle>Nenhum campeonato encontrado neste filtro.</Subtitle>
            </Card>
          ) : null}
          {campeonatosFiltrados.map((camp) => (
            <CompactRow
              key={camp.id}
              type="champ"
              logo={camp.nome}
              logoUri={pickImage(camp, ["logo_url"], "imagem_campeonatos")}
              imageUri={pickImage(camp, ["banner_url"], "imagem_campeonatos")}
              title={camp.nome}
              meta={`${tipoCamp(camp)} • ${camp.vagas || 0} vagas • ${camp.regiao || "-"}`}
              tag={camp.status || "ativo"}
              right={camp.valor_vaga ? `R$ ${camp.valor_vaga}` : "ver"}
              href={`/campeonato/${camp.id}`}
            />
          ))}
        </>
      ) : (
        <>
          <SectionHeader
            title="Gestão"
            action={isOwner ? "DONO" : isAdmin ? "ADMIN" : "VISUALIZAÇÃO"}
          />
          <Card style={styles.ownerCard}>
            <LogoAvatar
              name={donoPerfil?.nome || donoPerfil?.username || produtora.nome}
              uri={pickImage(donoPerfil || {}, ["avatar_url"], "avatars")}
              size={46}
              rounded={23}
              type="player"
            />
            <View style={{ flex: 1 }}>
              <Tiny style={styles.eyebrow}>DONO</Tiny>
              <Body style={styles.leaderName}>
                {donoPerfil?.nome ||
                  donoPerfil?.username ||
                  "Dono da produtora"}
              </Body>
              <Subtitle>
                {donoPerfil?.username ||
                  produtora.dono_id ||
                  "Responsável principal"}
              </Subtitle>
            </View>
          </Card>

          {isAdmin ? (
            <View style={styles.actions}>
              <Button
                label="Convidar líder"
                onPress={() => setInviteOpen(true)}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}

          <SectionHeader title="Líderes" action={`${membros.length}`} />
          {!membros.length ? (
            <Card>
              <Subtitle>Nenhum líder cadastrado.</Subtitle>
            </Card>
          ) : null}
          {membros.map((membro) => (
            <Pressable
              key={membro.id}
              onPress={() => (isOwner ? setPermissaoOpen(membro) : null)}
              style={styles.leaderRow}
            >
              <LogoAvatar
                name={
                  membro.perfil?.nome ||
                  membro.perfil?.username ||
                  membro.user_id
                }
                uri={pickImage(membro.perfil || {}, ["avatar_url"], "avatars")}
                size={42}
                rounded={21}
                type="player"
              />
              <View style={{ flex: 1 }}>
                <Body style={styles.leaderName}>
                  {membro.perfil?.nome || membro.perfil?.username || "Usuário"}
                </Body>
                <Subtitle>{membro.tipo || "admin"}</Subtitle>
              </View>
              {isOwner ? <Tiny style={styles.manage}>PERMISSÕES</Tiny> : null}
            </Pressable>
          ))}

          {pendentes.length ? (
            <>
              <SectionHeader
                title="Convites pendentes"
                action={`${pendentes.length}`}
              />
              {pendentes.map((convite) => (
                <Card key={convite.id} style={styles.inviteRow}>
                  <Body style={styles.leaderName}>
                    {convite.perfil?.nome ||
                      convite.perfil?.username ||
                      convite.user_id}
                  </Body>
                  <Tiny>{convite.status}</Tiny>
                </Card>
              ))}
            </>
          ) : null}
        </>
      )}

      <Modal
        visible={filtroOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltroOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setFiltroOpen(false)}>
          <View />
        </Pressable>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Body style={styles.sheetTitle}>Filtrar campeonatos</Body>
            <Tiny>TIPO</Tiny>
          </View>
          <ScrollView
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {tiposDisponiveis.map((tipo) => (
              <Pressable
                key={tipo}
                onPress={() => {
                  setTipoFiltro(tipo);
                  setFiltroOpen(false);
                }}
                style={[
                  styles.filterOption,
                  tipoFiltro === tipo && styles.filterOptionActive,
                ]}
              >
                <Body
                  style={[
                    styles.filterOptionText,
                    tipoFiltro === tipo && styles.filterOptionTextActive,
                  ]}
                >
                  {tipo === "todos" ? "Todos os tipos" : tipo.toUpperCase()}
                </Body>
                {tipoFiltro === tipo ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
          <Button
            label="Fechar"
            variant="ghost"
            onPress={() => setFiltroOpen(false)}
          />
        </View>
      </Modal>

      <Modal
        visible={inviteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setInviteOpen(false)}>
          <View />
        </Pressable>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Body style={styles.sheetTitle}>Convidar líder</Body>
            <Tiny>PRODUTORA</Tiny>
          </View>
          <Input
            value={buscaUsuario}
            onChangeText={buscarUsuarios}
            placeholder="Buscar usuário por nome ou username"
          />
          <Input
            value={mensagem}
            onChangeText={setMensagem}
            placeholder="Mensagem opcional"
            multiline
          />
          {usuarios.map((usuario) => (
            <Pressable
              key={usuario.id}
              onPress={() => convidar(usuario)}
              style={styles.userRow}
            >
              <LogoAvatar
                name={usuario.nome || usuario.username || "U"}
                uri={pickImage(usuario, ["avatar_url"], "avatars")}
                size={36}
                rounded={18}
                type="player"
              />
              <View style={{ flex: 1 }}>
                <Body style={styles.leaderName}>
                  {usuario.nome || usuario.username}
                </Body>
                <Subtitle>{usuario.username || usuario.id}</Subtitle>
              </View>
              <Ionicons
                name="person-add-outline"
                size={18}
                color={colors.primary}
              />
            </Pressable>
          ))}
          <Button
            label="Fechar"
            variant="ghost"
            onPress={() => setInviteOpen(false)}
          />
        </View>
      </Modal>

      <Modal
        visible={!!permissaoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPermissaoOpen(null)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setPermissaoOpen(null)}
        >
          <View />
        </Pressable>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Body style={styles.sheetTitle}>Limitar atuação</Body>
            <Tiny>LÍDER</Tiny>
          </View>
          <Subtitle>
            Escolha em quais campeonatos este líder pode atuar. Requer a tabela
            de permissões enviada no SQL.
          </Subtitle>
          {campeonatos.map((camp) => (
            <Card key={camp.id} style={styles.permissionCard}>
              <Body style={styles.leaderName}>{camp.nome}</Body>
              <View style={styles.permissionActions}>
                <Button
                  label="Permitir"
                  onPress={() =>
                    permissaoOpen &&
                    salvarLimites(permissaoOpen, camp.id, "gerenciar", true)
                  }
                  style={{ flex: 1 }}
                />
                <Button
                  label="Bloquear"
                  variant="ghost"
                  onPress={() =>
                    permissaoOpen &&
                    salvarLimites(permissaoOpen, camp.id, "gerenciar", false)
                  }
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ))}
          <Button
            label="Fechar"
            variant="ghost"
            onPress={() => setPermissaoOpen(null)}
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 12 },
  eyebrow: { color: colors.primary, fontWeight: "900", letterSpacing: 1.6 },
  title: { fontSize: 22, color: "#082F49" },
  actions: { flexDirection: "row", gap: 8 },
  tabs: { flexDirection: "row", gap: 8, marginTop: 4 },
  tabButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: { fontWeight: "900", textTransform: "uppercase" },
  tabTextActive: { color: "#fff" },
  ownerCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  filterOption: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  filterOptionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterOptionText: { fontWeight: "900" },
  filterOptionTextActive: { color: colors.primary },

  leaderRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  leaderName: { fontWeight: "800" },
  manage: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  inviteRow: { gap: 3 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.38)",
  },
  sheet: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    maxHeight: "84%",
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: { fontWeight: "900", fontSize: 17 },
  userRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  permissionCard: { gap: 8 },
  permissionActions: { flexDirection: "row", gap: 8 },
});
