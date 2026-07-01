export function getCampeonatoHref(campeonato: { id?: string | null; tipo?: string | null; tipo_competicao?: string | null; modelo_competicao?: string | null }) {
  const id = campeonato.id || ''
  const raw = String(campeonato.tipo_competicao || campeonato.modelo_competicao || campeonato.tipo || '').toLowerCase()

  if (raw.includes('diario')) return `/campeonatos/diarios/${id}`
  if (raw.includes('copa')) return `/campeonatos/copas/${id}`
  if (raw.includes('liga')) return `/campeonatos/ligas/${id}`
  if (raw.includes('xtreino') || raw.includes('treino')) return `/campeonatos/xtreinos/${id}`

  return `/campeonatos/${id}`
}
