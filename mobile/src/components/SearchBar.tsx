import { View, TextInput, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeProvider'

export function SearchBar({ placeholder }: { placeholder: string }) {
  const { colors } = useTheme()
  return <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Ionicons name="search" color={colors.muted} size={18}/>
    <TextInput placeholder={placeholder} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text }]}/>
  </View>
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, height: 42 },
  input: { flex: 1, fontSize: 13 }
})
