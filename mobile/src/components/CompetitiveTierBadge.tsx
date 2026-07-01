import { StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Body, Tiny } from '@/components/AppText'

const tierVisuals: Record<string, { color: string; background: string; border: string; icon: keyof typeof Ionicons.glyphMap }> = {
  SS: { color: '#9A6700', background: '#FFF7D6', border: '#E7B52C', icon: 'diamond' },
  S: { color: '#7C3AED', background: '#F3E8FF', border: '#C084FC', icon: 'star' },
  A: { color: '#0369A1', background: '#E0F2FE', border: '#38BDF8', icon: 'shield-checkmark' },
  B: { color: '#047857', background: '#D1FAE5', border: '#34D399', icon: 'shield' },
  C: { color: '#475569', background: '#F1F5F9', border: '#94A3B8', icon: 'ribbon' },
  D: { color: '#9A3412', background: '#FFEDD5', border: '#FB923C', icon: 'medal' },
  E: { color: '#991B1B', background: '#FEE2E2', border: '#F87171', icon: 'ellipse' }
}

export function formatCompactScore(value: number) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  const format = (divisor: number, suffix: string) => {
    const result = number / divisor
    const digits = result >= 100 ? 0 : result >= 10 ? 1 : 2
    return `${Number(result.toFixed(digits)).toLocaleString('pt-BR')}${suffix}`
  }
  if (Math.abs(number) >= 1_000_000) return format(1_000_000, 'M')
  if (Math.abs(number) >= 1_000) return format(1_000, 'K')
  return Math.round(number).toLocaleString('pt-BR')
}

export function CompetitiveTierBadge({ tier, position }: { tier?: string | null; position?: number | null }) {
  const normalized = String(tier || 'E').toUpperCase()
  const visual = tierVisuals[normalized] || tierVisuals.E
  return <View style={[styles.badge, { backgroundColor: visual.background, borderColor: visual.border }]}>
    <Ionicons name={visual.icon} size={14} color={visual.color} />
    <View>
      <Body style={[styles.tier, { color: visual.color }]}>TIER {normalized}</Body>
      {position ? <Tiny style={[styles.position, { color: visual.color }]}>#{position} GERAL</Tiny> : null}
    </View>
  </View>
}

const styles = StyleSheet.create({
  badge: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  tier: { fontSize: 11, fontWeight: '900' },
  position: { fontSize: 8, fontWeight: '900' }
})
