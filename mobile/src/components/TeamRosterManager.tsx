import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Ionicons } from '@expo/vector-icons'
import { Body, Subtitle, Tiny } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { CompactRow } from '@/components/CompactRow'
import { LogoAvatar } from '@/components/LogoAvatar'
import { SectionHeader } from '@/components/SectionHeader'
import { pickImage } from '@/lib/images'
import { supabase } from '@/lib/supabase'
import { colors } from '@/theme/colors'

type Player = { id: string; nick?: string | null; foto_capa?: string | null; funcao?: string | null; servidor?: string | null; plataforma?: string | null; tipo?: string | null }
type Invite = { id: string; tipo?: string | null; status?: string | null; mensagem?: string | null; created_at?: string | null; perfil?: Player | Player[] | null }
type LinePlayer = { id: string; perfil_jogo_id?: string | null; tipo_slot?: string | null; ordem?: number | null; funcao_line?: string | null; perfis_jogo?: Player | Player[] | null }
type TeamLine = { id: string; nome: string; tipo?: string | null; plataforma?: string | null; ativa?: boolean | null; equipe_id?: string | null; logo_url?: string | null; lines_jogadores?: LinePlayer[] }
type RosterView = 'players' | 'lines' | 'sent' | 'received'

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

async function rpcFallback(names: string[], payload: Record<string, unknown>) {
  if (!supabase) return
  let lastError: any = null
  for (const name of names) {
    const { error } = await supabase.rpc(name, payload)
    if (!error) return
    lastError = error
  }
  throw lastError
}


function cleanLineName(line: TeamLine | null | undefined) {
  const raw = String(line?.nome || '').trim()
  if (!raw) return 'Line'
  if (/^VAGA[_-]/i.test(raw) || raw.length > 42) {
    const tipo = String(line?.tipo || '').trim()
    return tipo ? `Line ${tipo}` : 'Line adicionada'
  }
  return raw
}

