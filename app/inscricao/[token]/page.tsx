'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Gamepad2, Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type PerfilJogo = {
  id: string
  nick: string | null
  uid_jogo: string | null
  servidor: string | null
  plataforma: string | null
  funcao: string | null
  foto_capa: string | null
}

function labelPerfil(perfil: PerfilJogo) {
  return `${perfil.nick || 'Perfil gamer'}${perfil.uid_jogo ? ` • ID ${perfil.uid_jogo}` : ''}`
}

export default function InscricaoTokenPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = useMemo(() => String(params?.token || '').trim().toUpperCase(), [params])

  const [checking, setChecking] = useState(true)
  const [logado, setLogado] = useState(false)
  const [perfis, setPerfis] = useState<PerfilJogo[]>([])
  const [perfilSelecionadoId, setPerfilSelecionadoId] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<any>(null)

  useEffect(() => {
    let ativo = true

    async function init() {
      setChecking(true)
      setErro(null)

      const { data } = await supabase.auth.getSession()
      if (!ativo) return

      const user = data.session?.user
      setLogado(Boolean(user))

      if (user?.id) {
        const { data: perfisData, error } = await supabase
          .from('perfis_jogo')
          .select('id,nick,uid_jogo,servidor,plataforma,funcao,foto_capa')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('created_at', { ascending: true })

        if (!ativo) return

        if (error) {
          setErro('Não foi possível carregar seus perfis gamer.')
          setPerfis([])
        } else {
          const lista = (perfisData || []) as PerfilJogo[]
          setPerfis(lista)
          setPerfilSelecionadoId(lista[0]?.id || '')
        }
      }

      setChecking(false)
    }

    init()
    return () => {
      ativo = false
    }
  }, [])

  async function entrarComPerfil() {
    setErro(null)
    setSucesso(null)

    if (!perfilSelecionadoId) {
      setErro('Selecione ou crie um perfil gamer primeiro.')
      return
    }

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
          perfil_jogo_id: perfilSelecionadoId,
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

  const perfilSelecionado = perfis.find((perfil) => perfil.id === perfilSelecionadoId) || null
  const redirectAtual = `/inscricao/${token}`

  return (
    <main className="min-h-screen bg-[#eef3f9] px-3 py-4 text-[#12213f] sm:px-4">
      <div className="mx-auto w-full max-w-[430px] overflow-hidden border border-[#d8e2ef] bg-white shadow-[0_16px_38px_rgba(16,36,70,.12)]">
        <header className="bg-gradient-to-r from-[#0ea5e9] to-[#6d5dfc] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center border border-white/30 bg-black/20">
              <ShieldCheck size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/80">Drop Zone</p>
              <h1 className="truncate text-lg font-black uppercase leading-none tracking-[-0.04em]">Convite de equipe</h1>
              <p className="mt-1 text-[11px] font-bold uppercase text-white/80">Use seu perfil gamer original</p>
            </div>
          </div>
        </header>

        <section className="space-y-3 p-4">
          <div className="border border-cyan-200 bg-cyan-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-700">Token recebido</p>
            <p className="mt-1 break-all text-[22px] font-black tracking-[0.16em] text-[#142340]">{token || 'SEM TOKEN'}</p>
          </div>

          {checking ? (
            <div className="flex h-14 items-center justify-center gap-2 border border-zinc-200 bg-zinc-50 text-xs font-black uppercase text-zinc-600">
              <Loader2 className="animate-spin" size={17} /> Verificando conta
            </div>
          ) : !logado ? (
            <div className="space-y-3 border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-800">
                <LogIn size={17} /> Entre para continuar
              </div>
              <p className="text-xs font-semibold leading-relaxed text-amber-900/75">
                O jogador entra com a conta dele, escolhe o perfil gamer já cadastrado e o sistema escala automaticamente.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/login?redirect=${encodeURIComponent(redirectAtual)}`} className="grid h-11 place-items-center bg-[#142340] text-[11px] font-black uppercase text-white">
                  Entrar
                </Link>
                <Link href={`/cadastro?redirect=${encodeURIComponent(redirectAtual)}`} className="grid h-11 place-items-center border border-[#142340]/20 bg-white text-[11px] font-black uppercase text-[#142340]">
                  Criar conta
                </Link>
              </div>
            </div>
          ) : sucesso ? (
            <div className="space-y-3 border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-800">
                <CheckCircle2 size={17} /> Inscrição concluída
              </div>
              <p className="text-xs font-semibold leading-relaxed text-emerald-900/75">
                Você entrou na equipe e já foi escalado automaticamente neste campeonato.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/escala/${sucesso.campeonato_id}`)}
                className="h-11 w-full bg-emerald-500 text-[11px] font-black uppercase text-white"
              >
                Abrir campeonato
              </button>
            </div>
          ) : perfis.length === 0 ? (
            <div className="space-y-3 border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-800">
                <Gamepad2 size={17} /> Crie seu perfil gamer
              </div>
              <p className="text-xs font-semibold leading-relaxed text-blue-900/75">
                Não vamos criar perfil por este link. Use o formulário original do site e depois volte neste convite para entrar direto na equipe.
              </p>
              <Link
                href={`/perfil?aba=gamer&convite=${encodeURIComponent(token)}`}
                className="grid h-11 place-items-center bg-[#2563eb] text-[11px] font-black uppercase text-white"
              >
                Abrir formulário original
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Escolha o perfil gamer</label>
                <select
                  value={perfilSelecionadoId}
                  onChange={(e) => setPerfilSelecionadoId(e.target.value)}
                  className="h-12 w-full border border-zinc-300 bg-white px-3 text-xs font-black uppercase text-[#142340] outline-none focus:border-[#2563eb]"
                >
                  {perfis.map((perfil) => (
                    <option key={perfil.id} value={perfil.id}>{labelPerfil(perfil)}</option>
                  ))}
                </select>
              </div>

              {perfilSelecionado ? (
                <div className="flex items-center gap-3 border border-zinc-200 bg-zinc-50 p-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-zinc-200 bg-white">
                    {perfilSelecionado.foto_capa ? (
                      <img src={perfilSelecionado.foto_capa} alt="Perfil gamer" className="h-full w-full object-cover" />
                    ) : (
                      <Gamepad2 size={20} className="text-zinc-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase text-[#142340]">{perfilSelecionado.nick || 'Perfil gamer'}</p>
                    <p className="truncate text-[11px] font-bold uppercase text-zinc-500">
                      ID {perfilSelecionado.uid_jogo || '-'} • {perfilSelecionado.plataforma || 'mobile'} • {perfilSelecionado.funcao || 'função'}
                    </p>
                  </div>
                </div>
              ) : null}

              {erro ? <div className="border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div> : null}

              <button
                type="button"
                onClick={entrarComPerfil}
                disabled={enviando || !perfilSelecionadoId}
                className="flex h-12 w-full items-center justify-center gap-2 bg-emerald-500 text-[11px] font-black uppercase text-white disabled:opacity-60"
              >
                {enviando ? <Loader2 className="animate-spin" size={17} /> : <UserPlus size={17} />}
                Entrar na equipe e escalar
              </button>

              <Link href={`/perfil?aba=gamer&convite=${encodeURIComponent(token)}`} className="grid h-10 place-items-center border border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                Editar/criar perfil gamer original
              </Link>
            </div>
          )}

          {erro && !checking && (logado ? perfis.length === 0 : false) ? (
            <div className="border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{erro}</div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
