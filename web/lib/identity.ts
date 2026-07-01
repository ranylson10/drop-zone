export type TipoIdentidade = 'usuario' | 'jogo' | 'equipe' | 'produtora'

export const IDENTITY_ONBOARDING_PATH = '/identidade'

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
  if (tipo === 'jogo') return '/perfil?tab=gamer'
  if (tipo === 'equipe') return id ? `/equipe/${id}` : '/equipe'
  if (tipo === 'produtora') return id ? `/produtora/${id}` : '/produtora'
  return '/feed'
}
