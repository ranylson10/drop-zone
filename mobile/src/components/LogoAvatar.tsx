import { useEffect, useState } from 'react'
import { View, StyleSheet, Image } from 'react-native'
import { Body } from './AppText'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'
import { resolveImageUrl } from '@/lib/images'

type Props = { name: string; uri?: string; size?: number; rounded?: number; type?: 'team' | 'champ' | 'player' }

export function LogoAvatar({ name, uri, size = 38, rounded = 12, type = 'team' }: Props) {
  const theme = useTheme()
  const colors = theme.colors
  const initials = (name || 'DZ').split(' ').map((p) => p[0]).join('').slice(0, 3).toUpperCase()
  const imageUri = resolveImageUrl(uri, type === 'player' ? 'avatars' : type === 'champ' ? 'imagem_campeonatos' : 'team-logos') || resolveImageUrl(uri, 'assets')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [imageUri])

  const bg = theme.mode === 'dark' ? colors.card2 : type === 'champ' ? '#F8FAFC' : type === 'player' ? '#F4F4F5' : '#F8FAFC'
  return <View style={[styles.wrap, { width: size, height: size, borderRadius: rounded, backgroundColor: bg, borderColor: colors.border }]}> 
    {imageUri && !failed ? <Image source={{ uri: imageUri }} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', borderRadius: rounded }} resizeMode="cover" /> : <Body style={[styles.initials, { fontSize: Math.max(10, size / 3.5) }]}>{initials}</Body>}
  </View>
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  initials: { fontWeight: '700', color: colors.primary, letterSpacing: -0.2 }
})
