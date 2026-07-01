import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '@/components/Screen'
import { SiteHeader } from '@/components/SiteHeader'
import { StatsStrip } from '@/components/StatsStrip'
import { SectionHeader } from '@/components/SectionHeader'
import { CompactRow } from '@/components/CompactRow'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Body, Tiny, Subtitle } from '@/components/AppText'
import { FilterPill, FilterPills, FloatingPlus } from '@/components/FilterPills'
import { normalizeChampionship } from '@/lib/adapters'
import { pickImageFromBuckets } from '@/lib/images'
import { useRemoteList } from '@/lib/useRemoteList'
import { supabase } from '@/lib/supabase'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'

type Option = { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap }
type Aba = 'gerais' | 'meus'
type SelectState = { title: string; value: string; options: Option[]; onChange: (value: string) => void } | null

const tipos: Option[] = [
  { label: 'Todos', value: 'todos', icon: 'grid-outline' },
  { label: 'Confronto', value: 'confronto', icon: 'flash-outline' },
  { label: 'Diário', value: 'diario', icon: 'today-outline' },
  { label: 'Xtreino', value: 'xtreino', icon: 'fitness-outline' },
  { label: 'Copa', value: 'copa', icon: 'trophy-outline' },
  { label: 'Liga', value: 'liga', icon: 'podium-outline' }
]
const servidores: Option[] = [
  { label: 'Todos', value: 'todos' }, { label: 'Brasil (BR)', value: 'BR' }, { label: 'Latam (LATAM)', value: 'LATAM' },
  { label: 'América do Norte (NA)', value: 'NA' }, { label: 'Estados Unidos (US)', value: 'US' }, { label: 'América do Sul (SAC)', value: 'SAC' },
  { label: 'Europa (EU)', value: 'EU' }, { label: 'Oriente Médio e África (MEA)', value: 'MEA' }, { label: 'Índia (IND)', value: 'IND' },
  { label: 'Paquistão (PK)', value: 'PK' }, { label: 'Bangladesh (BD)', value: 'BD' }, { label: 'Tailândia (TH)', value: 'TH' },
  { label: 'Vietnã (VN)', value: 'VN' }, { label: 'Indonésia (ID)', value: 'ID' }, { label: 'Taiwan (TW)', value: 'TW' },
  { label: 'Singapura (SG)', value: 'SG' }, { label: 'Comunidade dos Estados Independentes (CIS)', value: 'CIS' }
]
const plataformas: Option[] = [{ label: 'Todas', value: 'todos' }, { label: 'Mobile', value: 'Mobile' }, { label: 'Emulador', value: 'Emulador' }, { label: 'Misto', value: 'Misto' }]

function labelOf(options: Option[], value: string) { return options.find((item) => item.value === value)?.label || value }
function normalizar(value: unknown) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() }
function tipoCampeonato(row: any) {
  const raw = normalizar(`${row.tipo_competicao || ''} ${row.modelo_competicao || ''} ${row.tipo_campeonato || ''} ${row.tipo || ''} ${row.formato || ''}`)
  if (raw.includes('confronto') || raw.includes('4x4') || raw.includes('x4')) return 'confronto'
  if (raw.includes('diario') || raw.includes('jogo_unico') || raw.includes('jogo unico')) return 'diario'
  if (raw.includes('xtreino') || raw.includes('x-treino') || raw.includes('x_treino') || raw.includes('treino')) return 'xtreino'
  if (raw.includes('copa') || raw.includes('mata_mata') || raw.includes('mata mata')) return 'copa'
  if (raw.includes('liga') || raw.includes('pontos_corridos') || raw.includes('pontos corridos')) return 'liga'
  return raw || 'campeonato'
}
function servidorMatch(filtro: string, row: any) {
  if (filtro === 'todos') return true
  const texto = normalizar(`${row.regiao || ''} ${row.abrangencia || ''}`)
  const alvo = normalizar(filtro)
  const label = normalizar(labelOf(servidores, filtro))
  return texto.includes(alvo) || texto.includes(label) || label.includes(texto)
}
function isOpen(row: any) {
  const status = String(row.status || '').toLowerCase()
  return ['ativo', 'aberto', 'rascunho', 'publicado', 'inscricoes'].some((item) => status.includes(item))
}
function isToday(row: any) {
  const today = new Date().toISOString().slice(0, 10)
  return row.data_inicio === today || row.data_abertura_inscricoes === today || row.created_at?.slice?.(0, 10) === today
}
function money(value: unknown) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

