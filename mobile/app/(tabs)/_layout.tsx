import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useTheme } from '@/theme/ThemeProvider'

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  campeonatos: 'trophy-outline', equipes: 'shield-outline', jogadores: 'people-outline', calendario: 'calendar-outline', feed: 'newspaper-outline', chat: 'chatbubbles-outline', carteira: 'wallet-outline'
}
export default function TabsLayout() {
  const { colors } = useTheme()
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '700', fontSize: 16 },
    tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.borderSoft, elevation: 0 },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] || 'ellipse-outline'} color={color} size={size} />
  })}>
    <Tabs.Screen name="chat" options={{ href: null }} />
    <Tabs.Screen name="carteira" options={{ href: null }} />
  </Tabs>
}
