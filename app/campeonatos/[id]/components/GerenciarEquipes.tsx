'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
 X,
 Loader2,
 Trash2,
 Plus,
 Search,
 Users,
 RefreshCw,
 ArrowRightLeft,
 Shield,
 Upload,
 Image as ImageIcon,
 CalendarClock,
} from 'lucide-react'

type TipoFiltro = 'todas' | 'site' | 'organizador' | 'agendadas' | 'app' | 'avulsas'

type EquipeOficial = {
 id: string
 nome: string
 tag: string | null
 logo_url: string | null
}

type EquipeAvulsa = {
 id: string
 campeonato_id: string
 nome: string
 tag: string | null
 logo_url: string | null
 criada_por: string | null
 equipe_oficial_id: string | null
}

type InscricaoRow = {
 id: string
 campeonato_id: string
 equipe_id: string | null
 equipe_avulsa_id: string | null
 grupo_id: string | null
 seed: number | null
 status: string | null
 observacoes: string | null
 tipo_origem: string | null
 created_at?: string | null
 origem_inscricao?: string | null
 status_pagamento?: string | null
 agendada_para?: string | null
 valor_vaga_pago?: number | null
 registrado_por?: string | null
 nome_exibicao?: string | null
 numero_vaga?: number | null
 data_pagamento_confirmada?: string | null
}

type EquipeLista = {
 inscricao_id: string
 tipo_origem: 'app' | 'avulsa'
 equipe_id: string | null
 equipe_avulsa_id: string | null
 grupo_id: string | null
 seed: number | null
 status: string | null
 observacoes: string | null
 nome: string
 nome_exibicao: string
 repeticao_numero: number
 tag: string | null
 logo_url: string | null
 equipe_oficial_id_vinculada: string | null
 origem_inscricao: 'site' | 'organizador'
 status_pagamento: 'pago' | 'manual' | 'agendado' | 'gratuito' | string | null
 agendada_para: string | null
 valor_vaga_pago: number | null
 registrado_por: string | null
 numero_vaga: number | null
 data_pagamento_confirmada: string | null
}

const ORIGEM_OFICIAL_BANCO = 'oficial'
const ORIGEM_AVULSA_BANCO = 'avulsa'
const BUCKET_LOGOS = 'team-logos'

