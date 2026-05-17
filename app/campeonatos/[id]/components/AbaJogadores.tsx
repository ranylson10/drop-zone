'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  UserPlus,
  Users,
  Shield,
  Zap,
  Bomb,
  Crosshair,
  Target,
  Search,
  UserCog,
  Trash2,
  ChevronRight,
  ChevronDown,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  ExternalLink,
  Plus,
  Upload,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react'
import MessageShortcut from '@/app/components/chat/MessageShortcut'
import { toast } from 'react-hot-toast'

interface AbaJogadoresProps {
  campeonatoId: string
  canEdit?: boolean
}

type OrigemJogador = 'app' | 'avulso' | 'sumula'

type EquipeBase = {
  inscricao_id: string
  id: string
  nome: string
  tag: string | null
  logo_url: string | null
  codigo_publico?: number | string | null
  tipo_origem: 'app' | 'avulsa'
  grupo_id: string | null
  grupo_nome?: string | null
  status: string | null
  line_id?: string | null
}

type JogadorCampeonato = {
  id: string
  campeonato_id: string
  campeonato_equipe_id: string | null
  equipe_id: string | null
  equipe_avulsa_id: string | null
  perfil_jogo_id: string | null
  jogador_avulso_id: string | null
  origem: OrigemJogador
  status: string | null
  criado_automaticamente: boolean | null
  observacoes: string | null
  created_at?: string | null
}

type JogadorAvulsoCampeonato = {
  id: string
  campeonato_id: string
  equipe_id: string | null
  equipe_avulsa_id: string | null
  nick: string
  uid_jogo: string
  funcao: string | null
  foto_url: string | null
  criado_por: string | null
}

type PerfilJogo = {
  id: string
  nick: string | null
  uid_jogo: string | null
  foto_capa: string | null
  funcao: string | null
  equipe_id: string | null
  user_id: string | null
  ativo: boolean | null
}

type EquipeComJogadores = {
  inscricao_id: string
  id: string
  nome: string
  tag: string | null
  logo_url: string | null
  codigo_publico?: number | string | null
  grupo: string
  status: string | null
  tipo_origem: 'app' | 'avulsa'
  jogadores: JogadorFormatado[]
  line_id?: string | null
}

type JogadorFormatado = JogadorCampeonato & {
  nome: string
  nick: string | null
  game_id: string | null
  funcao: string | null
  avatar_url: string | null
  equipe_nome: string
  equipe_tag: string | null
  equipe_tipo_origem: 'app' | 'avulsa' | null
  nome_exibicao: string
  uid_jogo_exibicao: string | null
  foto_exibicao: string | null
  funcao_exibicao: string | null
  line_id?: string | null
  line_jogador_id?: string | null
}

const BUCKET_AVATAR_JOGADOR = 'avatars'

function PainelSemPermissaoJogadores() {
  return (
    <div className="border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Edição de jogadores bloqueada</div>
      <p className="mt-2 leading-6">A aba fica disponível, mas adicionar, trocar ou remover jogadores é permitido apenas para o dono do campeonato ou ajudantes autorizados.</p>
    </div>
  )
}

