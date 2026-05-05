"use client";

import {
 useCallback,
 useEffect,
 useMemo,
 useState,
 type ReactNode,
} from "react";
import {
 BarChart3,
 Crown,
 Database,
 Edit3,
 FileUp,
 Gamepad2,
 Loader2,
 Plus,
 Save,
 Search,
 Shield,
 Skull,
 Snowflake,
 Swords,
 Trophy,
 UserRound,
 Users,
 X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Aba = "estatisticas" | "equipes" | "jogadores" | "pontuacao" | "admin";
type EstatSubAba = "equipes" | "mvp";

type LbffEquipe = {
 id: string;
 nome: string;
 tag: string | null;
 grupo: string | null;
 logo_url: string | null;
 cor: string | null;
 pontos: number;
 booyah: number;
 abates: number;
 quedas: number;
 created_at?: string | null;
 updated_at?: string | null;
};

type LbffJogador = {
 id: string;
 jogador: string;
 id_jogo: string | null;
 equipe_id: string | null;
 equipe_nome?: string | null;
 equipe_tag?: string | null;
 equipe_logo?: string | null;
 equipe_cor?: string | null;
 foto_url: string | null;
 funcao: string | null;
 quedas: number;
 abates: number;
 dano: number;
 assists: number;
 mvp: number;
 capas: number;
 derrubados: number;
 gelos: number;
 gelos_destruidos: number;
 reviveu: number;
 aliados_revividos: number;
 overall: number;
 atributos: Record<string, number>;
};

type EquipeForm = {
 id: string | null;
 nome: string;
 tag: string;
 grupo: string;
 logo_url: string;
 cor: string;
 pontos: string;
 booyah: string;
 abates: string;
 quedas: string;
};

type JogadorForm = {
 id: string | null;
 jogador: string;
 id_jogo: string;
 equipe_id: string;
 foto_url: string;
 funcao: string;
 quedas: string;
 abates: string;
 dano: string;
 assists: string;
 mvp: string;
 capas: string;
 derrubados: string;
 gelos: string;
 gelos_destruidos: string;
 reviveu: string;
 aliados_revividos: string;
};

type CropTarget =
 | { tipo: "equipe"; width: 500; height: 500 }
 | { tipo: "jogador"; width: 500; height: 600 };

type CropState = {
 target: CropTarget;
 src: string;
 zoom: number;
 offsetX: number;
 offsetY: number;
};

const emptyEquipeForm: EquipeForm = {
 id: null,
 nome: "",
 tag: "",
 grupo: "",
 logo_url: "",
 cor: "#ffcc00",
 pontos: "0",
 booyah: "0",
 abates: "0",
 quedas: "0",
};

const emptyJogadorForm: JogadorForm = {
 id: null,
 jogador: "",
 id_jogo: "",
 equipe_id: "",
 foto_url: "",
 funcao: "",
 quedas: "0",
 abates: "0",
 dano: "0",
 assists: "0",
 mvp: "0",
 capas: "0",
 derrubados: "0",
 gelos: "0",
 gelos_destruidos: "0",
 reviveu: "0",
 aliados_revividos: "0",
};

const metricasOverall = [
 { key: "abates", label: "KILL" },
 { key: "dano", label: "DANO" },
 { key: "assists", label: "AST" },
 { key: "mvp", label: "MVP" },
 { key: "capas", label: "CAPA" },
 { key: "derrubados", label: "DERR" },
 { key: "gelos", label: "GELO" },
 { key: "gelos_destruidos", label: "GD" },
 { key: "reviveu", label: "REV" },
 { key: "aliados_revividos", label: "ALY" },
] as const;

function num(value: any) {
 const n = Number(value || 0);
 return Number.isFinite(n) ? n : 0;
}

function campoNumero(valor: string) {
 const n = Number(String(valor || "0").replace(",", "."));
 return Number.isFinite(n) ? n : 0;
}

function initials(nome?: string | null) {
 return (nome || "LB").trim().slice(0, 2).toUpperCase();
}

function normalizarTexto(value: any) {
 return String(value || "")
 .trim()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .toLowerCase();
}

function detectarSeparadorCsv(linha: string) {
 const virgulas = (linha.match(/,/g) || []).length;
 const pontosVirgula = (linha.match(/;/g) || []).length;
 return pontosVirgula > virgulas ? ";" : ",";
}

function separarLinhaCsv(linha: string, separador: string) {
 const valores: string[] = [];
 let atual = "";
 let dentroAspas = false;

 for (let i = 0; i < linha.length; i += 1) {
 const char = linha[i];
 const prox = linha[i + 1];

 if (char === '"' && prox === '"') {
 atual += '"';
 i += 1;
 continue;
 }

 if (char === '"') {
 dentroAspas = !dentroAspas;
 continue;
 }

 if (char === separador && !dentroAspas) {
 valores.push(atual.trim());
 atual = "";
 continue;
 }

 atual += char;
 }

 valores.push(atual.trim());
 return valores.map((v) => v.replace(/^"|"$/g, "").trim());
}

async function lerCsv(file: File): Promise<Record<string, string>[]> {
 const texto = await file.text();
 const linhas = texto
 .replace(/^\uFEFF/, "")
 .split(/\r?\n/)
 .map((linha) => linha.trim())
 .filter(Boolean);

 if (linhas.length < 2) return [];

 const separador = detectarSeparadorCsv(linhas[0]);
 const headers = separarLinhaCsv(linhas[0], separador).map(normalizarTexto);

 return linhas.slice(1).map((linha) => {
 const valores = separarLinhaCsv(linha, separador);
 const row: Record<string, string> = {};
 headers.forEach((header, index) => {
 row[header] = valores[index] || "";
 });
 return row;
 });
}

function pegar(row: Record<string, string>, nomes: string[]) {
 for (const nome of nomes) {
 const key = normalizarTexto(nome);
 if (row[key] !== undefined && row[key] !== "") return row[key];
 }
 return "";
}

function numeroCsv(row: Record<string, string>, nomes: string[]) {
 const valor = pegar(row, nomes).replace(/\./g, "").replace(",", ".");
 return campoNumero(valor);
}

function calcularOverallPorRazao(base: any, maximos: Record<string, number>) {
 const atributos: Record<string, number> = {};
 const notas: number[] = [];

 metricasOverall.forEach((metrica) => {
 const valor = num(base[metrica.key]);
 const maximo = num(maximos[metrica.key]);
 const nota =
 maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 0;
 atributos[metrica.key] = nota;
 if (maximo > 0) notas.push(nota);
 });

 const overall =
 notas.length > 0
 ? Math.round(notas.reduce((acc, n) => acc + n, 0) / notas.length)
 : 0;
 return { overall, atributos };
}

function classeOverall(overall: number) {
 if (overall >= 90) return "text-[#ffcc00]";
 if (overall >= 75) return "text-[#75ff18]";
 if (overall >= 55) return "text-[#142340]";
 return "text-zinc-500";
}

function corEquipe(cor?: string | null) {
 return cor && cor.trim() ? cor.trim() : "#ffcc00";
}

function corComAlpha(cor?: string | null, alpha = 0.25) {
 const c = corEquipe(cor);
 const limpo = c.replace("#", "").trim();
 if (/^[0-9a-fA-F]{6}$/.test(limpo)) {
 const r = parseInt(limpo.slice(0, 2), 16);
 const g = parseInt(limpo.slice(2, 4), 16);
 const b = parseInt(limpo.slice(4, 6), 16);
 return `rgba(${r},${g},${b},${alpha})`;
 }
 return c;
}


function rankBroadcast(index: number) {
 if (index === 0) return { nome: "OURO", cor: "#ffcc00", glow: "rgba(255,204,0,.34)" };
 if (index === 1) return { nome: "PRATA", cor: "#cbd5e1", glow: "rgba(203,213,225,.22)" };
 if (index === 2) return { nome: "BRONZE", cor: "#f97316", glow: "rgba(249,115,22,.24)" };
 return { nome: "RANK", cor: "rgba(255,255,255,.12)", glow: "rgba(255,255,255,.05)" };
}


function dedupeEquipesLbff(lista: LbffEquipe[]) {
 const mapa = new Map<string, LbffEquipe>();

 lista.forEach((equipe) => {
 const chave = normalizarTexto(equipe.tag || equipe.nome);
 const atual = mapa.get(chave);

 if (!atual) {
 mapa.set(chave, equipe);
 return;
 }

 const atualTime =
 new Date(atual.updated_at || atual.created_at || 0).getTime() || 0;
 const novoTime =
 new Date(equipe.updated_at || equipe.created_at || 0).getTime() || 0;
 const novoMaisCompleto =
 (equipe.logo_url && !atual.logo_url) ||
 (equipe.grupo && !atual.grupo) ||
 equipe.pontos > atual.pontos ||
 equipe.abates > atual.abates ||
 novoTime > atualTime;

 if (novoMaisCompleto) mapa.set(chave, equipe);
 });

 return Array.from(mapa.values()).sort(
 (a, b) =>
 b.pontos - a.pontos ||
 b.abates - a.abates ||
 String(a.nome).localeCompare(String(b.nome), "pt-BR"),
 );
}

export default function LbffEstatisticasPage() {
 const [aba, setAba] = useState<Aba>("estatisticas");
 const [estatSubAba, setEstatSubAba] = useState<EstatSubAba>("equipes");
 const [loading, setLoading] = useState(true);
 const [salvando, setSalvando] = useState(false);
 const [equipes, setEquipes] = useState<LbffEquipe[]>([]);
 const [jogadores, setJogadores] = useState<LbffJogador[]>([]);
 const [busca, setBusca] = useState("");
 const [equipeSelecionadaId, setEquipeSelecionadaId] = useState<string | null>(
 null,
 );
 const [equipeForm, setEquipeForm] = useState<EquipeForm>(emptyEquipeForm);
 const [jogadorForm, setJogadorForm] = useState<JogadorForm>(emptyJogadorForm);
 const [cropState, setCropState] = useState<CropState | null>(null);
 const [cropLoading, setCropLoading] = useState(false);

 function abrirCropImagem(file: File | null, target: CropTarget) {
 if (!file) return;

 if (!file.type.startsWith("image/")) {
 alert("Selecione uma imagem válida.");
 return;
 }

 const reader = new FileReader();
 reader.onload = () => {
 setCropState({
 target,
 src: String(reader.result || ""),
 zoom: 1,
 offsetX: 0,
 offsetY: 0,
 });
 };
 reader.readAsDataURL(file);
 }

 function fecharCrop() {
 setCropState(null);
 setCropLoading(false);
 }

 async function aplicarCropImagem() {
 if (!cropState) return;

 try {
 setCropLoading(true);

 const img = new Image();
 img.src = cropState.src;
 await new Promise<void>((resolve, reject) => {
 img.onload = () => resolve();
 img.onerror = () =>
 reject(new Error("Não foi possível carregar a imagem."));
 });

 const { width, height, tipo } = cropState.target;
 const canvas = document.createElement("canvas");
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext("2d");

 if (!ctx) throw new Error("Canvas indisponível no navegador.");

 const coverScale =
 Math.max(width / img.width, height / img.height) * cropState.zoom;
 const drawWidth = img.width * coverScale;
 const drawHeight = img.height * coverScale;
 const maxShiftX = Math.max(0, (drawWidth - width) / 2);
 const maxShiftY = Math.max(0, (drawHeight - height) / 2);
 const shiftX = (cropState.offsetX / 100) * maxShiftX;
 const shiftY = (cropState.offsetY / 100) * maxShiftY;
 const dx = (width - drawWidth) / 2 + shiftX;
 const dy = (height - drawHeight) / 2 + shiftY;

 ctx.clearRect(0, 0, width, height);
 ctx.imageSmoothingEnabled = true;
 ctx.imageSmoothingQuality = "high";
 ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

 const base64 = canvas.toDataURL("image/png");

 if (tipo === "equipe") {
 setEquipeForm((form) => ({ ...form, logo_url: base64 }));
 } else {
 setJogadorForm((form) => ({ ...form, foto_url: base64 }));
 }

 fecharCrop();
 } catch (error: any) {
 console.error("Erro ao cortar imagem LBFF:", error);
 alert(error?.message || "Erro ao cortar imagem.");
 setCropLoading(false);
 }
 }

 const carregarDados = useCallback(async () => {
 try {
 setLoading(true);

 const { data: equipesData, error: equipesError } = await supabase
 .from("lbff_equipes")
 .select(
 "id, nome, tag, grupo, logo_url, cor, pontos, booyah, abates, quedas, created_at, updated_at",
 )
 .order("pontos", { ascending: false })
 .order("abates", { ascending: false });

 if (equipesError) throw equipesError;

 const { data: jogadoresData, error: jogadoresError } = await supabase
 .from("lbff_jogadores")
 .select(
 "id, jogador, id_jogo, equipe_id, foto_url, funcao, quedas, abates, dano, assists, mvp, capas, derrubados, gelos, gelos_destruidos, reviveu, aliados_revividos",
 )
 .order("abates", { ascending: false });

 if (jogadoresError) throw jogadoresError;

 const equipesNormalizadasRaw = ((equipesData || []) as any[]).map(
 (e) => ({
 id: e.id,
 nome: e.nome,
 tag: e.tag,
 grupo: e.grupo,
 logo_url: e.logo_url,
 cor: e.cor || "#ffcc00",
 pontos: num(e.pontos),
 booyah: num(e.booyah),
 abates: num(e.abates),
 quedas: num(e.quedas),
 created_at: e.created_at,
 updated_at: e.updated_at,
 }),
 );

 const equipesNormalizadas = dedupeEquipesLbff(equipesNormalizadasRaw);
 const equipesPorId = new Map(
 equipesNormalizadasRaw.map((e) => [e.id, e]),
 );
 const maximos = metricasOverall.reduce(
 (acc, metrica) => {
 acc[metrica.key] = Math.max(
 ...((jogadoresData || []) as any[]).map((j) => num(j[metrica.key])),
 0,
 );
 return acc;
 },
 {} as Record<string, number>,
 );

 const jogadoresNormalizados = ((jogadoresData || []) as any[])
 .map((row) => {
 const equipe = row.equipe_id ? equipesPorId.get(row.equipe_id) : null;
 const base = {
 id: row.id,
 jogador: row.jogador,
 id_jogo: row.id_jogo,
 equipe_id: row.equipe_id,
 equipe_nome: equipe?.nome || null,
 equipe_tag: equipe?.tag || null,
 equipe_logo: equipe?.logo_url || null,
 equipe_cor: equipe?.cor || "#ffcc00",
 foto_url: row.foto_url,
 funcao: row.funcao,
 quedas: num(row.quedas),
 abates: num(row.abates),
 dano: num(row.dano),
 assists: num(row.assists),
 mvp: num(row.mvp),
 capas: num(row.capas),
 derrubados: num(row.derrubados),
 gelos: num(row.gelos),
 gelos_destruidos: num(row.gelos_destruidos),
 reviveu: num(row.reviveu),
 aliados_revividos: num(row.aliados_revividos),
 };
 return { ...base, ...calcularOverallPorRazao(base, maximos) };
 })
 .sort(
 (a, b) =>
 b.overall - a.overall ||
 b.abates - a.abates ||
 b.dano - a.dano ||
 b.assists - a.assists,
 );

 setEquipes(equipesNormalizadas);
 setJogadores(jogadoresNormalizados);
 } catch (error: any) {
 console.error("Erro ao carregar estatísticas LBFF:", {
 message: error?.message,
 details: error?.details,
 hint: error?.hint,
 code: error?.code,
 raw: error,
 });
 setEquipes([]);
 setJogadores([]);
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 carregarDados();
 }, [carregarDados]);

 const equipesFiltradas = useMemo(() => {
 const termo = busca.trim().toLowerCase();
 if (!termo) return equipes;
 return equipes.filter((e) =>
 [e.nome, e.tag, e.grupo]
 .filter(Boolean)
 .join(" ")
 .toLowerCase()
 .includes(termo),
 );
 }, [equipes, busca]);

 const jogadoresFiltrados = useMemo(() => {
 const termo = busca.trim().toLowerCase();
 return jogadores.filter((j) => {
 const matchEquipe =
 !equipeSelecionadaId || j.equipe_id === equipeSelecionadaId;
 const matchBusca =
 !termo ||
 [j.jogador, j.id_jogo, j.equipe_nome, j.equipe_tag, j.funcao]
 .filter(Boolean)
 .join(" ")
 .toLowerCase()
 .includes(termo);
 return matchEquipe && matchBusca;
 });
 }, [jogadores, busca, equipeSelecionadaId]);

 const equipeSelecionada = useMemo(() => {
 if (!equipeSelecionadaId) return null;
 return equipes.find((e) => e.id === equipeSelecionadaId) || null;
 }, [equipes, equipeSelecionadaId]);

 const lideres = useMemo(() => {
 const topEquipe = [...equipes].sort(
 (a, b) => b.pontos - a.pontos || b.abates - a.abates,
 )[0];
 const topKill = [...jogadores].sort((a, b) => b.abates - a.abates)[0];
 const topOverall = [...jogadores].sort((a, b) => b.overall - a.overall)[0];
 const topMvp = [...jogadores].sort(
 (a, b) => b.mvp - a.mvp || b.overall - a.overall,
 )[0];
 return { topEquipe, topKill, topOverall, topMvp };
 }, [equipes, jogadores]);

 function preencherEquipeForm(equipe: LbffEquipe) {
 setEquipeForm({
 id: equipe.id,
 nome: equipe.nome || "",
 tag: equipe.tag || "",
 grupo: equipe.grupo || "",
 logo_url: equipe.logo_url || "",
 cor: equipe.cor || "#ffcc00",
 pontos: String(equipe.pontos || 0),
 booyah: String(equipe.booyah || 0),
 abates: String(equipe.abates || 0),
 quedas: String(equipe.quedas || 0),
 });
 }

 function preencherJogadorForm(jogador: LbffJogador) {
 setJogadorForm({
 id: jogador.id,
 jogador: jogador.jogador || "",
 id_jogo: jogador.id_jogo || "",
 equipe_id: jogador.equipe_id || "",
 foto_url: jogador.foto_url || "",
 funcao: jogador.funcao || "",
 quedas: String(jogador.quedas || 0),
 abates: String(jogador.abates || 0),
 dano: String(jogador.dano || 0),
 assists: String(jogador.assists || 0),
 mvp: String(jogador.mvp || 0),
 capas: String(jogador.capas || 0),
 derrubados: String(jogador.derrubados || 0),
 gelos: String(jogador.gelos || 0),
 gelos_destruidos: String(jogador.gelos_destruidos || 0),
 reviveu: String(jogador.reviveu || 0),
 aliados_revividos: String(jogador.aliados_revividos || 0),
 });
 }

 function editarEquipe(equipe: LbffEquipe) {
 preencherEquipeForm(equipe);
 setAba("equipes");
 setTimeout(
 () =>
 document
 .getElementById("form-equipe-lbff")
 ?.scrollIntoView({ behavior: "smooth", block: "start" }),
 30,
 );
 }

 function editarJogador(jogador: LbffJogador) {
 preencherJogadorForm(jogador);
 setAba("jogadores");
 setTimeout(
 () =>
 document
 .getElementById("form-jogador-lbff")
 ?.scrollIntoView({ behavior: "smooth", block: "start" }),
 30,
 );
 }

 function editarEquipeStats(equipe: LbffEquipe) {
 preencherEquipeForm(equipe);
 setAba("admin");
 setTimeout(
 () =>
 document
 .getElementById("admin-equipe-stats")
 ?.scrollIntoView({ behavior: "smooth", block: "start" }),
 30,
 );
 }

 function editarJogadorStats(jogador: LbffJogador) {
 preencherJogadorForm(jogador);
 setAba("admin");
 setTimeout(
 () =>
 document
 .getElementById("admin-jogador-stats")
 ?.scrollIntoView({ behavior: "smooth", block: "start" }),
 30,
 );
 }

 async function salvarEquipe() {
 if (!equipeForm.nome.trim()) {
 alert("Informe o nome da equipe.");
 return;
 }

 try {
 setSalvando(true);
 const payload = {
 nome: equipeForm.nome.trim(),
 tag: equipeForm.tag.trim() || null,
 grupo: equipeForm.grupo.trim() || null,
 logo_url: equipeForm.logo_url.trim() || null,
 cor: equipeForm.cor.trim() || "#ffcc00",
 pontos: campoNumero(equipeForm.pontos),
 booyah: campoNumero(equipeForm.booyah),
 abates: campoNumero(equipeForm.abates),
 quedas: campoNumero(equipeForm.quedas),
 updated_at: new Date().toISOString(),
 };

 const query = equipeForm.id
 ? supabase.from("lbff_equipes").update(payload).eq("id", equipeForm.id)
 : supabase.from("lbff_equipes").insert(payload);

 const { error } = await query;
 if (error) throw error;

 setEquipeForm(emptyEquipeForm);
 await carregarDados();
 alert("Equipe salva com sucesso.");
 } catch (error: any) {
 console.error("Erro ao salvar equipe LBFF:", error);
 alert(error?.message || "Erro ao salvar equipe.");
 } finally {
 setSalvando(false);
 }
 }

 async function salvarJogador() {
 if (!jogadorForm.jogador.trim()) {
 alert("Informe o nome do jogador.");
 return;
 }

 try {
 setSalvando(true);
 const payload = {
 jogador: jogadorForm.jogador.trim(),
 id_jogo: jogadorForm.id_jogo.trim() || null,
 equipe_id: jogadorForm.equipe_id || null,
 foto_url: jogadorForm.foto_url.trim() || null,
 funcao: jogadorForm.funcao.trim() || null,
 quedas: campoNumero(jogadorForm.quedas),
 abates: campoNumero(jogadorForm.abates),
 dano: campoNumero(jogadorForm.dano),
 assists: campoNumero(jogadorForm.assists),
 mvp: campoNumero(jogadorForm.mvp),
 capas: campoNumero(jogadorForm.capas),
 derrubados: campoNumero(jogadorForm.derrubados),
 gelos: campoNumero(jogadorForm.gelos),
 gelos_destruidos: campoNumero(jogadorForm.gelos_destruidos),
 reviveu: campoNumero(jogadorForm.reviveu),
 aliados_revividos: campoNumero(jogadorForm.aliados_revividos),
 updated_at: new Date().toISOString(),
 };

 const query = jogadorForm.id
 ? supabase
 .from("lbff_jogadores")
 .update(payload)
 .eq("id", jogadorForm.id)
 : supabase.from("lbff_jogadores").insert(payload);

 const { error } = await query;
 if (error) throw error;

 setJogadorForm(emptyJogadorForm);
 await carregarDados();
 alert("Jogador salvo com sucesso.");
 } catch (error: any) {
 console.error("Erro ao salvar jogador LBFF:", error);
 alert(error?.message || "Erro ao salvar jogador.");
 } finally {
 setSalvando(false);
 }
 }

 async function importarEquipesCsv(event: any) {
 const file = event.target.files?.[0];
 event.target.value = "";
 if (!file) return;

 try {
 setSalvando(true);
 const rows = await lerCsv(file);
 const existentes = new Map(
 equipes.map((equipe) => [normalizarTexto(equipe.nome), equipe]),
 );
 let criadas = 0;
 let atualizadas = 0;

 for (const row of rows) {
 const nome = pegar(row, ["Equipe", "Time", "Nome"]);
 if (!nome) continue;

 const existente = existentes.get(normalizarTexto(nome));
 const payload = {
 nome: nome.trim(),
 tag: pegar(row, ["Tag"]) || existente?.tag || nome.trim(),
 grupo: pegar(row, ["Grupo"]) || existente?.grupo || null,
 pontos: numeroCsv(row, ["Pontos", "Pts"]),
 booyah: numeroCsv(row, ["Booyah", "Booyahs"]),
 abates: numeroCsv(row, ["Abates", "Kills", "Kill"]),
 quedas: numeroCsv(row, ["Quedas", "Partidas"]),
 updated_at: new Date().toISOString(),
 };

 if (existente?.id) {
 const { error } = await supabase
 .from("lbff_equipes")
 .update(payload)
 .eq("id", existente.id);
 if (error) throw error;
 atualizadas += 1;
 } else {
 const { data, error } = await supabase
 .from("lbff_equipes")
 .insert({ ...payload, cor: "#ffcc00" })
 .select(
 "id, nome, tag, grupo, logo_url, cor, pontos, booyah, abates, quedas, created_at, updated_at",
 )
 .single();

 if (error) throw error;
 if (data)
 existentes.set(normalizarTexto(data.nome), data as LbffEquipe);
 criadas += 1;
 }
 }

 await carregarDados();
 alert(
 `Importação de equipes concluída. ${criadas} criada(s), ${atualizadas} atualizada(s).`,
 );
 } catch (error: any) {
 console.error("Erro ao importar CSV de equipes LBFF:", error);
 alert(error?.message || "Erro ao importar arquivo de equipes.");
 } finally {
 setSalvando(false);
 }
 }

 async function importarJogadoresCsv(event: any) {
 const file = event.target.files?.[0];
 event.target.value = "";
 if (!file) return;

 try {
 setSalvando(true);
 const rows = await lerCsv(file);
 const equipesAtuais = new Map(
 equipes.map((equipe) => [normalizarTexto(equipe.nome), equipe]),
 );

 for (const row of rows) {
 const nomeEquipe = pegar(row, ["Equipe", "Time"]);
 if (!nomeEquipe || equipesAtuais.has(normalizarTexto(nomeEquipe)))
 continue;

 const { data, error } = await supabase
 .from("lbff_equipes")
 .insert({
 nome: nomeEquipe.trim(),
 tag: nomeEquipe.trim(),
 cor: "#ffcc00",
 })
 .select(
 "id, nome, tag, grupo, logo_url, cor, pontos, booyah, abates, quedas, created_at, updated_at",
 )
 .single();

 if (error) throw error;
 if (data)
 equipesAtuais.set(normalizarTexto(data.nome), data as LbffEquipe);
 }

 const jogadoresAtuais = new Map(
 jogadores.map((jogador) => [
 `${normalizarTexto(jogador.jogador)}::${jogador.equipe_id || "sem-equipe"}`,
 jogador,
 ]),
 );

 let criados = 0;
 let atualizados = 0;

 for (const row of rows) {
 const nomeJogador = pegar(row, ["Jogador", "Player", "Nick"]);
 if (!nomeJogador) continue;

 const nomeEquipe = pegar(row, ["Equipe", "Time"]);
 const equipe = nomeEquipe
 ? equipesAtuais.get(normalizarTexto(nomeEquipe))
 : null;
 const chave = `${normalizarTexto(nomeJogador)}::${equipe?.id || "sem-equipe"}`;
 const existente = jogadoresAtuais.get(chave);

 const payload = {
 jogador: nomeJogador.trim(),
 id_jogo:
 pegar(row, ["ID de jogo", "Id de jogo", "ID Jogo", "UID"]) ||
 existente?.id_jogo ||
 null,
 equipe_id: equipe?.id || null,
 funcao:
 pegar(row, ["Função", "Funcao", "Role"]) ||
 existente?.funcao ||
 null,
 quedas: numeroCsv(row, ["Quedas", "Partidas"]),
 abates: numeroCsv(row, ["Abates", "Kills", "Kill"]),
 dano: numeroCsv(row, ["Dano", "Damage", "Dano causado"]),
 assists: numeroCsv(row, [
 "Assists",
 "Assist",
 "Assistências",
 "Assistencias",
 ]),
 mvp: numeroCsv(row, ["MVP", "Mvps"]),
 capas: numeroCsv(row, ["Capas", "Headshots", "HS"]),
 derrubados: numeroCsv(row, ["Derrubados", "Knocks"]),
 gelos: numeroCsv(row, ["Gelos", "Gloo", "Gloo Walls"]),
 gelos_destruidos: numeroCsv(row, [
 "Gelos Destruídos",
 "Gelos Destruidos",
 "Gloo destruídos",
 "Gloo Destruidos",
 ]),
 reviveu: numeroCsv(row, ["Reviveu", "Revives"]),
 aliados_revividos: numeroCsv(row, [
 "Aliados Revividos",
 "Aliados revividos",
 ]),
 updated_at: new Date().toISOString(),
 };

 if (existente?.id) {
 const { error } = await supabase
 .from("lbff_jogadores")
 .update(payload)
 .eq("id", existente.id);
 if (error) throw error;
 atualizados += 1;
 } else {
 const { error } = await supabase
 .from("lbff_jogadores")
 .insert(payload);
 if (error) throw error;
 criados += 1;
 }
 }

 await carregarDados();
 alert(
 `Importação de jogadores concluída. ${criados} criado(s), ${atualizados} atualizado(s).`,
 );
 } catch (error: any) {
 console.error("Erro ao importar CSV de jogadores LBFF:", error);
 alert(error?.message || "Erro ao importar arquivo de jogadores.");
 } finally {
 setSalvando(false);
 }
 }

 if (loading) {
 return (
 <div className="min-h-screen bg-white text-[#142340] flex items-center justify-center">
 <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffcc00]">
 <Loader2 className="animate-spin" size={18} /> Carregando estatísticas
 LBFF
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-[#142340]">
 <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">
 <section className="overflow-hidden border border-[#ffcc00]/30 bg-white -[0_0_55px_rgba(255,204,0,.12),0_0_70px_rgba(255,0,184,.08)]">
 <div className="relative overflow-hidden border-b border-[#ffcc00]/25 bg-[radial-gradient(circle_at_top_left,rgba(255,0,180,.34),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,204,0,.25),transparent_30%),linear-gradient(135deg,#09090d,#19110a_48%,#080810)] p-6 md:p-8">
 <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:24px_24px]" />
 <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
 <div className="absolute -bottom-16 left-1/4 h-40 w-[620px] -rotate-6 bg-[#ffcc00]/25 blur-2xl" />
 <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[#ffcc00]">
 // Estatísticas oficiais estilo LBFF
 </p>
 <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tighter md:text-7xl">
 LBFF <span className="text-[#ffcc00]">STATS</span> HUB
 </h1>
 <p className="mt-4 max-w-3xl text-[13px] font-semibold leading-6 text-zinc-600">
 Upload dos CSVs da Garena, ranking público, tabela de equipes
 e MVP dos jogadores com overall calculado pela razão contra o
 melhor atleta de cada categoria.
 </p>
 </div>

 <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:min-w-[560px]">
 <ResumoCard
 label="Equipes"
 value={equipes.length}
 icon={<Shield size={17} />}
 />
 <ResumoCard
 label="Jogadores"
 value={jogadores.length}
 icon={<Users size={17} />}
 />
 <ResumoCard
 label="Top Kill"
 value={lideres.topKill?.abates || 0}
 icon={<Skull size={17} />}
 />
 <ResumoCard
 label="Overall"
 value={lideres.topOverall?.overall || 0}
 icon={<Crown size={17} />}
 />
 </div>
 </div>
 </div>

 <div className="border-b border-zinc-200 bg-white p-4">
 <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
 <nav className="flex flex-wrap gap-2">
 <TabButton
 active={aba === "estatisticas"}
 onClick={() => setAba("estatisticas")}
 icon={<BarChart3 size={14} />}
 label="Estatísticas"
 />
 <TabButton
 active={aba === "equipes"}
 onClick={() => setAba("equipes")}
 icon={<Shield size={14} />}
 label="Equipes"
 />
 <TabButton
 active={aba === "jogadores"}
 onClick={() => setAba("jogadores")}
 icon={<UserRound size={14} />}
 label="Jogadores"
 />
 <TabButton
 active={aba === "pontuacao"}
 onClick={() => setAba("pontuacao")}
 icon={<Trophy size={14} />}
 label="Pontuação"
 />
 <TabButton
 active={aba === "admin"}
 onClick={() => setAba("admin")}
 icon={<Database size={14} />}
 label="Admin"
 />
 </nav>

 <div className="relative w-full xl:max-w-[390px]">
 <Search
 size={15}
 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
 />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="Buscar equipe, jogador, ID ou grupo..."
 className="h-12 w-full border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[#142340] outline-none placeholder:text-slate-600 focus:border-[#ffcc00]"
 />
 </div>
 </div>
 </div>

 <div className="p-5 md:p-8">
 {aba === "estatisticas" ? (
 <div className="space-y-8">
 <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
 <DestaqueCard
 title="Líder geral"
 main={lideres.topEquipe?.nome || "Sem dados"}
 sub={`${lideres.topEquipe?.pontos || 0} pontos`}
 icon={<Trophy size={22} />}
 />
 <DestaqueCard
 title="Top abates"
 main={lideres.topKill?.jogador || "Sem dados"}
 sub={`${lideres.topKill?.abates || 0} abates`}
 icon={<Skull size={22} />}
 />
 <DestaqueCard
 title="Top overall"
 main={lideres.topOverall?.jogador || "Sem dados"}
 sub={`${lideres.topOverall?.overall || 0} overall`}
 icon={<Crown size={22} />}
 />
 <DestaqueCard
 title="Top MVP"
 main={lideres.topMvp?.jogador || "Sem dados"}
 sub={`${lideres.topMvp?.mvp || 0} MVP`}
 icon={<Gamepad2 size={22} />}
 />
 </div>

 <div className="border-b border-[#ffcc00]/35">
 <div className="flex flex-wrap gap-0">
 <SubTabButton
 active={estatSubAba === "equipes"}
 onClick={() => setEstatSubAba("equipes")}
 label="Tabela de equipes"
 />
 <SubTabButton
 active={estatSubAba === "mvp"}
 onClick={() => setEstatSubAba("mvp")}
 label="MVP dos jogadores"
 />
 </div>
 </div>

 {estatSubAba === "equipes" ? (
 <div>
 <SectionTitle label="Tabela de equipes" />
 <div className="mt-5">
 <PontuacaoEquipes equipes={equipesFiltradas} />
 </div>
 </div>
 ) : null}

 {estatSubAba === "mvp" ? (
 <div>
 <SectionTitle label="Tabela MVP dos jogadores" />
 <div className="mt-5">
 <PontuacaoJogadores jogadores={jogadoresFiltrados} />
 </div>
 </div>
 ) : null}
 </div>
 ) : null}

 {aba === "equipes" ? (
 <div className="space-y-8">
 <EquipeCadastroForm
 form={equipeForm}
 setForm={setEquipeForm}
 salvando={salvando}
 onSave={salvarEquipe}
 onNew={() => setEquipeForm(emptyEquipeForm)}
 onPickLogo={(file) =>
 abrirCropImagem(file, {
 tipo: "equipe",
 width: 500,
 height: 500,
 })
 }
 />
 <div>
 <SectionTitle label="Equipes cadastradas" />
 <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
 {equipesFiltradas.map((equipe, index) => (
 <EquipeBandeira
 key={equipe.id}
 equipe={equipe}
 pos={index + 1}
 active={false}
 onClick={() => setEquipeSelecionadaId(equipe.id)}
 onEdit={() => editarEquipe(equipe)}
 />
 ))}
 </div>
 </div>
 </div>
 ) : null}

 {aba === "jogadores" ? (
 <div className="space-y-8">
 <JogadorCadastroForm
 form={jogadorForm}
 setForm={setJogadorForm}
 equipes={equipes}
 salvando={salvando}
 onSave={salvarJogador}
 onNew={() => setJogadorForm(emptyJogadorForm)}
 onPickFoto={(file) =>
 abrirCropImagem(file, {
 tipo: "jogador",
 width: 500,
 height: 600,
 })
 }
 />
 <div>
 <SectionTitle label="Jogadores cadastrados" />
 <div className="mt-5">
 <ListaJogadoresCadastro
 jogadores={jogadoresFiltrados}
 onEdit={editarJogador}
 />
 </div>
 </div>
 </div>
 ) : null}

 {aba === "pontuacao" ? (
 <div className="space-y-8">
 <div>
 <SectionTitle label="Pontuação das equipes" />
 <PontuacaoEquipes equipes={equipesFiltradas} />
 </div>
 <div>
 <SectionTitle label="Pontuação dos jogadores" />
 <PontuacaoJogadores jogadores={jogadoresFiltrados} />
 </div>
 </div>
 ) : null}

 {aba === "admin" ? (
 <div className="space-y-8">
 <div className="border border-[#ffcc00]/40 bg-[#ffcc00]/5 p-5">
 <SectionTitle label="Administração de estatísticas" />
 <p className="mt-3 text-[12px] font-semibold leading-6 text-zinc-500">
 Upload dos arquivos da Garena e atualização manual somente
 dos números. Cadastro, foto, ID e função ficam nas abas
 Equipes e Jogadores.
 </p>
 </div>

 <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
 <UploadCsvCard
 title="Upload de equipes"
 description="CSV da Garena de Classificação Geral. Atualiza equipe, grupo, pontos, booyah, abates e quedas sem apagar logos."
 accept=".csv,text/csv"
 disabled={salvando}
 onChange={importarEquipesCsv}
 />
 <UploadCsvCard
 title="Upload de jogadores"
 description="CSV da Garena de Classificação Players. Cria/atualiza jogadores, mantém foto/ID/função quando o arquivo não trouxer esses dados e recalcula overall."
 accept=".csv,text/csv"
 disabled={salvando}
 onChange={importarJogadoresCsv}
 />
 </div>

 <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
 <AdminEquipeStatsForm
 form={equipeForm}
 setForm={setEquipeForm}
 equipes={equipes}
 salvando={salvando}
 onSave={salvarEquipe}
 onSelect={preencherEquipeForm}
 />
 <AdminJogadorStatsForm
 form={jogadorForm}
 setForm={setJogadorForm}
 jogadores={jogadores}
 salvando={salvando}
 onSave={salvarJogador}
 onSelect={preencherJogadorForm}
 />
 </div>
 </div>
 ) : null}
 </div>
 </section>

 {cropState ? (
 <CropModal
 state={cropState}
 loading={cropLoading}
 onChange={setCropState}
 onClose={fecharCrop}
 onApply={aplicarCropImagem}
 />
 ) : null}
 </div>
 </div>
 );
}

function TabButton({
 active,
 onClick,
 icon,
 label,
}: {
 active: boolean;
 onClick: () => void;
 icon: ReactNode;
 label: string;
}) {
 return (
 <button
 onClick={onClick}
 className={`inline-flex h-11 items-center gap-2 border px-4 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
 active
 ? "border-[#ffcc00] bg-[#ffcc00] text-[#142340]"
 : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-[#ffcc00]/60 hover:text-[#142340]"
 }`}
 >
 {icon}
 {label}
 </button>
 );
}

function SubTabButton({
 active,
 onClick,
 label,
}: {
 active: boolean;
 onClick: () => void;
 label: string;
}) {
 return (
 <button
 onClick={onClick}
 className={`h-12 border border-b-0 px-6 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
 active
 ? "border-[#ffcc00] bg-[#ffcc00] text-[#142340] -[0_-12px_28px_rgba(255,204,0,.15)_inset]"
 : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-[#ffcc00]/60 hover:text-[#142340]"
 }`}
 >
 {label}
 </button>
 );
}

function ResumoCard({
 label,
 value,
 icon,
}: {
 label: string;
 value: number;
 icon: ReactNode;
}) {
 return (
 <div className="border border-zinc-200 bg-white/35 p-4">
 <div className="text-[#ffcc00]">{icon}</div>
 <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 {label}
 </p>
 <p className="mt-1 text-3xl font-semibold text-[#142340]">{value}</p>
 </div>
 );
}

function DestaqueCard({
 title,
 main,
 sub,
 icon,
}: {
 title: string;
 main: string;
 sub: string;
 icon: ReactNode;
}) {
 return (
 <div className="relative overflow-hidden border border-[#ffcc00]/20 bg-white p-5 -[0_0_24px_rgba(255,204,0,.06)]">
 <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-fuchsia-500/10 blur-2xl" />
 <div className="relative text-[#ffcc00]">{icon}</div>
 <p className="relative mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 {title}
 </p>
 <p className="relative mt-2 truncate text-2xl font-semibold uppercase text-[#142340]">
 {main}
 </p>
 <p className="relative mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#ffcc00]">
 {sub}
 </p>
 </div>
 );
}

function SectionTitle({ label }: { label: string }) {
 return (
 <h2 className="text-[12px] font-semibold uppercase tracking-[0.3em] text-[#ffcc00]">
 // {label}
 </h2>
 );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
 return (
 <div>
 <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 {label}
 </p>
 <p className="text-lg font-semibold text-[#142340]">{value}</p>
 </div>
 );
}

function EquipeBandeira({
 equipe,
 pos,
 active,
 onClick,
 onEdit,
}: {
 equipe: LbffEquipe;
 pos: number;
 active: boolean;
 onClick: () => void;
 onEdit: () => void;
}) {
 const cor = corEquipe(equipe.cor);
 const rank = rankBroadcast(pos - 1);

 return (
 <div
 className={`group relative overflow-hidden border transition duration-300 ${active ? "border-[#ffcc00]" : "border-zinc-200 hover:border-[#ffcc00]/70"}`}
 style={{
 boxShadow: active
 ? `0 0 0 1px ${cor}, 0 0 34px ${corComAlpha(cor, 0.28)}`
 : `0 0 0 1px rgba(255,255,255,.02), 0 0 24px ${corComAlpha(cor, 0.10)}`,
 }}
 >
 <div
 className="pointer-events-none absolute inset-0 opacity-70"
 style={{
 background: `linear-gradient(90deg,${corComAlpha(cor, 0.18)},transparent 42%,${corComAlpha(cor, 0.24)}), radial-gradient(circle at 92% 50%,${rank.glow},transparent 36%)`,
 }}
 />
 <div className="pointer-events-none absolute left-0 top-0 h-full w-[3px]" style={{ background: rank.cor }} />

 <button
 onClick={onClick}
 className="relative flex w-full items-center gap-4 bg-white/90 p-4 text-left "
 >
 <div
 className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border-2"
 style={{
 backgroundColor: cor,
 borderColor: cor,
 }}
 >
 {equipe.logo_url ? (
 <img
 src={equipe.logo_url}
 alt={equipe.nome}
 className="h-full w-full object-contain p-1.5 bg-transparent"
 />
 ) : (
 <span className="text-lg font-semibold text-[#142340]">
 {initials(equipe.tag || equipe.nome)}
 </span>
 )}
 </div>

 <div className="relative min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <span className="text-[11px] font-semibold text-[#ffcc00]">#{pos}</span>
 <p className="truncate text-xl font-semibold uppercase text-[#142340] drop--[0_2px_0_rgba(0,0,0,.75)]">
 {equipe.tag || equipe.nome}
 </p>
 {pos <= 3 ? (
 <span
 className="hidden border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] md:inline-flex"
 style={{ borderColor: rank.cor, color: rank.cor }}
 >
 {rank.nome}
 </span>
 ) : null}
 </div>
 <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
 {equipe.nome} {equipe.grupo ? `• Grupo ${equipe.grupo}` : ""}
 </p>
 </div>

 <div className="relative grid grid-cols-3 gap-3 text-center">
 <MiniStat label="PTS" value={equipe.pontos} />
 <MiniStat label="BOOYAH" value={equipe.booyah} />
 <MiniStat label="KILLS" value={equipe.abates} />
 </div>
 </button>

 <div className="relative border-t border-zinc-200 bg-white/25 p-2 text-right ">
 <button
 onClick={onEdit}
 className="inline-flex h-8 items-center gap-2 border border-zinc-200 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600 hover:border-[#ffcc00] hover:text-[#142340]"
 >
 <Edit3 size={11} /> Editar perfil
 </button>
 </div>
 </div>
 );
}

function JogadorCard({
 jogador,
 onEdit,
 editable = false,
}: {
 jogador: LbffJogador;
 onEdit?: () => void;
 editable?: boolean;
}) {
 const corEquipe = jogador.equipe_cor || "#ffcc00";
 const overallClass = classeOverall(jogador.overall);
 const funcao = jogador.funcao || "ATLETA";

 return (
 <div className="relative mx-auto w-full max-w-[246px]">
 <div className="absolute -inset-1 bg-[radial-gradient(circle_at_30%_0%,rgba(255,204,0,.35),transparent_38%),radial-gradient(circle_at_80%_100%,rgba(255,0,184,.25),transparent_35%)] blur-xl" />
 <div
 className="relative aspect-[5/7] overflow-hidden p-[2px] -[0_0_34px_rgba(255,204,0,.16)]"
 style={{
 clipPath:
 "polygon(11% 0, 89% 0, 100% 10%, 100% 89%, 90% 100%, 10% 100%, 0 89%, 0 10%)",
 }}
 >
 <div className="absolute inset-0 bg-[linear-gradient(140deg,#ffcc00_0%,#d69b00_18%,#33270a_37%,#ff00b8_100%)]" />
 <div
 className="absolute inset-[2px] overflow-hidden bg-white"
 style={{
 clipPath:
 "polygon(11% 0, 89% 0, 100% 10%, 100% 89%, 90% 100%, 10% 100%, 0 89%, 0 10%)",
 }}
 >
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(255,204,0,.38),transparent_24%),radial-gradient(circle_at_90%_76%,rgba(255,0,184,.30),transparent_30%),linear-gradient(165deg,#1a1304_0%,#080c13_48%,#130614_100%)]" />
 <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.85)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.85)_1px,transparent_1px)] [background-size:18px_18px]" />
 <div className="absolute left-5 top-[88px] h-[90px] w-[170px] border border-[#ffcc00]/25 bg-white/25" />
 <div className="absolute -bottom-7 left-0 right-0 h-28 bg-[linear-gradient(0deg,rgba(0,0,0,.92),rgba(0,0,0,.2),transparent)]" />

 <div className="relative z-10 flex h-full flex-col px-4 pb-4 pt-5">
 <div className="flex items-start justify-between gap-3">
 <div>
 <p
 className={`text-[48px] font-semibold leading-[0.8] tracking-[-0.08em] ${overallClass}`}
 >
 {jogador.overall}
 </p>
 <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 OVR
 </p>
 <p className="mt-1 max-w-[86px] truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ffcc00]">
 {funcao}
 </p>
 </div>

 <div className="flex flex-col items-end gap-2">
 <div className="flex h-12 w-12 items-center justify-center overflow-hidden border" style={{ backgroundColor: corEquipe(jogador.equipe_cor), borderColor: corEquipe(jogador.equipe_cor) }}>
 {jogador.equipe_logo ? (
 <img
 src={jogador.equipe_logo}
 alt={
 jogador.equipe_tag || jogador.equipe_nome || "Equipe"
 }
 className="h-full w-full object-contain p-1 bg-transparent"
 />
 ) : (
 <span className="text-sm font-semibold text-[#ffcc00]">
 {initials(jogador.equipe_tag || jogador.equipe_nome)}
 </span>
 )}
 </div>
 <div className="flex h-6 w-9 items-center justify-center border border-[#ffcc00]/35 bg-[#118132] text-[8px] font-semibold tracking-[0.12em] text-yellow-200">
 BR
 </div>
 </div>
 </div>

 <div className="relative mx-auto mt-1 flex h-[152px] w-[154px] items-end justify-center overflow-hidden">
 <div className="absolute bottom-0 h-[92px] w-full border border-[#ffcc00]/20" style={{ backgroundColor: corEquipe(jogador.equipe_cor) }} />
 {jogador.foto_url ? (
 <img
 src={jogador.foto_url}
 alt={jogador.jogador}
 className="relative z-10 h-full w-full object-cover object-top"
 />
 ) : (
 <UserRound
 size={62}
 className="relative z-10 mb-11 text-slate-600"
 />
 )}
 </div>

 <div className="mt-1 text-center">
 <p className="truncate text-[22px] font-semibold uppercase leading-none text-[#142340] drop--[0_2px_0_rgba(0,0,0,.9)]">
 {jogador.jogador}
 </p>
 <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffcc00]">
 {jogador.equipe_tag || jogador.equipe_nome || "Sem equipe"}
 </p>
 {jogador.id_jogo ? (
 <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-500">
 ID {jogador.id_jogo}
 </p>
 ) : null}
 </div>

 <div className="mt-auto border-t border-[#ffcc00]/25 pt-3">
 <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-semibold uppercase">
 <CardAttribute value={jogador.abates} label="ABATES" />
 <CardAttribute value={jogador.dano} label="DANO" />
 <CardAttribute value={jogador.assists} label="ASSISTS" />
 <CardAttribute value={jogador.quedas} label="QUEDAS" />
 <CardAttribute value={jogador.mvp} label="MVP" />
 <CardAttribute value={jogador.capas} label="CAPAS" />
 </div>
 </div>
 </div>
 </div>
 </div>

 {editable && onEdit ? (
 <button
 onClick={onEdit}
 className="absolute right-3 top-3 z-20 border border-zinc-200 bg-white/60 p-2 text-zinc-600 hover:border-[#ffcc00] hover:text-[#142340]"
 >
 <Edit3 size={13} />
 </button>
 ) : null}
 </div>
 );
}

