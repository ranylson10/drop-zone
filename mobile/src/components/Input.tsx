import { TextInput, TextInputProps, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

export function Input(props: TextInputProps) {
  const { colors } = useTheme()
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }, props.style]} />
}
const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 10, fontSize: 13 }
})
