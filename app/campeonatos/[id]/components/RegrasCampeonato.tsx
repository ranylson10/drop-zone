'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
 ChevronDown,
 ChevronRight,
 FileText,
 Layers3,
 Trophy,
 ShieldAlert,
 Plus,
 Pencil,
 Trash2,
 Save,
 X,
 RefreshCw,
 Eye,
 EyeOff,
 GripVertical,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type RegraBloco = {
 id: string
 campeonato_id: string
 titulo: string
 slug: string | null
 descricao: string | null
 icone: string | null
 cor: string | null
 ordem: number
 aberto_por_padrao: boolean
 ativo: boolean
}

type RegraItemBanco = {
 id: string
 bloco_id: string
 titulo: string
 slug: string | null
 tipo: string | null
 chave_dinamica: string | null
 campo_dinamico?: string | null
 conteudo: string | null
 observacao: string | null
 destaque: boolean
 ativo: boolean
 ordem: number
}

type RegraItem = {
 id: string
 bloco_id: string
 titulo: string
 slug: string | null
 tipo: 'manual' | 'dinamico_texto' | 'dinamico_lista' | 'dinamico_resumo'
 chave_dinamica: string | null
 conteudo: string | null
 observacao: string | null
 destaque: boolean
 ativo: boolean
 ordem: number
}

type Fase = {
 id: string
 nome: string
 ordem: number
}

type Grupo = {
 id: string
 nome: string
 fase_id: string | null
 quantidade_equipes: number | null
}

type PontuacaoCampeonato = {
 id: string
 campeonato_id: string
 tipo: string | null
}

type PontuacaoColocacao = {
 id: string
 pontuacao_id: string
 colocacao: number
 pontos: number
}

type Campeonato = {
 id: string
 nome: string
 status: string | null
 data_inicio: string | null
 data_fim: string | null
 data_abertura_inscricoes: string | null
 data_encerramento_inscricoes: string | null
 idade_minima: number | null
 valor_premiacao: number | null
 tipo_premiacao: string | null
 premiacao_garantida: boolean | null
 forma_pagamento_premiacao: string | null
 prazo_pagamento_premiacao: string | null
 valor_vaga: number | null
 vagas: number | null
 limite_por_organizacao: number | null
 modo_jogo: string | null
 formato: string | null
 quantidade_equipes: number | null
 equipes_por_jogo: number | null
 quantidade_quedas: number | null
 quedas_por_rodada: number | null
 quantidade_rodadas: number | null
 criterio_desempate: string | null
 jogadores_por_equipe: number | null
 reservas_permitidos: number | null
 substitutos_permitidos: boolean | null
 checkin_obrigatorio: boolean | null
 horario_checkin: string | null
 pro_players_proibidos: boolean | null
 guildas_restritas: string | null
 troca_jogadores: string | null
 penalidade_wo: string | null
 transmissao_ao_vivo: boolean | null
 plataforma_transmissao: string | null
 narradores: string | null
 delay_transmissao: string | null
 replays_disponiveis: boolean | null
 cobertura_redes_sociais: boolean | null
 anti_cheat: boolean | null
 discord_oficial: boolean | null
 discord_url: string | null
 whatsapp_suporte: string | null
 email_suporte: string | null
 responsavel_nome: string | null
 mapas: string[] | null
}

type BlocoComItens = RegraBloco & {
 itens: RegraItem[]
}

type BlocoForm = {
 titulo: string
 slug: string
 descricao: string
 cor: string
 aberto_por_padrao: boolean
 ativo: boolean
}

type ItemForm = {
 titulo: string
 slug: string
 tipo: RegraItem['tipo']
 chave_dinamica: string
 conteudo: string
 observacao: string
 destaque: boolean
 ativo: boolean
}

const CORES_PADRAO = [
 '#39ff14',
 '#00e5ff',
 '#ffd700',
 '#ff4d6d',
 '#8b5cf6',
 '#ffffff',
]

const CHAVES_DINAMICAS = [
 { value: 'status_campeonato', label: 'Status do campeonato' },
 { value: 'data_inicio', label: 'Data de início' },
 { value: 'data_fim', label: 'Data de fim' },
 { value: 'inicio_inscricoes', label: 'Início das inscrições' },
 { value: 'fim_inscricoes', label: 'Fim das inscrições' },
 { value: 'idade_minima', label: 'Idade mínima' },
 { value: 'premiacao_total', label: 'Premiação total' },
 { value: 'tipo_premiacao', label: 'Tipo de premiação' },
 { value: 'premiacao_garantida', label: 'Premiação garantida' },
 { value: 'forma_pagamento_premiacao', label: 'Forma de pagamento da premiação' },
 { value: 'prazo_pagamento_premiacao', label: 'Prazo de pagamento da premiação' },
 { value: 'valor_vaga', label: 'Valor da vaga' },
 { value: 'vagas', label: 'Total de vagas' },
 { value: 'limite_por_organizacao', label: 'Limite por organização' },
 { value: 'modo_jogo', label: 'Modo de jogo' },
 { value: 'formato', label: 'Formato' },
 { value: 'quantidade_equipes', label: 'Quantidade de equipes' },
 { value: 'equipes_por_jogo', label: 'Equipes por jogo' },
 { value: 'quantidade_quedas', label: 'Quantidade total de quedas' },
 { value: 'quedas_por_rodada', label: 'Quedas por rodada' },
 { value: 'quantidade_rodadas', label: 'Quantidade de rodadas' },
 { value: 'criterio_desempate', label: 'Critério de desempate' },
 { value: 'jogadores_por_equipe', label: 'Jogadores por equipe' },
 { value: 'reservas_permitidos', label: 'Reservas permitidos' },
 { value: 'substitutos_permitidos', label: 'Substitutos permitidos' },
 { value: 'checkin', label: 'Check-in' },
 { value: 'pro_players', label: 'Pro players' },
 { value: 'guildas_restritas', label: 'Guildas restritas' },
 { value: 'troca_jogadores', label: 'Troca de jogadores' },
 { value: 'penalidade_wo', label: 'Penalidade por W.O.' },
 { value: 'transmissao', label: 'Transmissão' },
 { value: 'plataforma_transmissao', label: 'Plataforma de transmissão' },
 { value: 'narradores', label: 'Narradores' },
 { value: 'delay_transmissao', label: 'Delay da transmissão' },
 { value: 'replays', label: 'Replays' },
 { value: 'redes_sociais', label: 'Cobertura em redes sociais' },
 { value: 'anti_cheat', label: 'Anti-cheat' },
 { value: 'discord', label: 'Discord' },
 { value: 'contato', label: 'Contato' },
 { value: 'mapas', label: 'Mapas' },
 { value: 'quantidade_fases', label: 'Quantidade de fases' },
 { value: 'quantidade_grupos', label: 'Quantidade de grupos' },
 { value: 'lista_fases', label: 'Lista de fases' },
 { value: 'lista_grupos', label: 'Lista de grupos' },
 { value: 'resumo_estrutura', label: 'Resumo da estrutura' },
 { value: 'resumo_formato', label: 'Resumo do formato' },
 { value: 'resumo_premiacao', label: 'Resumo da premiação' },
 { value: 'tabela_pontuacao', label: 'Tabela de pontuação' },
]

