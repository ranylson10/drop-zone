'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import {
 Trash2,
 Plus,
 Layers,
 Save,
 Loader2,
 Gamepad2,
 Dices,
 Hand,
 ChevronDown,
 ChevronRight,
 Lock,
 RefreshCcw,
 CalendarDays,
 Clock3,
 Timer,
 Users,
 Swords
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SorteadorMapas from './SorteadorMapas';

const MAPAS_DISPONIVEIS = [
 'Bermuda',
 'Purgatório',
 'Kalahari',
 'Alpes',
 'Nova Terra',
 'Solara'
];

type Fase = {
 id: string;
 campeonato_id: string;
 nome: string;
 slug?: string | null;
 ordem: number;
};

type Grupo = {
 id: string;
 campeonato_id: string;
 fase_id: string | null;
 nome: string;
 slug?: string | null;
 quantidade_equipes: number;
};

type Jogo = {
 id: string;
 campeonato_id: string;
 grupo_id?: string | null;
 nome?: string | null;
 numero?: number | null;
 data_inicio?: string | null;
 data_fim?: string | null;
 observacoes?: string | null;
 created_at?: string | null;
 updated_at?: string | null;

 fase_id?: string | null;
 nome_bloco?: string | null;
 data_jogo?: string | null;
 hora_jogo?: string | null;
 duracao_estimada_min?: number | null;
 quantidade_partidas?: number | null;
 quedas?: Record<string, string> | null;
};

type JogoGrupo = {
 jogo_id: string;
 grupo_id: string;
};

type JogoEquipePreview = {
 id: string;
 jogo_id: string;
 grupo_id: string | null;
 campeonato_equipe_id: string;
 grupo?: {
 id: string;
 nome: string;
 } | null;
 campeonato_equipe?: {
 id: string;
 tipo_origem?: string | null;
 equipe_id?: string | null;
 equipe_avulsa_id?: string | null;
 equipe?: {
 id: string;
 nome: string;
 tag?: string | null;
 logo_url?: string | null;
 } | null;
 equipe_avulsa?: {
 id: string;
 nome: string;
 tag?: string | null;
 logo_url?: string | null;
 } | null;
 } | null;
};

type FormState = {
 nome_bloco: string;
 data_jogo: string;
 hora_jogo: string;
 duracao_estimada_min: number;
 quantidade_partidas: number;
 mapas: string[];
 gruposSelecionados: string[];
 observacoes: string;
};

function getErrorMessage(error: any, fallback = 'Erro inesperado') {
 if (!error) return fallback;

 if (typeof error === 'string') return error;
 if (error.message) return error.message;
 if (error.details) return error.details;
 if (error.hint) return error.hint;
 if (error.error_description) return error.error_description;

 try {
 const asJson = JSON.stringify(error);
 if (asJson && asJson !== '{}') return asJson;
 } catch {
 // ignora
 }

 return fallback;
}

function logStep(label: string, data?: any) {
 console.log(`[GerenciarJogos] ${label}`, data ?? '');
}

