import { Pressable, Text, StyleSheet, PressableProps, StyleProp, ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

export function Button({ label, variant = 'primary', style, ...props }: PressableProps & { label: string; variant?: 'primary' | 'ghost' | 'dark'; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  return <Pressable {...props} style={({ pressed }) => [styles.btn, { backgroundColor: colors.primary }, variant === 'ghost' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }, variant === 'dark' && { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border }, style, pressed && { opacity: 0.75 }]}><Text style={[styles.txt, { color: variant === 'primary' ? colors.bg : colors.text }]}>{label}</Text></Pressable>
}
const styles = StyleSheet.create({
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  txt: { fontWeight: '700', fontSize: 12 }
})
