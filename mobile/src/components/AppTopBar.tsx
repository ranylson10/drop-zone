import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Body, Tiny, Subtitle } from './AppText'
import { LogoAvatar } from './LogoAvatar'
import { DropZoneLogoInline } from './DropZoneLogo'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'
import { supabase } from '@/lib/supabase'
import { pickImage } from '@/lib/images'
import { registerPushNotifications } from '@/lib/notifications'
import { tapSound } from '@/lib/sounds'

const titles: Record<string, string> = {
  campeonatos: 'campeonatos',
  equipes: 'equipes',
  jogadores: 'jogadores',
  calendario: 'calendario',
  feed: 'feed',
  chat: 'chat',
  produtoras: 'produtoras',
  'meu-perfil': 'meu perfil'
}

const menu = [
  { label: 'Meu perfil', route: '/meu-perfil', icon: 'person-circle-outline' },
  { label: 'Feed', route: '/(tabs)/feed', icon: 'newspaper-outline' },
  { label: 'Campeonatos', route: '/(tabs)/campeonatos', icon: 'trophy-outline' },
  { label: 'Equipes', route: '/(tabs)/equipes', icon: 'shield-outline' },
  { label: 'Jogadores', route: '/(tabs)/jogadores', icon: 'people-outline' },
  { label: 'Calendario', route: '/(tabs)/calendario', icon: 'calendar-outline' },
  { label: 'Chat', route: '/(tabs)/chat', icon: 'chatbubbles-outline' },
  { label: 'Produtoras', route: '/produtoras', icon: 'business-outline' }
] as const

