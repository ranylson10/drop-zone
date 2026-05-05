'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminTabs from './components/AdminTabs'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BarChart3,
  FileSearch,
  Gavel,
  Loader2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react'

type Periodo = 7 | 30 | 90

type Counts = {
  usuarios: number
  campeonatos: number
  denunciasAbertas: number
  denunciasCriticas: number
  alertasAltos: number
  bloqueiosAtivos: number
  logsHoje: number
  saquesPendentes: number
  confrontosAbertos: number
}

type MetricCard = {
  titulo: string
  valor: number
  anterior: number
  href: string
  icon: any
  destaque?: boolean
}

type SeriePonto = { label: string; valor: number; extra?: number }

type DashboardSeries = {
  usuarios: SeriePonto[]
  campeonatos: SeriePonto[]
  denuncias: SeriePonto[]
  denunciasResolvidas: SeriePonto[]
  confrontos: SeriePonto[]
  confrontosFinalizados: SeriePonto[]
  alertas: SeriePonto[]
  logs: SeriePonto[]
  financeiro: SeriePonto[]
}

const vazio: Counts = {
  usuarios: 0,
  campeonatos: 0,
  denunciasAbertas: 0,
  denunciasCriticas: 0,
  alertasAltos: 0,
  bloqueiosAtivos: 0,
  logsHoje: 0,
  saquesPendentes: 0,
  confrontosAbertos: 0,
}

const seriesVazias: DashboardSeries = {
  usuarios: [],
  campeonatos: [],
  denuncias: [],
  denunciasResolvidas: [],
  confrontos: [],
  confrontosFinalizados: [],
  alertas: [],
  logs: [],
  financeiro: [],
}

