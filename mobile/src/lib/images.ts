const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || ''

const KNOWN_BUCKETS = [
  'assets',
  'avatars',
  'gamer-covers',
  'imagem_campeonatos',
  'imagem_produtoras',
  'imagens_perfil',
  'post-images',
  'team-covers',
  'team-logos',
  'denuncias',
  'documentos',
]

function publicObjectUrl(bucket: string, path: string) {
  if (!SUPABASE_URL) return `${bucket}/${path}`
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, '')}`
}

export function resolveImageUrl(value?: string | null, bucket = 'assets') {
  if (!value) return undefined
  const clean = String(value).trim()
  if (!clean) return undefined
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:image')) return clean

  const noSlash = clean.replace(/^\/+/, '')
  if (noSlash.includes('/storage/v1/object/public/')) {
    return noSlash.startsWith('http') ? noSlash : `${SUPABASE_URL}/${noSlash}`
  }

  const bucketPrefix = KNOWN_BUCKETS.find((knownBucket) => noSlash === knownBucket || noSlash.startsWith(`${knownBucket}/`))
  if (bucketPrefix) {
    const path = noSlash.replace(`${bucketPrefix}/`, '')
    return publicObjectUrl(bucketPrefix, path)
  }

  return publicObjectUrl(bucket, noSlash)
}

export function pickImage(item: any, keys: string[], bucket = 'assets') {
  for (const key of keys) {
    const url = resolveImageUrl(item?.[key], bucket)
    if (url) return url
  }
  return undefined
}

export function pickImageFromBuckets(item: any, keys: string[], buckets: string[]) {
  for (const key of keys) {
    const value = item?.[key]
    if (!value) continue
    for (const bucket of buckets) {
      const url = resolveImageUrl(value, bucket)
      if (url) return url
    }
  }
  return undefined
}
