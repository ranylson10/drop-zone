function normalizarTipo(tipo?: string | null) {
  return String(tipo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function getCampeonatoHref(id: string, tipo?: string | null) {
  switch (normalizarTipo(tipo)) {
    case 'diario':
    case 'diarios':
    case 'multi_horarios':
      return `/campeonatos/diarios/${id}`
    case '4x4':
    case 'confronto':
    case 'confrontos':
      return `/confrontos/${id}`
    case 'xtreino':
    case 'xtreinos':
    case 'treino':
    case 'showmatch':
    case 'semanal':
    case 'flexivel':
      return `/campeonatos/xtreinos/${id}`
    case 'copa':
    case 'copas':
    case 'mata_mata':
      return `/campeonatos/copas/${id}`
    case 'liga':
    case 'ligas':
    case 'pontos_corridos':
      return `/campeonatos/ligas/${id}`
    default:
      return `/campeonatos/${id}`
  }
}
