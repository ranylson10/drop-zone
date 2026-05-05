'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminTabs from '../components/AdminTabs'
import { Activity, AlertTriangle, BarChart3, CheckCircle, Loader2, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'

type Periodo = 7 | 30 | 90
type Item = { titulo: string; valor: number; status: 'ok' | 'alerta' | 'risco'; descricao: string; tabela?: string; anterior?: number }
type SeriePonto = { label: string; valor: number }
type Series = {
  denunciasTravadas: SeriePonto[]
  confrontosValidacao: SeriePonto[]
  pagamentosPendentes: SeriePonto[]
  saquesPendentes: SeriePonto[]
  logsAlto: SeriePonto[]
  bloqueios: SeriePonto[]
  alertas: SeriePonto[]
  financeiro: SeriePonto[]
}

const seriesVazias: Series = {
  denunciasTravadas: [],
  confrontosValidacao: [],
  pagamentosPendentes: [],
  saquesPendentes: [],
  logsAlto: [],
  bloqueios: [],
  alertas: [],
  financeiro: [],
}

function inicioDoDia(d = new Date()) { const n = new Date(d); n.setHours(0,0,0,0); return n }
function addDias(d: Date, dias: number) { const n = new Date(d); n.setDate(n.getDate() + dias); return n }
function iso(d: Date) { return d.toISOString() }
function labelData(d: Date) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` }

function criarBuckets(periodo: Periodo) {
  const hoje = inicioDoDia()
  const start = addDias(hoje, -(periodo - 1))
  const buckets: Record<string, SeriePonto> = {}
  for (let i = 0; i < periodo; i++) {
    const d = addDias(start, i)
    buckets[d.toISOString().slice(0,10)] = { label: labelData(d), valor: 0 }
  }
  return { start, buckets }
}

function seriePorData(rows: any[], campo: string, periodo: Periodo, filtro?: (row: any) => boolean) {
  const { buckets } = criarBuckets(periodo)
  rows.forEach((row) => {
    if (filtro && !filtro(row)) return
    const data = row?.[campo]
    if (!data) return
    const key = new Date(data).toISOString().slice(0,10)
    if (buckets[key]) buckets[key].valor += 1
  })
  return Object.values(buckets)
}

function serieSoma(rows: any[], campo: string, campoValor: string, periodo: Periodo, filtro?: (row: any) => boolean) {
  const { buckets } = criarBuckets(periodo)
  rows.forEach((row) => {
    if (filtro && !filtro(row)) return
    const data = row?.[campo]
    if (!data) return
    const key = new Date(data).toISOString().slice(0,10)
    if (buckets[key]) buckets[key].valor += Number(row?.[campoValor] || 0)
  })
  return Object.values(buckets)
}

async function count(tabela: string, query?: (q: any) => any) {
  try {
    let q = supabase.from(tabela).select('id', { count: 'exact', head: true })
    if (query) q = query(q)
    const { count } = await q
    return count || 0
  } catch { return -1 }
}

async function countPeriodo(tabela: string, periodo: Periodo, query?: (q: any) => any) {
  const fimAtual = new Date()
  const inicioAtual = addDias(fimAtual, -periodo)
  const inicioAnterior = addDias(inicioAtual, -periodo)
  const atual = await count(tabela, (q) => query ? query(q.gte('created_at', iso(inicioAtual)).lte('created_at', iso(fimAtual))) : q.gte('created_at', iso(inicioAtual)).lte('created_at', iso(fimAtual)))
  const anterior = await count(tabela, (q) => query ? query(q.gte('created_at', iso(inicioAnterior)).lt('created_at', iso(inicioAtual))) : q.gte('created_at', iso(inicioAnterior)).lt('created_at', iso(inicioAtual)))
  return { atual, anterior }
}

async function buscarRows(tabela: string, select: string, desde: string) {
  try {
    const { data, error } = await supabase.from(tabela).select(select).gte('created_at', desde).order('created_at', { ascending: true }).limit(5000)
    if (error) return []
    return data || []
  } catch { return [] }
}

function variacao(atual: number, anterior: number) {
  if (!anterior && atual > 0) return 100
  if (!anterior) return 0
  return Math.round(((atual - anterior) / anterior) * 100)
}

export default function AdminDiagnosticoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>(30)
  const [itens, setItens] = useState<Item[]>([])
  const [series, setSeries] = useState<Series>(seriesVazias)

  useEffect(() => { carregar() }, [periodo])

  async function carregar() {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) { router.push('/login'); return }
    const { data: admin } = await supabase.from('site_administradores').select('id').eq('user_id', user.id).eq('ativo', true).limit(1)
    if (!admin || admin.length === 0) { setAutorizado(false); setLoading(false); return }
    setAutorizado(true)

    const agora = new Date()
    const doisDias = new Date(agora.getTime() - 48 * 60 * 60 * 1000).toISOString()
    const seteDias = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const desde = iso(addDias(inicioDoDia(), -(periodo - 1)))

    const [
      denunciasTravadas,
      confrontosValidacao,
      pagamentosPendentes,
      saquesPendentes,
      logsAlto,
      bloqueiosAtivos,
      alertasRecentes,
      saldoLogs,
      cDenuncias,
      cConfrontos,
      cPagamentos,
      cSaques,
      cLogs,
      cBloqueios,
      cAlertas,
      cFinanceiro,
      rowsDenuncias,
      rowsConfrontos,
      rowsPagamentos,
      rowsSaques,
      rowsLogs,
      rowsBloqueios,
      rowsAlertas,
      rowsFinanceiro,
    ] = await Promise.all([
      count('denuncias_campeonato', (q) => q.in('status', ['aberta','em_analise','aguardando_resposta_usuario','aguardando_resposta_organizacao']).lte('updated_at', doisDias)),
      count('confrontos_apostados', (q) => q.in('status', ['aguardando_resultado', 'aguardando_validacao'])),
      count('confrontos_pagamentos', (q) => q.eq('status', 'pendente')),
      count('wallet_saques', (q) => q.in('status', ['pendente', 'em_analise'])),
      count('audit_logs', (q) => q.eq('risco', 'alto').gte('created_at', seteDias)),
      count('antifraude_bloqueios', (q) => q.eq('ativo', true)),
      count('antifraude_alertas', (q) => q.gte('created_at', seteDias)),
      count('audit_logs', (q) => q.in('entidade', ['wallet_saldo','wallet_transacoes','confrontos_pagamentos','confrontos_escrow']).gte('created_at', seteDias)),
      countPeriodo('denuncias_campeonato', periodo, (q) => q.in('status', ['aberta','em_analise','aguardando_resposta_usuario','aguardando_resposta_organizacao'])),
      countPeriodo('confrontos_apostados', periodo, (q) => q.in('status', ['aguardando_resultado', 'aguardando_validacao'])),
      countPeriodo('confrontos_pagamentos', periodo, (q) => q.eq('status', 'pendente')),
      countPeriodo('wallet_saques', periodo, (q) => q.in('status', ['pendente', 'em_analise'])),
      countPeriodo('audit_logs', periodo, (q) => q.eq('risco', 'alto')),
      countPeriodo('antifraude_bloqueios', periodo, (q) => q.eq('ativo', true)),
      countPeriodo('antifraude_alertas', periodo),
      countPeriodo('audit_logs', periodo, (q) => q.in('entidade', ['wallet_saldo','wallet_transacoes','confrontos_pagamentos','confrontos_escrow'])),
      buscarRows('denuncias_campeonato', 'id, created_at, updated_at, status', desde),
      buscarRows('confrontos_apostados', 'id, created_at, updated_at, status', desde),
      buscarRows('confrontos_pagamentos', 'id, created_at, status', desde),
      buscarRows('wallet_saques', 'id, created_at, status', desde),
      buscarRows('audit_logs', 'id, created_at, risco, entidade', desde),
      buscarRows('antifraude_bloqueios', 'id, created_at:bloqueado_em, ativo', desde),
      buscarRows('antifraude_alertas', 'id, created_at, nivel', desde),
      buscarRows('wallet_transacoes', 'id, created_at, valor', desde),
    ])

    setItens([
      { titulo: 'Denúncias travadas +48h', valor: denunciasTravadas, anterior: cDenuncias.anterior, status: denunciasTravadas > 0 ? 'alerta' : 'ok', descricao: 'Casos sem evolução em mais de 48 horas.', tabela: 'denuncias_campeonato' },
      { titulo: 'Confrontos aguardando validação', valor: confrontosValidacao, anterior: cConfrontos.anterior, status: confrontosValidacao > 5 ? 'alerta' : 'ok', descricao: 'Apostados esperando resultado ou validação.', tabela: 'confrontos_apostados' },
      { titulo: 'Pagamentos pendentes', valor: pagamentosPendentes, anterior: cPagamentos.anterior, status: pagamentosPendentes > 0 ? 'alerta' : 'ok', descricao: 'Pagamentos de confrontos ainda pendentes.', tabela: 'confrontos_pagamentos' },
      { titulo: 'Saques pendentes', valor: saquesPendentes, anterior: cSaques.anterior, status: saquesPendentes > 0 ? 'alerta' : 'ok', descricao: 'Solicitações de saque aguardando análise.', tabela: 'wallet_saques' },
      { titulo: 'Logs de alto risco em 7 dias', valor: logsAlto, anterior: cLogs.anterior, status: logsAlto > 0 ? 'risco' : 'ok', descricao: 'Alterações críticas registradas na auditoria.', tabela: 'audit_logs' },
      { titulo: 'Bloqueios antifraude ativos', valor: bloqueiosAtivos, anterior: cBloqueios.anterior, status: bloqueiosAtivos > 0 ? 'risco' : 'ok', descricao: 'Usuários impedidos de operar apostados/financeiro.', tabela: 'antifraude_bloqueios' },
      { titulo: 'Alertas antifraude em 7 dias', valor: alertasRecentes, anterior: cAlertas.anterior, status: alertasRecentes > 10 ? 'risco' : alertasRecentes > 0 ? 'alerta' : 'ok', descricao: 'Volume recente de alertas automáticos.', tabela: 'antifraude_alertas' },
      { titulo: 'Eventos financeiros auditados', valor: saldoLogs, anterior: cFinanceiro.anterior, status: 'ok', descricao: 'Quantidade de eventos financeiros registrados na auditoria.', tabela: 'audit_logs' },
    ])

    setSeries({
      denunciasTravadas: seriePorData(rowsDenuncias, 'updated_at', periodo, (r) => ['aberta','em_analise','aguardando_resposta_usuario','aguardando_resposta_organizacao'].includes(r.status)),
      confrontosValidacao: seriePorData(rowsConfrontos, 'updated_at', periodo, (r) => ['aguardando_resultado', 'aguardando_validacao'].includes(r.status)),
      pagamentosPendentes: seriePorData(rowsPagamentos, 'created_at', periodo, (r) => r.status === 'pendente'),
      saquesPendentes: seriePorData(rowsSaques, 'created_at', periodo, (r) => ['pendente', 'em_analise'].includes(r.status)),
      logsAlto: seriePorData(rowsLogs, 'created_at', periodo, (r) => r.risco === 'alto'),
      bloqueios: seriePorData(rowsBloqueios, 'created_at', periodo),
      alertas: seriePorData(rowsAlertas, 'created_at', periodo),
      financeiro: serieSoma(rowsFinanceiro, 'created_at', 'valor', periodo),
    })
    setLoading(false)
  }

  const resumo = useMemo(() => ({ ok: itens.filter(i=>i.status==='ok').length, alerta: itens.filter(i=>i.status==='alerta').length, risco: itens.filter(i=>i.status==='risco').length }), [itens])

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#f7f7f7]"><Loader2 className="animate-spin text-[#2563eb]" size={42} /></div>
  if (!autorizado) return <div className="p-6"><div className="border border-red-200 bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-4 text-red-500" /><b>Acesso restrito</b></div></div>

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-[1700px] space-y-5 p-4 md:p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">Administração LEALT</p>
              <h1 className="mt-2 text-2xl font-semibold uppercase text-[#142340] md:text-3xl">Diagnóstico do sistema</h1>
              <p className="mt-2 text-sm text-zinc-500">Checklist operacional com gráficos semanais/mensais de denúncia, pagamento, apostados e antifraude.</p>
            </div>
            <PeriodoTabs periodo={periodo} setPeriodo={setPeriodo} />
          </div>
          <AdminTabs />
        </div>

        <section className="grid grid-cols-3 gap-3"><Resumo label="OK" valor={resumo.ok} tipo="ok"/><Resumo label="Atenção" valor={resumo.alerta} tipo="alerta"/><Resumo label="Risco" valor={resumo.risco} tipo="risco"/></section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{itens.map(item => <DiagnosticoCard key={item.titulo} item={item} />)}</section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ChartPanel titulo="Denúncias travadas" subtitulo="Evolução de casos sem avanço" serie={series.denunciasTravadas} />
          <ChartPanel titulo="Confrontos aguardando validação" subtitulo="Gargalo operacional dos apostados" serie={series.confrontosValidacao} />
          <ChartPanel titulo="Pendências financeiras" subtitulo="Pagamentos pendentes e saques em análise" serieA={series.pagamentosPendentes} serieB={series.saquesPendentes} dual />
          <ChartPanel titulo="Risco e antifraude" subtitulo="Alertas, bloqueios e logs de alto risco" serieA={series.alertas} serieB={series.logsAlto} dual />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <ChartPanel titulo="Eventos financeiros auditados" subtitulo="Volume financeiro da carteira no período" serie={series.financeiro} prefixo="R$ " tipo="area" />
          <ChartPanel titulo="Bloqueios aplicados" subtitulo="Bloqueios antifraude gerados por dia" serie={series.bloqueios} tipo="barra" />
          <div className="border border-zinc-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#2563eb]">Interpretação</p>
            <h2 className="mt-2 text-base font-semibold uppercase text-[#142340]">Leitura dos gráficos</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
              <p><b className="text-[#142340]">Semanal:</b> use 7 dias para monitorar crise, atraso de pagamento e denúncias paradas.</p>
              <p><b className="text-[#142340]">Mensal:</b> use 30 dias para crescimento, volume operacional e comportamento de usuários.</p>
              <p><b className="text-[#142340]">Trimestral:</b> use 90 dias para tendência real e sazonalidade dos campeonatos.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function PeriodoTabs({ periodo, setPeriodo }: { periodo: Periodo; setPeriodo: (p: Periodo) => void }) {
  return <div className="flex border border-zinc-200 bg-white">{([7,30,90] as Periodo[]).map(p => <button key={p} onClick={() => setPeriodo(p)} className={["px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.18em]", periodo === p ? 'bg-[#2563eb] text-white' : 'text-[#142340] hover:bg-zinc-50'].join(' ')}>{p} dias</button>)}</div>
}

function DiagnosticoCard({ item }: { item: Item }) {
  const pct = variacao(item.valor, item.anterior || 0)
  const positivo = pct >= 0
  const Trend = positivo ? TrendingUp : TrendingDown
  return <div className="border border-zinc-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{item.tabela}</p><h2 className="mt-2 text-sm font-semibold uppercase text-[#142340]">{item.titulo}</h2></div>{item.status==='ok'?<CheckCircle className="text-emerald-500" size={20}/>:item.status==='alerta'?<AlertTriangle className="text-amber-500" size={20}/>:<AlertTriangle className="text-red-500" size={20}/>}</div><p className="mt-4 text-4xl font-semibold text-[#142340]">{item.valor < 0 ? '-' : item.valor}</p><div className="mt-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em]"><Trend size={13} className={positivo?'text-emerald-600':'text-red-600'} /><span className={positivo?'text-emerald-600':'text-red-600'}>{pct > 0 ? '+' : ''}{pct}%</span><span className="text-zinc-400">vs período anterior</span></div><p className="mt-3 text-sm leading-6 text-zinc-500">{item.descricao}</p></div>
}

function ChartPanel({ titulo, subtitulo, serie, serieA, serieB, dual, tipo = 'barra', prefixo = '' }: { titulo: string; subtitulo: string; serie?: SeriePonto[]; serieA?: SeriePonto[]; serieB?: SeriePonto[]; dual?: boolean; tipo?: 'barra'|'area'; prefixo?: string }) {
  return <div className="border border-zinc-200 bg-white p-5"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#2563eb]">Gráfico</p><h2 className="mt-2 text-base font-semibold uppercase text-[#142340]">{titulo}</h2><p className="mt-1 text-xs text-zinc-500">{subtitulo}</p></div><BarChart3 className="text-[#2563eb]" size={20}/></div>{dual ? <DualChart serieA={serieA || []} serieB={serieB || []} /> : <MiniChart serie={serie || []} tipo={tipo} prefixo={prefixo} />}</div>
}

function MiniChart({ serie, tipo, prefixo }: { serie: SeriePonto[]; tipo: 'barra'|'area'; prefixo: string }) {
  const w = 720, h = 190, pad = 18
  const max = Math.max(...serie.map(p=>p.valor), 1)
  const group = (w - pad * 2) / Math.max(serie.length, 1)
  const total = serie.reduce((s,p)=>s+p.valor,0)
  return <div><div className="mb-2 flex items-end justify-between"><span className="text-3xl font-semibold text-[#142340]">{prefixo}{formatNumero(total)}</span><span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">total no período</span></div><svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full border border-zinc-100 bg-[#fbfbfb]">{[0,1,2,3].map(i=><line key={i} x1="0" x2={w} y1={pad+i*45} y2={pad+i*45} stroke="#e5e7eb" />)}{serie.map((p,i)=>{ const bw=Math.max(4, group-3); const bh=(p.valor/max)*(h-pad*2); const x=pad+i*group+1; const y=h-pad-bh; return <rect key={i} x={x} y={y} width={bw} height={bh} fill="#2563eb" opacity={tipo==='area'?0.45:0.85}/> })}</svg><div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.12em] text-zinc-400"><span>{serie[0]?.label || '-'}</span><span>{serie[serie.length-1]?.label || '-'}</span></div></div>
}

function DualChart({ serieA, serieB }: { serieA: SeriePonto[]; serieB: SeriePonto[] }) {
  const w = 720, h = 190, pad = 18
  const max = Math.max(...serieA.map(p=>p.valor), ...serieB.map(p=>p.valor), 1)
  const group = (w - pad * 2) / Math.max(serieA.length, 1)
  const bw = Math.max(3, group / 3)
  return <div><svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full border border-zinc-100 bg-[#fbfbfb]">{[0,1,2,3].map(i=><line key={i} x1="0" x2={w} y1={pad+i*45} y2={pad+i*45} stroke="#e5e7eb" />)}{serieA.map((p,i)=>{ const x=pad+i*group+group/2; const hA=(p.valor/max)*(h-pad*2); const hB=((serieB[i]?.valor||0)/max)*(h-pad*2); return <g key={i}><rect x={x-bw} y={h-pad-hA} width={bw} height={hA} fill="#2563eb" opacity="0.85"/><rect x={x+2} y={h-pad-hB} width={bw} height={hB} fill="#16a34a" opacity="0.85"/></g>})}</svg><div className="mt-2 flex items-center gap-4 text-[10px] uppercase tracking-[0.16em] text-zinc-500"><span><i className="mr-2 inline-block h-2 w-4 bg-[#2563eb]"/>Principal</span><span><i className="mr-2 inline-block h-2 w-4 bg-[#16a34a]"/>Comparativo</span></div></div>
}

function Resumo({ label, valor, tipo }: { label: string; valor: number; tipo: string }) { const cls = tipo==='ok'?'text-emerald-600':tipo==='alerta'?'text-amber-600':'text-red-600'; return <div className="border border-zinc-200 bg-white p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className={`mt-2 text-3xl font-semibold ${cls}`}>{valor}</p></div> }
function formatNumero(n: number) { if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`; if (n >= 1000) return `${(n/1000).toFixed(1)}K`; return String(Math.round(n)) }