export function AppTopBar() {
  const theme = useTheme()
  const colors = theme.colors
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const key = pathname.split('/').filter(Boolean).pop() || 'feed'
  const title = pathname.includes('/equipe/') ? 'equipe' : pathname.includes('/campeonato/') ? 'campeonato' : pathname.includes('/produtora/') ? 'produtora' : pathname.includes('/meu-perfil') ? 'meu perfil' : pathname.includes('/jogador/') ? 'jogador' : titles[key] || key

  useEffect(() => {
    let alive = true
    async function loadUser() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (!alive) return
      setUser(data.user || null)
      if (data.user) {
        const { data: prof } = await supabase
          .from('perfis')
          .select('id,nome,username,avatar_url')
          .eq('id', data.user.id)
          .maybeSingle()
        if (alive) setProfile(prof || null)
      } else {
        setProfile(null)
      }
    }
    loadUser()
    registerPushNotifications().catch(() => null)
    const sub = supabase?.auth.onAuthStateChange?.((_event, session) => {
      setUser(session?.user || null)
      if (!session?.user) setProfile(null)
      else loadUser()
    })
    return () => {
      alive = false
      sub?.data?.subscription?.unsubscribe?.()
    }
  }, [])

  function go(route: string) {
    setOpen(false)
    setProfileOpen(false)
    router.push(route as any)
  }

  async function logout() {
    setProfileOpen(false)
    await supabase?.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/(auth)/login' as any)
  }

  return <View style={[styles.wrap, { backgroundColor: colors.bg, borderBottomColor: colors.borderSoft }]}>
    <Pressable onPress={() => setOpen(true)} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="menu-outline" size={22} color={colors.text} />
    </Pressable>
    <Body style={styles.title}>{title}</Body>
    <Pressable onPress={() => router.push('/(tabs)/chat')} style={[styles.quick, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
      <Tiny style={styles.quickLabel}>chat</Tiny>
    </Pressable>
    <Pressable onPress={async () => { await tapSound(); router.push('/notificacoes' as any) }} style={[styles.quick, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="notifications-outline" size={18} color={colors.primary} />
      <Tiny style={styles.quickLabel}>alertas</Tiny>
    </Pressable>
    <Pressable onPress={() => user ? setProfileOpen(true) : router.push('/(auth)/login' as any)} style={styles.profileBtn}>
      {user ? <LogoAvatar name={profile?.nome || profile?.username || user.email || 'U'} uri={pickImage(profile || {}, ['avatar_url', 'imagem_url'], 'avatars')} size={34} rounded={17} type="player" /> : <Ionicons name="person-circle-outline" size={28} color={colors.warning} />}
    </Pressable>

    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.overlay} onPress={() => setOpen(false)}><View /></Pressable>
      <View style={[styles.drawer, { backgroundColor: colors.bg, borderRightColor: colors.border }]}>
        <View style={[styles.drawerHead, { borderBottomColor: colors.borderSoft }]}>
          <View style={styles.brandRow}><DropZoneLogoInline size={28} color={colors.primary} /><Body style={styles.brand}>DROP ZONE</Body></View>
          <Pressable onPress={() => setOpen(false)} style={styles.close}><Ionicons name="close-outline" size={22} color={colors.text} /></Pressable>
        </View>
        <ScrollView>{menu.map((item) => (
          <Pressable key={item.route} onPress={() => go(item.route)} style={[styles.menuItem, { borderBottomColor: colors.borderSoft }]}>
            <Ionicons name={item.icon as any} size={19} color={colors.primary} />
            <Body style={styles.menuText}>{item.label}</Body>
          </Pressable>
        ))}
          <Pressable onPress={theme.toggleTheme} style={[styles.menuItem, { borderBottomColor: colors.borderSoft }]}>
            <Ionicons name={theme.mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={19} color={colors.primary} />
            <Body style={styles.menuText}>{theme.mode === 'dark' ? 'Tema claro' : 'Tema e-sports'}</Body>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>

    <Modal visible={profileOpen} transparent animationType="fade" onRequestClose={() => setProfileOpen(false)}>
      <Pressable style={styles.overlay} onPress={() => setProfileOpen(false)}><View /></Pressable>
      <View style={[styles.profileMenu, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View style={[styles.profileHead, { borderBottomColor: colors.borderSoft }]}>
          <LogoAvatar name={profile?.nome || profile?.username || user?.email || 'U'} uri={pickImage(profile || {}, ['avatar_url', 'imagem_url'], 'avatars')} size={46} rounded={23} type="player" />
          <View style={{ flex: 1 }}>
            <Body style={styles.menuText}>{profile?.nome || profile?.username || user?.email || 'Usuario'}</Body>
            <Subtitle numberOfLines={1}>{profile?.perfil_ativo || profile?.tipo_perfil || 'perfil padrão'}</Subtitle>
          </View>
        </View>
        <Pressable onPress={() => go('/meu-perfil')} style={[styles.profileItem, { backgroundColor: colors.card2 }]}><Ionicons name="person-circle-outline" size={18} color={colors.primary}/><Body>Meu perfil</Body></Pressable>
        <Pressable onPress={() => go('/criar/perfil')} style={[styles.profileItem, { backgroundColor: colors.card2 }]}><Ionicons name="swap-horizontal-outline" size={18} color={colors.primary}/><Body>Trocar tipo de perfil</Body></Pressable>
        <Pressable onPress={() => go('/criar/perfil')} style={[styles.profileItem, { backgroundColor: colors.card2 }]}><Ionicons name="create-outline" size={18} color={colors.primary}/><Body>Atualizar dados da conta</Body></Pressable>
        <Pressable onPress={logout} style={[styles.profileItem, { backgroundColor: colors.card2 }]}><Ionicons name="log-out-outline" size={18} color={colors.danger}/><Body style={{ color: colors.danger }}>Sair da conta</Body></Pressable>
      </View>
    </Modal>
  </View>
}

const styles = StyleSheet.create({
  wrap: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, backgroundColor: colors.bg },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.card },
  title: { flex: 1, fontSize: 15, fontWeight: '700', textTransform: 'lowercase' },
  quick: { minWidth: 46, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.card },
  quickLabel: { color: colors.primary, fontSize: 8.5, letterSpacing: 0.2 },
  profileBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.34)' },
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 286, backgroundColor: colors.bg, borderRightWidth: 1, borderRightColor: colors.border, paddingTop: 46 },
  drawerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { color: colors.primary, fontWeight: '800', letterSpacing: 1.4 },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  menuItem: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  menuText: { fontWeight: '700' },
  profileMenu: { position: 'absolute', right: 10, top: 58, width: 282, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, gap: 8 },
  profileHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  profileItem: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.card2 }
})
