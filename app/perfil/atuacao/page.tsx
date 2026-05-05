
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { BadgeCheck, CalendarDays, Check, ChevronLeft, Radio, Save, Search, Shield, Sparkles, UserRound, X } from 'lucide-react'

type CargoKey =
 | 'usuario'
 | 'jogador'
 | 'coach'
 | 'analista'
 | 'narrador'
 | 'comentarista'
 | 'produtor'
 | 'lider_equipe'
 | 'manager'
 | 'moderador'
 | 'organizador'
 | 'designer'
 | 'editor'
 | 'streamer'

type Atuacao = {
 id: string
 user_id: string
 cargo: CargoKey
 origem: string
 status: string
 verificado: boolean
 publico: boolean
 origem_tipo?: string | null
 origem_id?: string | null
}

type StreamProfile = {
 user_id: string
 titulo: string | null
 bio_stream: string | null
 valor_base: number | null
 aceita_convites: boolean
 agenda_publica: boolean
 setup: string | null
 contato_preferencial: string | null
}

type Disponibilidade = {
 id?: string
 dia_semana: number
 hora_inicio: string
 hora_fim: string
 ativo: boolean
}

const CARGOS: { key: CargoKey; label: string; desc: string; grupo: 'competitivo' | 'midia' | 'operacao' }[] = [
 { key: 'jogador', label: 'Jogador', desc: 'Atua em lines, equipes e campeonatos.', grupo: 'competitivo' },
 { key: 'coach', label: 'Coach', desc: 'Comanda treinos, estratégia e lineups.', grupo: 'competitivo' },
 { key: 'analista', label: 'Analista', desc: 'Estuda adversários, mapa e performance.', grupo: 'competitivo' },
 { key: 'manager', label: 'Manager', desc: 'Organiza rotina, elenco e agenda da line.', grupo: 'competitivo' },
 { key: 'lider_equipe', label: 'Líder de equipe', desc: 'Dono ou responsável por equipe.', grupo: 'competitivo' },
 { key: 'narrador', label: 'Narrador', desc: 'Narra eventos, finais e transmissões.', grupo: 'midia' },
 { key: 'comentarista', label: 'Comentarista', desc: 'Comenta partidas, análises e pré-jogo.', grupo: 'midia' },
 { key: 'produtor', label: 'Produtor', desc: 'Opera live, GC, OBS/vMix e transmissão.', grupo: 'midia' },
 { key: 'streamer', label: 'Streamer', desc: 'Cria conteúdo e transmite jogos/eventos.', grupo: 'midia' },
 { key: 'organizador', label: 'Organizador', desc: 'Cria campeonatos, copas e eventos.', grupo: 'operacao' },
 { key: 'moderador', label: 'Moderador', desc: 'Modera apostados, resultados e disputas.', grupo: 'operacao' },
 { key: 'designer', label: 'Designer', desc: 'Cria banners, artes e identidade visual.', grupo: 'operacao' },
 { key: 'editor', label: 'Editor', desc: 'Edita vídeos, cortes e materiais de mídia.', grupo: 'operacao' },
]

const DIAS = [
 { id: 0, label: 'Dom' },
 { id: 1, label: 'Seg' },
 { id: 2, label: 'Ter' },
 { id: 3, label: 'Qua' },
 { id: 4, label: 'Qui' },
 { id: 5, label: 'Sex' },
 { id: 6, label: 'Sáb' },
]

