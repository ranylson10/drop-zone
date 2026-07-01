import { View, StyleSheet } from 'react-native'
import { Body, Tiny } from './AppText'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'

export function InfoGrid({ items }: { items: { label: string; value: string | number }[] }) {
  const { colors } = useTheme()
  return <View style={styles.grid}>{items.map((item) => <View key={item.label} style={[styles.box, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}>
    <Tiny>{item.label}</Tiny>
    <Body numberOfLines={1} style={styles.value}>{item.value}</Body>
  </View>)}</View>
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  box: { width: '48.8%', borderWidth: 1, borderRadius: 6, padding: 10, gap: 3 },
  value: { fontWeight: '700', fontSize: 13 }
})
