import { useState } from 'react'
import { Link, router } from 'expo-router'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { DropZoneLogo } from '@/components/DropZoneLogo'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { apiLogin, isApiConfigured } from '@/lib/api'
import { oauthProviders, signInWithSocialProvider } from '@/lib/oauth'
import { useTheme } from '@/theme/ThemeProvider'

export default function LoginScreen() {
  const { colors } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)


  async function socialSignIn(provider: string) {
    try {
      setSocialLoading(provider)
      await signInWithSocialProvider(provider as any)
    } catch (error: any) {
      Alert.alert('Login social', error?.message || 'Nao foi possivel abrir o login social.')
    } finally {
      setSocialLoading(null)
    }
  }

  async function signIn() {
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('Login', 'Configure o .env para usar login real.')
      return
    }
    if (!email || !password) {
      Alert.alert('Login', 'Informe email e senha.')
      return
    }
    setLoading(true)
    const { error } = isApiConfigured
      ? await apiLogin(email.trim().toLowerCase(), password).then(() => ({ error: null })).catch((error) => ({ error }))
      : await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setLoading(false)
    if (error) {
      Alert.alert('Login', error.message)
      return
    }
    router.replace('/(tabs)/feed')
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.logoWrap}>
        <DropZoneLogo size={96} animated />
        <Text style={[styles.logo, { color: colors.text }]}>DROP ZONE</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Entrar na conta</Text>

      <View style={styles.socialWrap}>
        {oauthProviders.map((item) => (
          <TouchableOpacity key={item.provider} style={[styles.socialButton, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => socialSignIn(item.provider)} disabled={!!socialLoading || loading}>
            {socialLoading === item.provider ? <ActivityIndicator color={colors.text} /> : <Text style={[styles.socialText, { color: colors.text }]}>{item.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.divider, { color: colors.muted }]}>ou entre com email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Senha" placeholderTextColor={colors.muted} secureTextEntry style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} />
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]} onPress={signIn} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={[styles.buttonText, { color: colors.bg }]}>Entrar</Text>}
      </TouchableOpacity>
      {!isSupabaseConfigured ? <Text style={[styles.warn, { color: colors.muted }]}>Configure o .env para login real.</Text> : null}
      <View style={styles.links}>
        <Link href="/(auth)/recuperar" style={[styles.link, { color: colors.primary }]}>Recuperar senha</Link>
        <Link href="/(auth)/criar-conta" style={[styles.link, { color: colors.primary }]}>Criar conta</Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 30, gap: 12 },
  logo: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: 1.4 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 18 },
  socialWrap: { gap: 10, marginBottom: 12 },
  socialButton: { borderWidth: 1, borderRadius: 4, padding: 14, alignItems: 'center' },
  socialText: { fontWeight: '900', fontSize: 14 },
  divider: { textAlign: 'center', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 4, padding: 14, marginBottom: 10 },
  button: { borderRadius: 4, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { fontWeight: '800', fontSize: 16 },
  warn: { marginTop: 12, textAlign: 'center', fontSize: 12 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  link: { fontWeight: '700' }
})
