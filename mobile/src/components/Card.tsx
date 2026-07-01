import { ReactNode } from 'react'
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 6, padding: 10, gap: 7 }
})
