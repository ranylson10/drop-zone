import { useEffect, useMemo, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
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
import { normalizeTeam } from '@/lib/adapters'
import { pickImage } from '@/lib/images'
import { useRemoteList } from '@/lib/useRemoteList'
import { supabase } from '@/lib/supabase'

type Aba = 'todas' | 'lines' | 'minha'

export default function EquipesScreen() {
  const [aba, setAba] = useState<Aba>('todas')
  const [userId, setUserId] = useState('')
  const [minhasIds, setMinhasIds] = useState<string[]>([])
  const [lines, setLines] = useState<any[]>([])

  const { data, usingMock } = useRemoteList({
    table: ['equipes'],
    select: 'id, nome, tag, logo_url, cover_url, criado_por, created_at',
    fallback: [],
    limit: 500,
    mapRow: normalizeTeam
  })

  useEffect(() => {
    loadMine()
  }, [])

  async function loadMine() {
    if (!supabase) return
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id || ''
    setUserId(uid)
    if (!uid) return

    const [equipesDono, membros, minhasLines, vinculos] = await Promise.all([
      supabase.from('equipes').select('id').eq('criado_por', uid),
      supabase.from('membros_equipe').select('equipe_id, perfis_jogo!inner(user_id)').eq('ativo', true).eq('perfis_jogo.user_id', uid),
      supabase.from('lines').select('id,nome,tipo,logo_url,equipe_id,created_by,ativa,updated_at').eq('ativa', true).order('updated_at', { ascending: false }).limit(300),
      supabase.from('equipes_lines_vinculos').select('line_id,equipe_id,tipo_vinculo,created_at').limit(500)
    ])

    const ids = new Set<string>()
    ;(equipesDono.data || []).forEach((r: any) => r.id && ids.add(String(r.id)))
    ;(membros.data || []).forEach((r: any) => r.equipe_id && ids.add(String(r.equipe_id)))
    setMinhasIds(Array.from(ids))

    const vincPorLine: Record<string, string[]> = {}
    ;(vinculos.data || []).forEach((v: any) => {
      if (!v.line_id || !v.equipe_id) return
      vincPorLine[String(v.line_id)] = [...(vincPorLine[String(v.line_id)] || []), String(v.equipe_id)]
    })
    setLines((minhasLines.data || []).map((l: any) => ({ ...l, equipe_ids_vinculadas: vincPorLine[String(l.id)] || [] })))
  }

  const minhasEquipes = useMemo(() => data.filter((item: any) => item.criado_por === userId || minhasIds.includes(String(item.id))), [data, userId, minhasIds])
  const linesVisiveis = useMemo(() => {
    if (aba !== 'lines') return []
    return lines.filter((line) => line.created_by === userId || minhasIds.includes(String(line.equipe_id || '')) || (line.equipe_ids_vinculadas || []).some((id: string) => minhasIds.includes(id)))
  }, [aba, lines, userId, minhasIds])

  const lista = aba === 'minha' ? minhasEquipes : data

  function criarEquipe() {
    if (!userId) {
      Alert.alert('Criar equipe', 'Faça login para criar uma equipe.')
      router.push('/(auth)/login' as any)
      return
    }
    router.push('/criar/equipe' as any)
  }

  return <Screen>
    <SiteHeader eyebrow="TIMES E LINES" title="Equipes" logo="DZ" usingMock={usingMock} subtitle="Lista compacta com logo, lines, jogadores e status." />
    <StatsStrip items={[{ label: 'equipes', value: data.length }, { label: 'lines', value: lines.length }, { label: 'minhas', value: minhasEquipes.length }]} />
    <FilterPills>
      <FilterPill label="Todas as equipes" active={aba === 'todas'} onPress={() => setAba('todas')} icon="shield-outline" />
      <FilterPill label="Todas as lines" active={aba === 'lines'} onPress={() => setAba('lines')} icon="layers-outline" />
      <FilterPill label="Minha equipe" active={aba === 'minha'} onPress={() => setAba('minha')} icon="person-outline" />
      <FloatingPlus onPress={criarEquipe} />
    </FilterPills>
    <SearchBar placeholder={aba === 'lines' ? 'Buscar line' : 'Buscar equipe ou tag'} />

    {aba === 'lines' ? <>
      <SectionHeader title="Lines" action={`${linesVisiveis.length}`} />
      {!linesVisiveis.length ? <Card><Subtitle>Nenhuma line encontrada para sua conta/equipe.</Subtitle></Card> : null}
      {linesVisiveis.map((item: any) => <CompactRow key={item.id} type="team" logo={item.nome} logoUri={pickImage(item, ['logo_url'], 'team-logos')} title={item.nome || 'Line'} meta={`${item.tipo || 'line'} • ${item.equipe_id ? 'vinculada à equipe' : 'line pessoal'}`} tag={item.created_by === userId ? 'minha' : 'vinculada'} right="LINE" />)}
    </> : <>
      <SectionHeader title={aba === 'minha' ? 'Minha equipe' : 'Equipes ativas'} action={aba === 'minha' ? `${minhasEquipes.length}` : 'ranking'} />
      {!lista.length ? <Card><Subtitle>Nenhuma equipe encontrada.</Subtitle></Card> : null}
      {lista.map((item: any) => <CompactRow key={item.id || item.nome} type="team" logo={item.sigla || item.tag || item.nome} logoUri={pickImage(item, ['logo_url', 'avatar_url', 'imagem_url'], 'team-logos')} title={item.nome || 'Equipe'} meta={item.meta || `${item.tag || 'sem tag'} • ${item.line || 'line principal'}`} tag={item.status || 'ativa'} right={item.tag || 'DZ'} href={`/equipe/${item.id || item.nome}`} />)}
    </>}
  </Screen>
}

const styles = StyleSheet.create({})
