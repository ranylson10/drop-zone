'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  Building2,
  Check,
  Gamepad2,
  Loader2,
  Medal,
  Plus,
  Shield,
  User,
  Users,
} from 'lucide-react'
import FormCriarEquipe from '@/app/components/FormCriarEquipe'
import FormProdutora from '@/app/components/FormProdutora'
import ServidorSelect from '@/app/components/ServidorSelect'
import { usePerfil } from '@/app/contexts/PerfilContext'
import { supabase } from '@/lib/supabase'
import {
  getIdentityImage,
  getIdentityLabel,
  getIdentityName,
  getModeDashboardPath,
  getModoUsoLabel,
  MODE_INTENT_STORAGE_KEY,
  MODE_STORAGE_KEY,
  normalizarModoUso,
  type TipoIdentidade,
  type TipoModoUso,
} from '@/lib/identity'

type CreateMode = null | 'jogo' | 'equipe' | 'produtora'

const cardBase =
  'group flex min-h-[124px] w-full items-center gap-4 border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg'

function AvatarIdentidade({ perfil, tipo }: { perfil: any; tipo: TipoIdentidade }) {
  const image = getIdentityImage(perfil)
  const tone =
    tipo === 'produtora'
      ? 'border-orange-200 bg-orange-50 text-orange-700'
      : tipo === 'equipe'
        ? 'border-violet-200 bg-violet-50 text-violet-700'
        : tipo === 'jogo'
          ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
          : 'border-blue-200 bg-blue-50 text-blue-700'

  return (
    <div className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden border ${tone}`}>
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : tipo === 'produtora' ? (
        <Building2 size={25} />
      ) : tipo === 'equipe' ? (
        <Shield size={25} />
      ) : tipo === 'jogo' ? (
        <Gamepad2 size={25} />
      ) : (
        <User size={25} />
      )}
    </div>
  )
}

function IdentityCard({
  tipo,
  perfil,
  active,
  onSelect,
}: {
  tipo: TipoIdentidade
  perfil: any
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${cardBase} ${
        active ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      <AvatarIdentidade perfil={perfil} tipo={tipo} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {getIdentityLabel(tipo)}
          </span>
          {active ? (
            <span className="inline-flex items-center gap-1 border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700">
              <Check size={11} /> Ativo
            </span>
          ) : null}
        </div>
        <div className="mt-2 truncate text-lg font-black uppercase tracking-[-0.03em] text-slate-950">
          {getIdentityName(perfil)}
        </div>
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
          Suas interacoes aparecem usando esta identidade.
        </p>
      </div>
      <ArrowRight size={18} className="text-slate-300 transition group-hover:text-blue-600" />
    </button>
  )
}

function CriarPerfilJogo({
  onCreated,
  onCancel,
}: {
  onCreated: (perfilId: string) => Promise<void>
  onCancel: () => void
}) {
  const [nick, setNick] = useState('')
  const [uidJogo, setUidJogo] = useState('')
  const [servidor, setServidor] = useState('BR')
  const [funcao, setFuncao] = useState('')
  const [plataforma, setPlataforma] = useState<'mobile' | 'emulador'>('mobile')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const nickLimpo = nick.trim()
    if (!nickLimpo) {
      setErro('Informe o nick do perfil de jogo.')
      return
    }

    try {
      setLoading(true)
      setErro(null)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) throw new Error('Faca login para criar um perfil de jogo.')

      const { count, error: countError } = await supabase
        .from('perfis_jogo')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('ativo', true)

      if (countError) throw countError
      if (Number(count || 0) >= 2) throw new Error('Voce ja atingiu o limite de 2 perfis de jogo.')

      const { data, error } = await supabase
        .from('perfis_jogo')
        .insert({
          user_id: user.id,
          nick: nickLimpo,
          uid_jogo: uidJogo.trim() || null,
          servidor: servidor || 'BR',
          funcao: funcao.trim() || null,
          plataforma,
          ativo: true,
        })
        .select('id')
        .single()

      if (error) throw error
      await onCreated(data.id)
    } catch (err: any) {
      setErro(err?.message || 'Nao foi possivel criar o perfil de jogo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="border border-slate-200 bg-white p-4 shadow-xl">
      <div className="mb-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
          <Gamepad2 size={14} /> Perfil de jogo
        </div>
        <h2 className="mt-1 text-xl font-black uppercase text-slate-950">Criar perfil gamer</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input required value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Nick" className="h-11 border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-500" />
        <input value={uidJogo} onChange={(e) => setUidJogo(e.target.value)} placeholder="UID do jogo" className="h-11 border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-500" />
        <ServidorSelect value={servidor} onChange={setServidor} className="h-11 border-slate-200 px-3 text-sm font-bold" />
        <input value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="Funcao: rush, suporte..." className="h-11 border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-500" />
        <select value={plataforma} onChange={(e) => setPlataforma(e.target.value as 'mobile' | 'emulador')} className="h-11 border border-slate-200 px-3 text-sm font-bold outline-none focus:border-blue-500 md:col-span-2">
          <option value="mobile">Mobile</option>
          <option value="emulador">Emulador</option>
        </select>
      </div>

      {erro ? <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</div> : null}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="h-11 border border-slate-300 px-5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">Cancelar</button>
        <button disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 bg-blue-600 px-5 text-[11px] font-black uppercase tracking-[0.12em] text-white disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Criar perfil
        </button>
      </div>
    </form>
  )
}

function IdentidadeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    user,
    loading,
    perfilUsuario,
    perfisJogo,
    equipes,
    produtoras,
    perfilAtivo,
    tipoPerfil,
    setPerfilAtivoByTipo,
    recarregarPerfis,
  } = usePerfil()
  const [createMode, setCreateMode] = useState<CreateMode>(null)

  const redirectTo = searchParams.get('redirect') || ''
  const modoEscolhido = normalizarModoUso(searchParams.get('modo') || searchParams.get('novo'))

  useEffect(() => {
    if (!loading && !user) {
      const destino = modoEscolhido ? `/identidade?modo=${modoEscolhido}` : '/identidade'
      router.replace(`/login?redirect=${encodeURIComponent(destino)}`)
    }
  }, [loading, modoEscolhido, router, user])

  useEffect(() => {
    if (!modoEscolhido || !user) return
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODE_INTENT_STORAGE_KEY, modoEscolhido)
      window.localStorage.setItem(MODE_STORAGE_KEY, modoEscolhido)
    }

    if (modoEscolhido === 'jogador' && perfisJogo.length === 0) setCreateMode('jogo')
    if (modoEscolhido === 'equipe' && equipes.length === 0) setCreateMode('equipe')
    if (modoEscolhido === 'produtora' && produtoras.length === 0) setCreateMode('produtora')
    if (modoEscolhido === 'manager') setCreateMode(null)
  }, [equipes.length, modoEscolhido, perfisJogo.length, produtoras.length, user])

  const totalIdentidades = useMemo(
    () => 1 + perfisJogo.length + equipes.length + produtoras.length,
    [equipes.length, perfisJogo.length, produtoras.length]
  )

  async function selecionar(tipo: TipoIdentidade, id?: string | null, modoManual?: TipoModoUso) {
    const modo = modoManual || (tipo === 'jogo' ? 'jogador' : tipo === 'equipe' ? 'equipe' : tipo === 'produtora' ? 'produtora' : 'visitante')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODE_STORAGE_KEY, modo)
      window.localStorage.removeItem(MODE_INTENT_STORAGE_KEY)
    }
    setPerfilAtivoByTipo(tipo, id)
    const destino = redirectTo && redirectTo !== '/identidade' ? redirectTo : getModeDashboardPath(modo)
    router.push(destino)
  }

  async function ativarAposCriar(tipo: Exclude<TipoIdentidade, 'usuario'>, id: string) {
    const modo = tipo === 'jogo' ? 'jogador' : tipo === 'equipe' ? 'equipe' : 'produtora'
    window.localStorage.setItem('ff_tipo_perfil_ativo', tipo)
    window.localStorage.setItem('ff_id_perfil_ativo', id)
    window.localStorage.setItem(MODE_STORAGE_KEY, modo)
    window.localStorage.removeItem(MODE_INTENT_STORAGE_KEY)
    await recarregarPerfis()
    router.push(getModeDashboardPath(modo))
  }

  if (loading || !user) {
    return (
      <main className="grid min-h-[70vh] place-items-center text-slate-950">
        <div className="inline-flex items-center gap-2 border border-slate-200 bg-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Carregando identidades
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                <Users size={15} /> Central de identidade
              </div>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em] text-slate-950">
                Configurar modo de uso
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Escolha como quer usar a plataforma agora. O painel, menu e atalhos ficam moldados para esse modo.
              </p>
            </div>
            <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              {totalIdentidades} identidade(s)
            </div>
          </div>
        </section>

        {modoEscolhido ? (
          <section className="border border-blue-200 bg-blue-50 p-4 text-blue-950">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Modo escolhido</div>
            <div className="mt-1 text-lg font-black uppercase">{getModoUsoLabel(modoEscolhido)}</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-blue-900/70">Vamos deixar a tela inicial e os atalhos focados nesse tipo de uso.</p>
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2">
          {perfilUsuario ? (
            <IdentityCard
              tipo="usuario"
              perfil={perfilUsuario}
              active={tipoPerfil === 'usuario' && perfilAtivo?.id === perfilUsuario.id}
              onSelect={() => selecionar('usuario', perfilUsuario.id, 'visitante')}
            />
          ) : null}

          {perfisJogo.map((perfil) => (
            <IdentityCard
              key={`jogo-${perfil.id}`}
              tipo="jogo"
              perfil={perfil}
              active={tipoPerfil === 'jogo' && perfilAtivo?.id === perfil.id}
              onSelect={() => selecionar('jogo', perfil.id)}
            />
          ))}

          {equipes.map((perfil) => (
            <IdentityCard
              key={`equipe-${perfil.id}`}
              tipo="equipe"
              perfil={perfil}
              active={tipoPerfil === 'equipe' && perfilAtivo?.id === perfil.id}
              onSelect={() => selecionar('equipe', perfil.id)}
            />
          ))}

          {produtoras.map((perfil) => (
            <IdentityCard
              key={`produtora-${perfil.id}`}
              tipo="produtora"
              perfil={perfil}
              active={tipoPerfil === 'produtora' && perfilAtivo?.id === perfil.id}
              onSelect={() => selecionar('produtora', perfil.id)}
            />
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <button type="button" onClick={() => setCreateMode('jogo')} className="border border-cyan-200 bg-cyan-50 p-4 text-left text-cyan-900 transition hover:border-cyan-400">
            <Gamepad2 size={22} />
            <div className="mt-3 text-sm font-black uppercase">Criar perfil de jogo</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-cyan-900/65">Use nick, UID, servidor e funcao de jogador.</p>
          </button>
          <button type="button" onClick={() => setCreateMode('equipe')} className="border border-violet-200 bg-violet-50 p-4 text-left text-violet-900 transition hover:border-violet-400">
            <Shield size={22} />
            <div className="mt-3 text-sm font-black uppercase">Criar equipe</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-violet-900/65">Cadastre uma equipe para aparecer como organizacao.</p>
          </button>
          <button type="button" onClick={() => setCreateMode('produtora')} className="border border-orange-200 bg-orange-50 p-4 text-left text-orange-900 transition hover:border-orange-400">
            <Building2 size={22} />
            <div className="mt-3 text-sm font-black uppercase">Criar produtora</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-orange-900/65">Crie identidade de produtora para eventos e campeonatos.</p>
          </button>

          <button type="button" onClick={() => selecionar('usuario', perfilUsuario?.id, 'manager')} className="border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-900 transition hover:border-emerald-400">
            <Medal size={22} />
            <div className="mt-3 text-sm font-black uppercase">Entrar como manager</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-emerald-900/65">Use esse modo para gerenciar equipes, lines e pendências operacionais.</p>
          </button>
        </section>

        {createMode ? (
          <section className="mx-auto max-w-5xl">
            {createMode === 'jogo' ? (
              <CriarPerfilJogo onCancel={() => setCreateMode(null)} onCreated={(id) => ativarAposCriar('jogo', id)} />
            ) : null}
            {createMode === 'equipe' ? (
              <FormCriarEquipe
                titulo="Criar perfil de equipe"
                descricao="Depois de salvar, esta equipe vira uma identidade selecionavel para suas interacoes."
                onCancel={() => setCreateMode(null)}
                onSuccess={(equipe) => equipe?.id && ativarAposCriar('equipe', equipe.id)}
              />
            ) : null}
            {createMode === 'produtora' ? (
              <FormProdutora
                mode="create"
                embedded
                onCancel={() => setCreateMode(null)}
                onSuccess={(produtora) => produtora?.id && ativarAposCriar('produtora', produtora.id)}
              />
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  )
}

export default function IdentidadePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-[70vh] place-items-center text-slate-950">
          <div className="inline-flex items-center gap-2 border border-slate-200 bg-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Carregando identidades
          </div>
        </main>
      }
    >
      <IdentidadeContent />
    </Suspense>
  )
}
