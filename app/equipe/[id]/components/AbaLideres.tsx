"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Crown, Shield, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProfileResumo = {
  id: string;
  username: string | null;
  nome_exibicao: string | null;
  foto_url: string | null;
};

type TipoMembro = "dono" | "admin" | "manager" | "membro";

type LiderComando = {
  id: string;
  tipo: TipoMembro;
  entrou_em: string | null;
  perfilUsuario: ProfileResumo | null;
  perfilJogo: {
    id: string;
    nick: string | null;
    foto_capa: string | null;
    funcao: string | null;
  } | null;
};

type MembroEquipeNormalizado = {
  id: string;
  equipe_id: string;
  perfil_jogo_id: string | null;
  user_id?: string | null;
  tipo: TipoMembro;
  ativo: boolean;
  entrou_em: string | null;
  saiu_em: string | null;
  profileConta?: ProfileResumo | null;
  perfil: {
    id: string;
    nick: string | null;
    foto_capa: string | null;
    funcao: string | null;
    user_id: string | null;
    profile: ProfileResumo | null;
  } | null;
};

type Props = {
  equipeId: string;
  membros: LiderComando[];
  todosMembros: MembroEquipeNormalizado[];
  canManageAdmins: boolean;
  onAtualizado?: () => void | Promise<void>;
};

function nomeUsuario(profile?: ProfileResumo | null) {
  return profile?.nome_exibicao || profile?.username || "Usuário sem nome";
}

function nomeLider(m: LiderComando) {
  return (
    m.perfilUsuario?.nome_exibicao ||
    m.perfilUsuario?.username ||
    m.perfilJogo?.nick ||
    "Usuário sem nome"
  );
}

function dataBR(data?: string | null) {
  if (!data) return "N/I";
  const d = new Date(data);
  return Number.isNaN(d.getTime())
    ? "N/I"
    : new Intl.DateTimeFormat("pt-BR").format(d);
}

function limparBusca(valor: string) {
  return valor.trim().replace(/[%_,()]/g, "");
}

