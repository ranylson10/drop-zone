import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, ImageBackground, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LogoAvatar } from '@/components/LogoAvatar'
import { Body, Subtitle, Tiny } from '@/components/AppText'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/theme/ThemeProvider'
import { errorSound, messageSound, successSound } from '@/lib/sounds'

type Conversa = {
  id: string
  tipo: string
  titulo: string
  avatar_url?: string | null
}

type Mensagem = {
  id: string
  conversa_id: string
  remetente_user_id: string
  texto: string
  created_at: string
}

type Participante = {
  user_id: string
  ultima_lida_em?: string | null
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(value: string) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Hoje'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function ChatConversation() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, mode } = useTheme()
  const listRef = useRef<FlatList<Mensagem>>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState('')
  const [conversa, setConversa] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [texto, setTexto] = useState('')

  const loadMessages = useCallback(async () => {
    if (!supabase || !id) return
    const { data } = await supabase
      .from('chat_mensagens')
      .select('id,conversa_id,remetente_user_id,texto,created_at')
      .eq('conversa_id', id)
      .order('created_at', { ascending: false })
      .limit(100)
    setMensagens((data || []) as Mensagem[])
  }, [id])

  const markRead = useCallback(async (currentUserId: string) => {
    if (!supabase || !id || !currentUserId) return
    const now = new Date().toISOString()
    await supabase.from('chat_participantes').update({ ultima_lida_em: now }).eq('conversa_id', id).eq('user_id', currentUserId)
  }, [id])

  const loadParticipants = useCallback(async () => {
    if (!supabase || !id) return
    const { data } = await supabase.from('chat_participantes').select('user_id,ultima_lida_em').eq('conversa_id', id)
    setParticipantes((data || []) as Participante[])
  }, [id])

  useEffect(() => {
    async function load() {
      if (!supabase || !id) return
      const { data: auth } = await supabase.auth.getUser()
      const currentUserId = auth.user?.id
      if (!currentUserId) {
        router.replace('/(auth)/login' as any)
        return
      }
      setUserId(currentUserId)
      const { data, error } = await supabase.from('chat_conversas').select('id,tipo,titulo,avatar_url').eq('id', id).single()
      if (error) {
        Alert.alert('Chat', error.message)
        router.back()
        return
      }
      setConversa(data as Conversa)
      await Promise.all([loadMessages(), loadParticipants(), markRead(currentUserId)])
      setLoading(false)
    }
    load()
  }, [id, loadMessages, loadParticipants, markRead])

  useEffect(() => {
    if (!supabase || !id) return
    const channel = supabase.channel(`chat-screen-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens', filter: `conversa_id=eq.${id}` }, async (payload: any) => {
        await loadMessages()
        await loadParticipants()
        if (payload.new?.remetente_user_id !== userId) {
          await markRead(userId)
          await messageSound()
        }
      })
      .subscribe()
    return () => { supabase?.removeChannel(channel) }
  }, [id, loadMessages, loadParticipants, markRead, userId])

  async function enviar() {
    const clean = texto.trim()
    if (!clean || !supabase || !id || !userId || sending) return
    setSending(true)
    setTexto('')
    const { error } = await supabase.from('chat_mensagens').insert({
      conversa_id: id,
      remetente_user_id: userId,
      texto: clean,
      tipo: 'texto'
    })
    if (error) {
      setTexto(clean)
      await errorSound()
      Alert.alert('Chat', error.message)
    } else {
      await successSound()
      await loadMessages()
    }
    setSending(false)
  }

  const readAt = useMemo(() => {
    return participantes
      .filter((item) => item.user_id !== userId && item.ultima_lida_em)
      .map((item) => new Date(item.ultima_lida_em as string).getTime())
      .sort((a, b) => b - a)[0] || 0
  }, [participantes, userId])

  if (loading) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}><View style={styles.loading}><ActivityIndicator color={colors.primary} /></View></SafeAreaView>
  }

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.borderSoft }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </Pressable>
        <LogoAvatar name={conversa?.titulo || 'Chat'} uri={conversa?.avatar_url || undefined} size={42} rounded={21} />
        <View style={styles.headerText}>
          <Body numberOfLines={1} style={styles.headerTitle}>{conversa?.titulo || 'Conversa'}</Body>
          <Subtitle numberOfLines={1}>{conversa?.tipo === 'privado' ? 'conversa individual' : 'grupo da comunidade'}</Subtitle>
        </View>
        <Pressable style={styles.headerIcon}><Ionicons name="call-outline" size={23} color={colors.text} /></Pressable>
        <Pressable style={styles.headerIcon}><Ionicons name="ellipsis-vertical" size={22} color={colors.text} /></Pressable>
      </View>

      <ImageBackground
        source={undefined}
        style={[styles.wallpaper, { backgroundColor: mode === 'dark' ? '#071014' : '#EFEAE2' }]}
      >
        <FlatList
          ref={listRef}
          data={mensagens}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            const mine = item.remetente_user_id === userId
            const next = mensagens[index + 1]
            const showDay = !next || dayLabel(next.created_at) !== dayLabel(item.created_at)
            const read = mine && readAt >= new Date(item.created_at).getTime()
            return <View>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs, {
                backgroundColor: mine
                  ? mode === 'dark' ? '#005C4B' : '#D9FDD3'
                  : mode === 'dark' ? '#202C33' : '#FFFFFF'
              }]}>
                <Body style={styles.messageText}>{item.texto}</Body>
                <View style={styles.messageMeta}>
                  <Tiny>{timeLabel(item.created_at)}</Tiny>
                  {mine ? <Ionicons name={read ? 'checkmark-done' : 'checkmark'} size={16} color={read ? '#53BDEB' : colors.muted} /> : null}
                </View>
              </View>
              {showDay ? <View style={[styles.dayPill, { backgroundColor: mode === 'dark' ? '#182229' : '#FFFFFFD9' }]}>
                <Tiny>{dayLabel(item.created_at)}</Tiny>
              </View> : null}
            </View>
          }}
          ListEmptyComponent={<View style={styles.emptyMessages}>
            <View style={[styles.encryption, { backgroundColor: mode === 'dark' ? '#182229' : '#FFF3C4' }]}>
              <Ionicons name="lock-closed" size={13} color={colors.warning} />
              <Subtitle style={styles.encryptionText}>As mensagens desta conversa ficam disponíveis apenas para os participantes.</Subtitle>
            </View>
          </View>}
        />
      </ImageBackground>

      <View style={[styles.composerWrap, { backgroundColor: colors.bg }]}>
        <View style={[styles.composer, { backgroundColor: colors.card2 }]}>
          <Pressable><Ionicons name="happy-outline" size={25} color={colors.muted} /></Pressable>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Mensagem"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, { color: colors.text }]}
          />
          <Pressable><Ionicons name="attach-outline" size={25} color={colors.muted} /></Pressable>
          <Pressable><Ionicons name="camera-outline" size={24} color={colors.muted} /></Pressable>
        </View>
        <Pressable onPress={enviar} disabled={!texto.trim() || sending} style={[styles.send, { backgroundColor: colors.primary }]}>
          {sending ? <ActivityIndicator size="small" color={colors.bg} /> : <Ionicons name={texto.trim() ? 'send' : 'mic'} size={23} color={colors.bg} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, borderBottomWidth: 1 },
  back: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 15, fontWeight: '800' },
  headerIcon: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  wallpaper: { flex: 1 },
  messages: { paddingHorizontal: 10, paddingVertical: 12 },
  bubble: { maxWidth: '84%', minWidth: 82, marginVertical: 2, paddingHorizontal: 10, paddingTop: 7, paddingBottom: 5, borderRadius: 9 },
  mine: { alignSelf: 'flex-end', borderTopRightRadius: 3 },
  theirs: { alignSelf: 'flex-start', borderTopLeftRadius: 3 },
  messageText: { fontSize: 14, lineHeight: 19 },
  messageMeta: { minHeight: 16, marginTop: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  dayPill: { alignSelf: 'center', marginVertical: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7 },
  emptyMessages: { minHeight: 280, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  encryption: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 12, borderRadius: 8 },
  encryptionText: { flex: 1, textAlign: 'center' },
  composerWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingHorizontal: 7, paddingVertical: 7 },
  composer: { minHeight: 48, maxHeight: 118, flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 9, borderRadius: 24, paddingHorizontal: 13, paddingVertical: 7 },
  input: { flex: 1, minHeight: 34, maxHeight: 94, paddingVertical: 6, fontSize: 15, letterSpacing: 0, textAlignVertical: 'center' },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }
})
