import { NextRequest, NextResponse } from 'next/server'
import { fixedStreamOverlayTemplates, mergeOverlayConfig, defaultTabelaGeralConfig } from '@/lib/streamOverlay'
import { getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getUserFromBearerToken(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
  }

  const { projectId } = await context.params
  const body = await request.json().catch(() => ({}))
  const templateId = String(body?.templateId || '').trim()

  if (!projectId || !templateId) {
    return NextResponse.json({ error: 'Projeto ou template ausente.' }, { status: 400 })
  }

  const fixedTemplate = fixedStreamOverlayTemplates.find((template) => template.id === templateId || template.slug === templateId)
  let template = fixedTemplate
    ? {
        id: fixedTemplate.id,
        nome: fixedTemplate.nome,
        categoria: fixedTemplate.categoria,
        descricao: fixedTemplate.descricao,
        config_padrao: fixedTemplate.config_padrao,
      }
    : null

  if (!template) {
    const { data: dbTemplate, error: templateError } = await supabaseAdmin
      .from('stream_overlay_templates')
      .select('id, nome, categoria, descricao, config_padrao')
      .eq('id', templateId)
      .maybeSingle()

    if (templateError) {
      return NextResponse.json({ error: templateError.message }, { status: 500 })
    }

    if (!dbTemplate) {
      return NextResponse.json({ error: 'Template nao encontrado.' }, { status: 404 })
    }

    template = dbTemplate
  }

  const { data: existing } = await supabaseAdmin
    .from('stream_project_overlays')
    .select('id, project_id, template_id, nome, config, visivel, ordem')
    .eq('project_id', projectId)
    .eq('template_id', template.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, overlay: existing })
  }

  const { error: templateUpsertError } = await supabaseAdmin
    .from('stream_overlay_templates')
    .upsert({
      id: template.id,
      nome: template.nome,
      categoria: template.categoria,
      descricao: template.descricao,
      config_padrao: template.config_padrao,
      ativo: true,
    }, { onConflict: 'id' })

  if (templateUpsertError) {
    return NextResponse.json({ error: templateUpsertError.message }, { status: 500 })
  }

  const { count } = await supabaseAdmin
    .from('stream_project_overlays')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const { data: overlay, error: overlayError } = await supabaseAdmin
    .from('stream_project_overlays')
    .insert({
      project_id: projectId,
      template_id: template.id,
      nome: template.nome,
      config: mergeOverlayConfig(defaultTabelaGeralConfig, template.config_padrao || {}),
      visivel: true,
      ordem: Number(count || 0) + 1,
    })
    .select('id, project_id, template_id, nome, config, visivel, ordem')
    .single()

  if (overlayError) {
    return NextResponse.json({ error: overlayError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, overlay })
}
