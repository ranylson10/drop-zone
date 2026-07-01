import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '@/components/Screen'
import { SiteHeader } from '@/components/SiteHeader'
import { StatsStrip } from '@/components/StatsStrip'
import { Card } from '@/components/Card'
import { Body, Subtitle, Tiny } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { supabase } from '@/lib/supabase'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'

type CalendarItem = {
  id: string
  rawId?: string
  kind: 'jogo' | 'agenda'
  title: string
  subtitle: string
  description?: string | null
  date?: string | null
  time?: string | null
  duration?: number | null
  bgColor?: string | null
  textColor?: string | null
  status?: string | null
  campeonatoId?: string | null
  equipeId?: string | null
}

type CalendarDay = { date: Date; iso: string; day: number; week: string }
type SlotDraft = { date: string; time: string }
type SearchResult = { id: string; kind: 'campeonato' | 'equipe' | 'jogador'; title: string; subtitle?: string | null }

const baseHours = ['13:00', '15:00', '16:00', '18:00', '19:00', '20:00', '21:00', '22:00']

const bgPalette = [
  { label: 'Verde', value: '#00a884' },
  { label: 'Azul', value: '#2563EB' },
  { label: 'Roxo', value: '#7C3AED' },
  { label: 'Vermelho', value: '#DC2626' },
  { label: 'Laranja', value: '#EA580C' },
  { label: 'Amarelo', value: '#FACC15' },
  { label: 'Ciano', value: '#0891B2' },
  { label: 'Rosa', value: '#DB2777' },
  { label: 'Escuro', value: '#111827' },
  { label: 'Branco', value: '#FFFFFF' }
]

const textPalette = [
  { label: 'Branco', value: '#FFFFFF' },
  { label: 'Preto', value: '#111827' },
  { label: 'Azul', value: '#1D4ED8' },
  { label: 'Verde', value: '#047857' }
]

const durationOptions = [30, 60, 90, 120, 180, 240]

