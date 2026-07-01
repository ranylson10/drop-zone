import React from 'react'

type BaseProps = React.HTMLAttributes<HTMLDivElement> & {
 children: React.ReactNode
}

export function DzCard({ children, className = '', ...props }: BaseProps) {
 return (
 <div className={`dz-card ${className}`} {...props}>
 {children}
 </div>
 )
}

export function DzSectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
 return (
 <div className="mb-3 flex items-end justify-between gap-3">
 <div>
 <div className="dz-kicker">Drop Zone</div>
 <h2 className="dz-title mt-1">{title}</h2>
 {subtitle ? <p className="dz-subtitle mt-1 text-[12px]">{subtitle}</p> : null}
 </div>
 </div>
 )
}

export function DzBadge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' }) {
 const toneClass = tone === 'default' ? '' : `dz-badge-${tone}`
 return <span className={`dz-badge ${toneClass}`}>{children}</span>
}

export function DzIconButton({ children, title, onClick, className = '' }: { children: React.ReactNode; title?: string; onClick?: () => void; className?: string }) {
 return (
 <button type="button" title={title} onClick={onClick} className={`dz-btn dz-btn-secondary dz-btn-icon ${className}`}>
 {children}
 </button>
 )
}
