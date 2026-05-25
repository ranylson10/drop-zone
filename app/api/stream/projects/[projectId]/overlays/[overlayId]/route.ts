import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient, getUserFromBearerToken } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{ projectId: string; overlayId: string }>
}

function cleanId(value: unknown) {
  return String(value || '').trim()
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)
    if (!user) {
      return badRequest('Nao autenticado.', 401)
    }

    const { projectId, overlayId } = await context.params
    const safeProjectId = cleanId(projectId)
    const safeOverlayId = cleanId(overlayId)

    if (!safeProjectId || !safeOverlayId) {
      return badRequest('Projeto ou overlay ausente.')
    }

    const body = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (Object.prototype.hasOwnProperty.call(body, 'config')) patch.config = body.config
    if (Object.prototype.hasOwnProperty.call(body, 'visivel')) patch.visivel = Boolean(body.visivel)
    if (Object.prototype.hasOwnProperty.call(body, 'ordem')) patch.ordem = Number(body.ordem || 1)

    if (Object.keys(patch).length === 1) {
      return badRequest('Nada para atualizar.')
    }

    const supabase = getServerSupabaseClient(authHeader)
    const { data: overlay, error } = await supabase
      .from('stream_project_overlays')
      .update(patch)
      .eq('project_id', safeProjectId)
      .eq('id', safeOverlayId)
      .select('id, project_id, template_id, nome, config, visivel, ordem')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    if (!overlay?.id) {
      return NextResponse.json(
        { ok: false, error: 'Overlay nao encontrada ou sem permissao para salvar.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, overlay })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao salvar overlay.' },
      { status: 500 }
    )
  }
}
