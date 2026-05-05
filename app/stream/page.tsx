'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  Mic2,
  MonitorPlay,
  Plus,
  Radio,
  Save,
  Search,
  Send,
  Settings,
  Star,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react'

type Profissional = {
  user_id: string
  username: string | null
  nome_exibicao: string | null
  foto_url: string | null
  bio: string | null
  cidade: string | null
  estado: string | null
  pais: string | null
  titulo_stream: string | null
  bio_stream: string | null
  valor_base: number | null
  valor_hora: number | null
  valor_evento: number | null
  aceita_convites: boolean | null
  agenda_publica: boolean | null
  setup: string | null
  experiencia: string | null
  equipamentos: string | null
  portfolio_url: string | null
  contato_preferencial: string | null
  whatsapp: string | null
  discord: string | null
  disponibilidade_obs: string | null
  aceita_remoto: boolean | null
  aceita_presencial: boolean | null
  cargos: string[] | null
  tem_selo_verificado: boolean | null
  total_selos: number | null
}

type Disp = {
  id: string
  user_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  ativo: boolean
}

type MeuCadastro = {
  titulo: string
  bio_stream: string
  valor_base: number
  valor_hora: number
  valor_evento: number
  aceita_convites: boolean
  agenda_publica: boolean
  aceita_remoto: boolean
  aceita_presencial: boolean
  setup: string
  experiencia: string
  equipamentos: string
  portfolio_url: string
  contato_preferencial: string
  whatsapp: string
  discord: string
  disponibilidade_obs: string
}

const CARGOS_STREAM = [
  { key: 'todos', label: 'Todos' },
  { key: 'narrador', label: 'Narradores' },
  { key: 'comentarista', label: 'Comentaristas' },
  { key: 'apresentador', label: 'Apresentadores' },
  { key: 'produtor', label: 'Produtores' },
  { key: 'streamer', label: 'Streamers' },
]

const CARGOS_CADASTRO = [
  { key: 'narrador', label: 'Narrador' },
  { key: 'comentarista', label: 'Comentarista' },
  { key: 'apresentador', label: 'Apresentador' },
  { key: 'produtor', label: 'Produtor' },
  { key: 'streamer', label: 'Streamer' },
]

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function dinheiro(v?: number | null) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function cargoLabel(cargo: string) {
  const map: Record<string, string> = {
    narrador: 'Narrador',
    comentarista: 'Comentarista',
    apresentador: 'Apresentador',
    produtor: 'Produtor',
    streamer: 'Streamer',
    coach: 'Coach',
    analista: 'Analista',
    manager: 'Manager',
    lider_equipe: 'Líder',
  }
  return map[cargo] || cargo.replace('_', ' ')
}


