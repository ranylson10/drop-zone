import { NextRequest, NextResponse } from 'next/server'
import { getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

function texto(value: unknown) {
  return String(value || '').trim()
}

async function podeAdministrarProdutora(produtoraId: string, userId: string) {
  const { data: produtora, error: produtoraError } = await supabaseAdmin
    .from('produtoras')
    .select('id, dono_id')
    .eq('id', produtoraId)
    .maybeSingle()

  if (produtoraError) throw produtoraError
  if (produtora?.dono_id === userId) return true

  const { data: membro, error: membroError } = await supabaseAdmin
    .from('membros_produtora')
    .select('id')
    .eq('produtora_id', produtoraId)
    .eq('user_id', userId)
    .in('tipo', ['dono', 'admin'])
    .maybeSingle()

  if (membroError) throw membroError
  return Boolean(membro?.id)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; conviteId: string }> }
) {
  try {
    const { id: produtoraId, conviteId } = await params
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const body = await req.json()
    const acao = texto(body?.acao)

    const { data: convite, error: conviteError } = await supabaseAdmin
      .from('convites_produtora')
      .select('id, produtora_id, user_id, tipo, status')
      .eq('id', conviteId)
      .eq('produtora_id', produtoraId)
      .maybeSingle()

    if (conviteError) throw conviteError
    if (!convite?.id) {
      return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })
    }

    if (convite.status !== 'pendente') {
      return NextResponse.json({ error: 'Este convite já foi respondido.' }, { status: 409 })
    }

    if (acao === 'aceitar') {
      if (convite.user_id !== user.id) {
        return NextResponse.json({ error: 'Este convite pertence a outro usuário.' }, { status: 403 })
      }

      const { data: membroExistente, error: membroExistenteError } = await supabaseAdmin
        .from('membros_produtora')
        .select('id')
        .eq('produtora_id', produtoraId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (membroExistenteError) throw membroExistenteError

      if (!membroExistente?.id) {
        const { error: membroError } = await supabaseAdmin
          .from('membros_produtora')
          .insert([{ produtora_id: produtoraId, user_id: user.id, tipo: 'admin' }])

        if (membroError) throw membroError
      }

      const { error: updateError } = await supabaseAdmin
        .from('convites_produtora')
        .update({ status: 'aceito', responded_at: new Date().toISOString() })
        .eq('id', conviteId)

      if (updateError) throw updateError
      return NextResponse.json({ ok: true })
    }

    if (acao === 'recusar') {
      if (convite.user_id !== user.id) {
        return NextResponse.json({ error: 'Este convite pertence a outro usuário.' }, { status: 403 })
      }

      const { error } = await supabaseAdmin
        .from('convites_produtora')
        .update({ status: 'recusado', responded_at: new Date().toISOString() })
        .eq('id', conviteId)

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (acao === 'cancelar') {
      const podeCancelar = await podeAdministrarProdutora(produtoraId, user.id)
      if (!podeCancelar) {
        return NextResponse.json({ error: 'Sem permissão para cancelar este convite.' }, { status: 403 })
      }

      const { error } = await supabaseAdmin
        .from('convites_produtora')
        .update({ status: 'cancelado', responded_at: new Date().toISOString() })
        .eq('id', conviteId)

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (error: any) {
    console.error('Erro ao responder convite da produtora:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao responder convite.' }, { status: 500 })
  }
}
