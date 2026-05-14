'use client'

const SERVIDORES = [
  { value: 'BR', label: 'Brasil (BR)' },
  { value: 'LATAM', label: 'Latam (LATAM)' },
  { value: 'NA', label: 'América do Norte (NA)' },
  { value: 'US', label: 'Estados Unidos (US)' },
  { value: 'SAC', label: 'América do Sul (SAC)' },
  { value: 'EU', label: 'Europa (EU)' },
  { value: 'MEA', label: 'Oriente Médio e África (MEA)' },
  { value: 'IND', label: 'Índia (IND)' },
  { value: 'PK', label: 'Paquistão (PK)' },
  { value: 'BD', label: 'Bangladesh (BD)' },
  { value: 'TH', label: 'Tailândia (TH)' },
  { value: 'VN', label: 'Vietnã (VN)' },
  { value: 'ID', label: 'Indonésia (ID)' },
  { value: 'TW', label: 'Taiwan (TW)' },
  { value: 'SG', label: 'Singapura (SG)' },
  { value: 'CIS', label: 'Comunidade dos Estados Independentes (CIS)' },
]

type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

export default function ServidorSelect({ value, onChange, className = '', disabled = false }: Props) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`h-12 w-full rounded-md border border-[#dbe4ff] bg-white px-4 text-[14px] font-medium text-[#142340] outline-none transition focus:border-[#2563eb] ${className}`}
    >
      {SERVIDORES.map((servidor) => (
        <option key={servidor.value} value={servidor.value}>
          {servidor.label}
        </option>
      ))}
    </select>
  )
}
