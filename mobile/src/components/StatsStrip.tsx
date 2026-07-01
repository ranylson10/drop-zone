import { View, StyleSheet } from 'react-native'
import { Body, Tiny } from './AppText'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'

export function StatsStrip({ items }: { items: { label: string; value: string | number }[] }) {
  const { colors } = useTheme()
  return <View style={styles.wrap}>{items.map((item) => <View key={item.label} style={[styles.box, { borderColor: colors.border, backgroundColor: colors.panel }]}><Body style={styles.value}>{item.value}</Body><Tiny>{item.label}</Tiny></View>)}</View>
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8 },
  box: { flex: 1, paddingVertical: 9, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, borderRadius: 6, alignItems: 'center' },
  value: { fontSize: 16, fontWeight: '700' }
})
