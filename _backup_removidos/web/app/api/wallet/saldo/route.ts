import { NextResponse } from 'next/server'
import { getUserFromBearerToken, supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const user = await getUserFromBearerToken(req.headers.get('authorization'))

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    await supabaseAdmin.rpc('fn_wallet_garantir', { p_user_id: user.id })

    const { data, error } = await supabaseAdmin
      .from('wallet_saldo')
      .select('saldo, saldo_retido')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      saldo: Number(data?.saldo || 0),
      saldo_retido: Number(data?.saldo_retido || 0),
      saldo_disponivel: Number(data?.saldo || 0),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao consultar saldo.' }, { status: 500 })
  }
}