function formatMoney(value?: number | null) {
 return new Intl.NumberFormat('pt-BR', {
 style: 'currency',
 currency: 'BRL',
 minimumFractionDigits: 0,
 maximumFractionDigits: 2,
 }).format(Number(value || 0))
}

function formatDateTime(value?: string | null) {
 if (!value) return 'Não definido'
 return new Date(value).toLocaleString('pt-BR')
}

function formatDate(value?: string | null) {
 if (!value) return 'Não definido'
 return new Date(value).toLocaleDateString('pt-BR')
}

function formatTime(value?: string | null) {
 if (!value) return 'Não definido'
 return value.slice(0, 5)
}

function IconeBloco({ slug }: { slug?: string | null }) {
 if (slug === 'estrutura') return <Layers3 size={18} />
 if (slug === 'formato') return <FileText size={18} />
 if (slug === 'premiacao') return <Trophy size={18} />
 return <ShieldAlert size={18} />
}

function classNames(...classes: Array<string | false | null | undefined>) {
 return classes.filter(Boolean).join(' ')
}

function normalizarTipo(tipo?: string | null): RegraItem['tipo'] {
 if (tipo === 'dinamico_texto' || tipo === 'dinamico_lista' || tipo === 'dinamico_resumo') {
 return tipo
 }
 return 'manual'
}

function extrairMensagemErro(error: any) {
 if (!error) return 'Erro desconhecido'
 if (typeof error === 'string') return error
 if (error.message) return error.message
 if (error.details) return error.details
 if (error.hint) return error.hint

 try {
 const serializado = JSON.stringify(error)
 if (serializado && serializado !== '{}') return serializado
 } catch {}

 return 'Erro desconhecido'
}

function slugify(value: string) {
 return value
 .toLowerCase()
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .replace(/[^a-z0-9]+/g, '-')
 .replace(/^-+|-+$/g, '')
}

function blocoFormPadrao(): BlocoForm {
 return {
 titulo: '',
 slug: '',
 descricao: '',
 cor: '#39ff14',
 aberto_por_padrao: false,
 ativo: true,
 }
}

function itemFormPadrao(): ItemForm {
 return {
 titulo: '',
 slug: '',
 tipo: 'manual',
 chave_dinamica: '',
 conteudo: '',
 observacao: '',
 destaque: false,
 ativo: true,
 }
}


function InfoLinha({ label, valor }: { label: string; valor: string }) {
 return (
 <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-3">
 <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-bold">
 {label}
 </div>
 <div className="text-right text-[12px] leading-5 text-[#142340] font-semibold max-w-[60%] break-words">
 {valor}
 </div>
 </div>
 )
}

