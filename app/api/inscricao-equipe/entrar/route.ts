import { NextResponse } from 'next/server'
import { getServerSupabaseClient, getUserFromBearerToken } from '@/lib/supabaseAdmin'

type Body = {
  token?: string
  perfil_jogo_id?: string
}

function limparTexto(valor: unknown) {
  return String(valor || '').trim()
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)
    if (!user?.id) {
      return NextResponse.json({ error: 'Faça login para concluir a inscrição.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const token = limparTexto(body.token).toUpperCase()
    const perfilJogoId = limparTexto(body.perfil_jogo_id)

    if (!token) return NextResponse.json({ error: 'Informe o token.' }, { status: 400 })
    if (!perfilJogoId) return NextResponse.json({ error: 'Selecione seu perfil gamer.' }, { status: 400 })

    const supabase = getServerSupabaseClient(authHeader)

    const { data: convite, error: conviteError } = await supabase
      .from('campeonato_equipe_convite_tokens')
      .select('id,token,campeonato_id,campeonato_equipe_id,equipe_id,ativo,usos,limite_usos,expira_em')
      .eq('token', token)
      .maybeSingle()

    if (conviteError) throw conviteError
    if (!convite?.id || !convite.ativo) {
      return NextResponse.json({ error: 'Token inválido ou desativado.' }, { status: 404 })
    }

    if (convite.expira_em && new Date(convite.expira_em).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Esse token expirou.' }, { status: 410 })
    }

    if (convite.limite_usos && Number(convite.usos || 0) >= Number(convite.limite_usos)) {
      return NextResponse.json({ error: 'Esse token atingiu o limite de usos.' }, { status: 409 })
    }

    const { data: vaga, error: vagaError } = await supabase
      .from('campeonato_equipes')
      .select('id,campeonato_id,equipe_id,line_id,status')
      .eq('id', convite.campeonato_equipe_id)
      .maybeSingle()

    if (vagaError) throw vagaError
    if (!vaga?.id || !vaga.equipe_id) {
      return NextResponse.json({ error: 'A vaga vinculada ao token não existe mais.' }, { status: 404 })
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('perfis_jogo')
      .select('id,user_id,nick,uid_jogo,servidor,plataforma,funcao,equipe_id,ativo')
      .eq('id', perfilJogoId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (perfilError) throw perfilError
    if (!perfil?.id) {
      return NextResponse.json({ error: 'Perfil gamer não encontrado para sua conta.' }, { status: 404 })
    }

    const perfilId = perfil.id

    if (perfil.equipe_id !== vaga.equipe_id) {
      const { error: perfilUpdateError } = await supabase
        .from('perfis_jogo')
        .update({ equipe_id: vaga.equipe_id, ativo: true, updated_at: new Date().toISOString() })
        .eq('id', perfilId)
        .eq('user_id', user.id)
      if (perfilUpdateError) throw perfilUpdateError
    }

    const { data: membroExistente } = await supabase
      .from('membros_equipe')
      .select('id')
      .eq('equipe_id', vaga.equipe_id)
      .eq('perfil_jogo_id', perfilId)
      .eq('ativo', true)
      .maybeSingle()

    if (!membroExistente?.id) {
      const { error: membroError } = await supabase
        .from('membros_equipe')
        .insert({
          equipe_id: vaga.equipe_id,
          perfil_jogo_id: perfilId,
          user_id: user.id,
          tipo: 'membro',
          ativo: true,
        })
      if (membroError && membroError.code !== '23505') throw membroError
    }

    const { data: jogadorExistente } = await supabase
      .from('jogadores_campeonato')
      .select('id')
      .eq('campeonato_id', vaga.campeonato_id)
      .eq('campeonato_equipe_id', vaga.id)
      .eq('perfil_jogo_id', perfilId)
      .neq('status', 'removido')
      .maybeSingle()

    let jogadorId = jogadorExistente?.id || null

    if (!jogadorId) {
      const { data: jogadorCriado, error: jogadorError } = await supabase
        .from('jogadores_campeonato')
        .insert({
          campeonato_id: vaga.campeonato_id,
          equipe_id: vaga.equipe_id,
          campeonato_equipe_id: vaga.id,
          perfil_jogo_id: perfilId,
          status: 'ativo',
          origem: 'app',
          criado_automaticamente: true,
        })
        .select('id')
        .single()
      if (jogadorError) throw jogadorError
      jogadorId = jogadorCriado?.id || null
    } else {
      const { error: jogadorUpdateError } = await supabase
        .from('jogadores_campeonato')
        .update({ status: 'ativo', equipe_id: vaga.equipe_id, updated_at: new Date().toISOString() })
        .eq('id', jogadorId)
      if (jogadorUpdateError) throw jogadorUpdateError
    }

    if (vaga.line_id) {
      const { data: lineExistente } = await supabase
        .from('lines_jogadores')
        .select('id')
        .eq('line_id', vaga.line_id)
        .eq('perfil_jogo_id', perfilId)
        .maybeSingle()

      if (!lineExistente?.id) {
        const { data: ordemData } = await supabase
          .from('lines_jogadores')
          .select('ordem')
          .eq('line_id', vaga.line_id)
          .order('ordem', { ascending: false })
          .limit(1)

        const ordem = Math.max(0, Number((ordemData || [])[0]?.ordem ?? -1) + 1)
        const tipoSlot = ordem < 4 ? 'titular' : 'reserva'

        const { error: lineError } = await supabase
          .from('lines_jogadores')
          .insert({
            line_id: vaga.line_id,
            perfil_jogo_id: perfilId,
            jogador_avulso_id: null,
            tipo_slot: tipoSlot,
            ordem,
          })
        if (lineError && lineError.code !== '23505') throw lineError
      }
    }

    await supabase
      .from('campeonato_equipe_convite_tokens')
      .update({
        usos: Number(convite.usos || 0) + 1,
        ultimo_uso_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', convite.id)

    return NextResponse.json({
      ok: true,
      campeonato_id: vaga.campeonato_id,
      campeonato_equipe_id: vaga.id,
      equipe_id: vaga.equipe_id,
      perfil_jogo_id: perfilId,
      jogador_campeonato_id: jogadorId,
    })
  } catch (error: any) {
    console.error('Erro ao entrar via token:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao concluir inscrição.' }, { status: 500 })
  }
}
