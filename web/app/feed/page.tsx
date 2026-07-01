'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Heart,
  Home,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Repeat2,
  Send,
  Share2,
  Swords,
  Target,
  Ticket,
  Trophy,
  Upload,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { usePerfil } from '../contexts/PerfilContext'
import { getCampeonatoHref } from '../campeonatos/utils/getCampeonatoHref'

type Story = {
  id: string
  user_id?: string | null
  equipe_id?: string | null
  produtora_id?: string | null
  tipo?: string | null
  media_url?: string | null
  descricao?: string | null
  created_at?: string | null
  expires_at?: string | null
}

type StoryAuthor = {
  nome: string
  foto?: string | null
  href?: string | null
}

type StoryStat = {
  likes: number
  comments: number
  reposts: number
  views: number
  liked: boolean
  reposted: boolean
  viewed: boolean
}

type HighlightSection = 'today' | 'team' | 'open' | 'results'

type HighlightCard = {
  id: string
  section: HighlightSection
  title: string
  subtitle: string
  image?: string | null
  href: string
  cta: string
  rows?: Array<{
    label: string
    value: string
    image?: string | null
    matches?: number
    booyahs?: number
    kills?: number
    points?: number
  }>
}

const emptyStat: StoryStat = {
  likes: 0,
  comments: 0,
  reposts: 0,
  views: 0,
  liked: false,
  reposted: false,
  viewed: false,
}

const sectionMeta: Record<
  HighlightSection,
  { title: string; subtitle: string; icon: typeof CalendarDays; color: string }
> = {
  today: {
    title: 'Para hoje',
    subtitle: 'Jogos, prazos e vagas que exigem atenção agora',
    icon: CalendarDays,
    color: '#2563EB',
  },
  team: {
    title: 'Minha equipe',
    subtitle: 'Lines e atalhos para ajustar a escalação',
    icon: Users,
    color: '#7C3AED',
  },
  open: {
    title: 'Vagas abertas',
    subtitle: 'Campeonatos que ainda aceitam inscrições',
    icon: Ticket,
    color: '#F59E0B',
  },
  results: {
    title: 'Resultados recentes',
    subtitle: 'Prévias das últimas súmulas atualizadas',
    icon: Trophy,
    color: '#16A34A',
  },
}

function relationOne(value: any) {
  return Array.isArray(value) ? value[0] : value
}

function createUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16)
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16)
  })
}

function authorKey(story: Story) {
  if (story.equipe_id) return `equipe:${story.equipe_id}`
  if (story.produtora_id) return `produtora:${story.produtora_id}`
  if (story.user_id) return `usuario:${story.user_id}`
  return 'usuario:dropzone'
}