function base64ToUint8Array(base64: string) {
  const binary = globalThis.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export function TeamRosterManager({ teamId, canManage, onUpdated }: { teamId: string; canManage: boolean; onUpdated?: () => void | Promise<void> }) {
  const [view, setView] = useState<RosterView>('players')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [sent, setSent] = useState<Invite[]>([])
  const [received, setReceived] = useState<Invite[]>([])
  const [lines, setLines] = useState<TeamLine[]>([])
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [candidates, setCandidates] = useState<Player[]>([])
  const [lineModal, setLineModal] = useState(false)
  const [editingLine, setEditingLine] = useState<TeamLine | null>(null)
  const [lineName, setLineName] = useState('')
  const [lineType, setLineType] = useState('principal')
  const [lineLogoUrl, setLineLogoUrl] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, 'titular' | 'reserva'>>({})
  const [importModal, setImportModal] = useState(false)
  const [lineSearch, setLineSearch] = useState('')
  const [lineCandidates, setLineCandidates] = useState<TeamLine[]>([])
  const [searchingLines, setSearchingLines] = useState(false)

  const blockedIds = useMemo(() => new Set([...players.map((player) => player.id), ...sent.map((invite) => first(invite.perfil)?.id || '')]), [players, sent])

  const load = useCallback(async () => {
    if (!supabase || !teamId) return
    setLoading(true)
    try {
      const [{ data: profiles }, { data: invites }, { data: ownLines }, { data: links }] = await Promise.all([
        supabase.from('perfis_jogo').select('id,nick,foto_capa,funcao,servidor,plataforma').eq('equipe_id', teamId).eq('ativo', true).order('nick'),
        supabase.from('convites_equipe').select('id,tipo,status,mensagem,created_at,perfil:perfil_jogo_id(id,nick,foto_capa,funcao,servidor,plataforma)').eq('equipe_id', teamId).eq('status', 'pendente').order('created_at', { ascending: false }),
        supabase.from('lines').select('id,nome,tipo,plataforma,ativa,equipe_id,logo_url').eq('equipe_id', teamId).order('updated_at', { ascending: false }),
        supabase.from('equipes_lines_vinculos').select('line_id').eq('equipe_id', teamId)
      ])
      const lineIds = Array.from(new Set([...(ownLines || []).map((line: any) => String(line.id)), ...(links || []).map((link: any) => String(link.line_id))].filter(Boolean)))
      let allLines: any[] = ownLines || []
      let linePlayers: any[] = []
      if (lineIds.length) {
        const [{ data: rows }, { data: playerRows }] = await Promise.all([
          supabase.from('lines').select('id,nome,tipo,plataforma,ativa,equipe_id,logo_url').in('id', lineIds),
          supabase.from('lines_jogadores').select('id,line_id,perfil_jogo_id,tipo_slot,ordem,funcao_line,perfis_jogo:perfil_jogo_id(id,nick,foto_capa,funcao,servidor,plataforma)').in('line_id', lineIds).is('removido_em', null)
        ])
        allLines = rows || []
        linePlayers = playerRows || []
      }
      const normalizedInvites = (invites || []) as Invite[]
      setPlayers((profiles || []) as Player[])
      setSent(normalizedInvites.filter((invite) => String(invite.tipo || '').toLowerCase() !== 'pedido'))
      setReceived(normalizedInvites.filter((invite) => String(invite.tipo || '').toLowerCase() === 'pedido'))
      setLines((allLines || []).map((line: any) => ({ ...line, lines_jogadores: linePlayers.filter((row: any) => String(row.line_id) === String(line.id)) })))
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!supabase || !canManage || view !== 'players' || search.trim().length < 2) {
      setCandidates([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase!
        .from('perfis_jogo')
        .select('id,nick,foto_capa,funcao,servidor,plataforma')
        .eq('ativo', true)
        .ilike('nick', `%${search.trim()}%`)
        .order('nick')
        .limit(12)
      setCandidates(((data || []) as Player[]).filter((player) => !blockedIds.has(player.id)))
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [blockedIds, canManage, search, view])

  async function invitePlayer(profileId: string) {
    try {
      setProcessing(profileId)
      await rpcFallback(['enviar_convite_equipe_v2', 'enviar_convite_equipe'], { p_equipe_id: teamId, p_perfil_jogo_id: profileId, p_mensagem: null })
      setSearch('')
      setCandidates([])
      await load()
      Alert.alert('Convite enviado', 'O jogador apareceu no histórico de convites enviados.')
    } catch (error: any) {
      Alert.alert('Convite', error?.message || 'Não foi possível enviar o convite.')
    } finally {
      setProcessing(null)
    }
  }

  async function answerRequest(inviteId: string, accept: boolean) {
    try {
      setProcessing(inviteId)
      await rpcFallback(accept ? ['aceitar_convite_equipe_v2', 'aceitar_convite_equipe'] : ['recusar_convite_equipe_v2', 'recusar_convite_equipe'], { p_convite_id: inviteId })
      await load()
      await onUpdated?.()
    } catch (error: any) {
      Alert.alert('Pedido', error?.message || 'Não foi possível responder ao pedido.')
    } finally {
      setProcessing(null)
    }
  }

  function openLine(line?: TeamLine) {
    setEditingLine(line || null)
    setLineName(/^VAGA[_-]/i.test(String(line?.nome || '')) ? '' : (line?.nome || ''))
    setLineType(line?.tipo || 'principal')
    setLineLogoUrl(line?.logo_url || '')
    const selected: Record<string, 'titular' | 'reserva'> = {}
    ;(line?.lines_jogadores || []).forEach((row) => { if (row.perfil_jogo_id) selected[row.perfil_jogo_id] = row.tipo_slot === 'reserva' ? 'reserva' : 'titular' })
    setSelectedPlayers(selected)
    setLineModal(true)
  }

  async function uploadLineLogo() {
    if (!supabase) return
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) return Alert.alert('Logo', 'Permita acesso às imagens para enviar a logo.')
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 })
      if (result.canceled || !result.assets[0]?.uri) return
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) throw new Error('Faça login para enviar logo.')
      const image = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 500, height: 500 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.PNG, base64: true })
      if (!image.base64) throw new Error('Não foi possível preparar a imagem.')
      const path = `${userId}/lines/${teamId}-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
      const bytes = base64ToUint8Array(image.base64)
      const { error } = await supabase.storage.from('team-logos').upload(path, bytes.buffer, { cacheControl: '3600', upsert: true, contentType: 'image/png' })
      if (error) throw error
      const { data } = supabase.storage.from('team-logos').getPublicUrl(path)
      setLineLogoUrl(data.publicUrl)
    } catch (error: any) {
      Alert.alert('Logo', error?.message || 'Não foi possível enviar a logo.')
    }
  }

  async function searchLinesToImport(text: string) {
    setLineSearch(text)
    if (!supabase || text.trim().length < 2) {
      setLineCandidates([])
      return
    }
    setSearchingLines(true)
    const { data } = await supabase!.from('lines').select('id,nome,tipo,plataforma,ativa,equipe_id,logo_url').ilike('nome', `%${text.trim()}%`).order('updated_at', { ascending: false }).limit(15)
    const linked = new Set(lines.map((line) => String(line.id)))
    setLineCandidates(((data || []) as TeamLine[]).filter((line) => !linked.has(String(line.id))))
    setSearchingLines(false)
  }

  async function importLine(line: TeamLine) {
    if (!supabase) return
    try {
      setProcessing(line.id)
      const payload = { equipe_id: teamId, line_id: line.id }
      const { error } = await supabase!.from('equipes_lines_vinculos').insert(payload)
      if (error && !String(error.message || '').toLowerCase().includes('duplicate')) throw error
      setImportModal(false)
      setLineSearch('')
      setLineCandidates([])
      await load()
    } catch (error: any) {
      Alert.alert('Line', error?.message || 'Não foi possível adicionar a line.')
    } finally {
      setProcessing(null)
    }
  }

  async function saveLine() {
    if (!lineName.trim()) return Alert.alert('Line', 'Informe o nome da line.')
    const chosen = Object.entries(selectedPlayers)
    if (!chosen.length) return Alert.alert('Line', 'Selecione pelo menos um jogador.')
    try {
      setProcessing('line')
      const counters = { titular: 0, reserva: 0 }
      const payload = chosen.map(([profileId, slot]) => ({
        perfil_jogo_id: profileId,
        jogador_avulso_id: null,
        tipo_slot: slot,
        ordem: counters[slot]++,
        funcao_line: players.find((player) => player.id === profileId)?.funcao || null
      }))
      await rpcFallback(['salvar_line_completa'], {
        p_line_id: editingLine?.id || null,
        p_nome: lineName.trim(),
        p_tipo: editingLine?.id ? (editingLine.tipo || null) : null,
        p_visibilidade: 'equipe',
        p_plataforma: null,
        p_equipe_id: teamId,
        p_vincular_equipe: true,
        p_jogadores: payload
      })
      if (lineLogoUrl) {
        const { data: newest } = await supabase!.from('lines').select('id').eq('equipe_id', teamId).eq('nome', lineName.trim()).order('updated_at', { ascending: false }).limit(1).maybeSingle()
        const lineIdToUpdate = editingLine?.id || newest?.id
        if (lineIdToUpdate) await supabase!.from('lines').update({ logo_url: lineLogoUrl }).eq('id', lineIdToUpdate)
      }
      setLineModal(false)
      await load()
    } catch (error: any) {
      Alert.alert('Line', error?.message || 'Não foi possível salvar a line.')
    } finally {
      setProcessing(null)
    }
  }

  function deleteLine(line: TeamLine) {
    Alert.alert('Excluir line', `Excluir ${line.nome}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        if (!supabase) return
        setProcessing(line.id)
        if (String(line.equipe_id || '') !== teamId) {
          await supabase!.from('equipes_lines_vinculos').delete().eq('line_id', line.id).eq('equipe_id', teamId)
          await load()
          setProcessing(null)
          return
        }
        const usage = await supabase.from('campeonato_equipes').select('id', { count: 'exact', head: true }).eq('line_id', line.id)
        if ((usage.count || 0) > 0) Alert.alert('Line em uso', 'Troque a line vinculada ao campeonato antes de excluir.')
        else {
          await supabase.from('lines_jogadores').delete().eq('line_id', line.id)
          await supabase!.from('equipes_lines_vinculos').delete().eq('line_id', line.id)
          await supabase!.from('lines').delete().eq('id', line.id)
          await load()
        }
        setProcessing(null)
      } }
    ])
  }

  if (loading) return <ActivityIndicator color={colors.primary} />

  const visibleInvites = view === 'sent' ? sent : received
  return <View style={styles.wrap}>
    <SectionHeader title="Elenco" action={`${players.length} atletas`} />
    <View style={styles.tabs}>
      <RosterTab icon="people-outline" label="Jogadores" active={view === 'players'} onPress={() => setView('players')} />
      <RosterTab icon="git-branch-outline" label="Lines" active={view === 'lines'} onPress={() => setView('lines')} />
      <IconTab icon="paper-plane-outline" count={sent.length} active={view === 'sent'} label="Convites enviados" onPress={() => setView('sent')} />
      <IconTab icon="notifications-outline" count={received.length} active={view === 'received'} label="Pedidos recebidos" onPress={() => setView('received')} />
    </View>

    {view === 'players' ? <>
      {canManage ? <Card style={styles.searchCard}>
        <View style={styles.searchLine}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Pesquisar perfil de jogo por nick" style={styles.searchInput} />
        </View>
        {searching ? <ActivityIndicator color={colors.primary} /> : null}
        {candidates.map((player) => <View key={player.id} style={styles.candidate}>
          <LogoAvatar name={player.nick || 'J'} uri={pickImage(player, ['foto_capa'], 'avatars')} size={38} rounded={8} />
          <View style={styles.grow}><Body style={styles.name}>{player.nick}</Body><Tiny>{[player.funcao, player.servidor, player.plataforma].filter(Boolean).join(' - ')}</Tiny></View>
          <Pressable disabled={processing === player.id} onPress={() => invitePlayer(player.id)} style={styles.inviteButton}><Ionicons name="person-add-outline" size={16} color={colors.white} /></Pressable>
        </View>)}
      </Card> : null}
      {!players.length ? <Card><Subtitle>Nenhum jogador vinculado.</Subtitle></Card> : null}
      {players.map((player) => <CompactRow key={player.id} type="player" logo={player.nick || 'J'} logoUri={pickImage(player, ['foto_capa'], 'avatars')} title={player.nick || 'Jogador'} meta={[player.funcao, player.servidor, player.plataforma].filter(Boolean).join(' - ')} tag={player.funcao || 'membro'} right="ver" href={`/jogador/${player.id}`} />)}
    </> : null}

    {view === 'lines' ? <>
      <View style={styles.sectionAction}><SectionHeader title="Lines da equipe" action={`${lines.length} lines`} />{canManage ? <View style={styles.lineActions}><Pressable onPress={() => setImportModal(true)} style={styles.addOutlineButton}><Ionicons name="download-outline" size={17} color={colors.primary} /></Pressable><Pressable onPress={() => openLine()} style={styles.addLineButton}><Ionicons name="add" size={19} color={colors.white} /></Pressable></View> : null}</View>
      {canManage ? <Pressable onPress={() => openLine()} style={styles.createLineCard}>
        <View style={styles.createLineIcon}><Ionicons name="add" size={22} color={colors.white} /></View>
        <View style={styles.grow}><Body style={styles.name}>Criar nova line</Body><Tiny>Nome, logo e jogadores da equipe</Tiny></View>
      </Pressable> : null}
      {!lines.length ? <Card><Subtitle>Nenhuma line criada. Monte a primeira composição do elenco.</Subtitle></Card> : null}
      {lines.map((line) => {
        const ownedByTeam = String(line.equipe_id || '') === String(teamId)
        const displayName = cleanLineName(line)
        return <Card key={line.id}>
          <View style={styles.lineHeader}>
            <LogoAvatar name={displayName} uri={line.logo_url || undefined} size={42} rounded={8} />
            <View style={styles.grow}><Body style={styles.name}>{displayName}</Body><Tiny>{line.tipo || 'principal'} - {line.lines_jogadores?.length || 0} jogadores{ownedByTeam ? '' : ' - adicionada'}</Tiny></View>
            {canManage ? <View style={styles.lineActions}>{ownedByTeam ? <Pressable onPress={() => openLine(line)} style={styles.iconAction}><Ionicons name="create-outline" size={17} color={colors.primary} /></Pressable> : null}<Pressable onPress={() => deleteLine(line)} style={styles.iconAction}><Ionicons name={ownedByTeam ? 'trash-outline' : 'remove-circle-outline'} size={17} color={colors.danger} /></Pressable></View> : null}
          </View>
          <View style={styles.linePlayers}>{(line.lines_jogadores || []).map((row) => { const player = first(row.perfis_jogo); return <View key={row.id} style={styles.linePlayer}><LogoAvatar name={player?.nick || 'J'} uri={player?.foto_capa || undefined} size={28} rounded={7} /><View style={styles.grow}><Body numberOfLines={1} style={styles.linePlayerName}>{player?.nick || 'Jogador'}</Body><Tiny>{row.tipo_slot || 'titular'}</Tiny></View></View> })}</View>
        </Card>
      })}
    </> : null}

    {(view === 'sent' || view === 'received') ? <>
      <SectionHeader title={view === 'sent' ? 'Convites enviados' : 'Pedidos recebidos'} action={`${visibleInvites.length} pendentes`} />
      {!visibleInvites.length ? <Card><Subtitle>Nenhuma notificação pendente.</Subtitle></Card> : null}
      {visibleInvites.map((invite) => { const player = first(invite.perfil); return <Card key={invite.id}><View style={styles.candidate}><LogoAvatar name={player?.nick || 'J'} uri={player?.foto_capa || undefined} size={40} rounded={8} /><View style={styles.grow}><Body style={styles.name}>{player?.nick || 'Jogador'}</Body><Tiny>{invite.mensagem || invite.status || 'pendente'}</Tiny></View>{view === 'received' && canManage ? <View style={styles.lineActions}><Pressable onPress={() => answerRequest(invite.id, true)} style={[styles.iconAction, styles.accept]}><Ionicons name="checkmark" size={17} color={colors.white} /></Pressable><Pressable onPress={() => answerRequest(invite.id, false)} style={[styles.iconAction, styles.reject]}><Ionicons name="close" size={17} color={colors.white} /></Pressable></View> : <Ionicons name="time-outline" size={18} color={colors.muted} />}</View></Card> })}
    </> : null}

    <Modal visible={importModal} transparent animationType="slide" onRequestClose={() => setImportModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0} style={styles.modalBackdrop}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
          <View style={styles.modalCard}>
        <SectionHeader title="Adicionar line completa" action="buscar" />
        <TextInput value={lineSearch} onChangeText={searchLinesToImport} placeholder="Buscar line por nome" style={styles.input} />
        {searchingLines ? <ActivityIndicator color={colors.primary} /> : null}
        <ScrollView style={styles.playerPicker}>
          {lineCandidates.map((line) => <Pressable key={line.id} onPress={() => importLine(line)} style={styles.importLineRow}>
            <LogoAvatar name={cleanLineName(line)} uri={line.logo_url || undefined} size={38} rounded={8} />
            <View style={styles.grow}><Body style={styles.name}>{cleanLineName(line)}</Body><Tiny>{line.tipo || 'principal'} - toque para adicionar à equipe</Tiny></View>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          </Pressable>)}
          {!lineCandidates.length && lineSearch.trim().length >= 2 ? <Subtitle>Nenhuma line encontrada.</Subtitle> : null}
        </ScrollView>
        <Button label="Fechar" variant="ghost" onPress={() => setImportModal(false)} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>

    <Modal visible={lineModal} transparent animationType="slide" onRequestClose={() => setLineModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0} style={styles.modalBackdrop}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
          <View style={styles.modalCard}>
        <SectionHeader title={editingLine ? 'Editar line' : 'Nova line'} action={`${Object.keys(selectedPlayers).length} jogadores`} />
        <TextInput value={lineName} onChangeText={setLineName} placeholder="Nome da line" style={styles.input} />
        <Pressable onPress={uploadLineLogo} style={styles.logoUpload}>{lineLogoUrl ? <Image source={{ uri: lineLogoUrl }} style={styles.logoPreview} /> : <LogoAvatar name={lineName || 'L'} size={54} rounded={12} />}<View style={styles.grow}><Body style={styles.name}>{lineLogoUrl ? 'Trocar logo da line' : 'Adicionar logo da line'}</Body><Tiny>500x500 px, enviada para team-logos</Tiny></View><Ionicons name="cloud-upload-outline" size={22} color={colors.primary} /></Pressable>
        <View style={styles.typeRow}>{['principal', 'rush', 'safe', 'mobile', 'emulador'].map((type) => <Pressable key={type} onPress={() => setLineType(type)} style={[styles.typeChip, lineType === type && styles.typeChipOn]}><Tiny style={lineType === type && styles.typeTextOn}>{type}</Tiny></Pressable>)}</View>
        <ScrollView style={styles.playerPicker}>{players.map((player) => {
          const selected = selectedPlayers[player.id]
          return <View key={player.id} style={styles.pickPlayer}><LogoAvatar name={player.nick || 'J'} uri={player.foto_capa || undefined} size={34} rounded={8} /><Body numberOfLines={1} style={[styles.grow, styles.name]}>{player.nick}</Body><Pressable onPress={() => setSelectedPlayers((current) => { const next = { ...current }; if (!selected) next[player.id] = 'titular'; else if (selected === 'titular') next[player.id] = 'reserva'; else delete next[player.id]; return next })} style={[styles.slotButton, selected === 'titular' && styles.slotTitular, selected === 'reserva' && styles.slotReserva]}><Tiny style={selected ? styles.slotTextOn : undefined}>{selected || 'fora'}</Tiny></Pressable></View>
        })}</ScrollView>
        <Button label={processing === 'line' ? 'Salvando...' : 'Salvar line'} onPress={saveLine} />
        <Button label="Cancelar" variant="ghost" onPress={() => setLineModal(false)} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  </View>
}

