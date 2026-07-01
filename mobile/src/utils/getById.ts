export function getById<T extends { id?: string }>(items: T[], id?: string | string[]) {
  const key = Array.isArray(id) ? id[0] : id
  return items.find((item) => String(item.id) === String(key)) || items[0]
}
