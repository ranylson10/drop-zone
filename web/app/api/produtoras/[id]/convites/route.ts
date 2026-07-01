import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient, getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

function texto(value: unknown) {
  return String(value || '').trim()
}

async function podeAdministrarProdutora(produtoraId: string, userId: string) {
  const { data: produtora, error: produtoraError } = await supabaseAdmin
    .from('produtoras')
    .select('id, nome, dono_id')
    .eq('id', produtoraId)
    .maybeSingle()

  if (produtoraError) throw produtoraError
  if (!produtora?.id) return { ok: false, produtora: null }
  if (produtora.dono_id === userId) return { ok: true, produtora }

  const { data: membro, error: membroError } = await supabaseAdmin
    .from('membros_produtora')
    .select('id, tipo')
    .eq('produtora_id', produtoraId)
    .eq('user_id', userId)
    .in('tipo', ['dono', 'admin'])
    .maybeSingle()

  if (membroError) throw membroError
  return { ok: Boolean(membro?.id), produtora }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: produtoraId } = await params
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const url = new URL(req.url)
    const q = texto(url.searchParams.get('q'))

    if (q) {
      const permissao = await podeAdministrarProdutora(produtoraId, user.id)
      if (!permissao.ok) {
        return NextResponse.json({ error: 'Sem permissão para convidar nesta produtora.' }, { status: 403 })
      }

      const like = `%${q}%`
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, username, nome_exibicao, foto_url')
        .or(`username.ilike.${like},nome_exibicao.ilike.${like}`)
        .limit(12)

      if (error) throw error
      return NextResponse.json({ usuarios: data || [] })
    }

    const supabase = getServerSupabaseClient(authHeader)
    const permissao = await podeAdministrarProdutora(produtoraId, user.id)
    const conviteId = texto(url.searchParams.get('convite'))

    if (!permissao.ok && !conviteId) {
      return NextResponse.json({ error: 'Sem permissão para gerenciar esta produtora.' }, { status: 403 })
    }

    if (conviteId && !permissao.ok) {
      const { data: convite, error } = await supabase
        .from('convites_produtora')
        .select('id, status, tipo, created_at, produtoras:produtora_id(id, nome, logo_url)')
        .eq('id', conviteId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      return NextResponse.json({ convite: convite || null, podeGerenciar: false })
    }

    const [{ data: membros, error: membrosError }, { data: convites, error: convitesError }] = await Promise.all([
      supabaseAdmin
        .from('membros_produtora')
        .select('id, user_id, tipo, created_at')
        .eq('produtora_id', produtoraId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('convites_produtora')
        .select('id, user_id, tipo, status, mensagem, created_at')
        .eq('produtora_id', produtoraId)
        .order('created_at', { ascending: false }),
    ])

    if (membrosError) throw membrosError
    if (convitesError) throw convitesError

    const userIds = Array.from(
      new Set([
        ...(membros || []).map((item: any) => item.user_id),
        ...(convites || []).map((item: any) => item.user_id),
      ].filter(Boolean))
    )

    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, username, nome_exibicao, foto_url').in('id', userIds)
      : { data: [] as any[] }

    const profilesMap = new Map((profiles || []).map((item: any) => [item.id, item]))

    return NextResponse.json({
      produtora: permissao.produtora,
      podeGerenciar: true,
      membros: (membros || []).map((item: any) => ({ ...item, profile: profilesMap.get(item.user_id) || null })),
      convites: (convites || []).map((item: any) => ({ ...item, profile: profilesMap.get(item.user_id) || null })),
    })
  } catch (error: any) {
    console.error('Erro ao carregar convites da produtora:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao carregar gestão da produtora.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: produtoraId } = await params
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const permissao = await podeAdministrarProdutora(produtoraId, user.id)
    if (!permissao.ok || !permissao.produtora?.id) {
      return NextResponse.json({ error: 'Sem permissão para convidar nesta produtora.' }, { status: 403 })
    }

    const body = await req.json()
    const userId = texto(body?.userId)
    const mensagem = texto(body?.mensagem)

    if (!userId) {
      return NextResponse.json({ error: 'Selecione um usuário para convidar.' }, { status: 400 })
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Você já administra esta produtora.' }, { status: 400 })
    }

    const { data: existente } = await supabaseAdmin
      .from('membros_produtora')
      .select('id')
      .eq('produtora_id', produtoraId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existente?.id) {
      return NextResponse.json({ error: 'Este usuário já é ajudante da produtora.' }, { status: 409 })
    }

    const { data: convite, error: conviteError } = await supabaseAdmin
      .from('convites_produtora')
      .insert([{
        produtora_id: produtoraId,
        user_id: userId,
        convidado_por: user.id,
        tipo: 'admin',
        mensagem: mensagem || null,
      }])
      .select('id')
      .single()

    if (conviteError) throw conviteError

    const link = `/produtora/${produtoraId}/gestao?convite=${convite.id}`
    await supabaseAdmin.from('notificacoes').insert([{
      user_id: userId,
      titulo: `Convite para ${permissao.produtora.nome}`,
      descricao: `Você foi convidado para administrar os campeonatos da produtora ${permissao.produtora.nome}.`,
      mensagem: mensagem || 'Aceite o convite para liberar acesso aos campeonatos da produtora.',
      tipo: 'convite_produtora',
      link,
      lido: false,
    }])

    return NextResponse.json({ ok: true, conviteId: convite.id })
  } catch (error: any) {
    console.error('Erro ao enviar convite da produtora:', error)
    const duplicated = String(error?.code || '') === '23505'
    return NextResponse.json(
      { error: duplicated ? 'Já existe um convite pendente para este usuário.' : error?.message || 'Erro ao enviar convite.' },
      { status: duplicated ? 409 : 500 }
    )
  }
}
