'use client'

import { useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Loader2, Plus, Trash2, Swords, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTipoVisual } from '@/lib/getTipoVisual'
import { usePerfil } from '@/app/contexts/PerfilContext'
import {
  TipoCompeticao,
  TIPOS_COMPETICAO,
} from '@/app/campeonatos/components/tiposCompeticao'

type Props = { tipo: TipoCompeticao }

type GrupoEstrutura = {
  nome: string
  quantidade_equipes: string
  numero_partidas: string
  classificam: string
  dia_jogo: string
  hora_jogo: string
  intervalo_minutos: string
  mapas: string[]
}

type FaseEstrutura = {
  nome: string
  grupos: GrupoEstrutura[]
}

const OPCOES_SERVIDOR = [
  'Brasil (BR)',
  'Latam (LATAM)',
  'América do Norte (NA)',
  'Estados Unidos (US)',
  'América do Sul (SAC)',
  'Europa (EU)',
  'Oriente Médio e África (MEA)',
  'Índia (IND)',
  'Paquistão (PK)',
  'Bangladesh (BD)',
  'Tailândia (TH)',
  'Vietnã (VN)',
  'Indonésia (ID)',
  'Taiwan (TW)',
  'Singapura (SG)',
  'Comunidade dos Estados Independentes (CIS)',
]

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function FormCriacaoTipo({ tipo }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { perfilAtivo, tipoPerfil, produtoras } = usePerfil()

  const xtreinoViaQuery = searchParams.get('xtreino') === '1'
  const xtreinoModoViaQuery = String(searchParams.get('modo') || '').trim().toLowerCase()
  const produtoraIdViaQuery = String(searchParams.get('produtoraId') || '').trim()
  const isXtreinoContext = tipo === 'xtreino' || xtreinoViaQuery

  const meta = useMemo(
    () => TIPOS_COMPETICAO.find((item) => item.slug === tipo),
    [tipo]
  )

  const visual = getTipoVisual(tipo)
  const tipoRuntime = String(tipo)
  const isConfronto = tipoRuntime === 'confronto' || tipoRuntime === '4x4'
  const isCopa = tipo === 'copa'
  const isLiga = tipo === 'liga'
  const isXtreino = tipo === 'xtreino'
  const isDiario = tipo === 'diario'
  const mostrarBlocoConfiguracoes = tipo !== 'copa'
  const tituloTela = isXtreinoContext ? 'XTREINO' : meta?.titulo
  const subtituloTela = isXtreinoContext
    ? xtreinoModoViaQuery === 'mata_mata'
      ? 'Criação de xtreino no formato mata-mata usando o formulário da copa.'
      : xtreinoModoViaQuery === 'pontos_corridos'
        ? 'Criação de xtreino no formato pontos corridos usando o formulário da liga.'
        : meta?.subtitulo
    : meta?.subtitulo

  const produtoraResolvida = useMemo(() => {
    if (produtoraIdViaQuery && produtoras?.length) {
      const encontrada = produtoras.find((item) => item.id === produtoraIdViaQuery)
      if (encontrada) return encontrada
    }

    if (tipoPerfil === 'produtora' && perfilAtivo?.id) {
      return perfilAtivo
    }

    if (produtoras?.length) {
      return produtoras[0]
    }

    return null
  }, [tipoPerfil, perfilAtivo, produtoras, produtoraIdViaQuery])

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [openServidor, setOpenServidor] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [bannerPreview, setBannerPreview] = useState('')

  const [form, setForm] = useState({
    nome: '',
    edicao: '1',
    valor_vaga: '0',
    valor_premiacao: '0',
    vagas: isConfronto ? '2' : '12',
    plataforma: 'Mobile',
    categoria: isConfronto ? 'Squad' : 'Squad',
    regiao: 'Brasil (BR)',
    data_inicio: '',
    modo_jogo: isConfronto ? 'CS' : 'Battle Royale',
    quantidade_quedas: isConfronto ? '1' : '6',
    equipes_por_jogo: isConfronto ? '2' : '12',
    quantidade_rodadas: tipo === 'liga' ? '5' : '1',
    criterio_desempate: 'abates',
    melhor_de: '1',
    rounds_por_lado: isConfronto ? '6' : '0',
    troca_de_lado: 'sim',
    sala_aberta: 'nao',
    vale_ranking: 'nao',
    terceiro_lugar: 'nao',
    pontos_por_abate: '1',
    formato_chave: 'mata_mata_simples',
    sistema_pontos_tipo: 'padrao',

    modo_confronto: '4x4',
    estilo_confronto: 'ump',
    formato_evento: 'mata_mata',
    tem_prorrogacao: 'nao',
    tipo_mapa: 'fixo',
    mapa_padrao: 'BERMUDA',
    ida_e_volta: 'nao',
    pontuacao_vitoria: '3',
    pontuacao_derrota: '0',
    usa_upper_lower: 'sim',
    reset_final: 'nao',
    numero_grupos: '2',
    classificados_por_grupo: '2',
    admin_mode: 'manual',
    regra_wo: 'derrota_simples',

    xtreino_modo: xtreinoModoViaQuery || 'jogo_unico',
    xtreino_regra: 'trocacao_livre',
    xtreino_tipo_inscricao: 'gratuito',
    xtreino_tem_premiacao: 'nao',
  })

  const [fasesEstrutura, setFasesEstrutura] = useState<FaseEstrutura[]>([
    {
      nome: 'Fase 1',
      grupos: [
        {
          nome: 'Grupo A',
          quantidade_equipes: form.vagas || '12',
          numero_partidas: '4',
          classificam: '1',
          dia_jogo: '',
          hora_jogo: '',
          intervalo_minutos: '15',
          mapas: ['BERMUDA', 'PURGATÓRIO', 'ALPINE', 'KALAHARI'],
        },
      ],
    },
  ])

  const xtreinoEhJogoUnico = isXtreinoContext && form.xtreino_modo === 'jogo_unico'
  const xtreinoEhMataMata = isXtreinoContext && form.xtreino_modo === 'mata_mata'
  const xtreinoEhPontosCorridos =
    isXtreinoContext && form.xtreino_modo === 'pontos_corridos'
  const exibirEstruturaCompetitiva = xtreinoEhMataMata || xtreinoEhPontosCorridos

  function update<K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function adicionarFaseEstrutura() {
    setFasesEstrutura((prev) => [
      ...prev,
      {
        nome: `Fase ${prev.length + 1}`,
        grupos: [
          {
            nome: 'Grupo A',
            quantidade_equipes: form.vagas || '12',
            numero_partidas: '4',
            classificam: '1',
            dia_jogo: '',
            hora_jogo: '',
            intervalo_minutos: '15',
            mapas: ['BERMUDA', 'PURGATÓRIO', 'ALPINE', 'KALAHARI'],
          },
        ],
      },
    ])
  }

  function removerFaseEstrutura(index: number) {
    setFasesEstrutura((prev) => prev.filter((_, i) => i !== index))
  }

  function atualizarNomeFase(index: number, value: string) {
    setFasesEstrutura((prev) =>
      prev.map((fase, i) => (i === index ? { ...fase, nome: value } : fase))
    )
  }

  function adicionarGrupoEstrutura(faseIndex: number) {
    setFasesEstrutura((prev) =>
      prev.map((fase, i) => {
        if (i !== faseIndex) return fase
        const letra = String.fromCharCode(65 + fase.grupos.length)
        return {
          ...fase,
          grupos: [
            ...fase.grupos,
            {
              nome: `Grupo ${letra}`,
              quantidade_equipes: form.vagas || '12',
              numero_partidas: '4',
              classificam: '1',
              dia_jogo: '',
              hora_jogo: '',
              intervalo_minutos: '15',
              mapas: ['BERMUDA', 'PURGATÓRIO', 'ALPINE', 'KALAHARI'],
            },
          ],
        }
      })
    )
  }

  function removerGrupoEstrutura(faseIndex: number, grupoIndex: number) {
    setFasesEstrutura((prev) =>
      prev.map((fase, i) => {
        if (i !== faseIndex) return fase
        return { ...fase, grupos: fase.grupos.filter((_, gi) => gi !== grupoIndex) }
      })
    )
  }

  function atualizarGrupoEstrutura(
    faseIndex: number,
    grupoIndex: number,
    field: keyof GrupoEstrutura,
    value: string | string[]
  ) {
    setFasesEstrutura((prev) =>
      prev.map((fase, i) => {
        if (i !== faseIndex) return fase
        return {
          ...fase,
          grupos: fase.grupos.map((grupo, gi) =>
            gi === grupoIndex ? { ...grupo, [field]: value } : grupo
          ),
        }
      })
    )
  }

  async function uploadImagemCampeonato(file: File, pasta: 'logos' | 'banners') {
    const extensao = file.name.split('.').pop()?.toLowerCase() || 'png'
    const nomeArquivo = `${tipo}/${pasta}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`

    const { error: uploadError } = await supabase.storage
      .from('imagem_campeonatos')
      .upload(nomeArquivo, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('imagem_campeonatos')
      .getPublicUrl(nomeArquivo)

    return data.publicUrl
  }

  function extrairMensagemErro(err: any) {
    if (!err) return 'Erro ao criar campeonato.'
    if (typeof err === 'string') return err
    if (err.message) return err.message
    if (err.error_description) return err.error_description
    if (err.details) return err.details
    if (err.hint) return err.hint
    try {
      return JSON.stringify(err)
    } catch {
      return 'Erro ao criar campeonato.'
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!form.nome.trim()) {
      setErro('Informe o nome do campeonato.')
      return
    }

    if (!produtoraResolvida?.id) {
      setErro('Para criar campeonato, selecione ou acesse uma produtora.')
      return
    }

    if (exibirEstruturaCompetitiva) {
      if (fasesEstrutura.length === 0) {
        setErro('Adicione pelo menos uma fase.')
        return
      }

      const estruturaInvalida = fasesEstrutura.some(
        (fase) =>
          !String(fase.nome || '').trim() ||
          fase.grupos.length === 0 ||
          fase.grupos.some(
            (grupo) =>
              !String(grupo.nome || '').trim() ||
              !String(grupo.quantidade_equipes || '').trim() ||
              !String(grupo.numero_partidas || '').trim()
          )
      )

      if (estruturaInvalida) {
        setErro('Preencha corretamente as fases e grupos antes de criar o xtreino.')
        return
      }
    }

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) {
        throw new Error('Usuário não autenticado para criar campeonato.')
      }

      let logoUrl: string | null = null
      let bannerUrl: string | null = null

      if (logoFile) {
        logoUrl = await uploadImagemCampeonato(logoFile, 'logos')
      }

      if (bannerFile) {
        bannerUrl = await uploadImagemCampeonato(bannerFile, 'banners')
      }

      const quantidadeQuedasPayload =
        isConfronto
          ? 1
          : isCopa
            ? 0
            : isXtreino && xtreinoEhMataMata
              ? 0
              : Number(form.quantidade_quedas || 0)

      const equipesPorJogoPayload =
        isCopa || (isXtreino && xtreinoEhMataMata)
          ? 0
          : Number(form.equipes_por_jogo || 0)

      const valorVaga =
        isXtreino && form.xtreino_tipo_inscricao === 'gratuito'
          ? 0
          : Number(form.valor_vaga || 0)

      const valorPremiacao =
        isXtreino && form.xtreino_tem_premiacao !== 'sim'
          ? 0
          : Number(form.valor_premiacao || 0)

      const modeloCompeticao =
        isCopa ? 'copa' :
        isLiga ? 'liga' :
        isDiario ? 'diario' :
        isXtreino ? 'xtreino' :
        meta?.modelo

      const modoXtreinoFinal = isXtreinoContext
        ? (xtreinoModoViaQuery || form.xtreino_modo || (isCopa ? 'mata_mata' : isLiga ? 'pontos_corridos' : 'jogo_unico'))
        : form.xtreino_modo

      const tipoCompeticaoFinal = isXtreinoContext ? 'xtreino' : meta?.slug
      const modeloCompeticaoFinal = isXtreinoContext ? 'xtreino' : modeloCompeticao
      const formatoFinal = isXtreinoContext ? 'Xtreino' : meta?.formatoBanco

      const payload: any = {
        produtora_id: produtoraResolvida.id,
        criado_por: user.id,
        nome: form.nome.trim(),
        slug: slugify(`${form.nome}-${meta?.slug}-${Date.now()}`),
        edicao: String(form.edicao || '1'),
        status: 'rascunho',
        jogo: 'Free Fire',
        logo_url: logoUrl,
        banner_url: bannerUrl,
        valor_premiacao: valorPremiacao,
        valor_vaga: valorVaga,
        vagas: Number(form.vagas || 0),
        moeda: 'BRL',
        plataforma: form.plataforma,
        regiao: form.regiao,
        categoria: form.categoria,
        modo_jogo: form.modo_jogo,
        formato: formatoFinal,
        tipo_competicao: tipoCompeticaoFinal,
        modelo_competicao: modeloCompeticaoFinal,
        data_inicio: form.data_inicio
          ? new Date(form.data_inicio).toISOString()
          : null,
        quantidade_quedas: quantidadeQuedasPayload,
        equipes_por_jogo: equipesPorJogoPayload,
        quantidade_rodadas: Number(form.quantidade_rodadas || 0),
        criterio_desempate:
          isLiga || (isXtreino && xtreinoEhPontosCorridos)
            ? null
            : form.criterio_desempate,
        sistema_pontos_tipo:
          tipo === 'liga' || (isXtreino && xtreinoEhPontosCorridos)
            ? form.sistema_pontos_tipo
            : null,
      }

      const { data, error } = await supabase
        .from('campeonatos')
        .insert([payload])
        .select('id')
        .single()

      if (error) {
        throw new Error(`Erro ao salvar campeonato: ${extrairMensagemErro(error)}`)
      }

      if (!data?.id) {
        throw new Error('Não foi possível criar o campeonato.')
      }

      if (isConfronto) {
        const { error: configError } = await supabase
          .from('campeonatos_4x4_config')
          .upsert({
            campeonato_id: data.id,
            modo_confronto: form.modo_confronto,
            estilo_confronto: form.estilo_confronto,
            formato_evento: form.formato_evento,
            melhor_de: Number(form.melhor_de || 1),
            rounds_por_lado: Number(form.rounds_por_lado || 6),
            troca_de_lado: form.troca_de_lado === 'sim',
            admin_mode: form.admin_mode,
            regra_wo: form.regra_wo,
            tem_prorrogacao: form.tem_prorrogacao === 'sim',
            tipo_mapa: form.tipo_mapa,
            mapa_padrao: form.tipo_mapa === 'fixo' ? form.mapa_padrao : null,
            ida_e_volta: form.ida_e_volta === 'sim',
            pontuacao_vitoria: Number(form.pontuacao_vitoria || 3),
            pontuacao_derrota: Number(form.pontuacao_derrota || 0),
            usa_upper_lower:
              form.formato_evento === 'dupla_eliminacao'
                ? form.usa_upper_lower === 'sim'
                : false,
            reset_final:
              form.formato_evento === 'dupla_eliminacao'
                ? form.reset_final === 'sim'
                : false,
            numero_grupos:
              form.formato_evento === 'grupos_playoff'
                ? Number(form.numero_grupos || 0)
                : null,
            classificados_por_grupo:
              form.formato_evento === 'grupos_playoff'
                ? Number(form.classificados_por_grupo || 0)
                : null,
          })

        if (configError) {
          throw new Error(
            `Erro ao salvar configuração do modo: ${extrairMensagemErro(configError)}`
          )
        }
      }

      if (tipo === 'diario') {
        const { error: configError } = await supabase
          .from('campeonatos_diarios_config')
          .upsert({
            campeonato_id: data.id,
            quantidade_quedas: Number(form.quantidade_quedas || 6),
            equipes_por_jogo: Number(form.equipes_por_jogo || 12),
            grupo_unico: false,
            criterio_desempate: form.criterio_desempate,
          })

        if (configError) {
          throw new Error(
            `Erro ao salvar configuração do modo: ${extrairMensagemErro(configError)}`
          )
        }
      }

      if (isXtreinoContext) {
        const { error: configError } = await supabase
          .from('campeonatos_xtreinos_config')
          .upsert({
            campeonato_id: data.id,
            quantidade_quedas: Number(form.quantidade_quedas || 4),
            sala_aberta: form.sala_aberta === 'sim',
            vale_ranking: form.vale_ranking === 'sim',
            pontua: xtreinoEhJogoUnico || xtreinoEhPontosCorridos,
            permite_convidado: true,
            modo_xtreino: modoXtreinoFinal,
            tipo_regra: form.xtreino_regra,
            tipo_inscricao: form.xtreino_tipo_inscricao,
            tem_premiacao: form.xtreino_tem_premiacao === 'sim',
          })

        if (configError) {
          throw new Error(
            `Erro ao salvar configuração do modo: ${extrairMensagemErro(configError)}`
          )
        }

        if (exibirEstruturaCompetitiva) {
          for (let faseIndex = 0; faseIndex < fasesEstrutura.length; faseIndex += 1) {
            const fase = fasesEstrutura[faseIndex]

            const faseSlug = slugify(String(fase.nome || `Fase ${faseIndex + 1}`))

            const { data: faseData, error: faseError } = await supabase
              .from('campeonato_fases')
              .insert({
                campeonato_id: data.id,
                nome: String(fase.nome || `Fase ${faseIndex + 1}`).trim(),
                slug: faseSlug || `fase-${faseIndex + 1}`,
              })
              .select('id')
              .single()

            if (faseError || !faseData?.id) {
              throw new Error(
                `Erro ao salvar fase ${faseIndex + 1}: ${extrairMensagemErro(faseError)}`
              )
            }

            for (let grupoIndex = 0; grupoIndex < fase.grupos.length; grupoIndex += 1) {
              const grupo = fase.grupos[grupoIndex]

              const mapasJson = (grupo.mapas || []).filter(Boolean)
              const dataBase = grupo.dia_jogo && grupo.hora_jogo
                ? new Date(`${grupo.dia_jogo}T${grupo.hora_jogo}:00`).toISOString()
                : null

              const { data: grupoData, error: grupoError } = await supabase
                .from('campeonato_grupos')
                .insert({
                  campeonato_id: data.id,
                  fase_id: faseData.id,
                  nome: String(grupo.nome || `Grupo ${grupoIndex + 1}`).trim(),
                  slug: slugify(String(grupo.nome || `Grupo ${grupoIndex + 1}`)),
                  quantidade_equipes: Number(grupo.quantidade_equipes || 0),
                  qtd_slots: Number(grupo.quantidade_equipes || 0),
                  qtd_quedas: Number(grupo.numero_partidas || 0),
                  classificam: Number(grupo.classificam || 0),
                  horario_inicio: grupo.hora_jogo || null,
                  intervalo_minutos: undefined,
                  mapas: mapasJson,
                  ordem: grupoIndex + 1,
                  configuracao: {
                    dia_jogo: grupo.dia_jogo || null,
                    hora_jogo: grupo.hora_jogo || null,
                    intervalo_minutos: Number(grupo.intervalo_minutos || 15),
                    numero_partidas: Number(grupo.numero_partidas || 0),
                  },
                  status: 'rascunho',
                } as any)
                .select('id')
                .single()

              if (grupoError || !grupoData?.id) {
                throw new Error(
                  `Erro ao salvar grupo ${grupo.nome || grupoIndex + 1}: ${extrairMensagemErro(grupoError)}`
                )
              }

              const qtdSlots = Number(grupo.quantidade_equipes || 0)
              if (qtdSlots > 0) {
                const { error: slotsError } = await supabase.rpc('criar_slots_do_grupo', {
                  p_grupo_id: grupoData.id,
                  p_campeonato_id: data.id,
                  p_fase_id: faseData.id,
                  p_quantidade: qtdSlots,
                })

                if (slotsError) {
                  throw new Error(
                    `Erro ao criar slots do grupo ${grupo.nome}: ${extrairMensagemErro(slotsError)}`
                  )
                }
              }

              const qtdJogos = Number(grupo.numero_partidas || 0)
              if (qtdJogos > 0 && dataBase) {
                const { error: jogosError } = await supabase.rpc('fn_criar_jogos_do_grupo', {
                  p_campeonato_id: data.id,
                  p_grupo_id: grupoData.id,
                  p_qtd_quedas: qtdJogos,
                  p_mapas: mapasJson,
                  p_data_base: dataBase,
                  p_intervalo_minutos: Number(grupo.intervalo_minutos || 15),
                })

                if (jogosError) {
                  throw new Error(
                    `Erro ao criar jogos do grupo ${grupo.nome}: ${extrairMensagemErro(jogosError)}`
                  )
                }
              }
            }
          }
        }
      }

      if (tipo === 'copa') {
        const { error: configError } = await supabase
          .from('campeonatos_copas_config')
          .upsert({
            campeonato_id: data.id,
            melhor_de: 1,
            formato_chave: 'mata_mata_simples',
            quantidade_fases: 0,
            terceiro_lugar: false,
            criterio_desempate: 'abates',
          })

        if (configError) {
          throw new Error(
            `Erro ao salvar configuração do modo: ${extrairMensagemErro(configError)}`
          )
        }
      }

      if (tipo === 'liga') {
        const { error: configError } = await supabase
          .from('campeonatos_ligas_config')
          .upsert({
            campeonato_id: data.id,
            quantidade_rodadas: Number(form.quantidade_rodadas || 1),
            quantidade_quedas: Number(form.quantidade_quedas || 6),
            pontos_por_abate: Number(form.pontos_por_abate || 1),
            sistema_pontos_tipo: form.sistema_pontos_tipo,
          })

        if (configError) {
          throw new Error(
            `Erro ao salvar configuração do modo: ${extrairMensagemErro(configError)}`
          )
        }
      }

      const destino =
        isXtreinoContext
          ? `/campeonatos/xtreinos/${data.id}`
          : tipo === 'copa'
            ? `/campeonatos/copas/${data.id}`
            : tipo === 'liga'
              ? `/campeonatos/ligas/${data.id}`
              : tipo === 'xtreino'
                ? `/campeonatos/xtreinos/${data.id}`
                : isConfronto
                  ? `/confrontos/${data.id}`
                  : `/campeonatos/${data.id}`

      router.push(destino)
    } catch (err: any) {
      console.error('Erro ao criar campeonato:', {
        bruto: err,
        mensagem: extrairMensagemErro(err),
        logoSelecionada: !!logoFile,
        bannerSelecionado: !!bannerFile,
        tipo,
        tipoPerfil,
        produtoraId: produtoraResolvida?.id || null,
      })
      setErro(extrairMensagemErro(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] px-3 py-3 text-[#142340] md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/campeonatos/nova"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400 hover:text-[#7cfc00]"
          >
            <ArrowLeft size={14} /> Voltar
          </Link>

          <div className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
            Perfil ativo: {tipoPerfil}
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#050506]">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(124,252,0,0.12),transparent_30%),linear-gradient(180deg,#0a0a0b_0%,#050506_100%)] p-6 md:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#7cfc00]/30 bg-[#7cfc00]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#7cfc00]">
              <Swords size={12} /> {isXtreinoContext ? 'Flexível' : meta?.badge}
            </div>

            <h1 className={`text-[24px] font-semibold uppercase tracking-tight md:text-[30px] ${visual.text}`}>
              Criar {tituloTela}
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-semibold text-zinc-400">
              {subtituloTela}
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
              {produtoraResolvida ? (
                <>
                  Campeonato será criado automaticamente na produtora:{' '}
                  <span className="font-semibold text-white">
                    {produtoraResolvida.nome || 'Produtora'}
                  </span>
                </>
              ) : (
                <>
                  Você ainda não está vinculado a nenhuma produtora. Crie ou entre
                  em uma produtora para poder criar campeonatos.
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <>
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Logo do {String(tituloTela || 'campeonato').toLowerCase()}
                </span>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f]">
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full cursor-pointer px-4 py-3 text-sm text-zinc-400 file:mr-4 file:border-0 file:bg-[#7cfc00] file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:text-black"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setLogoFile(file)
                      setLogoPreview(file ? URL.createObjectURL(file) : '')
                    }}
                  />

                  {logoPreview ? (
                    <div className="border-t border-white/10 p-3">
                      <img
                        src={logoPreview}
                        alt="Preview da logo"
                        className="h-24 w-24 border border-white/10 object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Banner do {String(tituloTela || 'campeonato').toLowerCase()}
                </span>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f]">
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full cursor-pointer px-4 py-3 text-sm text-zinc-400 file:mr-4 file:border-0 file:bg-[#7cfc00] file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:text-black"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setBannerFile(file)
                      setBannerPreview(file ? URL.createObjectURL(file) : '')
                    }}
                  />

                  {bannerPreview ? (
                    <div className="border-t border-white/10 p-3">
                      <img
                        src={bannerPreview}
                        alt="Preview do banner"
                        className="h-24 w-full border border-white/10 object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Nome
                </span>
                <input
                  value={form.nome}
                  onChange={(e) => update('nome', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Edição
                </span>
                <input
                  value={form.edicao}
                  onChange={(e) => update('edicao', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Vagas
                </span>
                <input
                  type="number"
                  value={form.vagas}
                  onChange={(e) => update('vagas', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Data de início
                </span>
                <input
                  type="datetime-local"
                  value={form.data_inicio}
                  onChange={(e) => update('data_inicio', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Plataforma
                </span>
                <select
                  value={form.plataforma}
                  onChange={(e) => update('plataforma', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                >
                  <option>Mobile</option>
                  <option>Emulador</option>
                  <option>Misto</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Categoria
                </span>
                <select
                  value={form.categoria}
                  onChange={(e) => update('categoria', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                >
                  <option>Squad</option>
                  <option>Duo</option>
                  <option>Solo</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Servidor
                </span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenServidor((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 text-left text-white outline-none"
                  >
                    <span>{form.regiao}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${openServidor ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {openServidor && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10 cursor-default"
                        onClick={() => setOpenServidor(false)}
                      />
                      <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#09090b] p-1 shadow-2xl">
                        {OPCOES_SERVIDOR.map((opcao) => (
                          <button
                            key={opcao}
                            type="button"
                            onClick={() => {
                              update('regiao', opcao)
                              setOpenServidor(false)
                            }}
                            className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                              form.regiao === opcao
                                ? 'bg-[#7cfc00] text-black'
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            {opcao}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </label>

              {isXtreinoContext ? (
                <>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Formato do xtreino
                    </span>
                    <select
                      value={form.xtreino_modo}
                      onChange={(e) => update('xtreino_modo', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="jogo_unico">Jogo Único</option>
                      <option value="mata_mata">Mata-Mata</option>
                      <option value="pontos_corridos">Pontos Corridos</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Regra do treino
                    </span>
                    <select
                      value={form.xtreino_regra}
                      onChange={(e) => update('xtreino_regra', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="trocacao_livre">Trocação Livre</option>
                      <option value="primeira_safe">Primeira Safe</option>
                      <option value="segunda_safe">Segunda Safe</option>
                      <option value="terceira_safe">Terceira Safe</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Inscrição
                    </span>
                    <select
                      value={form.xtreino_tipo_inscricao}
                      onChange={(e) => update('xtreino_tipo_inscricao', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="gratuito">Gratuito</option>
                      <option value="pago">Pago</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Premiação
                    </span>
                    <select
                      value={form.xtreino_tem_premiacao}
                      onChange={(e) => update('xtreino_tem_premiacao', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Valor por vaga
                    </span>
                    <input
                      type="number"
                      value={form.valor_vaga}
                      onChange={(e) => update('valor_vaga', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Premiação
                    </span>
                    <input
                      type="number"
                      value={form.valor_premiacao}
                      onChange={(e) => update('valor_premiacao', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    />
                  </label>
                </>
              )}

              {isXtreinoContext && form.xtreino_tipo_inscricao === 'pago' && (
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                    Valor por vaga
                  </span>
                  <input
                    type="number"
                    value={form.valor_vaga}
                    onChange={(e) => update('valor_vaga', e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                  />
                </label>
              )}

              {isXtreinoContext && form.xtreino_tem_premiacao === 'sim' && (
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                    Valor da premiação
                  </span>
                  <input
                    type="number"
                    value={form.valor_premiacao}
                    onChange={(e) => update('valor_premiacao', e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                  />
                </label>
              )}
            </div>

            </>

            {isConfronto && (
              <div className="mt-8 rounded-[24px] border border-white/10 bg-[#09090b] p-5">
                <div className="mb-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7cfc00]">
                    Configuração do confronto
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">
                    Defina o modo do lobby, o estilo e o formato competitivo do evento.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Modo do confronto
                    </span>
                    <select
                      value={form.modo_confronto}
                      onChange={(e) => update('modo_confronto', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="1x1">1x1</option>
                      <option value="2x2">2x2</option>
                      <option value="2x3">2x3</option>
                      <option value="4x4">4x4</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Estilo
                    </span>
                    <select
                      value={form.estilo_confronto}
                      onChange={(e) => update('estilo_confronto', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="ump">UMP</option>
                      <option value="tatico">Tático</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Formato do evento
                    </span>
                    <select
                      value={form.formato_evento}
                      onChange={(e) => update('formato_evento', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="mata_mata">Mata-mata</option>
                      <option value="dupla_eliminacao">Dupla eliminação</option>
                      <option value="pontos_corridos">Pontos corridos</option>
                      <option value="grupos_playoff">Grupos + playoff</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Melhor de
                    </span>
                    <select
                      value={form.melhor_de}
                      onChange={(e) => update('melhor_de', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="1">BO1</option>
                      <option value="3">BO3</option>
                      <option value="5">BO5</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Rounds por lado
                    </span>
                    <input
                      type="number"
                      value={form.rounds_por_lado}
                      onChange={(e) => update('rounds_por_lado', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Troca de lado
                    </span>
                    <select
                      value={form.troca_de_lado}
                      onChange={(e) => update('troca_de_lado', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Prorrogação
                    </span>
                    <select
                      value={form.tem_prorrogacao}
                      onChange={(e) => update('tem_prorrogacao', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Admin mode
                    </span>
                    <select
                      value={form.admin_mode}
                      onChange={(e) => update('admin_mode', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="manual">Manual</option>
                      <option value="automatico">Automático</option>
                    </select>
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Regra de WO
                    </span>
                    <select
                      value={form.regra_wo}
                      onChange={(e) => update('regra_wo', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="derrota_simples">Derrota simples</option>
                      <option value="eliminacao">Eliminação</option>
                      <option value="reagendar">Permitir reagendamento</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                      Tipo de mapa
                    </span>
                    <select
                      value={form.tipo_mapa}
                      onChange={(e) => update('tipo_mapa', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                    >
                      <option value="fixo">Mapa fixo</option>
                      <option value="veto">Veto de mapas</option>
                    </select>
                  </label>

                  {form.tipo_mapa === 'fixo' && (
                    <label className="space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                        Mapa padrão
                      </span>
                      <select
                        value={form.mapa_padrao}
                        onChange={(e) => update('mapa_padrao', e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                      >
                        <option value="BERMUDA">BERMUDA</option>
                        <option value="PURGATÓRIO">PURGATÓRIO</option>
                        <option value="ALPINE">ALPINE</option>
                        <option value="KALAHARI">KALAHARI</option>
                        <option value="NEXUS">NEXUS</option>
                      </select>
                    </label>
                  )}

                  {form.formato_evento === 'dupla_eliminacao' && (
                    <>
                      <label className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                          Upper / Lower
                        </span>
                        <select
                          value={form.usa_upper_lower}
                          onChange={(e) => update('usa_upper_lower', e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                        >
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                          Reset na final
                        </span>
                        <select
                          value={form.reset_final}
                          onChange={(e) => update('reset_final', e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                        >
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </label>
                    </>
                  )}

                  {form.formato_evento === 'pontos_corridos' && (
                    <>
                      <label className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                          Ida e volta
                        </span>
                        <select
                          value={form.ida_e_volta}
                          onChange={(e) => update('ida_e_volta', e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                        >
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                          Pontuação por vitória
                        </span>
                        <input
                          type="number"
                          value={form.pontuacao_vitoria}
                          onChange={(e) => update('pontuacao_vitoria', e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                          Pontuação por derrota
                        </span>
                        <input
                          type="number"
                          value={form.pontuacao_derrota}
                          onChange={(e) => update('pontuacao_derrota', e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                        />
                      </label>
                    </>
                  )}

                  {form.formato_evento === 'grupos_playoff' && (
                    <>
                      <label className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                          Número de grupos
                        </span>
                        <input
                          type="number"
                          value={form.numero_grupos}
                          onChange={(e) => update('numero_grupos', e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                          Classificados por grupo
                        </span>
                        <input
                          type="number"
                          value={form.classificados_por_grupo}
                          onChange={(e) => update('classificados_por_grupo', e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

            {exibirEstruturaCompetitiva && (
              <div className="space-y-6">
                <div className="rounded-[24px] border border-white/10 bg-[#09090b] p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7cfc00]">
                        Estrutura competitiva
                      </p>
                      <p className="mt-1 text-sm font-semibold text-zinc-500">
                        Monte as fases e grupos abaixo. A criação agora é feita em tela única, sem etapas separadas.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={adicionarFaseEstrutura}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0d0d0f] px-5 text-[11px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:border-[#7cfc00] hover:text-[#7cfc00]"
                    >
                      <Plus size={15} />
                      Adicionar fase
                    </button>
                  </div>

                  <div className="space-y-5">
                    {fasesEstrutura.map((fase, faseIndex) => (
                      <div key={`fase-${faseIndex}`} className="rounded-[24px] border border-white/10 bg-[#0d0d0f] p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                              Nome da fase
                            </label>
                            <input
                              value={fase.nome}
                              onChange={(e) => atualizarNomeFase(faseIndex, e.target.value)}
                              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removerFaseEstrutura(faseIndex)}
                            disabled={fasesEstrutura.length <= 1}
                            className="mt-7 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-zinc-400 transition-colors hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="mb-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => adicionarGrupoEstrutura(faseIndex)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:border-[#7cfc00] hover:text-[#7cfc00]"
                          >
                            <Plus size={14} />
                            Adicionar grupo
                          </button>
                        </div>

                        <div className="space-y-4">
                          {fase.grupos.map((grupo, grupoIndex) => (
                            <div key={`fase-${faseIndex}-grupo-${grupoIndex}`} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7cfc00]">
                                  Grupo {grupoIndex + 1}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removerGrupoEstrutura(faseIndex, grupoIndex)}
                                  disabled={fase.grupos.length <= 1}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-zinc-400 transition-colors hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    Nome do grupo
                                  </span>
                                  <input
                                    value={grupo.nome}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'nome', e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    Quantidade de equipes
                                  </span>
                                  <input
                                    type="number"
                                    value={grupo.quantidade_equipes}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'quantidade_equipes', e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    Número de partidas
                                  </span>
                                  <input
                                    type="number"
                                    value={grupo.numero_partidas}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'numero_partidas', e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    Classificam
                                  </span>
                                  <input
                                    type="number"
                                    value={grupo.classificam}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'classificam', e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    Dia do jogo
                                  </span>
                                  <input
                                    type="date"
                                    value={grupo.dia_jogo}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'dia_jogo', e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    Hora do jogo
                                  </span>
                                  <input
                                    type="time"
                                    value={grupo.hora_jogo}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'hora_jogo', e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                                  />
                                </label>

                                <label className="space-y-2 md:col-span-2">
                                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                    Intervalo entre partidas (min)
                                  </span>
                                  <input
                                    type="number"
                                    value={grupo.intervalo_minutos}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'intervalo_minutos', e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                                  />
                                </label>

                                {Array.from({ length: Number(grupo.numero_partidas || 0) || 0 }).map((_, mapaIndex) => (
                                  <label key={`mapa-${mapaIndex}`} className="space-y-2">
                                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                      Mapa da partida {mapaIndex + 1}
                                    </span>
                                    <select
                                      value={grupo.mapas[mapaIndex] || 'BERMUDA'}
                                      onChange={(e) => {
                                        const mapasAtualizados = [...grupo.mapas]
                                        mapasAtualizados[mapaIndex] = e.target.value
                                        atualizarGrupoEstrutura(faseIndex, grupoIndex, 'mapas', mapasAtualizados)
                                      }}
                                      className="w-full rounded-2xl border border-white/10 bg-[#0d0d0f] px-4 py-3 outline-none"
                                    >
                                      <option value="BERMUDA">BERMUDA</option>
                                      <option value="PURGATÓRIO">PURGATÓRIO</option>
                                      <option value="ALPINE">ALPINE</option>
                                      <option value="KALAHARI">KALAHARI</option>
                                      <option value="NEXUS">NEXUS</option>
                                    </select>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {erro ? (
              <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                {erro}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs font-semibold text-zinc-500">
                {isXtreinoContext
                  ? exibirEstruturaCompetitiva
                    ? 'Preencha os dados e revise as fases e grupos antes de criar o xtreino.'
                    : 'No xtreino, você escolhe o formato primeiro. Jogo único reaproveita a lógica do diário.'
                  : isConfronto
                    ? 'Esse formulário já salva os dados base do campeonato e toda a configuração inicial do confronto.'
                    : 'Esse formulário já salva os dados base do campeonato e a config inicial do modo.'}
              </p>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <button
                  type="submit"
                  disabled={loading || !produtoraResolvida?.id}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7cfc00] px-6 text-sm font-black uppercase tracking-[0.18em] text-black transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Trophy size={16} />}
                  {`Criar ${tituloTela}`}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