function storyTimeLeft(expiresAt?: string | null) {
  const diff = expiresAt ? new Date(expiresAt).getTime() - Date.now() : 24 * 60 * 60 * 1000
  if (diff <= 0) return 'expirado'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(1, minutes)}m`
}

function imageUrl(value?: string | null, bucket = 'post-images') {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  const { data } = supabase.storage.from(bucket).getPublicUrl(value.replace(/^\/+/, ''))
  return data.publicUrl
}

function uniquePath(userId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  return `stories/${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`
}

export default function Feed() {
  const { perfilAtivo, tipoPerfil, user, loading: loadingPerfil } = usePerfil()
  const [stories, setStories] = useState<Story[]>([])
  const [authors, setAuthors] = useState<Record<string, StoryAuthor>>({})
  const [stats, setStats] = useState<Record<string, StoryStat>>({})
  const [highlights, setHighlights] = useState<HighlightCard[]>([])
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingStories, setLoadingStories] = useState(true)
  const [loadingHighlights, setLoadingHighlights] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [storyText, setStoryText] = useState('')
  const [storyFile, setStoryFile] = useState<File | null>(null)
  const [storyPreview, setStoryPreview] = useState<string | null>(null)

  const storyIds = useMemo(() => stories.map((story) => story.id), [stories])
  const storyGroups = useMemo(() => {
    const grouped = new Map<string, Story[]>()
    stories.forEach((story) => {
      const key = authorKey(story)
      grouped.set(key, [...(grouped.get(key) || []), story])
    })
    return Array.from(grouped.entries()).map(([key, items]) => ({
      key,
      stories: [...items].sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      ),
    }))
  }, [stories])
  const viewerStories = useMemo(() => storyGroups.flatMap((group) => group.stories), [storyGroups])
  const selectedIndex = selectedStory
    ? viewerStories.findIndex((story) => story.id === selectedStory.id)
    : -1
  const selectedAuthor = selectedStory
    ? authors[authorKey(selectedStory)] || { nome: selectedStory.tipo || 'Drop Zone' }
    : null
  const selectedStat = selectedStory ? stats[selectedStory.id] || emptyStat : emptyStat

  const loadStories = useCallback(async () => {
    setLoadingStories(true)
    const now = new Date().toISOString()
    const { data, error } = await (supabase as any)
      .from('stories')
      .select('id,user_id,equipe_id,produtora_id,tipo,media_url,descricao,created_at,expires_at')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(80)

    if (error) {
      console.error('Erro ao carregar stories:', error)
      setStories([])
    } else {
      setStories((data || []) as Story[])
    }
    setLoadingStories(false)
  }, [])

  const loadHighlights = useCallback(async () => {
    setLoadingHighlights(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const [champResult, agendaResult, resultsResult] = await Promise.all([
        (supabase as any)
          .from('campeonatos')
          .select(
            'id,nome,logo_url,banner_url,status,vagas,quantidade_equipes,valor_vaga,data_inicio,data_encerramento_inscricoes,horario_inicio,tipo_competicao,modelo_competicao,created_at'
          )
          .order('created_at', { ascending: false })
          .limit(50),
        (supabase as any)
          .from('agenda_eventos')
          .select('id,titulo,data_evento,horario,campeonato_id,campeonatos(nome,logo_url,banner_url,tipo_competicao,modelo_competicao)')
          .eq('data_evento', today)
          .order('horario', { ascending: true })
          .limit(5),
        (supabase as any)
          .from('resultados_jogos')
          .select('id,campeonato_id,jogo_id,equipe_id,posicao,abates,total_pontos,updated_at')
          .order('updated_at', { ascending: false })
          .limit(40),
      ])

      const cards: HighlightCard[] = []
      const champs = champResult.data || []
      const champIds = champs.map((champ: any) => String(champ.id))
      const registrations = champIds.length
        ? await (supabase as any)
            .from('campeonato_equipes')
            .select('id,campeonato_id')
            .in('campeonato_id', champIds)
        : { data: [] }
      const occupied = new Map<string, number>()
      ;(registrations.data || []).forEach((row: any) => {
        const id = String(row.campeonato_id)
        occupied.set(id, (occupied.get(id) || 0) + 1)
      })

      const openChamps = champs.filter((champ: any) => {
        const status = String(champ.status || '').toLowerCase()
        const capacity = Number(champ.vagas || champ.quantidade_equipes || 0)
        return capacity > (occupied.get(String(champ.id)) || 0) && !status.includes('final') && !status.includes('cancel')
      })

      ;(agendaResult.data || []).slice(0, 3).forEach((event: any) => {
        const champ = relationOne(event.campeonatos)
        cards.push({
          id: `agenda:${event.id}`,
          section: 'today',
          title: event.titulo || champ?.nome || 'Evento de hoje',
          subtitle: `${event.horario ? String(event.horario).slice(0, 5) : 'Hoje'} • ${champ?.nome || 'Agenda'}`,
          image: champ?.banner_url || champ?.logo_url || null,
          href: event.campeonato_id
            ? getCampeonatoHref(event.campeonato_id, champ?.tipo_competicao || champ?.modelo_competicao)
            : '/calendario',
          cta: 'Abrir',
        })
      })

      openChamps
        .filter(
          (champ: any) =>
            String(champ.data_inicio || '').slice(0, 10) === today ||
            String(champ.data_encerramento_inscricoes || '').slice(0, 10) === today
        )
        .slice(0, 3)
        .forEach((champ: any) => {
          const capacity = Number(champ.vagas || champ.quantidade_equipes || 0)
          const left = Math.max(0, capacity - (occupied.get(String(champ.id)) || 0))
          cards.push({
            id: `today:${champ.id}`,
            section: 'today',
            title: champ.nome,
            subtitle: `${left} vagas restantes • ${champ.horario_inicio ? String(champ.horario_inicio).slice(0, 5) : 'hoje'}`,
            image: champ.banner_url || champ.logo_url,
            href: getCampeonatoHref(champ.id, champ.tipo_competicao || champ.modelo_competicao),
            cta: 'Inscrever',
          })
        })

      openChamps.slice(0, 5).forEach((champ: any) => {
        const capacity = Number(champ.vagas || champ.quantidade_equipes || 0)
        const left = Math.max(0, capacity - (occupied.get(String(champ.id)) || 0))
        cards.push({
          id: `open:${champ.id}`,
          section: 'open',
          title: champ.nome,
          subtitle: `${left} de ${capacity} vagas • ${
            Number(champ.valor_vaga || 0) > 0
              ? Number(champ.valor_vaga).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : 'grátis'
          }`,
          image: champ.banner_url || champ.logo_url,
          href: getCampeonatoHref(champ.id, champ.tipo_competicao || champ.modelo_competicao),
          cta: 'Ver vaga',
        })
      })

      const latestResults = resultsResult.data || []
      const resultChampIds = Array.from(
        new Set(latestResults.map((row: any) => String(row.campeonato_id)))
      ).slice(0, 3) as string[]
      const resultEntryIds = Array.from(
        new Set(
          latestResults
            .filter((row: any) => resultChampIds.includes(String(row.campeonato_id)))
            .map((row: any) => String(row.equipe_id))
        )
      ) as string[]
      const entries = resultEntryIds.length
        ? await (supabase as any)
            .from('campeonato_equipes')
            .select('id,nome_exibicao,equipes(nome,tag,logo_url)')
            .in('id', resultEntryIds)
        : { data: [] }
      const entryById = new Map((entries.data || []).map((entry: any) => [String(entry.id), entry]))

      resultChampIds.forEach((championshipId) => {
        const champ = champs.find((item: any) => String(item.id) === championshipId)
        const accumulated = new Map<
          string,
          { matches: Set<string>; booyahs: number; kills: number; points: number }
        >()
        latestResults
          .filter((row: any) => String(row.campeonato_id) === championshipId)
          .forEach((row: any) => {
            const entryId = String(row.equipe_id)
            const current = accumulated.get(entryId) || {
              matches: new Set<string>(),
              booyahs: 0,
              kills: 0,
              points: 0,
            }
            current.matches.add(String(row.jogo_id || row.id))
            current.booyahs += Number(row.posicao) === 1 ? 1 : 0
            current.kills += Number(row.abates || 0)
            current.points += Number(row.total_pontos || 0)
            accumulated.set(entryId, current)
          })

        const rows = Array.from(accumulated.entries())
          .map(([entryId, totals]) => {
            const entry: any = entryById.get(entryId)
            const team = relationOne(entry?.equipes)
            return {
              label: entry?.nome_exibicao || team?.tag || team?.nome || 'Equipe',
              value: `${totals.points} pts`,
              image: team?.logo_url || null,
              matches: totals.matches.size,
              booyahs: totals.booyahs,
              kills: totals.kills,
              points: totals.points,
            }
          })
          .sort((a, b) => b.points - a.points || b.booyahs - a.booyahs || b.kills - a.kills)
          .slice(0, 4)

        if (rows.length) {
          cards.push({
            id: `result:${championshipId}`,
            section: 'results',
            title: champ?.nome || 'Resultado recente',
            subtitle: 'Prévia da última atualização',
            image: champ?.logo_url || champ?.banner_url || rows[0]?.image,
            href: champ
              ? getCampeonatoHref(champ.id, champ.tipo_competicao || champ.modelo_competicao)
              : '/campeonatos',
            cta: 'Ver resultado',
            rows,
          })
        }
      })

      if (user?.id) {
        const [ownedResult, membershipResult] = await Promise.all([
          (supabase as any).from('equipes').select('id,nome,tag,logo_url').eq('criado_por', user.id),
          (supabase as any)
            .from('membros_equipe')
            .select('equipe_id')
            .eq('user_id', user.id)
            .eq('ativo', true),
        ])
        const memberIds = (membershipResult.data || []).map((row: any) => String(row.equipe_id))
        const memberTeams = memberIds.length
          ? await (supabase as any).from('equipes').select('id,nome,tag,logo_url').in('id', memberIds)
          : { data: [] }
        const teamMap = new Map<string, any>()
        ;[...(ownedResult.data || []), ...(memberTeams.data || [])].forEach((team: any) =>
          teamMap.set(String(team.id), team)
        )
        const teams = Array.from(teamMap.values())
        const teamIds = teams.map((team) => String(team.id))
        const linesResult = teamIds.length
          ? await (supabase as any)
              .from('lines')
              .select('id,nome,equipe_id')
              .in('equipe_id', teamIds)
              .eq('ativa', true)
          : { data: [] }
        const lineIds = (linesResult.data || []).map((line: any) => String(line.id))
        const playersResult = lineIds.length
          ? await (supabase as any)
              .from('lines_jogadores')
              .select('line_id,removido_em')
              .in('line_id', lineIds)
              .is('removido_em', null)
          : { data: [] }

        teams.slice(0, 3).forEach((team: any) => {
          const teamLines = (linesResult.data || []).filter(
            (line: any) => String(line.equipe_id) === String(team.id)
          )
          cards.push({
            id: `team:${team.id}`,
            section: 'team',
            title: team.tag || team.nome || 'Minha equipe',
            subtitle: `${teamLines.length} lines • gerencie sua escalação`,
            image: team.logo_url,
            href: `/equipe/${team.id}`,
            cta: 'Abrir elenco',
            rows: teamLines.slice(0, 3).map((line: any) => ({
              label: line.nome || 'Line principal',
              value: `${
                (playersResult.data || []).filter(
                  (row: any) => String(row.line_id) === String(line.id)
                ).length
              } jogadores`,
            })),
          })
        })
      }

      setHighlights(cards)
    } catch (error) {
      console.error('Erro ao carregar destaques:', error)
      setHighlights([])
    } finally {
      setLoadingHighlights(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!loadingPerfil) {
      loadStories()
      loadHighlights()
    }
  }, [loadHighlights, loadStories, loadingPerfil])

  useEffect(() => {
    if (!stories.length) {
      setAuthors({})
      setStats({})
      return
    }

    let active = true
    async function loadStoryDetails() {
      const users = Array.from(new Set(stories.map((story) => story.user_id).filter(Boolean))) as string[]
      const teams = Array.from(new Set(stories.map((story) => story.equipe_id).filter(Boolean))) as string[]
      const producers = Array.from(new Set(stories.map((story) => story.produtora_id).filter(Boolean))) as string[]
      const [profiles, gamers, teamRows, producerRows, likes, storyComments, reposts, views] =
        await Promise.all([
          users.length
            ? (supabase as any)
                .from('profiles')
                .select('id,username,nome_exibicao,foto_url')
                .in('id', users)
            : Promise.resolve({ data: [] }),
          users.length
            ? (supabase as any)
                .from('perfis_jogo')
                .select('id,user_id,nick,foto_capa,ativo,updated_at')
                .in('user_id', users)
                .eq('ativo', true)
                .order('updated_at', { ascending: false })
            : Promise.resolve({ data: [] }),
          teams.length
            ? (supabase as any).from('equipes').select('id,nome,tag,logo_url').in('id', teams)
            : Promise.resolve({ data: [] }),
          producers.length
            ? (supabase as any).from('produtoras').select('id,nome,logo_url').in('id', producers)
            : Promise.resolve({ data: [] }),
          (supabase as any).from('story_curtidas').select('story_id,user_id').in('story_id', storyIds),
          (supabase as any).from('story_comentarios').select('story_id').in('story_id', storyIds),
          (supabase as any).from('story_reposts').select('story_id,user_id').in('story_id', storyIds),
          (supabase as any).from('story_visualizacoes').select('story_id,user_id').in('story_id', storyIds),
        ])

      if (!active) return
      const nextAuthors: Record<string, StoryAuthor> = {}
      const gamerByUser = new Map<string, any>()
      ;(gamers.data || []).forEach((item: any) => {
        if (item.user_id && !gamerByUser.has(String(item.user_id))) gamerByUser.set(String(item.user_id), item)
      })
      ;(profiles.data || []).forEach((profile: any) => {
        const gamer = gamerByUser.get(String(profile.id))
        nextAuthors[`usuario:${profile.id}`] = {
          nome: profile.nome_exibicao || profile.username || gamer?.nick || 'Usuário',
          foto: profile.foto_url || gamer?.foto_capa || null,
          href: gamer?.id ? `/jogadores/${gamer.id}` : '/perfil',
        }
      })
      ;(gamers.data || []).forEach((gamer: any) => {
        const key = `usuario:${gamer.user_id}`
        if (!nextAuthors[key]) {
          nextAuthors[key] = {
            nome: gamer.nick || 'Jogador',
            foto: gamer.foto_capa,
            href: `/jogadores/${gamer.id}`,
          }
        }
      })
      ;(teamRows.data || []).forEach((team: any) => {
        nextAuthors[`equipe:${team.id}`] = {
          nome: team.tag || team.nome || 'Equipe',
          foto: team.logo_url,
          href: `/equipe/${team.id}`,
        }
      })
      ;(producerRows.data || []).forEach((producer: any) => {
        nextAuthors[`produtora:${producer.id}`] = {
          nome: producer.nome || 'Produtora',
          foto: producer.logo_url,
          href: `/produtora/${producer.id}`,
        }
      })
      setAuthors(nextAuthors)

      const nextStats: Record<string, StoryStat> = {}
      storyIds.forEach((id) => {
        nextStats[id] = { ...emptyStat }
      })
      ;(likes.data || []).forEach((row: any) => {
        const id = String(row.story_id)
        if (!nextStats[id]) return
        nextStats[id].likes += 1
        if (row.user_id === user?.id) nextStats[id].liked = true
      })
      ;(storyComments.data || []).forEach((row: any) => {
        const id = String(row.story_id)
        if (nextStats[id]) nextStats[id].comments += 1
      })
      ;(reposts.data || []).forEach((row: any) => {
        const id = String(row.story_id)
        if (!nextStats[id]) return
        nextStats[id].reposts += 1
        if (row.user_id === user?.id) nextStats[id].reposted = true
      })
      ;(views.data || []).forEach((row: any) => {
        const id = String(row.story_id)
        if (!nextStats[id]) return
        nextStats[id].views += 1
        if (row.user_id === user?.id) nextStats[id].viewed = true
      })
      setStats(nextStats)
    }

    loadStoryDetails()
    return () => {
      active = false
    }
  }, [stories, storyIds, user?.id])

  useEffect(() => {
    if (!selectedStory) {
      setComments([])
      return
    }
    ;(supabase as any)
      .from('story_comentarios')
      .select('id,user_id,comentario,created_at')
      .eq('story_id', selectedStory.id)
      .order('created_at')
      .then(({ data }: any) => setComments(data || []))
  }, [selectedStory, selectedStat.comments])

  useEffect(() => {
    if (!selectedStory || selectedIndex < 0) return
    const timer = window.setTimeout(() => {
      const next = viewerStories[selectedIndex + 1]
      setSelectedStory(next || null)
    }, 7000)
    return () => window.clearTimeout(timer)
  }, [selectedIndex, selectedStory, viewerStories])

  useEffect(() => {
    if (!selectedStory || !user?.id || selectedStory.user_id === user.id || selectedIndex < 0) return
    ;(supabase as any)
      .from('story_visualizacoes')
      .upsert(
        { id: createUuid(), story_id: selectedStory.id, user_id: user.id },
        { onConflict: 'story_id,user_id', ignoreDuplicates: true }
      )
      .then(({ error }: any) => {
        if (error) return
        setStats((current) => ({
          ...current,
          [selectedStory.id]: {
            ...(current[selectedStory.id] || emptyStat),
            viewed: true,
            views:
              (current[selectedStory.id]?.views || 0) +
              (current[selectedStory.id]?.viewed ? 0 : 1),
          },
        }))
      })
  }, [selectedIndex, selectedStory, user?.id])

  function requireUser() {
    if (user) return true
    alert('Faça login para interagir com os stories.')
    return false
  }

  async function toggleLike(storyId: string) {
    if (!requireUser() || saving) return
    const current = stats[storyId] || emptyStat
    setSaving(`like:${storyId}`)
    const { error } = current.liked
      ? await (supabase as any)
          .from('story_curtidas')
          .delete()
          .eq('story_id', storyId)
          .eq('user_id', user!.id)
      : await (supabase as any)
          .from('story_curtidas')
          .upsert(
            { id: createUuid(), story_id: storyId, user_id: user!.id },
            { onConflict: 'story_id,user_id', ignoreDuplicates: true }
          )
    setSaving(null)
    if (error) return alert(error.message)
    setStats((previous) => ({
      ...previous,
      [storyId]: {
        ...(previous[storyId] || emptyStat),
        liked: !current.liked,
        likes: Math.max(0, (previous[storyId]?.likes || 0) + (current.liked ? -1 : 1)),
      },
    }))
  }

  async function sendComment() {
    if (!selectedStory || !commentText.trim() || !requireUser() || saving) return
    setSaving(`comment:${selectedStory.id}`)
    const { error } = await (supabase as any).from('story_comentarios').insert({
      id: createUuid(),
      story_id: selectedStory.id,
      user_id: user!.id,
      comentario: commentText.trim(),
    })
    setSaving(null)
    if (error) return alert(error.message)
    setCommentText('')
    setStats((previous) => ({
      ...previous,
      [selectedStory.id]: {
        ...(previous[selectedStory.id] || emptyStat),
        comments: (previous[selectedStory.id]?.comments || 0) + 1,
      },
    }))
  }

  async function repostStory(story: Story) {
    if (!requireUser() || saving || stats[story.id]?.reposted) return
    setSaving(`repost:${story.id}`)
    const { error } = await (supabase as any)
      .from('story_reposts')
      .upsert({ story_id: story.id, user_id: user!.id }, { onConflict: 'story_id,user_id' })
    if (!error) {
      await (supabase as any).from('stories').insert({
        user_id: user!.id,
        tipo: 'usuario',
        media_url: story.media_url || null,
        descricao: story.descricao || '',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
    }
    setSaving(null)
    if (error) return alert(error.message)
    setStats((previous) => ({
      ...previous,
      [story.id]: {
        ...(previous[story.id] || emptyStat),
        reposted: true,
        reposts: (previous[story.id]?.reposts || 0) + 1,
      },
    }))
    await loadStories()
  }

  async function shareStory(story: Story) {
    const text = [story.descricao, imageUrl(story.media_url)].filter(Boolean).join('\n\n')
    if (navigator.share) {
      await navigator.share({ title: 'Story no Drop Zone', text })
      return
    }
    await navigator.clipboard.writeText(text)
    alert('Link do story copiado.')
  }

  function onStoryFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null
    setStoryFile(file)
    if (storyPreview) URL.revokeObjectURL(storyPreview)
    setStoryPreview(file ? URL.createObjectURL(file) : null)
  }

  async function publishStory() {
    if (!requireUser() || saving || (!storyFile && !storyText.trim())) return
    setSaving('publish')
    try {
      let mediaUrl: string | null = null
      if (storyFile) {
        const path = uniquePath(user!.id, storyFile)
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(path, storyFile, { contentType: storyFile.type || undefined, upsert: false })
        if (uploadError) throw uploadError
        mediaUrl = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl
      }

      const authorPayload =
        tipoPerfil === 'equipe' && perfilAtivo?.id
          ? { equipe_id: perfilAtivo.id, tipo: 'equipe' }
          : tipoPerfil === 'produtora' && perfilAtivo?.id
            ? { produtora_id: perfilAtivo.id, tipo: 'produtora' }
            : { user_id: user!.id, tipo: 'usuario' }

      const { error } = await (supabase as any).from('stories').insert({
        ...authorPayload,
        descricao: storyText.trim(),
        media_url: mediaUrl,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      if (error) throw error

      setComposerOpen(false)
      setStoryText('')
      setStoryFile(null)
      if (storyPreview) URL.revokeObjectURL(storyPreview)
      setStoryPreview(null)
      await loadStories()
    } catch (error: any) {
      alert(error?.message || 'Não foi possível publicar o story.')
    } finally {
      setSaving(null)
    }
  }

  function getHrefMeuPerfil() {
    if (!perfilAtivo?.id) return '/perfil'
    if (tipoPerfil === 'produtora') return `/produtora/${perfilAtivo.id}`
    if (tipoPerfil === 'equipe') return `/equipe/${perfilAtivo.id}`
    if (tipoPerfil === 'jogo') return `/jogadores/${perfilAtivo.id}`
    return '/perfil'
  }

  if (loadingPerfil) return null

  const avatarPerfil =
    perfilAtivo?.avatar_url ||
    perfilAtivo?.foto_url ||
    perfilAtivo?.logo_url ||
    perfilAtivo?.foto_capa ||
    null
  const nomePerfil =
    perfilAtivo?.nome ||
    perfilAtivo?.nome_exibicao ||
    perfilAtivo?.username ||
    perfilAtivo?.nick ||
    'Perfil'
  const navItems = [
    { href: '/feed', label: 'Início', icon: Home },
    { href: '/campeonatos', label: 'Campeonatos', icon: Trophy },
    { href: '/equipe', label: 'Equipes', icon: Users },
    { href: '/jogadores', label: 'Jogadores', icon: Target },
    { href: getHrefMeuPerfil(), label: 'Perfil', icon: UserCheck },
  ]
  const counts = {
    today: highlights.filter((card) => card.section === 'today').length,
    team: highlights.filter((card) => card.section === 'team').length,
    open: highlights.filter((card) => card.section === 'open').length,
    results: highlights.filter((card) => card.section === 'results').length,
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#142340]">
      <div className="mx-auto max-w-[1440px] px-2 py-3 lg:px-5">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[210px_minmax(560px,760px)_280px]">
          <aside className="hidden xl:block">
            <div className="sticky top-20 space-y-3">
              <section className="overflow-hidden border border-slate-200 bg-white">
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3">
                  <div className="grid h-9 w-9 place-items-center bg-sky-50 text-[#0284C7]">
                    <Swords size={18} />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold uppercase text-slate-950">Drop Zone</div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Central competitiva
                    </div>
                  </div>
                </div>
                <nav className="p-2">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`mb-1 flex items-center gap-2 px-3 py-2 text-[12px] font-semibold transition ${
                          item.href === '/feed'
                            ? 'bg-[#E0F2FE] text-[#0369A1]'
                            : 'text-zinc-500 hover:bg-slate-50 hover:text-slate-950'
                        }`}
                      >
                        <Icon size={16} />
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
              </section>

              <section className="border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <Avatar src={avatarPerfil} name={nomePerfil} size="h-10 w-10" />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold uppercase text-slate-950">{nomePerfil}</div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7C3AED]">
                      {tipoPerfil || 'usuário'}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </aside>

          <main className="min-w-0">
            <section className="mb-3 overflow-hidden border border-slate-200 bg-[#07111F] text-white">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                    <Clock3 size={14} /> Stories 24h
                  </div>
                  <h1 className="mt-1 text-[22px] font-black uppercase tracking-[-0.04em] md:text-[28px]">
                    O que importa agora
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="inline-flex h-10 items-center gap-2 bg-[#FACC15] px-4 text-[11px] font-black uppercase text-[#07111F] transition hover:brightness-105"
                >
                  <Plus size={17} /> Novo story
                </button>
              </div>

              <div className="overflow-x-auto border-t border-white/10">
                <div className="flex min-w-max gap-3 px-4 py-4">
                  <button
                    type="button"
                    onClick={() => setComposerOpen(true)}
                    className="flex w-[72px] flex-col items-center gap-1.5"
                  >
                    <span className="grid h-[58px] w-[58px] place-items-center rounded-full border-2 border-dashed border-cyan-300 bg-cyan-300/10">
                      <Plus size={24} />
                    </span>
                    <span className="max-w-[72px] truncate text-[10px] font-bold">Novo</span>
                  </button>

                  {loadingStories ? (
                    <div className="flex items-center px-6 text-cyan-200">
                      <Loader2 className="animate-spin" size={24} />
                    </div>
                  ) : (
                    storyGroups.slice(0, 16).map((group) => {
                      const preview = group.stories[group.stories.length - 1]
                      const firstUnseen =
                        group.stories.find((story) => !stats[story.id]?.viewed) || group.stories[0]
                      const author = authors[group.key] || { nome: preview.tipo || 'Drop Zone' }
                      const viewed = group.stories.every((story) => stats[story.id]?.viewed)
                      return (
                        <button
                          type="button"
                          key={group.key}
                          onClick={() => setSelectedStory(firstUnseen)}
                          className={`flex w-[72px] flex-col items-center gap-1.5 ${viewed ? 'opacity-60' : ''}`}
                        >
                          <span
                            className={`relative rounded-full border-2 p-[3px] ${
                              viewed ? 'border-slate-500' : 'border-[#FACC15]'
                            }`}
                          >
                            <Avatar
                              src={imageUrl(preview.media_url) || author.foto}
                              name={author.nome}
                              size="h-[50px] w-[50px]"
                              round
                            />
                            {group.stories.length > 1 && (
                              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#FACC15] px-1 text-[9px] font-black text-[#07111F]">
                                {group.stories.length}
                              </span>
                            )}
                          </span>
                          <span className="max-w-[72px] truncate text-[10px] font-bold">{author.nome}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </section>

            <section className="mb-3 border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#0284C7]">
                    Central do jogador
                  </div>
                  <h2 className="text-[18px] font-black uppercase tracking-[-0.03em] text-slate-950">
                    Destaques do feed
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={loadHighlights}
                  disabled={loadingHighlights}
                  className="grid h-9 w-9 place-items-center border border-slate-200 text-[#0284C7] hover:bg-sky-50 disabled:opacity-50"
                  title="Atualizar destaques"
                >
                  <RefreshCw size={16} className={loadingHighlights ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                {(Object.keys(sectionMeta) as HighlightSection[]).map((key) => {
                  const meta = sectionMeta[key]
                  const Icon = meta.icon
                  return (
                    <div key={key} className="border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-center justify-between">
                        <Icon size={15} style={{ color: meta.color }} />
                        <span className="text-[19px] font-black text-slate-950">{counts[key]}</span>
                      </div>
                      <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                        {meta.title}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {loadingHighlights ? (
              <div className="flex justify-center border border-slate-200 bg-white py-20">
                <Loader2 className="animate-spin text-[#0284C7]" size={30} />
              </div>
            ) : highlights.length ? (
              (Object.keys(sectionMeta) as HighlightSection[]).map((section) => {
                const cards = highlights.filter((card) => card.section === section)
                if (!cards.length) return null
                const meta = sectionMeta[section]
                const Icon = meta.icon
                return (
                  <section key={section} className="mb-3 border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Icon size={16} style={{ color: meta.color }} />
                        <h2 className="text-[13px] font-black uppercase text-slate-950">{meta.title}</h2>
                      </div>
                      <p className="mt-0.5 text-[10px] font-medium text-zinc-500">{meta.subtitle}</p>
                    </div>
                    <div className="grid gap-3 p-3 md:grid-cols-2">
                      {cards.map((card) => (
                        <Highlight key={card.id} card={card} color={meta.color} />
                      ))}
                    </div>
                  </section>
                )
              })
            ) : (
              <section className="border border-slate-200 bg-white py-16 text-center">
                <Trophy className="mx-auto text-slate-300" size={34} />
                <div className="mt-3 text-[12px] font-bold uppercase text-zinc-500">
                  Nenhum destaque disponível agora
                </div>
              </section>
            )}
          </main>

          <aside className="hidden xl:block">
            <div className="sticky top-20 space-y-3">
              <section className="border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2 text-[12px] font-black uppercase text-slate-950">
                    <Clock3 size={15} className="text-[#0284C7]" /> Stories ativos
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[34px] font-black leading-none text-slate-950">{stories.length}</div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    publicados nas últimas 24h
                  </div>
                </div>
              </section>
              <section className="border border-slate-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center bg-amber-50 text-amber-600">
                    <Trophy size={17} />
                  </div>
                  <div>
                    <div className="text-[12px] font-black uppercase text-slate-950">Feed inteligente</div>
                    <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                      O feed prioriza partidas de hoje, vagas, resultados e informações da sua equipe.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-slate-700 bg-[#07111F] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">Stories</div>
                <h2 className="text-[18px] font-black uppercase">Novo story 24h</h2>
              </div>
              <button type="button" onClick={() => setComposerOpen(false)} className="p-2 text-slate-300 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <label className="flex min-h-[260px] cursor-pointer items-center justify-center overflow-hidden border border-dashed border-slate-600 bg-black/30">
                {storyPreview ? (
                  <img src={storyPreview} alt="Prévia do story" className="max-h-[420px] w-full object-contain" />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImagePlus className="mx-auto" size={36} />
                    <div className="mt-2 text-[11px] font-bold uppercase">Escolher imagem</div>
                    <div className="mt-1 text-[10px]">JPG, PNG ou WEBP</div>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={onStoryFile} />
              </label>
              <textarea
                value={storyText}
                onChange={(event) => setStoryText(event.target.value)}
                placeholder="Escreva uma legenda..."
                className="min-h-24 w-full resize-none border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
              <span className="text-[10px] font-semibold text-slate-400">Visível para a comunidade por 24 horas</span>
              <button
                type="button"
                onClick={publishStory}
                disabled={saving === 'publish' || (!storyFile && !storyText.trim())}
                className="inline-flex h-10 items-center gap-2 bg-[#FACC15] px-4 text-[11px] font-black uppercase text-[#07111F] disabled:opacity-40"
              >
                {saving === 'publish' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStory && (
        <div className="fixed inset-0 z-[90] flex bg-black/95">
          <button
            type="button"
            onClick={() => setSelectedStory(null)}
            className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={22} />
          </button>
          <div className="mx-auto grid h-full w-full max-w-6xl grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="relative flex min-h-0 items-center justify-center overflow-hidden">
              <div className="absolute left-0 right-0 top-0 z-10 h-1 bg-white/20">
                <div key={selectedStory.id} className="h-full origin-left animate-[storyProgress_7s_linear_forwards] bg-white" />
              </div>
              {selectedIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStory(viewerStories[selectedIndex - 1])}
                  className="absolute left-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white"
                >
                  <ChevronLeft />
                </button>
              )}
              {selectedIndex < viewerStories.length - 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedStory(viewerStories[selectedIndex + 1])}
                  className="absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white"
                >
                  <ChevronRight />
                </button>
              )}
              {imageUrl(selectedStory.media_url) ? (
                <img
                  src={imageUrl(selectedStory.media_url) || ''}
                  alt={selectedStory.descricao || 'Story'}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="mx-12 max-w-2xl text-center text-3xl font-black text-white">
                  {selectedStory.descricao || 'Story'}
                </div>
              )}
              <div className="absolute left-4 right-4 top-5 flex items-center gap-3 text-white">
                <Avatar src={selectedAuthor?.foto} name={selectedAuthor?.nome || 'Story'} size="h-10 w-10" round />
                <div>
                  {selectedAuthor?.href ? (
                    <Link href={selectedAuthor.href} className="text-[13px] font-black uppercase hover:underline">
                      {selectedAuthor.nome}
                    </Link>
                  ) : (
                    <div className="text-[13px] font-black uppercase">{selectedAuthor?.nome}</div>
                  )}
                  <div className="text-[10px] font-semibold text-white/70">
                    {storyTimeLeft(selectedStory.expires_at)} restantes
                  </div>
                </div>
              </div>
              {selectedStory.descricao && imageUrl(selectedStory.media_url) && (
                <div className="absolute bottom-5 left-5 right-5 bg-black/55 p-3 text-[14px] font-semibold text-white backdrop-blur-sm">
                  {selectedStory.descricao}
                </div>
              )}
            </div>

            <aside className="flex min-h-0 flex-col border-l border-white/10 bg-[#07111F] text-white">
              <div className="grid grid-cols-5 border-b border-white/10">
                <StoryAction
                  icon={Heart}
                  label={selectedStat.likes}
                  active={selectedStat.liked}
                  loading={saving === `like:${selectedStory.id}`}
                  onClick={() => toggleLike(selectedStory.id)}
                />
                <StoryAction icon={MessageCircle} label={selectedStat.comments} onClick={() => {}} />
                <StoryAction
                  icon={Repeat2}
                  label={selectedStat.reposts}
                  active={selectedStat.reposted}
                  loading={saving === `repost:${selectedStory.id}`}
                  onClick={() => repostStory(selectedStory)}
                />
                <StoryAction icon={Eye} label={selectedStat.views} onClick={() => {}} />
                <StoryAction icon={Share2} label="Enviar" onClick={() => shareStory(selectedStory)} />
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Comentários
                </div>
                {comments.length ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="border border-white/10 bg-white/5 p-2.5">
                      <div className="text-[9px] font-bold uppercase text-cyan-300">Comunidade</div>
                      <div className="mt-1 text-[12px] leading-relaxed text-slate-200">{comment.comentario}</div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[11px] font-semibold text-slate-500">
                    Seja o primeiro a comentar.
                  </div>
                )}
              </div>
              <div className="flex gap-2 border-t border-white/10 p-3">
                <input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') sendComment()
                  }}
                  placeholder="Comentar story..."
                  className="h-10 min-w-0 flex-1 border border-slate-700 bg-slate-900 px-3 text-[12px] outline-none placeholder:text-slate-500 focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={sendComment}
                  disabled={!commentText.trim() || saving === `comment:${selectedStory.id}`}
                  className="grid h-10 w-10 place-items-center bg-[#FACC15] text-[#07111F] disabled:opacity-40"
                >
                  {saving === `comment:${selectedStory.id}` ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes storyProgress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  )
}

function Avatar({
  src,
  name,
  size,
  round = false,
}: {
  src?: string | null
  name: string
  size: string
  round?: boolean
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden border border-slate-200 bg-slate-100 text-slate-500 ${size} ${
        round ? 'rounded-full' : ''
      }`}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <User size={18} />
      )}
    </span>
  )
}

