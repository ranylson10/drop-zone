import { ImageBackground, StyleSheet, View } from 'react-native'
import { Body, Subtitle, Tiny } from './AppText'
import { LogoAvatar } from './LogoAvatar'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'
import { resolveImageUrl } from '@/lib/images'

type Props = { title: string; subtitle?: string; badge?: string; imageUri?: string; logo?: string; logoUri?: string; type?: 'champ' | 'team' | 'player' }

export function HeroBanner({ title, subtitle, badge, imageUri, logo = 'DZ', logoUri, type = 'champ' }: Props) {
  const theme = useTheme()
  const colors = theme.colors
  const uri = resolveImageUrl(imageUri, 'assets')
  const content = <View style={[styles.overlay, { backgroundColor: theme.mode === 'dark' ? 'rgba(9,13,20,0.70)' : 'rgba(255,255,255,0.72)' }]}>
    <View style={styles.row}>
      <LogoAvatar name={logo} uri={logoUri} size={52} rounded={4} type={type} />
      <View style={{ flex: 1 }}>
        {badge ? <Tiny style={[styles.badge, { color: colors.primary }]}>{badge}</Tiny> : null}
        <Body numberOfLines={2} style={[styles.title, { color: colors.text }]}>{title}</Body>
        {subtitle ? <Subtitle numberOfLines={2}>{subtitle}</Subtitle> : null}
      </View>
    </View>
  </View>
  if (!uri) return <View style={[styles.hero, styles.fallback, { backgroundColor: colors.panel2, borderColor: colors.border }]}>{content}</View>
  return <ImageBackground source={{ uri }} style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]} imageStyle={[styles.image, { opacity: theme.mode === 'dark' ? 0.26 : 0.42 }]}>{content}</ImageBackground>
}

const styles = StyleSheet.create({
  hero: { minHeight: 118, overflow: 'hidden', borderRadius: 6, borderWidth: 1 },
  image: { borderRadius: 6 },
  fallback: {},
  overlay: { flex: 1, justifyContent: 'flex-end', padding: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  badge: { fontWeight: '700', marginBottom: 2 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }
})