function CardAttribute({
 value,
 label,
}: {
 value: number | string;
 label: string;
}) {
 return (
 <div className="flex items-baseline justify-between gap-2 border-b border-zinc-200 py-0.5">
 <span className="text-base font-semibold text-[#142340]">{value}</span>
 <span className="text-[8px] font-semibold tracking-[0.16em] text-zinc-500">
 {label}
 </span>
 </div>
 );
}

function Atributo({ label, value }: { label: string; value: number }) {
 return (
 <div className="border border-zinc-200 bg-white/25 px-2 py-1">
 <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 {label}
 </p>
 <p className="text-sm font-semibold text-[#ffcc00]">{value}</p>
 </div>
 );
}

function EquipeCadastroForm({
 form,
 setForm,
 salvando,
 onSave,
 onNew,
 onPickLogo,
}: {
 form: EquipeForm;
 setForm: (form: EquipeForm) => void;
 salvando: boolean;
 onSave: () => void;
 onNew: () => void;
 onPickLogo: (file: File | null) => void;
}) {
 return (
 <div
 id="form-equipe-lbff"
 className="border border-zinc-200 bg-white p-5"
 >
 <div className="flex items-center justify-between gap-4">
 <SectionTitle
 label={form.id ? "Editar perfil da equipe" : "Cadastrar equipe"}
 />
 <Shield className="text-[#ffcc00]" size={18} />
 </div>
 <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
 <Field
 label="Equipe"
 value={form.nome}
 onChange={(v) => setForm({ ...form, nome: v })}
 />
 <Field
 label="Tag"
 value={form.tag}
 onChange={(v) => setForm({ ...form, tag: v })}
 />
 <Field
 label="Grupo"
 value={form.grupo}
 onChange={(v) => setForm({ ...form, grupo: v })}
 />
 <Field
 label="Cor"
 value={form.cor}
 onChange={(v) => setForm({ ...form, cor: v })}
 />
 <ImageUploadField
 label="Logo da equipe"
 hint="Upload com corte 500x500"
 value={form.logo_url}
 onPick={onPickLogo}
 onClear={() => setForm({ ...form, logo_url: "" })}
 className="md:col-span-2"
 />
 </div>
 <div className="mt-5 flex flex-wrap gap-3">
 <ActionButton
 onClick={onSave}
 disabled={salvando}
 icon={
 salvando ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Save size={14} />
 )
 }
 label={form.id ? "Salvar edição" : "Salvar cadastro"}
 />
 <GhostButton
 onClick={onNew}
 icon={<Plus size={14} />}
 label="Nova equipe"
 />
 </div>
 </div>
 );
}

