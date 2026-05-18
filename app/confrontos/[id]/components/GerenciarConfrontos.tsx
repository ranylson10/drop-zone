'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, RefreshCcw, Swords, Trash2, GitBranch, Trophy, ListOrdered, Shuffle, CalendarDays, Clock3 } from 'lucide-react'
import { toast } from 'react-hot-toast'

type FaseBase = {
  id: string
  nome: string | null
  ordem: number | null
}

type FaseV2 = {
  id: string
  nome: string | null
  ordem: number | null
  tipo_fase: string | null
  status?: string | null
}

type Fase = {
  id: string
  nome: string | null
  ordem: number | null
  tipo_fase: string
  status?: string | null
}

type EquipeItem = {
  id: string
  campeonato_id?: string | null
  equipe_id?: string | null
  grupo_id?: string | null
  seed?: number | null
  status?: string | null
  observacoes?: string | null
  equipe_avulsa_id?: string | null
  tipo_origem?: string | null
  fase_id?: string | null
  nome?: string | null
  equipes?: {
    nome?: string | null
    tag?: string | null
    logo_url?: string | null
  } | null
  equipe_avulsa?: {
    nome?: string | null
    tag?: string | null
    logo_url?: string | null
  } | null
}

type JogoItem = {
  id: string
  fase_id?: string | null
  grupo_id?: string | null
  nome?: string | null
  numero?: number | null
  data_inicio?: string | null
  data_fim?: string | null
  observacoes?: string | null
  created_at?: string | null
  nome_bloco?: string | null
  data_jogo?: string | null
  hora_jogo?: string | null
  duracao_estimada_min?: number | null
  quantidade_partidas?: number | null
  quedas?: any
  bloqueia_alteracao_equipe_ate?: string | null
  bloqueia_escalacao_ate?: string | null
  agenda_publicada?: boolean | null
  ordem?: number | null
  rodada?: number | null
  numero_queda?: number | null
  mapa?: string | null
  data_hora?: string | null
  configuracao?: any
}

type JogoEquipeItem = {
  id: string
  jogo_id: string
  campeonato_id?: string | null
  fase_id?: string | null
  grupo_id?: string | null
  campeonato_equipe_id: string
  origem_slot_id?: string | null
  created_at?: string | null
}

type ConfrontoComEquipes = JogoItem & {
  equipes: EquipeItem[]
}

type FiltroConfrontos = {
  fase: Fase
  jogos: ConfrontoComEquipes[]
}

function getErrorMessage(error: any, fallback = 'Erro inesperado') {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error.message) return error.message
  if (error.details) return error.details
  if (error.hint) return error.hint
  if (error.code) return `Erro ${error.code}`
  try {
    const texto = JSON.stringify(error)
    if (texto && texto !== '{}') return texto
  } catch {}
  return fallback
}

function parseObservacoesEquipe(item?: EquipeItem | null) {
  if (!item?.observacoes) return {}
  try {
    return JSON.parse(item.observacoes)
  } catch {
    return {}
  }
}

function getEquipeNome(item?: EquipeItem | null) {
  if (!item) return 'Selecionar equipe'
  const obs = parseObservacoesEquipe(item)
  return (
    item.nome ||
    item.equipes?.nome ||
    item.equipe_avulsa?.nome ||
    obs.nome ||
    obs.equipe_nome ||
    obs.nome_equipe ||
    obs.tag ||
    `Equipe ${item.seed || item.id.slice(0, 6)}`
  )
}

function getEquipeTag(item?: EquipeItem | null) {
  if (!item) return null
  const obs = parseObservacoesEquipe(item)
  return item.equipes?.tag || item.equipe_avulsa?.tag || obs.tag || null
}

function getEquipeLogo(item?: EquipeItem | null) {
  if (!item) return null
  const obs = parseObservacoesEquipe(item)
  return item.equipes?.logo_url || item.equipe_avulsa?.logo_url || obs.logo_url || obs.logo || null
}

function criarPayloadQuedas(quantidade: number) {
  return Array.from({ length: Math.max(1, quantidade) }, (_, idx) => ({
    numero: idx + 1,
    nome: `Queda ${idx + 1}`,
  }))
}

