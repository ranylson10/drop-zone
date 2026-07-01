import { View, StyleSheet, Pressable } from 'react-native'
import { Body, Subtitle, Tiny } from './AppText'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeProvider'

type Props = { title: string; meta?: string; tag?: string; right?: string; icon?: keyof typeof Ionicons.glyphMap; href?: string }
export function ListItem({ title, meta, tag, right, icon = 'ellipse', href }: Props) {
  const { colors } = useTheme()
  return <Pressable onPress={() => href ? router.push(href as any) : null} style={({ pressed }) => [styles.row, { backgroundColor: colors.card, borderColor: colors.border }, pressed && { opacity: 0.75 }]}> 
    <View style={[styles.avatar, { backgroundColor: colors.card2, borderColor: colors.border }]}><Ionicons name={icon} color={colors.text} size={20} /></View>
    <View style={{ flex: 1, gap: 3 }}><Body style={{ fontWeight: '900' }}>{title}</Body>{meta ? <Subtitle>{meta}</Subtitle> : null}{tag ? <Tiny>{tag}</Tiny> : null}</View>
    {right ? <View style={[styles.badge, { borderColor: colors.border, backgroundColor: colors.card2 }]}><Tiny style={{ color: colors.text }}>{right}</Tiny></View> : null}
    {href ? <Ionicons name="chevron-forward" color={colors.muted} size={16}/> : null}
  </Pressable>
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1 },
  avatar: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 }
})