function JogadorCadastroForm({
 form,
 setForm,
 equipes,
 salvando,
 onSave,
 onNew,
 onPickFoto,
}: {
 form: JogadorForm;
 setForm: (form: JogadorForm) => void;
 equipes: LbffEquipe[];
 salvando: boolean;
 onSave: () => void;
 onNew: () => void;
 onPickFoto: (file: File | null) => void;
}) {
 return (
 <div
 id="form-jogador-lbff"
 className="border border-zinc-200 bg-white p-5"
 >
 <div className="flex items-center justify-between gap-4">
 <SectionTitle
 label={form.id ? "Editar perfil do jogador" : "Cadastrar jogador"}
 />
 <Gamepad2 className="text-[#ffcc00]" size={18} />
 </div>
 <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
 <Field
 label="Jogador"
 value={form.jogador}
 onChange={(v) => setForm({ ...form, jogador: v })}
 />
 <Field
 label="ID de jogo"
 value={form.id_jogo}
 onChange={(v) => setForm({ ...form, id_jogo: v })}
 />
 <SelectField
 label="Equipe"
 value={form.equipe_id}
 onChange={(v) => setForm({ ...form, equipe_id: v })}
 options={equipes.map((e) => ({ value: e.id, label: e.nome }))}
 empty="Sem equipe"
 />
 <Field
 label="Função"
 value={form.funcao}
 onChange={(v) => setForm({ ...form, funcao: v })}
 />
 <ImageUploadField
 label="Foto do jogador"
 hint="Upload com corte 500x600"
 value={form.foto_url}
 onPick={onPickFoto}
 onClear={() => setForm({ ...form, foto_url: "" })}
 className="md:col-span-2"
 />
 </div>
 <div className="mt-5 flex flex-wrap gap-3">
 <ActionButton
 onClick={onSave}
 disabled={salvando}
 icon={
 salvando ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Save size={14} />
 )
 }
 label={form.id ? "Salvar edição" : "Salvar cadastro"}
 />
 <GhostButton
 onClick={onNew}
 icon={<Plus size={14} />}
 label="Novo jogador"
 />
 </div>
 </div>
 );
}

