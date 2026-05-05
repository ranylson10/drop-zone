import { NextResponse } from 'next/server'
import {
  getServerSupabaseClient,
  getUserFromBearerToken,
} from '@/lib/supabaseAdmin'

type Body = {
  campeonatoId?: string
  grupoOrigemId?: string
  novoNome?: string
  novoHorarioInicio?: string
  novoHorarioFim?: string | null
  novaOrdem?: number | null
}

async function validarPermissaoOrganizacao(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  campeonatoId: string,
  userId: string
) {
  const { data: campeonato, error: campeonatoError } = await supabase
    .from('campeonatos')
    .select('id, tipo_competicao, produtora_id')
    .eq('id', campeonatoId)
    .single()

  if (campeonatoError || !campeonato) {
    throw new Error('Campeonato não encontrado.')
  }

  if (String(campeonato.tipo_competicao || '').toLowerCase() !== 'diario') {
    throw new Error('Essa rota aceita apenas campeonatos diários.')
  }

  const { data: produtora } = await supabase
    .from('produtoras')
    .select('id, dono_id')
    .eq('id', campeonato.produtora_id)
    .single()

  const { data: membrosProdutora } = await supabase
    .from('membros_produtora')
    .select('tipo, usuario_id')
    .eq('produtora_id', campeonato.produtora_id)
    .eq('usuario_id', userId)

  const ehDono = produtora?.dono_id === userId
  const ehAdmin = (membrosProdutora || []).some((item: any) =>
    ['dono', 'admin'].includes(String(item.tipo || '').toLowerCase())
  )

  if (!ehDono && !ehAdmin) {
    throw new Error('Apenas a organização pode duplicar grupos deste diário.')
  }
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
    const campeonatoId = String(body?.campeonatoId || '').trim()
    const grupoOrigemId = String(body?.grupoOrigemId || '').trim()
    const novoNome = String(body?.novoNome || '').trim()
    const novoHorarioInicio = String(body?.novoHorarioInicio || '').trim()

    if (!campeonatoId || !grupoOrigemId || !novoNome || !novoHorarioInicio) {
      return NextResponse.json(
        {
          error:
            'Campeonato, grupo de origem, novo nome e novo horário são obrigatórios.',
        },
        { status: 400 }
      )
    }

    await validarPermissaoOrganizacao(supabase, campeonatoId, user.id)

    const { error: rpcError } = await supabase.rpc('fn_duplicar_grupo_diario', {
      p_campeonato_id: campeonatoId,
      p_grupo_origem_id: grupoOrigemId,
      p_novo_nome: novoNome,
      p_novo_horario_inicio: novoHorarioInicio,
      p_novo_horario_fim: body.novoHorarioFim || null,
      p_nova_ordem: body.novaOrdem ?? null,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Grupo duplicado com sucesso.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao duplicar grupo.' },
      { status: 500 }
    )
  }
}