import { supabase } from './supabase'

export async function calcularReputacao(produtora_id: string) {
  const { data } = await supabase
    .from('denuncias_campeonato')
    .select('status')
    .eq('produtora_id', produtora_id)

  if (!data) return 0

  const total = data.length
  const resolvidas = data.filter(d => d.status === 'resolvida').length

  if (total === 0) return 100

  return Math.round((resolvidas / total) * 100)
}
