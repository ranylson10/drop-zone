import { NextResponse } from 'next/server'
import { getServerSupabaseClient, getUserFromBearerToken } from '@/lib/supabaseAdmin'
import crypto from 'crypto'

function gerarTokenCurto() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(8)
  let token = ''
  for (let i = 0; i < bytes.length; i += 1) token += alfabeto[bytes[i] % alfabeto.length]
  return token
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromBearerToken(authHeader)
    if (!user?.id) {
      return NextResponse.json({ error: 'Faça login para gerar o link.' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const campeonatoEquipeId = String(body?.campeonato_equipe_id || '').trim()
    const limiteUsosRaw = body?.limite_usos
    const limiteUsos = limiteUsosRaw === null || limiteUsosRaw === undefined || limiteUsosRaw === ''
      ? null
      : Math.max(1, Number(limiteUsosRaw) || 1)

    if (!campeonatoEquipeId) {
      return NextResponse.json({ error: 'Vaga/equipe do campeonato não informada.' }, { status: 400 })
    }

    const supabase = getServerSupabaseClient(authHeader)

    const { data: vaga, error: vagaError } = await supabase
      .from('campeonato_equipes')
      .select('id, campeonato_id, equipe_id, line_id, status, equipes:equipe_id(id, nome, criado_por)')
      .eq('id', campeonatoEquipeId)
      .maybeSingle()

    if (vagaError) throw vagaError
    if (!vaga?.id || !vaga?.equipe_id) {
      return NextResponse.json({ error: 'Essa vaga precisa estar vinculada a uma equipe do app.' }, { status: 404 })
    }

    const equipe: any = Array.isArray((vaga as any).equipes) ? (vaga as any).equipes[0] : (vaga as any).equipes

    let podeGerar = equipe?.criado_por === user.id

    if (!podeGerar) {
      const { data: membro } = await supabase
        .from('membros_equipe')
        .select('id,tipo')
        .eq('equipe_id', vaga.equipe_id)
        .eq('user_id', user.id)
        .eq('ativo', true)
        .in('tipo', ['dono', 'admin', 'manager'])
        .maybeSingle()
      podeGerar = Boolean(membro?.id)
    }

    if (!podeGerar) {
      return NextResponse.json({ error: 'Apenas dono, admin ou manager da equipe pode gerar esse link.' }, { status: 403 })
    }

    const { data: existente } = await supabase
      .from('campeonato_equipe_convite_tokens')
      .select('id,token')
      .eq('campeonato_equipe_id', campeonatoEquipeId)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let token = existente?.token || gerarTokenCurto()

    if (existente?.id) {
      const { error: updateError } = await supabase
        .from('campeonato_equipe_convite_tokens')
        .update({ limite_usos: limiteUsos, updated_at: new Date().toISOString() })
        .eq('id', existente.id)
      if (updateError) throw updateError
    } else {
      let inserido = false
      for (let tentativa = 0; tentativa < 5 && !inserido; tentativa += 1) {
        token = gerarTokenCurto()
        const { error: insertError } = await supabase
          .from('campeonato_equipe_convite_tokens')
          .insert({
            token,
            campeonato_id: vaga.campeonato_id,
            campeonato_equipe_id: campeonatoEquipeId,
            equipe_id: vaga.equipe_id,
            criado_por: user.id,
            limite_usos: limiteUsos,
          })
        if (!insertError) inserido = true
        else if (insertError.code !== '23505') throw insertError
      }
      if (!inserido) throw new Error('Não foi possível gerar um token único.')
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || ''
    const path = `/inscricao/${token}`

    return NextResponse.json({
      token,
      url: origin ? `${origin}${path}` : path,
      path,
      campeonato_equipe_id: campeonatoEquipeId,
      equipe_nome: equipe?.nome || 'Equipe',
    })
  } catch (error: any) {
    console.error('Erro ao gerar token de inscrição:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao gerar link de inscrição.' }, { status: 500 })
  }
}
