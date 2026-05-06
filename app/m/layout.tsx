import { MobileShell } from './components/MobileShell'

export const metadata = {
  title: 'Drop Zone Mobile',
  colorScheme: 'light',
}

export const viewport = {
  themeColor: '#f8fafc',
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ colorScheme: 'light' }}>
      <MobileShell title="Drop Zone" subtitle="Mobile competitivo">{children}</MobileShell>
    </div>
  )
}
