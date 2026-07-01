'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminTabs from '../../components/AdminTabs'
import { ArrowLeft, Bell, CheckCircle, Loader2, MessageSquare, ShieldCheck, XCircle } from 'lucide-react'

type Denuncia = any
type Resposta = { id: string; autor_tipo: string; autor_user_id: string | null; mensagem: string; interno: boolean; created_at: string }
type Prova = { id: string; nome_arquivo: string; url_arquivo: string; visibilidade: string; uploaded_by_user_id: string; created_at: string }
type Historico = { id: string; status_anterior: string | null; status_novo: string; observacao: string | null; created_at: string }

const statusOptions = ['aberta', 'em_analise', 'aguardando_resposta_usuario', 'aguardando_resposta_organizacao', 'resolvida', 'recusada', 'arquivada']

export default function AdminDenunciaDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const id = String(params.id)

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [autorizado, setAutorizado] = useState(false)
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const [denuncia, setDenuncia] = useState<Denuncia | null>(null)
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [provas, setProvas] = useState<Prova[]>([])
  const [historico, setHistorico] = useState<Historico[]>([])
  const [mensagem, setMensagem] = useState('')
  const [resposta, setResposta] = useState('')
  const [interno, setInterno] = useState(false)
  const [novoStatus, setNovoStatus] = useState('')
  const [resumoResolucao, setResumoResolucao] = useState('')

  async function carregar() {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) {
      router.push('/login')
      return
    }

    const { data: admin } = await supabase.from('site_administradores').select('id').eq('user_id', user.id).eq('ativo', true).limit(1)
    if (!admin || admin.length === 0) {
      setAutorizado(false)
      setLoading(false)
      return
    }

    setAutorizado(true)
    setAdminUserId(user.id)

    const [dRes, rRes, pRes, hRes] = await Promise.all([
      supabase.from('denuncias_campeonato').select('*').eq('id', id).maybeSingle(),
      supabase.from('denuncias_respostas').select('*').eq('denuncia_id', id).order('created_at', { ascending: true }),
      supabase.from('denuncias_provas').select('*').eq('denuncia_id', id).order('created_at', { ascending: false }),
      supabase.from('denuncias_status_historico').select('*').eq('denuncia_id', id).order('created_at', { ascending: false }),
    ])

    if (dRes.error) console.error(dRes.error)
    setDenuncia(dRes.data)
    setNovoStatus(dRes.data?.status || '')
    setResumoResolucao(dRes.data?.resumo_resolucao || '')
    setRespostas((rRes.data || []) as Resposta[])
    setProvas((pRes.data || []) as Prova[])
    setHistorico((hRes.data || []) as Historico[])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [id])

  async function salvarStatus() {
    if (!denuncia || !adminUserId) return
    setSalvando(true)
    setMensagem('')
    const update: any = { status: novoStatus, atribuida_user_id: denuncia.atribuida_user_id || adminUserId, updated_at: new Date().toISOString() }
    if (novoStatus === 'resolvida') {
      update.resolvida_por_user_id = adminUserId
      update.resolvida_em = new Date().toISOString()
      update.resumo_resolucao = resumoResolucao || null
    }
    if (novoStatus === 'arquivada') update.arquivada_em = new Date().toISOString()

    const { error } = await supabase.from('denuncias_campeonato').update(update).eq('id', denuncia.id)
    if (!error) {
      await supabase.from('denuncias_status_historico').insert({ denuncia_id: denuncia.id, status_anterior: denuncia.status, status_novo: novoStatus, alterado_por_user_id: adminUserId, observacao: resumoResolucao || null })
      setMensagem('Status atualizado.')
      await carregar()
    } else setMensagem(`Erro: ${error.message}`)
    setSalvando(false)
  }

  async function enviarResposta(e: FormEvent) {
    e.preventDefault()
    if (!adminUserId || !resposta.trim()) return
    setSalvando(true)
    setMensagem('')
    const { error } = await supabase.from('denuncias_respostas').insert({ denuncia_id: id, autor_tipo: interno ? 'moderacao' : 'moderacao', autor_user_id: adminUserId, mensagem: resposta.trim(), interno })
    if (!error) {
      setResposta('')
      setMensagem(interno ? 'Nota interna salva.' : 'Resposta enviada ao caso.')
      await carregar()
    } else setMensagem(`Erro: ${error.message}`)
    setSalvando(false)
  }

  async function notificarDenunciado() {
    if (!denuncia) return
    const alvo = denuncia.alvo_user_id || denuncia.denunciante_user_id
    if (!alvo) return setMensagem('Não foi possível identificar usuário para notificar.')
    const { error } = await supabase.from('notificacoes').insert({ user_id: alvo, titulo: 'Você recebeu uma notificação da moderação', mensagem: `Denúncia: ${denuncia.titulo}`, tipo: 'moderacao', referencia_id: denuncia.id })
    setMensagem(error ? `Erro ao notificar: ${error.message}` : 'Notificação enviada.')
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#f7f7f7]"><Loader2 className="animate-spin text-[#2563eb]" size={42} /></div>
  if (!autorizado) return <div className="p-6"><div className="border border-red-200 bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-4 text-red-500" /><b>Acesso restrito</b></div></div>
  if (!denuncia) return <div className="p-6"><div className="border border-zinc-200 bg-white p-8">Denúncia não encontrada.</div></div>

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-[1700px] space-y-5 p-4 md:p-6">
        <div className="space-y-4">
          <Link href="/admin/denuncias" className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 hover:text-[#2563eb]"><ArrowLeft size={14} /> Voltar para denúncias</Link>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">Denúncia</p>
            <h1 className="mt-2 text-2xl font-semibold uppercase text-[#142340]">{denuncia.titulo}</h1>
            <p className="mt-2 text-sm text-zinc-500">ID: {denuncia.id}</p>
          </div>
          <AdminTabs />
        </div>

        {mensagem && <div className="border border-zinc-200 bg-white p-3 text-sm text-zinc-700">{mensagem}</div>}

        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <main className="space-y-4">
            <section className="border border-zinc-200 bg-white p-5">
              <div className="grid gap-3 md:grid-cols-4">
                <Info label="Status" value={denuncia.status} />
                <Info label="Prioridade" value={denuncia.prioridade} />
                <Info label="Tipo alvo" value={denuncia.tipo_alvo} />
                <Info label="Categoria" value={denuncia.categoria} />
              </div>
              <div className="mt-5 border-t border-zinc-200 pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Descrição</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{denuncia.descricao}</p>
              </div>
            </section>

            <section className="border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#142340]">Respostas e notas</h2>
              <div className="mt-4 space-y-3">
                {respostas.map((r) => <div key={r.id} className="border border-zinc-200 p-3"><div className="flex justify-between gap-3"><b className="text-xs uppercase text-[#2563eb]">{r.interno ? 'Nota interna' : r.autor_tipo}</b><span className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleString('pt-BR')}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{r.mensagem}</p></div>)}
                {respostas.length === 0 && <p className="text-sm text-zinc-500">Nenhuma resposta ainda.</p>}
              </div>
              <form onSubmit={enviarResposta} className="mt-4 space-y-3">
                <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} rows={4} placeholder="Responder denunciante, registrar nota interna ou orientar denunciado..." className="w-full border border-zinc-200 p-3 text-sm outline-none focus:border-[#2563eb]" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-600"><input type="checkbox" checked={interno} onChange={(e) => setInterno(e.target.checked)} /> Nota interna</label>
                  <button disabled={salvando} className="inline-flex items-center gap-2 bg-[#2563eb] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"><MessageSquare size={14} /> Enviar</button>
                </div>
              </form>
            </section>

            <section className="border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#142340]">Provas</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {provas.map((p) => <a key={p.id} href={p.url_arquivo} target="_blank" className="border border-zinc-200 p-3 text-sm hover:border-[#2563eb]"><b>{p.nome_arquivo}</b><p className="mt-1 text-xs text-zinc-500">{p.visibilidade} • {new Date(p.created_at).toLocaleString('pt-BR')}</p></a>)}
                {provas.length === 0 && <p className="text-sm text-zinc-500">Nenhuma prova anexada.</p>}
              </div>
            </section>
          </main>

          <aside className="space-y-4">
            <section className="border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#142340]">Ações administrativas</h2>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Status
                <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} className="mt-1 w-full border border-zinc-200 bg-white p-3 text-sm normal-case tracking-normal outline-none">{statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              </label>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Resumo / motivo
                <textarea value={resumoResolucao} onChange={(e) => setResumoResolucao(e.target.value)} rows={4} className="mt-1 w-full border border-zinc-200 p-3 text-sm normal-case tracking-normal outline-none" />
              </label>
              <div className="mt-4 grid gap-2">
                <button onClick={salvarStatus} disabled={salvando} className="inline-flex items-center justify-center gap-2 bg-[#2563eb] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"><CheckCircle size={14} /> Salvar status</button>
                <button onClick={notificarDenunciado} className="inline-flex items-center justify-center gap-2 border border-zinc-200 bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-700 hover:border-[#2563eb]"><Bell size={14} /> Notificar envolvido</button>
              </div>
            </section>

            <section className="border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#142340]">Histórico</h2>
              <div className="mt-4 space-y-2">
                {historico.map((h) => <div key={h.id} className="border-l-2 border-[#2563eb] pl-3 text-sm"><b>{h.status_anterior || 'novo'} → {h.status_novo}</b><p className="text-xs text-zinc-500">{new Date(h.created_at).toLocaleString('pt-BR')}</p>{h.observacao && <p className="mt-1 text-zinc-600">{h.observacao}</p>}</div>)}
                {historico.length === 0 && <p className="text-sm text-zinc-500">Sem histórico.</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: any }) {
  return <div className="border border-zinc-200 p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className="mt-2 text-sm font-semibold text-[#142340]">{String(value || '-')}</p></div>
}
