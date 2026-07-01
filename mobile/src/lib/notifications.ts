declare const require: any

import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'
import { notifySound } from '@/lib/sounds'

type NotificationPayload = {
  title: string
  body: string
  type?: string
  route?: string
  data?: Record<string, any>
  userId?: string | null
}

function getNotificationsModule() {
  try { return require('expo-notifications') } catch { return null }
}

export async function registerPushNotifications() {
  const Notifications = getNotificationsModule()
  if (!Notifications) return null
  try {
    Notifications.setNotificationHandler?.({
      handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true })
    })

    const current = await Notifications.getPermissionsAsync()
    let status = current.status
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync()
      status = requested.status
    }
    if (status !== 'granted') return null

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync?.('drop-zone', {
        name: 'Drop Zone',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default'
      })
    }

    const tokenData = await Notifications.getExpoPushTokenAsync()
    const token = tokenData?.data || null
    if (token) await savePushToken(token)
    return token
  } catch {
    return null
  }
}

export async function savePushToken(token: string) {
  if (!supabase || !token) return
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return
  await supabase.from('push_tokens').upsert({
    user_id: user.id,
    expo_push_token: token,
    platform: Platform.OS,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,expo_push_token' })
}

export async function notifyLocal(payload: NotificationPayload) {
  await notifySound()
  const Notifications = getNotificationsModule()
  if (!Notifications) return
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        sound: 'default',
        data: { type: payload.type, route: payload.route, ...(payload.data || {}) }
      },
      trigger: null
    })
  } catch {}
}

export async function createInAppNotification(payload: NotificationPayload) {
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  const userId = payload.userId || data.user?.id
  if (!userId) return
  await supabase.from('notificacoes').insert({
    user_id: userId,
    titulo: payload.title,
    mensagem: payload.body,
    tipo: payload.type || 'app',
    rota: payload.route || null,
    dados: payload.data || {},
    lida: false
  })
}

export async function notifyApp(payload: NotificationPayload) {
  await Promise.allSettled([notifyLocal(payload), createInAppNotification(payload)])
}
