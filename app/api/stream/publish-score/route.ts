import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function cleanText(value: unknown) {
  return String(value || '').trim()
}

async function resolveProject(projectId?: string | null, streamKey?: string | null, campeonatoId?: string | null) {
  let query = supabaseAdmin
    .from('stream_projects')
    .select('id, campeonato_id, stream_key')
    .eq('ativo', true)

  if (projectId) query = query.eq('id', projectId)
  else if (streamKey) query = query.eq('stream_key', streamKey)
  else if (campeonatoId) query = query.eq('campeonato_id', campeonatoId).order('created_at', { ascending: false }).limit(1)
  else return null

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const project = await resolveProject(cleanText(body.projectId), cleanText(body.streamKey), cleanText(body.campeonatoId))
    const campeonatoIdBody = cleanText(body.campeonatoId)

    if (!project?.id && !campeonatoIdBody) {
      return NextResponse.json({ ok: false, error: 'Projeto de stream nao encontrado.' }, { status: 404 })
    }

    const campeonatoId = cleanText(campeonatoIdBody || project?.campeonato_id)
    const jogoId = cleanText(body.jogoId)
    const mapa = cleanText(body.mapa)
    const rows = (Array.isArray(body.rows) ? body.rows : []).map((row: any) => ({
      campeonato_id: campeonatoId,
      fase_id: cleanText(row.fase_id) || null,
      jogo_id: jogoId,
      equipe_id: cleanText(row.equipe_id),
      grupo_id: cleanText(row.grupo_id) || null,
      mapa,
      abates: Number(row.abates || 0),
      posicao: Number(row.posicao || 12),
      total_pontos: Number(row.total_pontos || 0),
    })).filter((row: any) => row.equipe_id)

    const { error: deleteError } = await supabaseAdmin
      .from('resultados_jogos')
      .delete()
      .eq('jogo_id', jogoId)
      .eq('mapa', mapa)

    if (deleteError) throw deleteError

    if (rows.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('resultados_jogos').insert(rows)
      if (insertError) throw insertError
    }

    return NextResponse.json({ ok: true, count: rows.length })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Erro ao publicar no site.' }, { status: 500 })
  }
}
