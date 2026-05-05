'use client'

export const dynamic = 'force-dynamic'

import { FormEvent, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, ArrowLeft, Loader2, Send, ShieldCheck } from 'lucide-react'

const categorias = ['pagamento', 'premiacao', 'resultado', 'sumula', 'inscricao', 'regra', 'antijogo', 'conduta', 'organizacao', 'suporte', 'fraude', 'outro']
const tipos = ['campeonato', 'equipe', 'jogador', 'organizacao', 'usuario', 'produtora', 'perfil_jogo']

function DenunciarPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [form, setForm] = useState({
    tipo_alvo: params.get('tipo') || 'usuario',
    alvo_id: params.get('id') || '',
    categoria: 'outro',
    prioridade: 'media',
    titulo: '',
    descricao: '',
    publica: true,
    anonima_para_publico: false,
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUserId(data.user.id)
    })
  }, [router])

  function setCampo(campo: string, valor: any) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    setMensagem('')

    const alvoId = form.alvo_id.trim() || null
    const payload: any = {
      denunciante_user_id: userId,
      tipo_alvo: form.tipo_alvo,
      categoria: form.categoria,
      prioridade: form.prioridade,
      titulo: form.titulo,
      descricao: form.descricao,
      publica: form.publica,
      anonima_para_publico: form.anonima_para_publico,
      status: 'aberta',
    }

    if (alvoId) {
      if (form.tipo_alvo === 'campeonato') payload.campeonato_id = alvoId
      else if (form.tipo_alvo === 'equipe') payload.equipe_id = alvoId
      else if (form.tipo_alvo === 'jogador') payload.jogador_id = alvoId
      else if (form.tipo_alvo === 'usuario') payload.alvo_user_id = alvoId
      else if (form.tipo_alvo === 'produtora' || form.tipo_alvo === 'organizacao') payload.produtora_id = alvoId
      else if (form.tipo_alvo === 'perfil_jogo') payload.perfil_jogo_id = alvoId
    }

    const { error } = await supabase.from('denuncias_campeonato').insert(payload)

    if (error) {
      setMensagem(`Erro ao enviar denúncia: ${error.message}`)
      setLoading(false)
      return
    }

    setMensagem('Denúncia enviada com sucesso. A moderação vai analisar o caso.')
    setForm((atual) => ({ ...atual, titulo: '', descricao: '', alvo_id: '' }))
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 hover:text-[#2563eb]"><ArrowLeft size={14} /> Voltar</Link>
        <div className="border border-zinc-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="border border-red-200 p-3 text-red-500"><AlertTriangle size={22} /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">Central pública</p>
              <h1 className="mt-2 text-2xl font-semibold uppercase text-[#142340]">Fazer denúncia</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Denuncie perfil, campeonato, equipe, jogador, produtora, pagamento, conduta ou qualquer problema dentro da plataforma.</p>
            </div>
          </div>
        </div>

        <form onSubmit={enviar} className="grid gap-4 border border-zinc-200 bg-white p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Tipo alvo
              <select value={form.tipo_alvo} onChange={(e) => setCampo('tipo_alvo', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#2563eb]">
                {tipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">ID do alvo opcional
              <input value={form.alvo_id} onChange={(e) => setCampo('alvo_id', e.target.value)} placeholder="UUID do perfil, campeonato, equipe..." className="w-full border border-zinc-200 px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#2563eb]" />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Categoria
              <select value={form.categoria} onChange={(e) => setCampo('categoria', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#2563eb]">
                {categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Prioridade
              <select value={form.prioridade} onChange={(e) => setCampo('prioridade', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#2563eb]">
                <option value="baixa">baixa</option>
                <option value="media">média</option>
                <option value="alta">alta</option>
                <option value="critica">crítica</option>
              </select>
            </label>
          </div>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Título
            <input required value={form.titulo} onChange={(e) => setCampo('titulo', e.target.value)} className="w-full border border-zinc-200 px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#2563eb]" />
          </label>

          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Descrição detalhada
            <textarea required value={form.descricao} onChange={(e) => setCampo('descricao', e.target.value)} rows={7} className="w-full border border-zinc-200 px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#2563eb]" />
          </label>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex items-center gap-2 border border-zinc-200 p-3 text-sm text-zinc-600"><input type="checkbox" checked={form.publica} onChange={(e) => setCampo('publica', e.target.checked)} /> Exibir publicamente quando permitido</label>
            <label className="flex items-center gap-2 border border-zinc-200 p-3 text-sm text-zinc-600"><input type="checkbox" checked={form.anonima_para_publico} onChange={(e) => setCampo('anonima_para_publico', e.target.checked)} /> Ocultar meu nome no público</label>
          </div>

          {mensagem && <div className="border border-zinc-200 bg-[#f7f7f7] p-3 text-sm text-zinc-700">{mensagem}</div>}

          <button disabled={loading} className="inline-flex items-center justify-center gap-2 bg-[#2563eb] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white disabled:opacity-60">
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Enviar denúncia
          </button>
        </form>

        <div className="border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-500">
          <ShieldCheck className="mb-2 text-[#2563eb]" size={18} />
          Denúncias falsas ou abusivas podem gerar punições. Envie provas quando tiver prints, links ou IDs do ocorrido.
        </div>
      </div>
    </div>
  )
}

export default function DenunciarPage() {
  return (
    <Suspense fallback={null}>
      <DenunciarPageInner />
    </Suspense>
  )
}
