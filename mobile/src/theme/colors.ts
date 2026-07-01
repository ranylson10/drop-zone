export type AppColors = typeof lightColors

export const lightColors = {
  bg: '#FFFFFF',
  background: '#FFFFFF',
  bg2: '#F5F7FB',
  panel: '#FFFFFF',
  panel2: '#F8FAFC',
  card: '#FFFFFF',
  card2: '#F8FAFC',
  border: '#E4E4E7',
  borderSoft: '#EEF2F7',
  text: '#111827',
  muted: '#64748B',
  muted2: '#94A3B8',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EAF6FF',
  blue: '#2563EB',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  white: '#FFFFFF'
}

export const darkColors: AppColors = {
  bg: '#090D14',
  background: '#090D14',
  bg2: '#0D1320',
  panel: '#101827',
  panel2: '#151F31',
  card: '#111827',
  card2: '#172235',
  border: '#263348',
  borderSoft: '#1C2738',
  text: '#F8FAFC',
  muted: '#9AA8BC',
  muted2: '#64748B',
  primary: '#FACC15',
  primaryDark: '#EAB308',
  primarySoft: '#2B2610',
  blue: '#38BDF8',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#F43F5E',
  white: '#FFFFFF'
}

// Fallback legado para arquivos antigos que ainda importam `colors` fora do ThemeProvider.
// Mantido claro para não quebrar o modo claro; telas com suporte a tema devem usar useTheme().
export const colors = lightColors
