import { useEffect, useMemo, useState } from 'react'
import { Alert } from 'react-native'
import { router } from 'expo-router'
import { Screen } from '@/components/Screen'
import { SiteHeader } from '@/components/SiteHeader'
import { StatsStrip } from '@/components/StatsStrip'
import { SearchBar } from '@/components/SearchBar'
import { SectionHeader } from '@/components/SectionHeader'
import { CompactRow } from '@/components/CompactRow'
import { FilterPill, FilterPills, FloatingPlus } from '@/components/FilterPills'
import { Card } from '@/components/Card'
import { Subtitle } from '@/components/AppText'
import { normalizePlayer } from '@/lib/adapters'
import { pickImage } from '@/lib/images'
import { useRemoteList } from '@/lib/useRemoteList'
import { supabase } from '@/lib/supabase'

type Aba = 'todos' | 'meu'

export default function JogadoresScreen() {
  const [aba, setAba] = useState<Aba>('todos')
  const [userId, setUserId] = useState('')

  const { data, usingMock } = useRemoteList({
    table: ['perfis_jogo'],
    select: 'id, user_id, nick, uid_jogo, foto_capa, funcao, equipe_id, servidor, plataforma, created_at, equipes(id, nome, tag, logo_url)',
    fallback: [],
    limit: 500,
    mapRow: normalizePlayer
  })

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setUserId(data.user?.id || '')).catch(() => null)
  }, [])

  const meus = useMemo(() => data.filter((item: any) => item.user_id === userId), [data, userId])
  const lista = aba === 'meu' ? meus : data

  function criarPerfil() {
    if (!userId) {
      Alert.alert('Criar perfil', 'Faça login para criar seu perfil de jogo.')
      router.push('/(auth)/login' as any)
      return
    }
    router.push('/criar/perfil-jogo' as any)
  }

  return <Screen>
    <SiteHeader eyebrow="PERFIL GAMER" title="Jogadores" logo="J" usingMock={usingMock} subtitle="Nick, foto, equipe, função e estatísticas para convites." />
    <StatsStrip items={[{ label: 'jogadores', value: data.length }, { label: 'meus perfis', value: meus.length }, { label: 'mvp', value: data[0]?.nick || '-' }]} />
    <FilterPills>
      <FilterPill label="Jogadores" active={aba === 'todos'} onPress={() => setAba('todos')} icon="people-outline" />
      <FilterPill label="Meu perfil" active={aba === 'meu'} onPress={() => setAba('meu')} icon="person-circle-outline" />
      <FloatingPlus onPress={criarPerfil} />
    </FilterPills>
    <SearchBar placeholder={aba === 'meu' ? 'Buscar nos meus perfis' : 'Buscar nick'} />
    <SectionHeader title={aba === 'meu' ? 'Meus perfis de jogo' : 'Jogadores'} action={aba === 'meu' ? `${meus.length}` : 'mvp'} />
    {!lista.length ? <Card><Subtitle>{aba === 'meu' ? 'Você ainda não tem perfil de jogo.' : 'Nenhum jogador encontrado.'}</Subtitle></Card> : null}
    {lista.map((item: any) => <CompactRow key={item.id || item.nick} type="player" logo={item.sigla || item.nick || item.nome} logoUri={pickImage(item, ['foto_capa', 'foto_url', 'avatar_url', 'imagem_url'], 'avatars')} title={item.nick || item.nome || 'Jogador'} meta={item.meta || `${item.funcao || 'funcao'} • ${item.servidor || 'Free Fire'}`} tag={item.status || 'perfil'} right="ver" href={`/jogador/${item.id || item.nick}`} />)}
  </Screen>
}
