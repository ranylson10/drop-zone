export type TipoIdentidade = 'usuario' | 'jogo' | 'equipe' | 'produtora'
export type TipoModoUso = 'jogador' | 'equipe' | 'produtora' | 'manager' | 'visitante'

export const IDENTITY_ONBOARDING_PATH = '/identidade'
export const MODE_STORAGE_KEY = 'ff_modo_uso_ativo'
export const MODE_INTENT_STORAGE_KEY = 'ff_modo_uso_desejado'

export function normalizarModoUso(value?: string | null): TipoModoUso | null {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'jogador' || v === 'jogo' || v === 'gamer' || v === 'player') return 'jogador'
  if (v === 'equipe' || v === 'lider' || v === 'líder' || v === 'time') return 'equipe'
  if (v === 'produtora' || v === 'organizador' || v === 'organizador_evento') return 'produtora'
  if (v === 'manager' || v === 'gestor' || v === 'gestao' || v === 'gestão') return 'manager'
  if (v === 'visitante' || v === 'publico' || v === 'público') return 'visitante'
  return null
}

export function modoParaTipoIdentidade(modo?: TipoModoUso | null): TipoIdentidade {
  if (modo === 'jogador') return 'jogo'
  if (modo === 'equipe' || modo === 'manager') return 'equipe'
  if (modo === 'produtora') return 'produtora'
  return 'usuario'
}

export function tipoIdentidadeParaModo(tipo?: TipoIdentidade | null): TipoModoUso {
  if (tipo === 'jogo') return 'jogador'
  if (tipo === 'equipe') return 'equipe'
  if (tipo === 'produtora') return 'produtora'
  return 'visitante'
}

export function getModoUsoLabel(modo?: TipoModoUso | null) {
  if (modo === 'jogador') return 'Jogador'
  if (modo === 'equipe') return 'Líder / Equipe'
  if (modo === 'produtora') return 'Produtora'
  if (modo === 'manager') return 'Manager'
  return 'Visitante'
}

export function getModoUsoResumo(modo?: TipoModoUso | null) {
  if (modo === 'jogador') return 'Perfil de jogo, equipe, campeonatos e estatísticas.'
  if (modo === 'equipe') return 'Inscrição da equipe, elenco, lines, escalação e resultados.'
  if (modo === 'produtora') return 'Criação de eventos, venda de vagas, PIX, stream e gestão.'
  if (modo === 'manager') return 'Gestão de equipes, lines, jogadores e campeonatos vinculados.'
  return 'Explorar campeonatos, equipes, rankings e produtoras.'
}

export function getModeDashboardPath(modo?: TipoModoUso | null) {
  const normalizado = normalizarModoUso(modo) || 'visitante'
  return `/dashboard?modo=${normalizado}`
}

export function getIdentityName(perfil: any, fallback = 'Usuario') {
  return (
    perfil?.nome ||
    perfil?.nome_exibicao ||
    perfil?.username ||
    perfil?.nick ||
    fallback
  )
}

export function getIdentityImage(perfil: any) {
  return perfil?.avatar_url || perfil?.foto_url || perfil?.logo_url || perfil?.foto_capa || ''
}

export function getIdentityLabel(tipo: TipoIdentidade) {
  if (tipo === 'jogo') return 'Perfil de jogo'
  if (tipo === 'equipe') return 'Equipe'
  if (tipo === 'produtora') return 'Produtora'
  return 'Usuario'
}

export function getIdentityHome(tipo: TipoIdentidade, id?: string | null) {
  if (tipo === 'jogo') return getModeDashboardPath('jogador')
  if (tipo === 'equipe') return getModeDashboardPath('equipe')
  if (tipo === 'produtora') return getModeDashboardPath('produtora')
  return getModeDashboardPath('visitante')
}