function getTipoLabel(tipo?: string | null) {
  const valor = String(tipo || 'mata_mata').toLowerCase()
  if (valor === 'dupla_eliminacao') return 'Dupla eliminação'
  if (valor === 'pontos_corridos') return 'Pontos corridos'
  return 'Mata-mata'
}

function getTipoBadgeClass(tipo?: string | null) {
  const valor = String(tipo || 'mata_mata').toLowerCase()
  if (valor === 'dupla_eliminacao') return 'bg-[#fff3d6]'
  if (valor === 'pontos_corridos') return 'bg-[#dff3ff]'
  return 'bg-[#e7ffe1]'
}

function iconeTipo(tipo?: string | null) {
  const valor = String(tipo || 'mata_mata').toLowerCase()
  if (valor === 'dupla_eliminacao') return GitBranch
  if (valor === 'pontos_corridos') return ListOrdered
  return Trophy
}

function embaralharLista<T>(lista: T[]) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function obterEquipesDisponiveisDaFase(equipes: EquipeItem[], faseId: string, tipoConfronto: string) {
  if (!faseId) return []
  if (tipoConfronto === 'pontos_corridos') return equipes
  const filtradas = equipes.filter((equipe) => !equipe.fase_id || equipe.fase_id === faseId)
  return filtradas.length > 0 ? filtradas : equipes
}

function formatarDataInput(jogo?: JogoItem | null) {
  if (!jogo) return ''
  if (jogo.data_jogo) return jogo.data_jogo
  if (jogo.data_hora) return jogo.data_hora.slice(0, 10)
  if (jogo.data_inicio) return jogo.data_inicio.slice(0, 10)
  return ''
}

function formatarHoraInput(jogo?: JogoItem | null) {
  if (!jogo) return ''
  if (jogo.hora_jogo) return String(jogo.hora_jogo).slice(0, 5)
  if (jogo.data_hora) return jogo.data_hora.slice(11, 16)
  if (jogo.data_inicio) return jogo.data_inicio.slice(11, 16)
  return ''
}

function classNamePainel(claro = false) {
  return claro ? 'border border-zinc-200 bg-white p-5' : 'border border-zinc-200 bg-[#eceee5] p-5'
}

function calcularResultadoTexto(jogo: any) {
  const conf = typeof jogo.configuracao === 'object' && jogo.configuracao ? jogo.configuracao : {}
  const finalizado = Boolean(jogo.data_fim || conf.status === 'finalizado' || conf.encerrado === true)
  if (!finalizado) return 'X'

  const a = Number(conf.rounds_a ?? conf.placar_a ?? conf.resultado_a ?? 0)
  const b = Number(conf.rounds_b ?? conf.placar_b ?? conf.resultado_b ?? 0)
  return `${a} x ${b}`
}