function AdminEquipeStatsForm({
 form,
 setForm,
 equipes,
 salvando,
 onSave,
 onSelect,
}: {
 form: EquipeForm;
 setForm: (form: EquipeForm) => void;
 equipes: LbffEquipe[];
 salvando: boolean;
 onSave: () => void;
 onSelect: (equipe: LbffEquipe) => void;
}) {
 return (
 <div
 id="admin-equipe-stats"
 className="border border-zinc-200 bg-white p-5"
 >
 <SectionTitle label="Estatísticas da equipe" />
 <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
 <SelectField
 label="Selecionar equipe"
 value={form.id || ""}
 onChange={(id) => {
 const e = equipes.find((item) => item.id === id);
 if (e) onSelect(e);
 }}
 options={equipes.map((e) => ({ value: e.id, label: e.nome }))}
 empty="Escolha uma equipe"
 className="md:col-span-2"
 />
 <Field
 label="Pontos"
 value={form.pontos}
 onChange={(v) => setForm({ ...form, pontos: v })}
 />
 <Field
 label="Booyah"
 value={form.booyah}
 onChange={(v) => setForm({ ...form, booyah: v })}
 />
 <Field
 label="Abates"
 value={form.abates}
 onChange={(v) => setForm({ ...form, abates: v })}
 />
 <Field
 label="Quedas"
 value={form.quedas}
 onChange={(v) => setForm({ ...form, quedas: v })}
 />
 </div>
 <div className="mt-5">
 <ActionButton
 onClick={onSave}
 disabled={salvando || !form.id}
 icon={<Save size={14} />}
 label="Salvar estatísticas"
 />
 </div>
 </div>
 );
}

