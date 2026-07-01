import { useEffect, useMemo, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '@/components/Screen'
import { BackHeader } from '@/components/BackHeader'
import { Card } from '@/components/Card'
import { StatsStrip } from '@/components/StatsStrip'
import { SectionHeader } from '@/components/SectionHeader'
import { CompactRow } from '@/components/CompactRow'
import { Button } from '@/components/Button'
import { Body, Subtitle, Tiny, Title } from '@/components/AppText'
import { LogoAvatar } from '@/components/LogoAvatar'
import { supabase } from '@/lib/supabase'
import { pickImage, pickImageFromBuckets } from '@/lib/images'

export default function MeuPerfilScreen() {
  const [user, setUser] = useState<any | null>(null)
  const [perfil, setPerfil] = useState<any | null>(null)
  const [perfisJogo, setPerfisJogo] = useState<any[]>([])
  const [equipes, setEquipes] = useState<any[]>([])
  const [lines, setLines] = useState<any[]>([])
  const [campeonatos, setCampeonatos] = useState<any[]>([])
  const [produtoras, setProdutoras] = useState<any[]>([])
  const [aba, setAba] = useState<'equipes' | 'lines' | 'campeonatos'>('equipes')

  useEffect(() => { load() }, [])

  async function load() {
    if (!supabase) return
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id || ''
    if (!uid) {
      router.replace('/(auth)/login' as any)
      return
    }
    setUser(auth.user)
    const [perfilRes, perfisRes, equipesRes, linesRes, produtorasRes, campeonatosCriados] = await Promise.all([
      supabase.from('perfis').select('id,nome,username,avatar_url,capa_url,bio,localidade').eq('id', uid).maybeSingle(),
      supabase.from('perfis_jogo').select('id,nick,uid_jogo,foto_capa,funcao,equipe_id,servidor').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('equipes').select('id,nome,tag,logo_url,cover_url,criado_por').eq('criado_por', uid).order('created_at', { ascending: false }),
      supabase.from('lines').select('id,nome,tipo,logo_url,equipe_id,created_by,ativa,updated_at').eq('created_by', uid).eq('ativa', true).order('updated_at', { ascending: false }),
      supabase.from('produtoras').select('id,nome,logo_url,dono_id').eq('dono_id', uid).order('created_at', { ascending: false }),
      supabase.from('campeonatos').select('id,nome,logo_url,banner_url,status,tipo,tipo_competicao,valor_vaga,vagas,produtora_id,criado_por').eq('criado_por', uid).order('created_at', { ascending: false })
    ])
    if (perfilRes.error) Alert.alert('Meu perfil', perfilRes.error.message)
    setPerfil(perfilRes.data || null)
    setPerfisJogo(perfisRes.data || [])
    setEquipes(equipesRes.data || [])
    setLines(linesRes.data || [])
    setProdutoras(produtorasRes.data || [])

    const prodIds = (produtorasRes.data || []).map((p: any) => p.id).filter(Boolean)
    let camps = campeonatosCriados.data || []
    if (prodIds.length) {
      const { data: campsProd } = await supabase.from('campeonatos').select('id,nome,logo_url,banner_url,status,tipo,tipo_competicao,valor_vaga,vagas,produtora_id,criado_por').in('produtora_id', prodIds).order('created_at', { ascending: false })
      const map = new Map<string, any>()
      ;[...camps, ...(campsProd || [])].forEach((c: any) => map.set(String(c.id), c))
      camps = Array.from(map.values())
    }
    setCampeonatos(camps)
  }

  return <Screen>
    <BackHeader title="Meu perfil" />
    <Card style={styles.hero}>
      <LogoAvatar name={perfil?.nome || perfil?.username || user?.email || 'U'} uri={pickImage(perfil || {}, ['avatar_url'], 'avatars')} size={76} rounded={38} type="player" />
      <View style={{ flex: 1 }}>
        <Tiny>Usuário</Tiny>
        <Title>{perfil?.nome || perfil?.username || user?.email || 'Minha conta'}</Title>
        <Subtitle>{perfil?.bio || perfil?.localidade || 'Perfil de usuário Drop Zone'}</Subtitle>
      </View>
    </Card>
    <StatsStrip items={[
      { label: 'perfis', value: perfisJogo.length },
      { label: 'equipes', value: equipes.length },
      { label: 'lines', value: lines.length },
      { label: 'campeonatos', value: campeonatos.length }
    ]} />

    <View style={styles.actions}>
      <Button label="Editar conta" variant="ghost" onPress={() => router.push('/criar/perfil' as any)} style={{ flex: 1 }} />
      <Button label="Novo perfil de jogo" onPress={() => router.push('/criar/perfil-jogo' as any)} style={{ flex: 1 }} />
    </View>

    <View style={styles.tabs}>
      <Button label="Minhas equipes" variant={aba === 'equipes' ? 'primary' : 'ghost'} onPress={() => setAba('equipes')} style={{ flex: 1 }} />
      <Button label="Lines" variant={aba === 'lines' ? 'primary' : 'ghost'} onPress={() => setAba('lines')} style={{ flex: 1 }} />
      <Button label="Campeonatos" variant={aba === 'campeonatos' ? 'primary' : 'ghost'} onPress={() => setAba('campeonatos')} style={{ flex: 1 }} />
    </View>

    {aba === 'equipes' ? <>
      <SectionHeader title="Minhas equipes" action={`${equipes.length}`} />
      {equipes.map((item) => <CompactRow key={item.id} type="team" logo={item.tag || item.nome} logoUri={pickImage(item, ['logo_url'], 'team-logos')} title={item.nome} meta={item.tag || 'equipe criada por você'} tag="dono" href={`/equipe/${item.id}`} />)}
      <SectionHeader title="Meus perfis de jogo" action={`${perfisJogo.length}`} />
      {perfisJogo.map((item) => <CompactRow key={item.id} type="player" logo={item.nick} logoUri={pickImage(item, ['foto_capa'], 'avatars')} title={item.nick} meta={`${item.funcao || 'função'} • ${item.servidor || 'BR'}`} tag="perfil" href={`/jogador/${item.id}`} />)}
    </> : null}

    {aba === 'lines' ? <>
      <SectionHeader title="Minhas lines" action={`${lines.length}`} />
      {lines.map((item) => <CompactRow key={item.id} type="team" logo={item.nome} logoUri={pickImage(item, ['logo_url'], 'team-logos')} title={item.nome} meta={item.tipo || 'line'} tag="line" />)}
    </> : null}

    {aba === 'campeonatos' ? <>
      <SectionHeader title="Campeonatos" action={`${campeonatos.length}`} />
      {produtoras.length ? <Card><Body style={{ fontWeight: '800' }}>Produtoras: {produtoras.map((p) => p.nome).join(', ')}</Body></Card> : null}
      {campeonatos.map((item) => <CompactRow key={item.id} type="champ" logo={item.nome} logoUri={pickImageFromBuckets(item, ['logo_url', 'banner_url'], ['imagem_campeonatos', 'assets'])} title={item.nome} meta={`${item.tipo_competicao || item.tipo || 'campeonato'} • ${item.vagas || 0} vagas`} tag={item.status || 'ativo'} href={`/campeonato/${item.id}`} />)}
    </> : null}
  </Screen>
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  tabs: { flexDirection: 'row', gap: 6 }
})
