import { MobileShell } from './components/MobileShell'

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell title="Drop Zone" subtitle="Mobile competitivo">{children}</MobileShell>
}
