import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '@/components/Screen'
import { Card } from '@/components/Card'
import { Body, Subtitle, Tiny } from '@/components/AppText'
import { supabase } from '@/lib/supabase'
import { tapSound } from '@/lib/sounds'
import { colors } from '@/theme/colors'

type Notificacao = {
  id: string
  titulo: string
  mensagem?: string | null
  tipo?: string | null
  rota?: string | null
  lida: boolean
  created_at: string
}

export default function Notificacoes() {
  const [items, setItems] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    if (!supabase) return
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setNeedsLogin(true)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('notificacoes')
      .select('id,titulo,mensagem,tipo,rota,lida,created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(80)
    setLoading(false)
    if (error) {
      Alert.alert('Notificações', error.message)
      return
    }
    setItems((data || []) as Notificacao[])
  }

  async function abrir(item: Notificacao) {
    await tapSound()
    if (supabase && !item.lida) {
      await supabase.from('notificacoes').update({ lida: true }).eq('id', item.id)
      setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, lida: true } : n))
    }
    if (item.rota) router.push(item.rota as any)
  }

  async function marcarTodas() {
    if (!supabase) return
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    await supabase.from('notificacoes').update({ lida: true }).eq('user_id', auth.user.id).eq('lida', false)
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  return <Screen>
    <View style={styles.header}>
      <View>
        <Tiny style={styles.eyebrow}>CENTRAL</Tiny>
        <Body style={styles.title}>Notificações</Body>
      </View>
      <Pressable onPress={marcarTodas} style={styles.action}><Ionicons name="checkmark-done-outline" size={18} color={colors.primary} /><Tiny style={styles.actionText}>Ler tudo</Tiny></Pressable>
    </View>

    {needsLogin ? <Card><Body style={styles.bold}>Faça login para ver suas notificações.</Body></Card> : null}
    {loading ? <Card><Subtitle>Carregando...</Subtitle></Card> : null}
    {!loading && !needsLogin && !items.length ? <Card><Subtitle>Nenhuma notificação ainda.</Subtitle></Card> : null}

    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {items.map((item) => <Pressable key={item.id} onPress={() => abrir(item)} style={[styles.item, !item.lida && styles.unread]}>
        <View style={styles.icon}><Ionicons name={item.lida ? 'notifications-outline' : 'notifications'} size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Body style={styles.bold}>{item.titulo}</Body>
          {item.mensagem ? <Subtitle>{item.mensagem}</Subtitle> : null}
          <Tiny>{new Date(item.created_at).toLocaleString('pt-BR')}</Tiny>
        </View>
        {item.rota ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
      </Pressable>)}
    </ScrollView>
  </Screen>
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.primary, letterSpacing: 2, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '900' },
  action: { minHeight: 38, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card },
  actionText: { color: colors.primary, fontWeight: '800' },
  list: { gap: 8, paddingBottom: 22 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, backgroundColor: colors.card },
  unread: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card2 },
  bold: { fontWeight: '800' }
})
