export type TipoCompeticao = 'diario' | 'xtreino' | 'copa' | 'liga'

export const TIPOS_COMPETICAO: Array<{
  slug: TipoCompeticao
  titulo: string
  subtitulo: string
  modelo: string
  formatoBanco: string
  hrefLista: string
  hrefCriacao: string
  badge: string
  usaCampeonatos?: boolean
}> = [
  {
    slug: 'diario',
    titulo: 'DIÁRIO',
    subtitulo: 'Múltiplos horários independentes, cada um com inscrições, tabela e campeão próprios.',
    modelo: 'diario',
    formatoBanco: 'Diário',
    hrefLista: '/campeonatos/diarios',
    hrefCriacao: '/campeonatos/nova/diario',
    badge: 'Multi-horários',
  },
  {
    slug: 'xtreino',
    titulo: 'XTREINO',
    subtitulo: 'Formato mais flexível para treino, amistoso ou teste de lobby.',
    modelo: 'xtreino',
    formatoBanco: 'Xtreino',
    hrefLista: '/campeonatos/xtreinos',
    hrefCriacao: '/campeonatos/nova/xtreino',
    badge: 'Flexível',
  },
  {
    slug: 'copa',
    titulo: 'COPA',
    subtitulo: 'Mata-mata com chave, avanço de fase e decisão por partidas.',
    modelo: 'copa',
    formatoBanco: 'Copa',
    hrefLista: '/campeonatos/copas',
    hrefCriacao: '/campeonatos/nova/copa',
    badge: 'Mata-mata',
  },
  {
    slug: 'liga',
    titulo: 'LIGA',
    subtitulo: 'Pontos corridos com rodadas, tabela e classificação acumulada.',
    modelo: 'liga',
    formatoBanco: 'Liga',
    hrefLista: '/campeonatos/ligas',
    hrefCriacao: '/campeonatos/nova/liga',
    badge: 'Pontos corridos',
  },
]

export function normalizarTipoCompeticao(input: unknown): TipoCompeticao | null {
  const valor = String(input || '').trim().toLowerCase()

  if (valor === 'diario' || valor === 'diário' || valor === 'multi_horarios') return 'diario'
  if (valor === 'xtreino' || valor === 'treino' || valor === 'showmatch' || valor === 'semanal' || valor === 'flexivel') return 'xtreino'
  if (valor === 'copa' || valor === 'mata_mata') return 'copa'
  if (valor === 'liga' || valor === 'pontos_corridos') return 'liga'

  return null
}

export function resolverTipoCompeticao(camp: any): TipoCompeticao | null {
  return normalizarTipoCompeticao(camp?.tipo_competicao || camp?.formato || camp?.modelo_competicao)
}
