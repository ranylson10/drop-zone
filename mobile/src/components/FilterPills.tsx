import { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Body } from './AppText'
import { useTheme } from '@/theme/ThemeProvider'

export function FilterPills({ children }: { children: ReactNode }) {
  return <View style={styles.wrap}>{children}</View>
}

export function FilterPill({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useTheme()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.pill,
      { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
      pressed && { opacity: 0.72 }
    ]}>
      {icon ? <Ionicons name={icon} size={15} color={active ? colors.bg : colors.primary} /> : null}
      <Body style={[styles.label, { color: active ? colors.bg : colors.text }]}>{label}</Body>
    </Pressable>
  )
}

export function FloatingPlus({ onPress, label = '+' }: { onPress: () => void; label?: string }) {
  const { colors } = useTheme()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.plus, { backgroundColor: colors.primary }, pressed && { opacity: 0.75 }]}>
      <Body style={[styles.plusTxt, { color: colors.bg }]}>{label}</Body>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 7, marginVertical: 2, flexWrap: 'wrap' },
  pill: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12 },
  label: { fontSize: 11.5, fontWeight: '800' },
  plus: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  plusTxt: { fontSize: 24, lineHeight: 28, fontWeight: '700' }
})
