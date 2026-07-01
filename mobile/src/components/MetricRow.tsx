import { View, StyleSheet } from 'react-native'
import { Body, Tiny } from './AppText'
import { useTheme } from '@/theme/ThemeProvider'

export function MetricRow({ items }: { items: { label: string; value: string | number }[] }) {
  const { colors } = useTheme()
  return <View style={styles.wrap}>{items.map((item) => <View key={item.label} style={[styles.box, { borderColor: colors.border, backgroundColor: colors.card }]}><Body style={styles.value}>{item.value}</Body><Tiny>{item.label}</Tiny></View>)}</View>
}
const styles = StyleSheet.create({ wrap: { flexDirection: 'row', gap: 10 }, box: { flex: 1, padding: 13, borderWidth: 1, borderRadius: 18 }, value: { fontSize: 20, fontWeight: '900' } })
