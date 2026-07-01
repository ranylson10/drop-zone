'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, Loader2, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react'

type Profile = {
  id: string
  username?: string | null
  nome_exibicao?: string | null
  foto_url?: string | null
}

type Membro = {
  id: string
  user_id: string
  tipo: string
  created_at?: string | null
  profile?: Profile | null
}

type Convite = {
  id: string
  user_id: string
  tipo: string
  status: string
  mensagem?: string | null
  created_at?: string | null
  profile?: Profile | null
  produtoras?: { id: string; nome: string; logo_url?: string | null } | null
}

function nomePerfil(profile?: Profile | null) {
  return profile?.nome_exibicao || profile?.username || 'Usuário'
}

function avatarPerfil(profile?: Profile | null, seed = 'user') {
  return profile?.foto_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
}

export default function GestaoProdutoraPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const produtoraId = params?.id
  const conviteRecebidoId = searchParams.get('convite') || ''

  const [token, setToken] = useState('')
  const [produtora, setProdutora] = useState<any>(null)
  const [membros, setMembros] = useState<Membro[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [conviteRecebido, setConviteRecebido] = useState<Convite | null>(null)
  const [podeGerenciar, setPodeGerenciar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Profile | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const convitesPendentes = useMemo(
    () => convites.filter((convite) => convite.status === 'pendente'),
    [convites]
  )

  const carregar = useCallback(async () => {
    if (!produtoraId) return

    setLoading(true)
    setErro('')

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token || ''
    setToken(accessToken)

    if (!accessToken) {
      setErro('Faça login para gerenciar ou responder convites.')
      setLoading(false)
      return
    }

    const url = conviteRecebidoId
      ? `/api/produtoras/${produtoraId}/convites?convite=${encodeURIComponent(conviteRecebidoId)}`
      : `/api/produtoras/${produtoraId}/convites`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const json = await res.json()

    if (!res.ok) {
      setErro(json?.error || 'Erro ao carregar gestão da produtora.')
      setLoading(false)
      return
    }

    setPodeGerenciar(Boolean(json.podeGerenciar))
    setProdutora(json.produtora || json.convite?.produtoras || null)
    setMembros(json.membros || [])
    setConvites(json.convites || [])
    setConviteRecebido(json.convite || null)
    setLoading(false)
  }, [conviteRecebidoId, produtoraId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    if (!modalAberto || !token || busca.trim().length < 2 || !produtoraId) {
      setUsuarios([])
      return
    }

    const timeout = window.setTimeout(async () => {
      const res = await fetch(`/api/produtoras/${produtoraId}/convites?q=${encodeURIComponent(busca.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setUsuarios(res.ok ? json.usuarios || [] : [])
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [busca, modalAberto, produtoraId, token])

  async function enviarConvite() {
    if (!produtoraId || !usuarioSelecionado || !token) return

    setSalvando(true)
    setErro('')
    setSucesso('')

    const res = await fetch(`/api/produtoras/${produtoraId}/convites`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: usuarioSelecionado.id,
        mensagem: mensagem.trim(),
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setErro(json?.error || 'Erro ao enviar convite.')
      setSalvando(false)
      return
    }

    setSucesso('Convite enviado. O usuário receberá uma notificação para aceitar.')
    setModalAberto(false)
    setBusca('')
    setUsuarioSelecionado(null)
    setMensagem('')
    setSalvando(false)
    await carregar()
  }

  async function responderConvite(conviteId: string, acao: 'aceitar' | 'recusar' | 'cancelar') {
    if (!produtoraId || !token) return

    setSalvando(true)
    setErro('')
    setSucesso('')

    const res = await fetch(`/api/produtoras/${produtoraId}/convites/${conviteId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ acao }),
    })
    const json = await res.json()

    if (!res.ok) {
      setErro(json?.error || 'Erro ao responder convite.')
      setSalvando(false)
      return
    }

    setSucesso(
      acao === 'aceitar'
        ? 'Convite aceito. Você agora pode administrar os campeonatos desta produtora.'
        : acao === 'cancelar'
          ? 'Convite cancelado.'
          : 'Convite recusado.'
    )
    setSalvando(false)
    await carregar()
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f7f7]">
        <Loader2 className="animate-spin text-[#2563eb]" size={40} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <h1 className="text-2xl font-semibold uppercase text-[#2563eb]">Gestão de Ajudantes</h1>
          <p className="text-xs font-bold uppercase text-zinc-500">
            Convide administradores para controlar os campeonatos da produtora
          </p>
        </div>

        {podeGerenciar ? (
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center justify-center gap-2 bg-[#2563eb] px-6 py-3 text-xs font-semibold uppercase text-white transition-all hover:bg-[#174bd6]"
          >
            <UserPlus size={16} />
            Convidar
          </button>
        ) : null}
      </div>

      {erro ? <div className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{erro}</div> : null}
      {sucesso ? <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{sucesso}</div> : null}

      {conviteRecebido ? (
        <div className="border border-[#2563eb]/20 bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-[#2563eb]/10 text-[#2563eb]">
              <ShieldCheck size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2563eb]">Convite recebido</div>
              <h2 className="mt-1 text-xl font-black uppercase text-[#142340]">
                Administrar {conviteRecebido.produtoras?.nome || produtora?.nome || 'produtora'}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Ao aceitar, você poderá criar, editar e controlar campeonatos vinculados a esta produtora.
              </p>
              {conviteRecebido.status === 'pendente' ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    disabled={salvando}
                    onClick={() => responderConvite(conviteRecebido.id, 'aceitar')}
                    className="bg-emerald-600 px-5 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
                  >
                    Aceitar convite
                  </button>
                  <button
                    disabled={salvando}
                    onClick={() => responderConvite(conviteRecebido.id, 'recusar')}
                    className="border border-red-200 px-5 py-3 text-xs font-black uppercase text-red-600 disabled:opacity-50"
                  >
                    Recusar
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-xs font-black uppercase text-zinc-500">Status: {conviteRecebido.status}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {podeGerenciar ? (
        <>
          <section className="border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 p-4">
              <h2 className="text-sm font-black uppercase text-[#142340]">Administradores ativos</h2>
              <p className="text-xs text-zinc-500">Esses usuários podem administrar os campeonatos da produtora.</p>
            </div>
            <div className="divide-y divide-zinc-100">
              {membros.length ? (
                membros.map((membro) => (
                  <div key={membro.id} className="flex items-center gap-4 p-4">
                    <img
                      src={avatarPerfil(membro.profile, membro.id)}
                      className="h-12 w-12 rounded-full border border-zinc-200 object-cover"
                      alt={nomePerfil(membro.profile)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black uppercase text-[#142340]">{nomePerfil(membro.profile)}</p>
                      <p className="text-[10px] font-bold uppercase text-zinc-500">{membro.tipo}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
                      <Check size={12} />
                      Ativo
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-sm font-semibold text-zinc-500">Nenhum ajudante ativo ainda.</div>
              )}
            </div>
          </section>

          <section className="border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 p-4">
              <h2 className="text-sm font-black uppercase text-[#142340]">Convites enviados</h2>
              <p className="text-xs text-zinc-500">Acompanhe quem ainda precisa aceitar.</p>
            </div>
            <div className="divide-y divide-zinc-100">
              {convitesPendentes.length ? (
                convitesPendentes.map((convite) => (
                  <div key={convite.id} className="flex items-center gap-4 p-4">
                    <img
                      src={avatarPerfil(convite.profile, convite.id)}
                      className="h-11 w-11 rounded-full border border-zinc-200 object-cover"
                      alt={nomePerfil(convite.profile)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black uppercase text-[#142340]">{nomePerfil(convite.profile)}</p>
                      <p className="text-[10px] font-bold uppercase text-amber-600">Pendente</p>
                    </div>
                    <button
                      disabled={salvando}
                      onClick={() => responderConvite(convite.id, 'cancelar')}
                      className="border border-red-200 p-3 text-red-500 disabled:opacity-50"
                      title="Cancelar convite"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-sm font-semibold text-zinc-500">Nenhum convite pendente.</div>
              )}
            </div>
          </section>
        </>
      ) : null}

      {modalAberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 p-5">
              <div>
                <h2 className="text-lg font-black uppercase text-[#142340]">Convidar administrador</h2>
                <p className="text-xs text-zinc-500">Busque pelo perfil de usuário da pessoa.</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="border border-zinc-200 p-2">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Usuário</span>
                <div className="mt-2 flex items-center gap-2 border border-zinc-200 px-3">
                  <Search size={16} className="text-zinc-400" />
                  <input
                    value={busca}
                    onChange={(event) => {
                      setBusca(event.target.value)
                      setUsuarioSelecionado(null)
                    }}
                    placeholder="Buscar por nome ou @username"
                    className="h-11 flex-1 outline-none"
                  />
                </div>
              </label>

              {usuarioSelecionado ? (
                <div className="flex items-center gap-3 border border-[#2563eb]/20 bg-[#2563eb]/5 p-3">
                  <img src={avatarPerfil(usuarioSelecionado, usuarioSelecionado.id)} className="h-10 w-10 rounded-full object-cover" alt={nomePerfil(usuarioSelecionado)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase">{nomePerfil(usuarioSelecionado)}</p>
                    <p className="text-xs text-zinc-500">@{usuarioSelecionado.username || 'usuario'}</p>
                  </div>
                  <Check size={18} className="text-[#2563eb]" />
                </div>
              ) : usuarios.length ? (
                <div className="max-h-56 divide-y divide-zinc-100 overflow-auto border border-zinc-200">
                  {usuarios.map((usuario) => (
                    <button
                      key={usuario.id}
                      onClick={() => setUsuarioSelecionado(usuario)}
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-zinc-50"
                    >
                      <img src={avatarPerfil(usuario, usuario.id)} className="h-9 w-9 rounded-full object-cover" alt={nomePerfil(usuario)} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black uppercase">{nomePerfil(usuario)}</p>
                        <p className="text-xs text-zinc-500">@{usuario.username || 'usuario'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : busca.trim().length >= 2 ? (
                <div className="border border-dashed border-zinc-200 p-4 text-sm font-semibold text-zinc-500">Nenhum usuário encontrado.</div>
              ) : null}

              <textarea
                value={mensagem}
                onChange={(event) => setMensagem(event.target.value)}
                placeholder="Mensagem opcional para o convite"
                className="h-24 w-full resize-none border border-zinc-200 p-3 text-sm outline-none"
              />

              <button
                disabled={!usuarioSelecionado || salvando}
                onClick={enviarConvite}
                className="w-full bg-[#2563eb] px-5 py-3 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar convite
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
