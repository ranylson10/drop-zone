import { supabase } from './supabase'

export async function criarNotificacao({
  user_id,
  titulo,
  descricao,
  link,
  tipo
}: {
  user_id: string
  titulo: string
  descricao: string
  link?: string
  tipo?: string
}) {
  return supabase.from('notificacoes').insert({
    user_id,
    titulo,
    descricao,
    link,
    tipo
  })
}
