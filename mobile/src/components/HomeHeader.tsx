import { View, StyleSheet } from 'react-native'
import { Title, Subtitle, Tiny } from './AppText'
import { useTheme } from '@/theme/ThemeProvider'

export function HomeHeader({ eyebrow, title, subtitle, usingMock }: { eyebrow: string; title: string; subtitle: string; usingMock?: boolean }) {
  const { colors, mode } = useTheme()
  return <View style={[styles.hero, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
    <Tiny>{eyebrow}</Tiny>
    <Title>{title}</Title>
    <Subtitle>{subtitle}</Subtitle>
    {usingMock ? <View style={[styles.notice, { borderColor: colors.warning, backgroundColor: mode === 'dark' ? '#1F1606' : '#FFFBEB' }]}><Tiny style={{ color: colors.warning }}>Modo visual: conecte o .env para puxar do Supabase</Tiny></View> : null}
  </View>
}
const styles = StyleSheet.create({
  hero: { borderWidth: 1, borderRadius: 24, padding: 18, gap: 8 },
  notice: { marginTop: 6, borderWidth: 1, padding: 10, borderRadius: 14 }
})
