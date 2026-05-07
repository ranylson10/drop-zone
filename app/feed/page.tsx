'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
 Loader2,
 User,
 Trophy,
 Users,
 Home,
 Search,
 Bell,
 TrendingUp,
 UserCheck,
 ChevronRight,
 Flame,
 Medal,
 Swords,
 CalendarDays,
 Target,
} from 'lucide-react'
import { usePerfil } from '../contexts/PerfilContext'
import Image from 'next/image'
import Link from 'next/link'
import PostCard from './components/PostCard'

type TipoAutor = 'usuario' | 'perfil_jogo' | 'equipe' | 'produtora'

type AutorFormatado = {
 nome: string
 foto: string | null
 tag: string
 cor: string
}

type PostBase = {
 id: string
 conteudo: string | null
 imagem_url: string | null
 created_at: string
 autor_tipo: TipoAutor | null
 autor_user_id: string | null
 autor_perfil_jogo_id: string | null
 autor_equipe_id: string | null
 autor_produtora_id: string | null
 post_compartilhado_id: string | null
}

type PostCompartilhado = {
 id: string
 conteudo: string
 imagem_url: string | null
 created_at: string
 autor: AutorFormatado
}

export type PostFormatado = {
 id: string
 conteudo: string
 imagem_url: string | null
 created_at: string
 autor: AutorFormatado
 contagem_curtidas: number
 contagem_comentarios: number
 contagem_reposts: number
 compartilhado?: PostCompartilhado | null
}

const AUTOR_PADRAO: AutorFormatado = {
 nome: 'SISTEMA',
 foto: null,
 tag: 'INFO',
 cor: '#64748b',
}

const FFWS_LOGO_URL =
 'https://uyivmievsgkbojplpblz.supabase.co/storage/v1/object/public/assets/Free_Fire_World_Series_Brazil_2026_-_Etapa_1.png'

type FfwsEquipeDestaque = {
 id: string
 nome: string
 tag?: string | null
 logo_url?: string | null
 pontos: number
 booyah: number
 abates: number
}

type FfwsJogadorDestaque = {
 id: string
 jogador: string
 equipe_nome?: string | null
 equipe_tag?: string | null
 equipe_logo?: string | null
 foto_url?: string | null
 mvp: number
 abates: number
 overall: number
}

type CampeonatoFeed = {
 id: string
 nome: string
 slug?: string | null
 banner_url?: string | null
 logo_url?: string | null
 valor_vaga?: number | null
 valor_premiacao?: number | null
 vagas?: number | null
 status?: string | null
 tipo_competicao?: string | null
 modelo_competicao?: string | null
 created_at?: string | null
}

function getCampeonatoHrefFeed(campeonato: CampeonatoFeed): string {
 const tipo = String(campeonato.tipo_competicao || campeonato.modelo_competicao || '').toLowerCase()
 if (tipo.includes('diario') || tipo.includes('diário')) return `/campeonatos/diarios/${campeonato.id}`
 if (tipo.includes('copa')) return `/campeonatos/copas/${campeonato.id}`
 if (tipo.includes('liga')) return `/campeonatos/ligas/${campeonato.id}`
 if (tipo.includes('xtreino')) return `/campeonatos/xtreinos/${campeonato.id}`
 if (tipo.includes('confronto')) return `/confrontos/${campeonato.id}`
 return `/campeonatos/${campeonato.id}`
}