function EquipeLogo({ equipe }: { equipe?: EquipeItem | null }) {
  const logo = getEquipeLogo(equipe)
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white">
      {logo ? (
        <img src={logo as string} alt={getEquipeNome(equipe)} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-black text-[#142340]">
          {getEquipeNome(equipe).charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

export default function GerenciarConfrontos({ campeonatoId }: { campeonatoId: string }) {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [fases, setFases] = useState<Fase[]>([])
  const [equipes, setEquipes] = useState<EquipeItem[]>([])
  const [jogos, setJogos] = useState<JogoItem[]>([])
  const [jogoEquipes, setJogoEquipes] = useState<JogoEquipeItem[]>([])

  const [showNovaFase, setShowNovaFase] = useState(false)
  const [showNovoConfronto, setShowNovoConfronto] = useState(false)

  const [novaFase, setNovaFase] = useState('')
  const [novoTipoFase, setNovoTipoFase] = useState('mata_mata')

  const [faseSelecionada, setFaseSelecionada] = useState('')
  const [tipoConfronto, setTipoConfronto] = useState('mata_mata')
  const [nomeConfronto, setNomeConfronto] = useState('')
  const [equipeA, setEquipeA] = useState('')
  const [equipeB, setEquipeB] = useState('')
  const [dataJogo, setDataJogo] = useState('')
  const [horaJogo, setHoraJogo] = useState('19:00')
  const [melhorDe, setMelhorDe] = useState('1')

  const carregar = useCallback(async () => {
    if (!campeonatoId) return
    setLoading(true)

    try {
      const [fasesRes, fasesV2Res, equipesRes, jogosRes] = await Promise.all([
        supabase
          .from('campeonato_fases')
          .select('id, nome, ordem')
          .eq('campeonato_id', campeonatoId)
          .order('ordem', { ascending: true }),
        supabase
          .from('campeonato_fases_v2')
          .select('id, nome, ordem, tipo_fase, status')
          .eq('campeonato_id', campeonatoId)
          .order('ordem', { ascending: true }),
        supabase
          .from('campeonato_equipes')
          .select(`
            id,
            campeonato_id,
            equipe_id,
            grupo_id,
            seed,
            status,
            observacoes,
            created_at,
            updated_at,
            equipe_avulsa_id,
            tipo_origem,
            fase_id,
            equipes ( nome, tag, logo_url ),
            equipe_avulsa:equipes_avulsas_campeonato ( nome, tag, logo_url )
          `)
          .eq('campeonato_id', campeonatoId)
          .order('seed', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('jogos')
          .select('id, fase_id, grupo_id, nome, numero, data_inicio, data_fim, observacoes, created_at, nome_bloco, data_jogo, hora_jogo, duracao_estimada_min, quantidade_partidas, quedas, bloqueia_alteracao_equipe_ate, bloqueia_escalacao_ate, agenda_publicada, ordem, rodada, numero_queda, mapa, data_hora, configuracao')
          .eq('campeonato_id', campeonatoId)
          .order('data_jogo', { ascending: true, nullsFirst: false })
          .order('hora_jogo', { ascending: true, nullsFirst: false })
          .order('ordem', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true }),
      ])

      if (fasesRes.error) throw fasesRes.error
      if (fasesV2Res.error) throw fasesV2Res.error
      if (equipesRes.error) throw equipesRes.error
      if (jogosRes.error) throw jogosRes.error

      const fasesData = (fasesRes.data || []) as FaseBase[]
      const fasesV2Data = (fasesV2Res.data || []) as FaseV2[]
      const equipesData = (equipesRes.data || []) as EquipeItem[]
      const jogosData = (jogosRes.data || []) as JogoItem[]

      const fasesMescladas: Fase[] = fasesData.map((fase) => {
        const v2 = fasesV2Data.find((item) => item.nome === fase.nome && item.ordem === fase.ordem)
        return {
          id: fase.id,
          nome: fase.nome,
          ordem: fase.ordem,
          tipo_fase: v2?.tipo_fase || 'mata_mata',
          status: v2?.status || null,
        }
      })

      setFases(fasesMescladas)
      setEquipes(equipesData)
      setJogos(jogosData)

      if ((!faseSelecionada || !fasesMescladas.some((fase) => fase.id === faseSelecionada)) && fasesMescladas[0]?.id) {
        setFaseSelecionada(fasesMescladas[0].id)
        setTipoConfronto(fasesMescladas[0].tipo_fase || 'mata_mata')
      }

      if (jogosData.length > 0) {
        const jogoIds = jogosData.map((jogo) => jogo.id)
        const { data, error } = await supabase
          .from('jogo_equipes')
          .select('id, jogo_id, campeonato_id, fase_id, grupo_id, campeonato_equipe_id, origem_slot_id, created_at')
          .in('jogo_id', jogoIds)
          .order('created_at', { ascending: true })

        if (error) throw error
        setJogoEquipes((data || []) as JogoEquipeItem[])
      } else {
        setJogoEquipes([])
      }
    } catch (error: any) {
      console.error('Erro detalhado ao carregar confrontos:', error)
      toast.error(getErrorMessage(error, 'Erro ao carregar confrontos'))
    } finally {
      setLoading(false)
    }
  }, [campeonatoId, faseSelecionada])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    const fase = fases.find((item) => item.id === faseSelecionada)
    if (fase?.tipo_fase) setTipoConfronto(fase.tipo_fase)
  }, [faseSelecionada, fases])

  const mapaEquipes = useMemo(() => {
    const map = new Map<string, EquipeItem>()
    for (const equipe of equipes) map.set(equipe.id, equipe)
    return map
  }, [equipes])

  const equipesDisponiveisDaFase = useMemo(
    () => obterEquipesDisponiveisDaFase(equipes, faseSelecionada, tipoConfronto),
    [equipes, faseSelecionada, tipoConfronto],
  )

  const equipesJaUsadasNaFase = useMemo(() => {
    if (tipoConfronto === 'pontos_corridos' || !faseSelecionada) return new Set<string>()
    const ids = new Set<string>()
    const jogoIds = new Set(jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada).map((jogo) => jogo.id))
    for (const item of jogoEquipes) {
      if (jogoIds.has(item.jogo_id)) ids.add(item.campeonato_equipe_id)
    }
    return ids
  }, [tipoConfronto, faseSelecionada, jogos, jogoEquipes])

  const opcoesEquipeA = useMemo(() => {
    if (tipoConfronto === 'pontos_corridos') return equipesDisponiveisDaFase
    return equipesDisponiveisDaFase.filter((equipe) => equipe.id === equipeA || !equipesJaUsadasNaFase.has(equipe.id))
  }, [tipoConfronto, equipesDisponiveisDaFase, equipesJaUsadasNaFase, equipeA])

  const opcoesEquipeB = useMemo(() => {
    if (tipoConfronto === 'pontos_corridos') return equipesDisponiveisDaFase
    return equipesDisponiveisDaFase.filter(
      (equipe) => equipe.id === equipeB || (equipe.id !== equipeA && !equipesJaUsadasNaFase.has(equipe.id)),
    )
  }, [tipoConfronto, equipesDisponiveisDaFase, equipesJaUsadasNaFase, equipeA, equipeB])

  const confrontosPorFase = useMemo<FiltroConfrontos[]>(() => {
    return fases.map((fase) => ({
      fase,
      jogos: jogos
        .filter((jogo) => (jogo.fase_id || '') === fase.id)
        .map((jogo) => ({
          ...jogo,
          equipes: jogoEquipes
            .filter((item) => item.jogo_id === jogo.id)
            .map((item) => mapaEquipes.get(item.campeonato_equipe_id))
            .filter(Boolean) as EquipeItem[],
        })),
    }))
  }, [fases, jogos, jogoEquipes, mapaEquipes])

  async function criarFase() {
    const nome = novaFase.trim()
    if (!nome) {
      toast.error('Digite o nome da fase')
      return
    }

    setSalvando(true)
    try {
      const proximaOrdem = (fases[fases.length - 1]?.ordem || 0) + 1
      const { data: faseCriada, error } = await supabase
        .from('campeonato_fases')
        .insert({ campeonato_id: campeonatoId, nome, ordem: proximaOrdem })
        .select('id')
        .single()

      if (error) throw error

      const { error: errorV2 } = await supabase.from('campeonato_fases_v2').insert({
        campeonato_id: campeonatoId,
        nome,
        ordem: proximaOrdem,
        tipo_fase: novoTipoFase,
        status: 'rascunho',
      })

      if (errorV2) console.error('Erro fase_v2:', errorV2)

      toast.success('Fase criada')
      setNovaFase('')
      setNovoTipoFase('mata_mata')
      setShowNovaFase(false)
      if (faseCriada?.id) setFaseSelecionada(faseCriada.id)
      await carregar()
    } catch (error: any) {
      console.error('Erro ao criar fase:', error)
      toast.error(getErrorMessage(error, 'Erro ao criar fase'))
    } finally {
      setSalvando(false)
    }
  }

  async function inserirJogo(equipeAId: string, equipeBId: string, ordemAtual?: number) {
    const equipeAObj = equipeAId ? mapaEquipes.get(equipeAId) : null
    const equipeBObj = equipeBId ? mapaEquipes.get(equipeBId) : null
    const jogosDaFase = jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada)
    const numeroConfronto = ordemAtual || jogosDaFase.length + 1
    const md = Number(melhorDe || 1)
    const configuracao = { tipo: tipoConfronto, melhor_de: md, quedas: md }

    const nomePadrao =
      equipeAObj && equipeBObj
        ? `${getEquipeNome(equipeAObj)} x ${getEquipeNome(equipeBObj)}`
        : `Confronto ${String(numeroConfronto).padStart(2, '0')}`

    const payloadJogo: Record<string, any> = {
      campeonato_id: campeonatoId,
      fase_id: faseSelecionada,
      nome: nomeConfronto.trim() || nomePadrao,
      nome_bloco: `CONFRONTO ${String(numeroConfronto).padStart(2, '0')}`,
      quantidade_partidas: md,
      quedas: criarPayloadQuedas(md),
      configuracao,
      observacoes: JSON.stringify(configuracao),
      ordem: numeroConfronto,
      rodada: numeroConfronto,
    }

    if (dataJogo) payloadJogo.data_jogo = dataJogo
    if (horaJogo) payloadJogo.hora_jogo = horaJogo
    if (dataJogo && horaJogo) payloadJogo.data_hora = `${dataJogo}T${horaJogo}:00`

    const { data: jogoCriado, error: jogoError } = await supabase
      .from('jogos')
      .insert(payloadJogo)
      .select('id, fase_id, grupo_id')
      .single()

    if (jogoError) throw jogoError
    if (!jogoCriado?.id) throw new Error('Não foi possível criar o confronto')

    const vinculos = [equipeAId, equipeBId]
      .filter(Boolean)
      .map((campeonatoEquipeId) => ({
        jogo_id: jogoCriado.id,
        campeonato_id: campeonatoId,
        fase_id: jogoCriado.fase_id || faseSelecionada,
        grupo_id: jogoCriado.grupo_id || null,
        campeonato_equipe_id: campeonatoEquipeId,
      }))

    if (vinculos.length > 0) {
      const { error: equipesError } = await supabase.from('jogo_equipes').insert(vinculos)
      if (equipesError) throw equipesError
    }
  }

  async function criarConfrontoIndividual() {
    if (!faseSelecionada) {
      toast.error('Selecione uma fase')
      return
    }

    setSalvando(true)
    try {
      await inserirJogo('', '')
      toast.success('Confronto adicionado')
      setNomeConfronto('')
      setEquipeA('')
      setEquipeB('')
      setDataJogo('')
      setHoraJogo('19:00')
      setMelhorDe('1')
      await carregar()
    } catch (error: any) {
      console.error('Erro ao adicionar confronto:', error)
      toast.error(getErrorMessage(error, 'Erro ao adicionar confronto'))
    } finally {
      setSalvando(false)
    }
  }

  async function gerarPontosCorridos() {
    if (!faseSelecionada) {
      toast.error('Selecione uma fase')
      return
    }
    if (equipes.length < 2) {
      toast.error('É preciso ter pelo menos 2 equipes')
      return
    }

    const confirmar = window.confirm('Gerar todos os confrontos entre todas as equipes dessa fase?')
    if (!confirmar) return

    setSalvando(true)
    try {
      const jogosDaFase = jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada)
      let ordemAtual = jogosDaFase.length + 1
      for (let i = 0; i < equipes.length; i += 1) {
        for (let j = i + 1; j < equipes.length; j += 1) {
          await inserirJogo(equipes[i].id, equipes[j].id, ordemAtual)
          ordemAtual += 1
        }
      }
      toast.success('Confrontos gerados')
      setShowNovoConfronto(false)
      await carregar()
    } catch (error: any) {
      console.error('Erro ao gerar pontos corridos:', error)
      toast.error(getErrorMessage(error, 'Erro ao gerar pontos corridos'))
    } finally {
      setSalvando(false)
    }
  }

  async function gerarConfrontosAutomaticamente() {
    if (!faseSelecionada) {
      toast.error('Selecione uma fase')
      return
    }
    if (equipesDisponiveisDaFase.length < 2) {
      toast.error('É preciso ter pelo menos 2 equipes')
      return
    }

    setSalvando(true)
    try {
      const lista = embaralharLista(equipesDisponiveisDaFase.filter((equipe) => !equipesJaUsadasNaFase.has(equipe.id)))
      const jogosDaFase = jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada)
      let ordemAtual = jogosDaFase.length + 1

      for (let i = 0; i + 1 < lista.length; i += 2) {
        await inserirJogo(lista[i].id, lista[i + 1].id, ordemAtual)
        ordemAtual += 1
      }

      toast.success('Confrontos gerados')
      setShowNovoConfronto(false)
      await carregar()
    } catch (error: any) {
      console.error('Erro ao gerar confrontos:', error)
      toast.error(getErrorMessage(error, 'Erro ao gerar confrontos'))
    } finally {
      setSalvando(false)
    }
  }

  async function excluirConfronto(jogoId: string) {
    const confirmar = window.confirm('Deseja excluir este confronto?')
    if (!confirmar) return

    setSalvando(true)
    try {
      await supabase.from('jogo_equipes').delete().eq('jogo_id', jogoId)
      const { error } = await supabase.from('jogos').delete().eq('id', jogoId)
      if (error) throw error
      toast.success('Confronto excluído')
      await carregar()
    } catch (error: any) {
      console.error('Erro ao excluir confronto:', error)
      toast.error(getErrorMessage(error, 'Erro ao excluir confronto'))
    } finally {
      setSalvando(false)
    }
  }

  async function atualizarJogo(jogoId: string, payload: Record<string, any>) {
    const { error } = await supabase.from('jogos').update(payload).eq('id', jogoId)
    if (error) {
      toast.error(getErrorMessage(error, 'Erro ao atualizar confronto'))
      return
    }
    await carregar()
  }

  async function atualizarEquipeDoJogo(jogo: ConfrontoComEquipes, indice: number, novoCampeonatoEquipeId: string) {
    const vinculadas = jogoEquipes.filter((item) => item.jogo_id === jogo.id)
    const vinculo = vinculadas[indice]
    if (!vinculo) return

    const { error } = await supabase
      .from('jogo_equipes')
      .update({ campeonato_equipe_id: novoCampeonatoEquipeId })
      .eq('id', vinculo.id)

    if (error) {
      toast.error(getErrorMessage(error, 'Erro ao alterar equipe'))
      return
    }
    await carregar()
  }

  async function atualizarMd(jogo: ConfrontoComEquipes, valor: string) {
    const md = Number(valor || 1)
    const configuracao = {
      ...(typeof jogo.configuracao === 'object' && jogo.configuracao ? jogo.configuracao : {}),
      melhor_de: md,
      quedas: md,
    }

    await atualizarJogo(jogo.id, {
      quantidade_partidas: md,
      quedas: criarPayloadQuedas(md),
      configuracao,
      observacoes: JSON.stringify(configuracao),
    })
  }

  async function atualizarData(jogo: ConfrontoComEquipes, data: string) {
    const hora = formatarHoraInput(jogo) || horaJogo || '19:00'
    await atualizarJogo(jogo.id, {
      data_jogo: data || null,
      data_hora: data ? `${data}T${hora}:00` : null,
    })
  }

  async function atualizarHora(jogo: ConfrontoComEquipes, hora: string) {
    const data = formatarDataInput(jogo)
    await atualizarJogo(jogo.id, {
      hora_jogo: hora || null,
      data_hora: data && hora ? `${data}T${hora}:00` : null,
    })
  }

  return (
    <div className="space-y-5">
      <div className={classNamePainel(true)}>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-black uppercase tracking-[0.08em] text-[#142340]">Confrontos</div>
            <p className="mt-2 text-sm font-semibold text-zinc-500">Edite equipe, data, horário e MD direto na linha do confronto.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setShowNovaFase((valor) => !valor)} className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340] hover:bg-[#f3f3ef]">
              <Plus size={14} /> Nova fase
            </button>
            <button type="button" onClick={() => setShowNovoConfronto((valor) => !valor)} className="inline-flex h-11 items-center justify-center gap-2 border border-red-600 bg-red-600 px-5 text-[11px] font-black uppercase tracking-[0.14em] text-white hover:brightness-95">
              <Plus size={14} /> Adicionar confronto
            </button>
            <button type="button" onClick={carregar} className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340] hover:bg-[#f3f3ef]">
              <RefreshCcw size={14} /> Atualizar
            </button>
          </div>
        </div>

        {showNovaFase ? (
          <div className="mb-5 border border-zinc-200 bg-[#eceee5] p-4">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-[#142340]">Nova fase</div>
            <div className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
              <input value={novaFase} onChange={(e) => setNovaFase(e.target.value)} placeholder="Ex: Rodada 1, Semifinal, Final..." className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none" />
              <select value={novoTipoFase} onChange={(e) => setNovoTipoFase(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none">
                <option value="mata_mata">Mata-mata</option>
                <option value="dupla_eliminacao">Dupla eliminação</option>
                <option value="pontos_corridos">Pontos corridos</option>
              </select>
              <button type="button" onClick={criarFase} disabled={salvando} className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] hover:bg-[#2563eb] disabled:opacity-60">
                <Plus size={14} /> Criar fase
              </button>
            </div>
          </div>
        ) : null}

        {showNovoConfronto ? (
          <div className="mb-5 border border-zinc-200 bg-[#eceee5] p-4">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-[#142340]">Adicionar confronto</div>
            <div className="grid gap-3 md:grid-cols-3">
              <select value={faseSelecionada} onChange={(e) => setFaseSelecionada(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none">
                <option value="">Selecione a fase</option>
                {fases.map((fase) => (
                  <option key={fase.id} value={fase.id}>{fase.nome || 'Fase'} • {getTipoLabel(fase.tipo_fase)}</option>
                ))}
              </select>
              <select value={tipoConfronto} onChange={(e) => setTipoConfronto(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none">
                <option value="mata_mata">Mata-mata</option>
                <option value="dupla_eliminacao">Dupla eliminação</option>
                <option value="pontos_corridos">Pontos corridos</option>
              </select>
              <input value={nomeConfronto} onChange={(e) => setNomeConfronto(e.target.value)} placeholder="Nome do confronto (opcional)" className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none" />
            </div>

            {tipoConfronto !== 'pontos_corridos' ? (
              <>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_34px_1fr] md:items-center">
                  <select value={equipeA} onChange={(e) => { setEquipeA(e.target.value); if (e.target.value === equipeB) setEquipeB('') }} className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none">
                    <option value="">Equipe 1</option>
                    {opcoesEquipeA.map((equipe) => (
                      <option key={equipe.id} value={equipe.id}>{getEquipeNome(equipe)}{getEquipeTag(equipe) ? ` • ${getEquipeTag(equipe)}` : ''}</option>
                    ))}
                  </select>
                  <div className="hidden text-center text-2xl font-black text-[#142340] md:block">X</div>
                  <select value={equipeB} onChange={(e) => setEquipeB(e.target.value)} className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none">
                    <option value="">Equipe 2</option>
                    {opcoesEquipeB.map((equipe) => (
                      <option key={equipe.id} value={equipe.id}>{getEquipeNome(equipe)}{getEquipeTag(equipe) ? ` • ${getEquipeTag(equipe)}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <input type="date" value={dataJogo} onChange={(e) => setDataJogo(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none" />
                  <input type="time" value={horaJogo} onChange={(e) => setHoraJogo(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none" />
                  <select value={melhorDe} onChange={(e) => setMelhorDe(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none">
                    <option value="1">MD1</option>
                    <option value="3">MD3</option>
                    <option value="5">MD5</option>
                    <option value="7">MD7</option>
                  </select>
                </div>
                <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">MD define automaticamente a quantidade de quedas.</div>
              </>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {tipoConfronto === 'pontos_corridos' ? (
                <button type="button" onClick={gerarPontosCorridos} disabled={salvando} className="inline-flex h-12 items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white hover:brightness-95 disabled:opacity-60">
                  <ListOrdered size={14} /> Gerar todos os confrontos
                </button>
              ) : (
                <button type="button" onClick={criarConfrontoIndividual} disabled={salvando} className="inline-flex h-12 items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white hover:brightness-95 disabled:opacity-60">
                  <Swords size={14} /> Criar confronto
                </button>
              )}
              {tipoConfronto !== 'pontos_corridos' ? (
                <button type="button" onClick={gerarConfrontosAutomaticamente} disabled={salvando} className="inline-flex h-12 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] hover:bg-[#f3f3ef] disabled:opacity-60">
                  <Shuffle size={14} /> Gerar automático
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="border border-dashed border-zinc-200 bg-white p-8 text-center text-sm font-semibold text-zinc-500">Carregando confrontos...</div>
        ) : confrontosPorFase.length === 0 ? (
          <div className="border border-dashed border-zinc-200 bg-white p-8 text-center text-sm font-semibold text-zinc-500">Nenhuma fase criada ainda.</div>
        ) : (
          <div className="space-y-5">
            {confrontosPorFase.map(({ fase, jogos: jogosDaFase }) => {
              const IconeFase = iconeTipo(fase.tipo_fase)
              return (
                <div key={fase.id} className="overflow-hidden border border-zinc-200 bg-white">
                  <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-[#eceee5] px-4 py-4">
                    <IconeFase size={17} className="text-[#142340]" />
                    <div className="text-base font-black uppercase tracking-[0.08em] text-[#142340]">{fase.nome || 'Fase'}</div>
                    <span className={`inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#142340] ${getTipoBadgeClass(fase.tipo_fase)}`}>{getTipoLabel(fase.tipo_fase)}</span>
                  </div>

                  {jogosDaFase.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100"><CalendarDays size={19} className="text-zinc-500" /></div>
                      <div className="text-sm font-bold text-[#142340]">Nenhum confronto adicionado</div>
                      <p className="mt-1 text-sm text-zinc-500">Clique em “Adicionar confronto” para criar o primeiro.</p>
                      <button type="button" onClick={() => { setFaseSelecionada(fase.id); setTipoConfronto(fase.tipo_fase || 'mata_mata'); setShowNovoConfronto(true) }} className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#142340]"><Plus size={14} /> Adicionar confronto</button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="grid min-w-[980px] grid-cols-[60px_230px_70px_230px_170px_130px_120px_70px] border-b border-zinc-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
                        <div>#</div><div>Equipe 1</div><div className="text-center">Placar</div><div>Equipe 2</div><div>Data</div><div>Horário</div><div>Formato</div><div></div>
                      </div>

                      {jogosDaFase.map((jogo, index) => {
                        const equipe1 = jogo.equipes?.[0] || null
                        const equipe2 = jogo.equipes?.[1] || null
                        const melhorDeTexto = jogo.configuracao?.melhor_de || jogo.quantidade_partidas || 1
                        const resultadoTexto = calcularResultadoTexto(jogo)

                        return (
                          <div key={jogo.id} className="grid min-w-[980px] grid-cols-[60px_230px_70px_230px_170px_130px_120px_70px] items-center border-b border-zinc-200 px-4 py-4 last:border-b-0">
                            <div className="text-sm font-semibold text-[#142340]">{String(jogo.ordem || jogo.numero || index + 1).padStart(2, '0')}</div>

                            <div className="flex items-center gap-2">
                              <EquipeLogo equipe={equipe1} />
                              <select value={equipe1?.id || ''} onChange={(e) => atualizarEquipeDoJogo(jogo, 0, e.target.value)} className="h-11 min-w-0 flex-1 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] outline-none">
                                <option value="">Equipe 1</option>
                                {equipes.map((equipe) => <option key={equipe.id} value={equipe.id}>{getEquipeNome(equipe)}</option>)}
                              </select>
                            </div>

                            <div className="text-center text-xl font-black text-[#142340]">{resultadoTexto}</div>

                            <div className="flex items-center gap-2">
                              <EquipeLogo equipe={equipe2} />
                              <select value={equipe2?.id || ''} onChange={(e) => atualizarEquipeDoJogo(jogo, 1, e.target.value)} className="h-11 min-w-0 flex-1 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340] outline-none">
                                <option value="">Equipe 2</option>
                                {equipes.map((equipe) => <option key={equipe.id} value={equipe.id}>{getEquipeNome(equipe)}</option>)}
                              </select>
                            </div>

                            <div className="flex h-11 items-center gap-2 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340]"><CalendarDays size={15} /><input type="date" value={formatarDataInput(jogo)} onChange={(e) => atualizarData(jogo, e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" /></div>
                            <div className="flex h-11 items-center gap-2 border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#142340]"><Clock3 size={15} /><input type="time" value={formatarHoraInput(jogo)} onChange={(e) => atualizarHora(jogo, e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" /></div>
                            <select value={String(melhorDeTexto)} onChange={(e) => atualizarMd(jogo, e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-black uppercase text-[#142340] outline-none">
                              <option value="1">MD1</option>
                              <option value="3">MD3</option>
                              <option value="5">MD5</option>
                              <option value="7">MD7</option>
                            </select>
                            <button type="button" onClick={() => excluirConfronto(jogo.id)} title="Excluir confronto" className="inline-flex h-10 w-10 items-center justify-center text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                          </div>
                        )
                      })}

                      <button type="button" onClick={() => { setFaseSelecionada(fase.id); setTipoConfronto(fase.tipo_fase || 'mata_mata'); setShowNovoConfronto(true) }} className="flex h-14 min-w-[980px] items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 hover:bg-zinc-50"><Plus size={14} /> Adicionar confronto</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
