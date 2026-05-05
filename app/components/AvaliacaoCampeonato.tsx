'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
 AlertTriangle,
 MessageSquare,
 Reply,
 Send,
 Star,
 ThumbsUp,
 User,
 ShieldCheck,
 Trophy,
 Medal,
} from 'lucide-react'

type Perfil = {
 id?: string
 nome_exibicao?: string | null
 username?: string | null
 foto_url?: string | null
}

type Resposta = {
 id: string
 comentario: string
 created_at: string
 user_id: string
 perfil: Perfil | Perfil[] | null
}

type AvaliacaoData = {
 id: string
 nota: number
 comentario: string
 created_at: string
 user_id: string
 tipo_avaliador: 'equipe' | 'jogador'
 campeonato_equipe_id: string | null
 jogador_campeonato_id: string | null
 perfil: Perfil | Perfil[] | null
 curtidas: { id?: string; user_id: string }[]
 respostas: Resposta[]
}

type OpcaoAvaliador = {
 id: string
 label: string
 subtitulo?: string
}

function normalizarPerfil(perfil: Perfil | Perfil[] | null | undefined): Perfil | null {
 if (!perfil) return null
 if (Array.isArray(perfil)) return perfil[0] || null
 return perfil
}

function nomePerfil(perfil: Perfil | null | undefined) {
 return perfil?.nome_exibicao || perfil?.username || 'Usuário'
}

function formatarData(valor?: string | null) {
 if (!valor) return '---'
 const data = new Date(valor)
 if (Number.isNaN(data.getTime())) return '---'
 return data.toLocaleDateString('pt-BR')
}

function reputacaoLabel(media: number) {
 if (media >= 4.8) return 'Elite'
 if (media >= 4.5) return 'Excelente'
 if (media >= 4.0) return 'Muito boa'
 if (media >= 3.5) return 'Boa'
 if (media >= 3.0) return 'Regular'
 return 'Em evolução'
}

function reputacaoCor(media: number) {
 if (media >= 4.5) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
 if (media >= 4.0) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
 if (media >= 3.0) return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
 return 'text-rose-400 border-rose-500/30 bg-rose-500/10'
}

