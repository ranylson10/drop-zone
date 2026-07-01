'use client'

import {
 createContext,
 useCallback,
 useContext,
 useEffect,
 useMemo,
 useState,
} from 'react'
import { supabase } from '../../lib/supabase'

type TipoPerfil = 'usuario' | 'jogo' | 'equipe' | 'produtora'

type PerfilBase = {
 id: string
 username?: string | null
 nome_exibicao?: string | null
 foto_url?: string | null
 avatar_url?: string | null
 bio?: string | null
 nome?: string | null
 logo_url?: string | null
 nick?: string | null
 foto_capa?: string | null
}

type PerfilContextType = {
 user: any
 loading: boolean
 perfilUsuario: PerfilBase | null
 perfisJogo: PerfilBase[]
 equipes: PerfilBase[]
 produtoras: PerfilBase[]
 perfilAtivo: PerfilBase | null
 tipoPerfil: TipoPerfil
 setPerfilAtivoByTipo: (tipo: TipoPerfil, id?: string | null) => void
 recarregarPerfis: () => Promise<void>
}

const PerfilContext = createContext<PerfilContextType | undefined>(undefined)

const STORAGE_TIPO_KEY = 'ff_tipo_perfil_ativo'
const STORAGE_ID_KEY = 'ff_id_perfil_ativo'

function limparEstadoPerfis() {
 return {
 perfilUsuario: null as PerfilBase | null,
 perfisJogo: [] as PerfilBase[],
 equipes: [] as PerfilBase[],
 produtoras: [] as PerfilBase[],
 perfilAtivo: null as PerfilBase | null,
 tipoPerfil: 'usuario' as TipoPerfil,
 }
}

function diagnosticarFetch(contexto: string, error: any) {
 const mensagem = extrairErro(error)
 const online =
 typeof navigator !== 'undefined' ? navigator.onLine : 'desconhecido'
 const origem =
 typeof window !== 'undefined' ? window.location.origin : 'server'

 console.error(`[${contexto}] Falha de rede/Supabase`, {
 mensagem,
 online,
 origem,
 supabaseUrl:
 typeof process !== 'undefined'
 ? process.env.NEXT_PUBLIC_SUPABASE_URL
 : undefined,
 erroBruto: error,
 })
}

function extrairErro(error: any) {
 if (!error) return 'Erro desconhecido'
 if (typeof error === 'string') return error
 if (error.message) return error.message
 if (error.details) return error.details
 if (error.hint) return error.hint
 if (error.code) return `${error.code} - ${error.message || 'Erro sem mensagem'}`

 try {
 const serializado = JSON.stringify(error, Object.getOwnPropertyNames(error))
 if (serializado && serializado !== '{}') return serializado
 } catch {}

 return 'Erro desconhecido'
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
 if (!value) return null
 return Array.isArray(value) ? value[0] || null : value
}

