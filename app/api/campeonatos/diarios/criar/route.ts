import { NextResponse } from 'next/server'
import {
  getServerSupabaseClient,
  getUserFromBearerToken,
} from '@/lib/supabaseAdmin'

type GrupoPayload = {
  nome?: string
  horario_inicio?: string
  horario_fim?: string | null
  premiacao?: number | null
  valor_inscricao?: number | null
  qtd_slots?: number | null
  qtd_quedas?: number | null
  mapas?: string[] | null
  ordem?: number | null
  intervalo_minutos?: number | null
}

type ConfigPayload = {
  valor_inscricao?: number | null
  premiacao?: number | null
  vagas_por_jogo?: number | null
  quedas?: number | null
  intervalo_minutos?: number | null
}

type Body = {
  is_xtreino?: boolean
  xtreino_modo?: string | null
  xtreino_tipo_regra?: string | null
  xtreino_tipo_inscricao?: string | null
  xtreino_tem_premiacao?: boolean | null
  produtora_id?: string | null
  nome?: string
  edicao?: string | number | null
  valor_vaga?: number | null
  valor_premiacao?: number | null
  vagas?: number | null
  data_inicio?: string | null
  plataforma?: string | null
  categoria?: string | null
  regiao?: string | null
  servidor?: string | null
  banner_url?: string | null
  logo_url?: string | null
  banner?: string | null
  logo?: string | null
  quantidade_quedas?: number | null
  equipes_por_jogo?: number | null
  intervalo_minutos?: number | null
  grupos?: GrupoPayload[]
  horarios?: string[]
  config?: ConfigPayload | null
}

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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return fallback
}

function normalizarHorario(horario: string) {
  return String(horario || '').trim()
}

function construirGrupos(body: Body) {
  const gruposLegados = Array.isArray(body?.grupos) ? body.grupos : []
  if (gruposLegados.length > 0) {
    return gruposLegados
  }

  const horarios = Array.isArray(body?.horarios) ? body.horarios : []
  const config = body?.config || {}

  return horarios
    .map((horario, index) => {
      const horarioNormalizado = normalizarHorario(horario)
      if (!horarioNormalizado) return null

      return {
        nome: horarioNormalizado,
        horario_inicio: horarioNormalizado,
        horario_fim: null,
        premiacao:
          config?.premiacao === null || config?.premiacao === undefined
            ? Number(body?.valor_premiacao || 0)
            : Number(config.premiacao),
        valor_inscricao:
          config?.valor_inscricao === null || config?.valor_inscricao === undefined
            ? Number(body?.valor_vaga || 0)
            : Number(config.valor_inscricao),
        qtd_slots:
          config?.vagas_por_jogo === null || config?.vagas_por_jogo === undefined
            ? Number(body?.equipes_por_jogo || body?.vagas || 12)
            : Number(config.vagas_por_jogo),
        qtd_quedas:
          config?.quedas === null || config?.quedas === undefined
            ? Number(body?.quantidade_quedas || 6)
            : Number(config.quedas),
        mapas: [],
        ordem: index + 1,
        intervalo_minutos:
          config?.intervalo_minutos === null || config?.intervalo_minutos === undefined
            ? Number(body?.intervalo_minutos || 15)
            : Number(config.intervalo_minutos),
      } satisfies GrupoPayload
    })
    .filter(Boolean) as GrupoPayload[]
}