function parseLocalDate(date?: string | null, time?: string | null) {
  if (!date) return null
  const parsed = new Date(`${date}T${time || '00:00'}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseAnyDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function itemDate(item: CalendarItem) {
  if (item.kind === 'jogo') return parseLocalDate(item.date, item.time)
  if (item.date?.includes('T')) return parseAnyDate(item.date)
  return parseLocalDate(item.date, item.time)
}

function isoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeTime(value?: string | null) {
  if (!value) return ''
  if (value.includes('T')) {
    const parsed = parseAnyDate(value)
    return parsed ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(parsed) : ''
  }
  return value.slice(0, 5)
}

function timeText(item: CalendarItem) {
  if (item.time) return normalizeTime(item.time)
  const date = itemDate(item)
  return date ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date) : ''
}

function dateText(item: CalendarItem) {
  const date = itemDate(item)
  if (!date) return 'A definir'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function isToday(item: CalendarItem) {
  const date = itemDate(item)
  if (!date) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function monthName(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date).toUpperCase()
}


function weekdayText(dateIso: string) {
  const parsed = parseLocalDate(dateIso, '00:00')
  if (!parsed) return 'Seg'
  const weekMap = ['Dom', 'Seg', 'Ter', 'Quar', 'Quin', 'Sex', 'Sáb']
  return weekMap[parsed.getDay()]
}

function buildMonthDays(cursor: Date): CalendarDay[] {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: lastDay }, (_, index) => {
    const date = new Date(year, month, index + 1)
    return {
      date,
      iso: isoDate(date),
      day: index + 1,
      week: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '').slice(0, 3).toUpperCase()
    }
  })
}

function minutesFromTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function itemCoversSlot(item: CalendarItem, dayIso: string, slot: string) {
  const date = itemDate(item)
  const time = timeText(item)
  if (!date || isoDate(date) !== dayIso || !time) return false
  const start = minutesFromTime(time)
  const end = start + (item.duration || 60)
  const current = minutesFromTime(slot)
  return current >= start && current < end
}

function addMinutes(date: string, time: string, minutes: number) {
  const start = parseLocalDate(date, time) || new Date()
  return new Date(start.getTime() + minutes * 60000).toISOString()
}

function getAgendaDate(event: any) {
  return event.data_evento || event.data_inicio || event.starts_at || event.created_at
}

function getAgendaTime(event: any) {
  return event.horario || normalizeTime(event.data_inicio || event.starts_at)
}


function itemStartsAtSlot(item: CalendarItem, dayIso: string, slot: string) {
  const date = itemDate(item)
  const time = timeText(item)
  return !!date && isoDate(date) === dayIso && time === slot
}

function itemSpanSlots(item: CalendarItem, dayIso: string, startIndex: number) {
  let span = 0
  for (let index = startIndex; index < baseHours.length; index += 1) {
    if (!itemCoversSlot(item, dayIso, baseHours[index])) break
    span += 1
  }
  return Math.max(1, span)
}

function touchDistance(evt: any) {
  const touches = evt?.nativeEvent?.touches || []
  if (touches.length < 2) return 0
  const [a, b] = touches
  const dx = (a.pageX || 0) - (b.pageX || 0)
  const dy = (a.pageY || 0) - (b.pageY || 0)
  return Math.sqrt(dx * dx + dy * dy)
}

function clampZoom(value: number) {
  return Math.max(0.82, Math.min(2.1, value))
}

export default function Calendario() {
  const theme = useTheme()
  const colors = theme.colors
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CalendarItem[]>([])
  const [cursorMonth, setCursorMonth] = useState(() => new Date())
  const [tasksOpen, setTasksOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [draft, setDraft] = useState<SlotDraft | null>(null)
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('60')
  const [bgColor, setBgColor] = useState('#00a884')
  const [textColor, setTextColor] = useState('#ffffff')
  const [saving, setSaving] = useState(false)
  const [zoom, setZoom] = useState(1)
  const pinchStartDistance = useRef(0)
  const pinchStartZoom = useRef(1)

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    if (!supabase) {
      setItems([])
      setLoading(false)
      return
    }

    const monthStart = new Date(cursorMonth.getFullYear(), cursorMonth.getMonth(), 1).toISOString().slice(0, 10)
    const monthEnd = new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() + 1, 0).toISOString().slice(0, 10)
    const client = supabase

    const [{ data: jogos }, agendaResult] = await Promise.all([
      client
        .from('jogos')
        .select('id,campeonato_id,fase_id,nome_bloco,data_jogo,hora_jogo,duracao_estimada_min,quantidade_partidas,quedas')
        .gte('data_jogo', monthStart)
        .lte('data_jogo', monthEnd)
        .order('data_jogo', { ascending: true })
        .order('hora_jogo', { ascending: true }),
      client
        .from('agenda_eventos')
        .select('*')
        .gte('data_evento', monthStart)
        .lte('data_evento', monthEnd)
        .order('data_evento', { ascending: true })
        .order('horario', { ascending: true })
    ])

    let agenda = agendaResult.data || []
    if (agendaResult.error) {
      const fallback = await client
        .from('agenda_eventos')
        .select('*')
        .gte('data_inicio', `${monthStart}T00:00:00`)
        .lte('data_inicio', `${monthEnd}T23:59:59`)
        .order('data_inicio', { ascending: true })
      agenda = fallback.data || []
    }

    const campeonatoIds = Array.from(new Set([...(jogos || []).map((j: any) => j.campeonato_id), ...agenda.map((a: any) => a.campeonato_id)].filter(Boolean)))
    const faseIds = Array.from(new Set((jogos || []).map((j: any) => j.fase_id).filter(Boolean)))

    const [{ data: campeonatos }, { data: fases }] = await Promise.all([
      campeonatoIds.length ? client.from('campeonatos').select('id,nome,logo_url').in('id', campeonatoIds) : Promise.resolve({ data: [] }),
      faseIds.length ? client.from('campeonato_fases').select('id,nome').in('id', faseIds) : Promise.resolve({ data: [] })
    ])

    const championshipMap = new Map((campeonatos || []).map((row: any) => [row.id, row]))
    const phaseMap = new Map((fases || []).map((row: any) => [row.id, row]))

    const gameItems: CalendarItem[] = (jogos || []).map((jogo: any) => {
      const champ = championshipMap.get(jogo.campeonato_id)
      const phase = phaseMap.get(jogo.fase_id)
      return {
        id: `jogo-${jogo.id}`,
        rawId: jogo.id,
        kind: 'jogo',
        title: champ?.nome || jogo.nome_bloco || 'Jogo',
        subtitle: [phase?.nome || jogo.nome_bloco, jogo.quantidade_partidas ? `${jogo.quantidade_partidas} partidas` : ''].filter(Boolean).join(' - '),
        description: 'Compromisso puxado automaticamente dos jogos/campeonatos.',
        date: jogo.data_jogo,
        time: jogo.hora_jogo,
        duration: jogo.duracao_estimada_min || 60,
        bgColor: '#2563EB',
        textColor: '#FFFFFF',
        status: 'jogo',
        campeonatoId: jogo.campeonato_id
      }
    })

    const agendaItems: CalendarItem[] = agenda.map((event: any) => {
      const champ = event.campeonato_id ? championshipMap.get(event.campeonato_id) : null
      return {
        id: `agenda-${event.id}`,
        rawId: event.id,
        kind: 'agenda',
        title: event.titulo || event.nome || 'Tarefa',
        subtitle: [event.tipo_evento || event.tipo || 'Tarefa', champ?.nome].filter(Boolean).join(' • '),
        description: event.descricao || null,
        date: getAgendaDate(event),
        time: getAgendaTime(event),
        duration: event.duracao_minutos || event.duracao || 60,
        bgColor: event.cor_fundo || event.bg_color || event.cor || event.color || '#00a884',
        textColor: event.cor_texto || event.text_color || '#ffffff',
        status: event.status || event.tipo_evento || event.tipo || 'tarefa',
        campeonatoId: event.campeonato_id || null,
        equipeId: event.equipe_id || null
      }
    })

    setItems([...gameItems, ...agendaItems].sort((a, b) => (itemDate(a)?.getTime() || 0) - (itemDate(b)?.getTime() || 0)))
    setLoading(false)
  }, [cursorMonth])

  useEffect(() => { loadCalendar() }, [loadCalendar])

  const days = useMemo(() => buildMonthDays(cursorMonth), [cursorMonth])
  const stats = useMemo(() => {
    const games = items.filter((item) => item.kind === 'jogo').length
    return [
      { label: 'hoje', value: items.filter(isToday).length },
      { label: 'partidas', value: games },
      { label: 'tarefas', value: items.length - games }
    ]
  }, [items])

  const gridMetrics = useMemo(() => ({
    headerHeight: 21 * zoom,
    rowHeight: 12.1 * zoom,
    dayWidth: 31 * zoom,
    numWidth: 22 * zoom,
    slotFont: Math.max(5.4, 5.4 * zoom),
    dayFont: Math.max(7, 7 * zoom),
    headerFont: Math.max(7, 7 * zoom)
  }), [zoom])

  function handleGridMove(evt: any) {
    const distance = touchDistance(evt)
    if (!distance) return
    if (!pinchStartDistance.current) {
      pinchStartDistance.current = distance
      pinchStartZoom.current = zoom
      return
    }
    setZoom(clampZoom(pinchStartZoom.current * (distance / pinchStartDistance.current)))
  }

  function resetPinch() {
    pinchStartDistance.current = 0
    pinchStartZoom.current = zoom
  }

  function changeMonth(delta: number) {
    setCursorMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  function openDraft(date: string, time: string) {
    setDraft({ date, time })
    setTitle('')
    setDescription('')
    setDuration('60')
    setBgColor('#00a884')
    setTextColor('#ffffff')
  }

  async function saveTask() {
    if (!draft || !title.trim()) {
      Alert.alert('Tarefa', 'Digite o nome da tarefa.')
      return
    }
    if (!supabase) return
    setSaving(true)
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id || null
    if (!userId) {
      setSaving(false)
      Alert.alert('Login necessário', 'Entre na sua conta para criar tarefas no calendário.')
      return
    }
    const minutes = Math.max(15, Number(duration) || 60)
    const startIso = `${draft.date}T${draft.time}:00`
    const endIso = addMinutes(draft.date, draft.time, minutes)
    const basePayload = {
      titulo: title.trim(),
      descricao: description.trim() || null,
      data_evento: draft.date,
      dia_semana: weekdayText(draft.date),
      horario: draft.time,
      tipo_evento: 'manual',
      status: 'ativo',
      user_id: userId,
      criado_por: userId
    }
    const fullPayload: any = {
      ...basePayload,
      data_inicio: startIso,
      data_fim: endIso,
      duracao_minutos: minutes,
      duracao: minutes,
      duracao_slots: Math.max(1, Math.ceil(minutes / 60)),
      cor: bgColor,
      cor_fundo: bgColor,
      cor_texto: textColor,
      bg_color: bgColor,
      text_color: textColor,
      tipo: 'tarefa'
    }

    let errorMessage = ''
    let inserted = false
    const fullInsert = await supabase.from('agenda_eventos').insert(fullPayload).select('id').single()
    if (!fullInsert.error) {
      inserted = true
    } else {
      errorMessage = fullInsert.error.message || ''
      const safeInsert = await supabase.from('agenda_eventos').insert(basePayload as any).select('id').single()
      if (!safeInsert.error) {
        inserted = true
        if (errorMessage) {
          console.warn('agenda_eventos sem colunas extras; salvei com campos basicos:', errorMessage)
        }
      } else {
        errorMessage = safeInsert.error.message || errorMessage
      }
    }

    setSaving(false)
    if (!inserted) {
      Alert.alert('Erro ao salvar', errorMessage || 'Nao foi possivel salvar a tarefa. Confira a tabela agenda_eventos no Supabase.')
      return
    }
    setDraft(null)
    loadCalendar()
  }

  async function runSearch() {
    if (!supabase || query.trim().length < 2) return
    setSearching(true)
    const term = query.trim()
    const [{ data: campeonatos }, { data: equipes }, { data: jogadores }] = await Promise.all([
      supabase.from('campeonatos').select('id,nome,modalidade,status').ilike('nome', `%${term}%`).limit(8),
      supabase.from('equipes').select('id,nome,tag').or(`nome.ilike.%${term}%,tag.ilike.%${term}%`).limit(8),
      supabase.from('perfis_jogo').select('id,nick,funcao,servidor').or(`nick.ilike.%${term}%,uid_jogo.ilike.%${term}%`).limit(8)
    ])
    setSearchResults([
      ...(campeonatos || []).map((c: any) => ({ id: c.id, kind: 'campeonato' as const, title: c.nome, subtitle: c.modalidade || c.status })),
      ...(equipes || []).map((e: any) => ({ id: e.id, kind: 'equipe' as const, title: e.nome, subtitle: e.tag })),
      ...(jogadores || []).map((j: any) => ({ id: j.id, kind: 'jogador' as const, title: j.nick, subtitle: j.funcao || j.servidor }))
    ])
    setSearching(false)
  }

  function jumpToItem(item: CalendarItem) {
    const date = itemDate(item)
    if (date) setCursorMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setTasksOpen(false)
    setSelectedItem(item)
  }

  return <Screen scroll={false}>
    <SiteHeader eyebrow="CALENDARIO" title="Agenda de campeonatos" logo="C" subtitle="Grade mensal compacta com dias, horarios, jogos e tarefas." />
    <StatsStrip items={stats} />

    <View style={styles.toolbar}>
      <Pressable onPress={() => setTasksOpen(true)} style={[styles.toolBtn, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="list-outline" size={14} color={colors.primary}/><Tiny style={[styles.toolText, { color: colors.primary }]}>Tarefas</Tiny></Pressable>
      <Pressable onPress={() => setSearchOpen(true)} style={[styles.toolBtn, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="search-outline" size={14} color={colors.primary}/><Tiny style={[styles.toolText, { color: colors.primary }]}>Pesquisar</Tiny></Pressable>
    </View>

    <View style={styles.actionsRow}>
      <Pressable onPress={() => changeMonth(-1)} style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="chevron-back" size={14} color={colors.primary}/><Tiny style={[styles.navText, { color: colors.primary }]}>Mes anterior</Tiny></Pressable>
      <Body style={styles.monthTitle}>{monthName(cursorMonth)}</Body>
      <Pressable onPress={() => changeMonth(1)} style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]}><Tiny style={[styles.navText, { color: colors.primary }]}>Proximo mes</Tiny><Ionicons name="chevron-forward" size={14} color={colors.primary}/></Pressable>
    </View>

    {loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 2 }} /> : null}

    <View
      style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onStartShouldSetResponder={(evt) => (evt?.nativeEvent?.touches?.length || 0) >= 2}
      onMoveShouldSetResponder={(evt) => (evt?.nativeEvent?.touches?.length || 0) >= 2}
      onResponderMove={handleGridMove}
      onResponderRelease={resetPinch}
      onResponderTerminate={resetPinch}
    >
        <View style={[styles.headerRow, { height: gridMetrics.headerHeight, backgroundColor: colors.panel2 }]}>
          <View style={[styles.dayCol, styles.headerCell, { width: gridMetrics.dayWidth, backgroundColor: colors.panel2, borderRightColor: colors.borderSoft }]}><Tiny style={[styles.headerText, { fontSize: gridMetrics.headerFont, color: colors.text }]}>DIA</Tiny></View>
          <View style={[styles.numCol, styles.headerCell, { width: gridMetrics.numWidth, backgroundColor: colors.panel2, borderRightColor: colors.borderSoft }]}><Tiny style={[styles.headerText, { fontSize: gridMetrics.headerFont, color: colors.text }]}>N°</Tiny></View>
          {baseHours.map((hour) => <View key={hour} style={[styles.hourCol, styles.headerCell, { backgroundColor: colors.panel2, borderRightColor: colors.borderSoft }]}><Tiny style={[styles.headerText, { fontSize: gridMetrics.headerFont, color: colors.text }]}>{hour}</Tiny></View>)}
        </View>
        {days.map((day) => {
          const rendered: any[] = []
          let index = 0
          while (index < baseHours.length) {
            const hour = baseHours[index]
            const startingItems = items.filter((item) => itemStartsAtSlot(item, day.iso, hour))
            const coveringItems = items.filter((item) => itemCoversSlot(item, day.iso, hour))
            const main = startingItems[0]
            if (main) {
              const span = itemSpanSlots(main, day.iso, index)
              rendered.push(
                <Pressable
                  key={`${day.iso}-${hour}-event-${main.id}`}
                  onPress={() => setSelectedItem(main)}
                  style={[styles.hourCol, styles.mergedEventCell, { flex: span, backgroundColor: main.bgColor || colors.primary }]}
                >
                  <Tiny numberOfLines={1} style={[styles.slotText, { fontSize: gridMetrics.slotFont, color: main.textColor || '#fff', fontWeight: '900' }]}>{main.title}</Tiny>
                  <Tiny numberOfLines={1} style={[styles.mergedDuration, { color: main.textColor || '#fff' }]}>{main.duration || 60} min</Tiny>
                  {coveringItems.length > 1 ? <Tiny style={[styles.moreText, { color: main?.textColor || '#fff' }]}>+{coveringItems.length - 1}</Tiny> : null}
                </Pressable>
              )
              index += span
              continue
            }
            if (coveringItems.length) {
              index += 1
              continue
            }
            rendered.push(
              <Pressable
                key={`${day.iso}-${hour}`}
                onPress={() => openDraft(day.iso, hour)}
                style={[styles.hourCol, { borderRightColor: colors.borderSoft, backgroundColor: day.date.getDay() === 0 ? colors.panel2 : colors.card }]}
              >
                <Tiny numberOfLines={1} style={[styles.slotText, { fontSize: gridMetrics.slotFont, color: colors.muted2 }]}>{hour}</Tiny>
              </Pressable>
            )
            index += 1
          }
          return (
            <View key={day.iso} style={[styles.gridRow, { height: gridMetrics.rowHeight, borderTopColor: colors.borderSoft, backgroundColor: day.date.getDay() === 0 ? colors.panel2 : colors.card }]}>
              <View style={[styles.dayCol, styles.dayCell, { width: gridMetrics.dayWidth, backgroundColor: day.date.getDay() === 0 ? colors.panel2 : colors.card2, borderRightColor: colors.borderSoft }]}><Tiny style={[styles.dayText, { fontSize: gridMetrics.dayFont, color: colors.text }]}>{day.week}</Tiny></View>
              <View style={[styles.numCol, styles.dayCell, { width: gridMetrics.numWidth, backgroundColor: day.date.getDay() === 0 ? colors.panel2 : colors.card2, borderRightColor: colors.borderSoft }]}><Tiny style={[styles.dayText, { fontSize: gridMetrics.dayFont, color: colors.text }]}>{day.day}</Tiny></View>
              {rendered}
            </View>
          )
        })}
    </View>

    <Modal visible={tasksOpen} transparent animationType="slide" onRequestClose={() => setTasksOpen(false)}>
      <View style={styles.modalWrap}>
        <Pressable style={styles.overlay} onPress={() => setTasksOpen(false)} />
        <Card style={[styles.sheet, { borderColor: colors.primary }]}>
          <View style={styles.sheetHead}><Body style={styles.sheetTitle}>Lista de tarefas e jogos</Body><Pressable onPress={() => setTasksOpen(false)}><Ionicons name="close" size={22} color={colors.text}/></Pressable></View>
          <ScrollView style={{ maxHeight: 420 }}>
            {!items.length ? <Subtitle>Nenhuma tarefa ou jogo neste mes.</Subtitle> : null}
            {items.map((item) => <Pressable key={item.id} onPress={() => jumpToItem(item)} style={[styles.taskRow, { borderBottomColor: colors.borderSoft }]}>
              <View style={[styles.taskColor, { backgroundColor: item.bgColor || colors.primary }]} />
              <View style={{ flex: 1 }}><Body style={styles.taskTitle}>{item.title}</Body><Tiny>{dateText(item)} • {timeText(item)} • {item.duration || 60} min</Tiny></View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>)}
          </ScrollView>
          <Button label="Criar tarefa agora" onPress={() => { setTasksOpen(false); openDraft(isoDate(new Date()), '20:00') }} />
        </Card>
      </View>
    </Modal>

    <Modal visible={searchOpen} transparent animationType="slide" onRequestClose={() => setSearchOpen(false)}>
      <View style={styles.modalWrap}>
        <Pressable style={styles.overlay} onPress={() => setSearchOpen(false)} />
        <Card style={[styles.sheet, { borderColor: colors.primary }]}>
          <View style={styles.sheetHead}><Body style={styles.sheetTitle}>Pesquisar</Body><Pressable onPress={() => setSearchOpen(false)}><Ionicons name="close" size={22} color={colors.text}/></Pressable></View>
          <View style={styles.searchRow}><Input value={query} onChangeText={setQuery} placeholder="Campeonato, equipe ou jogador" style={{ flex: 1 }} /><Pressable onPress={runSearch} style={[styles.searchBtn, { backgroundColor: colors.primary }]}>{searching ? <ActivityIndicator size="small" color={colors.bg} /> : <Ionicons name="search" size={18} color={colors.bg} />}</Pressable></View>
          {searchResults.map((result) => <View key={`${result.kind}-${result.id}`} style={[styles.resultRow, { borderBottomColor: colors.borderSoft }]}><Body style={styles.taskTitle}>{result.title}</Body><Tiny>{result.kind.toUpperCase()} {result.subtitle ? `• ${result.subtitle}` : ''}</Tiny></View>)}
          <Tiny>Ao selecionar um item, a agenda abaixo continua mostrando as tarefas/jogos vinculados automaticamente pelo banco.</Tiny>
        </Card>
      </View>
    </Modal>

    <Modal visible={!!selectedItem} transparent animationType="fade" onRequestClose={() => setSelectedItem(null)}>
      <View style={styles.modalWrap}>
        <Pressable style={styles.overlay} onPress={() => setSelectedItem(null)} />
        <Card style={[styles.formCard, { borderColor: colors.primary }]}>
          <View style={styles.sheetHead}><Body style={styles.sheetTitle}>{selectedItem?.title}</Body><Pressable onPress={() => setSelectedItem(null)}><Ionicons name="close" size={22} color={colors.text}/></Pressable></View>
          <Tiny>{selectedItem ? `${dateText(selectedItem)} • ${timeText(selectedItem)} • ${selectedItem.duration || 60} min` : ''}</Tiny>
          <Subtitle>{selectedItem?.subtitle}</Subtitle>
          {selectedItem?.description ? <Body>{selectedItem.description}</Body> : null}
          <View style={styles.infoBadge}><Tiny style={{ color: selectedItem?.textColor || '#fff' }}>{selectedItem?.status || selectedItem?.kind}</Tiny></View>
        </Card>
      </View>
    </Modal>

    <Modal visible={!!draft} transparent animationType="fade" onRequestClose={() => setDraft(null)}>
      <View style={styles.modalWrap}>
        <Pressable style={styles.overlay} onPress={() => setDraft(null)} />
        <Card style={[styles.formCard, { borderColor: colors.primary }]}>
          <Body style={styles.sheetTitle}>Nova tarefa</Body>
          <Tiny>{draft?.date} • {draft?.time}</Tiny>
          <Input value={title} onChangeText={setTitle} placeholder="Nome da tarefa" />
          <Input value={description} onChangeText={setDescription} placeholder="Descricao completa" multiline style={{ minHeight: 72, textAlignVertical: 'top' }} />

          <Tiny style={[styles.pickerLabel, { color: colors.text }]}>Cor do fundo</Tiny>
          <View style={styles.paletteRow}>
            {bgPalette.map((color) => (
              <Pressable key={color.value} onPress={() => setBgColor(color.value)} style={[styles.colorOption, { backgroundColor: colors.card, borderColor: colors.border }, bgColor === color.value && { borderColor: colors.primary, backgroundColor: colors.panel2 }]}>
                <View style={[styles.colorDot, { backgroundColor: color.value }]} />
                <Tiny style={[styles.colorLabel, { color: colors.text }]}>{color.label}</Tiny>
              </Pressable>
            ))}
          </View>

          <Tiny style={[styles.pickerLabel, { color: colors.text }]}>Cor do texto</Tiny>
          <View style={styles.paletteRow}>
            {textPalette.map((color) => (
              <Pressable key={color.value} onPress={() => setTextColor(color.value)} style={[styles.colorOption, { backgroundColor: colors.card, borderColor: colors.border }, textColor === color.value && { borderColor: colors.primary, backgroundColor: colors.panel2 }]}>
                <View style={[styles.colorDot, { backgroundColor: color.value }]} />
                <Tiny style={[styles.colorLabel, { color: colors.text }]}>{color.label}</Tiny>
              </Pressable>
            ))}
          </View>

          <Tiny style={[styles.pickerLabel, { color: colors.text }]}>Duracao</Tiny>
          <View style={styles.durationRow}>
            {durationOptions.map((minutes) => (
              <Pressable key={minutes} onPress={() => setDuration(String(minutes))} style={[styles.durationChip, { backgroundColor: colors.card, borderColor: colors.border }, duration === String(minutes) && { borderColor: colors.primary, backgroundColor: colors.primary }]}>
                <Tiny style={[styles.durationText, { color: colors.text }, duration === String(minutes) && { color: colors.bg }]}>{minutes} min</Tiny>
              </Pressable>
            ))}
          </View>
          <TextInput value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="Outra duração em minutos" placeholderTextColor={colors.muted} style={[styles.nativeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />

          <View style={[styles.previewBox, { backgroundColor: bgColor }]}>
            <Body numberOfLines={1} style={{ color: textColor, fontWeight: '900' }}>{title || 'Previa da tarefa'}</Body>
            <Tiny style={{ color: textColor }}>{duration || 60} min</Tiny>
          </View>

          <Button label={saving ? 'Salvando...' : 'Adicionar ao calendario'} onPress={saveTask} />
          <Button label="Cancelar" variant="ghost" onPress={() => setDraft(null)} />
        </Card>
      </View>
    </Modal>
  </Screen>
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 8 },
  toolBtn: { flex: 1, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 5, backgroundColor: colors.card },
  toolText: { color: colors.primary, fontWeight: '900', letterSpacing: 0.7 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtn: { height: 34, minWidth: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderColor: colors.border, borderRadius: 5, backgroundColor: colors.card },
  navText: { color: colors.primary, fontSize: 8.5, letterSpacing: 0.7 },
  monthTitle: { flex: 1, textAlign: 'center', fontWeight: '900', fontSize: 13, letterSpacing: 2 },
  gridCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.card },
  headerRow: { flexDirection: 'row', height: 21, backgroundColor: colors.panel2 },
  gridRow: { flexDirection: 'row', height: 12.1, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  dayCol: { width: 31, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.borderSoft },
  numCol: { width: 22, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.borderSoft },
  hourCol: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.borderSoft, position: 'relative', paddingHorizontal: 1 },
  headerCell: { backgroundColor: colors.panel2 },
  headerText: { fontSize: 7, color: colors.text, fontWeight: '900' },
  dayCell: { backgroundColor: '#F1F5F9' },
  sunday: { backgroundColor: '#CBD5E1' },
  sundayRow: { backgroundColor: '#E2E8F0' },
  sundayHour: { backgroundColor: '#E5E7EB' },
  dayText: { fontSize: 7, color: colors.text, fontWeight: '700' },
  slotText: { fontSize: 5.4, color: colors.muted2 },
  mergedEventCell: { borderRadius: 2, marginHorizontal: 0, overflow: 'hidden' },
  mergedDuration: { fontSize: 4.8, fontWeight: '800' },
  moreText: { position: 'absolute', right: 1, bottom: 0, fontSize: 5, fontWeight: '900' },
  modalWrap: { flex: 1, justifyContent: 'flex-end', padding: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { maxHeight: '82%', gap: 8, borderColor: colors.primary },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sheetTitle: { fontWeight: '900', textTransform: 'uppercase' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  taskColor: { width: 7, height: 28, borderRadius: 3 },
  taskTitle: { fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBtn: { width: 44, height: 44, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  resultRow: { minHeight: 42, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, justifyContent: 'center' },
  formCard: { gap: 8, borderColor: colors.primary, maxHeight: '88%' },
  pickerLabel: { fontWeight: '900', color: colors.text, marginTop: 2 },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colorOption: { minWidth: 76, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 7, backgroundColor: colors.card },
  colorOptionActive: { borderColor: colors.primary, backgroundColor: colors.panel2 },
  colorDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  colorLabel: { fontWeight: '800', color: colors.text, fontSize: 8 },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  durationChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.card },
  durationChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  durationText: { color: colors.text, fontWeight: '800' },
  durationTextActive: { color: '#fff' },
  nativeInput: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, color: colors.text, backgroundColor: colors.card },
  previewBox: { borderRadius: 8, padding: 10, gap: 2 },
  infoBadge: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }
})