function AdminJogadorStatsForm({
 form,
 setForm,
 jogadores,
 salvando,
 onSave,
 onSelect,
}: {
 form: JogadorForm;
 setForm: (form: JogadorForm) => void;
 jogadores: LbffJogador[];
 salvando: boolean;
 onSave: () => void;
 onSelect: (jogador: LbffJogador) => void;
}) {
 return (
 <div
 id="admin-jogador-stats"
 className="border border-zinc-200 bg-white p-5"
 >
 <SectionTitle label="Estatísticas do jogador" />
 <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
 <SelectField
 label="Selecionar jogador"
 value={form.id || ""}
 onChange={(id) => {
 const j = jogadores.find((item) => item.id === id);
 if (j) onSelect(j);
 }}
 options={jogadores.map((j) => ({
 value: j.id,
 label: `${j.jogador} ${j.equipe_tag ? `- ${j.equipe_tag}` : ""}`,
 }))}
 empty="Escolha um jogador"
 className="md:col-span-2"
 />
 <Field
 label="Quedas"
 value={form.quedas}
 onChange={(v) => setForm({ ...form, quedas: v })}
 />
 <Field
 label="Abates"
 value={form.abates}
 onChange={(v) => setForm({ ...form, abates: v })}
 />
 <Field
 label="Dano"
 value={form.dano}
 onChange={(v) => setForm({ ...form, dano: v })}
 />
 <Field
 label="Assistências"
 value={form.assists}
 onChange={(v) => setForm({ ...form, assists: v })}
 />
 <Field
 label="MVP"
 value={form.mvp}
 onChange={(v) => setForm({ ...form, mvp: v })}
 />
 <Field
 label="Capas"
 value={form.capas}
 onChange={(v) => setForm({ ...form, capas: v })}
 />
 <Field
 label="Derrubados"
 value={form.derrubados}
 onChange={(v) => setForm({ ...form, derrubados: v })}
 />
 <Field
 label="Gelos"
 value={form.gelos}
 onChange={(v) => setForm({ ...form, gelos: v })}
 />
 <Field
 label="Gelos destruídos"
 value={form.gelos_destruidos}
 onChange={(v) => setForm({ ...form, gelos_destruidos: v })}
 />
 <Field
 label="Reviveu"
 value={form.reviveu}
 onChange={(v) => setForm({ ...form, reviveu: v })}
 />
 <Field
 label="Aliados revividos"
 value={form.aliados_revividos}
 onChange={(v) => setForm({ ...form, aliados_revividos: v })}
 />
 </div>
 <div className="mt-5">
 <ActionButton
 onClick={onSave}
 disabled={salvando || !form.id}
 icon={<Save size={14} />}
 label="Salvar estatísticas"
 />
 </div>
 </div>
 );
}