function RosterTab({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.textTab, active && styles.tabOn]}><Ionicons name={icon} size={15} color={active ? colors.white : colors.primary} /><Tiny style={active && styles.textOn}>{label}</Tiny></Pressable>
}
function IconTab({ icon, count, active, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; count: number; active: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={[styles.iconTab, active && styles.tabOn]}><Ionicons name={icon} size={17} color={active ? colors.white : colors.primary} />{count ? <View style={styles.badge}><Tiny style={styles.badgeText}>{count}</Tiny></View> : null}</Pressable>
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  tabs: { flexDirection: 'row', gap: 6 },
  textTab: { flex: 1, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.card },
  iconTab: { width: 44, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.card },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  textOn: { color: colors.white },
  badge: { position: 'absolute', right: 2, top: 2, minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger },
  badgeText: { color: colors.white, fontSize: 8 },
  searchCard: { gap: 7 },
  searchLine: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 9 },
  searchInput: { flex: 1, color: colors.text, fontWeight: '700' },
  candidate: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  grow: { flex: 1, minWidth: 0 },
  name: { fontWeight: '900' },
  inviteButton: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sectionAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addLineButton: { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  addOutlineButton: { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  createLineCard: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, padding: 10, backgroundColor: colors.card },
  createLineIcon: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  lineHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  lineActions: { flexDirection: 'row', gap: 5 },
  iconAction: { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  accept: { backgroundColor: colors.success, borderColor: colors.success },
  reject: { backgroundColor: colors.danger, borderColor: colors.danger },
  linePlayers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  linePlayer: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 5, padding: 5 },
  linePlayerName: { fontSize: 11, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', padding: 14, backgroundColor: 'rgba(0,0,0,0.48)' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 22 },
  modalCard: { maxHeight: '90%', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.bg },
  input: { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, color: colors.text, fontWeight: '800' },
  logoUpload: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 9, backgroundColor: colors.card },
  logoPreview: { width: 54, height: 54, borderRadius: 12, backgroundColor: colors.panel2 },
  importLineRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, paddingVertical: 7 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  typeChip: { minHeight: 32, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 10 },
  typeChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeTextOn: { color: colors.white },
  playerPicker: { maxHeight: 240 },
  pickPlayer: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  slotButton: { width: 62, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 5 },
  slotTitular: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotReserva: { backgroundColor: colors.warning, borderColor: colors.warning },
  slotTextOn: { color: colors.white }
})
