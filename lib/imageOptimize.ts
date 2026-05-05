export type ImageOptimizePreset = 'avatar' | 'logo'

export type PixelCrop = {
  x: number
  y: number
  width: number
  height: number
}

export const IMAGE_OPTIMIZE_PRESETS: Record<
  ImageOptimizePreset,
  { width: number; height: number; quality: number; mimeType: 'image/webp'; extension: 'webp' }
> = {
  avatar: { width: 500, height: 600, quality: 0.82, mimeType: 'image/webp', extension: 'webp' },
  logo: { width: 500, height: 500, quality: 0.82, mimeType: 'image/webp', extension: 'webp' },
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = () => {
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
      img.src = String(reader.result || '')
    }

    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
    img.src = src
  })
}

export function sanitizeImageName(name: string, fallback = 'imagem') {
  return (name || fallback)
    .replace(/\.[^/.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || fallback
}

export async function optimizeImage(
  file: File,
  width: number,
  height: number,
  quality = 0.82
): Promise<Blob> {
  const image = await loadImageFromFile(file)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a imagem.')

  const imageAspect = image.width / image.height
  const targetAspect = width / height

  let sx = 0
  let sy = 0
  let sw = image.width
  let sh = image.height

  if (imageAspect > targetAspect) {
    sw = image.height * targetAspect
    sx = (image.width - sw) / 2
  } else {
    sh = image.width / targetAspect
    sy = (image.height - sh) / 2
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível compactar a imagem.'))
          return
        }
        resolve(blob)
      },
      'image/webp',
      quality
    )
  })
}

export async function optimizeImageToWebp(
  file: File,
  preset: ImageOptimizePreset
): Promise<File> {
  const config = IMAGE_OPTIMIZE_PRESETS[preset]
  const blob = await optimizeImage(file, config.width, config.height, config.quality)
  const safeName = sanitizeImageName(file.name, preset)

  return new File([blob], `${safeName}-${config.width}x${config.height}.${config.extension}`, {
    type: config.mimeType,
  })
}

export async function resizeCroppedAreaToWebp(
  imageSrc: string,
  pixelCrop: PixelCrop,
  width: number,
  height: number,
  quality = 0.82
): Promise<Blob> {
  const image = await loadImageFromSrc(imageSrc)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a imagem.')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  )

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível gerar a imagem compactada.'))
          return
        }
        resolve(blob)
      },
      'image/webp',
      quality
    )
  })
}

export async function resizeCroppedAreaToWebpFile(
  imageSrc: string,
  pixelCrop: PixelCrop,
  width: number,
  height: number,
  fileName = 'imagem.webp',
  quality = 0.82
): Promise<File> {
  const blob = await resizeCroppedAreaToWebp(imageSrc, pixelCrop, width, height, quality)
  const safeName = sanitizeImageName(fileName, 'imagem')
  return new File([blob], `${safeName}.webp`, { type: 'image/webp' })
}
