import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Title, Tiny, Subtitle } from './AppText'
import { LogoAvatar } from './LogoAvatar'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'

type Props = { title: string; eyebrow: string; subtitle?: string; logo?: string; logoUri?: string; usingMock?: boolean }

export function SiteHeader({ title, eyebrow, subtitle, logo = 'DZ', logoUri, usingMock }: Props) {
  const theme = useTheme()
  const colors = theme.colors
  return <View style={[styles.wrap, { backgroundColor: colors.panel, borderColor: colors.border }]}>
    <View style={[styles.textureOne, { backgroundColor: colors.primarySoft }]} />
    <View style={[styles.textureTwo, { backgroundColor: theme.mode === 'dark' ? colors.blue : '#F1F5F9', opacity: theme.mode === 'dark' ? 0.16 : 0.9 }]} />
    <View style={styles.top}>
      <LogoAvatar name={logo} uri={logoUri} size={36} rounded={4} type="champ" />
      <View style={{ flex: 1 }}>
        <Tiny style={[styles.brand, { color: colors.primary }]}>{eyebrow}</Tiny>
        <Title style={[styles.title, { color: colors.text }]}>{title}</Title>
      </View>
      <View style={[styles.badge, { borderColor: colors.border, backgroundColor: colors.panel2 }]}><Ionicons name={usingMock ? 'flask-outline' : 'server-outline'} size={12} color={usingMock ? colors.warning : colors.primary}/><Tiny style={{ color: usingMock ? colors.warning : colors.primary }}>{usingMock ? 'demo' : 'db'}</Tiny></View>
    </View>
    {subtitle ? <Subtitle numberOfLines={2}>{subtitle}</Subtitle> : null}
  </View>
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 10, gap: 6, overflow: 'hidden' },
  textureOne: { position: 'absolute', right: -18, top: -24, width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primarySoft, opacity: 0.75 },
  textureTwo: { position: 'absolute', left: 12, bottom: -30, width: 150, height: 54, borderRadius: 28, backgroundColor: '#F1F5F9', opacity: 0.9 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brand: { color: colors.primary, letterSpacing: 1.4, fontWeight: '900' },
  title: { fontSize: 20, letterSpacing: -0.3, color: '#082F49' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 5 }
})
