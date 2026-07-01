import type { SupabaseClient } from "@supabase/supabase-js";

type SyncChampionshipLineRosterParams = {
  championshipId: string;
  championshipTeamId: string;
  teamId: string;
  lineId: string;
};

type LinePlayerRow = {
  perfil_jogo_id?: string | null;
  jogador_avulso_id?: string | null;
  tipo_slot?: string | null;
};

type ChampionshipPlayerRow = {
  id: string;
  perfil_jogo_id?: string | null;
  jogador_avulso_id?: string | null;
  status?: string | null;
  origem?: string | null;
  observacoes?: string | null;
};

function playerKey(row: {
  perfil_jogo_id?: string | null;
  jogador_avulso_id?: string | null;
}) {
  if (row.perfil_jogo_id) return `perfil:${row.perfil_jogo_id}`;
  if (row.jogador_avulso_id) return `avulso:${row.jogador_avulso_id}`;
  return "";
}

export async function syncChampionshipLineRoster(
  client: SupabaseClient,
  {
    championshipId,
    championshipTeamId,
    teamId,
    lineId,
  }: SyncChampionshipLineRosterParams,
) {
  const [{ data: linePlayers, error: lineError }, { data: currentPlayers, error: currentError }] =
    await Promise.all([
      client
        .from("lines_jogadores")
        .select("perfil_jogo_id,jogador_avulso_id,tipo_slot")
        .eq("line_id", lineId)
        .is("removido_em", null),
      client
        .from("jogadores_campeonato")
        .select("id,perfil_jogo_id,jogador_avulso_id,status,origem,observacoes")
        .eq("campeonato_equipe_id", championshipTeamId),
    ]);

  if (lineError) throw lineError;
  if (currentError) throw currentError;

  const desired = new Map<string, LinePlayerRow>();
  ((linePlayers || []) as LinePlayerRow[]).forEach((row) => {
    const key = playerKey(row);
    if (key) desired.set(key, row);
  });

  const current = (currentPlayers || []) as ChampionshipPlayerRow[];
  const currentByKey = new Map<string, ChampionshipPlayerRow>();
  current.forEach((row) => {
    const key = playerKey(row);
    if (key) currentByKey.set(key, row);
  });
  const inserts: Record<string, unknown>[] = [];
  const updates: PromiseLike<{ error: unknown }>[] = [];

  desired.forEach((row, key) => {
    const existing = currentByKey.get(key);
    const observacoes = row.tipo_slot || "titular";
    if (existing) {
      if (
        existing.status !== "ativo" ||
        existing.origem !== "app" ||
        existing.observacoes !== observacoes
      ) {
        updates.push(
          client
            .from("jogadores_campeonato")
            .update({
              status: "ativo",
              origem: "app",
              observacoes,
              criado_automaticamente: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id),
        );
      }
      return;
    }

    inserts.push({
      campeonato_id: championshipId,
      campeonato_equipe_id: championshipTeamId,
      equipe_id: teamId,
      perfil_jogo_id: row.perfil_jogo_id || null,
      jogador_avulso_id: row.jogador_avulso_id || null,
      origem: "app",
      status: "ativo",
      criado_automaticamente: false,
      observacoes,
    });
  });

  current.forEach((row) => {
    const key = playerKey(row);
    if (
      key &&
      row.origem === "app" &&
      !desired.has(key) &&
      row.status !== "inativo"
    ) {
      updates.push(
        client
          .from("jogadores_campeonato")
          .update({
            status: "inativo",
            observacoes: "fora_convocacao",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id),
      );
    }
  });

  if (inserts.length) {
    const { error } = await client.from("jogadores_campeonato").insert(inserts);
    if (error) throw error;
  }

  if (updates.length) {
    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  }
}
