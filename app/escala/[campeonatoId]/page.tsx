'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Lock, Mail, Plus, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCampeonatoHref } from '@/app/campeonatos/utils/getCampeonatoHref'

type Campeonato = {
  id: string
  nome: string
  logo_url: string | null
  banner_url: string | null
  modelo_competicao: string | null
  tipo_competicao: string | null
  tipo: string | null
  status: string | null
}

type Equipe = {
  id: string
  nome: string
  tag: string | null
  logo_url: string | null
  criado_por: string | null
}

type Vaga = {
  id: string
  campeonato_id: string
  equipe_id: string | null
  line_id: string | null
  numero_vaga: number | null
  nome_exibicao: string | null
  status: string | null
  status_pagamento: string | null
  equipes?: { id: string; nome: string | null; tag: string | null; logo_url: string | null } | null
  equipes_lines?: { id: string; nome: string | null } | null
}

function normalizarTipo(camp?: Partial<Campeonato> | null) {
  const raw = String(camp?.modelo_competicao || camp?.tipo_competicao || camp?.tipo || 'campeonato').toLowerCase()
  if (raw.includes('diario')) return 'DIÁRIO'
  if (raw.includes('copa')) return 'COPA'
  if (raw.includes('liga')) return 'LIGA'
  if (raw.includes('xtreino') || raw.includes('treino')) return 'XTREINO'
  if (raw.includes('confronto') || raw.includes('4x4')) return 'CONFRONTO'
  return raw.toUpperCase()
}

function Logo({ url, nome }: { url?: string | null; nome: string }) {
  return (
    <div className="relative h-16 w-16 shrink-0 border border-slate-200 bg-slate-100">
      {url ? <Image src={url} alt={nome} fill className="object-cover" /> : <div className="grid h-full w-full place-items-center text-sm font-black text-slate-500">{nome.slice(0, 2)}</div>}
    </div>
  )
}

