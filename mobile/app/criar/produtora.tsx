import { useMemo, useState } from 'react'
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '@/components/Screen'
import { BackHeader } from '@/components/BackHeader'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { Body, Subtitle, Tiny } from '@/components/AppText'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/theme/ThemeProvider'

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

function extFromUri(uri: string) {
  const clean = uri.split('?')[0] || ''
  const ext = clean.split('.').pop()?.toLowerCase() || 'jpg'
  return ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'jpg'
}

function base64ToArrayBuffer(base64: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const clean = String(base64 || '').replace(/\s/g, '').replace(/=+$/, '')
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (let i = 0; i < clean.length; i += 1) {
    const value = chars.indexOf(clean[i])
    if (value < 0) continue
    buffer = (buffer << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return new Uint8Array(bytes).buffer
}

type UploadImage = { uri: string; publicUrl: string }

type FormState = {
  nome: string
  descricao: string
  whatsapp_suporte: string
  instagram_url: string
  discord_url: string
  logo: UploadImage | null
  capa: UploadImage | null
}

export default function CriarProdutoraScreen() {
  const { colors } = useTheme()
  const [form, setForm] = useState<FormState>({
    nome: '',
    descricao: '',
    whatsapp_suporte: '',
    instagram_url: '',
    discord_url: '',
    logo: null,
    capa: null,
  })
  const [loading, setLoading] = useState(false)
  const slug = useMemo(() => slugify(form.nome), [form.nome])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function uploadImagem(campo: 'logo_url' | 'capa_url') {
    if (!supabase) return null
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) {
      Alert.alert('Upload', 'Faça login para enviar imagem.')
      return null
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Upload', 'Permita acesso à galeria para enviar a imagem.')
      return null
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: campo === 'logo_url' ? [1, 1] : [16, 5],
      quality: 0.88,
      base64: true,
    })
    if (result.canceled || !result.assets[0]) return null

    const asset = result.assets[0]
    if (!asset.base64) throw new Error('O seletor não retornou a imagem em base64. Tente selecionar outra imagem.')

    const ext = extFromUri(asset.uri).replace('jpeg', 'jpg')
    const mimeType = asset.mimeType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg')
    const path = `${uid}/${campo}-${Date.now()}.${ext}`
    const buffer = base64ToArrayBuffer(asset.base64)

    const { error } = await supabase.storage.from('imagem_produtoras').upload(path, buffer, {
      cacheControl: '3600',
      contentType: mimeType,
      upsert: false,
    })
    if (error) throw error

    const { data } = supabase.storage.from('imagem_produtoras').getPublicUrl(path)
    return { uri: asset.uri, publicUrl: data.publicUrl }
  }

  async function escolherImagem(campo: 'logo' | 'capa') {
    try {
      setLoading(true)
      const uploaded = await uploadImagem(campo === 'logo' ? 'logo_url' : 'capa_url')
      if (uploaded) update(campo, uploaded)
    } catch (error: any) {
      Alert.alert('Upload', error?.message || 'Erro ao enviar imagem.')
    } finally {
      setLoading(false)
    }
  }

  async function salvar() {
    if (!supabase) return
    const nomeLimpo = form.nome.trim()
    if (!nomeLimpo) return Alert.alert('Produtora', 'Informe o nome da produtora.')

    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) {
      setLoading(false)
      Alert.alert('Produtora', 'Faça login para criar uma produtora.')
      router.push('/(auth)/login' as any)
      return
    }

    try {
      const { data: existente, error: erroBusca } = await supabase
        .from('produtoras')
        .select('id,nome')
        .eq('dono_id', uid)
        .maybeSingle()
      if (erroBusca) throw erroBusca
      if (existente?.id) {
        Alert.alert('Produtora', 'Sua conta já possui uma produtora. Vou abrir ela agora.')
        router.replace(`/produtora/${existente.id}` as any)
        return
      }

      const payload = {
        nome: nomeLimpo,
        slug,
        descricao: form.descricao.trim() || null,
        logo_url: form.logo?.publicUrl || null,
        capa_url: form.capa?.publicUrl || null,
        whatsapp_suporte: form.whatsapp_suporte.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        discord_url: form.discord_url.trim() || null,
        dono_id: uid,
      }

      const { data, error } = await supabase.from('produtoras').insert(payload).select('*').single()
      if (error) throw error
      router.replace(`/produtora/${data.id}` as any)
    } catch (error: any) {
      Alert.alert('Produtora', error?.message || 'Erro ao salvar produtora.')
    } finally {
      setLoading(false)
    }
  }

  return <Screen>
    <BackHeader title="Criar produtora" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Card style={styles.card}>
        <Tiny>Produtora</Tiny>
        <Body style={styles.title}>Nova produtora</Body>
        <Subtitle>Criar conta de gestão com identidade visual, contatos públicos e dados principais.</Subtitle>

        <View style={[styles.cover, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
          {form.capa?.uri ? <Image source={{ uri: form.capa.uri }} style={styles.coverImage} resizeMode="cover" /> : null}
          <View style={styles.coverOverlay} />
          <Pressable onPress={() => escolherImagem('capa')} style={[styles.coverButton, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Ionicons name="cloud-upload-outline" size={15} color={colors.primary} />
            <Tiny>Alterar capa</Tiny>
          </Pressable>
          <Pressable onPress={() => escolherImagem('logo')} style={[styles.logoBox, { backgroundColor: colors.bg, borderColor: colors.primary }]}> 
            {form.logo?.uri ? <Image source={{ uri: form.logo.uri }} style={styles.logoImage} resizeMode="cover" /> : <View style={styles.logoEmpty}><Ionicons name="image-outline" size={26} color={colors.muted} /><Tiny>Logo</Tiny></View>}
            <View style={[styles.logoAction, { backgroundColor: colors.bg, borderColor: colors.border }]}> 
              <Ionicons name="cloud-upload-outline" size={13} color={colors.primary} />
              <Tiny>Alterar</Tiny>
            </View>
          </Pressable>
        </View>

        <Tiny>Nome da organização</Tiny>
        <Input value={form.nome} onChangeText={(value) => update('nome', value)} placeholder="Ex: SIX BLACK" autoCapitalize="characters" />

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Tiny>WhatsApp público</Tiny>
            <Input value={form.whatsapp_suporte} onChangeText={(value) => update('whatsapp_suporte', value)} placeholder="Ex: 5591999999999" keyboardType="phone-pad" />
          </View>
          <View style={styles.gridItem}>
            <Tiny>Instagram</Tiny>
            <Input value={form.instagram_url} onChangeText={(value) => update('instagram_url', value)} placeholder="https://instagram.com/sua_produtora" autoCapitalize="none" />
          </View>
        </View>

        <Tiny>Discord ou grupo</Tiny>
        <Input value={form.discord_url} onChangeText={(value) => update('discord_url', value)} placeholder="https://discord.gg/..." autoCapitalize="none" />

        <Tiny>Descrição da produtora</Tiny>
        <Input value={form.descricao} onChangeText={(value) => update('descricao', value)} placeholder="Conte sobre sua organização, estilo, torneios, comunidade..." multiline style={styles.textArea} />

        <View style={[styles.preview, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
          <Tiny>Prévia de identificação</Tiny>
          <Body style={styles.previewName}>{form.nome || 'Nome da produtora'}</Body>
          <Tiny>Slug público</Tiny>
          <View style={[styles.slugBox, { borderColor: colors.border, backgroundColor: colors.card }]}> 
            <Body style={[styles.slugText, { color: colors.primary }]}>{slug || 'sem-slug'}</Body>
          </View>
          <Subtitle>{form.descricao.trim() || 'Nenhuma descrição informada ainda.'}</Subtitle>
        </View>

        <Button label={loading ? 'Salvando...' : 'Criar produtora'} onPress={salvar} />
      </Card>
    </KeyboardAvoidingView>
  </Screen>
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { fontWeight: '900', fontSize: 20 },
  cover: { height: 210, borderWidth: 1, borderRadius: 8, overflow: 'hidden', position: 'relative', justifyContent: 'flex-end' },
  coverImage: { ...StyleSheet.absoluteFillObject, opacity: 0.58 },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,12,22,0.42)' },
  coverButton: { position: 'absolute', top: 10, right: 10, height: 36, borderWidth: 1, borderRadius: 5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoBox: { width: 126, height: 126, marginLeft: 18, marginBottom: 18, borderWidth: 3, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: '100%', height: '100%' },
  logoEmpty: { alignItems: 'center', gap: 7 },
  logoAction: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 34, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  grid: { flexDirection: 'row', gap: 8 },
  gridItem: { flex: 1, gap: 6 },
  textArea: { minHeight: 112, textAlignVertical: 'top' },
  preview: { borderWidth: 1, borderRadius: 6, padding: 12, gap: 8 },
  previewName: { fontWeight: '900', fontSize: 17, textTransform: 'uppercase' },
  slugBox: { borderWidth: 1, borderRadius: 4, padding: 10 },
  slugText: { fontWeight: '900', textTransform: 'uppercase', fontSize: 12 },
})