function inicioDoDia(d = new Date()) {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

function addDias(d: Date, dias: number) {
  const n = new Date(d)
  n.setDate(n.getDate() + dias)
  return n
}

function iso(d: Date) {
  return d.toISOString()
}

function labelData(d: Date, periodo: Periodo) {
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  if (periodo <= 30) return `${dia}/${mes}`
  return `${dia}/${mes}`
}

function criarBuckets(periodo: Periodo) {
  const hoje = inicioDoDia()
  const start = addDias(hoje, -(periodo - 1))
  const buckets: Record<string, SeriePonto> = {}
  for (let i = 0; i < periodo; i++) {
    const d = addDias(start, i)
    const key = d.toISOString().slice(0, 10)
    buckets[key] = { label: labelData(d, periodo), valor: 0, extra: 0 }
  }
  return { start, buckets }
}

function montarSerie(rows: any[], campoData: string, periodo: Periodo, filtro?: (row: any) => boolean, campoSoma?: string) {
  const { buckets } = criarBuckets(periodo)
  rows.forEach((row) => {
    if (filtro && !filtro(row)) return
    const valorData = row?.[campoData]
    if (!valorData) return
    const key = new Date(valorData).toISOString().slice(0, 10)
    if (!buckets[key]) return
    const soma = campoSoma ? Number(row?.[campoSoma] || 0) : 1
    buckets[key].valor += Number.isFinite(soma) ? soma : 0
  })
  return Object.values(buckets)
}

async function contar(tabela: string, query?: (q: any) => any) {
  try {
    let q = supabase.from(tabela).select('id', { count: 'exact', head: true })
    if (query) q = query(q)
    const { count } = await q
    return count || 0
  } catch {
    return 0
  }
}

async function contarPeriodo(tabela: string, dias: Periodo, query?: (q: any) => any) {
  const fimAtual = new Date()
  const inicioAtual = addDias(fimAtual, -dias)
  const inicioAnterior = addDias(inicioAtual, -dias)

  const atual = await contar(tabela, (q) => {
    let base = q.gte('created_at', iso(inicioAtual)).lte('created_at', iso(fimAtual))
    return query ? query(base) : base
  })

  const anterior = await contar(tabela, (q) => {
    let base = q.gte('created_at', iso(inicioAnterior)).lt('created_at', iso(inicioAtual))
    return query ? query(base) : base
  })

  return { atual, anterior }
}

async function buscarRows(tabela: string, select: string, desde: string, orderCampo = 'created_at') {
  try {
    const { data, error } = await supabase
      .from(tabela)
      .select(select)
      .gte(orderCampo, desde)
      .order(orderCampo, { ascending: true })
      .limit(5000)
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

function variacao(atual: number, anterior: number) {
  if (!anterior && atual > 0) return 100
  if (!anterior) return 0
  return Math.round(((atual - anterior) / anterior) * 100)
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>(30)
  const [counts, setCounts] = useState<Counts>(vazio)
  const [comparativos, setComparativos] = useState<Record<string, { atual: number; anterior: number }>>({})
  const [series, setSeries] = useState<DashboardSeries>(seriesVazias)

  useEffect(() => {
    carregar()
  }, [router, periodo])

  async function carregar() {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user

    if (!user) {
      router.push('/login')
      return
    }

    const { data: admin } = await supabase
      .from('site_administradores')
      .select('id')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .limit(1)

    if (!admin || admin.length === 0) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    setAutorizado(true)

    const hoje = inicioDoDia()
    const desde = iso(addDias(hoje, -(periodo - 1)))

    const [
      usuarios,
      campeonatos,
      denunciasAbertas,
      denunciasCriticas,
      alertasAltos,
      bloqueiosAtivos,
      logsHoje,
      saquesPendentes,
      confrontosAbertos,
      cmpUsuarios,
      cmpCampeonatos,
      cmpDenuncias,
      cmpAlertas,
      cmpLogs,
      cmpConfrontos,
      rowsUsuarios,
      rowsCampeonatos,
      rowsDenuncias,
      rowsConfrontos,
      rowsAlertas,
      rowsLogs,
      rowsFinanceiro,
    ] = await Promise.all([
      contar('profiles'),
      contar('campeonatos'),
      contar('denuncias_campeonato', (q) => q.in('status', ['aberta', 'em_analise', 'aguardando_resposta_usuario', 'aguardando_resposta_organizacao'])),
      contar('denuncias_campeonato', (q) => q.eq('prioridade', 'critica').in('status', ['aberta', 'em_analise'])),
      contar('antifraude_alertas', (q) => q.eq('nivel', 'alto')),
      contar('antifraude_bloqueios', (q) => q.eq('ativo', true)),
      contar('audit_logs', (q) => q.gte('created_at', hoje.toISOString())),
      contar('wallet_saques', (q) => q.in('status', ['pendente', 'em_analise'])),
      contar('confrontos_apostados', (q) => q.in('status', ['aberto', 'aguardando_oponente', 'aguardando_pagamento', 'pronto', 'em_jogo', 'aguardando_resultado', 'aguardando_validacao'])),
      contarPeriodo('profiles', periodo),
      contarPeriodo('campeonatos', periodo),
      contarPeriodo('denuncias_campeonato', periodo),
      contarPeriodo('antifraude_alertas', periodo),
      contarPeriodo('audit_logs', periodo),
      contarPeriodo('confrontos_apostados', periodo),
      buscarRows('profiles', 'id, created_at', desde),
      buscarRows('campeonatos', 'id, created_at', desde),
      buscarRows('denuncias_campeonato', 'id, created_at, status, resolvida_em', desde),
      buscarRows('confrontos_apostados', 'id, created_at, status, finalizado_em', desde),
      buscarRows('antifraude_alertas', 'id, created_at, nivel', desde),
      buscarRows('audit_logs', 'id, created_at, risco, entidade', desde),
      buscarRows('wallet_transacoes', 'id, created_at, valor, tipo', desde),
    ])

    setCounts({ usuarios, campeonatos, denunciasAbertas, denunciasCriticas, alertasAltos, bloqueiosAtivos, logsHoje, saquesPendentes, confrontosAbertos })
    setComparativos({ usuarios: cmpUsuarios, campeonatos: cmpCampeonatos, denuncias: cmpDenuncias, alertas: cmpAlertas, logs: cmpLogs, confrontos: cmpConfrontos })
    setSeries({
      usuarios: montarSerie(rowsUsuarios, 'created_at', periodo),
      campeonatos: montarSerie(rowsCampeonatos, 'created_at', periodo),
      denuncias: montarSerie(rowsDenuncias, 'created_at', periodo),
      denunciasResolvidas: montarSerie(rowsDenuncias, 'resolvida_em', periodo),
      confrontos: montarSerie(rowsConfrontos, 'created_at', periodo),
      confrontosFinalizados: montarSerie(rowsConfrontos, 'finalizado_em', periodo),
      alertas: montarSerie(rowsAlertas, 'created_at', periodo),
      logs: montarSerie(rowsLogs, 'created_at', periodo, (r) => r.risco === 'alto'),
      financeiro: montarSerie(rowsFinanceiro, 'created_at', periodo, undefined, 'valor'),
    })
    setLoading(false)
  }

  const cards: MetricCard[] = useMemo(
    () => [
      { titulo: 'Denúncias abertas', valor: counts.denunciasAbertas, anterior: comparativos.denuncias?.anterior || 0, href: '/admin/denuncias', icon: Gavel, destaque: counts.denunciasAbertas > 0 },
      { titulo: 'Alertas altos', valor: counts.alertasAltos, anterior: comparativos.alertas?.anterior || 0, href: '/admin/antifraude', icon: AlertTriangle, destaque: counts.alertasAltos > 0 },
      { titulo: 'Bloqueios ativos', valor: counts.bloqueiosAtivos, anterior: 0, href: '/admin/antifraude', icon: ShieldCheck, destaque: counts.bloqueiosAtivos > 0 },
      { titulo: 'Logs hoje', valor: counts.logsHoje, anterior: comparativos.logs?.anterior || 0, href: '/admin/auditoria', icon: FileSearch },
      { titulo: 'Saques pendentes', valor: counts.saquesPendentes, anterior: 0, href: '/admin/usuarios', icon: Banknote, destaque: counts.saquesPendentes > 0 },
      { titulo: 'Confrontos ativos', valor: counts.confrontosAbertos, anterior: comparativos.confrontos?.anterior || 0, href: '/admin/diagnostico', icon: Trophy },
      { titulo: 'Usuários', valor: counts.usuarios, anterior: comparativos.usuarios?.anterior || 0, href: '/admin/usuarios', icon: Users },
      { titulo: 'Campeonatos', valor: counts.campeonatos, anterior: comparativos.campeonatos?.anterior || 0, href: '/admin/diagnostico', icon: Trophy },
    ],
    [counts, comparativos]
  )

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#f7f7f7]"><Loader2 className="animate-spin text-[#2563eb]" size={42} /></div>

  if (!autorizado) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="border border-red-200 bg-white p-8 text-center">
          <ShieldCheck className="mx-auto mb-4 text-red-500" size={42} />
          <h1 className="text-xl font-semibold uppercase text-[#142340]">Acesso restrito</h1>
          <p className="mt-3 text-sm text-zinc-500">Seu usuário não está cadastrado como administrador ativo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-[1700px] space-y-6 p-4 md:p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">Administração LEALT</p>
              <h1 className="mt-2 text-2xl font-semibold uppercase text-[#142340] md:text-3xl">Centro de controle</h1>
              <p className="mt-2 text-sm text-zinc-500">Crescimento, denúncias, antifraude, auditoria, financeiro e diagnóstico operacional.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PeriodoTabs periodo={periodo} setPeriodo={setPeriodo} />
              <Link href="/denunciar" className="inline-flex items-center justify-center gap-2 border border-[#2563eb] bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2563eb] hover:bg-[#2563eb] hover:text-white">
                Formulário de denúncia público <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <AdminTabs />
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {cards.map((card) => <CardMetrica key={card.titulo} card={card} />)}
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <ChartPanel titulo="Crescimento de usuários" subtitulo={`Novos cadastros nos últimos ${periodo} dias`} serie={series.usuarios} tipo="linha" />
          <ChartPanel titulo="Campeonatos criados" subtitulo="Criação de eventos por dia" serie={series.campeonatos} tipo="barra" />
          <ChartPanel titulo="Movimento financeiro" subtitulo="Volume auditado por transações da carteira" serie={series.financeiro} tipo="area" prefixo="R$ " />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ComparativoPanel
            titulo="Denúncias abertas x resolvidas"
            subtitulo="Ajuda a medir gargalo de moderação"
            aLabel="Abertas"
            bLabel="Resolvidas"
            serieA={series.denuncias}
            serieB={series.denunciasResolvidas}
          />
          <ComparativoPanel
            titulo="Confrontos criados x finalizados"
            subtitulo="Mostra saúde operacional dos apostados"
            aLabel="Criados"
            bLabel="Finalizados"
            serieA={series.confrontos}
            serieB={series.confrontosFinalizados}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <ChartPanel titulo="Alertas antifraude" subtitulo="Volume diário de alertas automáticos" serie={series.alertas} tipo="barra" />
          <ChartPanel titulo="Logs críticos" subtitulo="Eventos de risco alto na auditoria" serie={series.logs} tipo="barra" />
          <ResumoOperacional counts={counts} />
        </section>
      </div>
    </div>
  )
}

function PeriodoTabs({ periodo, setPeriodo }: { periodo: Periodo; setPeriodo: (p: Periodo) => void }) {
  return (
    <div className="flex border border-zinc-200 bg-white">
      {([7, 30, 90] as Periodo[]).map((p) => (
        <button key={p} onClick={() => setPeriodo(p)} className={["px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]", periodo === p ? 'bg-[#2563eb] text-white' : 'text-[#142340] hover:bg-zinc-50'].join(' ')}>
          {p} dias
        </button>
      ))}
    </div>
  )
}

function CardMetrica({ card }: { card: MetricCard }) {
  const Icon = card.icon
  const pct = variacao(card.valor, card.anterior)
  const positivo = pct >= 0
  const Trend = positivo ? TrendingUp : TrendingDown
  return (
    <Link href={card.href} className={["border bg-white p-4 transition hover:border-[#2563eb]", card.destaque ? 'border-red-300' : 'border-zinc-200'].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{card.titulo}</p>
          <p className="mt-3 text-3xl font-semibold text-[#142340]">{card.valor}</p>
        </div>
        <div className={["border p-2", card.destaque ? 'border-red-300 text-red-500' : 'border-zinc-200 text-[#2563eb]'].join(' ')}><Icon size={18} /></div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        <Trend size={13} className={positivo ? 'text-emerald-600' : 'text-red-600'} />
        <span className={positivo ? 'text-emerald-600' : 'text-red-600'}>{pct > 0 ? '+' : ''}{pct}%</span>
        <span>vs período anterior</span>
      </div>
    </Link>
  )
}

function ChartPanel({ titulo, subtitulo, serie, tipo, prefixo = '' }: { titulo: string; subtitulo: string; serie: SeriePonto[]; tipo: 'linha' | 'barra' | 'area'; prefixo?: string }) {
  return (
    <div className="border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#2563eb]">Indicador</p>
          <h2 className="mt-2 text-base font-semibold uppercase text-[#142340]">{titulo}</h2>
          <p className="mt-1 text-xs text-zinc-500">{subtitulo}</p>
        </div>
        <BarChart3 className="text-[#2563eb]" size={20} />
      </div>
      <MiniChart serie={serie} tipo={tipo} prefixo={prefixo} />
    </div>
  )
}

function ComparativoPanel({ titulo, subtitulo, serieA, serieB, aLabel, bLabel }: { titulo: string; subtitulo: string; serieA: SeriePonto[]; serieB: SeriePonto[]; aLabel: string; bLabel: string }) {
  const totalA = serieA.reduce((s, p) => s + p.valor, 0)
  const totalB = serieB.reduce((s, p) => s + p.valor, 0)
  return (
    <div className="border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#2563eb]">Comparativo</p>
          <h2 className="mt-2 text-base font-semibold uppercase text-[#142340]">{titulo}</h2>
          <p className="mt-1 text-xs text-zinc-500">{subtitulo}</p>
        </div>
        <div className="grid grid-cols-2 border border-zinc-200 text-center text-[10px] uppercase tracking-[0.16em]">
          <div className="border-r border-zinc-200 px-3 py-2"><b className="block text-base text-[#142340]">{totalA}</b>{aLabel}</div>
          <div className="px-3 py-2"><b className="block text-base text-[#142340]">{totalB}</b>{bLabel}</div>
        </div>
      </div>
      <DualBarChart serieA={serieA} serieB={serieB} />
    </div>
  )
}

function MiniChart({ serie, tipo, prefixo }: { serie: SeriePonto[]; tipo: 'linha' | 'barra' | 'area'; prefixo?: string }) {
  const w = 560
  const h = 160
  const pad = 18
  const max = Math.max(...serie.map((p) => p.valor), 1)
  const step = serie.length > 1 ? (w - pad * 2) / (serie.length - 1) : 0
  const pts = serie.map((p, i) => ({ x: pad + i * step, y: h - pad - (p.valor / max) * (h - pad * 2), ...p }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${path} L ${pad + (serie.length - 1) * step} ${h - pad} L ${pad} ${h - pad} Z`
  const total = serie.reduce((s, p) => s + p.valor, 0)

  return (
    <div>
      <div className="mb-2 flex items-end justify-between"><span className="text-3xl font-semibold text-[#142340]">{prefixo}{formatNumero(total)}</span><span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">total no período</span></div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full border border-zinc-100 bg-[#fbfbfb]">
        {[0, 1, 2, 3].map((i) => <line key={i} x1="0" x2={w} y1={pad + i * 40} y2={pad + i * 40} stroke="#e5e7eb" strokeWidth="1" />)}
        {tipo === 'barra' && pts.map((p, i) => {
          const bw = Math.max(4, (w - pad * 2) / Math.max(serie.length, 1) - 3)
          return <rect key={i} x={p.x - bw / 2} y={p.y} width={bw} height={h - pad - p.y} fill="#2563eb" opacity="0.82" />
        })}
        {tipo === 'area' && <path d={area} fill="#2563eb" opacity="0.12" />}
        {tipo !== 'barra' && <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" />}
        {tipo !== 'barra' && pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#2563eb" />)}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.12em] text-zinc-400"><span>{serie[0]?.label || '-'}</span><span>{serie[serie.length - 1]?.label || '-'}</span></div>
    </div>
  )
}

function DualBarChart({ serieA, serieB }: { serieA: SeriePonto[]; serieB: SeriePonto[] }) {
  const w = 720
  const h = 190
  const pad = 18
  const max = Math.max(...serieA.map((p) => p.valor), ...serieB.map((p) => p.valor), 1)
  const group = (w - pad * 2) / Math.max(serieA.length, 1)
  const bw = Math.max(3, group / 3)
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full border border-zinc-100 bg-[#fbfbfb]">
        {[0, 1, 2, 3].map((i) => <line key={i} x1="0" x2={w} y1={pad + i * 45} y2={pad + i * 45} stroke="#e5e7eb" strokeWidth="1" />)}
        {serieA.map((p, i) => {
          const x = pad + i * group + group / 2
          const hA = (p.valor / max) * (h - pad * 2)
          const hB = ((serieB[i]?.valor || 0) / max) * (h - pad * 2)
          return <g key={i}><rect x={x - bw} y={h - pad - hA} width={bw} height={hA} fill="#2563eb" opacity="0.85" /><rect x={x + 2} y={h - pad - hB} width={bw} height={hB} fill="#16a34a" opacity="0.85" /></g>
        })}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[10px] uppercase tracking-[0.16em] text-zinc-500"><span><i className="mr-2 inline-block h-2 w-4 bg-[#2563eb]" />Criados/Abertos</span><span><i className="mr-2 inline-block h-2 w-4 bg-[#16a34a]" />Resolvidos/Finalizados</span></div>
    </div>
  )
}

function ResumoOperacional({ counts }: { counts: Counts }) {
  return (
    <div className="border border-zinc-200 bg-white p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#2563eb]">Leitura rápida</p>
      <h2 className="mt-2 text-base font-semibold uppercase text-[#142340]">Prioridades do momento</h2>
      <div className="mt-4 space-y-3 text-sm text-zinc-600">
        <LinhaResumo label="Denúncias abertas" valor={counts.denunciasAbertas} alerta={counts.denunciasAbertas > 0} />
        <LinhaResumo label="Alertas altos" valor={counts.alertasAltos} alerta={counts.alertasAltos > 0} />
        <LinhaResumo label="Saques pendentes" valor={counts.saquesPendentes} alerta={counts.saquesPendentes > 0} />
        <LinhaResumo label="Confrontos ativos" valor={counts.confrontosAbertos} />
      </div>
    </div>
  )
}

function LinhaResumo({ label, valor, alerta }: { label: string; valor: number; alerta?: boolean }) {
  return <div className="flex items-center justify-between border-b border-zinc-100 pb-2"><span>{label}</span><b className={alerta ? 'text-red-600' : 'text-[#142340]'}>{valor}</b></div>
}

function formatNumero(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(Math.round(n))
}
