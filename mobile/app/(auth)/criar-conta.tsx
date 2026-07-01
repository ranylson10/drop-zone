import { useState } from 'react'
import { Link, router } from 'expo-router'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { apiSignup, isApiConfigured } from '@/lib/api'
import { oauthProviders, signInWithSocialProvider } from '@/lib/oauth'
import { useTheme } from '@/theme/ThemeProvider'

export default function CriarContaScreen() {
  const { colors } = useTheme()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)


  async function socialSignUp(provider: string) {
    try {
      setSocialLoading(provider)
      await signInWithSocialProvider(provider as any)
    } catch (error: any) {
      Alert.alert('Cadastro social', error?.message || 'Nao foi possivel abrir o cadastro social.')
    } finally {
      setSocialLoading(null)
    }
  }

  async function signUp() {
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('Cadastro', 'Configure o .env para cadastrar usuarios reais.')
      return
    }
    if (!name.trim() || !email.trim() || !password || password !== confirm) {
      Alert.alert('Cadastro', 'Confira nome, email, senha e confirmacao.')
      return
    }
    if (password.length < 6) {
      Alert.alert('Cadastro', 'A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    const { error } = isApiConfigured
      ? await apiSignup(name.trim(), email.trim().toLowerCase(), password).then(() => ({ error: null })).catch((error) => ({ error }))
      : await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { username: name.trim(), nome_exibicao: name.trim(), nome: name.trim(), name: name.trim() } } })
    setLoading(false)
    if (error) {
      Alert.alert('Cadastro', error.message)
      return
    }
    Alert.alert('Cadastro', 'Conta criada. Verifique seu email se a confirmacao estiver ativa.')
    router.replace('/(auth)/login')
  }

  return <View style={[styles.container, { backgroundColor: colors.bg }]}>
    <Text style={[styles.title, { color: colors.text }]}>Criar conta</Text>

    <View style={styles.socialWrap}>
      {oauthProviders.map((item) => (
        <TouchableOpacity key={item.provider} style={[styles.socialButton, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => socialSignUp(item.provider)} disabled={!!socialLoading || loading}>
          {socialLoading === item.provider ? <ActivityIndicator color={colors.text} /> : <Text style={[styles.socialText, { color: colors.text }]}>Criar com {item.label}</Text>}
        </TouchableOpacity>
      ))}
    </View>
    <Text style={[styles.divider, { color: colors.muted }]}>ou crie com email</Text>
    {['Nome','Email','Senha','Confirmar senha'].map((placeholder, idx) => (
      <TextInput key={placeholder} value={[name,email,password,confirm][idx]} onChangeText={[setName,setEmail,setPassword,setConfirm][idx]} autoCapitalize={idx === 1 ? 'none' : undefined} keyboardType={idx === 1 ? 'email-address' : undefined} placeholder={placeholder} placeholderTextColor={colors.muted} secureTextEntry={idx >= 2} style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} />
    ))}
    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]} onPress={signUp} disabled={loading}>
      {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={[styles.buttonText, { color: colors.bg }]}>Cadastrar</Text>}
    </TouchableOpacity>
    <Link href="/(auth)/login" style={[styles.link, { color: colors.primary }]}>Ja tenho conta</Link>
  </View>
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 18 },
  socialWrap: { gap: 10, marginBottom: 12 },
  socialButton: { borderWidth: 1, borderRadius: 4, padding: 14, alignItems: 'center' },
  socialText: { fontWeight: '900', fontSize: 14 },
  divider: { textAlign: 'center', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 4, padding: 14, marginBottom: 10 },
  button: { borderRadius: 4, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { fontWeight: '800' },
  link: { marginTop: 20, textAlign: 'center' }
})
