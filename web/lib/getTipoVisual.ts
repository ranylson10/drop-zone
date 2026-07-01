export type TipoVisual = {
  key: string
  label: string
  accent: string
  border: string
  borderStrong: string
  bg: string
  bgSoft: string
  text: string
  textSoft: string
  badge: string
  chip: string
  button: string
  buttonOutline: string
  icon: string
}

export function getTipoVisual(tipo?: string | null): TipoVisual {
  const key = String(tipo || '').toLowerCase().trim()

  const mapa: Record<string, TipoVisual> = {
    diario: {
      key: 'diario',
      label: 'Diário',
      accent: 'bg-sky-500',
      border: 'border-sky-200',
      borderStrong: 'border-l-sky-500',
      bg: 'bg-sky-50',
      bgSoft: 'bg-sky-50/70',
      text: 'text-sky-700',
      textSoft: 'text-sky-600',
      badge: 'border border-sky-200 bg-sky-50 text-sky-700',
      chip: 'border-sky-200 bg-sky-50 text-sky-700',
      button: 'bg-sky-600 text-white hover:bg-sky-700',
      buttonOutline: 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
      icon: 'CalendarClock',
    },
    xtreino: {
      key: 'xtreino',
      label: 'Xtreino',
      accent: 'bg-emerald-500',
      border: 'border-emerald-200',
      borderStrong: 'border-l-emerald-500',
      bg: 'bg-emerald-50',
      bgSoft: 'bg-emerald-50/70',
      text: 'text-emerald-700',
      textSoft: 'text-emerald-600',
      badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      button: 'bg-emerald-600 text-white hover:bg-emerald-700',
      buttonOutline: 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      icon: 'Target',
    },
    copa: {
      key: 'copa',
      label: 'Copa',
      accent: 'bg-violet-500',
      border: 'border-violet-200',
      borderStrong: 'border-l-violet-500',
      bg: 'bg-violet-50',
      bgSoft: 'bg-violet-50/70',
      text: 'text-violet-700',
      textSoft: 'text-violet-600',
      badge: 'border border-violet-200 bg-violet-50 text-violet-700',
      chip: 'border-violet-200 bg-violet-50 text-violet-700',
      button: 'bg-violet-600 text-white hover:bg-violet-700',
      buttonOutline: 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
      icon: 'GitBranch',
    },
    liga: {
      key: 'liga',
      label: 'Liga',
      accent: 'bg-amber-500',
      border: 'border-amber-200',
      borderStrong: 'border-l-amber-500',
      bg: 'bg-amber-50',
      bgSoft: 'bg-amber-50/70',
      text: 'text-amber-700',
      textSoft: 'text-amber-600',
      badge: 'border border-amber-200 bg-amber-50 text-amber-700',
      chip: 'border-amber-200 bg-amber-50 text-amber-700',
      button: 'bg-amber-500 text-white hover:bg-amber-600',
      buttonOutline: 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
      icon: 'ListOrdered',
    },
  }

  return mapa[key] || {
    key: 'padrao',
    label: 'Campeonato',
    accent: 'bg-[#2563eb]',
    border: 'border-blue-200',
    borderStrong: 'border-l-[#2563eb]',
    bg: 'bg-blue-50',
    bgSoft: 'bg-blue-50/70',
    text: 'text-[#2563eb]',
    textSoft: 'text-blue-600',
    badge: 'border border-blue-200 bg-blue-50 text-blue-700',
    chip: 'border-blue-200 bg-blue-50 text-blue-700',
    button: 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
    buttonOutline: 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
    icon: 'Trophy',
  }
}
