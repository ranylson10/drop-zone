import './escala-beta.css'

export default function EscalaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="escala-beta-root" data-escala-beta="true">
      {children}
    </div>
  )
}
