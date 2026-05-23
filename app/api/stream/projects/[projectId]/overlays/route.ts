import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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
    const { projectId, overlayId } = await context.params
    const safeProjectId = cleanId(projectId)
    const safeOverlayId = cleanId(overlayId)

    if (!safeProjectId || !safeOverlayId) {
      return badRequest('Projeto ou overlay ausente.')
    }

    const body = await request.json().catch(() => ({}))
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (Object.prototype.hasOwnProperty.call(body, 'config')) {
      updatePayload.config = body.config && typeof body.config === 'object' ? body.config : {}
    }

    if (Object.prototype.hasOwnProperty.call(body, 'visivel')) {
      updatePayload.visivel = Boolean(body.visivel)
    }

    if (Object.prototype.hasOwnProperty.call(body, 'ordem')) {
      updatePayload.ordem = Number(body.ordem || 1)
    }

    if (Object.keys(updatePayload).length <= 1) {
      return badRequest('Nada para atualizar.')
    }

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
