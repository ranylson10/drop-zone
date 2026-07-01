import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Title, Tiny } from './AppText'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'

export function BackHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  const { colors } = useTheme()
  return <View style={styles.wrap}>
    <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="chevron-back" size={22} color={colors.text}/></Pressable>
    <View style={{ flex: 1 }}>
      {eyebrow ? <Tiny>{eyebrow}</Tiny> : null}
      <Title style={{ fontSize: 24 }}>{title}</Title>
    </View>
  </View>
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }
})
