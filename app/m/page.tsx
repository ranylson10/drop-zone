"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Gamepad2, Rss, Trophy, UserRound, Users, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MobileCard, MobileSectionTitle } from "./components/MobileShell";
import { MobileFeedList } from "./components/MobileFeedList";

type Campeonato = {
  id: string;
  nome: string;
  modelo_competicao?: string | null;
  tipo?: string | null;
  horario_inicio?: string | null;
  vagas?: number | null;
  valor_vaga?: number | null;
  valor_premiacao?: number | null;
  logo_url?: string | null;
};

function dinheiro(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function tipoInfo(campeonato: Campeonato) {
  const tipo = String(
    campeonato.modelo_competicao || campeonato.tipo || "",
  ).toLowerCase();
  if (tipo.includes("copa"))
    return {
      label: "Copa",
      cls: "border-purple-200 bg-purple-50 text-purple-700",
    };
  if (tipo.includes("liga"))
    return {
      label: "Liga",
      cls: "border-amber-200 bg-amber-50 text-amber-700",
    };
  if (tipo.includes("xtreino"))
    return {
      label: "Xtreino",
      cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  if (tipo.includes("confronto") || tipo.includes("4x4"))
    return { label: "Confronto", cls: "border-red-200 bg-red-50 text-red-700" };
  return { label: "Diário", cls: "border-blue-200 bg-blue-50 text-blue-700" };
}

function AtalhoCompacto({
  href,
  label,
  desc,
  icon: Icon,
}: {
  href: string;
  label: string;
  desc: string;
  icon: any;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[68px] items-center gap-2 border border-slate-200 bg-white p-2.5 active:bg-slate-50"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center border border-blue-200 bg-blue-50 text-blue-600">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-black uppercase leading-4 text-slate-950">
          {label}
        </p>
        <p className="truncate text-[10px] font-semibold text-slate-500">
          {desc}
        </p>
      </div>
    </Link>
  );
}

export default function MobileHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logado, setLogado] = useState(false);
  const [saldo, setSaldo] = useState(0);
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!ativo) return;
      setLogado(Boolean(user));

      if (!user) {
        setLoading(false);
        router.replace("/m/cadastro");
        return;
      }

      const { data: saldoData } = await supabase
        .from("wallet_saldo")
        .select("saldo")
        .eq("user_id", user.id)
        .maybeSingle();
      if (ativo && saldoData) setSaldo(Number((saldoData as any).saldo || 0));

      const { data } = await supabase
        .from("campeonatos")
        .select(
          "id,nome,modelo_competicao,tipo,horario_inicio,vagas,valor_vaga,valor_premiacao,logo_url,status",
        )
        .in("status", ["inscricoes", "rascunho", "em_andamento"])
        .order("created_at", { ascending: false })
        .limit(3);

      if (ativo) {
        setCampeonatos((data || []) as Campeonato[]);
        setLoading(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [router]);

  if (loading)
    return (
      <MobileCard>
        <p className="text-center text-xs font-black uppercase text-slate-500">
          Carregando mobile...
        </p>
      </MobileCard>
    );
  if (!logado)
    return (
      <MobileCard>
        <p className="text-center text-xs font-black uppercase text-slate-500">
          Abrindo cadastro...
        </p>
      </MobileCard>
    );

  return (
    <div className="space-y-3">
      <MobileCard className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
              Resumo da conta
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
              Saldo disponível
            </p>
            <h1 className="mt-0.5 text-[22px] font-black tracking-[-0.05em]">
              {dinheiro(saldo)}
            </h1>
          </div>
          <Link
            href="/m/carteira"
            className="shrink-0 border border-blue-600 bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white"
          >
            Depositar
          </Link>
        </div>
      </MobileCard>

      <section>
        <MobileSectionTitle
          title="Atalhos"
          subtitle="Funções principais sem ocupar espaço demais."
        />
        <div className="grid grid-cols-2 gap-2">
          <AtalhoCompacto
            href="/m/campeonatos"
            label="Inscrever"
            desc="Vagas abertas"
            icon={Trophy}
          />
          <AtalhoCompacto
            href="/m/equipe"
            label="Equipe"
            desc="Elenco"
            icon={Users}
          />
          <AtalhoCompacto
            href="/m/jogadores"
            label="Jogadores"
            desc="Cadastro"
            icon={UserRound}
          />
          <AtalhoCompacto
            href="/m/lines"
            label="Lines"
            desc="Titulares"
            icon={Gamepad2}
          />
          <AtalhoCompacto
            href="/m/carteira"
            label="Carteira"
            desc="PIX"
            icon={Wallet}
          />
          <AtalhoCompacto
            href="/m/feed"
            label="Feed"
            desc="Postagens"
            icon={Rss}
          />
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-2">
          <MobileSectionTitle
            title="Campeonatos"
            subtitle="Recentes para inscrição rápida."
          />
          <Link
            href="/m/campeonatos"
            className="mb-2 text-[10px] font-black uppercase text-blue-600"
          >
            Ver todos
          </Link>
        </div>
        <div className="space-y-2">
          {campeonatos.map((camp) => {
            const info = tipoInfo(camp);
            return (
              <Link
                key={camp.id}
                href={`/m/campeonatos/${camp.id}`}
                className="block border border-slate-200 bg-white p-2.5 active:bg-slate-50"
              >
                <div className="flex gap-2.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-50">
                    {camp.logo_url ? (
                      <img
                        src={camp.logo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Trophy size={18} className="text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${info.cls}`}
                      >
                        {info.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {camp.horario_inicio || "Horário aberto"}
                      </span>
                    </div>
                    <h3 className="mt-1 truncate text-[13px] font-black uppercase tracking-[-0.03em]">
                      {camp.nome}
                    </h3>
                    <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">
                      Vagas {camp.vagas || "-"} • {dinheiro(camp.valor_vaga)} •
                      Prêmio {dinheiro(camp.valor_premiacao)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <MobileSectionTitle
          title="Feed"
          subtitle="Postagens da comunidade, igual app social."
        />
        <MobileFeedList limit={20} />
      </section>
    </div>
  );
}
