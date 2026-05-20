import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{ producerKey: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { producerKey } = await context.params
  const decodedKey = decodeURIComponent(producerKey || '').trim()
  const projectId = request.nextUrl.searchParams.get('projectId')?.trim() || ''

  if (!decodedKey) {
    return NextResponse.json({ ok: false, error: 'Chave do controlador ausente.' }, { status: 400 })
  }

  const { data: keyData, error: keyError } = await supabaseAdmin
    .from('stream_producer_keys')
    .select('id, producer_key')
    .eq('producer_key', decodedKey)
    .maybeSingle()

  if (keyError) {
    return NextResponse.json({ ok: false, error: keyError.message }, { status: 500 })
  }

  if (!keyData?.id) {
    return NextResponse.json({ ok: false, error: 'Chave do controlador nao encontrada.' }, { status: 404 })
  }

  const { data: projectRows, error: projectError } = await supabaseAdmin
    .from('stream_producer_projects')
    .select('id, producer_key_id, project_id, label, ordem, ativo')
    .eq('producer_key_id', keyData.id)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  if (projectError) {
    return NextResponse.json({ ok: false, error: projectError.message }, { status: 500 })
  }

  const projectIds = (projectRows || []).map((item) => item.project_id).filter(Boolean)
  let projectMap = new Map<string, { id: string; nome: string; stream_key: string }>()

  if (projectIds.length > 0) {
    const { data: streamProjects, error: streamProjectsError } = await supabaseAdmin
      .from('stream_projects')
      .select('id, nome, stream_key')
      .in('id', projectIds)

    if (streamProjectsError) {
      return NextResponse.json({ ok: false, error: streamProjectsError.message }, { status: 500 })
    }

    projectMap = new Map((streamProjects || []).map((project) => [project.id, project]))
  }

  const projects = (projectRows || []).map((item) => ({
    ...item,
    stream_projects: projectMap.get(item.project_id) || null,
  }))

  const selectedProjectId = projectId || projects[0]?.project_id || ''
  let buttons: unknown[] = []

  if (selectedProjectId) {
    const { data: buttonData, error: buttonError } = await supabaseAdmin
      .from('stream_controller_buttons')
      .select('id, label, action_type, obs_scene_name, overlay_id, ordem, enabled')
      .eq('producer_key_id', keyData.id)
      .eq('project_id', selectedProjectId)
      .eq('enabled', true)
      .order('ordem', { ascending: true })

    if (buttonError) {
      return NextResponse.json({ ok: false, error: buttonError.message }, { status: 500 })
    }

    buttons = buttonData || []
  }

  return NextResponse.json({
    ok: true,
    producer_key_id: keyData.id,
    projects,
    selected_project_id: selectedProjectId,
    buttons,
  })
}
