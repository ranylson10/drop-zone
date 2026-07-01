import { View, StyleSheet } from 'react-native'
import { SectionTitle, Tiny } from './AppText'
import { useTheme } from '@/theme/ThemeProvider'

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  const { colors } = useTheme()
  return <View style={styles.wrap}><SectionTitle>{title}</SectionTitle>{action ? <Tiny style={[styles.action, { color: colors.primary }]}>{action}</Tiny> : null}</View>
}
const styles = StyleSheet.create({ wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }, action: { letterSpacing: 0.9 } })
