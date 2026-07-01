import { memo, useState } from 'react'
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Body, Subtitle, Tiny } from './AppText'
import { LogoAvatar } from './LogoAvatar'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'

type Props = {
  title: string
  meta?: string
  tag?: string
  right?: string
  href?: string
  onPress?: () => void
  logo?: string
  logoUri?: string
  imageUri?: string
  type?: 'team' | 'champ' | 'player'
  enableImageViewer?: boolean
}

function CompactRowComponent({ title, meta, tag, right, href, onPress, logo, logoUri, imageUri, type = 'team', enableImageViewer = true }: Props) {
  const theme = useTheme()
  const colors = theme.colors
  const [viewerOpen, setViewerOpen] = useState(false)

  if (type === 'champ' && imageUri) {
    return <View style={[styles.marketCard, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}>
      <Pressable onPress={() => enableImageViewer ? setViewerOpen(true) : onPress ? onPress() : href ? router.push(href as any) : null} style={({ pressed }) => [styles.marketImageWrap, { backgroundColor: colors.panel2, borderColor: colors.borderSoft }, pressed && { opacity: 0.82 }]}> 
        <Image source={{ uri: imageUri, cache: 'force-cache' }} style={styles.marketImage} resizeMode="cover" fadeDuration={0} resizeMethod="resize" />
        {enableImageViewer ? <View style={styles.expandBadge}>
          <Ionicons name="expand-outline" color={colors.white} size={14} />
        </View> : null}
      </Pressable>

      <Pressable onPress={() => onPress ? onPress() : href ? router.push(href as any) : null} style={({ pressed }) => [styles.marketInfo, pressed && { opacity: 0.72 }]}> 
        <View style={styles.marketTop}>
          <LogoAvatar name={logo || title} uri={logoUri} type={type} size={34} />
          {tag ? <Tiny numberOfLines={1} style={[styles.tag, { color: colors.primary, backgroundColor: colors.primarySoft }]}>{tag}</Tiny> : null}
        </View>
        <Body numberOfLines={2} style={styles.marketTitle}>{title}</Body>
        {meta ? <Subtitle numberOfLines={2} style={styles.marketMeta}>{meta}</Subtitle> : null}
        <View style={styles.marketBottom}>
          {right ? <Tiny numberOfLines={1} style={[styles.marketRight, { color: colors.text, backgroundColor: colors.panel2 }]}>{right}</Tiny> : null}
          {href ? <Ionicons name="chevron-forward" color={colors.muted2} size={17}/> : null}
        </View>
      </Pressable>

      {enableImageViewer ? <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View style={styles.fullscreenBackdrop}>
          <Pressable onPress={() => setViewerOpen(false)} style={styles.fullscreenClose}>
            <Ionicons name="close" color={colors.white} size={28} />
          </Pressable>
          <Image source={{ uri: imageUri }} style={styles.fullscreenImage} resizeMode="contain" fadeDuration={0} />
        </View>
      </Modal> : null}
    </View>
  }

  return <Pressable onPress={() => onPress ? onPress() : href ? router.push(href as any) : null} style={({ pressed }) => [styles.row, { backgroundColor: colors.card, borderColor: colors.borderSoft }, pressed && { opacity: 0.72 }]}> 
    <LogoAvatar name={logo || title} uri={logoUri} type={type} />
    <View style={styles.info}>
      <View style={styles.line}><Body numberOfLines={1} style={styles.title}>{title}</Body>{tag ? <Tiny numberOfLines={1} style={[styles.tag, { color: colors.primary, backgroundColor: colors.primarySoft }]}>{tag}</Tiny> : null}</View>
      {meta ? <Subtitle numberOfLines={1} style={styles.meta}>{meta}</Subtitle> : null}
    </View>
    {right ? <Tiny numberOfLines={1} style={[styles.right, { color: colors.text, backgroundColor: colors.panel2 }]}>{right}</Tiny> : null}
    {href ? <Ionicons name="chevron-forward" color={colors.muted2} size={15}/> : null}
  </Pressable>
}

export const CompactRow = memo(CompactRowComponent)

const styles = StyleSheet.create({
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 8, backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.borderSoft },
  marketCard: { minHeight: 132, flexDirection: 'row', gap: 10, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, overflow: 'hidden' },
  marketImageWrap: { width: 126, height: 126, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.borderSoft },
  marketImage: { width: '100%', height: '100%' },
  expandBadge: { position: 'absolute', right: 6, top: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(2,6,23,0.62)', alignItems: 'center', justifyContent: 'center' },
  marketInfo: { flex: 1, minHeight: 126, paddingVertical: 3, gap: 5, justifyContent: 'space-between' },
  marketTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  marketTitle: { fontWeight: '900', flexShrink: 1, fontSize: 14.5, lineHeight: 18 },
  marketMeta: { fontSize: 11.5, lineHeight: 15 },
  marketBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  marketRight: { color: colors.text, backgroundColor: colors.panel2, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5, overflow: 'hidden', maxWidth: 92, fontWeight: '900' },
  fullscreenBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', alignItems: 'center', justifyContent: 'center' },
  fullscreenImage: { width: '100%', height: '86%' },
  fullscreenClose: { position: 'absolute', top: 42, right: 18, zIndex: 2, width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontWeight: '700', flexShrink: 1, fontSize: 13 },
  meta: { fontSize: 11.5 },
  tag: { color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', fontSize: 8.5 },
  right: { color: colors.text, backgroundColor: colors.panel2, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 4, overflow: 'hidden', maxWidth: 74 }
})
