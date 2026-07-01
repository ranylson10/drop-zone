import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

const allowedTables = new Set([
  'agenda_eventos',
  'campeonato_diario_grupo_inscricoes_pagamento',
  'campeonato_diario_inscricoes_pagamento',
  'campeonato_equipes',
  'campeonato_fases',
  'campeonato_grupos',
  'campeonato_inscricoes_pagamento',
  'campeonato_taxas_criacao',
  'campeonato_taxas_criacao_pagamentos',
  'campeonatos',
  'campeonatos_diarios_config',
  'chat_conversas',
  'chat_mensagens',
  'chat_participantes',
  'classificacao_geral',
  'cobrancas',
  'convites_equipe',
  'convites_produtora',
  'equipes',
  'equipes_lines_vinculos',
  'jogadores_avulsos_campeonato',
  'jogadores_campeonato',
  'jogadores_equipe',
  'jogo_equipes',
  'jogo_vinculos_equipes',
  'jogos',
  'lines',
  'lines_jogadores',
  'membros_equipe',
  'membros_produtora',
  'notificacoes',
  'perfis',
  'perfis_jogo',
  'produtora_lider_campeonatos',
  'produtora_membros',
  'produtoras',
  'profiles',
  'push_tokens',
  'resultados_jogos',
  'resultados_mvp',
  'stories',
  'story_comentarios',
  'story_curtidas',
  'story_reposts',
  'story_visualizacoes',
  'transacoes_cobranca',
  'usuarios_pagamento',
  'vw_lealt_ranking_equipes',
  'vw_lealt_ranking_jogadores',
])

const allowedRpc = new Set([
  'fn_aplicar_line_na_vaga',
  'fn_comprar_vaga_campeonato',
  'fn_confirmar_pagamento_vaga_agendada',
  'fn_criar_grupo_diario',
  'fn_garantir_line_para_inscricao',
  'fn_garantir_line_para_vaga',
  'fn_inscrever_equipe_em_campeonato',
  'reservar_inscricao_grupo_diario_line',
])

type QueryBody = {
  kind: 'table' | 'rpc'
  target: string
  action?: string
  args?: any
  values?: any
  options?: any
  modifiers?: Array<{ method: string; args: any[] }>
}

function getClient(authHeader: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase nao configurado no backend.')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QueryBody
    const client = getClient(req.headers.get('authorization'))

    if (body.kind === 'rpc') {
      if (!allowedRpc.has(body.target)) {
        return NextResponse.json({ error: 'RPC nao permitida.' }, { status: 403, headers: corsHeaders })
      }

      let query: any = client.rpc(body.target as any, body.args || {}, body.options)
      query = applyModifiers(query, body.modifiers || [])
      return NextResponse.json(await query, { headers: corsHeaders })
    }

    if (body.kind !== 'table' || !allowedTables.has(body.target)) {
      return NextResponse.json({ error: 'Tabela nao permitida.' }, { status: 403, headers: corsHeaders })
    }

    let query: any = client.from(body.target)

    switch (body.action) {
      case 'select':
        query = query.select(body.args?.columns || '*', body.options)
        break
      case 'insert':
        query = query.insert(body.values, body.options)
        break
      case 'update':
        query = query.update(body.values, body.options)
        break
      case 'delete':
        query = query.delete(body.options)
        break
      case 'upsert':
        query = query.upsert(body.values, body.options)
        break
      default:
        return NextResponse.json({ error: 'Acao nao permitida.' }, { status: 400, headers: corsHeaders })
    }

    query = applyModifiers(query, body.modifiers || [])
    return NextResponse.json(await query, { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao consultar backend.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

function applyModifiers(query: any, modifiers: QueryBody['modifiers']) {
  for (const modifier of modifiers || []) {
    const args = modifier.args || []

    switch (modifier.method) {
      case 'select':
      case 'eq':
      case 'neq':
      case 'in':
      case 'is':
      case 'ilike':
      case 'or':
      case 'gte':
      case 'lte':
      case 'gt':
      case 'lt':
      case 'not':
      case 'order':
      case 'limit':
      case 'range':
      case 'single':
      case 'maybeSingle':
        query = query[modifier.method](...args)
        break
      default:
        throw new Error(`Modificador nao permitido: ${modifier.method}`)
    }
  }

  return query
}
