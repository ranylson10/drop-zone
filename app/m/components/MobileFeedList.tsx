"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, MessageCircle, Repeat2, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MobileCard } from "./MobileShell";

type TipoAutor = "usuario" | "perfil_jogo" | "equipe" | "produtora";

type PostBase = {
  id: string;
  conteudo: string | null;
  imagem_url: string | null;
  created_at: string;
  autor_tipo: TipoAutor | null;
  autor_user_id: string | null;
  autor_perfil_jogo_id: string | null;
  autor_equipe_id: string | null;
  autor_produtora_id: string | null;
};

type Autor = { nome: string; foto: string | null; tag: string };
type Post = {
  id: string;
  conteudo: string;
  imagem_url: string | null;
  created_at: string;
  autor: Autor;
  curtidas: number;
  comentarios: number;
  reposts: number;
};

const AUTOR_PADRAO: Autor = { nome: "Drop Zone", foto: null, tag: "POST" };

function tempoRelativo(data: string) {
  const diff = Date.now() - new Date(data).getTime();
  const min = Math.max(1, Math.floor(diff / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

function contarPorPost(lista: any[]) {
  const mapa = new Map<string, number>();
  for (const item of lista || []) {
    if (!item?.post_id) continue;
    mapa.set(item.post_id, (mapa.get(item.post_id) || 0) + 1);
  }
  return mapa;
}

function autorDoPost(post: PostBase, maps: any): Autor {
  if (post.autor_tipo === "usuario" && post.autor_user_id) {
    const p = maps.profiles.get(post.autor_user_id);
    return {
      nome: p?.nome_exibicao || p?.username || "Usuário",
      foto: p?.foto_url || null,
      tag: "USUÁRIO",
    };
  }
  if (post.autor_tipo === "perfil_jogo" && post.autor_perfil_jogo_id) {
    const p = maps.perfis.get(post.autor_perfil_jogo_id);
    return {
      nome: p?.nick || "Perfil de jogo",
      foto: p?.foto_capa || null,
      tag: "JOGADOR",
    };
  }
  if (post.autor_tipo === "equipe" && post.autor_equipe_id) {
    const e = maps.equipes.get(post.autor_equipe_id);
    return {
      nome: e?.nome || "Equipe",
      foto: e?.logo_url || null,
      tag: "EQUIPE",
    };
  }
  if (post.autor_tipo === "produtora" && post.autor_produtora_id) {
    const pr = maps.produtoras.get(post.autor_produtora_id);
    return {
      nome: pr?.nome || "Produtora",
      foto: pr?.logo_url || null,
      tag: "ORG",
    };
  }
  return AUTOR_PADRAO;
}

export function MobileFeedList({ limit = 40 }: { limit?: number }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id,conteudo,imagem_url,created_at,autor_tipo,autor_user_id,autor_perfil_jogo_id,autor_equipe_id,autor_produtora_id",
        )
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      const base = (data || []) as PostBase[];
      const postIds = base.map((p) => p.id);
      const userIds = [
        ...new Set(base.map((p) => p.autor_user_id).filter(Boolean)),
      ] as string[];
      const perfilIds = [
        ...new Set(base.map((p) => p.autor_perfil_jogo_id).filter(Boolean)),
      ] as string[];
      const equipeIds = [
        ...new Set(base.map((p) => p.autor_equipe_id).filter(Boolean)),
      ] as string[];
      const produtoraIds = [
        ...new Set(base.map((p) => p.autor_produtora_id).filter(Boolean)),
      ] as string[];

      const [
        profilesRes,
        perfisRes,
        equipesRes,
        produtorasRes,
        curtidasRes,
        comentariosRes,
        repostsRes,
      ] = await Promise.all([
        userIds.length
          ? supabase
              .from("profiles")
              .select("id,nome_exibicao,username,foto_url")
              .in("id", userIds)
          : Promise.resolve({ data: [], error: null }),
        perfilIds.length
          ? supabase
              .from("perfis_jogo")
              .select("id,nick,foto_capa")
              .in("id", perfilIds)
          : Promise.resolve({ data: [], error: null }),
        equipeIds.length
          ? supabase
              .from("equipes")
              .select("id,nome,logo_url")
              .in("id", equipeIds)
          : Promise.resolve({ data: [], error: null }),
        produtoraIds.length
          ? supabase
              .from("produtoras")
              .select("id,nome,logo_url")
              .in("id", produtoraIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase
              .from("curtidas_post")
              .select("post_id")
              .in("post_id", postIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase
              .from("comentarios")
              .select("post_id")
              .eq("ativo", true)
              .in("post_id", postIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase.from("reposts").select("post_id").in("post_id", postIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const maps = {
        profiles: new Map(
          ((profilesRes.data || []) as any[]).map((i) => [i.id, i]),
        ),
        perfis: new Map(
          ((perfisRes.data || []) as any[]).map((i) => [i.id, i]),
        ),
        equipes: new Map(
          ((equipesRes.data || []) as any[]).map((i) => [i.id, i]),
        ),
        produtoras: new Map(
          ((produtorasRes.data || []) as any[]).map((i) => [i.id, i]),
        ),
      };
      const curtidas = contarPorPost(curtidasRes.data || []);
      const comentarios = contarPorPost(comentariosRes.data || []);
      const reposts = contarPorPost(repostsRes.data || []);

      setPosts(
        base.map((post) => ({
          id: post.id,
          conteudo: post.conteudo || "",
          imagem_url: post.imagem_url,
          created_at: post.created_at,
          autor: autorDoPost(post, maps),
          curtidas: curtidas.get(post.id) || 0,
          comentarios: comentarios.get(post.id) || 0,
          reposts: reposts.get(post.id) || 0,
        })),
      );
    } catch (err) {
      console.error("Erro ao carregar feed mobile:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="space-y-2.5">
      {loading && (
        <MobileCard>
          <p className="text-center text-xs font-black uppercase text-slate-500">
            Carregando feed...
          </p>
        </MobileCard>
      )}
      {!loading && posts.length === 0 && (
        <MobileCard>
          <p className="text-center text-xs font-bold text-slate-500">
            Nenhuma postagem encontrada.
          </p>
        </MobileCard>
      )}
      {posts.map((post) => (
        <article
          key={post.id}
          className="mobile-force-white border border-slate-200 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.035)]"
        >
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-50">
              {post.autor.foto ? (
                <img
                  src={post.autor.foto}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound size={18} className="text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[13px] font-black uppercase text-slate-950">
                  {post.autor.nome}
                </p>
                <span className="border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                  {post.autor.tag}
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {tempoRelativo(post.created_at)}
              </p>
            </div>
          </div>

          {post.conteudo && (
            <p className="mt-2.5 whitespace-pre-wrap text-[13px] font-semibold leading-5 text-slate-700">
              {post.conteudo}
            </p>
          )}
          {post.imagem_url && (
            <img
              src={post.imagem_url}
              alt=""
              className="mt-2.5 max-h-[360px] w-full border border-slate-200 object-cover"
            />
          )}

          <div className="mt-2.5 grid grid-cols-3 border border-slate-200 bg-slate-50 text-slate-500">
            <div className="flex items-center justify-center gap-1 border-r border-slate-200 py-2 text-[11px] font-black">
              <Heart size={14} /> {post.curtidas}
            </div>
            <div className="flex items-center justify-center gap-1 border-r border-slate-200 py-2 text-[11px] font-black">
              <MessageCircle size={14} /> {post.comentarios}
            </div>
            <div className="flex items-center justify-center gap-1 py-2 text-[11px] font-black">
              <Repeat2 size={14} /> {post.reposts}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