function cargoVisual(cargo?: string | null) {
  const key = String(cargo || '').toLowerCase()
  const map: Record<string, { icon: string; label: string; cls: string }> = {
    narrador: { icon: '🎙️', label: 'Narrador', cls: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
    comentarista: { icon: '🧠', label: 'Comentarista', cls: 'border-violet-200 bg-violet-50 text-violet-700' },
    apresentador: { icon: '📺', label: 'Apresentador', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
    produtor: { icon: '🎬', label: 'Produtor', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    streamer: { icon: '📡', label: 'Streamer', cls: 'border-rose-200 bg-rose-50 text-rose-700' },
  }
  return map[key] || { icon: '⭐', label: cargoLabel(key || 'profissional'), cls: 'border-slate-200 bg-slate-50 text-slate-600' }
}

function normalizarCargoPrincipal(valor?: string | null) {
  const v = String(valor || '').toLowerCase()
  if (v.includes('narrador')) return 'narrador'
  if (v.includes('comentarista')) return 'comentarista'
  if (v.includes('apresentador')) return 'apresentador'
  if (v.includes('produtor')) return 'produtor'
  if (v.includes('streamer')) return 'streamer'
  return v || ''
}


const inputClass = 'w-full border border-slate-200 bg-white p-3 text-sm font-semibold outline-none focus:border-cyan-500'
const labelClass = 'text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'

export default function StreamPage() {
  const [aba, setAba] = useState<'marketplace' | 'cadastro' | 'solicitacoes'>('marketplace')
  const [userId, setUserId] = useState<string | null>(null)
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [disponibilidades, setDisponibilidades] = useState<Disp[]>([])
  const [minhasDisponibilidades, setMinhasDisponibilidades] = useState<Disp[]>([])
  const [meusCargos, setMeusCargos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [cargo, setCargo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<Profissional | null>(null)
  const [modal, setModal] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [novaDisp, setNovaDisp] = useState({ dia_semana: 1, hora_inicio: '19:00', hora_fim: '23:00' })
  const [form, setForm] = useState({
    titulo_evento: '',
    cargo: 'narrador',
    data_inicio: '',
    data_fim: '',
    quantidade_quedas: 6,
    valor_proposto: 0,
    valor_total_estimado: 0,
    modalidade: 'remoto',
    dias_evento: '',
    observacoes: '',
  })
  const [cadastro, setCadastro] = useState<MeuCadastro>({
    titulo: '',
    bio_stream: '',
    valor_base: 0,
    valor_hora: 0,
    valor_evento: 0,
    aceita_convites: true,
    agenda_publica: true,
    aceita_remoto: true,
    aceita_presencial: false,
    setup: '',
    experiencia: '',
    equipamentos: '',
    portfolio_url: '',
    contato_preferencial: '',
    whatsapp: '',
    discord: '',
    disponibilidade_obs: '',
  })

  useEffect(() => {
    carregarTudo()
  }, [])

  async function carregarTudo() {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth?.user?.id || null
    setUserId(uid)

    await carregarMarketplace()
    if (uid) await carregarMeuCadastro(uid)
    setLoading(false)
  }

  async function carregarMarketplace() {
    const { data } = await supabase
      .from('vw_lealt_profissionais')
      .select('*')
      .overlaps('cargos', ['narrador', 'comentarista', 'apresentador', 'produtor', 'streamer'])
      .order('total_selos', { ascending: false })

    const lista = (data || []) as Profissional[]
    setProfissionais(lista)

    const ids = lista.map((p) => p.user_id)
    if (ids.length) {
      const { data: disp } = await supabase
        .from('lealt_stream_disponibilidade')
        .select('*')
        .in('user_id', ids)
        .eq('ativo', true)
        .order('dia_semana', { ascending: true })
        .order('hora_inicio', { ascending: true })
      setDisponibilidades((disp || []) as Disp[])
    } else {
      setDisponibilidades([])
    }
  }

  async function carregarMeuCadastro(uid: string) {
    const { data: prof } = await supabase
      .from('lealt_stream_profissionais')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()

    if (prof) {
      setCadastro({
        titulo: prof.titulo || '',
        bio_stream: prof.bio_stream || '',
        valor_base: Number(prof.valor_base || 0),
        valor_hora: Number(prof.valor_hora || 0),
        valor_evento: Number(prof.valor_evento || 0),
        aceita_convites: prof.aceita_convites ?? true,
        agenda_publica: prof.agenda_publica ?? true,
        aceita_remoto: prof.aceita_remoto ?? true,
        aceita_presencial: prof.aceita_presencial ?? false,
        setup: prof.setup || '',
        experiencia: prof.experiencia || '',
        equipamentos: prof.equipamentos || '',
        portfolio_url: prof.portfolio_url || '',
        contato_preferencial: prof.contato_preferencial || '',
        whatsapp: prof.whatsapp || '',
        discord: prof.discord || '',
        disponibilidade_obs: prof.disponibilidade_obs || '',
      })
    }

    const { data: atuacoes } = await supabase
      .from('lealt_usuario_atuacoes')
      .select('cargo')
      .eq('user_id', uid)
      .eq('origem', 'declarado')
      .eq('status', 'ativo')
      .in('cargo', CARGOS_CADASTRO.map((c) => c.key))

    setMeusCargos((atuacoes || []).map((a: any) => a.cargo))

    const { data: disp } = await supabase
      .from('lealt_stream_disponibilidade')
      .select('*')
      .eq('user_id', uid)
      .eq('ativo', true)
      .order('dia_semana', { ascending: true })
      .order('hora_inicio', { ascending: true })

    setMinhasDisponibilidades((disp || []) as Disp[])
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return profissionais.filter((p) => {
      const cargos = p.cargos || []
      const passaCargo = cargo === 'todos' || cargos.includes(cargo)
      const texto = `${p.nome_exibicao || ''} ${p.username || ''} ${p.titulo_stream || ''} ${p.bio_stream || ''} ${p.experiencia || ''} ${p.equipamentos || ''} ${cargos.join(' ')}`.toLowerCase()
      return passaCargo && (!termo || texto.includes(termo))
    })
  }, [profissionais, cargo, busca])

  function agendaDo(uid: string) {
    return disponibilidades.filter((d) => d.user_id === uid).slice(0, 5)
  }

  function toggleCargo(c: string) {
    setMeusCargos((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  async function salvarCadastro() {
    if (!userId) {
      alert('Entre na sua conta para cadastrar seu perfil de stream.')
      return
    }
    if (!meusCargos.length) {
      alert('Selecione pelo menos uma função.')
      return
    }
    setSalvando(true)

    const { error: profError } = await supabase.from('lealt_stream_profissionais').upsert({
      user_id: userId,
      titulo: cadastro.titulo,
      bio_stream: cadastro.bio_stream,
      valor_base: Number(cadastro.valor_base || 0),
      valor_hora: Number(cadastro.valor_hora || 0),
      valor_evento: Number(cadastro.valor_evento || 0),
      aceita_convites: cadastro.aceita_convites,
      agenda_publica: cadastro.agenda_publica,
      aceita_remoto: cadastro.aceita_remoto,
      aceita_presencial: cadastro.aceita_presencial,
      setup: cadastro.setup,
      experiencia: cadastro.experiencia,
      equipamentos: cadastro.equipamentos,
      portfolio_url: cadastro.portfolio_url,
      contato_preferencial: cadastro.contato_preferencial,
      whatsapp: cadastro.whatsapp,
      discord: cadastro.discord,
      disponibilidade_obs: cadastro.disponibilidade_obs,
      updated_at: new Date().toISOString(),
    })

    if (profError) {
      setSalvando(false)
      alert(profError.message)
      return
    }

    await supabase
      .from('lealt_usuario_atuacoes')
      .delete()
      .eq('user_id', userId)
      .eq('origem', 'declarado')
      .in('cargo', CARGOS_CADASTRO.map((c) => c.key))

    const inserts = meusCargos.map((cargoAtual) => ({
      user_id: userId,
      cargo: cargoAtual,
      origem: 'declarado',
      origem_tipo: 'stream',
      status: 'ativo',
      verificado: false,
      publico: true,
    }))

    const { error: atuacaoError } = await supabase.from('lealt_usuario_atuacoes').insert(inserts)
    setSalvando(false)

    if (atuacaoError) {
      alert(atuacaoError.message)
      return
    }

    alert('Cadastro de stream salvo.')
    await carregarTudo()
  }

  async function adicionarHorario() {
    if (!userId) {
      alert('Entre na sua conta.')
      return
    }
    const { error } = await supabase.from('lealt_stream_disponibilidade').insert({
      user_id: userId,
      dia_semana: Number(novaDisp.dia_semana),
      hora_inicio: novaDisp.hora_inicio,
      hora_fim: novaDisp.hora_fim,
      ativo: true,
    })
    if (error) {
      alert(error.message)
      return
    }
    await carregarMeuCadastro(userId)
  }

  async function removerHorario(id: string) {
    if (!userId) return
    const { error } = await supabase.from('lealt_stream_disponibilidade').delete().eq('id', id).eq('user_id', userId)
    if (error) {
      alert(error.message)
      return
    }
    await carregarMeuCadastro(userId)
  }

  function abrirContratar(p: Profissional, cargoEscolhido?: string) {
    setSelecionado(p)
    const primeiroCargo = cargoEscolhido || (p.cargos || []).find((c) => ['narrador', 'comentarista', 'apresentador', 'produtor', 'streamer'].includes(c)) || 'narrador'
    setForm({
      titulo_evento: '',
      cargo: primeiroCargo,
      data_inicio: '',
      data_fim: '',
      quantidade_quedas: 6,
      valor_proposto: Number(p.valor_base || 0),
      valor_total_estimado: Number(p.valor_base || 0) * 6,
      modalidade: p.aceita_presencial ? 'presencial' : 'remoto',
      dias_evento: '',
      observacoes: '',
    })
    setModal(true)
  }

  async function enviarSolicitacao() {
    if (!selecionado) return
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth?.user?.id
    if (!uid) {
      alert('Entre na sua conta para enviar solicitação.')
      return
    }
    setEnviando(true)
    const { error } = await supabase.from('lealt_stream_solicitacoes').insert({
      organizador_user_id: uid,
      profissional_user_id: selecionado.user_id,
      cargo: form.cargo,
      titulo_evento: form.titulo_evento,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      quantidade_quedas: Number(form.quantidade_quedas || 0),
      valor_por_queda: Number(form.valor_proposto || 0),
      valor_proposto: Number(form.valor_total_estimado || (Number(form.quantidade_quedas || 0) * Number(form.valor_proposto || 0))),
      modalidade: form.modalidade,
      dias_evento: form.dias_evento,
      observacoes: form.observacoes,
    })
    setEnviando(false)
    if (error) {
      alert(error.message)
      return
    }
    setModal(false)
    alert('Solicitação enviada para o profissional.')
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-[#142340]">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-600"><Radio size={15} /> Stream</div>
              <h1 className="mt-1 text-3xl font-black uppercase tracking-tight">Marketplace de narradores</h1>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-500">Narradores, comentaristas e apresentadores com agenda, valor por queda, orçamento automático e solicitação direta para eventos.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setAba('marketplace')} className={`border px-4 py-3 text-[11px] font-black uppercase tracking-wide ${aba === 'marketplace' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-500'}`}>Marketplace</button>
              <button onClick={() => setAba('cadastro')} className={`border px-4 py-3 text-[11px] font-black uppercase tracking-wide ${aba === 'cadastro' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-500'}`}>Meu cadastro</button>
              <Link href="/perfil/atuacao" className="border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Selos</Link>
            </div>
          </div>
        </section>

        {aba === 'marketplace' ? (
          <>
            <section className="grid gap-3 border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_260px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, função, experiência ou equipamento" className="w-full border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-cyan-500" />
              </div>
              <div className="flex items-center gap-2 border border-slate-200 bg-white px-3">
                <Filter size={15} className="text-slate-400" />
                <select value={cargo} onChange={(e) => setCargo(e.target.value)} className="h-full flex-1 bg-transparent text-xs font-black uppercase outline-none">
                  {CARGOS_STREAM.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <button onClick={carregarMarketplace} className="border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Atualizar lista</button>
            </section>

            {loading ? <div className="border border-slate-200 bg-white p-8 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Carregando profissionais...</div> : null}

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtrados.map((p) => {
                const agenda = agendaDo(p.user_id)
                const cargos = (p.cargos || []).filter((c) => ['narrador', 'comentarista', 'apresentador', 'produtor', 'streamer'].includes(c))
                const principal = normalizarCargoPrincipal(p.titulo_stream) || cargos[0] || 'profissional'
                const visual = cargoVisual(principal)
                return (
                  <article key={p.user_id} className="group border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-slate-200 bg-slate-50">
                        {p.foto_url ? <Image src={p.foto_url} alt={p.nome_exibicao || 'Profissional'} fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-400"><UserRound size={26} /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1">
                          <span className={`border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${visual.cls}`}>{visual.icon} {visual.label}</span>
                          {p.tem_selo_verificado ? <span className="flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700"><CheckCircle2 size={12} /> Verificado</span> : null}
                        </div>
                        <div className="flex items-center gap-1">
                          <h2 className="truncate text-lg font-black uppercase">{p.nome_exibicao || p.username || 'Profissional'}</h2>
                        </div>
                        <p className="truncate text-xs font-semibold text-slate-500">{p.bio_stream || p.bio || 'Profissional cadastrado na plataforma.'}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cargos.map((c) => {
                            const v = cargoVisual(c)
                            return <span key={c} className={`border px-2 py-1 text-[10px] font-black uppercase ${v.cls}`}>{v.icon} {v.label}</span>
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="border border-slate-200 p-3">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400"><Wallet size={11} /> Queda</div>
                        <div className="mt-1 text-xs font-black">{dinheiro(p.valor_base)}</div>
                      </div>
                      <div className="border border-slate-200 p-3">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400"><Clock size={11} /> Evento</div>
                        <div className="mt-1 text-xs font-black">{dinheiro(p.valor_evento)}</div>
                      </div>
                      <div className="border border-slate-200 p-3">
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400"><MonitorPlay size={11} /> Evento</div>
                        <div className="mt-1 text-xs font-black">{dinheiro(p.valor_evento)}</div>
                      </div>
                    </div>

                    <div className="mt-3 border border-slate-200 p-3">
                      <div className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><CalendarDays size={12} /> Agenda</div>
                      {agenda.length ? (
                        <div className="grid gap-1">
                          {agenda.map((d) => <div key={d.id} className="flex justify-between bg-slate-50 px-2 py-1 text-[11px] font-bold"><span>{DIAS[d.dia_semana]}</span><span>{d.hora_inicio.slice(0, 5)} - {d.hora_fim.slice(0, 5)}</span></div>)}
                        </div>
                      ) : <div className="text-xs font-semibold text-slate-400">Agenda ainda não cadastrada.</div>}
                      {p.disponibilidade_obs ? <p className="mt-2 text-[11px] font-semibold text-slate-500">{p.disponibilidade_obs}</p> : null}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-[0.14em]">
                      <div className={`border px-3 py-2 ${p.aceita_remoto ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400'}`}>Remoto</div>
                      <div className={`border px-3 py-2 ${p.aceita_presencial ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400'}`}>Presencial</div>
                    </div>

                    <button onClick={() => abrirContratar(p)} disabled={!p.aceita_convites} className="mt-3 flex w-full items-center justify-center gap-2 bg-cyan-500 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:bg-slate-300">
                      <Send size={14} /> Solicitar para evento
                    </button>
                  </article>
                )
              })}
            </section>

            {!loading && !filtrados.length ? <div className="border border-slate-200 bg-white p-10 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Nenhum profissional encontrado.</div> : null}
          </>
        ) : null}

        {aba === 'cadastro' ? (
          <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600"><Mic2 size={15} /> Cadastro profissional</div>
                <h2 className="mt-1 text-2xl font-black uppercase">Meu perfil stream</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Preencha suas funções, valores, experiência, setup e horários disponíveis.</p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <label className={`${labelClass} md:col-span-2`}>Tipo principal do profissional
                    <select
                      value={normalizarCargoPrincipal(cadastro.titulo)}
                      onChange={(e) => {
                        const valor = e.target.value
                        setCadastro({
                          ...cadastro,
                          titulo: valor,
                        })
                        if (valor && !meusCargos.includes(valor)) {
                          setMeusCargos((prev) => [...prev, valor])
                        }
                      }}
                      className={`${inputClass} mt-1 normal-case tracking-normal`}
                    >
                      <option value="">Selecione o tipo principal</option>
                      <option value="narrador">🎙️ Narrador</option>
                      <option value="comentarista">🧠 Comentarista</option>
                      <option value="apresentador">📺 Apresentador</option>
                    </select>
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>Descrição / bio stream
                    <textarea value={cadastro.bio_stream} onChange={(e) => setCadastro({ ...cadastro, bio_stream: e.target.value })} className={`${inputClass} mt-1 h-24 normal-case tracking-normal`} placeholder="Fale sobre sua experiência, estilo de narração, eventos que já fez..." />
                  </label>
                  <label className={labelClass}>Valor por queda
                    <input type="number" value={cadastro.valor_base} onChange={(e) => setCadastro({ ...cadastro, valor_base: Number(e.target.value) })} className={`${inputClass} mt-1 normal-case tracking-normal`} />
                  </label>
                  <label className={labelClass}>Valor mínimo por evento
                    <input type="number" value={cadastro.valor_evento} onChange={(e) => setCadastro({ ...cadastro, valor_evento: Number(e.target.value) })} className={`${inputClass} mt-1 normal-case tracking-normal`} />
                  </label>
                  <label className={labelClass}>Valor pacote/diária
                    <input type="number" value={cadastro.valor_hora} onChange={(e) => setCadastro({ ...cadastro, valor_hora: Number(e.target.value) })} className={`${inputClass} mt-1 normal-case tracking-normal`} />
                  </label>
                  <label className={labelClass}>Contato preferencial
                    <input value={cadastro.contato_preferencial} onChange={(e) => setCadastro({ ...cadastro, contato_preferencial: e.target.value })} placeholder="WhatsApp, Discord ou Instagram" className={`${inputClass} mt-1 normal-case tracking-normal`} />
                  </label>
                  <label className={labelClass}>WhatsApp
                    <input value={cadastro.whatsapp} onChange={(e) => setCadastro({ ...cadastro, whatsapp: e.target.value })} className={`${inputClass} mt-1 normal-case tracking-normal`} />
                  </label>
                  <label className={labelClass}>Discord
                    <input value={cadastro.discord} onChange={(e) => setCadastro({ ...cadastro, discord: e.target.value })} className={`${inputClass} mt-1 normal-case tracking-normal`} />
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>Portfólio / link público
                    <input value={cadastro.portfolio_url} onChange={(e) => setCadastro({ ...cadastro, portfolio_url: e.target.value })} placeholder="YouTube, Instagram, Drive com trabalhos, etc." className={`${inputClass} mt-1 normal-case tracking-normal`} />
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>Experiência
                    <textarea value={cadastro.experiencia} onChange={(e) => setCadastro({ ...cadastro, experiencia: e.target.value })} className={`${inputClass} mt-1 h-20 normal-case tracking-normal`} />
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>Equipamentos / setup
                    <textarea value={cadastro.equipamentos} onChange={(e) => setCadastro({ ...cadastro, equipamentos: e.target.value })} className={`${inputClass} mt-1 h-20 normal-case tracking-normal`} placeholder="Microfone, mesa, PC, internet, câmera, software..." />
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>Observação de disponibilidade
                    <textarea value={cadastro.disponibilidade_obs} onChange={(e) => setCadastro({ ...cadastro, disponibilidade_obs: e.target.value })} className={`${inputClass} mt-1 h-20 normal-case tracking-normal`} placeholder="Ex: disponível para finais aos domingos, avisar com 2 dias de antecedência..." />
                  </label>
                </div>
              </div>

              <div className="border border-slate-200 bg-white p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600">Funções</div>
                <div className="mt-3 grid gap-2 md:grid-cols-5">
                  {CARGOS_CADASTRO.map((c) => (
                    <button key={c.key} onClick={() => toggleCargo(c.key)} className={`border px-3 py-3 text-[11px] font-black uppercase ${meusCargos.includes(c.key) ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-500'}`}>{c.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="border border-slate-200 bg-white p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600">Configurações</div>
                <div className="mt-3 grid gap-2">
                  <label className="flex items-center justify-between border border-slate-200 p-3 text-xs font-bold"><span>Aceita convites</span><input type="checkbox" checked={cadastro.aceita_convites} onChange={(e) => setCadastro({ ...cadastro, aceita_convites: e.target.checked })} /></label>
                  <label className="flex items-center justify-between border border-slate-200 p-3 text-xs font-bold"><span>Agenda pública</span><input type="checkbox" checked={cadastro.agenda_publica} onChange={(e) => setCadastro({ ...cadastro, agenda_publica: e.target.checked })} /></label>
                  <label className="flex items-center justify-between border border-slate-200 p-3 text-xs font-bold"><span>Atende remoto</span><input type="checkbox" checked={cadastro.aceita_remoto} onChange={(e) => setCadastro({ ...cadastro, aceita_remoto: e.target.checked })} /></label>
                  <label className="flex items-center justify-between border border-slate-200 p-3 text-xs font-bold"><span>Atende presencial</span><input type="checkbox" checked={cadastro.aceita_presencial} onChange={(e) => setCadastro({ ...cadastro, aceita_presencial: e.target.checked })} /></label>
                </div>
                <button onClick={salvarCadastro} disabled={salvando} className="mt-4 flex w-full items-center justify-center gap-2 bg-cyan-500 px-4 py-4 text-[12px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-50"><Save size={15} /> {salvando ? 'Salvando...' : 'Salvar cadastro'}</button>
              </div>

              <div className="border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600"><CalendarDays size={14} /> Agenda semanal</div>
                <div className="mt-3 grid gap-2">
                  <select value={novaDisp.dia_semana} onChange={(e) => setNovaDisp({ ...novaDisp, dia_semana: Number(e.target.value) })} className={inputClass}>
                    {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="time" value={novaDisp.hora_inicio} onChange={(e) => setNovaDisp({ ...novaDisp, hora_inicio: e.target.value })} className={inputClass} />
                    <input type="time" value={novaDisp.hora_fim} onChange={(e) => setNovaDisp({ ...novaDisp, hora_fim: e.target.value })} className={inputClass} />
                  </div>
                  <button onClick={adicionarHorario} className="flex items-center justify-center gap-2 border border-cyan-500 bg-cyan-50 px-3 py-3 text-[11px] font-black uppercase text-cyan-700"><Plus size={14} /> Adicionar horário</button>
                </div>
                <div className="mt-4 grid gap-1">
                  {minhasDisponibilidades.map((d) => (
                    <div key={d.id} className="flex items-center justify-between border border-slate-200 px-3 py-2 text-xs font-bold">
                      <span>{DIAS[d.dia_semana]} • {d.hora_inicio.slice(0, 5)} - {d.hora_fim.slice(0, 5)}</span>
                      <button onClick={() => removerHorario(d.id)} className="text-rose-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {!minhasDisponibilidades.length ? <div className="py-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Nenhum horário cadastrado</div> : null}
                </div>
              </div>
            </aside>
          </section>
        ) : null}
      </div>

      {modal && selecionado ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600">Contratação Stream</div>
                <h3 className="text-xl font-black uppercase">{selecionado.nome_exibicao || selecionado.username}</h3>
              </div>
              <button onClick={() => setModal(false)} className="border border-slate-200 px-3 py-2 text-xs font-bold">Fechar</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className={`${labelClass} md:col-span-2`}>Título do evento
                <input value={form.titulo_evento} onChange={(e) => setForm({ ...form, titulo_evento: e.target.value })} className={`${inputClass} mt-1 normal-case tracking-normal`} />
              </label>
              <label className={labelClass}>Cargo
                <select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className={`${inputClass} mt-1 normal-case tracking-normal`}>
                  {['narrador', 'comentarista', 'apresentador', 'produtor', 'streamer'].map((c) => <option key={c} value={c}>{cargoLabel(c)}</option>)}
                </select>
              </label>
              <label className={labelClass}>Modalidade
                <select value={form.modalidade} onChange={(e) => setForm({ ...form, modalidade: e.target.value })} className={`${inputClass} mt-1 normal-case tracking-normal`}>
                  <option value="remoto">Remoto</option>
                  <option value="presencial">Presencial</option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </label>
              <label className={labelClass}>Quantidade de quedas
                <input
                  type="number"
                  min={1}
                  value={form.quantidade_quedas}
                  onChange={(e) => {
                    const qtd = Number(e.target.value || 0)
                    const valorQueda = Number(form.valor_proposto || 0)
                    setForm({ ...form, quantidade_quedas: qtd, valor_total_estimado: qtd * valorQueda })
                  }}
                  className={`${inputClass} mt-1 normal-case tracking-normal`}
                />
              </label>
              <label className={labelClass}>Valor por queda
                <input
                  type="number"
                  value={form.valor_proposto}
                  onChange={(e) => {
                    const valorQueda = Number(e.target.value || 0)
                    const qtd = Number(form.quantidade_quedas || 0)
                    setForm({ ...form, valor_proposto: valorQueda, valor_total_estimado: qtd * valorQueda })
                  }}
                  className={`${inputClass} mt-1 normal-case tracking-normal`}
                />
              </label>
              <div className="border border-emerald-200 bg-emerald-50 p-3 md:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Orçamento automático</div>
                <div className="mt-1 text-2xl font-black text-emerald-700">{dinheiro(form.valor_total_estimado || (Number(form.quantidade_quedas || 0) * Number(form.valor_proposto || 0)))}</div>
                <div className="mt-1 text-[11px] font-bold text-emerald-700">
                  {Number(form.quantidade_quedas || 0)} queda(s) × {dinheiro(form.valor_proposto)}
                </div>
              </div>
              <label className={labelClass}>Dias do evento
                <input value={form.dias_evento} onChange={(e) => setForm({ ...form, dias_evento: e.target.value })} placeholder="Ex: 12/05 e 13/05" className={`${inputClass} mt-1 normal-case tracking-normal`} />
              </label>
              <label className={labelClass}>Início
                <input type="datetime-local" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} className={`${inputClass} mt-1 normal-case tracking-normal`} />
              </label>
              <label className={labelClass}>Fim
                <input type="datetime-local" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} className={`${inputClass} mt-1 normal-case tracking-normal`} />
              </label>
              <label className={`${labelClass} md:col-span-2`}>Observações
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className={`${inputClass} mt-1 h-24 normal-case tracking-normal`} />
              </label>
            </div>
            <button onClick={enviarSolicitacao} disabled={enviando || !form.titulo_evento || !form.data_inicio || !form.data_fim} className="mt-4 flex w-full items-center justify-center gap-2 bg-cyan-500 px-4 py-4 text-[12px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-50">
              <Send size={15} /> {enviando ? 'Enviando...' : 'Enviar solicitação'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
