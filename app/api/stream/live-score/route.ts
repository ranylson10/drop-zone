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

    if (!project?.id) {
      return NextResponse.json({ ok: false, error: 'Projeto de stream nao encontrado.' }, { status: 404 })
    }

    const livePayload = {
      campeonato_id: cleanText(body.campeonatoId || project.campeonato_id),
      jogo_id: cleanText(body.jogoId),
      mapa: cleanText(body.mapa),
      updated_at: new Date().toISOString(),
      rows: Array.isArray(body.rows) ? body.rows : [],
    }

    const { data: overlays, error: listError } = await supabaseAdmin
      .from('stream_project_overlays')
      .select('id, config')
      .eq('project_id', project.id)

    if (listError) throw listError

    for (const overlay of overlays || []) {
      const config = { ...((overlay as any).config || {}), __liveResults: livePayload }
      const { error } = await supabaseAdmin
        .from('stream_project_overlays')
        .update({ config, updated_at: new Date().toISOString() })
        .eq('id', overlay.id)

      if (error) throw error
    }

    return NextResponse.json({ ok: true, count: overlays?.length || 0 })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Erro ao atualizar live.' }, { status: 500 })
  }
}
