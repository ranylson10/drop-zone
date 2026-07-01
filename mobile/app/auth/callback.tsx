import { useEffect, useState } from 'react'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native'
import { completeOAuthFromUrl } from '@/lib/oauth'
import { useTheme } from '@/theme/ThemeProvider'

export default function OAuthCallbackScreen() {
  const { colors } = useTheme()
  const [message, setMessage] = useState('Finalizando login seguro...')

  useEffect(() => {
    async function finish() {
      try {
        const initialUrl = await Linking.getInitialURL()
        const ok = await completeOAuthFromUrl(initialUrl)
        if (!ok) throw new Error('Link de retorno invalido.')
        router.replace('/(tabs)/feed')
      } catch (error: any) {
        const msg = error?.message || 'Nao foi possivel finalizar o login social.'
        setMessage(msg)
        Alert.alert('Login social', msg)
        router.replace('/(auth)/login')
      }
    }
    finish()
  }, [])

  return <View style={[styles.container, { backgroundColor: colors.bg }]}>
    <ActivityIndicator color={colors.primary} />
    <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
  </View>
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  text: { fontSize: 13, fontWeight: '800', textAlign: 'center' }
})
