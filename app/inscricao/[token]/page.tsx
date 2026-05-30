'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const SERVIDORES = ['BR', 'LATAM', 'NA', 'SAC', 'EU', 'MEA', 'IND', 'SG']
const FUNCOES = [
  { value: 'rush', label: 'Rush' },
  { value: 'suporte', label: 'Suporte' },
  { value: 'sniper', label: 'Sniper' },
  { value: 'flex', label: 'Flex' },
  { value: 'granadeiro', label: 'Granadeiro' },
]

export default function InscricaoTokenPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = useMemo(() => String(params?.token || '').trim().toUpperCase(), [params])

  const [checking, setChecking] = useState(true)
  const [logado, setLogado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<any>(null)

  const [nick, setNick] = useState('')
  const [uidJogo, setUidJogo] = useState('')
  const [servidor, setServidor] = useState('BR')
  const [plataforma, setPlataforma] = useState('mobile')
  const [funcao, setFuncao] = useState('flex')

  useEffect(() => {
    let ativo = true
    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!ativo) return
      setLogado(Boolean(data.session?.user))

      if (data.session?.user) {
        const { data: perfil } = await supabase
          .from('perfis_jogo')
          .select('nick,uid_jogo,servidor,plataforma,funcao')
          .eq('user_id', data.session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!ativo) return
        if (perfil) {
          setNick(String((perfil as any).nick || ''))
          setUidJogo(String((perfil as any).uid_jogo || ''))
          setServidor(String((perfil as any).servidor || 'BR'))
          setPlataforma(String((perfil as any).plataforma || 'mobile'))
          setFuncao(String((perfil as any).funcao || 'flex'))
        }
      }

      setChecking(false)
    }
    init()
    return () => {
      ativo = false
    }
  }, [])

  async function enviar(event: React.FormEvent) {
    event.preventDefault()
    setErro(null)
    setSucesso(null)

    if (!nick.trim()) return setErro('Informe seu nick.')
    if (!uidJogo.trim()) return setErro('Informe seu ID do jogo.')

    setEnviando(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('Faça login para concluir a inscrição.')

      const res = await fetch('/api/inscricao-equipe/entrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          token,
          nick: nick.trim(),
          uid_jogo: uidJogo.trim(),
          servidor,
          plataforma,
          funcao,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Não foi possível concluir a inscrição.')
      setSucesso(json)
    } catch (error: any) {
      setErro(error?.message || 'Erro ao concluir inscrição.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white">
      <div className="mx-auto max-w-xl border border-white/10 bg-white/[0.04] p-4 shadow-[8px_8px_0_rgba(0,0,0,.35)]">
        <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="grid h-12 w-12 place-items-center bg-emerald-500 text-black">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Drop Zone</p>
            <h1 className="text-xl font-black uppercase tracking-[-0.04em]">Inscrição direta na equipe</h1>
          </div>
        </div>

        <div className="mb-4 border border-emerald-400/20 bg-emerald-400/10 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">Token recebido</p>
          <p className="mt-1 text-2xl font-black tracking-[0.18em] text-white">{token || 'SEM TOKEN'}</p>
        </div>

        {checking ? (
          <div className="flex items-center gap-2 border border-white/10 bg-white/5 p-3 text-sm font-bold text-white/80">
            <Loader2 className="animate-spin" size={18} /> Verificando login...
          </div>
        ) : !logado ? (
          <div className="space-y-3 border border-amber-300/30 bg-amber-300/10 p-4">
            <div className="flex items-center gap-2 text-sm font-black uppercase text-amber-200">
              <LogIn size={18} /> Login necessário
            </div>
            <p className="text-sm font-semibold text-white/75">
              Entre ou crie sua conta para usar o token. Depois volte neste mesmo link.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/login?redirect=/inscricao/${token}`} className="grid h-11 place-items-center bg-white text-xs font-black uppercase text-slate-950">
                Entrar
              </Link>
              <Link href={`/cadastro?redirect=/inscricao/${token}`} className="grid h-11 place-items-center border border-white/20 text-xs font-black uppercase text-white">
                Criar conta
              </Link>
            </div>
          </div>
        ) : sucesso ? (
          <div className="space-y-3 border border-emerald-300/30 bg-emerald-300/10 p-4">
            <div className="flex items-center gap-2 text-sm font-black uppercase text-emerald-200">
              <CheckCircle2 size={18} /> Inscrição concluída
            </div>
            <p className="text-sm font-semibold text-white/75">
              Você entrou na equipe e já foi escalado automaticamente neste campeonato.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/escala/${sucesso.campeonato_id}`)}
              className="h-11 w-full bg-emerald-400 text-xs font-black uppercase text-slate-950"
            >
              Abrir campeonato
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Nick</label>
              <input value={nick} onChange={(e) => setNick(e.target.value)} className="h-11 w-full border border-white/10 bg-black/30 px-3 text-sm font-bold outline-none focus:border-emerald-400" placeholder="Seu nick no Free Fire" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-white/55">ID do jogo</label>
              <input value={uidJogo} onChange={(e) => setUidJogo(e.target.value)} className="h-11 w-full border border-white/10 bg-black/30 px-3 text-sm font-bold outline-none focus:border-emerald-400" placeholder="UID / ID do Free Fire" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Servidor</label>
                <select value={servidor} onChange={(e) => setServidor(e.target.value)} className="h-11 w-full border border-white/10 bg-black/30 px-3 text-sm font-bold outline-none focus:border-emerald-400">
                  {SERVIDORES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Plataforma</label>
                <select value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className="h-11 w-full border border-white/10 bg-black/30 px-3 text-sm font-bold outline-none focus:border-emerald-400">
                  <option value="mobile">Mobile</option>
                  <option value="emulador">Emulador</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Função</label>
              <select value={funcao} onChange={(e) => setFuncao(e.target.value)} className="h-11 w-full border border-white/10 bg-black/30 px-3 text-sm font-bold outline-none focus:border-emerald-400">
                {FUNCOES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>

            {erro ? <div className="border border-red-300/30 bg-red-500/10 p-3 text-sm font-bold text-red-100">{erro}</div> : null}

            <button disabled={enviando} className="flex h-12 w-full items-center justify-center gap-2 bg-emerald-400 text-xs font-black uppercase text-slate-950 disabled:opacity-60">
              {enviando ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
              Entrar na equipe e escalar
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
