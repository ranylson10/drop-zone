import { NextRequest, NextResponse } from 'next/server'
import { getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{ projectId: string; overlayId: string }>
}

function cleanId(value: unknown) {
  return String(value || '').trim()
}

async function canEditProject(projectId: string, userId: string) {
  const { data: project, error } = await supabaseAdmin
    .from('stream_projects')
    .select('id, created_by, campeonato_id')
    .eq('id', projectId)
    .maybeSingle()

  if (error) throw error
  if (!project?.id) return false
  if (project.created_by === userId) return true

  if (project.campeonato_id) {
    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('fn_usuario_admin_do_campeonato', {
      p_campeonato_id: project.campeonato_id,
    })

    if (!adminError && isAdmin === true) return true
  }

  const { data: siteAdmin } = await supabaseAdmin
    .from('site_administradores')
    .select('id')
    .eq('user_id', userId)
    .eq('ativo', true)
    .limit(1)

  return Boolean(siteAdmin?.length)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)

    if (!user?.id) {
      return NextResponse.json({ ok: false, error: 'Nao autenticado.' }, { status: 401 })
    }

    const { projectId, overlayId } = await context.params
    const safeProjectId = cleanId(projectId)
    const safeOverlayId = cleanId(overlayId)

    if (!safeProjectId || !safeOverlayId) {
      return NextResponse.json({ ok: false, error: 'Projeto ou overlay ausente.' }, { status: 400 })
    }

    const allowed = await canEditProject(safeProjectId, user.id)
    if (!allowed) {
      return NextResponse.json({ ok: false, error: 'Voce nao tem permissao para editar essa overlay.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (Object.prototype.hasOwnProperty.call(body, 'config')) updatePayload.config = body.config || {}
    if (Object.prototype.hasOwnProperty.call(body, 'visivel')) updatePayload.visivel = Boolean(body.visivel)
    if (Object.prototype.hasOwnProperty.call(body, 'ordem')) updatePayload.ordem = Number(body.ordem || 1)

    const { data: overlay, error } = await supabaseAdmin
      .from('stream_project_overlays')
      .update(updatePayload)
      .eq('id', safeOverlayId)
      .eq('project_id', safeProjectId)
      .select('id, project_id, template_id, nome, config, visivel, ordem')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    if (!overlay?.id) {
      return NextResponse.json({ ok: false, error: 'O banco nao confirmou a atualizacao da overlay.' }, { status: 409 })
    }

    return NextResponse.json({ ok: true, overlay })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Erro ao salvar overlay.' }, { status: 500 })
  }
}
