import { useCallback, useEffect, useState } from 'react'
import { Alert, ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { Screen } from '@/components/Screen'
import { BackHeader } from '@/components/BackHeader'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { InfoGrid } from '@/components/InfoGrid'
import { SectionHeader } from '@/components/SectionHeader'
import { CompactRow } from '@/components/CompactRow'
import { LogoAvatar } from '@/components/LogoAvatar'
import { Body, Subtitle, Tiny } from '@/components/AppText'
import { CompetitiveEvolution } from '@/components/CompetitiveEvolution'
import { CompetitiveTierBadge, formatCompactScore } from '@/components/CompetitiveTierBadge'
import { normalizePlayer } from '@/lib/adapters'
import { pickImage } from '@/lib/images'
import { supabase } from '@/lib/supabase'
import { loadPlayerCompetitiveStats, type CompetitiveStats } from '@/lib/competitiveStats'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'

type TeamOption = { id: string; nome?: string | null; tag?: string | null }
type PlayerTab = 'perfil' | 'estatisticas'

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function chatTitle(nome: string, nick: string) {
  return [nome, nick].filter(Boolean).join(' / ') || 'Conversa'
}

export default function JogadorDetalhe() {
  const theme = useTheme()
  const colors = theme.colors
  const { id } = useLocalSearchParams<{ id: string }>()
  const [item, setItem] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [recent, setRecent] = useState<any[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<PlayerTab>('perfil')
  const [competitiveStats, setCompetitiveStats] = useState<CompetitiveStats | null>(null)

  const loadPlayer = useCallback(async () => {
    if (!supabase || !id) return
    setLoading(true)
    try {
      const { data: perfil, error } = await supabase
        .from('perfis_jogo')
        .select('id, nick, uid_jogo, foto_capa, funcao, equipe_id, servidor, plataforma, created_at, user_id, equipes:equipe_id(id,nome,tag,logo_url)')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!perfil) {
        setItem(null)
        return
      }

      const userId = (perfil as any).user_id
      const equipeJoin = first((perfil as any).equipes)
      let team = equipeJoin
      let equipeId = team?.id || (perfil as any).equipe_id || null

      let userProfile: any = null
      if (userId) {
        const { data: perfisRow } = await supabase
          .from('perfis')
          .select('id,nome,username,avatar_url,capa_url,bio,localidade')
          .eq('id', userId)
          .maybeSingle()
        userProfile = perfisRow || null
      }

      if (!equipeId) {
        const { data: vinculo } = await supabase
          .from('jogadores_campeonato')
          .select('id,equipe_id,campeonato_id,status,created_at,equipes:equipe_id(id,nome,tag,logo_url)')
          .eq('perfil_jogo_id', id)
          .neq('status', 'removido')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const vinculoTeam = first((vinculo as any)?.equipes)
        if ((vinculo as any)?.equipe_id || vinculoTeam?.id) {
          equipeId = (vinculo as any)?.equipe_id || vinculoTeam?.id
          team = vinculoTeam
        }
      }

      const row = {
        ...(perfil as any),
        avatar_url: userProfile?.avatar_url || null,
        usuario_nome: userProfile?.nome || userProfile?.username || null,
        equipes: team || undefined,
        equipe_id: equipeId || (perfil as any).equipe_id
      }
      const normalized = normalizePlayer(row)
      setItem(normalized)
      setCompetitiveStats(await loadPlayerCompetitiveStats(supabase, String(id)))

      if (equipeId) {
        const { data: inscricoes } = await supabase
          .from('campeonato_equipes')
          .select('id,status,campeonato_id,campeonatos:campeonato_id(id,nome,logo_url,banner_url,tipo,tipo_campeonato,status,vagas,quantidade_equipes,regiao,plataforma)')
          .eq('equipe_id', equipeId)
          .order('created_at', { ascending: false })
          .limit(5)
        setRecent((inscricoes || []).map((insc: any) => {
          const camp = first(insc.campeonatos)
          return camp ? { ...camp, inscricao_id: insc.id, inscricao_status: insc.status } : null
        }).filter(Boolean))
      } else {
        const { data: vinculos } = await supabase
          .from('jogadores_campeonato')
          .select('id,status,campeonato_id,campeonatos:campeonato_id(id,nome,logo_url,banner_url,tipo,tipo_campeonato,status,vagas,quantidade_equipes,regiao,plataforma)')
          .eq('perfil_jogo_id', id)
          .neq('status', 'removido')
          .order('created_at', { ascending: false })
          .limit(5)
        setRecent((vinculos || []).map((row: any) => {
          const camp = first(row.campeonatos)
          return camp ? { ...camp, vinculo_id: row.id, inscricao_status: row.status } : null
        }).filter(Boolean))
      }
    } catch (error: any) {
      Alert.alert('Jogador', error?.message || 'Nao foi possivel carregar o jogador.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadPlayer() }, [loadPlayer])

  useEffect(() => {
    async function loadMyTeams() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return
      const { data: equipes } = await supabase
        .from('equipes')
        .select('id,nome,tag')
        .eq('criado_por', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      setTeams((equipes || []) as TeamOption[])
    }
    loadMyTeams()
  }, [])

  async function enviarConvite(equipe: TeamOption) {
    if (!supabase || !item) return
    setSaving(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        router.push('/(auth)/login' as any)
        return
      }
      const { error } = await supabase.from('convites_equipe').insert({
        equipe_id: equipe.id,
        perfil_jogo_id: item.id,
        convidado_por_user_id: user.id,
        status: 'pendente',
        tipo: 'convite_equipe',
        mensagem: `${equipe.nome || equipe.tag || 'Sua equipe'} convidou ${item.nick} para entrar no elenco.`
      } as any)
      if (error) throw error
      setInviteOpen(false)
      Alert.alert('Convite enviado', 'O convite foi registrado em convites_equipe.')
    } catch (error: any) {
      Alert.alert('Erro no convite', error?.message || 'Nao foi possivel enviar o convite.')
    } finally {
      setSaving(false)
    }
  }

  async function enviarMensagem() {
    if (!supabase || !item) return
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) {
      router.push('/(auth)/login' as any)
      return
    }
    const targetUserId = item.user_id
    if (targetUserId && targetUserId !== user.id) {
      const titulo = chatTitle(item.usuario_nome || '', item.nick || '')
      const { data: conversa } = await supabase
        .from('chat_conversas')
        .insert({
          tipo: 'privado',
          titulo,
          avatar_url: item.avatar_url || item.foto_capa || null,
          referencia_tipo: 'usuario',
          referencia_id: targetUserId,
          criado_por_user_id: user.id
        } as any)
        .select('id')
        .single()
      if (conversa?.id) {
        await supabase.from('chat_participantes').insert([
          { conversa_id: conversa.id, user_id: user.id },
          { conversa_id: conversa.id, user_id: targetUserId }
        ] as any)
      }
    }
    router.push('/(tabs)/chat' as any)
  }

  if (loading) {
    return <Screen><BackHeader eyebrow="JOGADOR" title="Carregando" /><Card><ActivityIndicator color={colors.primary} /></Card></Screen>
  }

  if (!item) {
    return <Screen><BackHeader eyebrow="JOGADOR" title="Nao encontrado" /><Card><Subtitle>Jogador nao encontrado no banco.</Subtitle></Card></Screen>
  }

  return <Screen>
    <BackHeader eyebrow="JOGADOR" title={item.nick} />
    <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
      <LogoAvatar name={item.nick} uri={pickImage(item, ['avatar_url', 'foto_capa', 'imagem_url'], 'avatars')} size={74} rounded={6} type="player" />
      <Body style={{ fontWeight: '700', fontSize: 17, flex: 1 }}>{item.funcao} • {item.status}<Subtitle>{item.meta}</Subtitle></Body>
    </Card>
    <InfoGrid items={[{ label: 'servidor', value: item.servidor }, { label: 'equipe', value: item.equipe || 'Sem equipe' }, { label: 'funcao', value: item.funcao }, { label: 'status', value: item.status }]} />
    <Button label="Convidar para equipe" onPress={() => setInviteOpen(true)} />
    <Button label="Enviar mensagem" variant="dark" onPress={enviarMensagem} />
    <View style={styles.tabs}>
      <PlayerTabButton label="Perfil" icon="person-outline" active={tab === 'perfil'} onPress={() => setTab('perfil')} />
      <PlayerTabButton label="Estatisticas" icon="stats-chart-outline" active={tab === 'estatisticas'} onPress={() => setTab('estatisticas')} />
    </View>
    {tab === 'perfil' ? <>
      <SectionHeader title="Historico recente" action="campeonatos" />
      {!recent.length ? <Card><Subtitle>Nenhum campeonato vinculado a este jogador/equipe.</Subtitle></Card> : null}
      {recent.map((c: any, index: number) => <CompactRow key={`${c.id || 'camp'}-${c.inscricao_id || c.vinculo_id || index}`} type="champ" logo={c.sigla || c.nome} logoUri={pickImage(c, ['logo_url', 'imagem_url'], 'imagem_campeonatos')} title={c.nome || 'Campeonato'} meta={`${c.tipo_campeonato || c.tipo || 'competicao'} - ${c.vagas || c.quantidade_equipes || ''} vagas`} tag={c.inscricao_status || c.status || 'ativo'} right="ver" href={`/campeonato/${c.id}`} />)}
    </> : <PlayerStatsTab stats={competitiveStats} />}

    <Modal visible={inviteOpen} transparent animationType="fade" onRequestClose={() => setInviteOpen(false)}>
      <View style={styles.modalWrap}>
        <Pressable style={styles.overlay} onPress={() => setInviteOpen(false)} />
        <Card style={styles.modalCard}>
          <Body style={styles.modalTitle}>Escolha a equipe</Body>
          {!teams.length ? <Subtitle>Você precisa criar uma equipe antes de convidar jogadores.</Subtitle> : null}
          {teams.map((team) => <Pressable disabled={saving} key={team.id} onPress={() => enviarConvite(team)} style={styles.teamOption}>
            <Body style={styles.teamName}>{team.nome || team.tag || 'Equipe'}</Body>
            <Tiny>{team.tag || 'sem tag'}</Tiny>
          </Pressable>)}
          <Button label="Cancelar" variant="ghost" onPress={() => setInviteOpen(false)} />
        </Card>
      </View>
    </Modal>
  </Screen>
}

function PlayerTabButton({ label, icon, active, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  return <Pressable style={[styles.tab, { backgroundColor: colors.card, borderColor: colors.border }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={onPress}>
    <Ionicons name={icon} size={16} color={active ? colors.bg : colors.primary} />
    <Tiny style={active && { color: colors.bg }}>{label}</Tiny>
  </Pressable>
}

function PlayerStatsTab({ stats }: { stats: CompetitiveStats | null }) {
  return <View style={styles.statsBlock}>
    <SectionHeader title="Estatisticas totais" action="ranking oficial" />
    <CompetitiveTierBadge tier={stats?.tier} position={stats?.rankingPosicao} />
    <View style={styles.statsGrid}>
      <StatMetric label="Kills totais" value={stats?.kills || 0} />
      <StatMetric label="Partidas" value={stats?.partidas || 0} />
      <StatMetric label="Finais" value={stats?.finais || 0} />
      <StatMetric label="Titulos" value={stats?.titulos || 0} />
      <StatMetric label="Top 3" value={stats?.podios || 0} />
      <StatMetric label="Campeonatos" value={stats?.campeonatos || 0} />
      <StatMetric label="Media kills" value={(stats?.mediaKills || 0).toFixed(2)} />
      <StatMetric label="Score LEALT" value={formatCompactScore(stats?.score || 0)} />
    </View>
    <Card>
      <Tiny>Ranking competitivo</Tiny>
      <Body style={styles.rankingTitle}>Score {formatCompactScore(stats?.score || 0)} no ranking LEALT</Body>
      <Subtitle>Taxa de titulo {(stats?.taxaTitulos || 0).toFixed(0)}% - media de posicao {(stats?.mediaPosicao || 0).toFixed(1)}</Subtitle>
    </Card>
    <SectionHeader title="Evolucao competitiva" action="comparativos" />
    <CompetitiveEvolution comparisons={stats?.comparativos || []} points={stats?.evolucao || []} />
    <SectionHeader title="Historico competitivo" action={`${stats?.historico.length || 0} finais`} />
    {!stats?.historico.length ? <Card><Subtitle>Nenhum resultado oficial registrado.</Subtitle></Card> : null}
    {stats?.historico.map((row) => <CompactRow key={row.campeonatoId} type="champ" logo={row.nome} title={row.nome} meta={`${row.partidas} partidas - ${row.kills} kills - ${row.booyahs} booyahs`} tag={row.posicao ? `${row.posicao}o lugar` : 'N/I'} right={`${row.pontos} pts`} href={`/campeonato/${row.campeonatoId}`} />)}
  </View>
}

function StatMetric({ label, value }: { label: string; value: string | number }) {
  return <Card style={styles.statMetric}>
    <Body style={styles.statValue}>{value}</Body>
    <Tiny>{label}</Tiny>
  </Card>
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 7 },
  tab: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.card },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabTextActive: { color: colors.white },
  statsBlock: { gap: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statMetric: { width: '48%', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800' },
  rankingTitle: { fontWeight: '900', fontSize: 17 },
  modalWrap: { flex: 1, justifyContent: 'center', padding: 18 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  modalCard: { gap: 8, borderColor: colors.primary },
  modalTitle: { fontWeight: '900', textTransform: 'uppercase' },
  teamOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 12, backgroundColor: colors.card2 },
  teamName: { fontWeight: '800' }
})
