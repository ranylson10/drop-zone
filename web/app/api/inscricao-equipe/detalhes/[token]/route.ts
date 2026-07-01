import { NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabaseAdmin'

function normalizarToken(valor: unknown) {
  return String(valor || '').trim().toUpperCase()
}

export async function GET(_req: Request, context: { params: Promise<{ token: string }> | { token: string } }) {
  try {
    const params = await context.params
    const token = normalizarToken(params?.token)

    if (!token) {
      return NextResponse.json({ error: 'Token não informado.' }, { status: 400 })
    }

    const supabase = getServerSupabaseClient()

    const { data: convite, error: conviteError } = await supabase
      .from('campeonato_equipe_convite_tokens')
      .select('id,token,campeonato_id,campeonato_equipe_id,equipe_id,ativo,usos,limite_usos,expira_em')
      .eq('token', token)
      .maybeSingle()

    if (conviteError) throw conviteError
    if (!convite?.id) {
      return NextResponse.json({ error: 'Token não encontrado.' }, { status: 404 })
    }

    const [{ data: campeonato }, { data: equipe }, { data: vaga }] = await Promise.all([
      supabase
        .from('campeonatos')
        .select('id,nome,logo_url,banner_url,status,tipo,tipo_campeonato,plataforma,valor_vaga,valor_premiacao,data_inicio,whatsapp_suporte,whatsapp_contato,whatsapp_contatos')
        .eq('id', convite.campeonato_id)
        .maybeSingle(),
      supabase
        .from('equipes')
        .select('id,nome,tag,logo_url,servidor')
        .eq('id', convite.equipe_id)
        .maybeSingle(),
      supabase
        .from('campeonato_equipes')
        .select('id,numero_vaga,nome_exibicao,line_id,status')
        .eq('id', convite.campeonato_equipe_id)
        .maybeSingle(),
    ])

    let line = null
    if ((vaga as any)?.line_id) {
      const { data: lineData } = await supabase
        .from('lines')
        .select('id,nome,tipo,logo_url')
        .eq('id', (vaga as any).line_id)
        .maybeSingle()
      line = lineData || null
    }

    const expirado = convite.expira_em ? new Date(convite.expira_em).getTime() < Date.now() : false
    const limiteAtingido = convite.limite_usos ? Number(convite.usos || 0) >= Number(convite.limite_usos) : false

    return NextResponse.json({
      token: convite.token,
      ativo: Boolean(convite.ativo) && !expirado && !limiteAtingido,
      expirado,
      limite_atingido: limiteAtingido,
      usos: convite.usos || 0,
      limite_usos: convite.limite_usos,
      campeonato,
      equipe,
      vaga,
      line,
    })
  } catch (error: any) {
    console.error('Erro ao carregar detalhes do convite:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao carregar convite.' }, { status: 500 })
  }
}
