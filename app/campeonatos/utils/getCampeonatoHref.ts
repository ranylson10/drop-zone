export function getCampeonatoHref(id: string, tipo?: string | null) {
  switch (String(tipo || '').toLowerCase()) {
    case 'diario':
      return `/campeonatos/diarios/${id}`
    case '4x4':
    case 'confronto':
      return `/confrontos/${id}`
    case 'xtreino':
      return `/campeonatos/xtreinos/${id}`
    case 'copa':
      return `/campeonatos/copas/${id}`
    case 'liga':
      return `/campeonatos/ligas/${id}`
    default:
      return `/campeonatos/${id}`
  }
}
