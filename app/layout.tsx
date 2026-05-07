import './globals.css'
import type { Metadata, Viewport } from 'next'
import AppShell from './AppShell'

export const metadata: Metadata = {
  title: 'Drop Zone',
  description: 'Plataforma competitiva',
}

export const viewport: Viewport = {
  themeColor: '#f5f7fb',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="pt-br"
      suppressHydrationWarning
      className="light"
      data-theme="light"
      style={{
        colorScheme: 'light',
        backgroundColor: '#f5f7fb',
      }}
    >
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="theme-color" content="#f5f7fb" />
        <meta name="msapplication-TileColor" content="#f5f7fb" />
      </head>

      <body
        className="min-h-screen bg-[#f5f7fb] text-slate-950 font-sans selection:bg-blue-200 selection:text-slate-950"
        style={{
          colorScheme: 'light',
          backgroundColor: '#f5f7fb',
        }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
