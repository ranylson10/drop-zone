'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Modo = 'inicio' | 'equipe' | 'jogador'

function numero(valor: any) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function dataCurta(valor?: string | null) {
  if (!valor) return '---'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '---'
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function statusInscricao(campeonato: any) {
  const status = String(campeonato?.status || '').toLowerCase()
  const agora = new Date()
  const abertura = campeonato?.data_abertura_inscricoes ? new Date(campeonato.data_abertura_inscricoes) : null
  const encerramento = campeonato?.data_encerramento_inscricoes ? new Date(campeonato.data_encerramento_inscricoes) : null

  if (status && !['inscricoes', 'aberto', 'aberta'].includes(status)) return 'Fechadas'
  if (abertura && agora < abertura) return 'Aguardando abertura'
  if (encerramento && agora > encerramento) return 'Encerradas'
  return 'Abertas'
}

export default function CampeonatoMobileWhatsappPage() {
  const params = useParams()
  const slug = String(params?.slug || '')

  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState<Modo>('inicio')
  const [user, setUser] = useState<any>(null)
  const [campeonato, setCampeonato] = useState<any>(null)
  const [perfilJogo, setPerfilJogo] = useState<any>(null)
  const [equipesUsuario, setEquipesUsuario] = useState<any[]>([])
  const [equipesCampeonato, setEquipesCampeonato] = useState<any[]>([])
  const [jogadorCampeonato, setJogadorCampeonato] = useState<any>(null)
  const [mvpJogador, setMvpJogador] = useState<any>({ kills: 0, partidas: 0, posicao: null })

  const limiteJogadores = useMemo(() => {
    return numero(campeonato?.jogadores_por_equipe) + numero(campeonato?.reservas_permitidos)
  }, [campeonato])

  const inscricaoStatus = useMemo(() => statusInscricao(campeonato), [campeonato])

  useEffect(() => {
    carregar()
  }, [slug])

  async function carregar() {
    setLoading(true)

    const { data: authData } = await supabase.auth.getUser()
    const usuario = authData?.user || null
    setUser(usuario)

    const { data: campeonatoData } = await supabase
      .from('campeonatos')
      .select('*')
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .maybeSingle()

    setCampeonato(campeonatoData || null)

    if (!usuario || !campeonatoData?.id) {
      setLoading(false)
      return
    }

    const { data: perfilData } = await supabase
      .from('perfis_jogo')
      .select('*')
      .eq('user_id', usuario.id)
      .maybeSingle()

    setPerfilJogo(perfilData || null)

    const { data: membrosData } = await supabase
      .from('membros_equipe')
      .select('*, equipes(*)')
      .eq('user_id', usuario.id)

    setEquipesUsuario(membrosData || [])

    const equipeIds = (membrosData || [])
      .map((item: any) => item?.equipes?.id || item?.equipe_id)
      .filter(Boolean)

    if (equipeIds.length) {
      const { data: inscricoesEquipe } = await supabase
        .from('campeonato_equipes')
        .select('*, equipes(*)')
        .eq('campeonato_id', campeonatoData.id)
        .in('equipe_id', equipeIds)

      const inscricoes = inscricoesEquipe || []

      const inscricoesComJogadores = await Promise.all(
        inscricoes.map(async (inscricao: any) => {
          const { data: jogadores } = await supabase
            .from('jogadores_campeonato')
            .select('*, perfis_jogo(*)')
            .eq('campeonato_id', campeonatoData.id)
            .eq('equipe_id', inscricao.equipe_id)
            .order('created_at', { ascending: true })

          return { ...inscricao, jogadores: jogadores || [] }
        })
      )

      setEquipesCampeonato(inscricoesComJogadores)
    }

    if (perfilData?.id) {
      const { data: jogadorData } = await supabase
        .from('jogadores_campeonato')
        .select('*, equipes(*)')
        .eq('campeonato_id', campeonatoData.id)
        .eq('perfil_jogo_id', perfilData.id)
        .maybeSingle()

      setJogadorCampeonato(jogadorData || null)

      const { data: mvpData } = await supabase
        .from('resultados_mvp')
        .select('perfil_jogo_id, abates, partida_id')
        .eq('campeonato_id', campeonatoData.id)
        .not('perfil_jogo_id', 'is', null)

      const mapa = new Map<string, { kills: number; partidas: Set<string> }>()
      ;(mvpData || []).forEach((linha: any) => {
        const id = linha.perfil_jogo_id
        if (!id) return
        if (!mapa.has(id)) mapa.set(id, { kills: 0, partidas: new Set() })
        const atual = mapa.get(id)!
        atual.kills += numero(linha.abates)
        if (linha.partida_id) atual.partidas.add(linha.partida_id)
      })

      const ranking = Array.from(mapa.entries())
        .map(([id, item]) => ({ id, kills: item.kills, partidas: item.partidas.size }))
        .sort((a, b) => b.kills - a.kills)

      const pos = ranking.findIndex((item) => item.id === perfilData.id)
      const meu = ranking[pos]

      setMvpJogador({
        kills: meu?.kills || 0,
        partidas: meu?.partidas || 0,
        posicao: pos >= 0 ? pos + 1 : null,
      })
    }

    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center text-sm font-bold text-slate-500">Carregando...</div>
  }

  if (!campeonato) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-5">
        <div className="w-full max-w-sm border border-slate-200 bg-white p-5 text-center">
          <div className="text-lg font-black text-[#142340]">Campeonato não encontrado</div>
          <Link href="/campeonatos" className="mt-4 inline-flex h-10 items-center justify-center border border-[#2563eb] bg-[#2563eb] px-4 text-xs font-black uppercase text-white">Ver campeonatos</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#eef3fb] text-[#142340]">
      <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm">
        <header className="bg-[#2563eb] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden border border-white/30 bg-white/10">
              {campeonato.logo_url ? <img src={campeonato.logo_url} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80">Inscrição mobile</div>
              <h1 className="truncate text-2xl font-black uppercase leading-tight">{campeonato.nome}</h1>
              <div className="mt-1 text-xs font-bold opacity-90">{campeonato.tipo_campeonato || campeonato.tipo || 'Campeonato'} • {campeonato.plataforma || 'Free Fire'}</div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-3 border-b border-slate-200 bg-white text-center">
          <MiniInfo label="Status" value={inscricaoStatus} />
          <MiniInfo label="Vagas" value={String(campeonato.vagas || campeonato.quantidade_equipes || 0)} />
          <MiniInfo label="Jogadores" value={limiteJogadores ? String(limiteJogadores) : '---'} />
        </section>

        {!user ? (
          <main className="p-4">
            <div className="border border-slate-200 bg-[#f8fafc] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2563eb]">Acesso</div>
              <h2 className="mt-1 text-xl font-black uppercase">Entrar no campeonato</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">Faça login, crie sua conta ou recupere sua senha para gerenciar equipe e acompanhar jogador.</p>
            </div>
            <div className="mt-4 space-y-2">
              <Link href={`/login?next=/mobile/${slug}`} className="flex h-12 items-center justify-center bg-[#2563eb] text-sm font-black uppercase text-white">Login</Link>
              <Link href={`/cadastro?next=/mobile/${slug}`} className="flex h-12 items-center justify-center border border-slate-300 bg-white text-sm font-black uppercase">Criar conta</Link>
              <Link href="/recuperar" className="flex h-12 items-center justify-center border border-slate-300 bg-white text-sm font-black uppercase">Recuperar senha</Link>
            </div>
          </main>
        ) : (
          <main className="p-4">
            {modo === 'inicio' && (
              <div className="space-y-3">
                <button onClick={() => setModo('equipe')} className="w-full border border-slate-200 bg-white p-4 text-left">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2563eb]">Entrar como</div>
                  <div className="mt-1 text-2xl font-black uppercase">Equipe</div>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Ver inscrição da equipe, acompanhar jogadores escalados e adicionar atletas.</p>
                </button>
                <button onClick={() => setModo('jogador')} className="w-full border border-slate-200 bg-white p-4 text-left">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2563eb]">Entrar como</div>
                  <div className="mt-1 text-2xl font-black uppercase">Jogador</div>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Ver se você está inscrito, equipe, abates e posição no MVP.</p>
                </button>
              </div>
            )}

            {modo === 'equipe' && (
              <div className="space-y-3">
                <Voltar onClick={() => setModo('inicio')} />
                <TituloSecao titulo="Área da equipe" subtitulo="Controle de inscrição enviado pelo link do WhatsApp." />
                {equipesUsuario.length === 0 ? (
                  <Aviso titulo="Você ainda não tem equipe" texto="Crie uma equipe no site para conseguir inscrever e escalar jogadores neste campeonato." acaoHref="/equipe/nova" acao="Criar equipe" />
                ) : equipesCampeonato.length === 0 ? (
                  <Aviso titulo="Nenhuma equipe inscrita" texto="Você tem equipe no site, mas ela ainda não aparece inscrita neste campeonato." acaoHref={`/campeonatos/${campeonato.id}`} acao="Ver campeonato" />
                ) : (
                  equipesCampeonato.map((inscricao: any) => (
                    <EquipeInscrita key={inscricao.id} inscricao={inscricao} limiteJogadores={limiteJogadores} campeonatoId={campeonato.id} />
                  ))
                )}
              </div>
            )}

            {modo === 'jogador' && (
              <div className="space-y-3">
                <Voltar onClick={() => setModo('inicio')} />
                <TituloSecao titulo="Área do jogador" subtitulo="Acompanhe sua inscrição e seu desempenho no MVP." />
                {!perfilJogo ? (
                  <Aviso titulo="Sem conta de jogo" texto="Crie seu perfil de jogo para aparecer oficialmente no campeonato e no ranking." acaoHref="/jogadores" acao="Criar perfil" />
                ) : (
                  <div className="border border-slate-200 bg-white p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Perfil de jogo</div>
                    <div className="mt-1 text-xl font-black uppercase">{perfilJogo.nick_jogo || perfilJogo.nick || 'Jogador'}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">UID {perfilJogo.uid_jogo || perfilJogo.uid || '---'}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <CardInfo label="Status" value={jogadorCampeonato ? 'Inscrito' : 'Não inscrito'} />
                  <CardInfo label="Equipe" value={jogadorCampeonato?.equipes?.nome || '---'} />
                  <CardInfo label="Abates" value={String(mvpJogador.kills || 0)} />
                  <CardInfo label="Posição MVP" value={mvpJogador.posicao ? `#${mvpJogador.posicao}` : '---'} />
                </div>
              </div>
            )}
          </main>
        )}

        <footer className="border-t border-slate-200 p-4 text-center text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">LEALT • Drop Zone</footer>
      </div>
    </div>
  )
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-slate-200 p-3 last:border-r-0">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-black">{value}</div>
    </div>
  )
}

function CardInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 truncate text-lg font-black uppercase">{value}</div>
    </div>
  )
}

function TituloSecao({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div className="border border-slate-200 bg-[#f8fafc] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2563eb]">WhatsApp</div>
      <h2 className="mt-1 text-xl font-black uppercase">{titulo}</h2>
      <p className="mt-1 text-sm font-semibold text-slate-500">{subtitulo}</p>
    </div>
  )
}

function Voltar({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="h-9 border border-slate-300 bg-white px-3 text-xs font-black uppercase">Voltar</button>
}

function Aviso({ titulo, texto, acaoHref, acao }: { titulo: string; texto: string; acaoHref: string; acao: string }) {
  return (
    <div className="border border-slate-200 bg-white p-4">
      <div className="text-lg font-black uppercase">{titulo}</div>
      <p className="mt-1 text-sm font-semibold text-slate-500">{texto}</p>
      <Link href={acaoHref} className="mt-4 flex h-10 items-center justify-center bg-[#2563eb] text-xs font-black uppercase text-white">{acao}</Link>
    </div>
  )
}

function EquipeInscrita({ inscricao, limiteJogadores, campeonatoId }: { inscricao: any; limiteJogadores: number; campeonatoId: string }) {
  const equipe = inscricao?.equipes
  const jogadores = inscricao?.jogadores || []

  return (
    <div className="border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <div className="h-12 w-12 overflow-hidden border border-slate-200 bg-slate-100">
          {equipe?.logo_url ? <img src={equipe.logo_url} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-black uppercase">{equipe?.nome || inscricao?.nome_exibicao || 'Equipe'}</div>
          <div className="text-xs font-bold text-slate-500">{jogadores.length} / {limiteJogadores || '---'} jogadores escalados</div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {jogadores.length === 0 ? (
          <div className="p-4 text-sm font-semibold text-slate-500">Nenhum jogador inscrito ainda.</div>
        ) : (
          jogadores.map((jogador: any, index: number) => (
            <div key={jogador.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-black uppercase">{index + 1}. {jogador?.perfis_jogo?.nick_jogo || jogador?.nick_snapshot || 'Jogador'}</div>
                <div className="text-xs font-bold text-slate-400">UID {jogador?.perfis_jogo?.uid_jogo || jogador?.uid_jogo_snapshot || '---'}</div>
              </div>
              <span className="bg-[#ecfdf5] px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Inscrito</span>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-200 p-4">
        <Link href={`/campeonatos/${campeonatoId}?aba=jogadores`} className="flex h-10 items-center justify-center bg-[#111827] text-xs font-black uppercase text-white">Adicionar jogadores</Link>
      </div>
    </div>
  )
}