async function resolverProdutoraAutomatica(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  userId: string,
  produtoraIdPreferida?: string | null
) {
  const produtoraIdLimpa = String(produtoraIdPreferida || '').trim()

  if (produtoraIdLimpa) {
    const { data: produtoraDona } = await supabase
      .from('produtoras')
      .select('id, nome, dono_id')
      .eq('id', produtoraIdLimpa)
      .eq('dono_id', userId)
      .maybeSingle()

    if (produtoraDona?.id) {
      return produtoraDona
    }

    const { data: membroProdutora } = await supabase
      .from('membros_produtora')
      .select('produtora_id, tipo, produtoras:produtora_id ( id, nome )')
      .eq('usuario_id', userId)
      .eq('produtora_id', produtoraIdLimpa)
      .in('tipo', ['dono', 'admin'])
      .maybeSingle()

    const produtora = Array.isArray(membroProdutora?.produtoras)
      ? membroProdutora?.produtoras?.[0]
      : membroProdutora?.produtoras

    if (produtora?.id) {
      return produtora
    }
  }

  const { data: produtoraDona } = await supabase
    .from('produtoras')
    .select('id, nome, dono_id')
    .eq('dono_id', userId)
    .limit(1)
    .maybeSingle()

  if (produtoraDona?.id) {
    return produtoraDona
  }

  const { data: membroProdutora } = await supabase
    .from('membros_produtora')
    .select('produtora_id, tipo, produtoras:produtora_id ( id, nome )')
    .eq('usuario_id', userId)
    .in('tipo', ['dono', 'admin'])
    .limit(1)
    .maybeSingle()

  const produtora = Array.isArray(membroProdutora?.produtoras)
    ? membroProdutora?.produtoras?.[0]
    : membroProdutora?.produtoras

  if (produtora?.id) {
    return produtora
  }

  return null
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const supabase = getServerSupabaseClient(authHeader)
    const body = (await req.json()) as Body

    const isXtreino = Boolean(body?.is_xtreino)
    const xtreinoModo = String(body?.xtreino_modo || 'jogo_unico').trim() || 'jogo_unico'
    const xtreinoTipoRegra = String(body?.xtreino_tipo_regra || 'trocacao_livre').trim() || 'trocacao_livre'
    const xtreinoTipoInscricao = String(body?.xtreino_tipo_inscricao || 'gratuito').trim() || 'gratuito'
    const xtreinoTemPremiacao = Boolean(body?.xtreino_tem_premiacao)

    const nome = String(body?.nome || '').trim()
    const grupos = construirGrupos(body)
    const edicao = String(body?.edicao || '1').trim() || '1'
    const vagasBase = Number(
      body?.config?.vagas_por_jogo || body?.equipes_por_jogo || body?.vagas || 12
    )
    const quedasBase = Number(
      body?.config?.quedas || body?.quantidade_quedas || 6
    )
    const intervaloBase = Number(
      body?.config?.intervalo_minutos || body?.intervalo_minutos || 15
    )
    const valorVagaBase = Number(
      body?.config?.valor_inscricao || body?.valor_vaga || 0
    )
    const valorPremiacaoBase = Number(
      body?.config?.premiacao || body?.valor_premiacao || 0
    )

    if (!nome) {
      return NextResponse.json(
        { error: 'Informe o nome do diário.' },
        { status: 400 }
      )
    }

    if (grupos.length === 0) {
      return NextResponse.json(
        { error: 'Informe pelo menos um horário para o diário.' },
        { status: 400 }
      )
    }

    const gruposInvalidos = grupos.some((grupo) => {
      return (
        !String(grupo?.nome || '').trim() ||
        !String(grupo?.horario_inicio || '').trim()
      )
    })

    if (gruposInvalidos) {
      return NextResponse.json(
        {
          error:
            'Todos os horários precisam ter pelo menos nome e horário inicial.',
        },
        { status: 400 }
      )
    }

    const produtora = await resolverProdutoraAutomatica(supabase, user.id, body?.produtora_id)

    if (!produtora?.id) {
      return NextResponse.json(
        {
          error:
            'Você precisa estar vinculado a uma produtora para criar campeonato.',
        },
        { status: 403 }
      )
    }

    const slugBase = slugify(`${nome}-${Date.now()}`)

    // cria como diário temporariamente para passar pelas RPCs de grupo
    const { data: campeonato, error: campeonatoError } = await supabase
      .from('campeonatos')
      .insert({
        produtora_id: produtora.id,
        nome,
        slug: slugBase,
        edicao,
        status: 'rascunho',
        jogo: 'Free Fire',
        valor_premiacao: valorPremiacaoBase,
        valor_vaga: valorVagaBase,
        vagas: Number(body?.vagas || vagasBase || 12),
        moeda: 'BRL',
        plataforma: body?.plataforma || 'Mobile',
        regiao: body?.regiao || body?.servidor || 'br',
        categoria: body?.categoria || 'Squad',
        modo_jogo: 'Battle Royale',
        formato: 'diario',
        tipo_competicao: 'diario',
        modelo_competicao: 'diario',
        data_inicio: body?.data_inicio || null,
        banner_url: body?.banner_url || body?.banner || null,
        logo_url: body?.logo_url || body?.logo || null,
        quantidade_quedas: Number(grupos[0]?.qtd_quedas || quedasBase || 6),
        equipes_por_jogo: Number(grupos[0]?.qtd_slots || vagasBase || 12),
        criterio_desempate: 'abates',
      })
      .select('id, nome')
      .single()

    if (campeonatoError || !campeonato) {
      return NextResponse.json(
        { error: campeonatoError?.message || 'Erro ao criar o diário.' },
        { status: 400 }
      )
    }

    const { error: configError } = await supabase
      .from('campeonatos_diarios_config')
      .upsert({
        campeonato_id: campeonato.id,
        quantidade_quedas: Number(grupos[0]?.qtd_quedas || quedasBase || 6),
        equipes_por_jogo: Number(grupos[0]?.qtd_slots || vagasBase || 12),
        grupo_unico: false,
        criterio_desempate: 'abates',
      })

    if (configError) {
      return NextResponse.json(
        {
          error:
            'O diário foi criado, mas houve erro ao salvar a configuração específica: ' +
            configError.message,
        },
        { status: 400 }
      )
    }

    for (let i = 0; i < grupos.length; i++) {
      const grupo = grupos[i]

      const { error: rpcError } = await supabase.rpc('fn_criar_grupo_diario', {
        p_campeonato_id: campeonato.id,
        p_nome: String(grupo?.nome || '').trim(),
        p_horario_inicio: String(grupo?.horario_inicio || '').trim(),
        p_horario_fim: grupo?.horario_fim || null,
        p_premiacao:
          grupo?.premiacao === null || grupo?.premiacao === undefined
            ? null
            : Number(grupo.premiacao),
        p_valor_inscricao:
          grupo?.valor_inscricao === null || grupo?.valor_inscricao === undefined
            ? null
            : Number(grupo.valor_inscricao),
        p_qtd_slots: Number(grupo?.qtd_slots || vagasBase || 12),
        p_qtd_quedas: Number(grupo?.qtd_quedas || quedasBase || 6),
        p_mapas: Array.isArray(grupo?.mapas) ? grupo.mapas : [],
        p_ordem:
          grupo?.ordem === null || grupo?.ordem === undefined
            ? i + 1
            : Number(grupo.ordem),
        p_intervalo_minutos: Number(
          grupo?.intervalo_minutos || intervaloBase || 15
        ),
        p_configuracao: {},
      })

      if (rpcError) {
        return NextResponse.json(
          {
            error:
              `Diário criado, mas houve erro ao criar o grupo "${grupo?.nome}": ` +
              rpcError.message,
            campeonato_id: campeonato.id,
          },
          { status: 400 }
        )
      }
    }

    if (isXtreino) {
      const horarios = grupos
        .map((grupo) => String(grupo?.horario_inicio || '').trim())
        .filter(Boolean)

      const { error: updateTipoError } = await supabase
        .from('campeonatos')
        .update({
          formato: 'Xtreino',
          tipo_competicao: 'xtreino',
          modelo_competicao: 'xtreino',
        })
        .eq('id', campeonato.id)

      if (updateTipoError) {
        return NextResponse.json(
          {
            error:
              'Xtreino criado, mas houve erro ao converter o campeonato para xtreino: ' +
              updateTipoError.message,
            campeonato_id: campeonato.id,
          },
          { status: 400 }
        )
      }

      const { error: xtreinoConfigError } = await supabase
        .from('campeonatos_xtreinos_config')
        .upsert({
          campeonato_id: campeonato.id,
          quantidade_quedas: Number(grupos[0]?.qtd_quedas || quedasBase || 6),
          sala_aberta: false,
          vale_ranking: false,
          pontua: true,
          permite_convidado: true,
          modo_xtreino: xtreinoModo,
          tipo_regra: xtreinoTipoRegra,
          tipo_inscricao: xtreinoTipoInscricao,
          tem_premiacao: xtreinoTemPremiacao,
          horarios,
        })

      if (xtreinoConfigError) {
        return NextResponse.json(
          {
            error:
              'Xtreino criado, mas houve erro ao salvar a configuração do xtreino: ' +
              xtreinoConfigError.message,
            campeonato_id: campeonato.id,
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      ok: true,
      campeonato_id: campeonato.id,
      nome: campeonato.nome,
      produtora_id: produtora.id,
      produtora_nome: produtora.nome || 'Produtora',
      grupos_criados: grupos.length,
      is_xtreino: isXtreino,
      message: isXtreino ? 'Xtreino criado com sucesso.' : 'Diário criado com sucesso.',
    })
  } catch (error: unknown) {
    console.error('POST /api/campeonatos/diarios/criar', error)

    return NextResponse.json(
      { error: getErrorMessage(error, 'Erro interno ao criar diário.') },
      { status: 500 }
    )
  }
}