function Highlight({ card, color }: { card: HighlightCard; color: string }) {
  return (
    <article className="overflow-hidden border border-slate-200 bg-slate-50">
      {card.section !== 'results' && (
        <div className="relative h-28 overflow-hidden bg-slate-900">
          {card.image ? (
            <img src={card.image} alt={card.title} className="h-full w-full object-cover opacity-85" />
          ) : (
            <div className="grid h-full place-items-center text-slate-500">
              <Trophy size={30} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2 text-[15px] font-black uppercase text-white">
            {card.title}
          </div>
        </div>
      )}
      <div className="p-3">
        {card.section === 'results' && (
          <>
            <div className="text-[14px] font-black uppercase text-slate-950">{card.title}</div>
            <div className="mt-2 grid grid-cols-[28px_minmax(0,1fr)_28px_28px_32px_34px] border border-slate-200 bg-white px-2 py-1 text-[8px] font-black uppercase text-zinc-500">
              <span>#</span>
              <span>Equipe</span>
              <span>QD</span>
              <span>B!</span>
              <span>Kill</span>
              <span>Pts</span>
            </div>
            {card.rows?.map((row, index) => (
              <div
                key={`${card.id}:${row.label}`}
                className="grid grid-cols-[28px_minmax(0,1fr)_28px_28px_32px_34px] items-center border-x border-b border-slate-200 bg-white px-2 py-1.5 text-[9px] font-bold"
              >
                <span>{index + 1}</span>
                <span className="truncate">{row.label}</span>
                <span>{row.matches || 0}</span>
                <span>{row.booyahs || 0}</span>
                <span>{row.kills || 0}</span>
                <span style={{ color }}>{row.points || 0}</span>
              </div>
            ))}
          </>
        )}
        <p className="mt-2 text-[10px] font-semibold text-zinc-500">{card.subtitle}</p>
        {card.section === 'team' && card.rows?.length ? (
          <div className="mt-2 space-y-1">
            {card.rows.map((row) => (
              <div
                key={`${card.id}:${row.label}`}
                className="flex items-center justify-between border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold"
              >
                <span className="truncate">{row.label}</span>
                <span className="shrink-0 text-zinc-500">{row.value}</span>
              </div>
            ))}
          </div>
        ) : null}
        <Link
          href={card.href}
          className="mt-3 inline-flex h-8 items-center gap-1.5 px-3 text-[10px] font-black uppercase text-white"
          style={{ backgroundColor: color }}
        >
          {card.cta} <ChevronRight size={13} />
        </Link>
      </div>
    </article>
  )
}

function StoryAction({
  icon: Icon,
  label,
  active = false,
  loading = false,
  onClick,
}: {
  icon: typeof Heart
  label: number | string
  active?: boolean
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-16 flex-col items-center justify-center gap-1 border-r border-white/10 text-[10px] font-bold ${
        active ? 'text-[#FACC15]' : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {loading ? <Loader2 size={19} className="animate-spin" /> : <Icon size={19} fill={active ? 'currentColor' : 'none'} />}
      {label}
    </button>
  )
}