export default function AvaliacaoCampeonato({ campeonatoId }: { campeonatoId: string }) {
 const [avaliacoes, setAvaliacoes] = useState<AvaliacaoData[]>([])
 const [nota, setNota] = useState(5)
 const [comentario, setComentario] = useState('')
 const [loading, setLoading] = useState(false)
 const [errorMsg, setErrorMsg] = useState<string | null>(null)
 const [userActualId, setUserActualId] = useState<string | null>(null)
 const [replyingTo, setReplyingTo] = useState<string | null>(null)
 const [respostaTexto, setRespostaTexto] = useState('')
 const [tipoAvaliador, setTipoAvaliador] = useState<'equipe' | 'jogador'>('equipe')
 const [origemSelecionada, setOrigemSelecionada] = useState('')
 const [opcoesEquipe, setOpcoesEquipe] = useState<OpcaoAvaliador[]>([])
 const [opcoesJogador, setOpcoesJogador] = useState<OpcaoAvaliador[]>([])
 const [carregandoElegibilidade, setCarregandoElegibilidade] = useState(true)
 const [camp, setCamp] = useState<any>(null)
 const [reputacaoCampeonatos, setReputacaoCampeonatos] = useState<any[]>([])

 const totalAvaliacoes = avaliacoes.length
 const mediaNumerica =
 totalAvaliacoes > 0
 ? avaliacoes.reduce((acc, curr) => acc + Number(curr.nota || 0), 0) / totalAvaliacoes
 : 0
 const mediaNotas = mediaNumerica.toFixed(1)

 const totalCurtidas = useMemo(
 () => avaliacoes.reduce((acc, item) => acc + (item.curtidas?.length || 0), 0),
 [avaliacoes]
 )

 const calcularPercentual = (estrela: number) => {
 if (totalAvaliacoes === 0) return 0
 const qtd = avaliacoes.filter((a) => Number(a.nota) === estrela).length
 return Math.round((qtd / totalAvaliacoes) * 100)
 }

 const avaliacaoExistenteMesmoTipo = useMemo(() => {
 if (!userActualId) return null
 return avaliacoes.find(
 (item) => item.user_id === userActualId && item.tipo_avaliador === tipoAvaliador
 )
 }, [avaliacoes, userActualId, tipoAvaliador])

 const opcoesAtuais = tipoAvaliador === 'equipe' ? opcoesEquipe : opcoesJogador

 const podeAvaliar = useMemo(() => {
 if (!userActualId) return false
 if (avaliacaoExistenteMesmoTipo) return false
 return !!origemSelecionada
 }, [userActualId, origemSelecionada, avaliacaoExistenteMesmoTipo])

 const carregarReputacao = useCallback(async (produtoraId?: string | null) => {
 if (!produtoraId) {
 setReputacaoCampeonatos([])
 return
 }

 try {
 const { data: campeonatosProdutora, error: campError } = await supabase
 .from('campeonatos')
 .select('id, nome, data_inicio, status')
 .eq('produtora_id', produtoraId)
 .order('data_inicio', { ascending: false })

 if (campError) throw campError

 const ids = (campeonatosProdutora || []).map((item: any) => item.id)
 if (ids.length === 0) {
 setReputacaoCampeonatos([])
 return
 }

 const { data: avaliacoesData, error: avalError } = await supabase
 .from('avaliacoes_campeonato')
 .select('campeonato_id, nota')
 .in('campeonato_id', ids)

 if (avalError) throw avalError

 const mapa = new Map<string, { soma: number; total: number }>()
 for (const item of avaliacoesData || []) {
 const atual = mapa.get(item.campeonato_id) || { soma: 0, total: 0 }
 atual.soma += Number(item.nota || 0)
 atual.total += 1
 mapa.set(item.campeonato_id, atual)
 }

 const lista = (campeonatosProdutora || []).map((item: any) => {
 const agg = mapa.get(item.id) || { soma: 0, total: 0 }
 const media = agg.total > 0 ? agg.soma / agg.total : 0

 return {
 id: item.id,
 nome: item.nome,
 data_inicio: item.data_inicio,
 status: item.status,
 total: agg.total,
 media,
 }
 })

 setReputacaoCampeonatos(lista)
 } catch (err) {
 console.error(err)
 }
 }, [])

 const carregarElegibilidade = useCallback(
 async (userId: string) => {
 setCarregandoElegibilidade(true)

 try {
 const { data: campData } = await supabase
 .from('campeonatos')
 .select('id, nome, produtora_id, produtoras!produtora_id(id, nome)')
 .eq('id', campeonatoId)
 .single()

 setCamp(campData || null)
 await carregarReputacao(campData?.produtora_id || null)

 const { data: equipesCriadasData } = await supabase
 .from('equipes')
 .select('id, nome, tag, criado_por')
 .eq('criado_por', userId)

 const { data: equipesAvulsasData } = await supabase
 .from('equipes_avulsas_campeonato')
 .select('id, nome, tag, criada_por')
 .eq('campeonato_id', campeonatoId)
 .eq('criada_por', userId)

 const { data: membrosData } = await supabase
 .from('membros_equipe')
 .select(
 `
 equipe_id,
 ativo,
 perfil_jogo:perfis_jogo!inner(
 id,
 user_id,
 nick
 )
 `
 )
 .eq('ativo', true)
 .eq('perfis_jogo.user_id', userId)

 const equipeIdsCriadas = (equipesCriadasData || []).map((item: any) => item.id)
 const equipeIdsMembro = (membrosData || [])
 .map((item: any) => item.equipe_id)
 .filter(Boolean)

 const equipeAvulsaIdsCriadas = (equipesAvulsasData || []).map((item: any) => item.id)
 const equipeIdsPermitidas = Array.from(new Set([...equipeIdsCriadas, ...equipeIdsMembro]))

 const consultasEquipe: Promise<any>[] = []

 if (equipeIdsPermitidas.length > 0) {
 consultasEquipe.push(
 supabase
 .from('campeonato_equipes')
 .select(
 `
 id,
 equipe_id,
 equipe_avulsa_id,
 tipo_origem,
 equipes:equipe_id (
 id,
 nome,
 tag
 ),
 equipe_avulsa:equipe_avulsa_id (
 id,
 nome,
 tag
 )
 `
 )
 .eq('campeonato_id', campeonatoId)
 .in('equipe_id', equipeIdsPermitidas)
 )
 }

 if (equipeAvulsaIdsCriadas.length > 0) {
 consultasEquipe.push(
 supabase
 .from('campeonato_equipes')
 .select(
 `
 id,
 equipe_id,
 equipe_avulsa_id,
 tipo_origem,
 equipes:equipe_id (
 id,
 nome,
 tag
 ),
 equipe_avulsa:equipe_avulsa_id (
 id,
 nome,
 tag
 )
 `
 )
 .eq('campeonato_id', campeonatoId)
 .in('equipe_avulsa_id', equipeAvulsaIdsCriadas)
 )
 }

 const respostasEquipe = await Promise.all(consultasEquipe)
 const linhasEquipe = respostasEquipe.flatMap((resp) => resp.data || [])

 const mapaEquipe = new Map<string, any>()
 for (const item of linhasEquipe) {
 mapaEquipe.set(item.id, item)
 }

 const idsCampeonatoEquipe = Array.from(mapaEquipe.keys())

 let jogoEquipesData: any[] = []
 if (idsCampeonatoEquipe.length > 0) {
 const { data } = await supabase
 .from('jogo_equipes')
 .select('campeonato_equipe_id')
 .eq('campeonato_id', campeonatoId)
 .in('campeonato_equipe_id', idsCampeonatoEquipe)

 jogoEquipesData = data || []
 }

 const setEquipesQueJogaram = new Set(
 jogoEquipesData.map((item: any) => item.campeonato_equipe_id).filter(Boolean)
 )

 const opcoesEquipeFormatadas: OpcaoAvaliador[] = Array.from(mapaEquipe.values())
 .filter((item: any) => setEquipesQueJogaram.has(item.id))
 .map((item: any) => {
 const equipe = Array.isArray(item.equipes) ? item.equipes[0] : item.equipes
 const avulsa = Array.isArray(item.equipe_avulsa) ? item.equipe_avulsa[0] : item.equipe_avulsa
 const nome = equipe?.nome || avulsa?.nome || 'Equipe'
 const tag = equipe?.tag || avulsa?.tag || null

 return {
 id: item.id,
 label: nome,
 subtitulo: tag
 ? `Tag: ${tag}`
 : item.tipo_origem === 'avulsa'
 ? 'Equipe avulsa'
 : 'Equipe oficial',
 }
 })
 .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

 const { data: jogadoresData } = await supabase
 .from('jogadores_campeonato')
 .select(
 `
 id,
 perfil_jogo_id,
 nick,
 perfil_jogo:perfis_jogo!inner(
 id,
 user_id,
 nick
 )
 `
 )
 .eq('campeonato_id', campeonatoId)
 .eq('perfis_jogo.user_id', userId)

 const jogadoresBase = jogadoresData || []
 const idsJogadorCampeonato = jogadoresBase.map((item: any) => item.id).filter(Boolean)

 let resultadosJogadores: any[] = []
 let resultadosMvp: any[] = []

 if (idsJogadorCampeonato.length > 0) {
 const [{ data: rpjData }, { data: mvpData }] = await Promise.all([
 supabase
 .from('resultados_partidas_jogadores')
 .select('jogador_campeonato_id')
 .eq('campeonato_id', campeonatoId)
 .in('jogador_campeonato_id', idsJogadorCampeonato),
 supabase
 .from('resultados_mvp')
 .select('jogador_campeonato_id')
 .eq('campeonato_id', campeonatoId)
 .in('jogador_campeonato_id', idsJogadorCampeonato),
 ])

 resultadosJogadores = rpjData || []
 resultadosMvp = mvpData || []
 }

 const setJogadoresQueJogaram = new Set(
 [...resultadosJogadores, ...resultadosMvp]
 .map((item: any) => item.jogador_campeonato_id)
 .filter(Boolean)
 )

 const opcoesJogadorFormatadas: OpcaoAvaliador[] = jogadoresBase
 .filter((item: any) => setJogadoresQueJogaram.has(item.id))
 .map((item: any) => {
 const perfil = Array.isArray(item.perfil_jogo) ? item.perfil_jogo[0] : item.perfil_jogo
 const nick = item.nick || perfil?.nick || 'Jogador'

 return {
 id: item.id,
 label: nick,
 subtitulo: 'Participou do campeonato',
 }
 })
 .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

 setOpcoesEquipe(opcoesEquipeFormatadas)
 setOpcoesJogador(opcoesJogadorFormatadas)

 if (opcoesEquipeFormatadas.length > 0) {
 setTipoAvaliador('equipe')
 setOrigemSelecionada(opcoesEquipeFormatadas[0].id)
 } else if (opcoesJogadorFormatadas.length > 0) {
 setTipoAvaliador('jogador')
 setOrigemSelecionada(opcoesJogadorFormatadas[0].id)
 } else {
 setOrigemSelecionada('')
 }
 } catch (err) {
 console.error(err)
 setErrorMsg('Erro ao validar quem pode avaliar este campeonato.')
 } finally {
 setCarregandoElegibilidade(false)
 }
 },
 [campeonatoId, carregarReputacao]
 )

 const carregarAvaliacoes = useCallback(async () => {
 try {
 setErrorMsg(null)

 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (user) {
 setUserActualId(user.id)
 await carregarElegibilidade(user.id)
 } else {
 setUserActualId(null)
 setOpcoesEquipe([])
 setOpcoesJogador([])
 setOrigemSelecionada('')
 setCarregandoElegibilidade(false)

 const { data: campData } = await supabase
 .from('campeonatos')
 .select('id, nome, produtora_id, produtoras!produtora_id(id, nome)')
 .eq('id', campeonatoId)
 .single()

 setCamp(campData || null)
 await carregarReputacao(campData?.produtora_id || null)
 }

 const { data, error } = await supabase
 .from('avaliacoes_campeonato')
 .select(
 `
 id,
 nota,
 comentario,
 created_at,
 user_id,
 tipo_avaliador,
 campeonato_equipe_id,
 jogador_campeonato_id,
 perfil:profiles!user_id (
 id,
 nome_exibicao,
 username,
 foto_url
 ),
 curtidas:avaliacoes_campeonato_curtidas (
 id,
 user_id
 ),
 respostas:avaliacoes_campeonato_respostas (
 id,
 comentario,
 created_at,
 user_id,
 perfil:profiles!user_id (
 id,
 nome_exibicao,
 username,
 foto_url
 )
 )
 `
 )
 .eq('campeonato_id', campeonatoId)
 .order('created_at', { ascending: false })

 if (error) {
 console.error('Erro Supabase:', JSON.stringify(error, null, 2))
 setErrorMsg('Erro de conexão com a base de dados.')
 return
 }

 setAvaliacoes((data as any) || [])
 } catch (err) {
 console.error(err)
 setErrorMsg('Erro ao carregar avaliações.')
 }
 }, [campeonatoId, carregarElegibilidade, carregarReputacao])

 async function enviarAvaliacao() {
 if (!comentario.trim()) return
 if (!origemSelecionada) {
 alert('Selecione a equipe ou jogador que irá avaliar.')
 return
 }

 setLoading(true)

 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user) {
 alert('Você precisa estar logado.')
 setLoading(false)
 return
 }

 const payload =
 tipoAvaliador === 'equipe'
 ? {
 campeonato_id: campeonatoId,
 user_id: user.id,
 tipo_avaliador: 'equipe',
 campeonato_equipe_id: origemSelecionada,
 jogador_campeonato_id: null,
 nota,
 comentario,
 }
 : {
 campeonato_id: campeonatoId,
 user_id: user.id,
 tipo_avaliador: 'jogador',
 campeonato_equipe_id: null,
 jogador_campeonato_id: origemSelecionada,
 nota,
 comentario,
 }

 const { error: insertError } = await supabase
 .from('avaliacoes_campeonato')
 .insert(payload)

 if (insertError) {
 alert(`Erro: ${insertError.message}`)
 } else {
 setComentario('')
 setNota(5)
 await carregarAvaliacoes()
 }

 setLoading(false)
 }

 async function toggleCurtida(avaliacaoId: string, jaCurtiu: boolean) {
 if (!userActualId) return

 if (jaCurtiu) {
 await supabase
 .from('avaliacoes_campeonato_curtidas')
 .delete()
 .eq('avaliacao_id', avaliacaoId)
 .eq('user_id', userActualId)
 } else {
 await supabase
 .from('avaliacoes_campeonato_curtidas')
 .insert({ avaliacao_id: avaliacaoId, user_id: userActualId })
 }

 await carregarAvaliacoes()
 }

 async function enviarResposta(avaliacaoId: string) {
 if (!respostaTexto.trim() || !userActualId) return

 const { error } = await supabase
 .from('avaliacoes_campeonato_respostas')
 .insert({
 avaliacao_id: avaliacaoId,
 user_id: userActualId,
 comentario: respostaTexto,
 })

 if (!error) {
 setRespostaTexto('')
 setReplyingTo(null)
 await carregarAvaliacoes()
 }
 }

 useEffect(() => {
 carregarAvaliacoes()
 }, [carregarAvaliacoes])

 useEffect(() => {
 if (!origemSelecionada && opcoesAtuais.length > 0) {
 setOrigemSelecionada(opcoesAtuais[0].id)
 }
 if (origemSelecionada && opcoesAtuais.length > 0) {
 const existe = opcoesAtuais.some((item) => item.id === origemSelecionada)
 if (!existe) setOrigemSelecionada(opcoesAtuais[0].id)
 }
 }, [tipoAvaliador, opcoesAtuais, origemSelecionada])

 const reputacaoOrdenada = useMemo(() => {
 return [...reputacaoCampeonatos].sort((a, b) => {
 if (b.media !== a.media) return b.media - a.media
 if (b.total !== a.total) return b.total - a.total
 return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
 })
 }, [reputacaoCampeonatos])

 const reputacaoAtual = useMemo(() => {
 const item = reputacaoCampeonatos.find((i) => i.id === campeonatoId)
 return item || null
 }, [reputacaoCampeonatos, campeonatoId])

 return (
 <div className="space-y-6">
 <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
 <div className="xl:col-span-8">
 <div className="w-full bg-white p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#142340] border border-zinc-200 ">
 <div className="lg:col-span-4 space-y-8">
 <div>
 <h2 className="text-2xl font-semibold uppercase tracking-tighter text-[#142340] mb-1">
 Avaliação do Campeonato
 </h2>
 <div className="h-1 w-20 bg-emerald-500 rounded-full mb-4"></div>
 <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
 {totalAvaliacoes} feedbacks registrados
 </p>
 </div>

 {errorMsg && (
 <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
 <AlertTriangle size={14} />
 <span>{errorMsg}</span>
 </div>
 )}

 <div className="bg-white/50 p-6 border border-zinc-200">
 <div className="flex items-end gap-3 mb-6">
 <span className="text-5xl font-semibold text-emerald-400 leading-none">
 {mediaNotas}
 </span>
 <div className="flex flex-col">
 <div className="flex text-emerald-500 mb-1">
 {[1, 2, 3, 4, 5].map((s) => (
 <Star
 key={s}
 size={16}
 fill={s <= Math.round(Number(mediaNotas)) ? '#10b981' : 'none'}
 stroke="currentColor"
 />
 ))}
 </div>
 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
 Média Geral
 </span>
 </div>
 </div>

 <div className="space-y-3">
 {[5, 4, 3, 2, 1].map((num) => (
 <div key={num} className="flex items-center gap-3 text-[10px] font-bold">
 <span className="w-12 text-zinc-500">{num} Estrelas</span>
 <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
 <div
 className="h-full bg-emerald-500 transition-all duration-700"
 style={{ width: `${calcularPercentual(num)}%` }}
 />
 </div>
 <span className="w-8 text-right text-emerald-400/50">
 {calcularPercentual(num)}%
 </span>
 </div>
 ))}
 </div>

 <div className="mt-5 grid grid-cols-2 gap-3">
 <div className=" border border-zinc-200 bg-white p-3">
 <div className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
 Curtidas
 </div>
 <div className="mt-2 text-xl font-semibold text-[#142340]">{totalCurtidas}</div>
 </div>

 <div className=" border border-zinc-200 bg-white p-3">
 <div className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
 Selo atual
 </div>
 <div className="mt-2 text-sm font-semibold text-emerald-400">
 {reputacaoLabel(mediaNumerica)}
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <h3 className="font-semibold text-xs uppercase text-zinc-500 tracking-widest flex items-center gap-2">
 <MessageSquare size={14} /> Deixe seu feedback
 </h3>

 <div className="bg-white p-4 border border-zinc-200 space-y-4">
 {carregandoElegibilidade ? (
 <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
 Validando participação...
 </div>
 ) : !userActualId ? (
 <div className="text-xs text-amber-400 font-bold uppercase tracking-widest">
 Faça login para avaliar.
 </div>
 ) : opcoesEquipe.length === 0 && opcoesJogador.length === 0 ? (
 <div className="text-xs text-amber-400 font-bold uppercase tracking-widest">
 Só equipes e jogadores que jogaram o campeonato podem avaliar.
 </div>
 ) : (
 <>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => setTipoAvaliador('equipe')}
 className={` px-4 py-3 text-[11px] font-semibold uppercase tracking-widest border transition-all ${
 tipoAvaliador === 'equipe'
 ? 'bg-emerald-500 text-[#142340] border-emerald-500'
 : 'bg-white text-zinc-500 border-zinc-200'
 }`}
 disabled={opcoesEquipe.length === 0}
 >
 Avaliar como equipe
 </button>

 <button
 type="button"
 onClick={() => setTipoAvaliador('jogador')}
 className={` px-4 py-3 text-[11px] font-semibold uppercase tracking-widest border transition-all ${
 tipoAvaliador === 'jogador'
 ? 'bg-emerald-500 text-[#142340] border-emerald-500'
 : 'bg-white text-zinc-500 border-zinc-200'
 }`}
 disabled={opcoesJogador.length === 0}
 >
 Avaliar como jogador
 </button>
 </div>

 {avaliacaoExistenteMesmoTipo ? (
 <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs ">
 Você já enviou uma avaliação como {tipoAvaliador}.
 </div>
 ) : (
 <>
 <div>
 <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 block mb-2">
 {tipoAvaliador === 'equipe' ? 'Equipe' : 'Jogador'} que está avaliando
 </label>
 <select
 value={origemSelecionada}
 onChange={(e) => setOrigemSelecionada(e.target.value)}
 className="w-full bg-white border border-zinc-200 p-4 text-sm outline-none focus:border-emerald-500/50 transition-colors"
 >
 <option value="">Selecione</option>
 {opcoesAtuais.map((opcao) => (
 <option key={opcao.id} value={opcao.id}>
 {opcao.label}
 </option>
 ))}
 </select>
 {origemSelecionada && (
 <p className="mt-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
 {opcoesAtuais.find((item) => item.id === origemSelecionada)?.subtitulo || ''}
 </p>
 )}
 </div>

 <div className="flex gap-2">
 {[1, 2, 3, 4, 5].map((s) => (
 <button
 key={s}
 onClick={() => setNota(s)}
 className="transition-transform hover:scale-110"
 type="button"
 >
 <Star
 size={24}
 fill={s <= nota ? '#10b981' : 'none'}
 stroke={s <= nota ? '#10b981' : '#475569'}
 />
 </button>
 ))}
 </div>

 <textarea
 value={comentario}
 onChange={(e) => setComentario(e.target.value)}
 placeholder="Escreva aqui sua experiência..."
 className="w-full bg-white border border-zinc-200 p-4 text-sm outline-none min-h-[120px] focus:border-emerald-500/50 transition-colors placeholder:text-slate-600"
 />

 <button
 onClick={enviarAvaliacao}
 disabled={loading || !comentario.trim() || !podeAvaliar}
 className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-[#142340] text-xs font-semibold uppercase tracking-widest transition-all disabled:opacity-20 flex items-center justify-center gap-2"
 >
 {loading ? 'Processando...' : 'Publicar Agora'}
 </button>
 </>
 )}
 </>
 )}
 </div>
 </div>
 </div>

 <div className="lg:col-span-8 space-y-6">
 <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
 <h3 className="text-lg font-semibold uppercase tracking-tighter text-[#142340]">
 Conversas da Comunidade
 </h3>
 </div>

 <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
 {avaliacoes.length === 0 ? (
 <div className="flex flex-col items-center py-20 text-slate-600">
 <MessageSquare size={40} className="mb-4 opacity-20" />
 <p className="text-xs font-bold uppercase tracking-widest">
 Nenhuma conversa iniciada
 </p>
 </div>
 ) : (
 avaliacoes.map((item) => {
 const jaCurtiu =
 item.curtidas?.some((c) => c.user_id === userActualId) || false
 const perfil = normalizarPerfil(item.perfil)

 return (
 <div
 key={item.id}
 className="bg-white/30 p-5 border border-zinc-200 hover:border-emerald-500/20 transition-all group"
 >
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className="relative">
 <div className="w-12 h-12 bg-slate-800 overflow-hidden border border-zinc-200 ring-2 ring-emerald-500/20">
 {perfil?.foto_url ? (
 <img
 src={perfil.foto_url}
 className="w-full h-full object-cover"
 alt="Perfil"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-emerald-500/10">
 <User size={20} className="text-emerald-500" />
 </div>
 )}
 </div>
 <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-[#142340] text-[8px] font-semibold px-1 rounded">
 {item.tipo_avaliador === 'equipe' ? 'EQ' : 'JG'}
 </div>
 </div>

 <div>
 <p className="text-sm font-semibold uppercase text-[#142340] leading-none">
 {nomePerfil(perfil)}
 </p>
 <div className="flex items-center gap-2 mt-1 flex-wrap">
 <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
 {formatarData(item.created_at)}
 </span>
 <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-50 text-emerald-400 font-semibold uppercase tracking-widest">
 {item.tipo_avaliador === 'equipe' ? 'Equipe' : 'Jogador'}
 </span>
 </div>
 </div>
 </div>

 <div className="flex gap-0.5 text-emerald-500">
 {[1, 2, 3, 4, 5].map((s) => (
 <Star
 key={s}
 size={10}
 fill={s <= item.nota ? '#10b981' : 'none'}
 stroke="currentColor"
 />
 ))}
 </div>
 </div>

 <div className="bg-white/50 p-4 border border-zinc-200 mb-4">
 <p className="text-sm text-zinc-600 font-medium leading-relaxed ">
 "{item.comentario}"
 </p>
 </div>

 <div className="flex items-center gap-4">
 <button
 onClick={() => toggleCurtida(item.id, jaCurtiu)}
 className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest transition-all px-3 py-1.5 ${
 jaCurtiu
 ? 'bg-emerald-500 text-[#142340]'
 : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-50'
 }`}
 >
 <ThumbsUp size={12} fill={jaCurtiu ? 'currentColor' : 'none'} />
 Útil ({item.curtidas?.length || 0})
 </button>

 <button
 onClick={() => setReplyingTo(replyingTo === item.id ? null : item.id)}
 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 hover:text-[#142340] transition-colors"
 >
 <Reply size={12} /> Responder
 </button>
 </div>

 {replyingTo === item.id && (
 <div className="mt-4 flex gap-2 items-center">
 <input
 autoFocus
 value={respostaTexto}
 onChange={(e) => setRespostaTexto(e.target.value)}
 placeholder="Escreva sua resposta..."
 className="flex-1 bg-white border border-zinc-200 px-4 py-2.5 text-xs outline-none focus:border-emerald-500/50"
 onKeyDown={(e) => e.key === 'Enter' && enviarResposta(item.id)}
 />
 <button
 onClick={() => enviarResposta(item.id)}
 className="p-2.5 bg-emerald-500 text-[#142340] hover:bg-emerald-600 transition-colors"
 >
 <Send size={14} />
 </button>
 </div>
 )}

 {item.respostas?.map((resp) => {
 const perfilResp = normalizarPerfil(resp.perfil)

 return (
 <div
 key={resp.id}
 className="ml-6 md:ml-12 mt-4 flex gap-3 border-l-2 border-emerald-500/20 pl-4"
 >
 <div className="w-8 h-8 bg-slate-800 overflow-hidden shrink-0 border border-zinc-200">
 {perfilResp?.foto_url ? (
 <img
 src={perfilResp.foto_url}
 className="w-full h-full object-cover"
 alt="Resposta"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-slate-600">
 <User size={14} />
 </div>
 )}
 </div>

 <div className="flex-1 bg-zinc-50 p-3 ">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-[10px] font-semibold uppercase text-emerald-400 leading-none">
 {nomePerfil(perfilResp)}
 </span>
 <span className="text-[9px] text-slate-600 font-bold tracking-tighter uppercase">
 {formatarData(resp.created_at)}
 </span>
 </div>
 <p className="text-xs text-zinc-500 leading-tight font-medium">
 {resp.comentario}
 </p>
 </div>
 </div>
 )
 })}
 </div>
 )
 })
 )}
 </div>
 </div>
 </div>
 </div>

 <div className="xl:col-span-4">
 <div className="bg-white border border-zinc-200 -[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
 <div className="bg-white px-5 py-4 flex items-center justify-between">
 <div>
 <h3 className="text-sm font-semibold uppercase text-[#2563eb] flex items-center gap-2">
 <ShieldCheck size={16} />
 Reputação
 </h3>
 <p className="mt-1 text-[10px] font-semibold uppercase text-zinc-500">
 Histórico da organizadora
 </p>
 </div>

 {reputacaoAtual && (
 <div
 className={`px-3 py-1 border text-[9px] font-semibold uppercase ${reputacaoCor(
 reputacaoAtual.media || 0
 )}`}
 >
 {reputacaoLabel(reputacaoAtual.media || 0)}
 </div>
 )}
 </div>

 <div className="p-5 space-y-5 bg-[#f7f7f7]">
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-white border border-zinc-200 p-4">
 <div className="text-[9px] font-semibold uppercase text-zinc-500">
 Nota atual
 </div>
 <div className="mt-2 text-3xl font-semibold text-[#142340]">
 {reputacaoAtual ? Number(reputacaoAtual.media || 0).toFixed(1) : '0.0'}
 </div>
 </div>

 <div className="bg-white border border-zinc-200 p-4">
 <div className="text-[9px] font-semibold uppercase text-zinc-500">
 Avaliações
 </div>
 <div className="mt-2 text-3xl font-semibold text-[#142340]">
 {reputacaoAtual?.total || 0}
 </div>
 </div>
 </div>

 <div className="bg-white border border-zinc-200 p-4">
 <div className="flex items-center gap-2 mb-3">
 <Trophy size={14} className="text-[#2563eb]" />
 <span className="text-[10px] font-semibold uppercase text-[#142340]">
 Ranking da organizadora
 </span>
 </div>

 <div className="space-y-2">
 {reputacaoOrdenada.length === 0 ? (
 <div className="text-[10px] font-semibold uppercase text-zinc-500">
 Sem histórico suficiente.
 </div>
 ) : (
 reputacaoOrdenada.slice(0, 6).map((item, index) => (
 <div
 key={item.id}
 className={`flex items-center justify-between gap-3 p-3 border ${
 item.id === campeonatoId
 ? 'border-zinc-200 bg-[#eaffd7]'
 : 'border-zinc-200 bg-white'
 }`}
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-8 h-8 border border-zinc-200 flex items-center justify-center bg-white text-[#2563eb] text-[10px] font-semibold">
 {index === 0 ? <Trophy size={12} /> : index === 1 ? <Medal size={12} /> : index + 1}
 </div>

 <div className="min-w-0">
 <div className="text-[10px] font-semibold uppercase text-[#142340] truncate">
 {item.nome}
 </div>
 <div className="text-[8px] font-semibold uppercase text-zinc-500">
 {item.total} avaliação(ões) • {formatarData(item.data_inicio)}
 </div>
 </div>
 </div>

 <div className="text-right shrink-0">
 <div className="text-[14px] font-semibold text-[#142340]">
 {Number(item.media || 0).toFixed(1)}
 </div>
 <div className="text-[8px] font-semibold uppercase text-zinc-500">
 {reputacaoLabel(item.media || 0)}
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 <div className="bg-white border border-zinc-200 p-4">
 <div className="text-[10px] font-semibold uppercase text-[#142340] mb-2">
 Como a reputação funciona
 </div>
 <ul className="space-y-2 text-[10px] text-zinc-500 font-semibold">
 <li>• Média das avaliações dos campeonatos da mesma organizadora.</li>
 <li>• Considera participação real de equipes e jogadores.</li>
 <li>• Quanto mais avaliações qualificadas, mais confiável o selo.</li>
 </ul>
 </div>
 </div>
 </div>
 </div>
 </div>

 <style jsx>{`
 .custom-scrollbar::-webkit-scrollbar {
 width: 4px;
 }
 .custom-scrollbar::-webkit-scrollbar-track {
 background: transparent;
 }
 .custom-scrollbar::-webkit-scrollbar-thumb {
 background: rgba(16, 185, 129, 0.2);
 border-radius: 10px;
 }
 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
 background: rgba(16, 185, 129, 0.4);
 }
 `}</style>
 </div>
 )
}