export default function CampeonatosScreen() {
  const theme = useTheme()
  const colors = theme.colors
  const [aba, setAba] = useState<Aba>('gerais')
  const [userId, setUserId] = useState('')
  const [produtoras, setProdutoras] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [servidor, setServidor] = useState('todos')
  const [plataforma, setPlataforma] = useState('todos')
  const [premioMin, setPremioMin] = useState('')
  const [premioMax, setPremioMax] = useState('')
  const [inscricaoMax, setInscricaoMax] = useState('')
  const [soHoje, setSoHoje] = useState(false)
  const [soAbertos, setSoAbertos] = useState(false)
  const [select, setSelect] = useState<SelectState>(null)

  const { data, usingMock } = useRemoteList({
    table: ['campeonatos'],
    select: 'id, nome, slug, produtora_id, criado_por, logo_url, banner_url, valor_vaga, valor_premiacao, vagas, quantidade_equipes, status, formato, tipo, tipo_campeonato, tipo_competicao, modelo_competicao, regiao, abrangencia, plataforma, categoria, data_inicio, data_abertura_inscricoes, horario_inicio, created_at',
    fallback: [],
    mapRow: normalizeChampionship,
    limit: 500
  })

  useEffect(() => { loadUserProdutoras() }, [])
  async function loadUserProdutoras() {
    if (!supabase) return
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id || ''
    setUserId(uid)
    if (!uid) return
    const { data: own } = await supabase.from('produtoras').select('id,nome,dono_id').eq('dono_id', uid)
    const { data: membros } = await supabase.from('produtora_membros').select('produtora_id,tipo,user_id').eq('user_id', uid).in('tipo', ['dono', 'admin', 'lider'])
    const ids = new Set<string>()
    ;(own || []).forEach((p: any) => p.id && ids.add(String(p.id)))
    ;(membros || []).forEach((p: any) => p.produtora_id && ids.add(String(p.produtora_id)))
    setProdutoras(Array.from(ids).map((id) => ({ id })))
  }

  const minhasProdutorasIds = useMemo(() => produtoras.map((p) => String(p.id)), [produtoras])
  const meusCampeonatos = useMemo(() => data.filter((item: any) => item.criado_por === userId || minhasProdutorasIds.includes(String(item.produtora_id || ''))), [data, userId, minhasProdutorasIds])

  const filtrados = useMemo(() => {
    const base = aba === 'meus' ? meusCampeonatos : data
    const term = normalizar(busca)
    const premioMinNumber = premioMin.trim() ? Number(premioMin.replace(',', '.')) : null
    const premioMaxNumber = premioMax.trim() ? Number(premioMax.replace(',', '.')) : null
    const inscricaoMaxNumber = inscricaoMax.trim() ? Number(inscricaoMax.replace(',', '.')) : null
    return base.filter((item: any) => {
      if (normalizar(`${item.tipo_competicao || ''} ${item.modelo_competicao || ''} ${item.tipo_campeonato || ''} ${item.tipo || ''} ${item.formato || ''}`).includes('apostado')) return false
      const haystack = normalizar(`${item.nome || ''} ${item.formato || ''} ${item.tipo || ''} ${item.tipo_campeonato || ''} ${item.tipo_competicao || ''} ${item.categoria || ''} ${item.regiao || ''} ${item.abrangencia || ''} ${item.plataforma || ''}`)
      const premio = Number(item.valor_premiacao || 0)
      const inscricao = Number(item.valor_vaga || item.taxa_inscricao || 0)
      if (term && !haystack.includes(term)) return false
      if (tipo !== 'todos' && tipoCampeonato(item) !== tipo) return false
      if (!servidorMatch(servidor, item)) return false
      if (plataforma !== 'todos' && normalizar(item.plataforma) !== normalizar(plataforma)) return false
      if (premioMinNumber !== null && premio < premioMinNumber) return false
      if (premioMaxNumber !== null && premio > premioMaxNumber) return false
      if (inscricaoMaxNumber !== null && inscricao > inscricaoMaxNumber) return false
      if (soHoje && !isToday(item)) return false
      if (soAbertos && !isOpen(item)) return false
      return true
    })
  }, [aba, busca, data, meusCampeonatos, premioMax, premioMin, inscricaoMax, plataforma, servidor, soAbertos, soHoje, tipo])

  const abertas = data.filter(isOpen).length
  const vagas = data.reduce((acc: number, item: any) => acc + Number(item.vagas || item.quantidade_equipes || 0), 0)

  function criarCampeonato() {
    if (!userId) {
      Alert.alert('Criar campeonato', 'Faça login para criar um campeonato.')
      router.push('/(auth)/login' as any)
      return
    }
    if (!produtoras.length) {
      Alert.alert('Criar campeonato', 'Você precisa ter uma produtora para criar campeonato.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Criar produtora', onPress: () => router.push('/criar/produtora' as any) }
      ])
      return
    }
    router.push('/criar/campeonato' as any)
  }

  const renderCampeonato = useCallback(({ item }: { item: any }) => (
    <CompactRow
      type="champ"
      logo={item.sigla || item.nome}
      logoUri={pickImageFromBuckets(item, ['logo_url', 'imagem_url'], ['imagem_campeonatos', 'assets', 'team-logos', 'avatars'])}
      imageUri={pickImageFromBuckets(item, ['banner_url', 'capa_url', 'cover_url'], ['imagem_campeonatos', 'assets'])}
      enableImageViewer={false}
      title={item.nome || item.titulo || 'Campeonato'}
      meta={item.meta || `${tipoCampeonato(item)} • ${item.vagas ? `${item.vagas} vagas` : 'vagas abertas'} • ${money(item.valor_premiacao)}`}
      tag={item.status || 'ativo'}
      right={item.valor || (item.valor_vaga ? `R$ ${item.valor_vaga}` : 'ver')}
      href={`/campeonato/${item.id || item.nome}`}
    />
  ), [])

  const listHeader = (
    <View style={styles.headerContent}>
      <SiteHeader eyebrow="DROP ZONE" title="Campeonatos" logo="DZ" usingMock={usingMock} subtitle="Vagas, prêmios e campeonatos com filtros completos." />
      <StatsStrip items={[{ label: 'abertos', value: abertas }, { label: 'meus', value: meusCampeonatos.length }, { label: 'vagas', value: vagas }]} />
      <FilterPills>
        <FilterPill label="Campeonatos gerais" active={aba === 'gerais'} onPress={() => setAba('gerais')} icon="trophy-outline" />
        <FilterPill label="Meus campeonatos" active={aba === 'meus'} onPress={() => setAba('meus')} icon="person-outline" />
        <FloatingPlus onPress={criarCampeonato} />
      </FilterPills>

      <Card style={styles.filters}>
        <View style={styles.searchLine}><Ionicons name="search-outline" size={18} color={colors.muted} /><Input value={busca} onChangeText={setBusca} placeholder="Buscar campeonato, produtora, servidor..." style={styles.searchInput} /></View>
        <View style={styles.selectGrid}>
          <SelectButton label="Tipo" value={labelOf(tipos, tipo)} onPress={() => setSelect({ title: 'Tipo', value: tipo, options: tipos, onChange: setTipo })} />
          <SelectButton label="Servidor" value={labelOf(servidores, servidor)} onPress={() => setSelect({ title: 'Servidor', value: servidor, options: servidores, onChange: setServidor })} />
          <SelectButton label="Plataforma" value={labelOf(plataformas, plataforma)} onPress={() => setSelect({ title: 'Plataforma', value: plataforma, options: plataformas, onChange: setPlataforma })} />
        </View>
        <View style={styles.valueRow}>
          <Input value={premioMin} onChangeText={setPremioMin} keyboardType="numeric" placeholder="Prêmio mín." style={styles.valueInput} />
          <Input value={premioMax} onChangeText={setPremioMax} keyboardType="numeric" placeholder="Prêmio máx." style={styles.valueInput} />
          <Input value={inscricaoMax} onChangeText={setInscricaoMax} keyboardType="numeric" placeholder="Inscrição até" style={styles.valueInput} />
        </View>
        <View style={styles.switches}><FilterToggle label="Vagas hoje" active={soHoje} onPress={() => setSoHoje(!soHoje)} /><FilterToggle label="Só abertas" active={soAbertos} onPress={() => setSoAbertos(!soAbertos)} /></View>
      </Card>

      <SectionHeader title={aba === 'meus' ? 'Meus campeonatos' : 'Campeonatos'} action={`${filtrados.length} resultados`} />
      {!filtrados.length ? <Card><Subtitle>Nenhum campeonato encontrado com esses filtros.</Subtitle></Card> : null}
    </View>
  )

  return <Screen scroll={false}>
    <FlatList
      data={filtrados}
      renderItem={renderCampeonato}
      keyExtractor={(item: any, index) => String(item.id || item.slug || item.nome || index)}
      ListHeaderComponent={listHeader}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListFooterComponent={<View style={styles.listFooter} />}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={80}
      windowSize={6}
    />

    <Modal visible={!!select} transparent animationType="fade" onRequestClose={() => setSelect(null)}>
      <Pressable style={styles.overlay} onPress={() => setSelect(null)}><View /></Pressable>
      <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View style={styles.sheetHead}><Body style={styles.sheetTitle}>{select?.title}</Body><Pressable onPress={() => setSelect(null)} style={styles.close}><Ionicons name="close-outline" size={22} color={colors.text} /></Pressable></View>
        {(select?.options || []).map((option) => <Pressable key={option.value} onPress={() => { select?.onChange(option.value); setSelect(null) }} style={[styles.option, { backgroundColor: colors.card, borderColor: colors.borderSoft }, select?.value === option.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <Body style={[styles.optionText, select?.value === option.value && { color: colors.bg }]}>{option.label}</Body>
          {select?.value === option.value ? <Ionicons name="checkmark" size={18} color={colors.bg} /> : null}
        </Pressable>)}
      </View>
    </Modal>
  </Screen>
}

function SelectButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { colors } = useTheme()
  return <Pressable onPress={onPress} style={[styles.selectBtn, { backgroundColor: colors.card2, borderColor: colors.border }]}><Tiny>{label}</Tiny><View style={styles.selectValue}><Body numberOfLines={1} style={styles.selectText}>{value}</Body><Ionicons name="chevron-down-outline" size={15} color={colors.primary} /></View></Pressable>
}
function FilterToggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  return <Pressable onPress={onPress} style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.border }, active && { borderColor: colors.primary, backgroundColor: colors.primary }]}><Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={active ? colors.bg : colors.primary} /><Tiny style={active && { color: colors.bg }}>{label}</Tiny></Pressable>
}

const styles = StyleSheet.create({
  headerContent: { gap: 8 },
  listContent: { paddingBottom: 84 },
  listFooter: { height: 8 },
  separator: { height: 8 },
  filters: { gap: 10 },
  searchLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, height: 42 },
  selectGrid: { gap: 8 },
  selectBtn: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.card2, gap: 4 },
  selectValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selectText: { flex: 1, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  valueRow: { flexDirection: 'row', gap: 7 },
  valueInput: { flex: 1, height: 42, fontSize: 11 },
  switches: { flexDirection: 'row', gap: 8 },
  toggle: { flex: 1, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.card },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.38)' },
  sheet: { position: 'absolute', left: 14, right: 14, bottom: 18, maxHeight: '82%', backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontWeight: '900', fontSize: 16 },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 6, backgroundColor: colors.card },
  optionText: { fontWeight: '800', fontSize: 12 }
})
