import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '@/components/Screen'
import { SiteHeader } from '@/components/SiteHeader'
import { StatsStrip } from '@/components/StatsStrip'
import { SectionHeader } from '@/components/SectionHeader'
import { CompactRow } from '@/components/CompactRow'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { Body, Subtitle, Tiny } from '@/components/AppText'
import { supabase } from '@/lib/supabase'
import { pickImage } from '@/lib/images'
import { colors } from '@/theme/colors'

type Produtora = {
  id: string
  nome: string
  slug?: string | null
  logo_url?: string | null
  capa_url?: string | null
  descricao?: string | null
  dono_id?: string | null
  status?: string | null
  created_at?: string | null
}

function initials(name?: string | null) {
  const parts = String(name || 'PR').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase()
}

export default function ProdutorasScreen() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [busca, setBusca] = useState('')
  const [produtoras, setProdutoras] = useState<Produtora[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    if (!supabase) return
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    setUserId(auth.user?.id || '')
    const { data, error } = await supabase
      .from('produtoras')
      .select('id,nome,slug,logo_url,capa_url,descricao,dono_id,status,created_at')
      .order('created_at', { ascending: false })
    if (error) Alert.alert('Produtoras', error.message)
    setProdutoras((data || []) as Produtora[])
    setLoading(false)
  }

  const minhas = useMemo(() => produtoras.filter((item) => item.dono_id === userId), [produtoras, userId])
  const filtradas = useMemo(() => {
    const term = busca.trim().toLowerCase()
    if (!term) return produtoras
    return produtoras.filter((item) => `${item.nome || ''} ${item.slug || ''} ${item.descricao || ''}`.toLowerCase().includes(term))
  }, [busca, produtoras])

  return <Screen>
    <SiteHeader eyebrow="PRODUTORAS" title="Organizações" logo="PR" subtitle="Produtoras oficiais, líderes, campeonatos e gestão." usingMock={loading} />
    <StatsStrip items={[{ label: 'produtoras', value: produtoras.length }, { label: 'minhas', value: minhas.length }, { label: 'resultado', value: filtradas.length }]} />

    <Card style={styles.searchCard}>
      <View style={styles.searchLine}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <Input value={busca} onChangeText={setBusca} placeholder="Buscar produtora, slug ou descrição" style={{ flex: 1 }} />
      </View>
      <Button label="Criar nova produtora" onPress={() => router.push('/criar/equipe' as any)} variant="ghost" />
    </Card>

    {minhas.length ? <>
      <SectionHeader title="Minhas produtoras" action={`${minhas.length}`} />
      {minhas.map((item) => <CompactRow key={`minha-${item.id}`} type="champ" logo={initials(item.nome)} logoUri={pickImage(item, ['logo_url'], 'imagem_produtoras')} title={item.nome} meta={item.slug || 'conta administradora'} tag="dono" href={`/produtora/${item.id}`} />)}
    </> : null}

    <SectionHeader title="Produtoras" action={`${filtradas.length}`} />
    {!filtradas.length ? <Card><Subtitle>Nenhuma produtora encontrada.</Subtitle></Card> : null}
    {filtradas.map((item) => <CompactRow key={item.id} type="champ" logo={initials(item.nome)} logoUri={pickImage(item, ['logo_url'], 'imagem_produtoras')} title={item.nome || 'Produtora'} meta={item.descricao || item.slug || 'organização cadastrada'} tag={item.status || 'ativa'} href={`/produtora/${item.id}`} />)}
  </Screen>
}

const styles = StyleSheet.create({
  searchCard: { gap: 8 },
  searchLine: { flexDirection: 'row', alignItems: 'center', gap: 8 }
})