export default function EscalaCampeonatoPage() {
  const params = useParams<{ campeonatoId: string }>()
  const campeonatoId = String(params?.campeonatoId || '')
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [campeonato, setCampeonato] = useState<Campeonato | null>(null)
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [modoAuth, setModoAuth] = useState<'login' | 'cadastro' | 'recuperar'>('cadastro')
  const [authLoading, setAuthLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [criandoEquipe, setCriandoEquipe] = useState(false)
  const [novaEquipe, setNovaEquipe] = useState('')

  async function carregar() {
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getUser()
      const uid = sessionData.user?.id || null
      setUserId(uid)

      const { data: camp } = await supabase
        .from('campeonatos')
        .select('id, nome, logo_url, banner_url, modelo_competicao, tipo_competicao, tipo, status')
        .eq('id', campeonatoId)
        .maybeSingle()

      setCampeonato((camp as Campeonato | null) || null)

      if (!uid) {
        setEquipes([])
        setVagas([])
        return
      }

      const { data: minhasEquipes } = await supabase
        .from('equipes')
        .select('id, nome, tag, logo_url, criado_por')
        .eq('criado_por', uid)
        .order('created_at', { ascending: false })

      const listaEquipes = (minhasEquipes || []) as Equipe[]
      setEquipes(listaEquipes)

      if (listaEquipes.length) {
        const ids = listaEquipes.map((e) => e.id)
        const { data: vagasData } = await supabase
          .from('campeonato_equipes')
          .select('id, campeonato_id, equipe_id, line_id, numero_vaga, nome_exibicao, status, status_pagamento, equipes:equipe_id(id,nome,tag,logo_url), equipes_lines:line_id(id,nome)')
          .eq('campeonato_id', campeonatoId)
          .in('equipe_id', ids)
          .order('numero_vaga', { ascending: true })

        setVagas((vagasData || []) as any)
      } else {
        setVagas([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campeonatoId])

  async function autenticar(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setErro(null)
    setMsg(null)
    try {
      if (modoAuth === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })
        if (error) throw error
        await carregar()
        return
      }

      if (modoAuth === 'cadastro') {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: senha,
          options: { data: { username: nome.trim(), nome_exibicao: nome.trim() } },
        })
        if (error) throw error
        setMsg('Conta criada. Se o e-mail exigir confirmação, confirme e volte para este link.')
        await carregar()
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/recuperar` : undefined,
      })
      if (error) throw error
      setMsg('Enviamos o link de recuperação para seu e-mail.')
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível concluir.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function criarEquipe(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !novaEquipe.trim()) return
    setCriandoEquipe(true)
    try {
      const { error } = await supabase.from('equipes').insert({ nome: novaEquipe.trim(), criado_por: userId })
      if (error) throw error
      setNovaEquipe('')
      await carregar()
    } catch (err: any) {
      setErro(err?.message || 'Erro ao criar equipe.')
    } finally {
      setCriandoEquipe(false)
    }
  }

  const vagasAgrupadas = useMemo(() => vagas, [vagas])

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950 [color-scheme:light]"><div className="border border-slate-200 bg-white p-5 text-sm font-black uppercase text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={16}/> Carregando escalação</div></main>
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-950 [color-scheme:light]">
      <div className="mx-auto max-w-xl pb-10">
        <section className="border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <Logo url={campeonato?.logo_url} nome={campeonato?.nome || 'Campeonato'} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Escalação Drop Zone</p>
              <h1 className="mt-1 text-xl font-black uppercase tracking-[-0.04em] text-slate-950">{campeonato?.nome || 'Campeonato'}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{normalizarTipo(campeonato)}</span>
                <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{campeonato?.status || 'status'}</span>
              </div>
            </div>
          </div>
        </section>

        {!userId ? (
          <section className="mt-4 border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black uppercase tracking-[-0.04em]">Acesse para escalar</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Crie conta, entre ou recupere sua senha para configurar equipe, line e jogadores deste campeonato.</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {(['cadastro', 'login', 'recuperar'] as const).map((m) => (
                <button key={m} onClick={() => setModoAuth(m)} className={`h-10 border text-[10px] font-black uppercase ${modoAuth === m ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{m === 'recuperar' ? 'Esqueci' : m}</button>
              ))}
            </div>

            <form onSubmit={autenticar} className="mt-4 space-y-3">
              {modoAuth === 'cadastro' ? (
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Nome</span>
                  <div className="flex h-12 border border-slate-200 bg-white"><div className="grid w-12 place-items-center border-r border-slate-200 text-slate-400"><UserPlus size={16}/></div><input value={nome} onChange={(e) => setNome(e.target.value)} className="min-w-0 flex-1 px-3 text-sm font-bold outline-none" placeholder="Seu nome" required /></div>
                </label>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">E-mail</span>
                <div className="flex h-12 border border-slate-200 bg-white"><div className="grid w-12 place-items-center border-r border-slate-200 text-slate-400"><Mail size={16}/></div><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1 px-3 text-sm font-bold outline-none" placeholder="seu@email.com" required /></div>
              </label>
              {modoAuth !== 'recuperar' ? (
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Senha</span>
                  <div className="flex h-12 border border-slate-200 bg-white"><div className="grid w-12 place-items-center border-r border-slate-200 text-slate-400"><Lock size={16}/></div><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="min-w-0 flex-1 px-3 text-sm font-bold outline-none" placeholder="mínimo 6 caracteres" required /></div>
                </label>
              ) : null}
              {erro ? <div className="border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div> : null}
              {msg ? <div className="border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{msg}</div> : null}
              <button disabled={authLoading} className="flex h-12 w-full items-center justify-center gap-2 border border-blue-600 bg-blue-600 text-xs font-black uppercase text-white disabled:opacity-60">
                {authLoading ? <Loader2 className="animate-spin" size={16}/> : null}
                {modoAuth === 'login' ? 'Entrar' : modoAuth === 'cadastro' ? 'Criar conta' : 'Recuperar senha'}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="mt-4 border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black uppercase tracking-[-0.03em]">Suas vagas neste campeonato</h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Escolha a vaga correta. A mesma equipe pode ter mais de uma vaga.</p>
                </div>
                <span className="shrink-0 border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{vagasAgrupadas.length} vagas</span>
              </div>

              <div className="mt-3 space-y-2">
                {vagasAgrupadas.map((vaga) => {
                  const equipe = Array.isArray(vaga.equipes) ? vaga.equipes[0] : vaga.equipes
                  const line = Array.isArray(vaga.equipes_lines) ? vaga.equipes_lines[0] : vaga.equipes_lines
                  return (
                    <Link key={vaga.id} href={`/escala/vaga/${vaga.id}`} className="flex items-center gap-3 border border-slate-200 bg-slate-50 p-3 hover:border-blue-300 hover:bg-blue-50">
                      <Logo url={equipe?.logo_url} nome={vaga.nome_exibicao || equipe?.nome || 'Equipe'} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black uppercase text-slate-950">{vaga.nome_exibicao || equipe?.nome || 'Vaga sem equipe'}</h3>
                        <p className="mt-1 text-[10px] font-black uppercase text-slate-500">Vaga {vaga.numero_vaga || '-'} • {line?.nome || 'line não definida'} • {vaga.status_pagamento || 'pagamento'}</p>
                      </div>
                      <ArrowRight size={18} className="text-slate-400" />
                    </Link>
                  )
                })}

                {!vagasAgrupadas.length && (
                  <div className="border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                    <ShieldCheck className="mx-auto text-slate-400" size={22}/>
                    <p className="mt-2 text-sm font-black uppercase text-slate-900">Nenhuma vaga encontrada para suas equipes</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Compre ou solicite a vaga com a organização. Depois ela aparecerá aqui para escalar.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-4 border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-black uppercase tracking-[-0.03em]">Criar equipe rápida</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Use caso ainda não tenha uma equipe cadastrada.</p>
              <form onSubmit={criarEquipe} className="mt-3 flex gap-2">
                <input value={novaEquipe} onChange={(e) => setNovaEquipe(e.target.value)} placeholder="Nome da equipe" className="h-11 min-w-0 flex-1 border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-500" />
                <button disabled={criandoEquipe} className="grid h-11 w-12 place-items-center border border-slate-950 bg-slate-950 text-white"><Plus size={16}/></button>
              </form>
            </section>
          </>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {campeonato ? <Link href={getCampeonatoHref(campeonato as any)} className="flex h-11 items-center justify-center border border-slate-200 bg-white text-xs font-black uppercase text-slate-700">Ver estatísticas completas</Link> : null}
          <Link href="/" className="flex h-11 items-center justify-center border border-slate-200 bg-white text-xs font-black uppercase text-slate-700">Ir para o site</Link>
        </div>
      </div>
    </main>
  )
}
