import { NextResponse } from 'next/server'
import {
  getServerSupabaseClient,
  getUserFromBearerToken,
} from '@/lib/supabaseAdmin'

type Body = {
  campeonatoId?: string
  equipeCampeaId?: string
  equipe_campea_id?: string
  organizadorUserId?: string
  organizador_user_id?: string
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return fallback
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
    const equipeCampeaId = String(body?.equipeCampeaId || body?.equipe_campea_id || '').trim()
    const organizadorUserId = String(body?.organizadorUserId || body?.organizador_user_id || user.id || '').trim()

    if (!campeonatoId || !equipeCampeaId) {
      return NextResponse.json(
        { error: 'Campeonato e equipe campeã são obrigatórios.' },
        { status: 400 }
      )
    }

    const { data: campeonato, error: campeonatoError } = await supabase
      .from('campeonatos')
      .select('id, nome, tipo_competicao, criado_por, produtora_id')
      .eq('id', campeonatoId)
      .single()

    if (campeonatoError || !campeonato) {
      return NextResponse.json({ error: 'Campeonato não encontrado.' }, { status: 404 })
    }

    if (String(campeonato.tipo_competicao || '').toLowerCase() !== 'diario') {
      return NextResponse.json(
        { error: 'Essa rota aceita apenas campeonatos diários.' },
        { status: 400 }
      )
    }

    const { data: equipe, error: equipeError } = await supabase
      .from('equipes')
      .select('id, nome')
      .eq('id', equipeCampeaId)
      .single()

    if (equipeError || !equipe) {
      return NextResponse.json({ error: 'Equipe campeã não encontrada.' }, { status: 404 })
    }

    const { error: rpcError } = await supabase.rpc('finalizar_campeonato_diario', {
      p_campeonato_id: campeonatoId,
      p_equipe_campea_id: equipeCampeaId,
      p_organizador_user_id: organizadorUserId,
    })

    if (rpcError) {
      return NextResponse.json(
        { error: getErrorMessage(rpcError, 'Erro ao finalizar campeonato diário.') },
        { status: 400 }
      )
    }

    const { error: updateStatusError } = await supabase
      .from('campeonatos')
      .update({ status: 'finalizado' })
      .eq('id', campeonatoId)

    if (updateStatusError) {
      return NextResponse.json(
        {
          error: getErrorMessage(
            updateStatusError,
            'Campeonato finalizado no financeiro, mas falhou ao atualizar o status.'
          ),
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      campeonatoId,
      equipeCampeaId,
      organizadorUserId,
      message: 'Campeonato diário finalizado com sucesso.',
    })
  } catch (error) {
    console.error('POST /api/campeonatos/diarios/finalizar', error)

    return NextResponse.json(
      { error: getErrorMessage(error, 'Não foi possível finalizar o campeonato diário agora.') },
      { status: 500 }
    )
  }
}
