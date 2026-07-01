export const freeFireMapImages = [
  { id: 'bermuda', nome: 'Bermuda', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/BERMUDA%201.png' },
  { id: 'purgatorio', nome: 'Purgatorio', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/PURGATORIO%201.png' },
  { id: 'kalahari', nome: 'Kalahari', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/KALAHARI%201.png' },
  { id: 'alpine', nome: 'Alpine', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/ALPINE%201.png' },
  { id: 'nova-terra', nome: 'Nova Terra', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/NOVA%20TERRA%201.png' },
  { id: 'solara', nome: 'Solara', url: 'https://frzyoeboocuptuqkbuvf.supabase.co/storage/v1/object/public/mapasff/SOLARA%201.png' },
]

export function normalizeFreeFireMapName(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+\d+$/g, '')
    .trim()
}

export function getFreeFireMapImage(value?: string | null) {
  const normalized = normalizeFreeFireMapName(value)
  return freeFireMapImages.find((mapa) => normalizeFreeFireMapName(mapa.nome) === normalized || mapa.id === normalized.replace(/\s+/g, '-')) || null
}