export default function GerenciarJogos() {
 const params = useParams();
 const campeonatoId = params?.id as string;

 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);

 const [fases, setFases] = useState<Fase[]>([]);
 const [gruposPorFase, setGruposPorFase] = useState<Record<string, Grupo[]>>({});
 const [jogos, setJogos] = useState<Jogo[]>([]);
 const [jogoGruposMap, setJogoGruposMap] = useState<Record<string, string[]>>({});
 const [fasesAbertas, setFasesAbertas] = useState<string[]>([]);

 const [faseAtivaId, setFaseAtivaId] = useState<string>('');
 const [gruposDaFase, setGruposDaFase] = useState<Grupo[]>([]);
 const [jogoEdicao, setJogoEdicao] = useState<Jogo | null>(null);

 const [equipesPreview, setEquipesPreview] = useState<JogoEquipePreview[]>([]);
 const [loadingEquipesPreview, setLoadingEquipesPreview] = useState(false);

 const [isModalSorteioOpen, setIsModalSorteioOpen] = useState(false);
 const [modoEscolha, setModoEscolha] = useState<'manual' | 'sorteio'>('manual');

 const [form, setForm] = useState<FormState>({
 nome_bloco: '',
 data_jogo: '',
 hora_jogo: '',
 duracao_estimada_min: 180,
 quantidade_partidas: 6,
 mapas: ['Bermuda', 'Purgatório', 'Kalahari', 'Alpes', 'Nova Terra', 'Solara'],
 gruposSelecionados: [],
 observacoes: ''
 });

 const gruposSelecionadosDetalhes = useMemo(() => {
 return gruposDaFase.filter((g) => form.gruposSelecionados.includes(g.id));
 }, [gruposDaFase, form.gruposSelecionados]);

 const equipesAgrupadasPreview = useMemo(() => {
 const map = new Map<string, { grupoNome: string; equipes: string[] }>();

 for (const item of equipesPreview) {
 const grupoNome = item.grupo?.nome || 'Sem grupo';
 const nomeEquipe =
 item.campeonato_equipe?.equipe?.nome ||
 item.campeonato_equipe?.equipe_avulsa?.nome ||
 'Equipe sem nome';

 if (!map.has(grupoNome)) {
 map.set(grupoNome, { grupoNome, equipes: [] });
 }

 map.get(grupoNome)!.equipes.push(nomeEquipe);
 }

 return Array.from(map.values()).sort((a, b) => a.grupoNome.localeCompare(b.grupoNome));
 }, [equipesPreview]);

 const carregarDados = useCallback(async () => {
 if (!campeonatoId) return;

 setLoading(true);

 try {
 const [
 fasesRes,
 gruposRes,
 jogosRes,
 jogoGruposRes
 ] = await Promise.all([
 supabase
 .from('campeonato_fases')
 .select('*')
 .eq('campeonato_id', campeonatoId)
 .order('ordem', { ascending: true }),

 supabase
 .from('campeonato_grupos')
 .select('*')
 .eq('campeonato_id', campeonatoId)
 .order('nome', { ascending: true }),

 supabase
 .from('jogos')
 .select('*')
 .eq('campeonato_id', campeonatoId)
 .order('data_jogo', { ascending: true, nullsFirst: false })
 .order('hora_jogo', { ascending: true, nullsFirst: false })
 .order('created_at', { ascending: true }),

 supabase
 .from('jogo_grupos')
 .select('jogo_id, grupo_id')
 ]);

 if (fasesRes.error) throw fasesRes.error;
 if (gruposRes.error) throw gruposRes.error;
 if (jogosRes.error) throw jogosRes.error;
 if (jogoGruposRes.error) throw jogoGruposRes.error;

 const fasesData = (fasesRes.data || []) as Fase[];
 const gruposData = (gruposRes.data || []) as Grupo[];
 const jogosData = (jogosRes.data || []) as Jogo[];
 const jogoGruposData = (jogoGruposRes.data || []) as JogoGrupo[];

 const agrupados: Record<string, Grupo[]> = {};
 for (const grupo of gruposData) {
 const faseId = grupo.fase_id || '';
 if (!agrupados[faseId]) agrupados[faseId] = [];
 agrupados[faseId].push(grupo);
 }

 Object.keys(agrupados).forEach((faseId) => {
 agrupados[faseId].sort((a, b) => a.nome.localeCompare(b.nome));
 });

 const jogoGrupoMapTemp: Record<string, string[]> = {};
 for (const item of jogoGruposData) {
 if (!jogoGrupoMapTemp[item.jogo_id]) jogoGrupoMapTemp[item.jogo_id] = [];
 jogoGrupoMapTemp[item.jogo_id].push(item.grupo_id);
 }

 setFases(fasesData);
 setGruposPorFase(agrupados);
 setJogos(jogosData);
 setJogoGruposMap(jogoGrupoMapTemp);

 if (fasesData.length > 0 && fasesAbertas.length === 0) {
 setFasesAbertas([fasesData[0].id]);
 }
 } catch (error: any) {
 console.error('[GerenciarJogos] carregarDados', error);
 toast.error(getErrorMessage(error, 'Erro ao carregar dados da aba Jogos'));
 } finally {
 setLoading(false);
 }
 }, [campeonatoId, fasesAbertas.length]);

 useEffect(() => {
 carregarDados();
 }, [carregarDados]);

 const carregarEquipesPreview = useCallback(async (jogoId: string) => {
 if (!jogoId) {
 setEquipesPreview([]);
 return;
 }

 setLoadingEquipesPreview(true);

 try {
 const { data, error } = await supabase
 .from('jogo_equipes')
 .select(`
 id,
 jogo_id,
 grupo_id,
 campeonato_equipe_id,
 grupo:campeonato_grupos (
 id,
 nome
 ),
 campeonato_equipe:campeonato_equipes (
 id,
 tipo_origem,
 equipe_id,
 equipe_avulsa_id,
 equipe:equipes (
 id,
 nome,
 tag,
 logo_url
 ),
 equipe_avulsa:equipes_avulsas_campeonato (
 id,
 nome,
 tag,
 logo_url
 )
 )
 `)
 .eq('jogo_id', jogoId);

 if (error) throw error;

 setEquipesPreview((data || []) as any[]);
 } catch (error: any) {
 console.error('[GerenciarJogos] carregarEquipesPreview', error);
 toast.error(getErrorMessage(error, 'Erro ao carregar equipes do jogo'));
 setEquipesPreview([]);
 } finally {
 setLoadingEquipesPreview(false);
 }
 }, []);

 const resetarFormulario = useCallback((faseId: string, nomePadrao?: string) => {
 setFaseAtivaId(faseId);
 setGruposDaFase(gruposPorFase[faseId] || []);
 setJogoEdicao(null);
 setModoEscolha('manual');
 setEquipesPreview([]);

 const hoje = new Date();
 const yyyy = hoje.getFullYear();
 const mm = String(hoje.getMonth() + 1).padStart(2, '0');
 const dd = String(hoje.getDate()).padStart(2, '0');

 setForm({
 nome_bloco: nomePadrao || 'JOGO 01',
 data_jogo: `${yyyy}-${mm}-${dd}`,
 hora_jogo: '19:00',
 duracao_estimada_min: 180,
 quantidade_partidas: 6,
 mapas: ['Bermuda', 'Purgatório', 'Kalahari', 'Alpes', 'Nova Terra', 'Solara'],
 gruposSelecionados: [],
 observacoes: ''
 });
 }, [gruposPorFase]);

 const prepararNovoJogo = useCallback((e: React.MouseEvent, faseId: string) => {
 e.stopPropagation();

 const jogosDaFase = jogos.filter((j) => j.fase_id === faseId);
 const proximoNumero = jogosDaFase.length + 1;
 const nomePadrao = `JOGO ${String(proximoNumero).padStart(2, '0')}`;

 resetarFormulario(faseId, nomePadrao);
 }, [jogos, resetarFormulario]);

 const prepararEdicao = useCallback(async (jogo: Jogo) => {
 const faseId = jogo.fase_id || '';
 const gruposSelecionados = jogoGruposMap[jogo.id] || [];

 setJogoEdicao(jogo);
 setFaseAtivaId(faseId);
 setGruposDaFase(gruposPorFase[faseId] || []);
 setEquipesPreview([]);

 const quedasObj = (jogo.quedas || {}) as Record<string, string>;
 const mapasArray = Object.keys(quedasObj)
 .sort((a, b) => Number(a) - Number(b))
 .map((k) => quedasObj[k]);

 const quantidadePartidas = jogo.quantidade_partidas || mapasArray.length || 0;
 const mapasPreenchidos = Array.from(
 { length: quantidadePartidas },
 (_, i) => mapasArray[i] || 'Bermuda'
 );
 const houveSorteio = mapasArray.length > 0;

 setModoEscolha(houveSorteio ? 'sorteio' : 'manual');

 setForm({
 nome_bloco: jogo.nome_bloco || jogo.nome || '',
 data_jogo: jogo.data_jogo || '',
 hora_jogo: jogo.hora_jogo || '',
 duracao_estimada_min: jogo.duracao_estimada_min || 180,
 quantidade_partidas: quantidadePartidas || 6,
 mapas: mapasPreenchidos.length > 0
 ? mapasPreenchidos
 : ['Bermuda', 'Purgatório', 'Kalahari', 'Alpes', 'Nova Terra', 'Solara'],
 gruposSelecionados,
 observacoes: jogo.observacoes || ''
 });

 await carregarEquipesPreview(jogo.id);
 }, [carregarEquipesPreview, gruposPorFase, jogoGruposMap]);

 const handleQtdPartidasChange = (val: string) => {
 if (modoEscolha === 'sorteio') {
 toast.error('Não é possível alterar a quantidade de partidas com sorteio ativo. Resete para manual primeiro.');
 return;
 }

 const n = Math.max(0, parseInt(val || '0', 10) || 0);

 setForm((prev) => ({
 ...prev,
 quantidade_partidas: n,
 mapas: Array.from({ length: n }, (_, i) => prev.mapas[i] || 'Bermuda')
 }));
 };

 const toggleGrupo = (grupoId: string) => {
 setForm((prev) => {
 const jaExiste = prev.gruposSelecionados.includes(grupoId);
 return {
 ...prev,
 gruposSelecionados: jaExiste
 ? prev.gruposSelecionados.filter((id) => id !== grupoId)
 : [...prev.gruposSelecionados, grupoId]
 };
 });
 };

 const handleAbrirSorteador = async () => {
 if (saving) return

 let jogoAtual = jogoEdicao

 if (!jogoAtual?.id) {
 const salvo = await salvar()
 if (!salvo?.id) return
 jogoAtual = salvo
 }

 setModoEscolha('sorteio')
 setIsModalSorteioOpen(true)
 }

 const resetarParaManual = async () => {
 if (!jogoEdicao?.id) {
 setModoEscolha('manual');
 return;
 }

 const ok = confirm(
 'Isso removerá os mapas sorteados do jogo para liberar edição manual. Continuar?'
 );

 if (!ok) return;

 setSaving(true);

 try {
 const { error: updateError } = await supabase
 .from('jogos')
 .update({
 quedas: {}
 })
 .eq('id', jogoEdicao.id);

 if (updateError) throw updateError;

 setModoEscolha('manual');

 setForm((prev) => ({
 ...prev,
 mapas: Array.from(
 { length: prev.quantidade_partidas },
 (_, i) => prev.mapas[i] || 'Bermuda'
 )
 }));

 const { error: rpcError } = await supabase.rpc('sincronizar_partidas_do_jogo', {
 p_jogo_id: jogoEdicao.id
 });

 if (rpcError) throw rpcError;

 toast.success('Modo manual liberado');
 await carregarDados();

 const { data: jogoAtualizado, error: jogoAtualizadoError } = await supabase
 .from('jogos')
 .select('*')
 .eq('id', jogoEdicao.id)
 .single();

 if (jogoAtualizadoError) throw jogoAtualizadoError;

 if (jogoAtualizado) {
 await prepararEdicao({
 ...(jogoAtualizado as Jogo),
 quedas: {}
 });
 }
 } catch (error: any) {
 console.error('[GerenciarJogos] resetarParaManual', error);
 toast.error(getErrorMessage(error, 'Erro ao resetar sorteio'));
 } finally {
 setSaving(false);
 }
 };

 const sincronizarJogoGrupos = async (jogoId: string, gruposIds: string[]) => {
 logStep('sincronizarJogoGrupos - delete', { jogoId });

 const { error: delError } = await supabase
 .from('jogo_grupos')
 .delete()
 .eq('jogo_id', jogoId);

 if (delError) throw delError;

 if (gruposIds.length > 0) {
 const inserts = gruposIds.map((grupo_id) => ({
 jogo_id: jogoId,
 grupo_id
 }));

 logStep('sincronizarJogoGrupos - insert', inserts);

 const { error: insError } = await supabase
 .from('jogo_grupos')
 .insert(inserts);

 if (insError) throw insError;
 }
 };

 const sincronizarJogoEquipes = async (jogoId: string, gruposIds: string[]) => {
 logStep('sincronizarJogoEquipes - delete', { jogoId })

 const { error: delError } = await supabase
 .from('jogo_equipes')
 .delete()
 .eq('jogo_id', jogoId)

 if (delError) throw delError

 if (gruposIds.length === 0) return

 const { data: slotsData, error: slotsError } = await supabase
 .from('campeonato_grupo_slots')
 .select('id, grupo_id, campeonato_equipe_id')
 .in('grupo_id', gruposIds)

 if (slotsError) throw slotsError

 const slotsValidos = (slotsData || []).filter((slot: any) => !!slot.campeonato_equipe_id)

 if (slotsValidos.length === 0) return

 const inserts = slotsValidos.map((slot: any) => ({
 jogo_id: jogoId,
 campeonato_id: campeonatoId,
 fase_id: faseAtivaId,
 grupo_id: slot.grupo_id,
 campeonato_equipe_id: slot.campeonato_equipe_id,
 origem_slot_id: slot.id
 }))

 logStep('sincronizarJogoEquipes - insert', inserts)

 const { error: insError } = await supabase
 .from('jogo_equipes')
 .insert(inserts)

 if (insError) throw insError
 }

 const sincronizarEquipesEPartidas = async (jogoId: string) => {
 logStep('regenerar_jogo_equipes', { jogoId });

 const { error: rpcEquipesError } = await supabase.rpc('regenerar_jogo_equipes', {
 p_jogo_id: jogoId
 });

 if (rpcEquipesError) throw rpcEquipesError;

 logStep('sincronizar_partidas_do_jogo', { jogoId });

 const { error: rpcPartidasError } = await supabase.rpc('sincronizar_partidas_do_jogo', {
 p_jogo_id: jogoId
 });

 if (rpcPartidasError) throw rpcPartidasError;
 };

 const montarDataHoraIso = (data?: string | null, hora?: string | null) => {
 const dataLimpa = String(data || '').trim()
 const horaLimpa = String(hora || '').trim()

 if (!dataLimpa || !horaLimpa) return null

 const partesHora = horaLimpa.split(':').map((p) => p.trim()).filter(Boolean)
 const hh = partesHora[0] || '00'
 const mm = partesHora[1] || '00'
 const ss = partesHora[2] || '00'

 return `${dataLimpa}T${hh}:${mm}:${ss}`
 }

 const salvar = async (): Promise<Jogo | null> => {
 if (!campeonatoId) {
 toast.error('Campeonato não encontrado');
 return null;
 }
 if (!faseAtivaId) {
 toast.error('Selecione uma fase');
 return null;
 }
 if (!form.nome_bloco.trim()) {
 toast.error('Informe o nome do jogo');
 return null;
 }
 if (form.gruposSelecionados.length === 0) {
 toast.error('Selecione ao menos um grupo');
 return null;
 }
 if (form.quantidade_partidas <= 0) {
 toast.error('Informe a quantidade de partidas');
 return null;
 }

 setSaving(true);

 try {
 const payload = {
 campeonato_id: campeonatoId,
 fase_id: faseAtivaId,
 nome_bloco: form.nome_bloco.trim().toUpperCase(),
 data_jogo: form.data_jogo || null,
 hora_jogo: form.hora_jogo || null,
 duracao_estimada_min: form.duracao_estimada_min || null,
 quantidade_partidas: form.quantidade_partidas,
 quedas: form.mapas.reduce((acc: Record<string, string>, mapa, index) => {
 acc[String(index + 1)] = mapa;
 return acc;
 }, {}),
 observacoes: form.observacoes?.trim() || null,

 // compatibilidade com estrutura antiga
 nome: form.nome_bloco.trim().toUpperCase(),
 grupo_id: null,
 numero: null,
 data_inicio: montarDataHoraIso(form.data_jogo, form.hora_jogo)
 };

 logStep('salvar - payload', payload);

 let jogoSalvo: Jogo | null = null;

 if (jogoEdicao?.id) {
 logStep('salvar - update jogo', { id: jogoEdicao.id });

 const { data, error } = await supabase
 .from('jogos')
 .update(payload)
 .eq('id', jogoEdicao.id)
 .select()
 .single();

 if (error) throw error;
 jogoSalvo = data as Jogo;
 } else {
 logStep('salvar - insert jogo');

 const { data, error } = await supabase
 .from('jogos')
 .insert([payload])
 .select()
 .single();

 if (error) throw error;
 jogoSalvo = data as Jogo;
 }

 if (!jogoSalvo?.id) {
 throw new Error('Não foi possível obter o jogo salvo');
 }

 try {
 await sincronizarJogoGrupos(jogoSalvo.id, form.gruposSelecionados);
 await sincronizarJogoEquipes(jogoSalvo.id, form.gruposSelecionados);
 await sincronizarEquipesEPartidas(jogoSalvo.id);
 } catch (syncError: any) {
 console.error('[GerenciarJogos] salvar - erro de sincronização pós-save', syncError);

 try {
 console.error('[GerenciarJogos] salvar - erro de sincronização json', JSON.stringify(syncError, null, 2));
 } catch {}

 toast.error(getErrorMessage(syncError, 'Jogo salvo, mas houve erro ao sincronizar equipes/partidas'));
 }

 toast.success(jogoEdicao ? 'Jogo atualizado com sucesso!' : 'Jogo criado com sucesso!');

 await carregarDados();
 await prepararEdicao(jogoSalvo);
 return jogoSalvo;
 } catch (error: any) {
 console.error('[GerenciarJogos] salvar - erro completo', error);

 try {
 console.error('[GerenciarJogos] salvar - erro json', JSON.stringify(error, null, 2));
 } catch {
 console.error('[GerenciarJogos] salvar - erro não serializável');
 }

 if (error?.code === '23505') {
 toast.error('Já existe um jogo com esse nome nessa fase');
 } else {
 toast.error(getErrorMessage(error, 'Erro ao salvar jogo'));
 }
 return null;
 } finally {
 setSaving(false);
 }
 };

 const excluirJogo = async () => {
 if (!jogoEdicao?.id) return;

 const ok = confirm('Excluir esta partida/bloco de jogos completamente?');
 if (!ok) return;

 try {
 setSaving(true);

 const { error } = await supabase
 .from('jogos')
 .delete()
 .eq('id', jogoEdicao.id);

 if (error) throw error;

 toast.success('Jogo removido com sucesso');

 setJogoEdicao(null);
 setFaseAtivaId('');
 setEquipesPreview([]);

 await carregarDados();
 } catch (error: any) {
 console.error('[GerenciarJogos] excluirJogo', error);
 toast.error(getErrorMessage(error, 'Erro ao excluir jogo'));
 } finally {
 setSaving(false);
 }
 };

 const toggleFaseAberta = (faseId: string) => {
 setFasesAbertas((prev) =>
 prev.includes(faseId)
 ? prev.filter((id) => id !== faseId)
 : [...prev, faseId]
 );
 };

 if (loading) {
 return (
 <div className="flex justify-center p-10">
 <Loader2 className="animate-spin text-[#2563eb]" />
 </div>
 );
 }

 return (
 <div className="flex h-[calc(100vh-280px)] gap-4 text-[#142340] overflow-hidden">

 {/* SIDEBAR */}
 <div className="w-64 flex flex-col gap-3 overflow-y-auto no-scrollbar shrink-0">
 <h2 className="font-semibold text-xs uppercase border-l-4 border-zinc-200 pl-2 tracking-tighter">
 Jogos / Rodadas
 </h2>

 <div className="space-y-2">
 {fases.map((fase) => {
 const isOpen = fasesAbertas.includes(fase.id);
 const jogosDaFase = jogos.filter((j) => j.fase_id === fase.id);

 return (
 <div key={fase.id} className="bg-white border border-zinc-200">
 <div
 onClick={() => toggleFaseAberta(fase.id)}
 className="flex justify-between items-center p-2 cursor-pointer hover:bg-zinc-50"
 >
 <span className="font-semibold text-[10px] uppercase text-zinc-500 truncate w-36">
 {fase.nome}
 </span>

 <div className="flex items-center gap-1">
 <button
 onClick={(e) => prepararNovoJogo(e, fase.id)}
 className="p-1 bg-white text-[#2563eb]"
 title="Novo jogo"
 >
 <Plus size={10} strokeWidth={4} />
 </button>

 {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
 </div>
 </div>

 {isOpen && (
 <div className="p-1 space-y-1 border-t border-zinc-100 bg-zinc-50/30">
 {jogosDaFase.length === 0 && (
 <div className="px-2 py-3 text-[9px] uppercase text-zinc-500 font-semibold">
 Nenhum jogo nesta fase
 </div>
 )}

 {jogosDaFase.map((jogo) => {
 const gruposDoJogo = jogoGruposMap[jogo.id] || [];
 const labelGrupos = gruposDoJogo
 .map((gid) => {
 const grupo = (gruposPorFase[fase.id] || []).find((g) => g.id === gid);
 return grupo?.nome || '';
 })
 .filter(Boolean)
 .join(' + ');

 return (
 <button
 key={jogo.id}
 onClick={() => prepararEdicao(jogo)}
 className={`w-full p-2 text-left border-l-2 text-[10px] font-semibold uppercase ${
 jogoEdicao?.id === jogo.id
 ? 'border-[#2563eb] bg-white '
 : 'border-transparent hover:bg-white'
 }`}
 >
 <div className="truncate">
 {jogo.nome_bloco || jogo.nome || 'JOGO'}
 </div>

 <div className="text-[8px] text-zinc-500 font-bold normal-case not- mt-1 truncate">
 {jogo.data_jogo || 'Sem data'}
 {jogo.hora_jogo ? ` • ${jogo.hora_jogo.slice(0, 5)}` : ''}
 </div>

 {labelGrupos && (
 <div className="text-[8px] text-zinc-500 font-bold normal-case not- truncate">
 {labelGrupos}
 </div>
 )}
 </button>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* PAINEL */}
 <div className="flex-1 bg-white border border-zinc-200 -[4px_4px_0px_0px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden">
 {!faseAtivaId ? (
 <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
 <Gamepad2 size={40} className="mb-2 opacity-10" />
 <p className="text-[9px] font-semibold uppercase tracking-widest">
 Selecione um jogo
 </p>
 </div>
 ) : (
 <>
 {/* HEADER */}
 <div className="p-4 border-b-2 border-zinc-200 flex justify-between items-center bg-white gap-4">
 <input
 type="text"
 value={form.nome_bloco}
 onChange={(e) => setForm((prev) => ({ ...prev, nome_bloco: e.target.value }))}
 className="text-xl font-semibold text-[#142340] bg-transparent outline-none uppercase tracking-tighter w-full"
 placeholder="NOME DO JOGO"
 />

 <button
 onClick={salvar}
 disabled={saving}
 className="flex items-center gap-2 bg-white text-[#142340] px-4 py-2 font-semibold uppercase text-[10px] hover:bg-[#2563eb] hover:text-[#142340] transition-all whitespace-nowrap"
 >
 {saving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
 {jogoEdicao ? 'Salvar Dados' : 'Criar Jogo'}
 </button>
 </div>

 {/* CONTEÚDO */}
 <div className="p-4 overflow-y-auto no-scrollbar grid grid-cols-12 gap-6">

 {/* ESQUERDA */}
 <div className="col-span-5 space-y-4">

 {/* CAMPOS PRINCIPAIS */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[8px] font-semibold uppercase text-zinc-500 flex items-center gap-1">
 <CalendarDays size={10} />
 Data do jogo
 </label>
 <input
 type="date"
 value={form.data_jogo}
 onChange={(e) => setForm((prev) => ({ ...prev, data_jogo: e.target.value }))}
 className="w-full bg-zinc-100 p-2 text-[10px] font-semibold outline-none "
 />
 </div>

 <div className="space-y-1">
 <label className="text-[8px] font-semibold uppercase text-zinc-500 flex items-center gap-1">
 <Clock3 size={10} />
 Horário
 </label>
 <input
 type="time"
 value={form.hora_jogo}
 onChange={(e) => setForm((prev) => ({ ...prev, hora_jogo: e.target.value }))}
 className="w-full bg-zinc-100 p-2 text-[10px] font-semibold outline-none "
 />
 </div>

 <div className="space-y-1">
 <label className="text-[8px] font-semibold uppercase text-zinc-500 flex items-center gap-1">
 <Timer size={10} />
 Duração estimada (min)
 </label>
 <input
 type="number"
 min={0}
 value={form.duracao_estimada_min}
 onChange={(e) =>
 setForm((prev) => ({
 ...prev,
 duracao_estimada_min: Math.max(0, parseInt(e.target.value || '0', 10) || 0)
 }))
 }
 className="w-full bg-zinc-100 p-2 text-[10px] font-semibold outline-none "
 />
 </div>

 <div className="space-y-1">
 <label className="text-[8px] font-semibold uppercase text-zinc-500 flex items-center gap-1">
 <Swords size={10} />
 Nº de partidas
 </label>
 <input
 type="number"
 min={1}
 disabled={modoEscolha === 'sorteio'}
 value={form.quantidade_partidas}
 onChange={(e) => handleQtdPartidasChange(e.target.value)}
 className={`w-full p-2 text-[10px] font-semibold outline-none ${
 modoEscolha === 'sorteio'
 ? 'bg-zinc-100 text-zinc-500'
 : 'bg-[#2563eb] text-[#142340]'
 }`}
 />
 </div>
 </div>

 {/* MODO MAPAS */}
 <div className="space-y-3 border-t pt-3">
 <div className="flex items-center justify-between p-1 bg-zinc-100 relative">
 <button
 onClick={() =>
 modoEscolha === 'sorteio'
 ? toast.error("Há sorteio ativo. Use 'Resetar para manual'.")
 : setModoEscolha('manual')
 }
 className={`flex-1 py-1.5 text-[8px] font-semibold uppercase transition-all flex items-center justify-center gap-1 ${
 modoEscolha === 'manual' ? 'bg-white text-[#142340] ' : 'text-zinc-500'
 }`}
 >
 <Hand size={10} />
 Manual
 </button>

 <button
 onClick={() => setModoEscolha('sorteio')}
 className={`flex-1 py-1.5 text-[8px] font-semibold uppercase transition-all flex items-center justify-center gap-1 ${
 modoEscolha === 'sorteio' ? 'bg-white text-[#142340] ' : 'text-zinc-500'
 }`}
 >
 <Dices size={10} />
 Sorteio
 </button>
 </div>

 {modoEscolha === 'sorteio' ? (
 <div className="space-y-2">
 <button
 onClick={handleAbrirSorteador}
 className="w-full py-3 bg-[#2563eb] text-[#142340] text-[9px] font-semibold uppercase flex items-center justify-center gap-2 border border-zinc-200 -[4px_4px_0px_0px_rgba(0,0,0,1)] active:-none transition-all"
 >
 <Dices size={14} />
 {jogoEdicao?.id ? 'ABRIR / REFAZER SORTEIO' : 'SALVAR E ABRIR SORTEIO'}
 </button>

 {jogoEdicao && (
 <button
 onClick={resetarParaManual}
 className="w-full py-1.5 text-zinc-500 hover:text-red-500 text-[8px] font-semibold uppercase flex items-center justify-center gap-1 transition-colors"
 >
 <RefreshCcw size={10} />
 Resetar para modo manual
 </button>
 )}
 </div>
 ) : (
 <p className="text-[8px] font-bold text-zinc-500 uppercase ">
 Selecione manualmente o mapa de cada partida:
 </p>
 )}

 <div className="space-y-1 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
 {form.mapas.map((mapa, idx) => (
 <div
 key={idx}
 className={`flex items-center gap-2 p-1.5 border-2 ${
 modoEscolha === 'sorteio'
 ? 'border-zinc-100 bg-zinc-50'
 : 'border-zinc-200 bg-white'
 }`}
 >
 <span
 className={`w-7 h-7 text-[10px] font-semibold flex items-center justify-center ${
 modoEscolha === 'sorteio'
 ? 'bg-zinc-200 text-zinc-500'
 : 'bg-white text-[#2563eb]'
 }`}
 >
 {modoEscolha === 'sorteio' ? <Lock size={10} /> : `#${idx + 1}`}
 </span>

 <select
 disabled={modoEscolha === 'sorteio'}
 value={mapa}
 onChange={(e) => {
 const novosMapas = [...form.mapas];
 novosMapas[idx] = e.target.value;
 setForm((prev) => ({ ...prev, mapas: novosMapas }));
 }}
 className="flex-1 bg-transparent text-[10px] font-semibold uppercase outline-none cursor-pointer disabled:cursor-not-allowed"
 >
 {MAPAS_DISPONIVEIS.map((m) => (
 <option key={m} value={m}>
 {m}
 </option>
 ))}
 </select>
 </div>
 ))}
 </div>
 </div>

 {/* OBSERVAÇÕES */}
 <div className="space-y-1 border-t pt-3">
 <label className="text-[8px] font-semibold uppercase text-zinc-500 ">
 Observações
 </label>
 <textarea
 value={form.observacoes}
 onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
 rows={5}
 className="w-full bg-zinc-100 p-3 text-[10px] font-bold outline-none resize-none"
 placeholder="Ex: rodada classificatória, transmissão oficial, confronto AXB..."
 />
 </div>
 </div>

 {/* DIREITA */}
 <div className="col-span-7 border-l border-zinc-100 pl-6 space-y-4">

 {/* FASE */}
 <div className="space-y-2">
 <h4 className="text-[9px] font-semibold uppercase text-[#142340]">
 Fase vinculada
 </h4>

 <select
 value={faseAtivaId}
 onChange={(e) => {
 const novaFaseId = e.target.value;
 setFaseAtivaId(novaFaseId);
 setGruposDaFase(gruposPorFase[novaFaseId] || []);
 setForm((prev) => ({
 ...prev,
 gruposSelecionados: []
 }));
 setEquipesPreview([]);
 }}
 className="w-full bg-zinc-100 p-3 text-[10px] font-semibold uppercase outline-none"
 >
 <option value="">Selecione uma fase</option>
 {fases.map((fase) => (
 <option key={fase.id} value={fase.id}>
 {fase.nome}
 </option>
 ))}
 </select>
 </div>

 {/* GRUPOS */}
 <div className="space-y-3">
 <h4 className="text-[9px] font-semibold uppercase text-[#142340] flex items-center gap-2">
 <Layers size={10} className="text-[#2563eb]" />
 Grupos participantes
 </h4>

 <div className="grid grid-cols-2 gap-2 max-h-[230px] overflow-y-auto no-scrollbar">
 {gruposDaFase.length === 0 && (
 <div className="col-span-2 p-3 text-[9px] uppercase text-zinc-500 font-semibold border border-dashed border-zinc-200">
 Nenhum grupo cadastrado nesta fase
 </div>
 )}

 {gruposDaFase.map((grupo) => {
 const selecionado = form.gruposSelecionados.includes(grupo.id);

 return (
 <label
 key={grupo.id}
 className={`flex items-center justify-between p-2 cursor-pointer border-2 transition-all ${
 selecionado
 ? 'border-zinc-200 bg-white text-[#142340] -[2px_2px_0px_0px_rgba(124,252,0,1)]'
 : 'border-zinc-100 bg-white hover:border-zinc-300'
 }`}
 >
 <div className="min-w-0">
 <span className="block text-[9px] font-semibold uppercase truncate">
 {grupo.nome}
 </span>
 <span className={`block text-[8px] font-bold not- ${selecionado ? 'text-zinc-600' : 'text-zinc-500'}`}>
 {grupo.quantidade_equipes} slots
 </span>
 </div>

 <input
 type="checkbox"
 checked={selecionado}
 onChange={() => toggleGrupo(grupo.id)}
 className="hidden"
 />

 {selecionado && <div className="w-2 h-2 bg-[#2563eb]" />}
 </label>
 );
 })}
 </div>
 </div>

 {/* RESUMO */}
 <div className="border-t pt-4 space-y-3">
 <h4 className="text-[9px] font-semibold uppercase text-[#142340] flex items-center gap-2">
 <Users size={10} className="text-[#2563eb]" />
 Resumo do jogo
 </h4>

 <div className="grid grid-cols-3 gap-2">
 <div className="border border-zinc-200 bg-zinc-50 p-3">
 <div className="text-[8px] uppercase font-semibold text-zinc-500">Grupos</div>
 <div className="text-lg font-semibold text-[#142340]">
 {form.gruposSelecionados.length}
 </div>
 </div>

 <div className="border border-zinc-200 bg-zinc-50 p-3">
 <div className="text-[8px] uppercase font-semibold text-zinc-500">Partidas</div>
 <div className="text-lg font-semibold text-[#142340]">
 {form.quantidade_partidas}
 </div>
 </div>

 <div className="border border-zinc-200 bg-zinc-50 p-3">
 <div className="text-[8px] uppercase font-semibold text-zinc-500">Duração</div>
 <div className="text-lg font-semibold text-[#142340]">
 {form.duracao_estimada_min || 0}m
 </div>
 </div>
 </div>

 {gruposSelecionadosDetalhes.length > 0 && (
 <div className="border border-zinc-200 bg-white p-3">
 <div className="text-[8px] uppercase font-semibold text-zinc-500 mb-2">
 Grupos selecionados
 </div>

 <div className="flex flex-wrap gap-2">
 {gruposSelecionadosDetalhes.map((grupo) => (
 <span
 key={grupo.id}
 className="px-2 py-1 bg-white text-[#2563eb] text-[8px] font-semibold uppercase "
 >
 {grupo.nome}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* PRÉVIA DE EQUIPES */}
 <div className="border-t pt-4 space-y-3">
 <h4 className="text-[9px] font-semibold uppercase text-[#142340] flex items-center gap-2">
 <Users size={10} className="text-[#2563eb]" />
 Equipes carregadas do jogo
 </h4>

 {!jogoEdicao ? (
 <div className="border border-dashed border-zinc-200 p-4 text-[9px] uppercase text-zinc-500 font-semibold">
 Salve o jogo para gerar automaticamente as equipes a partir dos grupos selecionados
 </div>
 ) : loadingEquipesPreview ? (
 <div className="flex items-center gap-2 text-[9px] uppercase text-zinc-500 font-semibold">
 <Loader2 size={12} className="animate-spin" />
 Carregando equipes...
 </div>
 ) : equipesAgrupadasPreview.length === 0 ? (
 <div className="border border-dashed border-zinc-200 p-4 text-[9px] uppercase text-zinc-500 font-semibold">
 Nenhuma equipe encontrada nos grupos deste jogo
 </div>
 ) : (
 <div className="space-y-3 max-h-[260px] overflow-y-auto no-scrollbar pr-1">
 {equipesAgrupadasPreview.map((bloco) => (
 <div key={bloco.grupoNome} className="border border-zinc-200 bg-zinc-50">
 <div className="px-3 py-2 border-b border-zinc-200 bg-white text-[8px] font-semibold uppercase text-[#142340]">
 {bloco.grupoNome}
 </div>

 <div className="p-3 grid grid-cols-2 gap-2">
 {bloco.equipes.map((nomeEquipe, index) => (
 <div
 key={`${bloco.grupoNome}-${nomeEquipe}-${index}`}
 className="px-2 py-1 bg-white border border-zinc-200 text-[9px] font-semibold uppercase truncate"
 title={nomeEquipe}
 >
 {nomeEquipe}
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* EXCLUIR */}
 {jogoEdicao && (
 <div className="pt-4 border-t flex justify-end">
 <button
 onClick={excluirJogo}
 className="text-red-500 font-semibold text-[8px] uppercase flex items-center gap-1 hover:bg-red-50 p-2"
 >
 <Trash2 size={10} />
 Excluir partida totalmente
 </button>
 </div>
 )}
 </div>
 </div>
 </>
 )}
 </div>

 {/* MODAL SORTEIO */}
 {jogoEdicao && (
 <SorteadorMapas
 isOpen={isModalSorteioOpen}
 onClose={async () => {
 setIsModalSorteioOpen(false);

 const { data, error } = await supabase
 .from('jogos')
 .select('*')
 .eq('id', jogoEdicao.id)
 .single();

 if (error) {
 toast.error(getErrorMessage(error, 'Erro ao recarregar jogo'));
 return;
 }

 await carregarDados();
 await prepararEdicao(data as Jogo);
 }}
 jogoId={jogoEdicao.id}
 campeonatoId={campeonatoId}
 />
 )}
 </div>
 );
}