function formatarMoeda(valor?: number | null): string {
 const numero = Number(valor || 0)
 if (!Number.isFinite(numero) || numero <= 0) return 'GRÁTIS'
 return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function numeroSeguro(valor: any): number {
 const numero = Number(valor)
 return Number.isFinite(numero) ? numero : 0
}

function textoSeguro(...valores: any[]): string {
 for (const valor of valores) {
 if (typeof valor === 'string' && valor.trim()) return valor.trim()
 }
 return ''
}

function normalizarEquipeFfws(item: any, index: number): FfwsEquipeDestaque {
 return {
 id: textoSeguro(item?.id, item?.equipe_id, item?.uuid) || `ffws-equipe-${index}`,
 nome: textoSeguro(item?.nome, item?.equipe, item?.equipe_nome, item?.name, item?.time) || 'A definir',
 tag: textoSeguro(item?.tag, item?.sigla, item?.equipe_tag) || null,
 logo_url: textoSeguro(item?.logo_url, item?.logo, item?.imagem_url, item?.equipe_logo) || null,
 pontos: numeroSeguro(item?.pontos ?? item?.pts ?? item?.total_pontos ?? item?.pontuacao),
 booyah: numeroSeguro(item?.booyah ?? item?.booyahs ?? item?.vitorias),
 abates: numeroSeguro(item?.abates ?? item?.kills ?? item?.kill),
 }
}

function normalizarJogadorFfws(item: any, index: number): FfwsJogadorDestaque {
 return {
 id: textoSeguro(item?.id, item?.jogador_id, item?.uuid) || `ffws-jogador-${index}`,
 jogador: textoSeguro(item?.jogador, item?.nick, item?.nome, item?.player, item?.name) || 'A definir',
 equipe_nome: textoSeguro(item?.equipe_nome, item?.equipe, item?.time_nome, item?.team) || null,
 equipe_tag: textoSeguro(item?.equipe_tag, item?.tag, item?.sigla, item?.time_tag) || null,
 equipe_logo: textoSeguro(item?.equipe_logo, item?.logo_url, item?.logo, item?.time_logo) || null,
 foto_url: textoSeguro(item?.foto_url, item?.foto, item?.avatar_url, item?.imagem_url) || null,
 mvp: numeroSeguro(item?.mvp ?? item?.mvps ?? item?.mvp_count),
 abates: numeroSeguro(item?.abates ?? item?.kills ?? item?.kill),
 overall: numeroSeguro(item?.overall ?? item?.rating ?? item?.nota),
 }
}

function ordenarEquipesFfws(a: FfwsEquipeDestaque, b: FfwsEquipeDestaque) {
 return b.pontos - a.pontos || b.abates - a.abates || b.booyah - a.booyah || a.nome.localeCompare(b.nome, 'pt-BR')
}

function ordenarJogadoresFfws(a: FfwsJogadorDestaque, b: FfwsJogadorDestaque) {
 return b.mvp - a.mvp || b.abates - a.abates || b.overall - a.overall || a.jogador.localeCompare(b.jogador, 'pt-BR')
}

const campeonatosDestaqueMock = [
 {
 id: 'camp-1',
 nome: 'COPA ALOE',
 subtitulo: 'INSCRIÇÕES ABERTAS',
 vagas: 12,
 status: 'ABERTO',
 imagem: '/images/campeonato-mock-1.jpg',
 },
 {
 id: 'camp-2',
 nome: 'LIGA FF PRO',
 subtitulo: 'ÚLTIMAS VAGAS',
 vagas: 8,
 status: 'DESTAQUE',
 imagem: '/images/campeonato-mock-2.jpg',
 },
 {
 id: 'camp-3',
 nome: 'RW KINGS',
 subtitulo: 'PRÓXIMA ETAPA',
 vagas: 6,
 status: 'HOT',
 imagem: '/images/campeonato-mock-3.jpg',
 },
]



const tiposCampeonatoMock = [
 {
 id: 'apostados',
 titulo: 'APOSTADOS',
 subtitulo: 'DESTAQUE',
 descricao: 'Duelo direto entre duas equipes. Cada lado casa um valor e o vencedor leva tudo.',
 rota: '/apostados',
 cor: 'from-[#ff5e00]/35 via-[#ff5e00]/10 to-transparent',
 badge: 'HOT',
 destaque: true,
 icone: Swords,
 },
 {
 id: 'confrontos',
 titulo: 'CONFRONTOS',
 subtitulo: 'MULTI-EQUIPES',
 descricao: 'Competição com várias equipes em partidas entre dois lados, com premiação disputada por todos.',
 rota: '/campeonatos/confrontos',
 cor: 'from-cyan-500/25 via-cyan-500/10 to-transparent',
 badge: 'ARENA',
 destaque: false,
 icone: Trophy,
 },
 {
 id: 'diario',
 titulo: 'DIÁRIO',
 subtitulo: 'MULTI-HORÁRIOS',
 descricao: 'Horários independentes, cada lobby com inscrições, tabela e campeão próprios.',
 rota: '/campeonatos/diarios',
 cor: 'from-emerald-500/25 via-emerald-500/10 to-transparent',
 badge: 'ABERTO',
 destaque: false,
 icone: CalendarDays,
 },
 {
 id: 'xtreino',
 titulo: 'XTREINO',
 subtitulo: 'FLEXÍVEL',
 descricao: 'Formato leve para amistoso, treino, teste de lobby e eventos rápidos.',
 rota: '/campeonatos/xtreinos',
 cor: 'from-violet-500/25 via-violet-500/10 to-transparent',
 badge: 'SCRIM',
 destaque: false,
 icone: Target,
 },
 {
 id: 'copa',
 titulo: 'COPA',
 subtitulo: 'MATA-MATA',
 descricao: 'Chave eliminatória com avanço de fase, confrontos e decisão por mata-mata.',
 rota: '/campeonatos/copas',
 cor: 'from-fuchsia-500/25 via-fuchsia-500/10 to-transparent',
 badge: 'PLAYOFF',
 destaque: false,
 icone: Medal,
 },
 {
 id: 'liga',
 titulo: 'LIGA',
 subtitulo: 'PONTOS CORRIDOS',
 descricao: 'Rodadas contínuas, classificação acumulada e foco em regularidade.',
 rota: '/campeonatos/ligas',
 cor: 'from-amber-500/25 via-amber-500/10 to-transparent',
 badge: 'RANKING',
 destaque: false,
 icone: Flame,
 },
]

const topJogadoresMock = [
 { id: 'j1', nome: 'RANLYSON', info: '120 pts', posicao: 1 },
 { id: 'j2', nome: 'SIX', info: '98 pts', posicao: 2 },
 { id: 'j3', nome: 'TOPZERA', info: '90 pts', posicao: 3 },
 { id: 'j4', nome: 'BIEL', info: '84 pts', posicao: 4 },
 { id: 'j5', nome: 'GODZIN', info: '80 pts', posicao: 5 },
]

const topEquipesMock = [
 { id: 'e1', nome: 'ALOE', info: '210 pts', posicao: 1 },
 { id: 'e2', nome: 'RW KINGS', info: '180 pts', posicao: 2 },
 { id: 'e3', nome: 'TEAM MX', info: '165 pts', posicao: 3 },
 { id: 'e4', nome: 'SYNERGY', info: '150 pts', posicao: 4 },
 { id: 'e5', nome: 'RISE', info: '145 pts', posicao: 5 },
]

const atalhosMock = [
 { id: 'a1', titulo: 'Campeonatos', descricao: 'Ver torneios ativos', icone: Trophy },
 { id: 'a2', titulo: 'Equipes', descricao: 'Buscar times', icone: Users },
 { id: 'a3', titulo: 'Jogadores', descricao: 'Explorar perfis', icone: Target },
 { id: 'a4', titulo: 'Calendário', descricao: 'Próximos jogos', icone: CalendarDays },
]

function criarMapaContagem(registros: Array<{ post_id: string }> | null | undefined) {
 const mapa = new Map<string, number>()

 for (const registro of registros || []) {
 mapa.set(registro.post_id, (mapa.get(registro.post_id) || 0) + 1)
 }

 return mapa
}

function montarPayloadAutor(userId: string, tipoPerfil: string, perfilAtivo: any) {
 return {
 autor_user_id: userId,
 autor_tipo:
 tipoPerfil === 'jogo'
 ? 'perfil_jogo'
 : tipoPerfil === 'equipe'
 ? 'equipe'
 : tipoPerfil === 'produtora'
 ? 'produtora'
 : 'usuario',
 autor_perfil_jogo_id: tipoPerfil === 'jogo' ? perfilAtivo?.id ?? null : null,
 autor_equipe_id: tipoPerfil === 'equipe' ? perfilAtivo?.id ?? null : null,
 autor_produtora_id: tipoPerfil === 'produtora' ? perfilAtivo?.id ?? null : null,
 }
}

function montarAutor(
 post: Pick<
 PostBase,
 'autor_tipo' | 'autor_user_id' | 'autor_perfil_jogo_id' | 'autor_equipe_id' | 'autor_produtora_id'
 >,
 maps: {
 profilesMap: Map<string, any>
 perfisJogoMap: Map<string, any>
 equipesMap: Map<string, any>
 produtorasMap: Map<string, any>
 }
): AutorFormatado {
 if (post.autor_tipo === 'perfil_jogo' && post.autor_perfil_jogo_id) {
 const pj = maps.perfisJogoMap.get(post.autor_perfil_jogo_id)
 if (pj) {
 return {
 nome: pj.nick || 'JOGADOR',
 foto: pj.foto_capa || null,
 tag: 'GAMER',
 cor: '#7cfc00',
 }
 }
 }

 if (post.autor_tipo === 'equipe' && post.autor_equipe_id) {
 const eq = maps.equipesMap.get(post.autor_equipe_id)
 if (eq) {
 return {
 nome: eq.nome || 'EQUIPE',
 foto: eq.logo_url || null,
 tag: 'EQUIPE',
 cor: '#e81cff',
 }
 }
 }

 if (post.autor_tipo === 'produtora' && post.autor_produtora_id) {
 const prod = maps.produtorasMap.get(post.autor_produtora_id)
 if (prod) {
 return {
 nome: prod.nome || 'PRODUTORA',
 foto: prod.logo_url || null,
 tag: 'PRODUTORA',
 cor: '#ff5e00',
 }
 }
 }

 if (post.autor_user_id) {
 const perfil = maps.profilesMap.get(post.autor_user_id)
 if (perfil) {
 return {
 nome: perfil.nome_exibicao || perfil.username || 'USUÁRIO',
 foto: perfil.foto_url || null,
 tag: 'PESSOAL',
 cor: '#00f0ff',
 }
 }
 }

 return AUTOR_PADRAO
}

export default function Feed() {
 const { perfilAtivo, tipoPerfil, user, loading: loadingPerfil } = usePerfil()
 const [posts, setPosts] = useState<PostFormatado[]>([])
 const [novoPost, setNovoPost] = useState('')
 const [campeonatosFeed, setCampeonatosFeed] = useState<CampeonatoFeed[]>([])
 const [campeonatoExpandidoId, setCampeonatoExpandidoId] = useState<string | null>(null)
 const [loading, setLoading] = useState(false)
 const [fetching, setFetching] = useState(true)
 const [loadingFfws, setLoadingFfws] = useState(true)
 const [ffwsEquipeTop, setFfwsEquipeTop] = useState<FfwsEquipeDestaque | null>(null)
 const [ffwsMvpTop, setFfwsMvpTop] = useState<FfwsJogadorDestaque | null>(null)

 const corTema =
 tipoPerfil === 'produtora'
 ? '#ff5e00'
 : tipoPerfil === 'equipe'
 ? '#e81cff'
 : tipoPerfil === 'jogo'
 ? '#7cfc00'
 : '#00f0ff'

 const carregarFfwsDestaques = useCallback(async () => {
 try {
 setLoadingFfws(true)

 const [equipesViewRes, jogadoresViewRes] = await Promise.all([
 supabase.from('lbff_ranking_equipes').select('*').limit(100),
 supabase.from('lbff_ranking_jogadores').select('*').limit(100),
 ])

 let equipesRaw = equipesViewRes.error ? [] : equipesViewRes.data || []
 let jogadoresRaw = jogadoresViewRes.error ? [] : jogadoresViewRes.data || []

 if (!equipesRaw.length) {
 const { data, error } = await supabase.from('lbff_equipes').select('*').limit(100)
 if (!error) equipesRaw = data || []
 }

 if (!jogadoresRaw.length) {
 const { data, error } = await supabase.from('lbff_jogadores').select('*').limit(100)
 if (!error) jogadoresRaw = data || []
 }

 const equipes = equipesRaw.map(normalizarEquipeFfws).sort(ordenarEquipesFfws)
 const jogadores = jogadoresRaw.map(normalizarJogadorFfws).sort(ordenarJogadoresFfws)

 setFfwsEquipeTop(equipes[0] || null)
 setFfwsMvpTop(jogadores[0] || null)
 } catch (err) {
 console.error('Erro ao carregar destaques FFWS:', err)
 setFfwsEquipeTop(null)
 setFfwsMvpTop(null)
 } finally {
 setLoadingFfws(false)
 }
 }, [])

 const carregarCampeonatosFeed = useCallback(async () => {
 try {
 const { data, error } = await supabase
 .from('campeonatos')
 .select('id, nome, slug, banner_url, logo_url, valor_vaga, valor_premiacao, vagas, status, tipo_competicao, modelo_competicao, created_at')
 .order('created_at', { ascending: false })
 .limit(6)

 if (error) throw error
 setCampeonatosFeed((data || []) as CampeonatoFeed[])
 } catch (err) {
 console.error('Erro ao carregar campeonatos do feed:', err)
 setCampeonatosFeed([])
 }
 }, [])

 const carregarDados = useCallback(async () => {
 try {
 setFetching(true)

 const { data, error } = await supabase
 .from('posts')
 .select(
 `
 id,
 conteudo,
 imagem_url,
 created_at,
 autor_tipo,
 autor_user_id,
 autor_perfil_jogo_id,
 autor_equipe_id,
 autor_produtora_id,
 post_compartilhado_id
 `
 )
 .eq('ativo', true)
 .order('created_at', { ascending: false })
 .limit(50)

 if (error) throw error

 const postsBase = (data || []) as PostBase[]
 const postIds = postsBase.map((p) => p.id)
 const postCompartilhadoIds = postsBase
 .map((p) => p.post_compartilhado_id)
 .filter((id): id is string => !!id)

 const { data: compartilhadosData, error: compartilhadosError } = postCompartilhadoIds.length
 ? await supabase
 .from('posts')
 .select(
 `
 id,
 conteudo,
 imagem_url,
 created_at,
 autor_tipo,
 autor_user_id,
 autor_perfil_jogo_id,
 autor_equipe_id,
 autor_produtora_id,
 post_compartilhado_id
 `
 )
 .in('id', postCompartilhadoIds)
 .eq('ativo', true)
 : { data: [], error: null }

 if (compartilhadosError) throw compartilhadosError

 const todosPostsRelacionados = [...postsBase, ...((compartilhadosData || []) as PostBase[])]

 const userIds = [
 ...new Set(todosPostsRelacionados.map((p) => p.autor_user_id).filter(Boolean)),
 ] as string[]
 const perfilJogoIds = [
 ...new Set(todosPostsRelacionados.map((p) => p.autor_perfil_jogo_id).filter(Boolean)),
 ] as string[]
 const equipeIds = [
 ...new Set(todosPostsRelacionados.map((p) => p.autor_equipe_id).filter(Boolean)),
 ] as string[]
 const produtoraIds = [
 ...new Set(todosPostsRelacionados.map((p) => p.autor_produtora_id).filter(Boolean)),
 ] as string[]

 const [profilesRes, perfisJogoRes, equipesRes, produtorasRes, curtidasRes, comentariosRes, repostsRes] =
 await Promise.all([
 userIds.length
 ? supabase.from('profiles').select('id, nome_exibicao, username, foto_url').in('id', userIds)
 : Promise.resolve({ data: [], error: null }),
 perfilJogoIds.length
 ? supabase.from('perfis_jogo').select('id, nick, foto_capa').in('id', perfilJogoIds)
 : Promise.resolve({ data: [], error: null }),
 equipeIds.length
 ? supabase.from('equipes').select('id, nome, logo_url').in('id', equipeIds)
 : Promise.resolve({ data: [], error: null }),
 produtoraIds.length
 ? supabase.from('produtoras').select('id, nome, logo_url').in('id', produtoraIds)
 : Promise.resolve({ data: [], error: null }),
 postIds.length
 ? supabase.from('curtidas_post').select('post_id').in('post_id', postIds)
 : Promise.resolve({ data: [], error: null }),
 postIds.length
 ? supabase.from('comentarios').select('post_id').eq('ativo', true).in('post_id', postIds)
 : Promise.resolve({ data: [], error: null }),
 postIds.length
 ? supabase.from('reposts').select('post_id').in('post_id', postIds)
 : Promise.resolve({ data: [], error: null }),
 ])

 if (profilesRes.error) throw profilesRes.error
 if (perfisJogoRes.error) throw perfisJogoRes.error
 if (equipesRes.error) throw equipesRes.error
 if (produtorasRes.error) throw produtorasRes.error
 if (curtidasRes.error) throw curtidasRes.error
 if (comentariosRes.error) throw comentariosRes.error
 if (repostsRes.error) throw repostsRes.error

 const maps = {
 profilesMap: new Map((profilesRes.data || []).map((item) => [item.id, item])),
 perfisJogoMap: new Map((perfisJogoRes.data || []).map((item) => [item.id, item])),
 equipesMap: new Map((equipesRes.data || []).map((item) => [item.id, item])),
 produtorasMap: new Map((produtorasRes.data || []).map((item) => [item.id, item])),
 }

 const curtidasCountMap = criarMapaContagem(curtidasRes.data || [])
 const comentariosCountMap = criarMapaContagem(comentariosRes.data || [])
 const repostsCountMap = criarMapaContagem(repostsRes.data || [])
 const compartilhadosMap = new Map(
 ((compartilhadosData || []) as PostBase[]).map((item) => [
 item.id,
 {
 id: item.id,
 conteudo: item.conteudo || '',
 imagem_url: item.imagem_url,
 created_at: item.created_at,
 autor: montarAutor(item, maps),
 } as PostCompartilhado,
 ])
 )

 const formatados: PostFormatado[] = postsBase.map((post) => ({
 id: post.id,
 conteudo: post.conteudo || '',
 imagem_url: post.imagem_url,
 created_at: post.created_at,
 autor: montarAutor(post, maps),
 contagem_curtidas: curtidasCountMap.get(post.id) || 0,
 contagem_comentarios: comentariosCountMap.get(post.id) || 0,
 contagem_reposts: repostsCountMap.get(post.id) || 0,
 compartilhado: post.post_compartilhado_id ? compartilhadosMap.get(post.post_compartilhado_id) || null : null,
 }))

 setPosts(formatados)
 } catch (err) {
 console.error('Erro ao carregar feed:', err)
 setPosts([])
 } finally {
 setFetching(false)
 }
 }, [])

 useEffect(() => {
 if (!loadingPerfil) {
 carregarDados()
 carregarFfwsDestaques()
 carregarCampeonatosFeed()
 }
 }, [carregarDados, carregarFfwsDestaques, carregarCampeonatosFeed, loadingPerfil])

 async function handlePostar() {
 if (!user || !perfilAtivo || !novoPost.trim()) return

 setLoading(true)

 try {
 const payload = {
 conteudo: novoPost.trim(),
 imagem_url: null,
 ativo: true,
 post_compartilhado_id: null,
 ...montarPayloadAutor(user.id, tipoPerfil, perfilAtivo),
 }

 const { error } = await supabase.from('posts').insert([payload])
 if (error) throw error

 setNovoPost('')
 await carregarDados()
 } catch (err: any) {
 console.error('Erro ao postar:', err, JSON.stringify(err))
 alert(JSON.stringify({ message: err?.message, code: err?.code, details: err?.details, hint: err?.hint, name: err?.name, statusCode: err?.statusCode }, null, 2))
 } finally {
 setLoading(false)
 }
 }

 function getHrefMeuPerfil() {
 if (!perfilAtivo?.id) return "/perfil";

 if (tipoPerfil === "produtora") {
 return `/produtora/${perfilAtivo.id}`;
 }

 if (tipoPerfil === "equipe") {
 return `/equipe/${perfilAtivo.id}`;
 }

 if (tipoPerfil === "jogo") {
 return `/jogadores/${perfilAtivo.id}`;
 }

 return "/perfil";
 }

 if (loadingPerfil) return null

 const avatarPerfil =
 perfilAtivo?.avatar_url || perfilAtivo?.foto_url || perfilAtivo?.logo_url || perfilAtivo?.foto_capa || null

 const nomePerfil =
 perfilAtivo?.nome || perfilAtivo?.nome_exibicao || perfilAtivo?.username || perfilAtivo?.nick || 'Perfil'

 const navItems = [
 { href: '/feed', label: 'Feed', icon: Home, active: true },
 { href: '/campeonatos', label: 'Campeonatos', icon: Trophy },
 { href: '/equipe', label: 'Equipes', icon: Users },
 { href: '/jogadores', label: 'Jogadores', icon: Target },
 { href: getHrefMeuPerfil(), label: 'Perfil', icon: UserCheck },
 ]

 return (
 <div className="min-h-screen bg-[#F5F7FA] text-[#142340]" style={{ backgroundImage: 'none' }}>
 <div className="mx-auto max-w-[1440px] px-2 py-3 lg:px-5">
 <div className="grid grid-cols-1 gap-3 xl:grid-cols-[210px_minmax(520px,640px)_310px]">
 <aside className="hidden xl:block">
 <div className="sticky top-20 space-y-3">
 <section className="overflow-hidden border border-slate-200 bg-white ">
 <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3">
 <div className="flex h-9 w-9 items-center justify-center bg-white/10 text-[#0284C7]">
 <Swords size={18} />
 </div>
 <div className="min-w-0">
 <div className="truncate text-[13px] font-semibold uppercase tracking-[-0.02em] text-slate-950">Arena</div>
 <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Comunidade</div>
 </div>
 </div>

 <nav className="p-2">
 {navItems.map((item) => {
 const Icone = item.icon
 return (
 <Link
 key={`${item.href}-${item.label}`}
 href={item.href}
 className={`mb-1 flex items-center gap-2 px-3 py-2 text-[12px] font-semibold transition ${
 item.active ? 'bg-[#E0F2FE] text-[#0369A1]' : 'text-zinc-500 hover:bg-slate-50 hover:text-slate-950'
 }`}
 title={item.label}
 >
 <Icone size={16} />
 <span className="truncate">{item.label}</span>
 </Link>
 )
 })}
 </nav>
 </section>

 <section className="border border-slate-200 bg-white p-3 ">
 <div className="flex items-center gap-2">
 <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-slate-200 bg-slate-50">
 {avatarPerfil ? (
 <Image src={avatarPerfil} alt="" fill className="object-cover" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-zinc-500"><User size={18} /></div>
 )}
 </div>
 <div className="min-w-0">
 <div className="truncate text-[13px] font-semibold uppercase tracking-[-0.02em] text-slate-950">{nomePerfil}</div>
 <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7C3AED]">{tipoPerfil || 'usuario'}</div>
 </div>
 </div>
 </section>

 <section className="border border-slate-200 bg-white p-3 ">
 <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase text-slate-950">
 <Bell size={15} className="text-[#7C3AED]" />
 Atalhos
 </div>
 <div className="grid grid-cols-2 gap-2">
 {atalhosMock.map((atalho) => {
 const Icone = atalho.icone
 return (
 <Link
 href={atalho.id === 'a1' ? '/campeonatos' : atalho.id === 'a2' ? '/equipe' : atalho.id === 'a3' ? '/jogadores' : '/calendario'}
 key={atalho.id}
 className="flex min-h-[58px] flex-col justify-between border border-slate-200 bg-slate-50 p-2 text-slate-700 transition hover:border-[#00E0FF] hover:bg-white"
 title={atalho.descricao}
 >
 <Icone size={16} className="text-[#0284C7]" />
 <span className="truncate text-[10px] font-semibold uppercase">{atalho.titulo}</span>
 </Link>
 )
 })}
 </div>
 </section>
 </div>
 </aside>

 <main className="min-w-0">
 <section className="mb-3 border border-slate-200 bg-white p-3 ">
 <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
 <div className="min-w-0">
 <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0284C7]"><TrendingUp size={15} />Feed da arena</div>
 <h1 className="text-[21px] font-semibold uppercase leading-none tracking-[-0.04em] text-slate-950 md:text-[28px]">Comunidade competitiva</h1>
 <p className="mt-1 text-[12px] font-medium text-zinc-500">Posts, campeonatos, equipes e jogadores em formato compacto.</p>
 </div>

 <div className="grid grid-cols-3 gap-2 text-center">
 <div className="border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[18px] font-semibold text-[#0284C7]">{posts.length}</div><div className="text-[9px] font-semibold uppercase text-zinc-500">posts</div></div>
 <div className="border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[18px] font-semibold text-[#7C3AED]">{topEquipesMock.length}</div><div className="text-[9px] font-semibold uppercase text-zinc-500">equipes</div></div>
 <div className="border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[18px] font-semibold text-[#22C55E]">{tiposCampeonatoMock.length}</div><div className="text-[9px] font-semibold uppercase text-zinc-500">modos</div></div>
 </div>
 </div>
 </section>

 <section className="mb-3 border border-slate-200 bg-white ">
 <div className="flex gap-2 p-3">
 <div className="relative h-9 w-9 shrink-0 overflow-hidden border border-slate-200 bg-slate-50">
 {avatarPerfil ? <Image src={avatarPerfil} alt="" fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center text-zinc-500"><User size={17} /></div>}
 </div>

 <div className="min-w-0 flex-1">
 <textarea
 value={novoPost}
 onChange={(e) => setNovoPost(e.target.value)}
 placeholder="O que está rolando na arena?"
 className="min-h-[52px] w-full resize-none border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-900 outline-none placeholder:text-zinc-500 focus:border-[#00E0FF] focus:bg-white"
 />

 <div className="mt-2 flex items-center justify-between gap-2">
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 Somente texto por enquanto • imagens bloqueadas para economizar storage
 </div>

 <button onClick={handlePostar} disabled={loading || !novoPost.trim()} className="inline-flex h-8 items-center justify-center bg-white px-4 text-[10px] font-semibold uppercase text-slate-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40">
 {loading ? <Loader2 className="animate-spin" size={15} /> : 'Postar'}
 </button>
 </div>
 </div>
 </div>
 </section>

 {campeonatosFeed.length > 0 && (
 <section className="mb-3 border border-slate-200 bg-white ">
 <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-slate-950">
 <Trophy size={15} className="text-[#F59E0B]" />
 Campeonatos abertos
 </div>
 <Link href="/campeonatos" className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500 hover:text-[#0284C7]">Ver todos</Link>
 </div>
 <div className="space-y-2 p-3">
 {campeonatosFeed.map((camp) => {
 const expandido = campeonatoExpandidoId === camp.id
 const href = getCampeonatoHrefFeed(camp)
 const banner = camp.banner_url || camp.logo_url || ''
 return (
 <article key={camp.id} className="overflow-hidden border border-slate-200 bg-slate-50">
 <button type="button" onClick={() => setCampeonatoExpandidoId(expandido ? null : camp.id)} className="relative block w-full overflow-hidden bg-[#f7f7f7] text-left" title="Expandir banner">
 {banner ? (
 <img src={banner} alt={camp.nome} className={`w-full object-cover transition-all duration-300 ${expandido ? 'h-[210px]' : 'h-[74px]'}`} />
 ) : (
 <div className={`flex w-full items-center justify-center bg-white text-[11px] font-semibold uppercase text-zinc-500 transition-all duration-300 ${expandido ? 'h-[210px]' : 'h-[74px]'}`}>Sem banner</div>
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
 <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-3">
 <div className="min-w-0">
 <div className="mb-1 inline-flex border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#142340] ">🏆 Campeonato</div>
 <div className="truncate text-[15px] font-semibold uppercase tracking-[-0.03em] text-[#142340]">{camp.nome}</div>
 </div>
 <span className="shrink-0 bg-white px-2 py-1 text-[9px] font-semibold uppercase text-slate-950">{expandido ? 'Recolher' : 'Expandir'}</span>
 </div>
 </button>
 <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-slate-200 bg-white p-2">
 <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold uppercase">
 <div className="border border-slate-200 bg-slate-50 px-2 py-1.5"><div className="text-[8px] tracking-[0.12em] text-zinc-500">Vaga</div><div className="truncate text-[#0284C7]">{formatarMoeda(camp.valor_vaga)}</div></div>
 <div className="border border-slate-200 bg-slate-50 px-2 py-1.5"><div className="text-[8px] tracking-[0.12em] text-zinc-500">Premiação</div><div className="truncate text-[#22C55E]">{formatarMoeda(camp.valor_premiacao)}</div></div>
 <div className="border border-slate-200 bg-slate-50 px-2 py-1.5"><div className="text-[8px] tracking-[0.12em] text-zinc-500">Vagas</div><div className="truncate text-slate-950">{camp.vagas || '-'} • {camp.status || 'aberto'}</div></div>
 </div>
 <Link href={href} className="inline-flex h-9 items-center justify-center bg-[#2563eb] px-3 text-[10px] font-semibold uppercase text-slate-950 transition hover:brightness-95">Inscrever-se</Link>
 </div>
 </article>
 )
 })}
 </div>
 </section>
 )}

 <section className="mb-3 border border-slate-200 bg-white p-2 xl:hidden">
 <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase text-slate-950"><Swords size={15} className="text-[#F59E0B]" />Modos</div>
 <div className="overflow-x-auto">
 <div className="flex min-w-max gap-2">
 {tiposCampeonatoMock.map((tipo) => {
 const Icone = tipo.icone
 return (
 <Link key={tipo.id} href={tipo.rota} prefetch={false} className={`inline-flex h-8 shrink-0 items-center gap-1.5 border px-3 text-[10px] font-semibold uppercase transition ${tipo.destaque ? 'border-[#F59E0B] bg-[#FFF7ED] text-[#C2410C]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#00E0FF] hover:text-[#0284C7]'}`}>
 <Icone size={14} />{tipo.titulo}
 </Link>
 )
 })}
 </div>
 </div>
 </section>

 <section className="border border-slate-200 bg-white ">
 <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-slate-950"><Flame size={15} className="text-[#F59E0B]" />Publicações</div>
 <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">ao vivo</span>
 </div>

 <div className="divide-y divide-slate-100">
 {fetching ? (
 <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#0284C7]" size={30} /></div>
 ) : posts.length > 0 ? (
 posts.map((post) => (
 <PostCard key={post.id} post={post} perfilAtivo={perfilAtivo} tipoPerfil={tipoPerfil as 'usuario' | 'jogo' | 'equipe' | 'produtora'} onAtualizar={carregarDados} />
 ))
 ) : (
 <div className="py-14 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Nenhum post encontrado</div>
 )}
 </div>
 </section>
 </main>

 <aside className="hidden xl:block">
 <div className="sticky top-20 space-y-3">
 <section className="border border-slate-200 bg-white ">
 <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-slate-950">
 <Trophy size={15} className="text-[#F59E0B]" />
 FFWS Brasil
 </div>
 <Link href="/lbff" className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500 hover:text-[#0284C7]">
 Ver
 </Link>
 </div>

 <div className="p-3">
 <div className="mb-2 flex items-center gap-3 border border-slate-200 bg-[#f7f7f7] p-2">
 <div className="flex h-[64px] w-[86px] shrink-0 items-center justify-center overflow-hidden bg-white">
 <img
 src={FFWS_LOGO_URL}
 alt="FFWS Brasil 2026"
 className="h-full w-full object-contain p-1"
 />
 </div>

 <div className="min-w-0">
 <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#F59E0B]">
 ranking oficial
 </div>
 <div className="truncate text-[15px] font-semibold uppercase text-[#142340]">
 FFWS Brasil
 </div>
 <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 dados do banco em tempo real
 </div>
 </div>
 </div>

 {loadingFfws ? (
 <div className="grid grid-cols-2 gap-2">
 <div className="h-[72px] animate-pulse border border-slate-200 bg-slate-50" />
 <div className="h-[72px] animate-pulse border border-slate-200 bg-slate-50" />
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-2">
 <div className="border border-slate-200 bg-slate-50 p-2">
 <div className="mb-1 flex items-center justify-between">
 <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 Top equipe
 </span>
 <span className="bg-[#FEF3C7] px-1.5 py-0.5 text-[9px] font-semibold text-[#92400E]">
 #1
 </span>
 </div>

 <div className="flex items-center gap-2">
 <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white">
 {ffwsEquipeTop?.logo_url ? (
 <img src={ffwsEquipeTop.logo_url} alt="" className="h-full w-full object-cover" />
 ) : (
 <Users size={14} className="text-zinc-500" />
 )}
 </div>

 <div className="min-w-0">
 <div className="truncate text-[13px] font-semibold uppercase text-slate-950">
 {ffwsEquipeTop?.nome || 'A definir'}
 </div>
 <div className="text-[10px] font-semibold text-[#F59E0B]">
 {ffwsEquipeTop ? `${ffwsEquipeTop.pontos || 0} pts` : '0 pts'}
 </div>
 </div>
 </div>

 <div className="mt-1 flex items-center gap-2 text-[9px] font-semibold uppercase text-zinc-500">
 <span>🏆 {ffwsEquipeTop?.booyah || 0}</span>
 <span>🔫 {ffwsEquipeTop?.abates || 0}</span>
 </div>
 </div>

 <div className="border border-slate-200 bg-slate-50 p-2">
 <div className="mb-1 flex items-center justify-between">
 <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 Líder MVP
 </span>
 <span className="bg-[#E0F2FE] px-1.5 py-0.5 text-[9px] font-semibold text-[#0369A1]">
 ★
 </span>
 </div>

 <div className="flex items-center gap-2">
 <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white">
 {ffwsMvpTop?.foto_url ? (
 <img src={ffwsMvpTop.foto_url} alt="" className="h-full w-full object-cover" />
 ) : ffwsMvpTop?.equipe_logo ? (
 <img src={ffwsMvpTop.equipe_logo} alt="" className="h-full w-full object-cover" />
 ) : (
 <User size={14} className="text-zinc-500" />
 )}
 </div>

 <div className="min-w-0">
 <div className="truncate text-[13px] font-semibold uppercase text-slate-950">
 {ffwsMvpTop?.jogador || 'A definir'}
 </div>
 <div className="truncate text-[10px] font-semibold text-[#0284C7]">
 {ffwsMvpTop?.equipe_tag || ffwsMvpTop?.equipe_nome || 'Sem equipe'}
 </div>
 </div>
 </div>

 <div className="mt-1 flex items-center gap-2 text-[9px] font-semibold uppercase text-zinc-500">
 <span>⭐ {ffwsMvpTop?.mvp || 0}</span>
 <span>🔫 {ffwsMvpTop?.abates || 0}</span>
 </div>
 </div>
 </div>
 )}
 </div>
 </section>

 <section className="border border-slate-200 bg-white ">
 <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-slate-950"><Swords size={15} className="text-[#F59E0B]" />Arena competitiva</div>
 <span className="bg-[#FFF7ED] px-2 py-0.5 text-[9px] font-semibold uppercase text-[#C2410C]">Hot</span>
 </div>
 <div className="p-3">
 <div className="grid grid-cols-2 gap-2">
 {tiposCampeonatoMock.slice(0, 6).map((tipo) => {
 const Icone = tipo.icone
 return (
 <Link key={tipo.id} href={tipo.rota} prefetch={false} className={`min-h-[68px] border p-2 transition ${tipo.destaque ? 'border-[#FDBA74] bg-[#FFF7ED] text-[#C2410C]' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#00E0FF] hover:bg-white'}`}>
 <div className="mb-2 flex items-center justify-between gap-2"><Icone size={16} /><span className="text-[8px] font-semibold uppercase text-zinc-500">{tipo.badge}</span></div>
 <div className="truncate text-[11px] font-semibold uppercase">{tipo.titulo}</div>
 <div className="truncate text-[8px] font-semibold uppercase text-zinc-500">{tipo.subtitulo}</div>
 </Link>
 )
 })}
 </div>
 </div>
 </section>

 <section className="border border-slate-200 bg-white ">
 <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-slate-950"><Flame size={15} className="text-[#22C55E]" />Top jogadores</div>
 <Link href="/jogadores" className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500 hover:text-[#0284C7]">Ver</Link>
 </div>
 <div className="space-y-1.5 p-3">
 {topJogadoresMock.slice(0, 5).map((item) => (
 <div key={item.id} className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-2 py-1.5">
 <div className="flex h-6 w-6 items-center justify-center bg-[#DCFCE7] text-[11px] font-semibold text-[#166534]">{item.posicao}</div>
 <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-semibold uppercase text-slate-900">{item.nome}</div><div className="text-[9px] font-medium text-zinc-500">{item.info}</div></div>
 </div>
 ))}
 </div>
 </section>
 </div>
 </aside>
 </div>
 </div>
 </div>
 )
}