export function PerfilProvider({ children }: { children: React.ReactNode }) {
 const [user, setUser] = useState<any>(null)
 const [loading, setLoading] = useState(true)

 const [perfilUsuario, setPerfilUsuario] = useState<PerfilBase | null>(null)
 const [perfisJogo, setPerfisJogo] = useState<PerfilBase[]>([])
 const [equipes, setEquipes] = useState<PerfilBase[]>([])
 const [produtoras, setProdutoras] = useState<PerfilBase[]>([])

 const [perfilAtivo, setPerfilAtivo] = useState<PerfilBase | null>(null)
 const [tipoPerfil, setTipoPerfil] = useState<TipoPerfil>('usuario')

 const resetarPerfis = useCallback(() => {
 const estado = limparEstadoPerfis()

 setUser(null)
 setPerfilUsuario(estado.perfilUsuario)
 setPerfisJogo(estado.perfisJogo)
 setEquipes(estado.equipes)
 setProdutoras(estado.produtoras)
 setPerfilAtivo(estado.perfilAtivo)
 setTipoPerfil(estado.tipoPerfil)

 if (typeof window !== 'undefined') {
 localStorage.removeItem(STORAGE_TIPO_KEY)
 localStorage.removeItem(STORAGE_ID_KEY)
 }
 }, [])

 const carregarIdentidade = useCallback(async () => {
 try {
 setLoading(true)

 const {
 data: { session },
 error: sessionError,
 } = await supabase.auth.getSession()

 if (sessionError) throw sessionError

 const currentUser = session?.user ?? null

 if (!currentUser) {
 resetarPerfis()
 return
 }

 setUser(currentUser)

 const profileRes = await supabase
 .from('profiles')
 .select('id, username, nome_exibicao, foto_url, bio')
 .eq('id', currentUser.id)
 .maybeSingle()

 if (profileRes.error) throw profileRes.error

 const perfisJogoRes = await supabase
 .from('perfis_jogo')
 .select('id, user_id, nick, foto_capa, plataforma, funcao, ativo')
 .eq('user_id', currentUser.id)
 .eq('ativo', true)
 .order('created_at', { ascending: true })

 if (perfisJogoRes.error) throw perfisJogoRes.error

 const equipesCriadasRes = await supabase
 .from('equipes')
 .select('id, nome, logo_url, descricao, criado_por')
 .eq('criado_por', currentUser.id)
 .order('created_at', { ascending: true })

 if (equipesCriadasRes.error) throw equipesCriadasRes.error

 const produtorasCriadasRes = await supabase
 .from('produtoras')
 .select('id, nome, logo_url, descricao, dono_id')
 .eq('dono_id', currentUser.id)
 .order('created_at', { ascending: true })

 if (produtorasCriadasRes.error) throw produtorasCriadasRes.error

 const membrosEquipeRes = await supabase
 .from('membros_equipe')
 .select('equipe_id, perfil_jogo_id, tipo, ativo')
 .eq('ativo', true)

 if (membrosEquipeRes.error) throw membrosEquipeRes.error

 const membrosProdutoraRes = await supabase
 .from('membros_produtora')
 .select('produtora_id, tipo, user_id')
 .eq('user_id', currentUser.id)
 .in('tipo', ['dono', 'admin', 'membro'])

 if (membrosProdutoraRes.error) throw membrosProdutoraRes.error

 const perfilUser: PerfilBase | null = profileRes.data
 ? {
 id: profileRes.data.id,
 username: profileRes.data.username,
 nome_exibicao: profileRes.data.nome_exibicao,
 foto_url: profileRes.data.foto_url,
 bio: profileRes.data.bio,
 }
 : null

 const listaPerfisJogo: PerfilBase[] = (perfisJogoRes.data || []).map((item: any) => ({
 id: item.id,
 nick: item.nick,
 foto_capa: item.foto_capa,
 }))

 const equipesCriadas: PerfilBase[] = (equipesCriadasRes.data || []).map((item: any) => ({
 id: item.id,
 nome: item.nome,
 logo_url: item.logo_url,
 }))

 const produtorasCriadas: PerfilBase[] = (produtorasCriadasRes.data || []).map((item: any) => ({
 id: item.id,
 nome: item.nome,
 logo_url: item.logo_url,
 }))

 const perfilIdsDoUsuario = new Set(
 (perfisJogoRes.data || []).map((item: any) => String(item.id))
 )

 const equipeIdsComoMembro = Array.from(
 new Set(
 (membrosEquipeRes.data || [])
 .filter((item: any) => perfilIdsDoUsuario.has(String(item?.perfil_jogo_id || '')))
 .map((item: any) => String(item?.equipe_id || '').trim())
 .filter(Boolean)
 )
 )

 let equipesComoMembro: PerfilBase[] = []
 if (equipeIdsComoMembro.length > 0) {
 const equipesMembroRes = await supabase
 .from('equipes')
 .select('id, nome, logo_url, descricao, criado_por')
 .in('id', equipeIdsComoMembro)

 if (equipesMembroRes.error) throw equipesMembroRes.error

 equipesComoMembro = (equipesMembroRes.data || []).map((item: any) => ({
 id: item.id,
 nome: item.nome,
 logo_url: item.logo_url,
 }))
 }

 const produtoraIdsComoMembro = Array.from(
 new Set(
 (membrosProdutoraRes.data || [])
 .map((item: any) => String(item?.produtora_id || '').trim())
 .filter(Boolean)
 )
 )

 let produtorasComoMembro: PerfilBase[] = []
 if (produtoraIdsComoMembro.length > 0) {
 const produtorasMembroRes = await supabase
 .from('produtoras')
 .select('id, nome, logo_url, descricao, dono_id')
 .in('id', produtoraIdsComoMembro)

 if (produtorasMembroRes.error) throw produtorasMembroRes.error

 produtorasComoMembro = (produtorasMembroRes.data || []).map((item: any) => ({
 id: item.id,
 nome: item.nome,
 logo_url: item.logo_url,
 }))
 }

 const equipesMap = new Map<string, PerfilBase>()
 for (const eq of [...equipesCriadas, ...equipesComoMembro]) {
 equipesMap.set(eq.id, eq)
 }

 const produtorasMap = new Map<string, PerfilBase>()
 for (const prod of [...produtorasCriadas, ...produtorasComoMembro]) {
 produtorasMap.set(prod.id, prod)
 }

 const listaEquipes = Array.from(equipesMap.values())
 const listaProdutoras = Array.from(produtorasMap.values())

 setPerfilUsuario(perfilUser)
 setPerfisJogo(listaPerfisJogo)
 setEquipes(listaEquipes)
 setProdutoras(listaProdutoras)

 const tipoSalvo = (typeof window !== 'undefined'
 ? localStorage.getItem(STORAGE_TIPO_KEY)
 : null) as TipoPerfil | null

 const idSalvo =
 typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ID_KEY) : null

 let tipoParaAtivar: TipoPerfil = 'usuario'
 let perfilParaAtivar: PerfilBase | null = perfilUser

 if (tipoSalvo === 'jogo' && idSalvo) {
 const encontrado = listaPerfisJogo.find((p) => p.id === idSalvo)
 if (encontrado) {
 tipoParaAtivar = 'jogo'
 perfilParaAtivar = encontrado
 }
 } else if (tipoSalvo === 'equipe' && idSalvo) {
 const encontrado = listaEquipes.find((p) => p.id === idSalvo)
 if (encontrado) {
 tipoParaAtivar = 'equipe'
 perfilParaAtivar = encontrado
 }
 } else if (tipoSalvo === 'produtora' && idSalvo) {
 const encontrado = listaProdutoras.find((p) => p.id === idSalvo)
 if (encontrado) {
 tipoParaAtivar = 'produtora'
 perfilParaAtivar = encontrado
 }
 } else if (perfilUser) {
 tipoParaAtivar = 'usuario'
 perfilParaAtivar = perfilUser
 } else if (listaPerfisJogo.length > 0) {
 tipoParaAtivar = 'jogo'
 perfilParaAtivar = listaPerfisJogo[0]
 } else if (listaEquipes.length > 0) {
 tipoParaAtivar = 'equipe'
 perfilParaAtivar = listaEquipes[0]
 } else if (listaProdutoras.length > 0) {
 tipoParaAtivar = 'produtora'
 perfilParaAtivar = listaProdutoras[0]
 }

 setPerfilAtivo(perfilParaAtivar)
 setTipoPerfil(tipoParaAtivar)

 if (typeof window !== 'undefined') {
 localStorage.setItem(STORAGE_TIPO_KEY, tipoParaAtivar)
 localStorage.setItem(STORAGE_ID_KEY, perfilParaAtivar?.id || '')
 }
 } catch (error: any) {
 diagnosticarFetch('PerfilContext/carregarIdentidade', error)
 console.error('Erro ao sincronizar identidades:', extrairErro(error), error)
 resetarPerfis()
 } finally {
 setLoading(false)
 }
 }, [resetarPerfis])

 useEffect(() => {
 let mounted = true

 const iniciar = async () => {
 if (!mounted) return
 await carregarIdentidade()
 }

 iniciar()

 const {
 data: { subscription },
 } = supabase.auth.onAuthStateChange((_event, session) => {
 if (!mounted) return

 if (!session?.user) {
 resetarPerfis()
 setLoading(false)
 return
 }

 carregarIdentidade()
 })

 return () => {
 mounted = false
 subscription.unsubscribe()
 }
 }, [carregarIdentidade, resetarPerfis])

 const setPerfilAtivoByTipo = useCallback(
 (tipo: TipoPerfil, id?: string | null) => {
 let perfil: PerfilBase | null = null

 if (tipo === 'usuario') {
 perfil = perfilUsuario
 } else if (tipo === 'jogo') {
 perfil = perfisJogo.find((p) => p.id === id) || null
 } else if (tipo === 'equipe') {
 perfil = equipes.find((p) => p.id === id) || null
 } else if (tipo === 'produtora') {
 perfil = produtoras.find((p) => p.id === id) || null
 }

 if (!perfil) return

 setTipoPerfil(tipo)
 setPerfilAtivo(perfil)

 if (typeof window !== 'undefined') {
 localStorage.setItem(STORAGE_TIPO_KEY, tipo)
 localStorage.setItem(STORAGE_ID_KEY, perfil.id)
 }
 },
 [perfilUsuario, perfisJogo, equipes, produtoras]
 )

 const value = useMemo(
 () => ({
 user,
 loading,
 perfilUsuario,
 perfisJogo,
 equipes,
 produtoras,
 perfilAtivo,
 tipoPerfil,
 setPerfilAtivoByTipo,
 recarregarPerfis: carregarIdentidade,
 }),
 [
 user,
 loading,
 perfilUsuario,
 perfisJogo,
 equipes,
 produtoras,
 perfilAtivo,
 tipoPerfil,
 setPerfilAtivoByTipo,
 carregarIdentidade,
 ]
 )

 return <PerfilContext.Provider value={value}>{children}</PerfilContext.Provider>
}

export function usePerfil() {
 const context = useContext(PerfilContext)
 if (!context) {
 throw new Error('usePerfil deve ser usado dentro de PerfilProvider')
 }
 return context
}