export default function GerenciarEquipes({ campeonatoId }: { campeonatoId: string }) {
 const [loading, setLoading] = useState(true)
 const [salvando, setSalvando] = useState(false)
 const [uploadingLogo, setUploadingLogo] = useState(false)

 const [equipes, setEquipes] = useState<EquipeLista[]>([])

 const [busca, setBusca] = useState('')
 const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todas')

 const [showModalNovaEquipe, setShowModalNovaEquipe] = useState(false)
 const [showModalTroca, setShowModalTroca] = useState(false)

 const [modoCadastro, setModoCadastro] = useState<'app' | 'avulsa'>('app')
 const [statusNovaVaga, setStatusNovaVaga] = useState<'ativa' | 'agendada'>('ativa')
 const [dataAgendamento, setDataAgendamento] = useState('')
 const [observacaoAgendamento, setObservacaoAgendamento] = useState('')

 const [buscaEquipeApp, setBuscaEquipeApp] = useState('')
 const [equipesAppEncontradas, setEquipesAppEncontradas] = useState<EquipeOficial[]>([])
 const [equipeAppSelecionada, setEquipeAppSelecionada] = useState<EquipeOficial | null>(null)

 const [nomeAvulsa, setNomeAvulsa] = useState('')
 const [tagAvulsa, setTagAvulsa] = useState('')
 const [logoAvulsa, setLogoAvulsa] = useState('')

 const [inscricaoTroca, setInscricaoTroca] = useState<EquipeLista | null>(null)
 const [buscaTroca, setBuscaTroca] = useState('')
 const [equipesTrocaEncontradas, setEquipesTrocaEncontradas] = useState<EquipeOficial[]>([])
 const [equipeTrocaSelecionada, setEquipeTrocaSelecionada] = useState<EquipeOficial | null>(null)

 const resetModalNovaEquipe = () => {
 setModoCadastro('app')
 setBuscaEquipeApp('')
 setEquipesAppEncontradas([])
 setEquipeAppSelecionada(null)
 setNomeAvulsa('')
 setTagAvulsa('')
 setLogoAvulsa('')
 setUploadingLogo(false)
 setStatusNovaVaga('ativa')
 setDataAgendamento('')
 setObservacaoAgendamento('')
 }

 const resetModalTroca = () => {
 setInscricaoTroca(null)
 setBuscaTroca('')
 setEquipesTrocaEncontradas([])
 setEquipeTrocaSelecionada(null)
 }

 const carregarEquipes = useCallback(async () => {
 setLoading(true)

 try {
 const { data: inscricoes, error: inscricoesError } = await supabase
 .from('campeonato_equipes')
 .select(
 `
 id,
 campeonato_id,
 equipe_id,
 equipe_avulsa_id,
 grupo_id,
 seed,
 status,
 observacoes,
 tipo_origem,
 created_at,
 origem_inscricao,
 status_pagamento,
 agendada_para,
 valor_vaga_pago,
 registrado_por,
 nome_exibicao,
 numero_vaga,
 data_pagamento_confirmada
 `
 )
 .eq('campeonato_id', campeonatoId)
 .order('created_at', { ascending: true })

 if (inscricoesError) throw inscricoesError

 const inscricoesRows = (inscricoes || []) as InscricaoRow[]

 const idsOficiais = inscricoesRows
 .map((item) => item.equipe_id)
 .filter((id): id is string => Boolean(id))

 const idsAvulsas = inscricoesRows
 .map((item) => item.equipe_avulsa_id)
 .filter((id): id is string => Boolean(id))

 let oficiais: EquipeOficial[] = []
 let avulsas: EquipeAvulsa[] = []

 if (idsOficiais.length > 0) {
 const { data: equipesData, error: equipesError } = await supabase
 .from('equipes')
 .select('id, nome, tag, logo_url')
 .in('id', idsOficiais)

 if (equipesError) throw equipesError
 oficiais = (equipesData || []) as EquipeOficial[]
 }

 if (idsAvulsas.length > 0) {
 const { data: avulsasData, error: avulsasError } = await supabase
 .from('equipes_avulsas_campeonato')
 .select('id, campeonato_id, nome, tag, logo_url, criada_por, equipe_oficial_id')
 .in('id', idsAvulsas)

 if (avulsasError) throw avulsasError
 avulsas = (avulsasData || []) as EquipeAvulsa[]
 }

 const mapaOficiais = new Map(oficiais.map((item) => [item.id, item]))
 const mapaAvulsas = new Map(avulsas.map((item) => [item.id, item]))

 const contadorRepeticoes = new Map<string, number>()

 const listaNormalizada: EquipeLista[] = inscricoesRows
 .map((item) => {
 const oficial = item.equipe_id ? mapaOficiais.get(item.equipe_id) : null
 const avulsa = item.equipe_avulsa_id ? mapaAvulsas.get(item.equipe_avulsa_id) : null

 const tipo: 'app' | 'avulsa' =
 item.tipo_origem === ORIGEM_AVULSA_BANCO || (!item.equipe_id && item.equipe_avulsa_id)
 ? 'avulsa'
 : 'app'

 const nome = oficial?.nome || avulsa?.nome || 'Equipe sem nome'
 const tag = oficial?.tag || avulsa?.tag || null
 const logo_url = oficial?.logo_url || avulsa?.logo_url || null
 const chaveRepeticao = oficial?.id ? `app:${oficial.id}` : avulsa?.equipe_oficial_id ? `app:${avulsa.equipe_oficial_id}` : `nome:${nome.trim().toLowerCase()}`
 const repeticao_numero = (contadorRepeticoes.get(chaveRepeticao) || 0) + 1
 contadorRepeticoes.set(chaveRepeticao, repeticao_numero)
 const sufixosRomanos = ['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
 const sufixo = repeticao_numero <= 10 ? sufixosRomanos[repeticao_numero] : String(repeticao_numero)
 const nome_exibicao_calculado = repeticao_numero > 1 ? `${nome} ${sufixo}` : nome
 const nome_exibicao = item.nome_exibicao || nome_exibicao_calculado

 return {
 inscricao_id: item.id,
 tipo_origem: tipo,
 equipe_id: item.equipe_id || null,
 equipe_avulsa_id: item.equipe_avulsa_id || null,
 grupo_id: item.grupo_id || null,
 seed: item.seed || null,
 status: item.status || null,
 observacoes: item.observacoes || null,
 nome,
 nome_exibicao,
 repeticao_numero,
 tag,
 logo_url,
 equipe_oficial_id_vinculada: avulsa?.equipe_oficial_id || null,
 origem_inscricao: item.origem_inscricao === 'site' ? 'site' : 'organizador',
 status_pagamento: item.status_pagamento || (item.origem_inscricao === 'site' ? 'pago' : 'manual'),
 agendada_para: item.agendada_para || null,
 valor_vaga_pago: item.valor_vaga_pago ?? null,
 registrado_por: item.registrado_por || null,
 numero_vaga: item.numero_vaga ?? repeticao_numero,
 data_pagamento_confirmada: item.data_pagamento_confirmada || null,
 }
 })
 .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.repeticao_numero - b.repeticao_numero)

 setEquipes(listaNormalizada)
 } catch (error) {
 console.error('Erro ao carregar equipes:', error)
 alert('Erro ao carregar equipes do campeonato.')
 } finally {
 setLoading(false)
 }
 }, [campeonatoId])

 useEffect(() => {
 carregarEquipes()
 }, [carregarEquipes])

 const equipesFiltradas = useMemo(() => {
 return equipes.filter((eq) => {
 const termo = busca.trim().toLowerCase()
 const matchBusca =
 termo.length === 0 ||
 eq.nome.toLowerCase().includes(termo) ||
 (eq.tag || '').toLowerCase().includes(termo)

 const matchTipo =
 tipoFiltro === 'todas'
 ? true
 : tipoFiltro === 'site'
 ? eq.origem_inscricao === 'site'
 : tipoFiltro === 'organizador'
 ? eq.origem_inscricao === 'organizador' && eq.status_pagamento !== 'agendado'
 : tipoFiltro === 'agendadas'
 ? eq.status_pagamento === 'agendado' || eq.status === 'agendada'
 : tipoFiltro === 'app'
 ? eq.tipo_origem === 'app'
 : eq.tipo_origem === 'avulsa'

 return matchBusca && matchTipo
 })
 }, [equipes, busca, tipoFiltro])

 const buscarEquipesDoApp = useCallback(
 async (termo: string, modo: 'cadastro' | 'troca') => {
 const texto = termo.trim()

 if (texto.length < 2) {
 if (modo === 'cadastro') setEquipesAppEncontradas([])
 else setEquipesTrocaEncontradas([])
 return
 }

 try {
 const { data, error } = await supabase
 .from('equipes')
 .select('id, nome, tag, logo_url')
 .or(`nome.ilike.%${texto}%,tag.ilike.%${texto}%`)
 .order('nome', { ascending: true })
 .limit(8)

 if (error) throw error

 if (modo === 'cadastro') {
 setEquipesAppEncontradas((data || []) as EquipeOficial[])
 } else {
 setEquipesTrocaEncontradas((data || []) as EquipeOficial[])
 }
 } catch (error) {
 console.error('Erro ao buscar equipes do app:', error)
 }
 },
 []
 )

 useEffect(() => {
 const timer = setTimeout(() => {
 buscarEquipesDoApp(buscaEquipeApp, 'cadastro')
 }, 250)

 return () => clearTimeout(timer)
 }, [buscaEquipeApp, buscarEquipesDoApp])

 useEffect(() => {
 const timer = setTimeout(() => {
 buscarEquipesDoApp(buscaTroca, 'troca')
 }, 250)

 return () => clearTimeout(timer)
 }, [buscaTroca, buscarEquipesDoApp])

 const handleUploadLogoAvulsa = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const input = e.target
 const file = input.files?.[0]
 if (!file || !campeonatoId) return

 setUploadingLogo(true)

 try {
 const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
 const fileName = `${campeonatoId}/avulsa_${Date.now()}.${ext}`

 const { error: uploadError } = await supabase.storage
 .from(BUCKET_LOGOS)
 .upload(fileName, file, {
 upsert: true,
 cacheControl: '3600',
 })

 if (uploadError) throw uploadError

 const {
 data: { publicUrl },
 } = supabase.storage.from(BUCKET_LOGOS).getPublicUrl(fileName)

 setLogoAvulsa(publicUrl)
 } catch (error: any) {
 console.error('Erro ao enviar logo da equipe avulsa:', error)
 alert(error?.message || 'Erro ao enviar a logo.')
 } finally {
 setUploadingLogo(false)
 if (input) {
 input.value = ''
 }
 }
 }

 const dadosControleVaga = async () => {
 const {
 data: { user },
 } = await supabase.auth.getUser()

 return {
 origem_inscricao: 'organizador',
 status_pagamento: statusNovaVaga === 'agendada' ? 'agendado' : 'manual',
 agendada_para: statusNovaVaga === 'agendada' && dataAgendamento ? dataAgendamento : null,
 registrado_por: user?.id || null,
 observacoes:
 statusNovaVaga === 'agendada'
 ? observacaoAgendamento.trim() || 'Vaga agendada pelo organizador'
 : observacaoAgendamento.trim() || 'Vaga adicionada pelo organizador',
 }
 }

 const adicionarEquipeDoApp = async () => {
 if (!equipeAppSelecionada) {
 alert('Selecione uma equipe do app.')
 return
 }

 setSalvando(true)

 try {
 if (statusNovaVaga === 'agendada' && !dataAgendamento) {
 throw new Error('Informe a data combinada para pagamento da vaga.')
 }

 const controle = await dadosControleVaga()

 const { error } = await supabase.rpc('fn_adicionar_vaga_organizador', {
 p_campeonato_id: campeonatoId,
 p_equipe_id: equipeAppSelecionada.id,
 p_equipe_avulsa_id: null,
 p_status_pagamento: controle.status_pagamento,
 p_agendada_para: controle.agendada_para,
 p_observacoes: controle.observacoes,
 })

 if (error) throw error

 setShowModalNovaEquipe(false)
 resetModalNovaEquipe()
 setBusca('')
 setTipoFiltro('todas')
 await carregarEquipes()
 } catch (error: any) {
 console.error('Erro ao adicionar equipe do app:', error)
 alert(error?.message || 'Erro ao adicionar equipe do app.')
 } finally {
 setSalvando(false)
 }
 }

 const adicionarEquipeAvulsa = async () => {
 const nome = nomeAvulsa.trim()
 const tag = tagAvulsa.trim().toUpperCase()

 if (!nome) {
 alert('Informe o nome da equipe temporária.')
 return
 }

 setSalvando(true)

 let avulsaCriadaId: string | null = null

 try {
 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user?.id) {
 throw new Error('Você precisa estar logado para criar equipe temporária.')
 }

 const { data: avulsaCriada, error: erroCriarAvulsa } = await supabase
 .from('equipes_avulsas_campeonato')
 .insert({
 campeonato_id: campeonatoId,
 nome,
 tag: tag || null,
 logo_url: logoAvulsa || null,
 criada_por: user.id,
 equipe_oficial_id: null,
 })
 .select('id')
 .single()

 if (erroCriarAvulsa) throw erroCriarAvulsa
 if (!avulsaCriada?.id) throw new Error('Não foi possível criar a equipe temporária.')

 avulsaCriadaId = avulsaCriada.id

 if (statusNovaVaga === 'agendada' && !dataAgendamento) {
 throw new Error('Informe a data combinada para pagamento da vaga.')
 }

 const controle = await dadosControleVaga()

 const { error: erroInscricao } = await supabase.rpc('fn_adicionar_vaga_organizador', {
 p_campeonato_id: campeonatoId,
 p_equipe_id: null,
 p_equipe_avulsa_id: avulsaCriada.id,
 p_status_pagamento: controle.status_pagamento,
 p_agendada_para: controle.agendada_para,
 p_observacoes: controle.observacoes,
 })

 if (erroInscricao) {
 await supabase.from('equipes_avulsas_campeonato').delete().eq('id', avulsaCriada.id)
 throw erroInscricao
 }

 setShowModalNovaEquipe(false)
 resetModalNovaEquipe()
 setBusca('')
 setTipoFiltro('todas')
 await carregarEquipes()
 } catch (error: any) {
 if (avulsaCriadaId) {
 console.error('Falha após criar avulsa, tentativa de rollback executada:', avulsaCriadaId)
 }
 console.error('Erro ao adicionar equipe avulsa:', error)
 alert(error?.message || 'Erro ao adicionar equipe temporária.')
 } finally {
 setSalvando(false)
 }
 }

 const handleSalvarNovaEquipe = async () => {
 if (salvando || uploadingLogo) return

 if (modoCadastro === 'app') {
 await adicionarEquipeDoApp()
 return
 }

 await adicionarEquipeAvulsa()
 }

 const handleRemoverEquipe = async (item: EquipeLista) => {
 const avisoGrupo = item.grupo_id
 ? '\n\nATENÇÃO: essa equipe está em um grupo/slot. Se confirmar, ela também será removida dos grupos e dos jogos ainda não jogados.'
 : ''

 const confirma = confirm(
 `Deseja remover ${item.nome_exibicao.toUpperCase()} deste campeonato?${avisoGrupo}\n\nNão será permitido remover se ela já tiver jogado ou tiver resultado salvo.`
 )
 if (!confirma) return

 setSalvando(true)

 try {
 const { error } = await supabase.rpc('fn_remover_equipe_campeonato', {
 p_campeonato_equipe_id: item.inscricao_id,
 })

 if (error) throw error

 await carregarEquipes()
 } catch (error: any) {
 console.error('Erro ao remover equipe:', error)
 alert(error?.message || 'Erro ao remover equipe. Se já tiver jogado, a remoção fica bloqueada.')
 } finally {
 setSalvando(false)
 }
 }


 const handleConfirmarPagamentoAgendado = async (item: EquipeLista) => {
 const confirma = confirm(
 `Confirmar pagamento da vaga ${item.nome_exibicao.toUpperCase()}?\n\nDepois disso ela passa de AGENDADA para PAGA/ATIVA.`
 )
 if (!confirma) return

 setSalvando(true)

 try {
 const { error } = await supabase.rpc('fn_confirmar_pagamento_vaga_agendada', {
 p_campeonato_equipe_id: item.inscricao_id,
 })

 if (error) throw error
 await carregarEquipes()
 } catch (error: any) {
 console.error('Erro ao confirmar pagamento:', error)
 alert(error?.message || 'Erro ao confirmar pagamento da vaga.')
 } finally {
 setSalvando(false)
 }
 }

 const handleCancelarVagaAgendada = async (item: EquipeLista) => {
 const confirma = confirm(
 `Cancelar a vaga agendada de ${item.nome_exibicao.toUpperCase()}?\n\nSe ela estiver em grupo/slot, também será removida. Não será permitido cancelar se já tiver jogado.`
 )
 if (!confirma) return

 setSalvando(true)

 try {
 const { error } = await supabase.rpc('fn_cancelar_vaga_agendada', {
 p_campeonato_equipe_id: item.inscricao_id,
 })

 if (error) throw error
 await carregarEquipes()
 } catch (error: any) {
 console.error('Erro ao cancelar vaga agendada:', error)
 alert(error?.message || 'Erro ao cancelar vaga agendada. Se já tiver jogado, o cancelamento fica bloqueado.')
 } finally {
 setSalvando(false)
 }
 }

 const abrirTrocaParaEquipeDoApp = (item: EquipeLista) => {
 setInscricaoTroca(item)
 setEquipeTrocaSelecionada(null)
 setBuscaTroca(item.nome)
 setShowModalTroca(true)
 }

 const handleTrocarAvulsaParaEquipeDoApp = async () => {
 if (!inscricaoTroca || !inscricaoTroca.equipe_avulsa_id) {
 alert('Nenhuma equipe avulsa selecionada para troca.')
 return
 }

 if (!equipeTrocaSelecionada) {
 alert('Selecione a equipe oficial do app.')
 return
 }

 setSalvando(true)

 try {
 const { error: erroAtualizarInscricao } = await supabase
 .from('campeonato_equipes')
 .update({
 equipe_id: equipeTrocaSelecionada.id,
 tipo_origem: ORIGEM_OFICIAL_BANCO,
 })
 .eq('id', inscricaoTroca.inscricao_id)

 if (erroAtualizarInscricao) throw erroAtualizarInscricao

 const { error: erroVincularHistorico } = await supabase
 .from('equipes_avulsas_campeonato')
 .update({
 equipe_oficial_id: equipeTrocaSelecionada.id,
 })
 .eq('id', inscricaoTroca.equipe_avulsa_id)

 if (erroVincularHistorico) throw erroVincularHistorico

 setShowModalTroca(false)
 resetModalTroca()
 setBusca('')
 setTipoFiltro('todas')
 await carregarEquipes()
 } catch (error: any) {
 console.error('Erro ao trocar equipe avulsa por equipe do app:', error)
 alert(error?.message || 'Erro ao trocar equipe.')
 } finally {
 setSalvando(false)
 }
 }

 return (
 <div className="space-y-5">
 <div className="border border-zinc-200 bg-white p-4 -[4px_4px_0px_0px_rgba(0,0,0,1)]">
 <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
 <div className="relative w-full lg:max-w-md">
 <Search
 size={14}
 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
 />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="BUSCAR..."
 className="h-11 w-full border border-zinc-200 bg-white pl-11 pr-4 text-[11px] font-semibold uppercase text-[#142340] outline-none placeholder:text-zinc-500"
 />
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <button
 onClick={() => setTipoFiltro('todas')}
 className={`px-4 py-2 text-[10px] font-semibold uppercase transition-all ${
 tipoFiltro === 'todas'
 ? 'bg-[#2563eb] text-[#142340] border border-zinc-200'
 : 'text-zinc-500'
 }`}
 >
 Todas
 </button>

 <button
 onClick={() => setTipoFiltro('site')}
 className={`px-4 py-2 text-[10px] font-semibold uppercase transition-all ${
 tipoFiltro === 'site'
 ? 'bg-[#2563eb] text-[#142340] border border-zinc-200'
 : 'text-zinc-500'
 }`}
 >
 Vendidas
 </button>

 <button
 onClick={() => setTipoFiltro('organizador')}
 className={`px-4 py-2 text-[10px] font-semibold uppercase transition-all ${
 tipoFiltro === 'organizador'
 ? 'bg-[#2563eb] text-[#142340] border border-zinc-200'
 : 'text-zinc-500'
 }`}
 >
 Organizador
 </button>

 <button
 onClick={() => setTipoFiltro('agendadas')}
 className={`px-4 py-2 text-[10px] font-semibold uppercase transition-all ${
 tipoFiltro === 'agendadas'
 ? 'bg-orange-400 text-[#142340] border border-zinc-200'
 : 'text-zinc-500'
 }`}
 >
 Agendadas
 </button>

 <button
 onClick={() => setTipoFiltro('app')}
 className={`px-4 py-2 text-[10px] font-semibold uppercase transition-all ${
 tipoFiltro === 'app'
 ? 'bg-[#2563eb] text-[#142340] border border-zinc-200'
 : 'text-zinc-500'
 }`}
 >
 App
 </button>

 <button
 onClick={() => setTipoFiltro('avulsas')}
 className={`px-4 py-2 text-[10px] font-semibold uppercase transition-all ${
 tipoFiltro === 'avulsas'
 ? 'bg-[#2563eb] text-[#142340] border border-zinc-200'
 : 'text-zinc-500'
 }`}
 >
 Avulsas
 </button>

 <button
 onClick={() => carregarEquipes()}
 className="flex h-11 items-center gap-2 border border-zinc-200 bg-white px-4 text-[10px] font-semibold uppercase text-[#142340]"
 >
 <RefreshCw size={14} />
 Atualizar
 </button>

 <button
 onClick={() => {
 resetModalNovaEquipe()
 setShowModalNovaEquipe(true)
 }}
 className="flex h-11 items-center gap-2 border border-zinc-200 bg-[#2563eb] px-4 text-[10px] font-semibold uppercase text-[#142340] -[3px_3px_0px_0px_rgba(0,0,0,1)]"
 >
 <Plus size={14} />
 Nova equipe
 </button>
 </div>
 </div>
 </div>

 <div className="overflow-hidden border border-zinc-200 bg-white -[4px_4px_0px_0px_rgba(0,0,0,1)]">
 <div className="grid grid-cols-[minmax(240px,1.6fr)_130px_150px_150px_180px] items-center border-b-2 border-zinc-200 bg-[#f4f4f4] px-4 py-3 text-[10px] font-semibold uppercase text-[#142340]">
 <div>Equipe</div>
 <div>Origem</div>
 <div>Entrada</div>
 <div>Status</div>
 <div className="text-right">Ações</div>
 </div>

 {loading ? (
 <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
 <Loader2 size={26} className="animate-spin text-[#142340]" />
 <span className="text-[10px] font-semibold uppercase text-zinc-500">
 Carregando equipes...
 </span>
 </div>
 ) : equipesFiltradas.length === 0 ? (
 <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
 <Users size={26} className="text-zinc-500" />
 <span className="text-[10px] font-semibold uppercase text-zinc-500">
 Nenhuma equipe encontrada.
 </span>
 </div>
 ) : (
 <div>
 {equipesFiltradas.map((item) => {
 const podeTrocar = item.tipo_origem === 'avulsa'
 const podeRemover = true

 return (
 <div
 key={item.inscricao_id}
 className="grid grid-cols-[minmax(240px,1.6fr)_130px_150px_150px_180px] items-center border-b border-zinc-200 px-4 py-3 last:border-b-0"
 >
 <div className="flex items-center gap-3 overflow-hidden">
 <div className="h-12 w-12 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
 {item.logo_url ? (
 <img
 src={item.logo_url}
 alt={item.nome_exibicao}
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center bg-zinc-200 text-[11px] font-semibold uppercase text-zinc-600">
 {(item.tag || item.nome_exibicao || 'EQ').slice(0, 3)}
 </div>
 )}
 </div>

 <div className="min-w-0">
 <p className="truncate text-[12px] font-semibold uppercase text-[#142340]">
 {item.nome_exibicao}
 </p>

 <div className="mt-1 flex flex-wrap items-center gap-2">
 {item.numero_vaga && item.numero_vaga > 1 ? (
 <span className="border border-zinc-200 bg-[#2563eb] px-2 py-0.5 text-[9px] font-semibold uppercase text-[#142340]">
 Vaga {item.numero_vaga}
 </span>
 ) : null}

 {item.tag && (
 <span className="border border-zinc-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase text-[#2563eb]">
 {item.tag}
 </span>
 )}

 {item.seed ? (
 <span className="text-[9px] font-semibold uppercase text-zinc-500">
 Seed {item.seed}
 </span>
 ) : null}

 {item.equipe_oficial_id_vinculada && item.tipo_origem === 'avulsa' ? (
 <span className="text-[9px] font-semibold uppercase text-emerald-600">
 Já vinculada a equipe do app
 </span>
 ) : null}
 </div>
 </div>
 </div>

 <div>
 <span
 className={`inline-flex items-center border border-zinc-200 px-2 py-1 text-[9px] font-semibold uppercase ${
 item.tipo_origem === 'app'
 ? 'bg-[#2563eb] text-[#142340]'
 : 'bg-orange-400 text-[#142340]'
 }`}
 >
 {item.tipo_origem === 'app' ? 'Equipe do app' : 'Temporária'}
 </span>
 </div>

 <div className="space-y-1">
 <span
 className={`inline-flex items-center border border-zinc-200 px-2 py-1 text-[9px] font-semibold uppercase ${
 item.origem_inscricao === 'site'
 ? 'bg-[#2563eb] text-[#142340]'
 : item.status_pagamento === 'agendado' || item.status === 'agendada'
 ? 'bg-orange-400 text-[#142340]'
 : 'bg-white text-[#142340]'
 }`}
 >
 {item.origem_inscricao === 'site'
 ? 'Vendida no site'
 : item.status_pagamento === 'agendado' || item.status === 'agendada'
 ? 'Agendada'
 : 'Adicionada pelo dono'}
 </span>
 {item.agendada_para ? (
 <div className="flex items-center gap-1 text-[9px] font-semibold uppercase text-zinc-500">
 <CalendarClock size={11} />
 Pagar em {new Date(`${item.agendada_para}T00:00:00`).toLocaleDateString('pt-BR')}
 </div>
 ) : null}
 </div>

 <div>
 <span className="text-[10px] font-semibold uppercase text-slate-600">
 {item.status_pagamento === 'agendado' || item.status === 'agendada'
 ? 'agendada'
 : item.status || 'ativa'}
 </span>
 </div>

 <div className="flex items-center justify-end gap-2">
 {podeTrocar && (
 <button
 onClick={() => abrirTrocaParaEquipeDoApp(item)}
 className="inline-flex h-9 items-center gap-2 border border-zinc-200 bg-white px-3 text-[9px] font-semibold uppercase text-[#142340]"
 >
 <ArrowRightLeft size={13} />
 Trocar
 </button>
 )}

 {(item.status_pagamento === 'agendado' || item.status === 'agendada') && (
 <>
 <button
 onClick={() => handleConfirmarPagamentoAgendado(item)}
 disabled={salvando}
 className="inline-flex h-9 items-center gap-2 border border-zinc-200 bg-[#2563eb] px-3 text-[9px] font-semibold uppercase text-[#142340]"
 >
 Confirmar
 </button>

 <button
 onClick={() => handleCancelarVagaAgendada(item)}
 disabled={salvando}
 className="inline-flex h-9 items-center gap-2 border border-zinc-200 bg-orange-400 px-3 text-[9px] font-semibold uppercase text-[#142340]"
 >
 Cancelar
 </button>
 </>
 )}

 <button
 onClick={() => handleRemoverEquipe(item)}
 disabled={!podeRemover || salvando}
 className={`inline-flex h-9 items-center gap-2 border border-zinc-200 px-3 text-[9px] font-semibold uppercase ${
 podeRemover && !salvando
 ? 'bg-red-500 text-[#142340]'
 : 'cursor-not-allowed bg-zinc-200 text-zinc-500'
 }`}
 title={
 item.grupo_id
 ? 'Remover equipe também dos grupos, se ainda não jogou.'
 : 'Remover equipe'
 }
 >
 <Trash2 size={13} />
 Remover
 </button>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>

 <div className="text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
 Exibindo {equipesFiltradas.length} de {equipes.length} equipes carregadas
 </div>

 {showModalNovaEquipe && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 p-4">
 <div className="w-full max-w-3xl border border-zinc-200 bg-white -[6px_6px_0px_0px_rgba(0,0,0,1)]">
 <div className="flex items-center justify-between border-b-2 border-zinc-200 bg-white px-5 py-4">
 <div>
 <h3 className="text-sm font-semibold uppercase text-[#2563eb]">
 Adicionar nova equipe
 </h3>
 <p className="mt-1 text-[10px] font-semibold uppercase text-zinc-500">
 Escolha entre equipe do app ou equipe temporária
 </p>
 </div>

 <button
 onClick={() => {
 setShowModalNovaEquipe(false)
 resetModalNovaEquipe()
 }}
 className="text-[#142340]"
 >
 <X size={18} />
 </button>
 </div>

 <div className="space-y-5 p-5">
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => setModoCadastro('app')}
 className={`px-4 py-2 text-[10px] font-semibold uppercase ${
 modoCadastro === 'app'
 ? 'border border-zinc-200 bg-[#2563eb] text-[#142340]'
 : 'border border-zinc-200 bg-white text-zinc-500'
 }`}
 >
 Equipe do app
 </button>

 <button
 onClick={() => setModoCadastro('avulsa')}
 className={`px-4 py-2 text-[10px] font-semibold uppercase ${
 modoCadastro === 'avulsa'
 ? 'border border-zinc-200 bg-orange-400 text-[#142340]'
 : 'border border-zinc-200 bg-white text-zinc-500'
 }`}
 >
 Equipe temporária
 </button>
 </div>

 <div className="grid grid-cols-1 gap-4 border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-3">
 <div>
 <label className="mb-2 block text-[10px] font-semibold uppercase text-zinc-500">
 Tipo da vaga
 </label>
 <select
 value={statusNovaVaga}
 onChange={(e) => setStatusNovaVaga(e.target.value as 'ativa' | 'agendada')}
 className="h-11 w-full border border-zinc-200 bg-white px-3 text-[11px] font-semibold uppercase outline-none"
 >
 <option value="ativa">Adicionar agora</option>
 <option value="agendada">Agendar pagamento</option>
 </select>
 </div>

 <div>
 <label className="mb-2 block text-[10px] font-semibold uppercase text-zinc-500">
 Data combinada
 </label>
 <input
 type="date"
 value={dataAgendamento}
 onChange={(e) => setDataAgendamento(e.target.value)}
 disabled={statusNovaVaga !== 'agendada'}
 className="h-11 w-full border border-zinc-200 bg-white px-3 text-[11px] font-semibold uppercase outline-none disabled:bg-zinc-200 disabled:text-zinc-500"
 />
 </div>

 <div>
 <label className="mb-2 block text-[10px] font-semibold uppercase text-zinc-500">
 Observação
 </label>
 <input
 value={observacaoAgendamento}
 onChange={(e) => setObservacaoAgendamento(e.target.value)}
 placeholder="Ex: paga dia 10"
 className="h-11 w-full border border-zinc-200 bg-white px-3 text-[11px] font-semibold uppercase outline-none"
 />
 </div>
 </div>

 {modoCadastro === 'app' ? (
 <div className="space-y-4">
 <div>
 <label className="mb-2 block text-[10px] font-semibold uppercase text-zinc-500">
 Buscar equipe no app
 </label>
 <div className="relative">
 <Search
 size={14}
 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
 />
 <input
 value={buscaEquipeApp}
 onChange={(e) => setBuscaEquipeApp(e.target.value)}
 placeholder="Digite nome ou tag..."
 className="h-11 w-full border border-zinc-200 bg-white pl-11 pr-4 text-[11px] font-semibold uppercase text-[#142340] outline-none"
 />
 </div>
 </div>

 <div className="max-h-72 overflow-auto border border-zinc-200">
 {equipesAppEncontradas.length === 0 ? (
 <div className="p-6 text-center text-[10px] font-semibold uppercase text-zinc-500">
 Digite pelo menos 2 letras para pesquisar.
 </div>
 ) : (
 equipesAppEncontradas.map((eq) => {
 const selecionada = equipeAppSelecionada?.id === eq.id
 const vezesInscrita = equipes.filter((item) => item.equipe_id === eq.id).length

 return (
 <button
 key={eq.id}
 type="button"
 onClick={() => setEquipeAppSelecionada(eq)}
 className={`flex w-full items-center justify-between border-b border-zinc-200 px-4 py-3 text-left last:border-b-0 ${
 selecionada ? 'bg-[#ecffcf]' : 'bg-white'
 } hover:bg-zinc-50`}
 >
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 overflow-hidden border border-zinc-200 bg-zinc-100">
 {eq.logo_url ? (
 <img
 src={eq.logo_url}
 alt={eq.nome}
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center bg-zinc-200 text-[10px] font-semibold uppercase text-zinc-600">
 {(eq.tag || eq.nome || 'EQ').slice(0, 3)}
 </div>
 )}
 </div>
 <div>
 <p className="text-[11px] font-semibold uppercase text-[#142340]">
 {eq.nome}
 </p>
 <p className="text-[9px] font-semibold uppercase text-zinc-500">
 {eq.tag || 'sem tag'}
 </p>
 </div>
 </div>

 <div className="text-[9px] font-semibold uppercase text-zinc-500">
 {selecionada ? 'Selecionada' : vezesInscrita > 0 ? `Adicionar de novo (${vezesInscrita + 1}ª vaga)` : 'Selecionar'}
 </div>
 </button>
 )
 })
 )}
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
 <div className="md:col-span-2">
 <label className="mb-2 block text-[10px] font-semibold uppercase text-zinc-500">
 Nome da equipe temporária
 </label>
 <input
 value={nomeAvulsa}
 onChange={(e) => setNomeAvulsa(e.target.value)}
 placeholder="Ex: RED WAVE"
 className="h-11 w-full border border-zinc-200 px-4 text-[11px] font-semibold uppercase outline-none"
 />
 </div>

 <div>
 <label className="mb-2 block text-[10px] font-semibold uppercase text-zinc-500">
 Tag
 </label>
 <input
 value={tagAvulsa}
 onChange={(e) => setTagAvulsa(e.target.value)}
 placeholder="Ex: RW"
 className="h-11 w-full border border-zinc-200 px-4 text-[11px] font-semibold uppercase outline-none"
 />
 </div>

 <div>
 <label className="mb-2 block text-[10px] font-semibold uppercase text-zinc-500">
 Logo da equipe
 </label>

 <div className="flex flex-col gap-3">
 <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[10px] font-semibold uppercase text-[#142340]">
 {uploadingLogo ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Upload size={14} />
 )}
 {uploadingLogo ? 'Enviando logo...' : 'Enviar logo'}
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={handleUploadLogoAvulsa}
 disabled={uploadingLogo}
 />
 </label>

 {logoAvulsa ? (
 <div className="flex items-center gap-3 rounded border border-zinc-200 bg-zinc-50 p-3">
 <img
 src={logoAvulsa}
 alt="Logo enviada"
 className="h-16 w-16 border border-zinc-200 object-cover"
 />
 <div className="min-w-0">
 <p className="text-[10px] font-semibold uppercase text-emerald-700">
 Logo carregada com sucesso
 </p>
 <p className="truncate text-[9px] font-bold text-zinc-500">
 {logoAvulsa}
 </p>
 </div>
 </div>
 ) : (
 <div className="flex h-24 items-center justify-center rounded border-2 border-dashed border-zinc-300 bg-zinc-50 text-[10px] font-semibold uppercase text-zinc-500">
 <div className="flex items-center gap-2">
 <ImageIcon size={14} />
 Nenhuma logo enviada
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>

 <div className="flex items-center justify-end gap-3 border-t-2 border-zinc-200 p-5">
 <button
 onClick={() => {
 setShowModalNovaEquipe(false)
 resetModalNovaEquipe()
 }}
 className="h-11 border border-zinc-200 px-4 text-[10px] font-semibold uppercase text-[#142340]"
 >
 Cancelar
 </button>

 <button
 onClick={handleSalvarNovaEquipe}
 disabled={salvando || uploadingLogo}
 className="inline-flex h-11 items-center gap-2 border border-zinc-200 bg-[#2563eb] px-5 text-[10px] font-semibold uppercase text-[#142340] -[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-60"
 >
 {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
 {statusNovaVaga === 'agendada' ? 'Agendar vaga' : 'Salvar equipe'}
 </button>
 </div>
 </div>
 </div>
 )}

 {showModalTroca && inscricaoTroca && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 p-4">
 <div className="w-full max-w-3xl border border-zinc-200 bg-white -[6px_6px_0px_0px_rgba(0,0,0,1)]">
 <div className="flex items-center justify-between border-b-2 border-zinc-200 bg-white px-5 py-4">
 <div>
 <h3 className="text-sm font-semibold uppercase text-[#2563eb]">
 Trocar equipe temporária
 </h3>
 <p className="mt-1 text-[10px] font-semibold uppercase text-zinc-500">
 Trocar {inscricaoTroca.nome} por uma equipe oficial do app
 </p>
 </div>

 <button
 onClick={() => {
 setShowModalTroca(false)
 resetModalTroca()
 }}
 className="text-[#142340]"
 >
 <X size={18} />
 </button>
 </div>

 <div className="space-y-4 p-5">
 <div className="rounded border border-zinc-200 bg-[#fff8e8] p-4">
 <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-[#142340]">
 <Shield size={14} />
 Equipe atual: {inscricaoTroca.nome}
 </div>
 </div>

 <div>
 <label className="mb-2 block text-[10px] font-semibold uppercase text-zinc-500">
 Buscar equipe oficial do app
 </label>
 <div className="relative">
 <Search
 size={14}
 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
 />
 <input
 value={buscaTroca}
 onChange={(e) => setBuscaTroca(e.target.value)}
 placeholder="Digite nome ou tag..."
 className="h-11 w-full border border-zinc-200 bg-white pl-11 pr-4 text-[11px] font-semibold uppercase text-[#142340] outline-none"
 />
 </div>
 </div>

 <div className="max-h-72 overflow-auto border border-zinc-200">
 {equipesTrocaEncontradas.length === 0 ? (
 <div className="p-6 text-center text-[10px] font-semibold uppercase text-zinc-500">
 Digite pelo menos 2 letras para pesquisar.
 </div>
 ) : (
 equipesTrocaEncontradas.map((eq) => {
 const selecionada = equipeTrocaSelecionada?.id === eq.id
 const jaInscrita = equipes.some(
 (item) =>
 item.inscricao_id !== inscricaoTroca.inscricao_id && item.equipe_id === eq.id
 )

 return (
 <button
 key={eq.id}
 type="button"
 onClick={() => !jaInscrita && setEquipeTrocaSelecionada(eq)}
 className={`flex w-full items-center justify-between border-b border-zinc-200 px-4 py-3 text-left last:border-b-0 ${
 selecionada ? 'bg-[#ecffcf]' : 'bg-white'
 } ${jaInscrita ? 'cursor-not-allowed opacity-50' : 'hover:bg-zinc-50'}`}
 >
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 overflow-hidden border border-zinc-200 bg-zinc-100">
 {eq.logo_url ? (
 <img
 src={eq.logo_url}
 alt={eq.nome}
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center bg-zinc-200 text-[10px] font-semibold uppercase text-zinc-600">
 {(eq.tag || eq.nome || 'EQ').slice(0, 3)}
 </div>
 )}
 </div>
 <div>
 <p className="text-[11px] font-semibold uppercase text-[#142340]">
 {eq.nome}
 </p>
 <p className="text-[9px] font-semibold uppercase text-zinc-500">
 {eq.tag || 'sem tag'}
 </p>
 </div>
 </div>

 <div className="text-[9px] font-semibold uppercase text-zinc-500">
 {jaInscrita ? 'Já inscrita' : selecionada ? 'Selecionada' : 'Selecionar'}
 </div>
 </button>
 )
 })
 )}
 </div>
 </div>

 <div className="flex items-center justify-end gap-3 border-t-2 border-zinc-200 p-5">
 <button
 onClick={() => {
 setShowModalTroca(false)
 resetModalTroca()
 }}
 className="h-11 border border-zinc-200 px-4 text-[10px] font-semibold uppercase text-[#142340]"
 >
 Cancelar
 </button>

 <button
 onClick={handleTrocarAvulsaParaEquipeDoApp}
 disabled={salvando}
 className="inline-flex h-11 items-center gap-2 border border-zinc-200 bg-[#2563eb] px-5 text-[10px] font-semibold uppercase text-[#142340] -[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-60"
 >
 {salvando ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <ArrowRightLeft size={14} />
 )}
 Confirmar troca
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}