function moeda(valor: number | null | undefined) {
 return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PerfilAtuacaoPage() {
 const [userId, setUserId] = useState<string | null>(null)
 const [loading, setLoading] = useState(true)
 const [salvando, setSalvando] = useState(false)
 const [atuacoes, setAtuacoes] = useState<Atuacao[]>([])
 const [selecionados, setSelecionados] = useState<Set<CargoKey>>(new Set())
 const [stream, setStream] = useState<StreamProfile>({
 user_id: '',
 titulo: '',
 bio_stream: '',
 valor_base: 0,
 aceita_convites: true,
 agenda_publica: true,
 setup: '',
 contato_preferencial: '',
 })
 const [disponibilidade, setDisponibilidade] = useState<Disponibilidade[]>([])
 const [novoHorario, setNovoHorario] = useState<Disponibilidade>({ dia_semana: 1, hora_inicio: '19:00', hora_fim: '23:00', ativo: true })
 const [busca, setBusca] = useState('')

 const automáticos = useMemo(() => atuacoes.filter((a) => a.origem !== 'declarado'), [atuacoes])
 const declarados = useMemo(() => atuacoes.filter((a) => a.origem === 'declarado'), [atuacoes])
 const cargosMidiaAtivos = useMemo(() => ['narrador', 'comentarista', 'produtor', 'streamer'].some((c) => selecionados.has(c as CargoKey)), [selecionados])
 const cargosFiltrados = useMemo(() => {
 const termo = busca.trim().toLowerCase()
 if (!termo) return CARGOS
 return CARGOS.filter((c) => `${c.label} ${c.desc}`.toLowerCase().includes(termo))
 }, [busca])

 useEffect(() => {
 carregar()
 }, [])

 async function carregar() {
 setLoading(true)
 const { data: auth } = await supabase.auth.getUser()
 const uid = auth?.user?.id || null
 setUserId(uid)
 if (!uid) {
 setLoading(false)
 return
 }

 try {
      await supabase.rpc('fn_lealt_sincronizar_selos_usuario', { p_user_id: uid })
    } catch {}

 const { data: atuacoesData } = await supabase
 .from('lealt_usuario_atuacoes')
 .select('*')
 .eq('user_id', uid)
 .eq('status', 'ativo')
 .order('created_at', { ascending: true })

 const lista = (atuacoesData || []) as Atuacao[]
 setAtuacoes(lista)
 setSelecionados(new Set(lista.filter((a) => a.origem === 'declarado').map((a) => a.cargo)))

 const { data: streamData } = await supabase
 .from('lealt_stream_profissionais')
 .select('*')
 .eq('user_id', uid)
 .maybeSingle()

 if (streamData) setStream(streamData as StreamProfile)
 else setStream((s) => ({ ...s, user_id: uid }))

 const { data: dispData } = await supabase
 .from('lealt_stream_disponibilidade')
 .select('*')
 .eq('user_id', uid)
 .order('dia_semana', { ascending: true })
 .order('hora_inicio', { ascending: true })

 setDisponibilidade((dispData || []) as Disponibilidade[])
 setLoading(false)
 }

 function toggleCargo(cargo: CargoKey) {
 const novo = new Set(selecionados)
 if (novo.has(cargo)) novo.delete(cargo)
 else novo.add(cargo)
 setSelecionados(novo)
 }

 async function salvar() {
 if (!userId) return
 setSalvando(true)

 const declaradosAtuais = new Set(declarados.map((a) => a.cargo))
 const paraAdicionar = [...selecionados].filter((cargo) => !declaradosAtuais.has(cargo))
 const paraRemover = [...declaradosAtuais].filter((cargo) => !selecionados.has(cargo))

 if (paraAdicionar.length) {
 await supabase.from('lealt_usuario_atuacoes').insert(
 paraAdicionar.map((cargo) => ({ user_id: userId, cargo, origem: 'declarado', status: 'ativo', publico: true, verificado: false }))
 )
 }

 if (paraRemover.length) {
 await supabase
 .from('lealt_usuario_atuacoes')
 .delete()
 .eq('user_id', userId)
 .eq('origem', 'declarado')
 .in('cargo', paraRemover)
 }

 if (cargosMidiaAtivos) {
 await supabase.from('lealt_stream_profissionais').upsert({
 ...stream,
 user_id: userId,
 valor_base: Number(stream.valor_base || 0),
 updated_at: new Date().toISOString(),
 })
 }

 await carregar()
 setSalvando(false)
 alert('Atuações atualizadas.')
 }

 async function adicionarHorario() {
 if (!userId) return
 const { error } = await supabase.from('lealt_stream_disponibilidade').insert({ ...novoHorario, user_id: userId })
 if (error) {
 alert(error.message)
 return
 }
 await carregar()
 }

 async function removerHorario(id?: string) {
 if (!id) return
 await supabase.from('lealt_stream_disponibilidade').delete().eq('id', id)
 await carregar()
 }

 if (loading) {
 return <div className="min-h-screen bg-[#f5f7fb] p-8 text-[11px] uppercase tracking-[0.3em] text-slate-500">Carregando atuações...</div>
 }

 return (
 <div className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-[#142340]">
 <div className="mx-auto max-w-6xl space-y-4">
 <div className="flex items-center justify-between border border-slate-200 bg-white p-4">
 <div>
 <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-600">Perfil profissional</div>
 <h1 className="text-2xl font-black uppercase tracking-tight">Atuações e selos</h1>
 <p className="mt-1 text-xs text-slate-500">Escolha como você atua no site. Selos verificados entram automaticamente quando você exerce uma função real.</p>
 </div>
 <div className="flex gap-2">
 <Link href="/stream" className="inline-flex items-center gap-2 border border-cyan-500 bg-cyan-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-cyan-700">
 <Radio size={15} /> Página Stream
 </Link>
 <Link href="/perfil" className="inline-flex items-center gap-2 border border-slate-300 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-600">
 <ChevronLeft size={15} /> Voltar
 </Link>
 </div>
 </div>

 <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
 <section className="space-y-4">
 <div className="border border-slate-200 bg-white p-4">
 <div className="mb-3 flex items-center justify-between gap-3">
 <div>
 <h2 className="text-sm font-black uppercase">Escolha suas atuações</h2>
 <p className="text-xs text-slate-500">Essas funções ajudam organizadores, equipes e lines a encontrar você.</p>
 </div>
 <div className="relative w-64">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
 <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar função" className="w-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-cyan-500" />
 </div>
 </div>

 <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
 {cargosFiltrados.map((cargo) => {
 const ativo = selecionados.has(cargo.key)
 const seloAutomatico = automáticos.find((a) => a.cargo === cargo.key)
 return (
 <button key={cargo.key} onClick={() => toggleCargo(cargo.key)} className={`min-h-[104px] border p-3 text-left transition ${ativo ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white hover:border-cyan-300'}`}>
 <div className="flex items-start justify-between gap-2">
 <div>
 <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{cargo.grupo}</div>
 <div className="mt-1 text-sm font-black uppercase">{cargo.label}</div>
 </div>
 <span className={`flex h-6 w-6 items-center justify-center border ${ativo ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
 <Check size={14} />
 </span>
 </div>
 <p className="mt-2 text-xs leading-relaxed text-slate-500">{cargo.desc}</p>
 {seloAutomatico ? <div className="mt-2 inline-flex items-center gap-1 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700"><BadgeCheck size={12} /> Selo verificado</div> : null}
 </button>
 )
 })}
 </div>
 </div>

 {cargosMidiaAtivos ? (
 <div className="border border-slate-200 bg-white p-4">
 <h2 className="text-sm font-black uppercase">Configuração Stream</h2>
 <p className="mb-4 text-xs text-slate-500">Aparece na página Stream para organizadores consultarem agenda e contratação.</p>
 <div className="grid gap-3 md:grid-cols-2">
 <label className="space-y-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Título profissional
 <input value={stream.titulo || ''} onChange={(e) => setStream({ ...stream, titulo: e.target.value })} placeholder="Ex: Narrador oficial de FF" className="mt-1 w-full border border-slate-200 p-3 text-xs font-semibold normal-case tracking-normal outline-none focus:border-cyan-500" />
 </label>
 <label className="space-y-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Valor base
 <input type="number" value={stream.valor_base || 0} onChange={(e) => setStream({ ...stream, valor_base: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 p-3 text-xs font-semibold normal-case tracking-normal outline-none focus:border-cyan-500" />
 </label>
 <label className="md:col-span-2 space-y-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Bio Stream
 <textarea value={stream.bio_stream || ''} onChange={(e) => setStream({ ...stream, bio_stream: e.target.value })} placeholder="Fale sobre experiência, estilo, eventos feitos..." className="mt-1 h-24 w-full border border-slate-200 p-3 text-xs font-semibold normal-case tracking-normal outline-none focus:border-cyan-500" />
 </label>
 <label className="space-y-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Setup / ferramentas
 <input value={stream.setup || ''} onChange={(e) => setStream({ ...stream, setup: e.target.value })} placeholder="OBS, vMix, Discord, microfone..." className="mt-1 w-full border border-slate-200 p-3 text-xs font-semibold normal-case tracking-normal outline-none focus:border-cyan-500" />
 </label>
 <label className="space-y-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Contato preferencial
 <input value={stream.contato_preferencial || ''} onChange={(e) => setStream({ ...stream, contato_preferencial: e.target.value })} placeholder="Discord, WhatsApp, Instagram..." className="mt-1 w-full border border-slate-200 p-3 text-xs font-semibold normal-case tracking-normal outline-none focus:border-cyan-500" />
 </label>
 </div>

 <div className="mt-4 flex flex-wrap gap-2">
 <button onClick={() => setStream({ ...stream, aceita_convites: !stream.aceita_convites })} className={`border px-3 py-2 text-[11px] font-bold uppercase ${stream.aceita_convites ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>Aceita convites</button>
 <button onClick={() => setStream({ ...stream, agenda_publica: !stream.agenda_publica })} className={`border px-3 py-2 text-[11px] font-bold uppercase ${stream.agenda_publica ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-500'}`}>Agenda pública</button>
 </div>
 </div>
 ) : null}
 </section>

 <aside className="space-y-4">
 <div className="border border-slate-200 bg-white p-4">
 <h3 className="flex items-center gap-2 text-sm font-black uppercase"><Shield size={16} className="text-emerald-600" /> Selos automáticos</h3>
 <p className="mt-1 text-xs text-slate-500">Gerados quando você é líder, coach, analista, moderador ou staff em eventos.</p>
 <div className="mt-3 space-y-2">
 {automáticos.length ? automáticos.map((a) => (
 <div key={a.id} className="flex items-center justify-between border border-emerald-100 bg-emerald-50 p-2 text-xs">
 <span className="font-black uppercase text-emerald-800">{a.cargo.replace('_', ' ')}</span>
 <BadgeCheck size={14} className="text-emerald-600" />
 </div>
 )) : <div className="border border-slate-200 p-3 text-xs font-semibold text-slate-500">Nenhum selo automático ainda.</div>}
 </div>
 </div>

 {cargosMidiaAtivos ? (
 <div className="border border-slate-200 bg-white p-4">
 <h3 className="flex items-center gap-2 text-sm font-black uppercase"><CalendarDays size={16} className="text-cyan-600" /> Agenda Stream</h3>
 <div className="mt-3 grid grid-cols-2 gap-2">
 <select value={novoHorario.dia_semana} onChange={(e) => setNovoHorario({ ...novoHorario, dia_semana: Number(e.target.value) })} className="border border-slate-200 p-2 text-xs font-bold">
 {DIAS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
 </select>
 <div className="grid grid-cols-2 gap-2">
 <input type="time" value={novoHorario.hora_inicio} onChange={(e) => setNovoHorario({ ...novoHorario, hora_inicio: e.target.value })} className="border border-slate-200 p-2 text-xs font-bold" />
 <input type="time" value={novoHorario.hora_fim} onChange={(e) => setNovoHorario({ ...novoHorario, hora_fim: e.target.value })} className="border border-slate-200 p-2 text-xs font-bold" />
 </div>
 <button onClick={adicionarHorario} className="col-span-2 bg-cyan-500 px-3 py-2 text-[11px] font-black uppercase text-white">Adicionar horário</button>
 </div>
 <div className="mt-3 space-y-2">
 {disponibilidade.map((d) => (
 <div key={d.id} className="flex items-center justify-between border border-slate-200 p-2 text-xs font-bold">
 <span>{DIAS.find((x) => x.id === d.dia_semana)?.label} • {d.hora_inicio.slice(0,5)} às {d.hora_fim.slice(0,5)}</span>
 <button onClick={() => removerHorario(d.id)} className="text-rose-500"><X size={14} /></button>
 </div>
 ))}
 {!disponibilidade.length ? <div className="border border-slate-200 p-3 text-xs font-semibold text-slate-500">Nenhum horário cadastrado.</div> : null}
 </div>
 </div>
 ) : null}

 <button onClick={salvar} disabled={salvando} className="flex w-full items-center justify-center gap-2 bg-cyan-500 px-4 py-4 text-[12px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60">
 <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar atuações'}
 </button>
 </aside>
 </div>
 </div>
 </div>
 )
}
