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

    const hasConfig = Object.prototype.hasOwnProperty.call(body, 'config')
    const hasVisivel = Object.prototype.hasOwnProperty.call(body, 'visivel')
    const hasOrdem = Object.prototype.hasOwnProperty.call(body, 'ordem')

    if (!hasConfig && !hasVisivel && !hasOrdem) {
      return badRequest('Nada para atualizar.')
    }

    const config = hasConfig && body.config && typeof body.config === 'object' ? body.config : null
    const visivel = hasVisivel ? Boolean(body.visivel) : null
    const ordem = hasOrdem ? Number(body.ordem || 1) : null

    const { data: rpcOverlay, error: rpcError } = await supabaseAdmin.rpc(
      'stream_salvar_project_overlay',
      {
        p_project_id: safeProjectId,
        p_overlay_id: safeOverlayId,
        p_config: config,
        p_visivel: visivel,
        p_ordem: ordem,
      }
    )

    if (rpcError) {
      return NextResponse.json(
        {
          ok: false,
          error: rpcError.message,
          hint: 'Confira se a função SQL stream_salvar_project_overlay foi criada no Supabase.',
        },
        { status: 500 }
      )
    }

    const overlay = Array.isArray(rpcOverlay) ? rpcOverlay[0] : rpcOverlay

    if (!overlay?.id) {
      return NextResponse.json(
        { ok: false, error: 'O banco nao confirmou a atualizacao da overlay.' },
        { status: 409 }
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
