import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DropZone',
    short_name: 'DropZone',
    description: 'Centro competitivo DropZone para equipes, campeonatos, chat e pagamentos PIX.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f7fb',
    theme_color: '#008069',
    categories: ['sports', 'social', 'games'],
    icons: [
      {
        src: '/brand/dropzone-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}
