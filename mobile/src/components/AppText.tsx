import { Text, TextProps, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

export function Title(props: TextProps) { const { colors } = useTheme(); return <Text {...props} style={[styles.title, { color: colors.text }, props.style]} /> }
export function SectionTitle(props: TextProps) { const { colors } = useTheme(); return <Text {...props} style={[styles.section, { color: colors.text }, props.style]} /> }
export function Subtitle(props: TextProps) { const { colors } = useTheme(); return <Text {...props} style={[styles.subtitle, { color: colors.muted }, props.style]} /> }
export function Body(props: TextProps) { const { colors } = useTheme(); return <Text {...props} style={[styles.body, { color: colors.text }, props.style]} /> }
export function Tiny(props: TextProps) { const { colors } = useTheme(); return <Text {...props} style={[styles.tiny, { color: colors.muted }, props.style]} /> }

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  section: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  subtitle: { fontSize: 11.5, lineHeight: 16 },
  body: { fontSize: 13, lineHeight: 18 },
  tiny: { fontSize: 9.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 }
})