function PontuacaoEquipes({ equipes }: { equipes: LbffEquipe[] }) {
 return (
 <div className="overflow-x-auto border border-[#ffcc00]/20 bg-white -[0_0_34px_rgba(255,204,0,.06)]">
 <table className="w-full min-w-[820px] text-left">
 <thead className="bg-[linear-gradient(90deg,rgba(255,204,0,.12),rgba(255,255,255,.04))] text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
 <tr>
 <th className="px-4 py-3">#</th>
 <th className="px-4 py-3">Equipe</th>
 <th className="px-4 py-3">Grupo</th>
 <th className="px-4 py-3 text-center">Pontos</th>
 <th className="px-4 py-3 text-center">Booyah</th>
 <th className="px-4 py-3 text-center">Abates</th>
 <th className="px-4 py-3 text-center">Quedas</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/10">
 {equipes.map((equipe, index) => {
 const cor = corEquipe(equipe.cor);
 const rank = rankBroadcast(index);
 return (
 <tr
 key={equipe.id}
 className="text-[12px] font-bold text-[#142340] transition hover:brightness-125"
 style={{
 background: `linear-gradient(90deg,${corComAlpha(cor, index < 3 ? 0.20 : 0.10)},rgba(9,15,24,.94) 35%,${corComAlpha(cor, index < 3 ? 0.12 : 0.06)})`,
 boxShadow: index < 3 ? `inset 3px 0 0 ${rank.cor}` : undefined,
 }}
 >
 <td className="px-4 py-4 font-semibold" style={{ color: rank.cor }}>{index + 1}</td>
 <td className="px-4 py-4">
 <div className="flex items-center gap-3">
 <div
 className="flex h-10 w-10 items-center justify-center overflow-hidden border"
 style={{
 backgroundColor: cor,
 borderColor: cor,
 }}
 >
 {equipe.logo_url ? (
 <img src={equipe.logo_url} alt={equipe.nome} className="h-full w-full object-contain p-1 bg-transparent" />
 ) : (
 <span className="text-[11px] font-semibold text-[#142340]">{initials(equipe.tag || equipe.nome)}</span>
 )}
 </div>
 <div>
 <p className="font-semibold uppercase text-[#142340]">{equipe.nome}</p>
 <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">{equipe.tag || "Sem tag"}</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-4 uppercase">{equipe.grupo || "N/I"}</td>
 <td className="px-4 py-4 text-center font-semibold text-[#ffcc00]">{equipe.pontos}</td>
 <td className="px-4 py-4 text-center">{equipe.booyah}</td>
 <td className="px-4 py-4 text-center">{equipe.abates}</td>
 <td className="px-4 py-4 text-center">{equipe.quedas}</td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 );
}

function ListaJogadoresCadastro({
 jogadores,
 onEdit,
}: {
 jogadores: LbffJogador[];
 onEdit: (jogador: LbffJogador) => void;
}) {
 const ordenados = [...jogadores].sort(
 (a, b) =>
 String(a.jogador || "").localeCompare(String(b.jogador || ""), "pt-BR") ||
 String(a.equipe_tag || a.equipe_nome || "").localeCompare(
 String(b.equipe_tag || b.equipe_nome || ""),
 "pt-BR",
 ),
 );

 return (
 <div className="overflow-x-auto border border-[#ffcc00]/20 bg-white -[0_0_34px_rgba(255,204,0,.06)]">
 <table className="w-full min-w-[920px] text-left">
 <thead className="bg-[linear-gradient(90deg,rgba(255,204,0,.12),rgba(255,255,255,.04))] text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
 <tr>
 <th className="px-4 py-3">#</th>
 <th className="px-4 py-3">Jogador</th>
 <th className="px-4 py-3">ID de jogo</th>
 <th className="px-4 py-3">Equipe</th>
 <th className="px-4 py-3">Função</th>
 <th className="px-4 py-3 text-right">Editar</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/10">
 {ordenados.map((jogador, index) => (
 <tr
 key={jogador.id}
 className="bg-white text-[12px] font-bold text-[#142340]"
 >
 <td className="px-4 py-4 text-[#ffcc00]">{index + 1}</td>
 <td className="px-4 py-4">
 <div className="flex items-center gap-3">
 <div
 className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border -[inset_0_0_18px_rgba(0,0,0,.32)]"
 style={{
 background: `radial-gradient(circle at 35% 25%,${corComAlpha(jogador.equipe_cor, 0.46)},${corComAlpha(jogador.equipe_cor, 0.18)} 55%,rgba(0,0,0,.12))`,
 borderColor: corEquipe(jogador.equipe_cor),
 }}
 >
 {jogador.foto_url ? (
 <img
 src={jogador.foto_url}
 alt={jogador.jogador}
 className="h-full w-full object-cover object-top"
 />
 ) : (
 <UserRound size={21} className="text-slate-600" />
 )}
 </div>
 <div className="min-w-0">
 <p className="truncate font-semibold uppercase text-[#142340]">
 {jogador.jogador}
 </p>
 <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">
 Cadastro de atleta LBFF
 </p>
 </div>
 </div>
 </td>
 <td className="px-4 py-4 uppercase text-zinc-600">
 {jogador.id_jogo || "N/I"}
 </td>
 <td className="px-4 py-4 uppercase">
 <div className="flex items-center gap-2">
 <div
 className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border"
 style={{
 backgroundColor: corEquipe(jogador.equipe_cor),
 borderColor: corEquipe(jogador.equipe_cor),
 }}
 >
 {jogador.equipe_logo ? (
 <img
 src={jogador.equipe_logo}
 alt={
 jogador.equipe_tag || jogador.equipe_nome || "Equipe"
 }
 className="h-full w-full object-contain p-1 bg-transparent"
 />
 ) : (
 <span className="text-[10px] font-semibold text-[#142340]">
 {initials(jogador.equipe_tag || jogador.equipe_nome)}
 </span>
 )}
 </div>
 <span>
 {jogador.equipe_tag || jogador.equipe_nome || "Sem equipe"}
 </span>
 </div>
 </td>
 <td className="px-4 py-4 uppercase text-zinc-600">
 {jogador.funcao || "N/I"}
 </td>
 <td className="px-4 py-4 text-right">
 <EditButton onClick={() => onEdit(jogador)} />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}

function PontuacaoJogadores({ jogadores }: { jogadores: LbffJogador[] }) {
 const ordenados = [...jogadores].sort(
 (a, b) =>
 b.overall - a.overall ||
 b.mvp - a.mvp ||
 b.abates - a.abates ||
 b.dano - a.dano,
 );

 return (
 <div className="overflow-x-auto border border-[#ffcc00]/20 bg-white -[0_0_34px_rgba(255,204,0,.06)]">
 <table className="w-full min-w-[980px] text-left">
 <thead className="bg-[linear-gradient(90deg,rgba(255,204,0,.12),rgba(255,255,255,.04))] text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
 <tr>
 <th className="px-4 py-3">#</th>
 <th className="px-4 py-3">Jogador</th>
 <th className="px-4 py-3">Equipe</th>
 <th className="px-4 py-3 text-center">OVR</th>
 <th className="px-4 py-3 text-center">MVP</th>
 <th className="px-4 py-3 text-center">Quedas</th>
 <th className="px-4 py-3 text-center">Abates</th>
 <th className="px-4 py-3 text-center">Dano</th>
 <th className="px-4 py-3 text-center">Assist.</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/10">
 {ordenados.map((jogador, index) => (
 <tr
 key={jogador.id}
 className="bg-white text-[12px] font-bold text-[#142340]"
 >
 <td className="px-4 py-4 text-[#ffcc00]">{index + 1}</td>
 <td className="px-4 py-4">
 <div className="flex items-center gap-3">
 <div
 className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border -[inset_0_0_18px_rgba(0,0,0,.32)]"
 style={{
 background: `radial-gradient(circle at 35% 25%,${corComAlpha(jogador.equipe_cor, 0.46)},${corComAlpha(jogador.equipe_cor, 0.18)} 55%,rgba(0,0,0,.12))`,
 borderColor: corEquipe(jogador.equipe_cor),
 }}
 >
 {jogador.foto_url ? (
 <img
 src={jogador.foto_url}
 alt={jogador.jogador}
 className="h-full w-full object-cover object-top"
 />
 ) : (
 <UserRound size={20} className="text-slate-600" />
 )}
 </div>
 <div className="min-w-0">
 <p className="truncate font-semibold uppercase text-[#142340]">
 {jogador.jogador}
 </p>
 <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">
 {jogador.funcao || "Função N/I"}
 {jogador.id_jogo ? ` • ID ${jogador.id_jogo}` : ""}
 </p>
 </div>
 </div>
 </td>
 <td className="px-4 py-4 uppercase">
 <div className="flex items-center gap-2">
 <div
 className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border"
 style={{
 backgroundColor: corEquipe(jogador.equipe_cor),
 borderColor: corEquipe(jogador.equipe_cor),
 }}
 >
 {jogador.equipe_logo ? (
 <img
 src={jogador.equipe_logo}
 alt={
 jogador.equipe_tag || jogador.equipe_nome || "Equipe"
 }
 className="h-full w-full object-contain p-1 bg-transparent"
 />
 ) : (
 <span className="text-[10px] font-semibold text-[#142340]">
 {initials(jogador.equipe_tag || jogador.equipe_nome)}
 </span>
 )}
 </div>
 <span>
 {jogador.equipe_tag || jogador.equipe_nome || "Sem equipe"}
 </span>
 </div>
 </td>
 <td className="px-4 py-4 text-center text-[#ffcc00]">
 {jogador.overall}
 </td>
 <td className="px-4 py-4 text-center text-[#ffcc00]">
 {jogador.mvp}
 </td>
 <td className="px-4 py-4 text-center">{jogador.quedas}</td>
 <td className="px-4 py-4 text-center">{jogador.abates}</td>
 <td className="px-4 py-4 text-center">{jogador.dano}</td>
 <td className="px-4 py-4 text-center">{jogador.assists}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}

function ImageUploadField({
 label,
 hint,
 value,
 onPick,
 onClear,
 className = "",
}: {
 label: string;
 hint: string;
 value: string;
 onPick: (file: File | null) => void;
 onClear: () => void;
 className?: string;
}) {
 return (
 <div className={`block ${className}`}>
 <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 {label}
 </span>
 <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
 <div className="flex h-[132px] items-center justify-center overflow-hidden border border-[#ffcc00]/35 bg-[linear-gradient(45deg,rgba(255,255,255,.08)_25%,transparent_25%,transparent_75%,rgba(255,255,255,.08)_75%),linear-gradient(45deg,rgba(255,255,255,.08)_25%,transparent_25%,transparent_75%,rgba(255,255,255,.08)_75%)] bg-[length:18px_18px] [background-position:0_0,9px_9px]">
 {value ? (
 <img
 src={value}
 alt={label}
 className="h-full w-full object-contain"
 />
 ) : (
 <UserRound size={42} className="text-slate-600" />
 )}
 </div>

 <div className="flex flex-col justify-center gap-3 border border-zinc-200 bg-white/25 p-4">
 <p className="text-[11px] font-semibold text-zinc-500">
 {hint}. Não usamos link externo; selecione o arquivo e ajuste o
 enquadramento antes de salvar.
 </p>
 <div className="flex flex-wrap gap-3">
 <label className="inline-flex h-11 cursor-pointer items-center gap-2 border border-[#ffcc00] bg-[#ffcc00] px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#142340] transition hover:brightness-110">
 <FileUp size={14} /> Escolher imagem
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(event) => onPick(event.target.files?.[0] || null)}
 />
 </label>
 {value ? (
 <button
 type="button"
 onClick={onClear}
 className="inline-flex h-11 items-center gap-2 border border-red-500/40 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300 hover:bg-red-500/10"
 >
 <X size={14} /> Remover
 </button>
 ) : null}
 </div>
 </div>
 </div>
 </div>
 );
}

function CropModal({
 state,
 loading,
 onChange,
 onClose,
 onApply,
}: {
 state: CropState;
 loading: boolean;
 onChange: (state: CropState) => void;
 onClose: () => void;
 onApply: () => void;
}) {
 const aspectLabel = state.target.tipo === "jogador" ? "500x600" : "500x500";

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 p-4 ">
 <div className="w-full max-w-[820px] border border-[#ffcc00]/45 bg-white p-5 -[0_0_70px_rgba(255,0,184,.20)]">
 <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffcc00]">
 // Crop estilo FIFA
 </p>
 <p className="mt-2 text-[12px] font-semibold text-zinc-500">
 Ajuste o enquadramento. Saída final: {aspectLabel}.
 </p>
 </div>
 <button
 onClick={onClose}
 className="inline-flex h-10 items-center gap-2 border border-zinc-200 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600 hover:border-[#ffcc00]"
 >
 <X size={13} /> Fechar
 </button>
 </div>

 <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
 <div className="flex min-h-[420px] items-center justify-center overflow-hidden border border-zinc-200 bg-[linear-gradient(45deg,rgba(255,255,255,.08)_25%,transparent_25%,transparent_75%,rgba(255,255,255,.08)_75%),linear-gradient(45deg,rgba(255,255,255,.08)_25%,transparent_25%,transparent_75%,rgba(255,255,255,.08)_75%)] bg-[length:22px_22px] [background-position:0_0,11px_11px] p-4">
 <div
 className="relative overflow-hidden border border-[#ffcc00]/50 bg-transparent"
 style={{
 width: state.target.tipo === "jogador" ? 300 : 340,
 height: state.target.tipo === "jogador" ? 360 : 340,
 }}
 >
 <img
 src={state.src}
 alt="Crop"
 className="absolute left-1/2 top-1/2 h-full w-full object-cover"
 style={{
 transform: `translate(calc(-50% + ${state.offsetX}px), calc(-50% + ${state.offsetY}px)) scale(${state.zoom})`,
 transformOrigin: "center",
 }}
 draggable={false}
 />
 <div className="pointer-events-none absolute inset-0 border-[12px] border-zinc-200" />
 <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:33.33%_33.33%]" />
 </div>
 </div>

 <div className="space-y-5 border border-zinc-200 bg-white/[0.03] p-4">
 <CropRange
 label="Zoom"
 min={1}
 max={2.6}
 step={0.01}
 value={state.zoom}
 onChange={(value) => onChange({ ...state, zoom: value })}
 />
 <CropRange
 label="Horizontal"
 min={-100}
 max={100}
 step={1}
 value={state.offsetX}
 onChange={(value) => onChange({ ...state, offsetX: value })}
 />
 <CropRange
 label="Vertical"
 min={-100}
 max={100}
 step={1}
 value={state.offsetY}
 onChange={(value) => onChange({ ...state, offsetY: value })}
 />

 <div className="border border-[#ffcc00]/25 bg-[#ffcc00]/5 p-3">
 <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffcc00]">
 Padrão da imagem
 </p>
 <p className="mt-2 text-[12px] font-semibold leading-5 text-zinc-600">
 {state.target.tipo === "jogador"
 ? "Foto do jogador em 500px de largura por 600px de altura."
 : "Logo da equipe em 500px por 500px."}
 </p>
 </div>

 <button
 onClick={onApply}
 disabled={loading}
 className="inline-flex h-12 w-full items-center justify-center gap-2 border border-[#ffcc00] bg-[#ffcc00] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#142340] transition hover:brightness-110 disabled:opacity-50"
 >
 {loading ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Save size={14} />
 )}
 Aplicar imagem
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}

function CropRange({
 label,
 min,
 max,
 step,
 value,
 onChange,
}: {
 label: string;
 min: number;
 max: number;
 step: number;
 value: number;
 onChange: (value: number) => void;
}) {
 return (
 <label className="block">
 <div className="mb-2 flex items-center justify-between">
 <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 {label}
 </span>
 <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffcc00]">
 {typeof value === "number" ? value.toFixed(step < 1 ? 2 : 0) : value}
 </span>
 </div>
 <input
 type="range"
 min={min}
 max={max}
 step={step}
 value={value}
 onChange={(event) => onChange(Number(event.target.value))}
 className="w-full accent-[#ffcc00]"
 />
 </label>
 );
}

function Field({
 label,
 value,
 onChange,
 className = "",
}: {
 label: string;
 value: string;
 onChange: (value: string) => void;
 className?: string;
}) {
 return (
 <label className={`block ${className}`}>
 <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 {label}
 </span>
 <input
 value={value}
 onChange={(e) => onChange(e.target.value)}
 className="mt-2 h-12 w-full border border-zinc-200 bg-white/30 px-4 text-[13px] font-bold text-[#142340] outline-none focus:border-[#ffcc00]"
 />
 </label>
 );
}

function SelectField({
 label,
 value,
 onChange,
 options,
 empty,
 className = "",
}: {
 label: string;
 value: string;
 onChange: (value: string) => void;
 options: { value: string; label: string }[];
 empty: string;
 className?: string;
}) {
 return (
 <label className={`block ${className}`}>
 <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 {label}
 </span>
 <select
 value={value}
 onChange={(e) => onChange(e.target.value)}
 className="mt-2 h-12 w-full border border-zinc-200 bg-white/30 px-4 text-[13px] font-bold text-[#142340] outline-none focus:border-[#ffcc00]"
 >
 <option value="">{empty}</option>
 {options.map((option) => (
 <option key={option.value} value={option.value}>
 {option.label}
 </option>
 ))}
 </select>
 </label>
 );
}

function ActionButton({
 onClick,
 disabled,
 icon,
 label,
}: {
 onClick: () => void;
 disabled?: boolean;
 icon: ReactNode;
 label: string;
}) {
 return (
 <button
 onClick={onClick}
 disabled={disabled}
 className="inline-flex h-12 items-center gap-2 border border-[#ffcc00] bg-[#ffcc00] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#142340] transition hover:brightness-110 disabled:opacity-50"
 >
 {icon}
 {label}
 </button>
 );
}

function GhostButton({
 onClick,
 icon,
 label,
}: {
 onClick: () => void;
 icon: ReactNode;
 label: string;
}) {
 return (
 <button
 onClick={onClick}
 className="inline-flex h-12 items-center gap-2 border border-zinc-200 px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600 transition hover:border-[#ffcc00] hover:text-[#142340]"
 >
 {icon}
 {label}
 </button>
 );
}

function EditButton({ onClick }: { onClick: () => void }) {
 return (
 <button
 onClick={onClick}
 className="inline-flex h-9 items-center gap-2 border border-zinc-200 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600 hover:border-[#ffcc00] hover:text-[#142340]"
 >
 <Edit3 size={11} /> Editar
 </button>
 );
}

function UploadCsvCard({
 title,
 description,
 accept,
 disabled,
 onChange,
}: {
 title: string;
 description: string;
 accept: string;
 disabled: boolean;
 onChange: (event: any) => void;
}) {
 return (
 <label className="block cursor-pointer border border-zinc-200 bg-white p-5 transition hover:border-[#ffcc00]/60">
 <div className="flex items-start justify-between gap-4">
 <div>
 <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#ffcc00]">
 {title}
 </p>
 <p className="mt-3 text-[12px] font-semibold leading-6 text-zinc-500">
 {description}
 </p>
 </div>
 <FileUp className="text-[#ffcc00]" size={22} />
 </div>
 <input
 type="file"
 accept={accept}
 disabled={disabled}
 onChange={onChange}
 className="hidden"
 />
 </label>
 );
}