export default function RegrasCampeonato({
 campeonatoId,
}: {
 campeonatoId: string
}) {
 const [loading, setLoading] = useState(true)
 const [erro, setErro] = useState<string | null>(null)
 const [salvando, setSalvando] = useState(false)

 const [campeonato, setCampeonato] = useState<Campeonato | null>(null)
 const [fases, setFases] = useState<Fase[]>([])
 const [grupos, setGrupos] = useState<Grupo[]>([])
 const [pontuacao, setPontuacao] = useState<PontuacaoCampeonato | null>(null)
 const [colocacoes, setColocacoes] = useState<PontuacaoColocacao[]>([])
 const [blocos, setBlocos] = useState<BlocoComItens[]>([])
 const [abertos, setAbertos] = useState<Record<string, boolean>>({})
 const [modoAdmin, setModoAdmin] = useState(true)

 const [blocoFormAberto, setBlocoFormAberto] = useState(false)
 const [blocoEditandoId, setBlocoEditandoId] = useState<string | null>(null)
 const [blocoForm, setBlocoForm] = useState<BlocoForm>(blocoFormPadrao())

 const [itemFormAbertoEm, setItemFormAbertoEm] = useState<string | null>(null)
 const [itemEditandoId, setItemEditandoId] = useState<string | null>(null)
 const [itemFormBlocoId, setItemFormBlocoId] = useState<string | null>(null)
 const [itemForm, setItemForm] = useState<ItemForm>(itemFormPadrao())

 const carregarDados = useCallback(async () => {
 try {
 setLoading(true)
 setErro(null)

 const campeonatoRes = await supabase
 .from('campeonatos')
 .select(`
 id,
 nome,
 status,
 data_inicio,
 data_fim,
 data_abertura_inscricoes,
 data_encerramento_inscricoes,
 idade_minima,
 valor_premiacao,
 tipo_premiacao,
 premiacao_garantida,
 forma_pagamento_premiacao,
 prazo_pagamento_premiacao,
 valor_vaga,
 vagas,
 limite_por_organizacao,
 modo_jogo,
 formato,
 quantidade_equipes,
 equipes_por_jogo,
 quantidade_quedas,
 quedas_por_rodada,
 quantidade_rodadas,
 criterio_desempate,
 jogadores_por_equipe,
 reservas_permitidos,
 substitutos_permitidos,
 checkin_obrigatorio,
 horario_checkin,
 pro_players_proibidos,
 guildas_restritas,
 troca_jogadores,
 penalidade_wo,
 transmissao_ao_vivo,
 plataforma_transmissao,
 narradores,
 delay_transmissao,
 replays_disponiveis,
 cobertura_redes_sociais,
 anti_cheat,
 discord_oficial,
 discord_url,
 whatsapp_suporte,
 email_suporte,
 responsavel_nome,
 mapas
 `)
 .eq('id', campeonatoId)
 .single()

 if (campeonatoRes.error) {
 throw new Error(`campeonatos: ${extrairMensagemErro(campeonatoRes.error)}`)
 }

 const fasesRes = await supabase
 .from('campeonato_fases')
 .select('id, nome, ordem')
 .eq('campeonato_id', campeonatoId)
 .order('ordem', { ascending: true })

 if (fasesRes.error) {
 throw new Error(`campeonato_fases: ${extrairMensagemErro(fasesRes.error)}`)
 }

 const gruposRes = await supabase
 .from('campeonato_grupos')
 .select('id, nome, fase_id, quantidade_equipes')
 .eq('campeonato_id', campeonatoId)
 .order('nome', { ascending: true })

 if (gruposRes.error) {
 throw new Error(`campeonato_grupos: ${extrairMensagemErro(gruposRes.error)}`)
 }

 const pontuacaoRes = await supabase
 .from('pontuacao_campeonato')
 .select('id, campeonato_id, tipo')
 .eq('campeonato_id', campeonatoId)
 .maybeSingle()

 if (pontuacaoRes.error) {
 throw new Error(`pontuacao_campeonato: ${extrairMensagemErro(pontuacaoRes.error)}`)
 }

 const blocosRes = await supabase
 .from('campeonato_regras_blocos')
 .select(`
 id,
 campeonato_id,
 titulo,
 slug,
 descricao,
 icone,
 cor,
 ordem,
 aberto_por_padrao,
 ativo
 `)
 .eq('campeonato_id', campeonatoId)
 .order('ordem', { ascending: true })

 if (blocosRes.error) {
 throw new Error(
 `campeonato_regras_blocos: ${extrairMensagemErro(blocosRes.error)}`
 )
 }

 const blocoIds = (blocosRes.data || []).map((bloco) => bloco.id)

 let itensData: RegraItemBanco[] = []
 if (blocoIds.length > 0) {
 const itensRes = await supabase
 .from('campeonato_regras_itens')
 .select(`
 id,
 bloco_id,
 titulo,
 slug,
 tipo,
 chave_dinamica,
 campo_dinamico,
 conteudo,
 observacao,
 destaque,
 ativo,
 ordem
 `)
 .in('bloco_id', blocoIds)
 .order('ordem', { ascending: true })

 if (itensRes.error) {
 throw new Error(`campeonato_regras_itens: ${extrairMensagemErro(itensRes.error)}`)
 }

 itensData = itensRes.data || []
 }

 let colocacoesData: PontuacaoColocacao[] = []
 if (pontuacaoRes.data?.id) {
 const colocacoesRes = await supabase
 .from('pontuacao_colocacoes')
 .select('id, pontuacao_id, colocacao, pontos')
 .eq('pontuacao_id', pontuacaoRes.data.id)
 .order('colocacao', { ascending: true })

 if (colocacoesRes.error) {
 throw new Error(`pontuacao_colocacoes: ${extrairMensagemErro(colocacoesRes.error)}`)
 }

 colocacoesData = colocacoesRes.data || []
 }

 const itensPorBloco = new Map<string, RegraItem[]>()

 for (const item of itensData) {
 const itemNormalizado: RegraItem = {
 id: item.id,
 bloco_id: item.bloco_id,
 titulo: item.titulo,
 slug: item.slug,
 tipo: normalizarTipo(item.tipo),
 chave_dinamica: item.chave_dinamica || item.campo_dinamico || null,
 conteudo: item.conteudo,
 observacao: item.observacao,
 destaque: item.destaque,
 ativo: item.ativo,
 ordem: item.ordem,
 }

 if (!itensPorBloco.has(item.bloco_id)) {
 itensPorBloco.set(item.bloco_id, [])
 }

 itensPorBloco.get(item.bloco_id)!.push(itemNormalizado)
 }

 const blocosFormatados: BlocoComItens[] = (blocosRes.data || []).map((bloco) => ({
 ...bloco,
 itens: (itensPorBloco.get(bloco.id) || []).sort((a, b) => a.ordem - b.ordem),
 }))

 const abertosIniciais: Record<string, boolean> = {}
 blocosFormatados.forEach((bloco) => {
 abertosIniciais[bloco.id] = bloco.aberto_por_padrao
 })

 setCampeonato(campeonatoRes.data)
 setFases(fasesRes.data || [])
 setGrupos(gruposRes.data || [])
 setPontuacao(pontuacaoRes.data || null)
 setColocacoes(colocacoesData)
 setBlocos(blocosFormatados)
 setAbertos(abertosIniciais)
 } catch (error: any) {
 console.error('Erro ao carregar regras do campeonato:', error)
 setErro(extrairMensagemErro(error))
 } finally {
 setLoading(false)
 }
 }, [campeonatoId])

 useEffect(() => {
 carregarDados()
 }, [carregarDados])

 const gruposPorFase = useMemo(() => {
 const mapa = new Map<string, Grupo[]>()

 for (const grupo of grupos) {
 const chave = grupo.fase_id || 'sem-fase'
 if (!mapa.has(chave)) mapa.set(chave, [])
 mapa.get(chave)!.push(grupo)
 }

 for (const [, lista] of mapa) {
 lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
 }

 return mapa
 }, [grupos])

 function toggleBloco(blocoId: string) {
 setAbertos((prev) => ({
 ...prev,
 [blocoId]: !prev[blocoId],
 }))
 }

 function abrirCriacaoBloco() {
 setBlocoEditandoId(null)
 setBlocoForm(blocoFormPadrao())
 setBlocoFormAberto(true)
 }

 function abrirEdicaoBloco(bloco: RegraBloco) {
 setBlocoEditandoId(bloco.id)
 setBlocoForm({
 titulo: bloco.titulo || '',
 slug: bloco.slug || '',
 descricao: bloco.descricao || '',
 cor: bloco.cor || '#39ff14',
 aberto_por_padrao: !!bloco.aberto_por_padrao,
 ativo: !!bloco.ativo,
 })
 setBlocoFormAberto(true)
 }

 function fecharFormBloco() {
 setBlocoFormAberto(false)
 setBlocoEditandoId(null)
 setBlocoForm(blocoFormPadrao())
 }

 function abrirCriacaoItem(blocoId: string) {
 setItemEditandoId(null)
 setItemFormBlocoId(blocoId)
 setItemForm(itemFormPadrao())
 setItemFormAbertoEm(blocoId)
 setAbertos((prev) => ({ ...prev, [blocoId]: true }))
 }

 function abrirEdicaoItem(item: RegraItem) {
 setItemEditandoId(item.id)
 setItemFormBlocoId(item.bloco_id)
 setItemForm({
 titulo: item.titulo || '',
 slug: item.slug || '',
 tipo: item.tipo,
 chave_dinamica: item.chave_dinamica || '',
 conteudo: item.conteudo || '',
 observacao: item.observacao || '',
 destaque: !!item.destaque,
 ativo: !!item.ativo,
 })
 setItemFormAbertoEm(item.bloco_id)
 setAbertos((prev) => ({ ...prev, [item.bloco_id]: true }))
 }

 function fecharFormItem() {
 setItemEditandoId(null)
 setItemFormBlocoId(null)
 setItemForm(itemFormPadrao())
 setItemFormAbertoEm(null)
 }

 async function salvarBloco() {
 try {
 setSalvando(true)
 const titulo = blocoForm.titulo.trim()
 if (!titulo) {
 throw new Error('Informe o título do bloco.')
 }

 const slug = (blocoForm.slug || slugify(titulo)).trim()
 const maiorOrdem = blocos.reduce((acc, bloco) => Math.max(acc, bloco.ordem || 0), 0)
 const payload = {
 campeonato_id: campeonatoId,
 titulo,
 slug: slug || null,
 descricao: blocoForm.descricao.trim() || null,
 cor: blocoForm.cor || null,
 aberto_por_padrao: blocoForm.aberto_por_padrao,
 ativo: blocoForm.ativo,
 ordem: blocoEditandoId
 ? undefined
 : maiorOrdem + 1,
 }

 if (blocoEditandoId) {
 const { error } = await supabase
 .from('campeonato_regras_blocos')
 .update({
 titulo: payload.titulo,
 slug: payload.slug,
 descricao: payload.descricao,
 cor: payload.cor,
 aberto_por_padrao: payload.aberto_por_padrao,
 ativo: payload.ativo,
 })
 .eq('id', blocoEditandoId)

 if (error) throw error
 } else {
 const { error } = await supabase
 .from('campeonato_regras_blocos')
 .insert(payload)

 if (error) throw error
 }

 fecharFormBloco()
 await carregarDados()
 } catch (error: any) {
 alert(extrairMensagemErro(error))
 } finally {
 setSalvando(false)
 }
 }

 async function excluirBloco(bloco: BlocoComItens) {
 const confirmado = window.confirm(
 `Excluir o bloco "${bloco.titulo}"?\n\nOs itens dele também serão removidos.`
 )
 if (!confirmado) return

 try {
 setSalvando(true)
 const { error } = await supabase
 .from('campeonato_regras_blocos')
 .delete()
 .eq('id', bloco.id)

 if (error) throw error
 await carregarDados()
 } catch (error: any) {
 alert(extrairMensagemErro(error))
 } finally {
 setSalvando(false)
 }
 }

 async function moverBloco(bloco: BlocoComItens, direcao: 'up' | 'down') {
 const lista = [...blocos].sort((a, b) => a.ordem - b.ordem)
 const index = lista.findIndex((b) => b.id === bloco.id)
 if (index < 0) return

 const outroIndex = direcao === 'up' ? index - 1 : index + 1
 if (outroIndex < 0 || outroIndex >= lista.length) return

 const outro = lista[outroIndex]

 try {
 setSalvando(true)

 const { error: e1 } = await supabase
 .from('campeonato_regras_blocos')
 .update({ ordem: outro.ordem })
 .eq('id', bloco.id)

 if (e1) throw e1

 const { error: e2 } = await supabase
 .from('campeonato_regras_blocos')
 .update({ ordem: bloco.ordem })
 .eq('id', outro.id)

 if (e2) throw e2

 await carregarDados()
 } catch (error: any) {
 alert(extrairMensagemErro(error))
 } finally {
 setSalvando(false)
 }
 }

 async function salvarItem() {
 try {
 setSalvando(true)

 if (!itemFormBlocoId) {
 throw new Error('Bloco do item não definido.')
 }

 const titulo = itemForm.titulo.trim()
 if (!titulo) {
 throw new Error('Informe o título do item.')
 }

 const slug = (itemForm.slug || slugify(titulo)).trim()
 const blocoAtual = blocos.find((b) => b.id === itemFormBlocoId)
 const maiorOrdem = (blocoAtual?.itens || []).reduce(
 (acc, item) => Math.max(acc, item.ordem || 0),
 0
 )

 const tipoBanco =
 itemForm.tipo === 'manual'
 ? 'manual'
 : itemForm.tipo

 const payload = {
 bloco_id: itemFormBlocoId,
 titulo,
 slug: slug || null,
 tipo: tipoBanco,
 chave_dinamica:
 itemForm.tipo === 'manual' ? null : itemForm.chave_dinamica || null,
 campo_dinamico:
 itemForm.tipo === 'manual' ? null : itemForm.chave_dinamica || null,
 conteudo: itemForm.tipo === 'manual' ? itemForm.conteudo || null : null,
 observacao: itemForm.observacao.trim() || null,
 destaque: itemForm.destaque,
 ativo: itemForm.ativo,
 ordem: itemEditandoId ? undefined : maiorOrdem + 1,
 }

 if (itemEditandoId) {
 const { error } = await supabase
 .from('campeonato_regras_itens')
 .update({
 titulo: payload.titulo,
 slug: payload.slug,
 tipo: payload.tipo,
 chave_dinamica: payload.chave_dinamica,
 campo_dinamico: payload.campo_dinamico,
 conteudo: payload.conteudo,
 observacao: payload.observacao,
 destaque: payload.destaque,
 ativo: payload.ativo,
 })
 .eq('id', itemEditandoId)

 if (error) throw error
 } else {
 const { error } = await supabase
 .from('campeonato_regras_itens')
 .insert(payload)

 if (error) throw error
 }

 fecharFormItem()
 await carregarDados()
 } catch (error: any) {
 alert(extrairMensagemErro(error))
 } finally {
 setSalvando(false)
 }
 }

 async function excluirItem(item: RegraItem) {
 const confirmado = window.confirm(`Excluir o item "${item.titulo}"?`)
 if (!confirmado) return

 try {
 setSalvando(true)
 const { error } = await supabase
 .from('campeonato_regras_itens')
 .delete()
 .eq('id', item.id)

 if (error) throw error
 await carregarDados()
 } catch (error: any) {
 alert(extrairMensagemErro(error))
 } finally {
 setSalvando(false)
 }
 }

 async function moverItem(item: RegraItem, direcao: 'up' | 'down') {
 const blocoAtual = blocos.find((b) => b.id === item.bloco_id)
 if (!blocoAtual) return

 const lista = [...blocoAtual.itens].sort((a, b) => a.ordem - b.ordem)
 const index = lista.findIndex((i) => i.id === item.id)
 if (index < 0) return

 const outroIndex = direcao === 'up' ? index - 1 : index + 1
 if (outroIndex < 0 || outroIndex >= lista.length) return

 const outro = lista[outroIndex]

 try {
 setSalvando(true)

 const { error: e1 } = await supabase
 .from('campeonato_regras_itens')
 .update({ ordem: outro.ordem })
 .eq('id', item.id)

 if (e1) throw e1

 const { error: e2 } = await supabase
 .from('campeonato_regras_itens')
 .update({ ordem: item.ordem })
 .eq('id', outro.id)

 if (e2) throw e2

 await carregarDados()
 } catch (error: any) {
 alert(extrairMensagemErro(error))
 } finally {
 setSalvando(false)
 }
 }

 function resolverRegraDinamica(item: RegraItem): string | string[] {
 const chave = item.chave_dinamica

 switch (chave) {
 case 'status_campeonato':
 return campeonato?.status || 'Não definido'
 case 'data_inicio':
 return formatDateTime(campeonato?.data_inicio)
 case 'data_fim':
 return formatDateTime(campeonato?.data_fim)
 case 'inicio_inscricoes':
 return formatDateTime(campeonato?.data_abertura_inscricoes)
 case 'fim_inscricoes':
 return formatDateTime(campeonato?.data_encerramento_inscricoes)
 case 'idade_minima':
 return campeonato?.idade_minima ? `${campeonato.idade_minima} anos` : 'Não definida'
 case 'premiacao_total':
 return formatMoney(campeonato?.valor_premiacao)
 case 'tipo_premiacao':
 return campeonato?.tipo_premiacao || 'Não definido'
 case 'premiacao_garantida':
 return campeonato?.premiacao_garantida ? 'Sim' : 'Não'
 case 'forma_pagamento_premiacao':
 return campeonato?.forma_pagamento_premiacao || 'Não definida'
 case 'prazo_pagamento_premiacao':
 return campeonato?.prazo_pagamento_premiacao || 'Não definido'
 case 'valor_vaga':
 return formatMoney(campeonato?.valor_vaga)
 case 'vagas':
 return campeonato?.vagas ? `${campeonato.vagas} vagas` : 'Não definido'
 case 'limite_por_organizacao':
 return campeonato?.limite_por_organizacao
 ? `${campeonato.limite_por_organizacao} equipe(s)`
 : 'Não definido'
 case 'modo_jogo':
 return campeonato?.modo_jogo || 'Não definido'
 case 'formato':
 return campeonato?.formato || 'Não definido'
 case 'quantidade_equipes':
 return campeonato?.quantidade_equipes
 ? `${campeonato.quantidade_equipes} equipes`
 : 'Não definido'
 case 'equipes_por_jogo':
 return campeonato?.equipes_por_jogo
 ? `${campeonato.equipes_por_jogo} por jogo`
 : 'Não definido'
 case 'quantidade_quedas':
 return campeonato?.quantidade_quedas
 ? `${campeonato.quantidade_quedas} quedas`
 : 'Não definido'
 case 'quedas_por_rodada':
 return campeonato?.quedas_por_rodada
 ? `${campeonato.quedas_por_rodada} quedas por rodada`
 : 'Não definido'
 case 'quantidade_rodadas':
 return campeonato?.quantidade_rodadas
 ? `${campeonato.quantidade_rodadas} rodadas`
 : 'Não definido'
 case 'criterio_desempate':
 return campeonato?.criterio_desempate || 'Não definido'
 case 'jogadores_por_equipe':
 return campeonato?.jogadores_por_equipe
 ? `${campeonato?.jogadores_por_equipe} jogadores`
 : 'Não definido'
 case 'reservas_permitidos':
 return campeonato?.reservas_permitidos != null
 ? `${campeonato.reservas_permitidos} reserva(s)`
 : 'Não definido'
 case 'substitutos_permitidos':
 return campeonato?.substitutos_permitidos ? 'Sim' : 'Não'
 case 'checkin':
 if (!campeonato?.checkin_obrigatorio) return 'Check-in não obrigatório'
 return campeonato?.horario_checkin
 ? `Obrigatório às ${formatTime(campeonato.horario_checkin)}`
 : 'Obrigatório'
 case 'pro_players':
 return campeonato?.pro_players_proibidos
 ? 'Pro players proibidos'
 : 'Pro players permitidos'
 case 'guildas_restritas':
 return campeonato?.guildas_restritas || 'Sem restrição informada'
 case 'troca_jogadores':
 return campeonato?.troca_jogadores || 'Não definida'
 case 'penalidade_wo':
 return campeonato?.penalidade_wo || 'Não definida'
 case 'transmissao':
 return campeonato?.transmissao_ao_vivo ? 'Haverá transmissão oficial' : 'Sem transmissão oficial'
 case 'plataforma_transmissao':
 return campeonato?.plataforma_transmissao || 'Não definida'
 case 'narradores':
 return campeonato?.narradores || 'Não definidos'
 case 'delay_transmissao':
 return campeonato?.delay_transmissao || 'Não definido'
 case 'replays':
 return campeonato?.replays_disponiveis ? 'Disponíveis' : 'Não disponíveis'
 case 'redes_sociais':
 return campeonato?.cobertura_redes_sociais ? 'Haverá cobertura' : 'Sem cobertura informada'
 case 'anti_cheat':
 return campeonato?.anti_cheat ? 'Ativo' : 'Não informado'
 case 'discord':
 if (!campeonato?.discord_oficial) return 'Servidor oficial não informado'
 return campeonato?.discord_url || 'Servidor oficial disponível'
 case 'contato':
 return [
 campeonato?.whatsapp_suporte && `WhatsApp: ${campeonato.whatsapp_suporte}`,
 campeonato?.email_suporte && `E-mail: ${campeonato.email_suporte}`,
 campeonato?.responsavel_nome && `Responsável: ${campeonato.responsavel_nome}`,
 ].filter(Boolean) as string[]
 case 'mapas':
 return campeonato?.mapas?.length ? campeonato.mapas : ['Não definidos']
 case 'quantidade_fases':
 return `${fases.length} fase(s)`
 case 'quantidade_grupos':
 return `${grupos.length} grupo(s)`
 case 'lista_fases':
 return fases.length
 ? [...fases].sort((a, b) => a.ordem - b.ordem).map((fase) => fase.nome)
 : ['Nenhuma fase cadastrada']
 case 'lista_grupos':
 return grupos.length
 ? [...grupos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((grupo) => grupo.nome)
 : ['Nenhum grupo cadastrado']
 case 'resumo_estrutura':
 return `O campeonato possui ${fases.length} fase(s) e ${grupos.length} grupo(s) cadastrados.`
 case 'resumo_formato':
 return `A competição será disputada no modo ${campeonato?.modo_jogo || 'não definido'}, com formato ${campeonato?.formato || 'não definido'}, ${campeonato?.quedas_por_rodada || 0} queda(s) por rodada e ${campeonato?.equipes_por_jogo || 0} equipe(s) por jogo.`
 case 'resumo_premiacao':
 return `A premiação total será de ${formatMoney(campeonato?.valor_premiacao)}, com pagamento em ${campeonato?.forma_pagamento_premiacao || 'forma não definida'}${campeonato?.prazo_pagamento_premiacao ? ` e prazo ${campeonato.prazo_pagamento_premiacao}` : ''}.`
 case 'tabela_pontuacao':
 return colocacoes.length
 ? [...colocacoes]
 .sort((a, b) => a.colocacao - b.colocacao)
 .map((linha) => `${linha.colocacao}º lugar - ${linha.pontos} ponto(s)`)
 : ['Pontuação ainda não configurada']
 default:
 return item.conteudo || 'Não definido'
 }
 }

 function renderValorItem(item: RegraItem) {
 if (item.tipo === 'manual') {
 return (
 <div className="text-[13px] leading-6 text-zinc-600 whitespace-pre-line">
 {item.conteudo || '—'}
 </div>
 )
 }

 const resultado = resolverRegraDinamica(item)

 if (Array.isArray(resultado)) {
 return (
 <ul className="space-y-1.5">
 {resultado.map((linha, index) => (
 <li
 key={`${item.id}-${index}`}
 className="text-[13px] leading-6 text-zinc-600 flex items-start gap-2"
 >
 <span className="mt-[8px] h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
 <span>{linha}</span>
 </li>
 ))}
 </ul>
 )
 }

 return (
 <div className="text-[13px] leading-6 text-zinc-600 whitespace-pre-line">
 {resultado}
 </div>
 )
 }

 if (loading) {
 return (
 <div className="border border-zinc-200 bg-white p-6">
 <div className="text-sm text-zinc-600">Carregando regras...</div>
 </div>
 )
 }

 if (erro) {
 return (
 <div className="border border-red-500/20 bg-red-500/5 p-6">
 <div className="text-sm font-semibold text-red-300">Erro ao carregar regras</div>
 <div className="text-xs text-red-200/80 mt-2 whitespace-pre-wrap">{erro}</div>
 </div>
 )
 }

 return (
 <div className="space-y-4">
 <div className=" border border-emerald-500/20 bg-white p-5">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <div className="text-[11px] uppercase tracking-[0.30em] text-emerald-400 font-semibold">
 Regras do campeonato
 </div>

 <div className="mt-2 text-[20px] font-semibold text-[#142340] drop--[0_0_8px_rgba(0,255,170,0.28)]">
 {campeonato?.nome || 'Campeonato'}
 </div>

 <div className="mt-3 flex flex-wrap gap-2">
 <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-[11px] text-zinc-600">
 {fases.length} fase(s)
 </span>
 <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-[11px] text-zinc-600">
 {grupos.length} grupo(s)
 </span>
 {campeonato?.data_inicio && (
 <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-[11px] text-zinc-600">
 Início: {formatDate(campeonato.data_inicio)}
 </span>
 )}
 {pontuacao?.tipo && (
 <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-[11px] text-zinc-600">
 Pontuação: {pontuacao.tipo}
 </span>
 )}
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={() => setModoAdmin((prev) => !prev)}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#142340]"
 >
 {modoAdmin ? <EyeOff size={14} /> : <Eye size={14} />}
 {modoAdmin ? 'Ocultar admin' : 'Mostrar admin'}
 </button>

 <button
 type="button"
 onClick={carregarDados}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#142340]"
 >
 <RefreshCw size={14} />
 Atualizar
 </button>

 {modoAdmin && (
 <button
 type="button"
 onClick={abrirCriacaoBloco}
 className="inline-flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/15 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-emerald-300"
 >
 <Plus size={14} />
 Criar bloco
 </button>
 )}
 </div>
 </div>
 </div>


 <div className="grid gap-4 lg:grid-cols-3">
 <div className=" border border-zinc-200 bg-white p-5">
 <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-400 font-semibold">
 Informações do campeonato
 </div>
 <div className="mt-4 space-y-3">
 <InfoLinha label="Status" valor={campeonato?.status || 'Não definido'} />
 <InfoLinha label="Início" valor={formatDateTime(campeonato?.data_inicio)} />
 <InfoLinha label="Fim" valor={formatDateTime(campeonato?.data_fim)} />
 <InfoLinha label="Inscrições" valor={`${formatDateTime(campeonato?.data_abertura_inscricoes)} até ${formatDateTime(campeonato?.data_encerramento_inscricoes)}`} />
 <InfoLinha label="Idade mínima" valor={campeonato?.idade_minima ? `${campeonato.idade_minima} anos` : 'Não definida'} />
 <InfoLinha label="Valor da vaga" valor={formatMoney(campeonato?.valor_vaga)} />
 <InfoLinha label="Vagas" valor={campeonato?.vagas ? `${campeonato.vagas} vagas` : 'Não definido'} />
 </div>
 </div>

 <div className=" border border-zinc-200 bg-white p-5">
 <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-400 font-semibold">
 Competição
 </div>
 <div className="mt-4 space-y-3">
 <InfoLinha label="Modo" valor={campeonato?.modo_jogo || 'Não definido'} />
 <InfoLinha label="Formato" valor={campeonato?.formato || 'Não definido'} />
 <InfoLinha label="Equipes" valor={campeonato?.quantidade_equipes ? `${campeonato.quantidade_equipes} equipes` : 'Não definido'} />
 <InfoLinha label="Equipes por jogo" valor={campeonato?.equipes_por_jogo ? `${campeonato.equipes_por_jogo} por jogo` : 'Não definido'} />
 <InfoLinha label="Quedas por rodada" valor={campeonato?.quedas_por_rodada ? `${campeonato.quedas_por_rodada}` : 'Não definido'} />
 <InfoLinha label="Total de quedas" valor={campeonato?.quantidade_quedas ? `${campeonato.quantidade_quedas}` : 'Não definido'} />
 <InfoLinha label="Rodadas" valor={campeonato?.quantidade_rodadas ? `${campeonato.quantidade_rodadas}` : 'Não definido'} />
 <InfoLinha label="Desempate" valor={campeonato?.criterio_desempate || 'Não definido'} />
 </div>
 </div>

 <div className=" border border-zinc-200 bg-white p-5">
 <div className="text-[11px] uppercase tracking-[0.28em] text-yellow-400 font-semibold">
 Operação e suporte
 </div>
 <div className="mt-4 space-y-3">
 <InfoLinha label="Premiação" valor={formatMoney(campeonato?.valor_premiacao)} />
 <InfoLinha label="Tipo da premiação" valor={campeonato?.tipo_premiacao || 'Não definido'} />
 <InfoLinha label="Premiação garantida" valor={campeonato?.premiacao_garantida ? 'Sim' : 'Não'} />
 <InfoLinha label="Check-in" valor={campeonato?.checkin_obrigatorio ? `Obrigatório${campeonato?.horario_checkin ? ` às ${formatTime(campeonato.horario_checkin)}` : ''}` : 'Não obrigatório'} />
 <InfoLinha label="Anti-cheat" valor={campeonato?.anti_cheat ? 'Ativo' : 'Não informado'} />
 <InfoLinha label="Discord" valor={campeonato?.discord_url || 'Não informado'} />
 <InfoLinha label="WhatsApp" valor={campeonato?.whatsapp_suporte || 'Não informado'} />
 <InfoLinha label="Responsável" valor={campeonato?.responsavel_nome || 'Não informado'} />
 </div>
 </div>
 </div>


 {modoAdmin && blocoFormAberto && (
 <div className=" border border-zinc-200 bg-white p-5">
 <div className="flex items-center justify-between gap-4">
 <div className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[#142340]">
 {blocoEditandoId ? 'Editar bloco' : 'Novo bloco'}
 </div>

 <button
 type="button"
 onClick={fecharFormBloco}
 className=" border border-zinc-200 p-2 text-zinc-600 hover:bg-white"
 >
 <X size={16} />
 </button>
 </div>

 <div className="mt-4 grid gap-4 md:grid-cols-2">
 <div>
 <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-600">
 Título
 </label>
 <input
 value={blocoForm.titulo}
 onChange={(e) =>
 setBlocoForm((prev) => ({
 ...prev,
 titulo: e.target.value,
 slug: prev.slug || slugify(e.target.value),
 }))
 }
 className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#142340] outline-none"
 placeholder="Ex: Estrutura do campeonato"
 />
 </div>

 <div>
 <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-600">
 Slug
 </label>
 <input
 value={blocoForm.slug}
 onChange={(e) =>
 setBlocoForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))
 }
 className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#142340] outline-none"
 placeholder="estrutura"
 />
 </div>

 <div className="md:col-span-2">
 <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-600">
 Descrição
 </label>
 <textarea
 value={blocoForm.descricao}
 onChange={(e) =>
 setBlocoForm((prev) => ({ ...prev, descricao: e.target.value }))
 }
 rows={3}
 className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#142340] outline-none"
 placeholder="Texto curto para ajudar o usuário"
 />
 </div>

 <div>
 <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-600">
 Cor
 </label>
 <div className="flex flex-wrap gap-2">
 {CORES_PADRAO.map((cor) => (
 <button
 key={cor}
 type="button"
 onClick={() => setBlocoForm((prev) => ({ ...prev, cor }))}
 className={classNames(
 'h-9 w-9 rounded-full border-2',
 blocoForm.cor === cor ? 'border-white' : 'border-zinc-200'
 )}
 style={{ backgroundColor: cor }}
 />
 ))}
 </div>
 </div>

 <div className="flex flex-col gap-3 justify-end">
 <label className="inline-flex items-center gap-2 text-sm text-zinc-600">
 <input
 type="checkbox"
 checked={blocoForm.aberto_por_padrao}
 onChange={(e) =>
 setBlocoForm((prev) => ({
 ...prev,
 aberto_por_padrao: e.target.checked,
 }))
 }
 />
 Abrir por padrão
 </label>

 <label className="inline-flex items-center gap-2 text-sm text-zinc-600">
 <input
 type="checkbox"
 checked={blocoForm.ativo}
 onChange={(e) =>
 setBlocoForm((prev) => ({ ...prev, ativo: e.target.checked }))
 }
 />
 Bloco ativo
 </label>
 </div>
 </div>

 <div className="mt-5 flex flex-wrap gap-2">
 <button
 type="button"
 onClick={salvarBloco}
 disabled={salvando}
 className="inline-flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/15 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-emerald-300 disabled:opacity-50"
 >
 <Save size={14} />
 {salvando ? 'Salvando...' : 'Salvar bloco'}
 </button>

 <button
 type="button"
 onClick={fecharFormBloco}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-600"
 >
 <X size={14} />
 Cancelar
 </button>
 </div>
 </div>
 )}

 {blocos.length === 0 && (
 <div className=" border border-zinc-200 bg-white p-6">
 <div className="text-sm text-zinc-600 font-semibold">Nenhuma regra cadastrada.</div>
 <div className="text-xs text-zinc-500 mt-2">
 Use o botão <strong>Criar bloco</strong> para começar.
 </div>
 </div>
 )}

 {blocos.map((bloco, blocoIndex) => {
 const aberto = !!abertos[bloco.id]
 const ultimoBloco = blocoIndex === blocos.length - 1

 return (
 <div
 key={bloco.id}
 className="overflow-hidden border border-zinc-200 bg-white"
 >
 <button
 type="button"
 onClick={() => toggleBloco(bloco.id)}
 className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left transition hover:bg-white"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div
 className="h-10 w-10 border border-zinc-200 flex items-center justify-center shrink-0"
 style={{
 backgroundColor: bloco.cor ? `${bloco.cor}22` : 'rgba(255,255,255,0.04)',
 color: bloco.cor || '#ffffff',
 }}
 >
 <IconeBloco slug={bloco.slug} />
 </div>

 <div className="min-w-0">
 <div className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[#142340] truncate">
 {bloco.titulo}
 </div>

 <div className="mt-1 flex flex-wrap items-center gap-2">
 {bloco.descricao && (
 <div className="text-[12px] text-zinc-600">{bloco.descricao}</div>
 )}
 {!bloco.ativo && (
 <span className="rounded-full border border-red-500/20 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-red-300">
 Inativo
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="shrink-0 text-zinc-600">
 {aberto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
 </div>
 </button>

 {modoAdmin && (
 <div className="border-t border-zinc-200 px-5 py-3 flex flex-wrap gap-2 bg-white">
 <button
 type="button"
 onClick={() => abrirCriacaoItem(bloco.id)}
 className="inline-flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/15 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-300"
 >
 <Plus size={13} />
 Novo item
 </button>

 <button
 type="button"
 onClick={() => abrirEdicaoBloco(bloco)}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142340]"
 >
 <Pencil size={13} />
 Editar bloco
 </button>

 <button
 type="button"
 onClick={() => moverBloco(bloco, 'up')}
 disabled={blocoIndex === 0 || salvando}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142340] disabled:opacity-40"
 >
 <GripVertical size={13} />
 Subir
 </button>

 <button
 type="button"
 onClick={() => moverBloco(bloco, 'down')}
 disabled={ultimoBloco || salvando}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142340] disabled:opacity-40"
 >
 <GripVertical size={13} />
 Descer
 </button>

 <button
 type="button"
 onClick={() => excluirBloco(bloco)}
 className="inline-flex items-center gap-2 border border-red-500/20 bg-red-500/15 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-red-300"
 >
 <Trash2 size={13} />
 Excluir bloco
 </button>
 </div>
 )}

 {aberto && (
 <div className="border-t border-zinc-200 px-5 py-4 space-y-3">
 {modoAdmin && itemFormAbertoEm === bloco.id && (
 <div className=" border border-zinc-200 bg-white p-4">
 <div className="flex items-center justify-between gap-4">
 <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#142340]">
 {itemEditandoId ? 'Editar item' : 'Novo item'}
 </div>

 <button
 type="button"
 onClick={fecharFormItem}
 className=" border border-zinc-200 p-2 text-zinc-600 hover:bg-white"
 >
 <X size={15} />
 </button>
 </div>

 <div className="mt-4 grid gap-4 md:grid-cols-2">
 <div>
 <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-600">
 Título
 </label>
 <input
 value={itemForm.titulo}
 onChange={(e) =>
 setItemForm((prev) => ({
 ...prev,
 titulo: e.target.value,
 slug: prev.slug || slugify(e.target.value),
 }))
 }
 className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#142340] outline-none"
 placeholder="Ex: Quantidade de fases"
 />
 </div>

 <div>
 <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-600">
 Slug
 </label>
 <input
 value={itemForm.slug}
 onChange={(e) =>
 setItemForm((prev) => ({
 ...prev,
 slug: slugify(e.target.value),
 }))
 }
 className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#142340] outline-none"
 placeholder="quantidade-fases"
 />
 </div>

 <div>
 <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-600">
 Tipo
 </label>
 <select
 value={itemForm.tipo}
 onChange={(e) =>
 setItemForm((prev) => ({
 ...prev,
 tipo: e.target.value as ItemForm['tipo'],
 }))
 }
 className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#142340] outline-none"
 >
 <option value="manual">Manual</option>
 <option value="dinamico_texto">Dinâmico texto</option>
 <option value="dinamico_lista">Dinâmico lista</option>
 <option value="dinamico_resumo">Dinâmico resumo</option>
 </select>
 </div>

 {itemForm.tipo !== 'manual' ? (
 <div>
 <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-600">
 Chave dinâmica
 </label>
 <select
 value={itemForm.chave_dinamica}
 onChange={(e) =>
 setItemForm((prev) => ({
 ...prev,
 chave_dinamica: e.target.value,
 }))
 }
 className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#142340] outline-none"
 >
 <option value="">Selecione</option>
 {CHAVES_DINAMICAS.map((chave) => (
 <option key={chave.value} value={chave.value}>
 {chave.label}
 </option>
 ))}
 </select>
 </div>
 ) : (
 <div className="md:col-span-2">
 <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-600">
 Conteúdo
 </label>
 <textarea
 value={itemForm.conteudo}
 onChange={(e) =>
 setItemForm((prev) => ({
 ...prev,
 conteudo: e.target.value,
 }))
 }
 rows={4}
 className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#142340] outline-none"
 placeholder="Digite a regra manual"
 />
 </div>
 )}

 <div className="md:col-span-2">
 <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-600">
 Observação
 </label>
 <textarea
 value={itemForm.observacao}
 onChange={(e) =>
 setItemForm((prev) => ({
 ...prev,
 observacao: e.target.value,
 }))
 }
 rows={2}
 className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#142340] outline-none"
 placeholder="Texto complementar opcional"
 />
 </div>

 <div className="flex flex-col gap-3 justify-end">
 <label className="inline-flex items-center gap-2 text-sm text-zinc-600">
 <input
 type="checkbox"
 checked={itemForm.destaque}
 onChange={(e) =>
 setItemForm((prev) => ({
 ...prev,
 destaque: e.target.checked,
 }))
 }
 />
 Item em destaque
 </label>

 <label className="inline-flex items-center gap-2 text-sm text-zinc-600">
 <input
 type="checkbox"
 checked={itemForm.ativo}
 onChange={(e) =>
 setItemForm((prev) => ({
 ...prev,
 ativo: e.target.checked,
 }))
 }
 />
 Item ativo
 </label>
 </div>
 </div>

 <div className="mt-5 flex flex-wrap gap-2">
 <button
 type="button"
 onClick={salvarItem}
 disabled={salvando}
 className="inline-flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/15 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-emerald-300 disabled:opacity-50"
 >
 <Save size={14} />
 {salvando ? 'Salvando...' : 'Salvar item'}
 </button>

 <button
 type="button"
 onClick={fecharFormItem}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-600"
 >
 <X size={14} />
 Cancelar
 </button>
 </div>
 </div>
 )}

 {bloco.itens.length === 0 ? (
 <div className="text-[13px] text-zinc-500">
 Nenhum item cadastrado neste bloco.
 </div>
 ) : (
 bloco.itens.map((item, itemIndex) => {
 const ultimoItem = itemIndex === bloco.itens.length - 1

 return (
 <div
 key={item.id}
 className={classNames(
 ' border p-4',
 item.destaque
 ? 'border-emerald-500/30 bg-emerald-500/8'
 : 'border-zinc-200 bg-white'
 )}
 >
 <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
 <div className="min-w-0 flex-1">
 <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-400">
 {item.titulo}
 </div>

 <div className="mt-2">{renderValorItem(item)}</div>

 {item.observacao && (
 <div className="mt-3 text-[12px] leading-5 text-zinc-500">
 {item.observacao}
 </div>
 )}
 </div>

 {modoAdmin && (
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={() => abrirEdicaoItem(item)}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142340]"
 >
 <Pencil size={13} />
 Editar
 </button>

 <button
 type="button"
 onClick={() => moverItem(item, 'up')}
 disabled={itemIndex === 0 || salvando}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142340] disabled:opacity-40"
 >
 <GripVertical size={13} />
 Subir
 </button>

 <button
 type="button"
 onClick={() => moverItem(item, 'down')}
 disabled={ultimoItem || salvando}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142340] disabled:opacity-40"
 >
 <GripVertical size={13} />
 Descer
 </button>

 <button
 type="button"
 onClick={() => excluirItem(item)}
 className="inline-flex items-center gap-2 border border-red-500/20 bg-red-500/15 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-red-300"
 >
 <Trash2 size={13} />
 Excluir
 </button>
 </div>
 )}
 </div>
 </div>
 )
 })
 )}

 {bloco.slug === 'estrutura' && grupos.length > 0 && (
 <div className=" border border-zinc-200 bg-white p-4">
 <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-cyan-400">
 Grupos por fase
 </div>

 <div className="mt-3 space-y-3">
 {fases.length > 0 ? (
 fases.map((fase) => {
 const gruposDaFase = gruposPorFase.get(fase.id) || []

 return (
 <div
 key={fase.id}
 className=" border border-zinc-200 bg-white p-3"
 >
 <div className="text-[12px] font-bold text-[#142340]">{fase.nome}</div>

 <div className="mt-2 flex flex-wrap gap-2">
 {gruposDaFase.length > 0 ? (
 gruposDaFase.map((grupo) => (
 <span
 key={grupo.id}
 className="px-2.5 py-1 rounded-full bg-white border border-zinc-200 text-[11px] text-zinc-600"
 >
 {grupo.nome}
 {grupo.quantidade_equipes
 ? ` • ${grupo.quantidade_equipes} equipes`
 : ''}
 </span>
 ))
 ) : (
 <span className="text-[12px] text-zinc-500">
 Nenhum grupo nesta fase
 </span>
 )}
 </div>
 </div>
 )
 })
 ) : (
 <div className="text-[12px] text-zinc-500">Nenhuma fase cadastrada.</div>
 )}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 )
 })}
 </div>
 )
}