export default function AbaJogadores({ campeonatoId, canEdit = false }: AbaJogadoresProps) {
  const [view, setView] = useState<'equipes' | 'geral'>('equipes')
  const [filtroGrupo, setFiltroGrupo] = useState('TODOS')
  const [filtroOrigem, setFiltroOrigem] = useState<'todas' | OrigemJogador>('todas')

  const [equipesInscritas, setEquipesInscritas] = useState<EquipeComJogadores[]>([])
  const [listaGeralJogadores, setListaGeralJogadores] = useState<JogadorFormatado[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [equipeAberta, setEquipeAberta] = useState<string | null>(null)

  const [showRecrutamentoModal, setShowRecrutamentoModal] = useState(false)
  const [metodoRecrutamento, setMetodoRecrutamento] = useState<'pesquisar' | 'criar_avulso' | null>(null)
  const [equipeAlvoInscricaoId, setEquipeAlvoInscricaoId] = useState<string | undefined>(undefined)
  const [equipeAlvoId, setEquipeAlvoId] = useState<string | undefined>(undefined)
  const [equipeAlvoAvulsaId, setEquipeAlvoAvulsaId] = useState<string | undefined>(undefined)

  const [resultadosBusca, setResultadosBusca] = useState<PerfilJogo[]>([])
  const [buscandoPerfis, setBuscandoPerfis] = useState(false)
  const [termoBuscaPerfil, setTermoBuscaPerfil] = useState('')
  const [salvandoNovoAvulso, setSalvandoNovoAvulso] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [novoNick, setNovoNick] = useState('')
  const [novoGameId, setNovoGameId] = useState('')
  const [novaFuncao, setNovaFuncao] = useState('SUPORTE')
  const [novoAvatarUrl, setNovoAvatarUrl] = useState('')

  const [showTrocaModal, setShowTrocaModal] = useState(false)
  const [jogadorParaTroca, setJogadorParaTroca] = useState<JogadorFormatado | null>(null)
  const [buscaTroca, setBuscaTroca] = useState('')
  const [resultadosTroca, setResultadosTroca] = useState<PerfilJogo[]>([])
  const [buscandoTroca, setBuscandoTroca] = useState(false)
  const [perfilTrocaSelecionado, setPerfilTrocaSelecionado] = useState<PerfilJogo | null>(null)
  const [salvandoTroca, setSalvandoTroca] = useState(false)

  const getFuncaoStyles = (funcao: string | null | undefined) => {
    const f = funcao?.toUpperCase()
    switch (f) {
      case 'SNIPER':
        return { icon: <Crosshair size={10} />, color: 'text-cyan-600' }
      case 'RUSH':
        return { icon: <Zap size={10} />, color: 'text-yellow-600' }
      case 'GRANADEIRO':
        return { icon: <Bomb size={10} />, color: 'text-red-600' }
      case 'SUPORTE':
        return { icon: <Shield size={10} />, color: 'text-blue-600' }
      default:
        return { icon: <Target size={10} />, color: 'text-slate-400' }
    }
  }

  const getOrigemLabel = (origem: OrigemJogador) => {
    if (origem === 'app') return 'APP'
    if (origem === 'sumula') return 'SÚMULA'
    return 'AVULSO'
  }

  const getOrigemStyle = (origem: OrigemJogador) => {
    if (origem === 'app') return 'bg-[#7cfc00] text-black'
    if (origem === 'sumula') return 'bg-orange-400 text-black'
    return 'bg-slate-200 text-slate-700'
  }

  const resetModal = () => {
    setShowRecrutamentoModal(false)
    setMetodoRecrutamento(null)
    setEquipeAlvoInscricaoId(undefined)
    setEquipeAlvoId(undefined)
    setEquipeAlvoAvulsaId(undefined)
    setResultadosBusca([])
    setBuscandoPerfis(false)
    setTermoBuscaPerfil('')
    setNovoNick('')
    setNovoGameId('')
    setNovaFuncao('SUPORTE')
    setNovoAvatarUrl('')
    setSalvandoNovoAvulso(false)
    setUploadingAvatar(false)
  }

  const resetTrocaModal = () => {
    setShowTrocaModal(false)
    setJogadorParaTroca(null)
    setBuscaTroca('')
    setResultadosTroca([])
    setBuscandoTroca(false)
    setPerfilTrocaSelecionado(null)
    setSalvandoTroca(false)
  }

  const carregarDados = useCallback(async () => {
    if (!campeonatoId) return
    setLoading(true)

    try {
      const { data: inscricoes, error: inscricoesError } = await supabase
        .from('campeonato_equipes')
        .select(`
          id,
          equipe_id,
          equipe_avulsa_id,
          grupo_id,
          status,
          tipo_origem,
          nome_exibicao,
          numero_vaga,
          line_id
        `)
        .eq('campeonato_id', campeonatoId)
        .order('numero_vaga', { ascending: true })

      if (inscricoesError) throw inscricoesError

      const inscricoesRows = inscricoes || []
      const idsEquipesOficiais = inscricoesRows.map((i: any) => i.equipe_id).filter(Boolean)
      const idsEquipesAvulsas = inscricoesRows.map((i: any) => i.equipe_avulsa_id).filter(Boolean)
      const lineIds = inscricoesRows.map((i: any) => i.line_id).filter(Boolean)

      const [
        { data: baseEquipes, error: baseEquipesError },
        { data: baseEquipesAvulsas, error: baseAvulsasError },
        { data: gruposCampeonato, error: gruposCampeonatoError },
        { data: linesJogadores, error: linesJogadoresError },
        { data: jogadoresCampeonato, error: jogadoresCampeonatoError },
      ] = await Promise.all([
        idsEquipesOficiais.length > 0
          ? supabase.from('equipes').select('id, nome, tag, logo_url, codigo_publico').in('id', idsEquipesOficiais)
          : Promise.resolve({ data: [], error: null }),
        idsEquipesAvulsas.length > 0
          ? supabase.from('equipes_avulsas_campeonato').select('id, nome, tag, logo_url').in('id', idsEquipesAvulsas)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('campeonato_grupos')
          .select('id, nome')
          .eq('campeonato_id', campeonatoId),
        lineIds.length > 0
          ? supabase
              .from('lines_jogadores')
              .select('id,line_id,perfil_jogo_id,jogador_avulso_id,tipo_slot,ordem,funcao_line,created_at')
              .in('line_id', lineIds)
              .order('ordem', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('jogadores_campeonato')
          .select(`
            id,
            campeonato_id,
            campeonato_equipe_id,
            equipe_id,
            equipe_avulsa_id,
            perfil_jogo_id,
            jogador_avulso_id,
            origem,
            status,
            criado_automaticamente,
            observacoes,
            created_at
          `)
          .eq('campeonato_id', campeonatoId)
          .eq('status', 'ativo'),
      ])

      if (baseEquipesError) throw baseEquipesError
      if (baseAvulsasError) throw baseAvulsasError
      if (gruposCampeonatoError) throw gruposCampeonatoError
      if (linesJogadoresError) throw linesJogadoresError
      if (jogadoresCampeonatoError) throw jogadoresCampeonatoError

      const lineRows = (linesJogadores || []) as any[]
      const jogadoresRows = (jogadoresCampeonato || []) as JogadorCampeonato[]

      const perfilIds = Array.from(new Set([
        ...lineRows.map((j) => j.perfil_jogo_id).filter(Boolean),
        ...jogadoresRows.map((j) => j.perfil_jogo_id).filter(Boolean),
      ])) as string[]

      const jogadorAvulsoIds = Array.from(new Set([
        ...lineRows.map((j) => j.jogador_avulso_id).filter(Boolean),
        ...jogadoresRows.map((j) => j.jogador_avulso_id).filter(Boolean),
      ])) as string[]

      const [
        { data: perfisData, error: perfisError },
        { data: avulsosData, error: avulsosError },
      ] = await Promise.all([
        perfilIds.length > 0
          ? supabase.from('perfis_jogo').select('id, nick, uid_jogo, foto_capa, funcao, equipe_id, user_id, ativo').in('id', perfilIds)
          : Promise.resolve({ data: [], error: null }),
        jogadorAvulsoIds.length > 0
          ? supabase.from('jogadores_avulsos_campeonato').select('id, campeonato_id, equipe_id, equipe_avulsa_id, nick, uid_jogo, funcao, foto_url, criado_por').in('id', jogadorAvulsoIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (perfisError) throw perfisError
      if (avulsosError) throw avulsosError

      const perfisMap = new Map<string, PerfilJogo>(((perfisData || []) as PerfilJogo[]).map((p) => [p.id, p]))
      const avulsosMap = new Map<string, JogadorAvulsoCampeonato>(((avulsosData || []) as JogadorAvulsoCampeonato[]).map((j) => [j.id, j]))
      const equipesOficiaisMap = new Map<string, any>(((baseEquipes || []) as any[]).map((e) => [e.id, e]))
      const equipesAvulsasMap = new Map<string, any>(((baseEquipesAvulsas || []) as any[]).map((e) => [e.id, e]))
      const gruposMap = new Map<string, any>(((gruposCampeonato || []) as any[]).map((g) => [g.id, g]))
      const inscricaoPorLineId = new Map<string, any>(inscricoesRows.filter((i: any) => i.line_id).map((i: any) => [i.line_id, i]))

      const jogadorCampPorChave = new Map<string, JogadorCampeonato>()
      jogadoresRows.forEach((j) => {
        const insc = inscricoesRows.find((i: any) => i.id === j.campeonato_equipe_id)
        const lineId = insc?.line_id
        if (!lineId) return
        const chave = `${lineId}|${j.perfil_jogo_id || ''}|${j.jogador_avulso_id || ''}`
        jogadorCampPorChave.set(chave, j)
      })

      const equipesFormatadas: EquipeBase[] = inscricoesRows.map((insc: any) => {
        if (insc.tipo_origem === 'avulsa' || (!insc.equipe_id && insc.equipe_avulsa_id)) {
          const dados = equipesAvulsasMap.get(insc.equipe_avulsa_id)
          return {
            inscricao_id: insc.id,
            id: insc.equipe_avulsa_id,
            nome: insc.nome_exibicao || dados?.nome || 'Equipe avulsa',
            tag: dados?.tag || null,
            logo_url: dados?.logo_url || null,
            codigo_publico: dados?.codigo_publico || null,
            tipo_origem: 'avulsa',
            grupo_id: insc.grupo_id || null,
            grupo_nome: insc.grupo_id ? gruposMap.get(insc.grupo_id)?.nome || null : null,
            status: insc.status || null,
            line_id: insc.line_id || null,
          }
        }

        const dados = equipesOficiaisMap.get(insc.equipe_id)
        return {
          inscricao_id: insc.id,
          id: insc.equipe_id,
          nome: insc.nome_exibicao || dados?.nome || 'Equipe do app',
          tag: dados?.tag || null,
          logo_url: dados?.logo_url || null,
          codigo_publico: dados?.codigo_publico || null,
          tipo_origem: 'app',
          grupo_id: insc.grupo_id || null,
          grupo_nome: insc.grupo_id ? gruposMap.get(insc.grupo_id)?.nome || null : null,
          status: insc.status || null,
          line_id: insc.line_id || null,
        }
      })

      // A line é apenas o vínculo da vaga/inscrição.
      // Os atletas exibidos no campeonato devem vir somente de jogadores_campeonato.
      const jogadoresDaLineFormatados: JogadorFormatado[] = []

      const chavesJaVindasDaLine = new Set<string>()

      const jogadoresDiretosFormatados: JogadorFormatado[] = jogadoresRows
        .filter((jc) => jc.campeonato_equipe_id)
        .filter((jc) => {
          const chave = `${jc.campeonato_equipe_id || ''}|${jc.perfil_jogo_id || ''}|${jc.jogador_avulso_id || ''}`
          return !chavesJaVindasDaLine.has(chave)
        })
        .map((jc) => {
          const insc = inscricoesRows.find((i: any) => i.id === jc.campeonato_equipe_id)
          const perfil = jc.perfil_jogo_id ? perfisMap.get(jc.perfil_jogo_id) : null
          const avulso = jc.jogador_avulso_id ? avulsosMap.get(jc.jogador_avulso_id) : null
          const equipeOficial = insc?.equipe_id ? equipesOficiaisMap.get(insc.equipe_id) : null
          const equipeAvulsa = insc?.equipe_avulsa_id ? equipesAvulsasMap.get(insc.equipe_avulsa_id) : null
          const nomeExibicao = perfil?.nick || avulso?.nick || 'SEM NICK'
          const uidExibicao = perfil?.uid_jogo || avulso?.uid_jogo || null
          const fotoExibicao = perfil?.foto_capa || avulso?.foto_url || null
          const funcaoExibicao = perfil?.funcao || avulso?.funcao || null

          return {
            ...jc,
            nome: nomeExibicao,
            nick: perfil?.nick || avulso?.nick || null,
            game_id: uidExibicao,
            funcao: funcaoExibicao,
            avatar_url: fotoExibicao,
            nome_exibicao: nomeExibicao,
            uid_jogo_exibicao: uidExibicao,
            funcao_exibicao: funcaoExibicao,
            foto_exibicao: fotoExibicao,
            equipe_nome: equipeOficial?.nome || equipeAvulsa?.nome || insc?.nome_exibicao || 'LINE',
            equipe_tag: equipeOficial?.tag || equipeAvulsa?.tag || null,
            equipe_tipo_origem: equipeOficial ? 'app' : equipeAvulsa ? 'avulsa' : null,
            line_id: insc?.line_id || null,
            line_jogador_id: null,
          }
        })

      const jogadoresDiretosUnicosMap = new Map<string, JogadorFormatado>()

      jogadoresDiretosFormatados.forEach((jogador) => {
        const chave = `${jogador.campeonato_equipe_id || ''}|${jogador.perfil_jogo_id || ''}|${jogador.jogador_avulso_id || ''}`
        const atual = jogadoresDiretosUnicosMap.get(chave)

        if (!atual || new Date(jogador.created_at || 0).getTime() >= new Date(atual.created_at || 0).getTime()) {
          jogadoresDiretosUnicosMap.set(chave, jogador)
        }
      })

      const jogadoresDiretosUnicos = Array.from(jogadoresDiretosUnicosMap.values())

      const jogadoresFormatados: JogadorFormatado[] = jogadoresDiretosUnicos


      const equipesComJogadores: EquipeComJogadores[] = equipesFormatadas.map((eq) => ({
        inscricao_id: eq.inscricao_id,
        id: eq.id,
        nome: eq.nome,
        tag: eq.tag,
        logo_url: eq.logo_url,
        codigo_publico: eq.codigo_publico || null,
        grupo: eq.grupo_nome || '-',
        status: eq.status,
        tipo_origem: eq.tipo_origem,
        line_id: eq.line_id || null,
        jogadores: jogadoresFormatados.filter((j) => j.campeonato_equipe_id === eq.inscricao_id),
      }))

      setEquipesInscritas(equipesComJogadores)
      setListaGeralJogadores(jogadoresFormatados)
    } catch (error: any) {
      console.error('ERRO AbaJogadores:', error)
      console.error('message:', error?.message)
      console.error('details:', error?.details)
      console.error('hint:', error?.hint)
      console.error('code:', error?.code)
      toast.error('Erro ao carregar jogadores do campeonato')
    } finally {
      setLoading(false)
    }
  }, [campeonatoId])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const getEquipeAlvoAtual = () => {
    return equipesInscritas.find((eq) => eq.inscricao_id === equipeAlvoInscricaoId)
  }

  const getProximaOrdemLine = (lineId: string) => {
    const jogadoresDaLine = listaGeralJogadores.filter((j) => j.line_id === lineId)
    return jogadoresDaLine.length
  }

  const handleRemoverJogador = async (jogador: JogadorFormatado) => {
    if (!confirm(`Deseja remover ${jogador.nome_exibicao.toUpperCase()} desta line?`)) return

    setDeletingId(jogador.id)
    try {
      if (jogador.line_jogador_id) {
        const { error: deleteLineError } = await supabase
          .from('lines_jogadores')
          .delete()
          .eq('id', jogador.line_jogador_id)

        if (deleteLineError) throw deleteLineError
      }

      if (!jogador.id.startsWith('line:')) {
        const { error: updateInscricaoError } = await supabase
          .from('jogadores_campeonato')
          .update({
            status: 'removido',
            observacoes: 'Removido pela gestão da line do campeonato',
          })
          .eq('id', jogador.id)

        if (updateInscricaoError) throw updateInscricaoError
      } else if (jogador.campeonato_equipe_id) {
        let query = supabase
          .from('jogadores_campeonato')
          .update({
            status: 'removido',
            observacoes: 'Removido pela gestão da line do campeonato',
          })
          .eq('campeonato_equipe_id', jogador.campeonato_equipe_id)
          .eq('status', 'ativo')

        if (jogador.perfil_jogo_id) {
          query = query.eq('perfil_jogo_id', jogador.perfil_jogo_id)
        } else if (jogador.jogador_avulso_id) {
          query = query.eq('jogador_avulso_id', jogador.jogador_avulso_id)
        }

        const { error: updatePorVagaError } = await query
        if (updatePorVagaError) throw updatePorVagaError
      }

      toast.success('Atleta removido da line')
      await carregarDados()
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const buscarNoBanco = async (termo: string) => {
    const texto = termo.trim()
    setTermoBuscaPerfil(termo)

    if (texto.length < 1) {
      setResultadosBusca([])
      return
    }

    setBuscandoPerfis(true)
    try {
      const { data, error } = await supabase
        .from('perfis_jogo')
        .select('id, nick, uid_jogo, foto_capa, funcao, equipe_id, user_id, ativo')
        .or(`nick.ilike.%${texto}%,uid_jogo.ilike.%${texto}%`)
        .eq('ativo', true)
        .limit(12)

      if (error) throw error

      setResultadosBusca((data || []) as PerfilJogo[])
    } catch (error: any) {
      toast.error('Erro ao buscar perfis: ' + error.message)
    } finally {
      setBuscandoPerfis(false)
    }
  }

  const buscarPerfisParaTroca = async (termo: string) => {
    const texto = termo.trim()
    setBuscaTroca(termo)

    if (texto.length < 1) {
      setResultadosTroca([])
      return
    }

    setBuscandoTroca(true)
    try {
      const { data, error } = await supabase
        .from('perfis_jogo')
        .select('id, nick, uid_jogo, foto_capa, funcao, equipe_id, user_id, ativo')
        .or(`nick.ilike.%${texto}%,uid_jogo.ilike.%${texto}%`)
        .eq('ativo', true)
        .limit(12)

      if (error) throw error

      setResultadosTroca((data || []) as PerfilJogo[])
    } catch (error: any) {
      toast.error('Erro ao buscar perfis: ' + error.message)
    } finally {
      setBuscandoTroca(false)
    }
  }

  const handleUploadAvatarAvulso = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file || !campeonatoId) return

    setUploadingAvatar(true)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const fileName = `${campeonatoId}/jogadores/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_AVATAR_JOGADOR)
        .upload(fileName, file, {
          upsert: true,
          cacheControl: '3600',
        })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET_AVATAR_JOGADOR).getPublicUrl(fileName)

      setNovoAvatarUrl(publicUrl)
      toast.success('Imagem enviada com sucesso')
    } catch (error: any) {
      toast.error('Erro ao enviar imagem: ' + error.message)
    } finally {
      setUploadingAvatar(false)
      input.value = ''
    }
  }

  const inscreverJogadorDoApp = async (perfil: PerfilJogo) => {
    try {
      const equipeAlvo = getEquipeAlvoAtual()
      const lineId = equipeAlvo?.line_id || null

      if (!equipeAlvoInscricaoId || !lineId) {
        toast.error('Esta vaga ainda não tem line vinculada')
        return
      }

      const duplicadoNaLine = listaGeralJogadores.some(
        (j) => j.line_id === lineId && j.perfil_jogo_id === perfil.id
      )
      if (duplicadoNaLine) {
        toast.error('Esse jogador já está nesta line')
        return
      }

      const { error: lineError } = await supabase
        .from('lines_jogadores')
        .insert({
          line_id: lineId,
          perfil_jogo_id: perfil.id,
          jogador_avulso_id: null,
          tipo_slot: getProximaOrdemLine(lineId) < 4 ? 'titular' : 'reserva',
          ordem: getProximaOrdemLine(lineId),
          funcao_line: perfil.funcao || null,
        })

      if (lineError) throw lineError

      const { error: garantirError } = await supabase.rpc('fn_garantir_jogador_campeonato_vaga', {
        p_campeonato_id: campeonatoId,
        p_campeonato_equipe_id: equipeAlvoInscricaoId,
        p_perfil_jogo_id: perfil.id,
        p_jogador_avulso_id: null,
      })

      if (garantirError) throw garantirError

      toast.success('Atleta vinculado com sucesso')
      resetModal()
      await carregarDados()
    } catch (error: any) {
      toast.error('Erro ao vincular jogador: ' + error.message)
    }
  }

  const abrirTrocaParaPerfilApp = (jogador: JogadorFormatado) => {
    setJogadorParaTroca(jogador)
    setBuscaTroca(jogador.uid_jogo_exibicao || jogador.nome_exibicao || '')
    setPerfilTrocaSelecionado(null)
    setResultadosTroca([])
    setShowTrocaModal(true)

    if (jogador.uid_jogo_exibicao || jogador.nome_exibicao) {
      buscarPerfisParaTroca(jogador.uid_jogo_exibicao || jogador.nome_exibicao)
    }
  }

  const confirmarTrocaParaPerfilApp = async () => {
    if (!jogadorParaTroca || !perfilTrocaSelecionado) {
      toast.error('Selecione um perfil do app')
      return
    }

    if (!jogadorParaTroca.line_id) {
      toast.error('Este jogador não está vinculado a uma line válida')
      return
    }

    const jaExiste = listaGeralJogadores.some(
      (j) =>
        j.line_id === jogadorParaTroca.line_id &&
        j.id !== jogadorParaTroca.id &&
        j.perfil_jogo_id === perfilTrocaSelecionado.id
    )

    if (jaExiste) {
      toast.error('Esse perfil do app já está nesta line')
      return
    }

    setSalvandoTroca(true)

    try {
      if (jogadorParaTroca.line_jogador_id) {
        const { error: lineUpdateError } = await supabase
          .from('lines_jogadores')
          .update({
            perfil_jogo_id: perfilTrocaSelecionado.id,
            jogador_avulso_id: null,
            funcao_line: perfilTrocaSelecionado.funcao || null,
          })
          .eq('id', jogadorParaTroca.line_jogador_id)

        if (lineUpdateError) throw lineUpdateError
      }

      if (!jogadorParaTroca.id.startsWith('line:')) {
        const { error: updateError } = await supabase
          .from('jogadores_campeonato')
          .update({
            perfil_jogo_id: perfilTrocaSelecionado.id,
            jogador_avulso_id: null,
            origem: 'app',
            status: 'ativo',
          })
          .eq('id', jogadorParaTroca.id)

        if (updateError) throw updateError
      } else if (jogadorParaTroca.campeonato_equipe_id) {
        const { error: garantirError } = await supabase.rpc('fn_garantir_jogador_campeonato_vaga', {
          p_campeonato_id: campeonatoId,
          p_campeonato_equipe_id: jogadorParaTroca.campeonato_equipe_id,
          p_perfil_jogo_id: perfilTrocaSelecionado.id,
          p_jogador_avulso_id: null,
        })

        if (garantirError) throw garantirError
      }

      if (jogadorParaTroca.jogador_avulso_id) {
        const { error: deleteAvulsoError } = await supabase
          .from('jogadores_avulsos_campeonato')
          .delete()
          .eq('id', jogadorParaTroca.jogador_avulso_id)

        if (deleteAvulsoError) throw deleteAvulsoError
      }

      toast.success('Jogador avulso trocado por perfil do app')
      resetTrocaModal()
      await carregarDados()
    } catch (error: any) {
      toast.error('Erro ao trocar jogador: ' + error.message)
    } finally {
      setSalvandoTroca(false)
    }
  }

  const criarJogadorAvulso = async () => {
    if (!novoNick.trim()) {
      toast.error('Informe o nick do jogador')
      return
    }

    if (!novoGameId.trim()) {
      toast.error('Informe o game id do jogador')
      return
    }

    setSalvandoNovoAvulso(true)

    let jogadorAvulsoCriadoId: string | null = null

    try {
      const uidNormalizado = novoGameId.trim()

      const { data: perfilExistente, error: perfilExistenteError } = await supabase
        .from('perfis_jogo')
        .select('id, nick, uid_jogo, foto_capa, funcao, equipe_id, user_id, ativo')
        .eq('uid_jogo', uidNormalizado)
        .eq('ativo', true)
        .limit(1)

      if (perfilExistenteError) throw perfilExistenteError

      if (perfilExistente && perfilExistente.length > 0) {
        toast.error('Já existe um perfil do app com esse ID. Use o perfil do app.')
        setMetodoRecrutamento('pesquisar')
        setTermoBuscaPerfil(uidNormalizado)
        await buscarNoBanco(uidNormalizado)
        return
      }

      const duplicadoGameId = listaGeralJogadores.some(
        (j) => (j.game_id || '').trim().toLowerCase() === uidNormalizado.toLowerCase()
      )

      if (duplicadoGameId) {
        toast.error('Já existe um jogador com esse game id neste campeonato')
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: avulsoCriado, error: createAvulsoError } = await supabase
        .from('jogadores_avulsos_campeonato')
        .insert({
          campeonato_id: campeonatoId,
          equipe_id: equipeAlvoId || null,
          equipe_avulsa_id: equipeAlvoAvulsaId || null,
          nick: novoNick.trim(),
          uid_jogo: uidNormalizado,
          funcao: novaFuncao || null,
          foto_url: novoAvatarUrl || null,
          criado_por: user?.id || null,
        })
        .select('id')
        .single()

      if (createAvulsoError) throw createAvulsoError
      if (!avulsoCriado?.id) throw new Error('Não foi possível criar o jogador avulso')

      jogadorAvulsoCriadoId = avulsoCriado.id

      const equipeAlvo = getEquipeAlvoAtual()
      const lineId = equipeAlvo?.line_id || null

      if (!equipeAlvoInscricaoId || !lineId) {
        throw new Error('Esta vaga ainda não tem line vinculada')
      }

      const proximaOrdem = getProximaOrdemLine(lineId)
      const { error: lineError } = await supabase
        .from('lines_jogadores')
        .insert({
          line_id: lineId,
          perfil_jogo_id: null,
          jogador_avulso_id: avulsoCriado.id,
          tipo_slot: proximaOrdem < 4 ? 'titular' : 'reserva',
          ordem: proximaOrdem,
          funcao_line: novaFuncao || null,
        })

      if (lineError) {
        await supabase
          .from('jogadores_avulsos_campeonato')
          .delete()
          .eq('id', avulsoCriado.id)

        throw lineError
      }

      const { error } = await supabase.rpc('fn_garantir_jogador_campeonato_vaga', {
        p_campeonato_id: campeonatoId,
        p_campeonato_equipe_id: equipeAlvoInscricaoId,
        p_jogador_avulso_id: avulsoCriado.id,
        p_perfil_jogo_id: null,
      })

      if (error) {
        await supabase
          .from('jogadores_avulsos_campeonato')
          .delete()
          .eq('id', avulsoCriado.id)

        throw error
      }

      toast.success('Jogador avulso criado com sucesso')
      resetModal()
      await carregarDados()
    } catch (error: any) {
      if (jogadorAvulsoCriadoId) {
        console.error('Rollback do jogador avulso executado para:', jogadorAvulsoCriadoId)
      }
      toast.error('Erro ao criar jogador avulso: ' + error.message)
    } finally {
      setSalvandoNovoAvulso(false)
    }
  }

  const equipesFiltradas = useMemo(() => {
    return equipesInscritas
      .map((eq) => ({
        ...eq,
        jogadores: eq.jogadores.filter((j) => {
          const matchOrigem = filtroOrigem === 'todas' ? true : j.origem === filtroOrigem
          return matchOrigem
        }),
      }))
      .filter((eq) => filtroGrupo === 'TODOS' || eq.grupo === filtroGrupo)
  }, [equipesInscritas, filtroGrupo, filtroOrigem])

  const jogadoresGeraisFiltrados = useMemo(() => {
    return listaGeralJogadores.filter((j) =>
      filtroOrigem === 'todas' ? true : j.origem === filtroOrigem
    )
  }, [listaGeralJogadores, filtroOrigem])

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#7cfc00] mb-2" size={24} />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          Processando Database...
        </span>
      </div>
    )
  }

  if (!canEdit) return <PainelSemPermissaoJogadores />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 p-1">
        <div className="flex gap-1">
          <button
            onClick={() => setView('equipes')}
            className={`px-4 py-2 text-[9px] font-black italic uppercase transition-all flex items-center gap-2 ${
              view === 'equipes' ? 'bg-slate-900 text-[#7cfc00]' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={12} /> ORGANIZAÇÕES
          </button>

          <button
            onClick={() => setView('geral')}
            className={`px-4 py-2 text-[9px] font-black italic uppercase transition-all flex items-center gap-2 ${
              view === 'geral' ? 'bg-slate-900 text-[#7cfc00]' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <List size={12} /> ATLETAS
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-3 border-l border-slate-100">
          <Filter size={12} className="text-slate-300" />

          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className="bg-transparent border-none text-[9px] font-black uppercase italic outline-none text-slate-600 focus:ring-0"
          >
            <option value="TODOS">TODOS OS GRUPOS</option>
            <option value="-">SEM GRUPO</option>
            {['A', 'B', 'C', 'D', 'E', 'F'].map((g) => (
              <option key={g} value={g}>
                GRUPO {g}
              </option>
            ))}
          </select>

          <select
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value as 'todas' | OrigemJogador)}
            className="bg-transparent border-none text-[9px] font-black uppercase italic outline-none text-slate-600 focus:ring-0"
          >
            <option value="todas">TODAS ORIGENS</option>
            <option value="app">APP</option>
            <option value="avulso">AVULSO</option>
            <option value="sumula">SÚMULA</option>
          </select>
        </div>
      </div>

      {view === 'equipes' ? (
        <div className="grid grid-cols-1 gap-[2px] bg-slate-200 border border-slate-200 shadow-sm">
          {equipesFiltradas.map((eq, index) => {
            const chaveEquipe = `${eq.tipo_origem}-${eq.inscricao_id || eq.id}-${index}`
            return (
            <div key={chaveEquipe} className="bg-white">
              <div
                onClick={() =>
                  setEquipeAberta(
                    equipeAberta === chaveEquipe ? null : chaveEquipe
                  )
                }
                className={`flex items-center justify-between p-3 cursor-pointer transition-all ${
                  equipeAberta === chaveEquipe ? 'bg-slate-900' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 flex items-center justify-center border ${
                      equipeAberta === chaveEquipe
                        ? 'bg-white border-white/10'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {eq.logo_url ? (
                      <img src={eq.logo_url} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Users size={16} className="text-slate-300" />
                    )}
                  </div>

                  <div>
                    <h4
                      className={`font-black italic uppercase text-xs tracking-tight ${
                        equipeAberta === chaveEquipe ? 'text-[#7cfc00]' : 'text-slate-800'
                      }`}
                    >
                      {eq.tag && <span className="opacity-50 mr-1">[{eq.tag}]</span>} {eq.nome}
                    </h4>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.5 ${
                          equipeAberta === chaveEquipe
                            ? 'bg-[#7cfc00] text-black'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {eq.grupo === '-' ? 'SEM GRUPO' : eq.grupo}
                      </span>

                      <span
                        className={`text-[8px] font-bold uppercase tracking-widest ${
                          equipeAberta === chaveEquipe ? 'text-white/50' : 'text-slate-400'
                        }`}
                      >
                        {eq.jogadores.length} ATLETAS
                      </span>

                      <span
                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 ${
                          eq.tipo_origem === 'app' ? 'bg-[#7cfc00] text-black' : 'bg-orange-300 text-black'
                        }`}
                      >
                        {eq.tipo_origem === 'app' ? 'EQUIPE APP' : 'EQUIPE AVULSA'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {equipeAberta === chaveEquipe ? (
                    <ChevronDown size={14} className="text-white" />
                  ) : (
                    <ChevronRight size={14} className="text-slate-300" />
                  )}
                </div>
              </div>

              {equipeAberta === chaveEquipe && (
                <div className="bg-slate-50 border-x border-slate-900">
                  <div className="divide-y divide-slate-200">
                    {eq.jogadores.map((insc) => {
                      const style = getFuncaoStyles(insc.funcao_exibicao)

                      return (
                        <div
                          key={insc.id}
                          className="flex items-center justify-between p-2 pl-6 hover:bg-white transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 border border-slate-200 grayscale group-hover:grayscale-0 transition-all overflow-hidden bg-white">
                              <img
                                src={insc.foto_exibicao || '/DropZone-Logo.png'}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase italic text-slate-700">
                                  {insc.nome_exibicao}
                                </span>
                                <MessageShortcut referenciaTipo="jogador" referenciaId={insc.perfil_jogo_id || insc.id} titulo={insc.nome_exibicao || "Jogador"} avatarUrl={insc.foto_exibicao} tipo="dm" />
                              </div>

                              <div className="flex items-center gap-2 mt-0.5">
                                <div className={`flex items-center gap-1 text-[7px] font-bold uppercase ${style.color}`}>
                                  {style.icon} {insc.funcao_exibicao || 'INDEFINIDO'}
                                </div>

                                <span
                                  className={`text-[7px] font-black uppercase px-1.5 py-0.5 ${getOrigemStyle(
                                    insc.origem
                                  )}`}
                                >
                                  {getOrigemLabel(insc.origem)}
                                </span>

                                {insc.uid_jogo_exibicao && (
                                  <span className="text-[7px] font-bold uppercase text-slate-400">
                                    ID {insc.uid_jogo_exibicao}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                            {insc.origem === 'avulso' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  abrirTrocaParaPerfilApp(insc)
                                }}
                                className="p-2 text-slate-300 hover:text-emerald-500"
                                title="Trocar por perfil do app"
                              >
                                <RefreshCw size={12} />
                              </button>
                            )}

                            <button
                              className="p-2 text-slate-300 hover:text-blue-500"
                              title="Ver Perfil"
                            >
                              <ExternalLink size={12} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoverJogador(insc)
                              }}
                              disabled={deletingId === insc.id}
                              className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-50"
                              title="Remover do Campeonato"
                            >
                              {deletingId === insc.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 pl-6 bg-white border-t border-slate-200">
                      <button
                        onClick={() => {
                          setEquipeAlvoInscricaoId(eq.inscricao_id)
                          setEquipeAlvoId(eq.tipo_origem === 'app' ? eq.id : undefined)
                          setEquipeAlvoAvulsaId(eq.tipo_origem === 'avulsa' ? eq.id : undefined)
                          setShowRecrutamentoModal(true)
                          setMetodoRecrutamento('pesquisar')
                        }}
                        className="w-full p-2 flex items-center gap-3 text-slate-400 hover:text-[#7cfc00] hover:bg-slate-900 transition-all border border-slate-200"
                      >
                        <div className="w-7 h-7 border border-dashed border-slate-300 flex items-center justify-center">
                          <UserPlus size={12} />
                        </div>
                        <span className="text-[9px] font-black uppercase italic">
                          Vincular jogador do app
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setEquipeAlvoInscricaoId(eq.inscricao_id)
                          setEquipeAlvoId(eq.tipo_origem === 'app' ? eq.id : undefined)
                          setEquipeAlvoAvulsaId(eq.tipo_origem === 'avulsa' ? eq.id : undefined)
                          setShowRecrutamentoModal(true)
                          setMetodoRecrutamento('criar_avulso')
                        }}
                        className="w-full p-2 flex items-center gap-3 text-slate-400 hover:text-[#7cfc00] hover:bg-slate-900 transition-all border border-slate-200"
                      >
                        <div className="w-7 h-7 border border-dashed border-slate-300 flex items-center justify-center">
                          <Plus size={12} />
                        </div>
                        <span className="text-[9px] font-black uppercase italic">
                          Criar jogador avulso
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-[9px] font-black text-white/50 uppercase italic tracking-widest border-b border-slate-800">
              <tr>
                <th className="p-3 pl-6">PLAYER</th>
                <th className="p-3">ORGANIZAÇÃO</th>
                <th className="p-3">ORIGEM</th>
                <th className="p-3 text-right pr-6">AÇÕES</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {jogadoresGeraisFiltrados.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-3 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 border border-slate-100 bg-slate-50">
                        <img
                          src={j.foto_exibicao || '/DropZone-Logo.png'}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase italic text-slate-800">
                            {j.nome_exibicao}
                          </p>
                          <MessageShortcut referenciaTipo="jogador" referenciaId={j.perfil_jogo_id || j.id} titulo={j.nome_exibicao || "Jogador"} avatarUrl={j.foto_exibicao} tipo="dm" />
                        </div>
                        <p className="text-[7px] font-bold text-slate-400 tracking-tighter">
                          ID: {j.uid_jogo_exibicao || 'NÃO INFORMADO'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3">
                    <span className="text-[9px] font-black uppercase italic px-2 py-0.5 bg-slate-100 text-slate-500">
                      {j.equipe_nome}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className={`text-[8px] font-black uppercase px-2 py-1 ${getOrigemStyle(j.origem)}`}>
                      {getOrigemLabel(j.origem)}
                    </span>
                  </td>

                  <td className="p-3 text-right pr-6 space-x-1">
                    {j.origem === 'avulso' && (
                      <button
                        onClick={() => abrirTrocaParaPerfilApp(j)}
                        className="w-7 h-7 inline-flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-emerald-500 hover:text-white transition-all"
                        title="Trocar por perfil do app"
                      >
                        <RefreshCw size={12} />
                      </button>
                    )}

                    <button className="w-7 h-7 inline-flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all">
                      <UserCog size={14} />
                    </button>

                    <button
                      onClick={() => handleRemoverJogador(j)}
                      disabled={deletingId === j.id}
                      className="w-7 h-7 inline-flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                    >
                      {deletingId === j.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRecrutamentoModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm z-[999]">
          <div className="bg-white border-t-4 border-slate-900 p-6 w-full max-w-md shadow-2xl">
            {metodoRecrutamento === 'pesquisar' ? (
              <div className="space-y-3">
                <div className="mb-4">
                  <h2 className="text-slate-900 font-black italic uppercase text-xl tracking-tighter">
                    Vincular atleta do app
                  </h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    Busque um perfil já criado no sistema
                  </p>
                </div>

                <input
                  autoFocus
                  type="text"
                  value={termoBuscaPerfil}
                  onChange={(e) => buscarNoBanco(e.target.value)}
                  placeholder="NICK OU UID DO JOGO..."
                  className="w-full bg-slate-50 border border-slate-200 p-3 text-slate-800 font-black uppercase italic text-[10px] outline-none focus:border-slate-900 transition-all"
                />

                <div className="max-h-64 overflow-y-auto border border-slate-100">
                  {buscandoPerfis ? (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="animate-spin text-slate-400" size={16} />
                    </div>
                  ) : resultadosBusca.length === 0 ? (
                    <div className="p-4 text-center text-[9px] font-black uppercase italic text-slate-400">
                      Nenhum perfil encontrado
                    </div>
                  ) : (
                    resultadosBusca.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 flex justify-between items-center hover:bg-slate-50 border-b border-slate-50 last:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 border border-slate-200 bg-slate-50 overflow-hidden">
                            <img
                              src={r.foto_capa || '/DropZone-Logo.png'}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="text-slate-800 font-black text-[10px] uppercase italic truncate">
                              {r.nick || 'SEM NICK'}
                            </p>
                            <p className="text-slate-400 text-[8px] font-bold">
                              UID: {r.uid_jogo || 'NÃO INFORMADO'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => inscreverJogadorDoApp(r)}
                          className="bg-slate-900 text-[#7cfc00] font-black italic text-[8px] px-3 py-1.5 hover:bg-[#7cfc00] hover:text-black transition-all"
                        >
                          VINCULAR
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mb-4">
                  <h2 className="text-slate-900 font-black italic uppercase text-xl tracking-tighter">
                    Criar jogador avulso
                  </h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    Cadastro manual para atleta sem perfil no app
                  </p>
                </div>

                <input
                  value={novoNick}
                  onChange={(e) => setNovoNick(e.target.value)}
                  placeholder="NICK"
                  className="w-full bg-slate-50 border border-slate-200 p-3 text-slate-800 font-black uppercase italic text-[10px] outline-none focus:border-slate-900 transition-all"
                />

                <input
                  value={novoGameId}
                  onChange={(e) => setNovoGameId(e.target.value)}
                  placeholder="GAME ID"
                  className="w-full bg-slate-50 border border-slate-200 p-3 text-slate-800 font-black uppercase italic text-[10px] outline-none focus:border-slate-900 transition-all"
                />

                <select
                  value={novaFuncao}
                  onChange={(e) => setNovaFuncao(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 text-slate-800 font-black uppercase italic text-[10px] outline-none focus:border-slate-900 transition-all"
                >
                  <option value="SUPORTE">SUPORTE</option>
                  <option value="RUSH">RUSH</option>
                  <option value="SNIPER">SNIPER</option>
                  <option value="GRANADEIRO">GRANADEIRO</option>
                </select>

                <div className="space-y-3">
                  <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 border border-slate-200 bg-slate-50 px-4 text-[10px] font-black uppercase italic text-slate-700">
                    {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploadingAvatar ? 'Enviando imagem...' : 'Enviar imagem do jogador'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadAvatarAvulso}
                      disabled={uploadingAvatar}
                    />
                  </label>

                  {novoAvatarUrl ? (
                    <div className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-3">
                      <img
                        src={novoAvatarUrl}
                        alt="Avatar enviado"
                        className="h-16 w-16 border border-slate-200 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase italic text-emerald-700">
                          Imagem carregada com sucesso
                        </p>
                        <p className="truncate text-[9px] font-bold text-slate-500">
                          Avatar pronto para uso
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-[10px] font-black uppercase italic text-slate-400">
                      <div className="flex items-center gap-2">
                        <ImageIcon size={14} />
                        Nenhuma imagem enviada
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={criarJogadorAvulso}
                  disabled={salvandoNovoAvulso || uploadingAvatar}
                  className="w-full bg-slate-900 text-[#7cfc00] font-black italic text-[9px] px-3 py-3 hover:bg-[#7cfc00] hover:text-black transition-all disabled:opacity-50"
                >
                  {salvandoNovoAvulso ? 'SALVANDO...' : 'CRIAR JOGADOR AVULSO'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 mt-6">
              <button
                onClick={() =>
                  setMetodoRecrutamento(
                    metodoRecrutamento === 'pesquisar' ? 'criar_avulso' : 'pesquisar'
                  )
                }
                className="w-full py-3 bg-white text-slate-600 hover:bg-slate-50 transition-all text-[9px] font-black uppercase italic border border-slate-200"
              >
                {metodoRecrutamento === 'pesquisar'
                  ? 'TROCAR PARA CADASTRO AVULSO'
                  : 'TROCAR PARA PERFIL DO APP'}
              </button>

              <button
                onClick={resetModal}
                className="w-full py-3 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all text-[9px] font-black uppercase italic border border-slate-100"
              >
                ABORTAR OPERAÇÃO
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrocaModal && jogadorParaTroca && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm z-[1000]">
          <div className="bg-white border-t-4 border-slate-900 p-6 w-full max-w-md shadow-2xl">
            <div className="mb-4">
              <h2 className="text-slate-900 font-black italic uppercase text-xl tracking-tighter">
                Trocar por perfil do app
              </h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                O jogador avulso será removido da tabela de avulsos após a troca
              </p>
            </div>

            <div className="mb-4 border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase italic text-slate-700">
                Jogador atual: {jogadorParaTroca.nome_exibicao}
              </p>
              <p className="text-[8px] font-bold uppercase text-slate-400">
                ID: {jogadorParaTroca.uid_jogo_exibicao || 'NÃO INFORMADO'}
              </p>
            </div>

            <input
              autoFocus
              type="text"
              value={buscaTroca}
              onChange={(e) => buscarPerfisParaTroca(e.target.value)}
              placeholder="NICK OU UID DO JOGO..."
              className="w-full bg-slate-50 border border-slate-200 p-3 text-slate-800 font-black uppercase italic text-[10px] outline-none focus:border-slate-900 transition-all"
            />

            <div className="max-h-64 overflow-y-auto border border-slate-100 mt-3">
              {buscandoTroca ? (
                <div className="p-4 flex items-center justify-center">
                  <Loader2 className="animate-spin text-slate-400" size={16} />
                </div>
              ) : resultadosTroca.length === 0 ? (
                <div className="p-4 text-center text-[9px] font-black uppercase italic text-slate-400">
                  Nenhum perfil encontrado
                </div>
              ) : (
                resultadosTroca.map((r) => {
                  const selecionado = perfilTrocaSelecionado?.id === r.id
                  const jaInscrito = listaGeralJogadores.some(
                    (j) => j.id !== jogadorParaTroca.id && j.perfil_jogo_id === r.id
                  )

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => !jaInscrito && setPerfilTrocaSelecionado(r)}
                      className={`w-full p-3 flex justify-between items-center text-left border-b border-slate-50 last:border-0 ${
                        selecionado ? 'bg-emerald-50' : 'hover:bg-slate-50'
                      } ${jaInscrito ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 border border-slate-200 bg-slate-50 overflow-hidden">
                          <img
                            src={r.foto_capa || '/DropZone-Logo.png'}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-slate-800 font-black text-[10px] uppercase italic truncate">
                            {r.nick || 'SEM NICK'}
                          </p>
                          <p className="text-slate-400 text-[8px] font-bold">
                            UID: {r.uid_jogo || 'NÃO INFORMADO'}
                          </p>
                        </div>
                      </div>

                      <div className="text-[8px] font-black uppercase italic text-slate-500">
                        {jaInscrito ? 'Já inscrito' : selecionado ? 'Selecionado' : 'Selecionar'}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 mt-6">
              <button
                onClick={confirmarTrocaParaPerfilApp}
                disabled={!perfilTrocaSelecionado || salvandoTroca}
                className="w-full py-3 bg-slate-900 text-[#7cfc00] hover:bg-[#7cfc00] hover:text-black transition-all text-[9px] font-black uppercase italic disabled:opacity-50"
              >
                {salvandoTroca ? 'SALVANDO TROCA...' : 'CONFIRMAR TROCA'}
              </button>

              <button
                onClick={resetTrocaModal}
                className="w-full py-3 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all text-[9px] font-black uppercase italic border border-slate-100"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
