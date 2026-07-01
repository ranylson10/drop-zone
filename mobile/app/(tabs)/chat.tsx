import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { Screen } from '@/components/Screen'
import { LogoAvatar } from '@/components/LogoAvatar'
import { Body, Subtitle, Tiny, Title } from '@/components/AppText'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/theme/ThemeProvider'

type Conversa = {
  id: string
  tipo: string
  titulo: string
  avatar_url?: string | null
  ultimo_texto?: string | null
  ultima_mensagem_em?: string | null
  created_at?: string | null
}

type Participante = {
  conversa_id: string
  ultima_lida_em?: string | null
}

function isSolo(tipo?: string | null) {
  return ['dm', 'privado', 'private', 'solo'].includes(String(tipo || '').toLowerCase())
}

function timeLabel(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function Chat() {
  const { colors } = useTheme()
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [tab, setTab] = useState<'todas' | 'grupos' | 'solo'>('todas')
  const [search, setSearch] = useState('')

  const carregar = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      setNeedsLogin(true)
      setLoading(false)
      return
    }

    setNeedsLogin(false)
    const { data: parts, error: partsError } = await supabase
      .from('chat_participantes')
      .select('conversa_id,ultima_lida_em')
      .eq('user_id', user.id)
    if (partsError) {
      setLoading(false)
      return
    }

    const ownParts = (parts || []) as Participante[]
    const ids = ownParts.map((item) => item.conversa_id).filter(Boolean)
    setParticipantes(ownParts)
    if (!ids.length) {
      setConversas([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('chat_conversas')
      .select('id,tipo,titulo,avatar_url,ultimo_texto,ultima_mensagem_em,created_at')
      .in('id', ids)
      .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    setConversas((data || []) as Conversa[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => {
    carregar()
  }, [carregar]))

  const filtradas = useMemo(() => {
    const term = search.trim().toLowerCase()
    return conversas.filter((item) => {
      if (tab === 'solo' && !isSolo(item.tipo)) return false
      if (tab === 'grupos' && isSolo(item.tipo)) return false
      return !term || `${item.titulo || ''} ${item.ultimo_texto || ''}`.toLowerCase().includes(term)
    })
  }, [conversas, search, tab])

  function unread(item: Conversa) {
    const lastRead = participantes.find((part) => part.conversa_id === item.id)?.ultima_lida_em
    if (!item.ultima_mensagem_em) return false
    return !lastRead || new Date(item.ultima_mensagem_em).getTime() > new Date(lastRead).getTime()
  }

  return <Screen scroll={false} showTopBar={false} contentStyle={styles.screen}>
    <View style={styles.header}>
      <View>
        <Tiny style={{ color: colors.primary }}>DROP ZONE</Tiny>
        <Title style={styles.title}>Mensagens</Title>
      </View>
      <View style={styles.headerActions}>
        <Pressable style={[styles.iconButton, { backgroundColor: colors.card2 }]} onPress={carregar}>
          <Ionicons name="refresh-outline" size={22} color={colors.text} />
        </Pressable>
        <Pressable style={[styles.iconButton, { backgroundColor: colors.card2 }]}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>

    <View style={[styles.search, { backgroundColor: colors.card2 }]}>
      <Ionicons name="search-outline" size={21} color={colors.muted} />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Pesquisar conversas"
        placeholderTextColor={colors.muted}
        style={[styles.searchInput, { color: colors.text }]}
      />
      {search ? <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={19} color={colors.muted} /></Pressable> : null}
    </View>

    <View style={styles.filters}>
      {([
        ['todas', 'Todas'],
        ['grupos', 'Grupos'],
        ['solo', 'Solo']
      ] as const).map(([value, label]) => {
        const active = tab === value
        return <Pressable key={value} onPress={() => setTab(value)} style={[styles.filter, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.card }]}>
          <Body style={[styles.filterText, active && { color: colors.primary }]}>{label}</Body>
        </Pressable>
      })}
    </View>

    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : null}
    {!loading && needsLogin ? <View style={styles.center}>
      <Ionicons name="chatbubbles-outline" size={46} color={colors.muted2} />
      <Body style={styles.emptyTitle}>Entre para acessar suas conversas</Body>
      <Pressable onPress={() => router.push('/(auth)/login' as any)} style={[styles.loginButton, { backgroundColor: colors.primary }]}>
        <Body style={{ color: colors.bg, fontWeight: '800' }}>Entrar</Body>
      </Pressable>
    </View> : null}

    {!loading && !needsLogin ? <FlatList
      data={filtradas}
      keyExtractor={(item) => item.id}
      contentContainerStyle={filtradas.length ? styles.list : styles.emptyList}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => {
        const hasUnread = unread(item)
        return <Pressable onPress={() => router.push(`/chat/${item.id}` as any)} style={styles.conversation}>
          <LogoAvatar name={item.titulo || 'Chat'} uri={item.avatar_url || undefined} size={54} rounded={27} type={isSolo(item.tipo) ? 'player' : 'team'} />
          <View style={styles.conversationText}>
            <View style={styles.conversationTop}>
              <Body numberOfLines={1} style={[styles.conversationTitle, hasUnread && styles.unreadTitle]}>{item.titulo || 'Conversa'}</Body>
              <Tiny style={hasUnread ? { color: colors.primary } : undefined}>{timeLabel(item.ultima_mensagem_em || item.created_at)}</Tiny>
            </View>
            <View style={styles.previewRow}>
              <Subtitle numberOfLines={1} style={[styles.preview, hasUnread && { color: colors.text }]}>{item.ultimo_texto || 'Sem mensagens ainda'}</Subtitle>
              {hasUnread ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
            </View>
          </View>
        </Pressable>
      }}
      ListEmptyComponent={<View style={styles.center}>
        <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.muted2} />
        <Body style={styles.emptyTitle}>Nenhuma conversa encontrada</Body>
        <Subtitle>Conversas individuais e grupos aparecerão aqui.</Subtitle>
      </View>}
    /> : null}
  </Screen>
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: 2, fontSize: 25 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  search: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 24, paddingHorizontal: 16 },
  searchInput: { flex: 1, fontSize: 15, letterSpacing: 0 },
  filters: { flexDirection: 'row', gap: 8 },
  filter: { minWidth: 76, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14 },
  filterText: { fontSize: 12, fontWeight: '700' },
  list: { paddingTop: 2, paddingBottom: 84 },
  emptyList: { flexGrow: 1 },
  conversation: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  conversationText: { flex: 1, minWidth: 0 },
  conversationTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  conversationTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  unreadTitle: { fontWeight: '900' },
  previewRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 13 },
  unreadDot: { width: 9, height: 9, borderRadius: 5 },
  center: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 4, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  loginButton: { marginTop: 6, minWidth: 130, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }
})