function isUuid(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

export default function AbaLideres({
  equipeId,
  membros,
  todosMembros,
  canManageAdmins,
  onAtualizado,
}: Props) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ProfileResumo[]>([]);
  const [selecionado, setSelecionado] = useState<ProfileResumo | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const managers = useMemo(
    () => membros.filter((m) => m.tipo === "manager"),
    [membros],
  );
  const idsJaVinculados = useMemo(() => {
    const ids = new Set<string>();
    membros.forEach((m) => {
      if (m.perfilUsuario?.id) ids.add(m.perfilUsuario.id);
    });
    todosMembros.forEach((m) => {
      if (m.user_id) ids.add(m.user_id);
      if (m.profileConta?.id) ids.add(m.profileConta.id);
      if (m.perfil?.profile?.id) ids.add(m.perfil.profile.id);
    });
    return ids;
  }, [membros, todosMembros]);

  useEffect(() => {
    const termo = limparBusca(busca);
    setMsg(null);
    setErro(null);

    const textoSelecionado = selecionado
      ? `${nomeUsuario(selecionado)}${selecionado.username ? ` (@${selecionado.username})` : ""}`
      : "";

    if (selecionado && busca === textoSelecionado) {
      setResultados([]);
      return;
    }

    if (selecionado && busca !== textoSelecionado) {
      setSelecionado(null);
    }

    if (termo.length < 2) {
      setResultados([]);
      return;
    }

    let cancelado = false;

    const timer = window.setTimeout(async () => {
      try {
        setBuscando(true);

        let encontrados: ProfileResumo[] = [];

        if (isUuid(termo)) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, username, nome_exibicao, foto_url")
            .eq("id", termo)
            .limit(1);

          if (error) throw error;
          encontrados = (data || []) as ProfileResumo[];
        } else {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, username, nome_exibicao, foto_url")
            .or(`username.ilike.%${termo}%,nome_exibicao.ilike.%${termo}%`)
            .order("nome_exibicao", { ascending: true })
            .limit(12);

          if (error) throw error;
          encontrados = (data || []) as ProfileResumo[];
        }

        if (!cancelado) {
          setResultados(
            encontrados.filter((profile) => !idsJaVinculados.has(profile.id)),
          );
        }
      } catch (e: any) {
        if (!cancelado)
          setErro(e?.message || "Não foi possível pesquisar usuários do site.");
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, 350);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [busca, idsJaVinculados, selecionado]);

  async function adicionarManager() {
    if (!canManageAdmins || !selecionado?.id) return;

    try {
      setSalvando(true);
      setErro(null);
      setMsg(null);

      if (idsJaVinculados.has(selecionado.id)) {
        setErro("Este usuário já está vinculado ao comando da equipe.");
        return;
      }

      const { error } = await supabase.from("membros_equipe").insert({
        equipe_id: equipeId,
        user_id: selecionado.id,
        perfil_jogo_id: null,
        tipo: "manager",
        ativo: true,
        entrou_em: new Date().toISOString(),
      });

      if (error) throw error;

      setBusca("");
      setResultados([]);
      setSelecionado(null);
      setMsg("Manager adicionado.");
      await onAtualizado?.();
    } catch (e: any) {
      setErro(e?.message || "Não foi possível adicionar o manager.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerManager(membroId: string) {
    if (!canManageAdmins || !membroId) return;

    try {
      setSalvando(true);
      setErro(null);
      setMsg(null);

      const { error } = await supabase
        .from("membros_equipe")
        .update({ ativo: false, saiu_em: new Date().toISOString() })
        .eq("id", membroId)
        .eq("equipe_id", equipeId)
        .eq("tipo", "manager");

      if (error) throw error;

      setMsg("Manager removido.");
      await onAtualizado?.();
    } catch (e: any) {
      setErro(e?.message || "Não foi possível remover o manager.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
          // Comando da organização
        </h2>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Dono e managers da equipe
        </p>
      </div>

      {canManageAdmins ? (
        <div className="border border-zinc-200 bg-[#f8f8f8] p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_240px] lg:items-end">
            <div className="relative">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8ea0be]">
                Adicionar manager
              </label>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquise nome, usuário ou UID da conta"
                className="h-12 w-full border border-zinc-300 bg-white px-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#142340] outline-none focus:border-[#2563eb]"
              />

              {busca.trim().length >= 2 && !selecionado ? (
                <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto border border-zinc-200 bg-white shadow-sm">
                  {buscando ? (
                    <div className="flex h-14 items-center gap-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                      <Loader2 size={14} className="animate-spin" /> pesquisando
                      usuários...
                    </div>
                  ) : resultados.length > 0 ? (
                    resultados.map((profile) => {
                      const nome = nomeUsuario(profile);
                      const ativo = selecionado?.id === profile.id;

                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => {
                            setSelecionado(profile);
                            setBusca(
                              `${nome}${profile.username ? ` (@${profile.username})` : ""}`,
                            );
                            setResultados([]);
                          }}
                          className={`flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-3 text-left hover:bg-blue-50 ${ativo ? "bg-blue-50" : "bg-white"}`}
                        >
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
                            {profile.foto_url ? (
                              <Image
                                src={profile.foto_url}
                                alt={nome}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[11px] font-bold uppercase text-zinc-500">
                                {nome.slice(0, 2)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-bold uppercase tracking-[0.08em] text-[#142340]">
                              {nome}
                            </p>
                            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8ea0be]">
                              @{profile.username || "sem_usuario"} ·{" "}
                              {profile.id.slice(0, 8)}...
                            </p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                      Nenhum usuário encontrado na tabela profiles.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              disabled={!selecionado || salvando}
              onClick={adicionarManager}
              className="inline-flex h-12 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500"
            >
              {salvando ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              Adicionar manager
            </button>
          </div>

          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Manager usa somente a conta geral do site. Não precisa de perfil
            gamer.
          </p>

          {erro ? (
            <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
              {erro}
            </p>
          ) : null}

          {msg ? (
            <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {msg}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {membros.map((m) => {
          const nome = nomeLider(m);
          const foto = m.perfilUsuario?.foto_url || null;
          const dono = m.tipo === "dono";
          const manager = m.tipo === "manager";
          const gamer = m.perfilJogo?.nick || null;

          return (
            <div key={m.id} className="border border-zinc-200 bg-white">
              <div
                className={`h-2 ${dono ? "bg-[#2563eb]" : manager ? "bg-violet-600" : "bg-zinc-300"}`}
              />

              <div className="flex gap-4 p-5">
                <div className="relative h-[78px] w-[78px] shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
                  {foto ? (
                    <Image
                      src={foto}
                      alt={nome}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl font-semibold text-zinc-500">
                      {nome.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xl font-semibold uppercase tracking-tight text-[#142340]">
                    {nome}
                  </h3>

                  <div
                    className={`mt-2 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${dono ? "bg-yellow-300 text-[#142340]" : manager ? "bg-violet-100 text-violet-800" : "bg-blue-100 text-blue-800"}`}
                  >
                    {dono ? <Crown size={12} /> : <Shield size={12} />}
                    {dono ? "Dono" : manager ? "Manager" : "Admin"}
                  </div>

                  {m.perfilUsuario?.username ? (
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8ea0be]">
                      Perfil de usuário: @{m.perfilUsuario.username}
                    </p>
                  ) : null}

                  {gamer ? (
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Perfil gamer vinculado: {gamer}
                    </p>
                  ) : null}

                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Entrou em {dataBR(m.entrou_em)}
                  </p>
                </div>
              </div>

              {canManageAdmins && manager ? (
                <div className="border-t border-zinc-200 p-4">
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => removerManager(m.id)}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 border border-red-300 bg-red-50 px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvando ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <UserMinus size={13} />
                    )}
                    Remover manager
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {membros.length === 0 ? (
        <div className="border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Nenhum comando cadastrado para esta equipe.
          </p>
        </div>
      ) : null}

      {canManageAdmins && managers.length === 0 ? (
        <div className="border border-zinc-200 bg-[#f8f8f8] p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Esta equipe ainda não possui managers além do dono.
        </div>
      ) : null}
    </div>
  );
}
