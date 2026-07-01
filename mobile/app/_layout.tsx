import { useEffect } from 'react'
import * as Linking from 'expo-linking'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { completeOAuthFromUrl } from '@/lib/oauth'
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider'

export default function RootLayout() {
  return <ThemeProvider><RootShell /></ThemeProvider>
}

function RootShell() {
  const { colors, mode } = useTheme()

  useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      try {
        const ok = await completeOAuthFromUrl(url)
        if (ok) router.replace('/(tabs)/feed')
      } catch {
        router.replace('/(auth)/login')
      }
    })
    return () => subscription.remove()
  }, [])
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </View>
  )
}
