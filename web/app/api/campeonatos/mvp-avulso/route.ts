import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function texto(value: unknown) {
  return String(value || '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const campeonatoId = texto(body.campeonatoId)
    const jogadorAvulsoId = texto(body.jogadorAvulsoId)
    const jogadorCampeonatoId = texto(body.jogadorCampeonatoId)
    const uidJogo = texto(body.uidJogo)
    const nick = texto(body.nick)
    const fotoUrl = texto(body.fotoUrl)

    if (!campeonatoId || !jogadorAvulsoId) {
      return NextResponse.json({ ok: false, error: 'Jogador avulso invalido.' }, { status: 400 })
    }

    const updatesAvulso: Record<string, string> = {}
    if (nick) updatesAvulso.nick = nick
    if (fotoUrl) updatesAvulso.foto_url = fotoUrl

    if (Object.keys(updatesAvulso).length > 0) {
      const { error: avulsoError } = await supabaseAdmin
        .from('jogadores_avulsos_campeonato')
        .update(updatesAvulso)
        .eq('id', jogadorAvulsoId)
        .eq('campeonato_id', campeonatoId)

      if (avulsoError) throw avulsoError
    }

    if (nick) {
      let query = supabaseAdmin
        .from('resultados_mvp')
        .update({ nick_snapshot: nick })
        .eq('campeonato_id', campeonatoId)

      if (jogadorCampeonatoId) {
        query = query.eq('jogador_campeonato_id', jogadorCampeonatoId)
      } else {
        query = query.eq('jogador_avulso_id', jogadorAvulsoId)
      }

      const { error: mvpError } = await query
      if (mvpError) throw mvpError

      if (!jogadorCampeonatoId && uidJogo) {
        const { error: uidError } = await supabaseAdmin
          .from('resultados_mvp')
          .update({ nick_snapshot: nick })
          .eq('campeonato_id', campeonatoId)
          .eq('uid_jogo_snapshot', uidJogo)

        if (uidError) throw uidError
      }
    }

    return NextResponse.json({ ok: true, nick: nick || null, fotoUrl: fotoUrl || null })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Erro ao atualizar jogador avulso.' }, { status: 500 })
  }
}
