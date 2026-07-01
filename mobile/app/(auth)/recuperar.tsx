import { useState } from 'react'
import { Link } from 'expo-router'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useTheme } from '@/theme/ThemeProvider'

export default function RecuperarScreen() {
  const { colors } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function recover() {
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('Recuperar senha', 'Configure o .env para recuperar senha.')
      return
    }
    if (!email) {
      Alert.alert('Recuperar senha', 'Informe o email.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    setLoading(false)
    if (error) Alert.alert('Recuperar senha', error.message)
    else Alert.alert('Recuperar senha', 'Email enviado.')
  }

  return <View style={[styles.container, { backgroundColor: colors.bg }]}>
    <Text style={[styles.title, { color: colors.text }]}>Recuperar senha</Text>
    <Text style={[styles.desc, { color: colors.muted }]}>Digite seu email para receber instrucoes.</Text>
    <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} />
    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]} onPress={recover} disabled={loading}>
      {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={[styles.buttonText, { color: colors.bg }]}>Enviar</Text>}
    </TouchableOpacity>
    <Link href="/(auth)/login" style={[styles.link, { color: colors.primary }]}>Voltar ao login</Link>
  </View>
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  desc: { marginBottom: 18 },
  input: { borderWidth: 1, borderRadius: 4, padding: 14, marginBottom: 10 },
  button: { borderRadius: 4, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { fontWeight: '800' },
  link: { marginTop: 20, textAlign: 'center' }
})
