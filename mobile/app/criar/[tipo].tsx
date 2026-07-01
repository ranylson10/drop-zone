import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Screen } from '@/components/Screen'
import { BackHeader } from '@/components/BackHeader'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Body, Tiny } from '@/components/AppText'
import { supabase } from '@/lib/supabase'
import { colors } from '@/theme/colors'

type TipoCriacao = 'post' | 'campeonato' | 'equipe' | 'perfil-jogo'
type Option = { label: string; value: string }
type UploadedImage = { uri: string; publicUrl: string; label: string }
type Produtora = { id: string; nome: string; logo_url?: string | null }
type Taxa = { tipo: string; titulo: string; valor: number | null; ativo: boolean | null }
type DiarioHorario = {
  id: string
  nome: string
  horario_inicio: string
  qtd_slots: string
  qtd_quedas: string
  valor_inscricao: string
  premiacao: string
}

const labels: Record<TipoCriacao, { title: string; eyebrow: string; icon: keyof typeof Ionicons.glyphMap }> = {
  post: { title: 'Novo story', eyebrow: 'STORIES', icon: 'time-outline' },
  campeonato: { title: 'Novo campeonato', eyebrow: 'CAMPEONATO', icon: 'trophy-outline' },
  equipe: { title: 'Nova equipe', eyebrow: 'EQUIPE', icon: 'shield-outline' },
  'perfil-jogo': { title: 'Novo perfil de jogo', eyebrow: 'JOGADOR', icon: 'person-circle-outline' }
}

const tipoOptions: Option[] = [
  { label: 'Copa', value: 'copa' },
  { label: 'Liga', value: 'liga' },
  { label: 'Diario', value: 'diario' },
  { label: 'Xtreino', value: 'xtreino' },
  { label: 'Confronto', value: 'confronto' },
  { label: 'Apostado', value: 'apostado' }
]
const servidorOptions = ['Brasil (BR)', 'Latam (LATAM)', 'America do Norte (NA)', 'Europa (EU)', 'India (IND)', 'Singapura (SG)'].map((value) => ({ label: value, value }))
const plataformaOptions = ['Mobile', 'Emulador', 'Misto'].map((value) => ({ label: value, value }))
const categoriaOptions = ['Squad', 'Duo', 'Solo'].map((value) => ({ label: value, value }))
const modoOptions = ['Battle Royale', 'CS'].map((value) => ({ label: value, value }))
const desempateOptions = [
  { label: 'Abates', value: 'abates' },
  { label: 'Booyah', value: 'booyah' },
  { label: 'Posicao', value: 'posicao' },
  { label: 'Confronto direto', value: 'confronto_direto' }
]
const sistemaOptions = [
  { label: 'Padrao', value: 'padrao' },
  { label: 'Personalizado', value: 'personalizado' }
]
const funcaoOptions = [
  { label: 'Rush', value: 'RUSH' },
  { label: 'Suporte', value: 'SUPORTE' },
  { label: 'Granadeiro', value: 'GRANADEIRO' },
  { label: 'Sniper', value: 'SNIPER' }
]
const cargoOptions = [
  { label: 'Membro', value: 'membro' },
  { label: 'Capitao', value: 'capitao' }
]
const pagamentoOptions = [
  { label: 'Saldo da carteira', value: 'saldo' },
  { label: 'Pix: recarregar carteira', value: 'pix' },
  { label: 'PayPal indisponivel', value: 'paypal' }
]

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function createUuid() {
  const cryptoRandomUUID = globalThis.crypto?.randomUUID
  if (cryptoRandomUUID) return cryptoRandomUUID.call(globalThis.crypto)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16)
    const normalized = char === 'x' ? value : (value & 0x3) | 0x8
    return normalized.toString(16)
  })
}

function readableUploadError(error: any) {
  const message = String(error?.message || '')
  if (/row-level security|permission|not authorized|unauthorized|403/i.test(message)) {
    return 'Permissao negada no upload. Entre novamente na conta e tente enviar a imagem.'
  }
  return message || 'Nao foi possivel enviar a imagem.'
}

function base64ToUint8Array(base64: string) {
  const binary = globalThis.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function newDiarioHorario(index: number, defaults?: Partial<DiarioHorario>): DiarioHorario {
  return {
    id: createUuid(),
    nome: `Horario ${index + 1}`,
    horario_inicio: '',
    qtd_slots: '12',
    qtd_quedas: '6',
    valor_inscricao: '0',
    premiacao: '0',
    ...defaults
  }
}

export default function Criar() {
  const { tipo } = useLocalSearchParams<{ tipo: TipoCriacao }>()
  const kind: TipoCriacao = ['post', 'campeonato', 'equipe', 'perfil-jogo'].includes(String(tipo)) ? tipo : 'post'
  const meta = labels[kind]
  const [saving, setSaving] = useState(false)
  const [select, setSelect] = useState<{ title: string; options: Option[]; value: string; onChange: (value: string) => void; empty?: string } | null>(null)
  const [taxas, setTaxas] = useState<Taxa[]>([])
  const [saldo, setSaldo] = useState(0)
  const [produtoras, setProdutoras] = useState<Produtora[]>([])
  const [diarioHorarios, setDiarioHorarios] = useState<DiarioHorario[]>([
    newDiarioHorario(0)
  ])
  const [post, setPost] = useState({ conteudo: '', imagem: null as UploadedImage | null })
  const [champ, setChamp] = useState({
    produtora_id: '',
    nome: '',
    edicao: '1',
    tipo_competicao: 'copa',
    valor_vaga: '0',
    valor_premiacao: '0',
    vagas: '12',
    plataforma: 'Mobile',
    categoria: 'Squad',
    regiao: 'Brasil (BR)',
    data_inicio: '',
    modo_jogo: 'Battle Royale',
    quantidade_quedas: '6',
    equipes_por_jogo: '12',
    quantidade_rodadas: '1',
    criterio_desempate: 'abates',
    pontos_por_abate: '1',
    sistema_pontos_tipo: 'padrao',
    whatsapp_suporte: '',
    forma_pagamento: 'saldo',
    logo: null as UploadedImage | null,
    banner: null as UploadedImage | null
  })
  const [team, setTeam] = useState({
    nome: '',
    tag: '',
    cidade: '',
    estado: '',
    pais: '',
    data_fundacao: '',
    descricao: '',
    logo: null as UploadedImage | null,
    capa: null as UploadedImage | null
  })
  const [profile, setProfile] = useState({
    nick: '',
    uid_jogo: '',
    servidor: 'BR',
    plataforma: 'mobile',
    funcao: 'RUSH',
    cargo: 'membro',
    bio: '',
    foto: null as UploadedImage | null
  })
  const title = useMemo(() => meta.title, [meta.title])
  const taxaBase = useMemo(() => {
    const row = taxas.find((item) => item.tipo === champ.tipo_competicao && item.ativo !== false)
    return Number(row?.valor || 0)
  }, [champ.tipo_competicao, taxas])
  const taxaAtual = champ.tipo_competicao === 'diario'
    ? taxaBase * Math.max(1, diarioHorarios.length)
    : taxaBase
  const produtoraOptions = produtoras.map((item) => ({ label: item.nome || 'Produtora', value: item.id }))

  function updateDiarioHorario(id: string, field: keyof DiarioHorario, value: string) {
    setDiarioHorarios((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item))
  }

  function addDiarioHorario() {
    setDiarioHorarios((current) => {
      const previous = current[current.length - 1]
      return [...current, newDiarioHorario(current.length, previous ? {
        qtd_slots: previous.qtd_slots,
        qtd_quedas: previous.qtd_quedas,
        valor_inscricao: previous.valor_inscricao,
        premiacao: previous.premiacao
      } : undefined)]
    })
  }

  function removeDiarioHorario(id: string) {
    setDiarioHorarios((current) => current.length > 1 ? current.filter((item) => item.id !== id) : current)
  }

  useEffect(() => {
    loadFinancialContext()
  }, [])

  async function getUser() {
    if (!supabase) return null
    const { data } = await supabase.auth.getUser()
    if (!data.user) Alert.alert(title, 'Faca login para criar.')
    return data.user || null
  }

  async function loadFinancialContext() {
    if (!supabase) return
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    const taxasRes = await supabase.from('campeonato_taxas_criacao').select('tipo,titulo,valor,ativo').eq('ativo', true).order('ordem', { ascending: true })
    setTaxas((taxasRes.data || []) as Taxa[])
    if (!user) return

    const [walletRes, criadasRes, membroRes] = await Promise.all([
      supabase.from('wallet_saldo').select('saldo,saldo_retido').eq('user_id', user.id).maybeSingle(),
      supabase.from('produtoras').select('id,nome,logo_url').eq('dono_id', user.id).order('created_at', { ascending: true }),
      supabase.from('membros_produtora').select('produtora_id,tipo,user_id').eq('user_id', user.id).in('tipo', ['dono', 'admin', 'membro'])
    ])
    setSaldo(Number(walletRes.data?.saldo || 0))

    const ids = Array.from(new Set((membroRes.data || []).map((row: any) => String(row.produtora_id || '')).filter(Boolean)))
    const membroProdutoras = ids.length
      ? await supabase.from('produtoras').select('id,nome,logo_url').in('id', ids)
      : { data: [] as any[] }
    const map = new Map<string, Produtora>()
    ;[...(criadasRes.data || []), ...(membroProdutoras.data || [])].forEach((item: any) => map.set(String(item.id), item))
    const lista = Array.from(map.values())
    setProdutoras(lista)
    if (lista[0]?.id) setChamp((value) => ({ ...value, produtora_id: value.produtora_id || lista[0].id }))
  }

  async function uploadImage(bucket: string, folder: string, label: string, userId: string) {
    if (!supabase) return null
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Upload', 'Permita acesso as imagens para enviar o arquivo.')
      return null
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.86 })
    if (result.canceled || !result.assets[0]?.uri) return null

    const asset = result.assets[0]
    const image = await ImageManipulator.manipulateAsync(
      asset.uri,
      [],
      { compress: 0.86, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    )
    if (!image.base64) throw new Error('Nao foi possivel preparar a imagem.')
    const fileName = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const bytes = base64ToUint8Array(image.base64)
    const { error } = await supabase.storage.from(bucket).upload(fileName, bytes.buffer, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
    return { uri: image.uri || asset.uri, publicUrl: data.publicUrl, label }
  }

  async function pickImage(target: 'post' | 'champ-logo' | 'champ-banner' | 'team-logo' | 'team-cover' | 'profile-photo') {
    try {
      setSaving(true)
      const user = await getUser()
      if (!user) return
      const bucket = target === 'post' ? 'post-images' : target === 'team-logo' ? 'team-logos' : target === 'team-cover' ? 'team-covers' : target === 'profile-photo' ? 'avatars' : 'imagem_campeonatos'
      const uploaded = await uploadImage(bucket, target, target, user.id)
      if (!uploaded) return
      if (target === 'post') setPost((value) => ({ ...value, imagem: uploaded }))
      if (target === 'champ-logo') setChamp((value) => ({ ...value, logo: uploaded }))
      if (target === 'champ-banner') setChamp((value) => ({ ...value, banner: uploaded }))
      if (target === 'team-logo') setTeam((value) => ({ ...value, logo: uploaded }))
      if (target === 'team-cover') setTeam((value) => ({ ...value, capa: uploaded }))
      if (target === 'profile-photo') setProfile((value) => ({ ...value, foto: uploaded }))
    } catch (error: any) {
      Alert.alert('Upload', readableUploadError(error))
    } finally {
      setSaving(false)
    }
  }

  async function submit() {
    if (!supabase || saving) return
    const user = await getUser()
    if (!user) return
    setSaving(true)
    try {
      if (kind === 'post') {
        const conteudo = post.conteudo.trim()
        if (!conteudo && !post.imagem?.publicUrl) throw new Error('Escreva algo ou envie uma imagem.')
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        const { error } = await supabase.from('stories').insert({
          id: createUuid(),
          descricao: conteudo,
          media_url: post.imagem?.publicUrl || null,
          tipo: 'usuario',
          user_id: user.id,
          expires_at: expiresAt
        })
        if (error) throw error
        Alert.alert('Stories', 'Story publicado por 24 horas.')
        router.replace('/(tabs)/feed')
      }

      if (kind === 'equipe') {
        const nome = team.nome.trim()
        if (!nome) throw new Error('Informe o nome da equipe.')
        const { count, error: countError } = await supabase.from('equipes').select('id', { count: 'exact', head: true }).eq('criado_por', user.id)
        if (countError) throw countError
        if (Number(count || 0) >= 2) throw new Error('Voce ja atingiu o limite de 2 equipes criadas por usuario.')
        const { data, error } = await supabase.from('equipes').insert({
          nome,
          tag: team.tag.trim().toUpperCase() || null,
          logo_url: team.logo?.publicUrl || null,
          cover_url: team.capa?.publicUrl || null,
          cidade: team.cidade.trim() || null,
          estado: team.estado.trim() || null,
          pais: team.pais.trim() || null,
          data_fundacao: team.data_fundacao.trim() || null,
          descricao: team.descricao.trim() || null,
          criado_por: user.id
        }).select('id').single()
        if (error) throw error
        Alert.alert('Equipe', 'Equipe criada.')
        router.replace(data?.id ? `/equipe/${data.id}` : '/(tabs)/equipes')
      }

      if (kind === 'perfil-jogo') {
        const nick = profile.nick.trim()
        const uid = profile.uid_jogo.trim()
        if (!nick || !uid) throw new Error('Informe nick e ID de jogo.')
        const { data, error } = await supabase.from('perfis_jogo').insert({
          user_id: user.id,
          nick,
          uid_jogo: uid,
          servidor: profile.servidor.trim() || 'BR',
          plataforma: (profile.plataforma.trim() || 'MOBILE').toUpperCase(),
          funcao: profile.funcao,
          foto_capa: profile.foto?.publicUrl || null,
          ativo: true
        }).select('id').single()
        if (error) throw error
        Alert.alert('Perfil', 'Perfil de jogo criado.')
        router.replace(data?.id ? `/jogador/${data.id}` : '/(tabs)/jogadores')
      }

      if (kind === 'campeonato') {
        const nome = champ.nome.trim()
        if (!nome) throw new Error('Informe o nome do campeonato.')
        if (!champ.produtora_id) throw new Error('Selecione uma produtora. No site o campeonato sempre nasce vinculado a uma produtora.')
        if (champ.forma_pagamento === 'pix') {
          Alert.alert('Pix', 'O pagamento por Pix/QR Code será confirmado diretamente na inscrição ou criação, sem carteira interna.')
          return
        }
        if (champ.forma_pagamento === 'paypal') throw new Error('PayPal ainda nao existe no backend do site. Nao vou simular pagamento sem rota real.')
        const tipo = champ.tipo_competicao
        const isDiario = tipo === 'diario'
        const horariosValidos = diarioHorarios.map((item, index) => ({
          ...item,
          nome: item.nome.trim() || `${nome} ${item.horario_inicio || index + 1}`,
          horario_inicio: item.horario_inicio.trim()
        }))
        if (isDiario) {
          if (!horariosValidos.length || horariosValidos.some((item) => !/^\d{2}:\d{2}$/.test(item.horario_inicio))) {
            throw new Error('Informe todos os horarios do diario no formato HH:MM.')
          }
          const repeated = horariosValidos.map((item) => item.horario_inicio)
          if (new Set(repeated).size !== repeated.length) throw new Error('Nao repita o mesmo horario no diario.')
          if (horariosValidos.some((item) => Number(item.qtd_slots) <= 0 || Number(item.qtd_quedas) <= 0)) {
            throw new Error('Cada horario precisa ter vagas e quantidade de quedas validas.')
          }
        }
        if (saldo < taxaAtual) throw new Error(`Saldo insuficiente. Taxa total ${money(taxaAtual)} e saldo ${money(saldo)}.`)
        const isLiga = tipo === 'liga'
        const isXtreino = tipo === 'xtreino'
        const primeiroHorario = isDiario ? horariosValidos[0] : null
        const slug = `${slugify(`${nome}-${tipo}`)}-${Date.now()}`
        const { data, error } = await supabase.from('campeonatos').insert({
          produtora_id: champ.produtora_id,
          criado_por: user.id,
          nome,
          slug,
          edicao: String(champ.edicao || '1'),
          status: 'rascunho',
          jogo: 'Free Fire',
          logo_url: champ.logo?.publicUrl || null,
          banner_url: champ.banner?.publicUrl || null,
          valor_vaga: Number(primeiroHorario?.valor_inscricao || champ.valor_vaga || 0),
          valor_premiacao: Number(primeiroHorario?.premiacao || champ.valor_premiacao || 0),
          vagas: Number(primeiroHorario?.qtd_slots || champ.vagas || 0),
          moeda: 'BRL',
          plataforma: champ.plataforma,
          regiao: champ.regiao,
          categoria: champ.categoria,
          modo_jogo: champ.modo_jogo,
          formato: tipo,
          tipo_competicao: tipo,
          modelo_competicao: tipo === 'liga' ? 'liga' : tipo === 'copa' ? 'copa' : tipo === 'diario' ? 'diario' : tipo === 'confronto' ? 'confronto' : tipo === 'apostado' ? 'apostado' : 'xtreino',
          data_inicio: champ.data_inicio.trim() ? new Date(champ.data_inicio.trim()).toISOString() : null,
          quantidade_quedas: tipo === 'copa' ? 0 : Number(primeiroHorario?.qtd_quedas || champ.quantidade_quedas || 0),
          equipes_por_jogo: tipo === 'copa' ? 0 : Number(primeiroHorario?.qtd_slots || champ.equipes_por_jogo || 0),
          quantidade_rodadas: Number(champ.quantidade_rodadas || 0),
          criterio_desempate: isLiga || isXtreino ? null : champ.criterio_desempate,
          pontos_por_abate: Number(champ.pontos_por_abate || 1),
          pontos_abate: Number(champ.pontos_por_abate || 1),
          sistema_pontos_tipo: isLiga || isXtreino ? champ.sistema_pontos_tipo : null,
          whatsapp_suporte: champ.whatsapp_suporte.trim() || null
        }).select('id').single()
        if (error) throw error

        if (isDiario && data?.id) {
          const { error: configError } = await supabase.from('campeonatos_diarios_config').upsert({
            campeonato_id: data.id,
            quantidade_quedas: Number(primeiroHorario?.qtd_quedas || 6),
            equipes_por_jogo: Number(primeiroHorario?.qtd_slots || 12),
            grupo_unico: false,
            criterio_desempate: champ.criterio_desempate
          })
          if (configError) throw new Error(`Campeonato criado, mas a configuracao do diario falhou: ${configError.message}`)

          for (let index = 0; index < horariosValidos.length; index += 1) {
            const horario = horariosValidos[index]
            const { error: groupError } = await supabase.rpc('fn_criar_grupo_diario', {
              p_campeonato_id: data.id,
              p_nome: horario.nome,
              p_horario_inicio: horario.horario_inicio,
              p_horario_fim: null,
              p_premiacao: Number(horario.premiacao || 0),
              p_valor_inscricao: Number(horario.valor_inscricao || 0),
              p_qtd_slots: Number(horario.qtd_slots || 12),
              p_qtd_quedas: Number(horario.qtd_quedas || 6),
              p_mapas: [],
              p_ordem: index + 1,
              p_intervalo_minutos: 15,
              p_configuracao: {
                independente: true,
                pontuacao_independente: true,
                mvp_independente: true,
                premiacao_independente: true
              }
            })
            if (groupError) throw new Error(`Diario criado, mas o horario ${horario.horario_inicio} falhou: ${groupError.message}`)
          }

          const taxaComplementar = taxaBase * Math.max(0, horariosValidos.length - 1)
          if (taxaComplementar > 0) {
            const { error: feeError } = await supabase.rpc('fn_wallet_pagar_taxa_criacao_campeonato', {
              p_user_id: user.id,
              p_campeonato_id: data.id,
              p_valor: taxaComplementar,
              p_descricao: `Taxa complementar de ${horariosValidos.length - 1} horario(s) do diario ${nome}`
            })
            if (feeError) {
              throw new Error(`Diario e horarios criados, mas a taxa complementar nao foi debitada: ${feeError.message}`)
            }
          }
        }

        Alert.alert('Campeonato', isDiario
          ? `Diario criado com ${horariosValidos.length} horarios independentes. Taxa total: ${money(taxaAtual)}.`
          : `Campeonato criado. Taxa ${money(taxaAtual)} validada pela carteira no mesmo fluxo do site.`)
        router.replace(data?.id ? `/campeonato/${data.id}` : '/(tabs)/campeonatos')
      }
    } catch (error: any) {
      Alert.alert(title, error?.message || error?.details || 'Nao foi possivel criar agora.')
    } finally {
      setSaving(false)
    }
  }

  if (kind === 'post') {
    return <Screen scroll={false} showTopBar={false} contentStyle={styles.storyComposer}>
      <View style={styles.storyToolbar}>
        <Pressable onPress={() => router.back()} style={styles.storyToolButton}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
        <View style={styles.storyToolsRight}>
          <Pressable onPress={() => pickImage('post')} style={styles.storyToolButton}>
            <Ionicons name="images-outline" size={23} color="#FFFFFF" />
          </Pressable>
          {post.imagem ? <Pressable onPress={() => setPost((value) => ({ ...value, imagem: null }))} style={styles.storyToolButton}>
            <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
          </Pressable> : null}
        </View>
      </View>

      <Pressable onPress={() => pickImage('post')} style={styles.storyPreview}>
        {post.imagem?.uri ? <Image source={{ uri: post.imagem.uri }} style={styles.storyPreviewImage} resizeMode="contain" /> : <View style={styles.storyEmpty}>
          {saving ? <ActivityIndicator size="large" color="#FFFFFF" /> : <Ionicons name="image-outline" size={54} color="#8C969E" />}
          <Body style={styles.storyEmptyTitle}>{saving ? 'Preparando imagem...' : 'Adicionar foto'}</Body>
          <Tiny style={styles.storyEmptyText}>Toque para escolher uma imagem da galeria</Tiny>
        </View>}
      </Pressable>

      <View style={styles.storyBottom}>
        <View style={styles.storyCaptionBox}>
          <Ionicons name="image-outline" size={22} color="#FFFFFF" />
          <TextInput
            value={post.conteudo}
            onChangeText={(conteudo) => setPost((value) => ({ ...value, conteudo }))}
            placeholder="Adicione uma legenda..."
            placeholderTextColor="#A8B0B7"
            multiline
            maxLength={500}
            style={styles.storyCaptionInput}
          />
        </View>
        <View style={styles.storyPublishRow}>
          <View style={styles.storyAudience}>
            <Ionicons name="people-circle-outline" size={19} color="#FFFFFF" />
            <Body style={styles.storyAudienceText}>Comunidade</Body>
          </View>
          <Pressable onPress={submit} disabled={saving} style={[styles.storySend, saving && styles.storySendDisabled]}>
            {saving ? <ActivityIndicator color="#091018" /> : <Ionicons name="send" size={24} color="#091018" />}
          </Pressable>
        </View>
      </View>
    </Screen>
  }

  return <Screen>
    <BackHeader eyebrow={meta.eyebrow} title={meta.title} />
    <Card style={styles.card}>
      <View style={styles.formHead}>
        <Ionicons name={meta.icon} size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Body style={styles.formTitle}>{meta.title}</Body>
          <Tiny>{kind === 'campeonato' ? 'Formulario baseado no fluxo de criacao do site.' : 'Criacao com upload real de imagem.'}</Tiny>
        </View>
      </View>

      {kind === 'campeonato' ? <>
        <View style={styles.feeBox}>
          <Tiny style={styles.blueLabel}>{champ.tipo_competicao === 'diario' ? 'Taxa por horario' : 'Taxa de criacao'}</Tiny>
          <Body style={styles.feeValue}>{money(taxaAtual)}</Body>
          <Tiny>
            {champ.tipo_competicao === 'diario'
              ? `${diarioHorarios.length} horario(s) x ${money(taxaBase)}. Cada horario funciona como um grupo independente.`
              : 'Esse valor e validado/debitado pela carteira no fluxo do banco.'}
          </Tiny>
          <Tiny>Saldo disponivel: {money(saldo)}</Tiny>
        </View>
        <SelectField label="Produtora" value={champ.produtora_id} options={produtoraOptions} empty="Nenhuma produtora encontrada" onPress={() => setSelect({ title: 'Produtora', options: produtoraOptions, value: champ.produtora_id, onChange: (produtora_id) => setChamp((value) => ({ ...value, produtora_id })) })} />
        <UploadBox title="Logo do campeonato" image={champ.logo} onPress={() => pickImage('champ-logo')} onClear={() => setChamp((value) => ({ ...value, logo: null }))} />
        <UploadBox title="Banner do campeonato" image={champ.banner} wide onPress={() => pickImage('champ-banner')} onClear={() => setChamp((value) => ({ ...value, banner: null }))} />
        <Input value={champ.nome} onChangeText={(nome) => setChamp((value) => ({ ...value, nome }))} placeholder="Nome" />
        <View style={styles.row}>
          <Input value={champ.edicao} onChangeText={(edicao) => setChamp((value) => ({ ...value, edicao }))} placeholder="Edicao" keyboardType="numeric" style={styles.flex} />
          <Input value={champ.data_inicio} onChangeText={(data_inicio) => setChamp((value) => ({ ...value, data_inicio }))} placeholder="Inicio: 2026-06-30 20:00" style={styles.flex} />
        </View>
        <SelectField label="Tipo de campeonato" value={champ.tipo_competicao} options={tipoOptions} onPress={() => setSelect({ title: 'Tipo de campeonato', options: tipoOptions, value: champ.tipo_competicao, onChange: (tipo_competicao) => setChamp((value) => ({ ...value, tipo_competicao })) })} />
        {champ.tipo_competicao === 'diario' ? <View style={styles.diarioSection}>
          <View style={styles.diarioHead}>
            <View style={styles.flex}>
              <Body style={styles.diarioTitle}>Horarios independentes</Body>
              <Tiny>Cada horario tera inscricoes, tabela, pontuacao, MVP, campeao e premiacao proprios.</Tiny>
            </View>
            <Pressable onPress={addDiarioHorario} style={styles.addHorarioButton}>
              <Ionicons name="add" size={19} color={colors.white} />
              <Body style={styles.addHorarioText}>Horario</Body>
            </Pressable>
          </View>
          {diarioHorarios.map((horario, index) => <View key={horario.id} style={styles.horarioCard}>
            <View style={styles.horarioCardHead}>
              <View style={styles.horarioIndex}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Body style={styles.horarioIndexText}>Grupo {index + 1}</Body>
              </View>
              <Pressable onPress={() => removeDiarioHorario(horario.id)} disabled={diarioHorarios.length === 1} style={[styles.removeHorario, diarioHorarios.length === 1 && styles.removeHorarioDisabled]}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
            <Input
              value={horario.nome}
              onChangeText={(value) => updateDiarioHorario(horario.id, 'nome', value)}
              placeholder={`Ex.: ${champ.nome.trim() || 'Diario'} ${horario.horario_inicio || '19H'}`}
            />
            <View style={styles.row}>
              <Input
                value={horario.horario_inicio}
                onChangeText={(value) => updateDiarioHorario(horario.id, 'horario_inicio', value.replace(/[^\d:]/g, '').slice(0, 5))}
                placeholder="Horario: 19:00"
                keyboardType="numbers-and-punctuation"
                style={styles.flex}
              />
              <Input
                value={horario.qtd_slots}
                onChangeText={(value) => updateDiarioHorario(horario.id, 'qtd_slots', value)}
                placeholder="Vagas"
                keyboardType="numeric"
                style={styles.flex}
              />
            </View>
            <View style={styles.row}>
              <Input
                value={horario.qtd_quedas}
                onChangeText={(value) => updateDiarioHorario(horario.id, 'qtd_quedas', value)}
                placeholder="Quedas"
                keyboardType="numeric"
                style={styles.flex}
              />
              <Input
                value={horario.valor_inscricao}
                onChangeText={(value) => updateDiarioHorario(horario.id, 'valor_inscricao', value)}
                placeholder="Valor da vaga"
                keyboardType="decimal-pad"
                style={styles.flex}
              />
            </View>
            <Input
              value={horario.premiacao}
              onChangeText={(value) => updateDiarioHorario(horario.id, 'premiacao', value)}
              placeholder="Premiacao deste horario"
              keyboardType="decimal-pad"
            />
          </View>)}
          <Pressable onPress={addDiarioHorario} style={styles.addHorarioWide}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Body style={styles.addHorarioWideText}>Adicionar outro horario</Body>
          </Pressable>
        </View> : null}
        <View style={styles.row}>
          <SelectField label="Plataforma" value={champ.plataforma} options={plataformaOptions} style={styles.flex} onPress={() => setSelect({ title: 'Plataforma', options: plataformaOptions, value: champ.plataforma, onChange: (plataforma) => setChamp((value) => ({ ...value, plataforma })) })} />
          <SelectField label="Categoria" value={champ.categoria} options={categoriaOptions} style={styles.flex} onPress={() => setSelect({ title: 'Categoria', options: categoriaOptions, value: champ.categoria, onChange: (categoria) => setChamp((value) => ({ ...value, categoria })) })} />
        </View>
        <SelectField label="Servidor" value={champ.regiao} options={servidorOptions} onPress={() => setSelect({ title: 'Servidor', options: servidorOptions, value: champ.regiao, onChange: (regiao) => setChamp((value) => ({ ...value, regiao })) })} />
        <SelectField label="Modo de jogo" value={champ.modo_jogo} options={modoOptions} onPress={() => setSelect({ title: 'Modo de jogo', options: modoOptions, value: champ.modo_jogo, onChange: (modo_jogo) => setChamp((value) => ({ ...value, modo_jogo })) })} />
        {champ.tipo_competicao !== 'diario' ? <View style={styles.row}>
          <Input value={champ.vagas} onChangeText={(vagas) => setChamp((value) => ({ ...value, vagas }))} placeholder="Vagas" keyboardType="numeric" style={styles.flex} />
          <Input value={champ.valor_vaga} onChangeText={(valor_vaga) => setChamp((value) => ({ ...value, valor_vaga }))} placeholder="Valor por vaga" keyboardType="numeric" style={styles.flex} />
        </View> : null}
        {champ.tipo_competicao !== 'diario' ? <View style={styles.row}>
          <Input value={champ.valor_premiacao} onChangeText={(valor_premiacao) => setChamp((value) => ({ ...value, valor_premiacao }))} placeholder="Premiacao" keyboardType="numeric" style={styles.flex} />
          <Input value={champ.pontos_por_abate} onChangeText={(pontos_por_abate) => setChamp((value) => ({ ...value, pontos_por_abate }))} placeholder="Pontos/abate" keyboardType="numeric" style={styles.flex} />
        </View> : <Input value={champ.pontos_por_abate} onChangeText={(pontos_por_abate) => setChamp((value) => ({ ...value, pontos_por_abate }))} placeholder="Pontos por abate em todos os horarios" keyboardType="numeric" />}
        {champ.tipo_competicao !== 'diario' ? <View style={styles.row}>
          <Input value={champ.quantidade_quedas} onChangeText={(quantidade_quedas) => setChamp((value) => ({ ...value, quantidade_quedas }))} placeholder="Quedas" keyboardType="numeric" style={styles.flex} />
          <Input value={champ.equipes_por_jogo} onChangeText={(equipes_por_jogo) => setChamp((value) => ({ ...value, equipes_por_jogo }))} placeholder="Equipes por jogo" keyboardType="numeric" style={styles.flex} />
        </View> : null}
        <Input value={champ.quantidade_rodadas} onChangeText={(quantidade_rodadas) => setChamp((value) => ({ ...value, quantidade_rodadas }))} placeholder="Rodadas" keyboardType="numeric" />
        <SelectField label="Criterio de desempate" value={champ.criterio_desempate} options={desempateOptions} onPress={() => setSelect({ title: 'Criterio de desempate', options: desempateOptions, value: champ.criterio_desempate, onChange: (criterio_desempate) => setChamp((value) => ({ ...value, criterio_desempate })) })} />
        <SelectField label="Sistema de pontos" value={champ.sistema_pontos_tipo} options={sistemaOptions} onPress={() => setSelect({ title: 'Sistema de pontos', options: sistemaOptions, value: champ.sistema_pontos_tipo, onChange: (sistema_pontos_tipo) => setChamp((value) => ({ ...value, sistema_pontos_tipo })) })} />
        <Input value={champ.whatsapp_suporte} onChangeText={(whatsapp_suporte) => setChamp((value) => ({ ...value, whatsapp_suporte }))} placeholder="WhatsApp suporte" keyboardType="phone-pad" />
        <SelectField label="Pagamento da taxa" value={champ.forma_pagamento} options={pagamentoOptions} onPress={() => setSelect({ title: 'Pagamento da taxa', options: pagamentoOptions, value: champ.forma_pagamento, onChange: (forma_pagamento) => setChamp((value) => ({ ...value, forma_pagamento })) })} />
        {champ.forma_pagamento === 'pix' ? <View style={styles.warnBox}><Tiny>Pix recarrega a carteira primeiro. Depois volte aqui e finalize com saldo, igual ao fluxo do site.</Tiny></View> : null}
        {champ.forma_pagamento === 'paypal' ? <View style={styles.warnBox}><Tiny>PayPal nao tem rota real no backend do site ainda, entao ficou indisponivel no app para nao criar pagamento falso.</Tiny></View> : null}
      </> : null}

      {kind === 'equipe' ? <>
        <UploadBox title="Logo da equipe" image={team.logo} onPress={() => pickImage('team-logo')} onClear={() => setTeam((value) => ({ ...value, logo: null }))} />
        <UploadBox title="Capa da equipe" image={team.capa} wide onPress={() => pickImage('team-cover')} onClear={() => setTeam((value) => ({ ...value, capa: null }))} />
        <Input value={team.nome} onChangeText={(nome) => setTeam((value) => ({ ...value, nome }))} placeholder="Nome da equipe" />
        <View style={styles.row}>
          <Input value={team.tag} onChangeText={(tag) => setTeam((value) => ({ ...value, tag }))} placeholder="Tag" autoCapitalize="characters" style={styles.flex} />
          <Input value={team.data_fundacao} onChangeText={(data_fundacao) => setTeam((value) => ({ ...value, data_fundacao }))} placeholder="Fundacao: 2026-06-04" style={styles.flex} />
        </View>
        <View style={styles.row}>
          <Input value={team.cidade} onChangeText={(cidade) => setTeam((value) => ({ ...value, cidade }))} placeholder="Cidade" style={styles.flex} />
          <Input value={team.estado} onChangeText={(estado) => setTeam((value) => ({ ...value, estado }))} placeholder="Estado" style={styles.flex} />
        </View>
        <Input value={team.pais} onChangeText={(pais) => setTeam((value) => ({ ...value, pais }))} placeholder="Pais" />
        <Input value={team.descricao} onChangeText={(descricao) => setTeam((value) => ({ ...value, descricao }))} placeholder="Descricao" multiline style={styles.textAreaSmall} />
      </> : null}

      {kind === 'perfil-jogo' ? <>
        <UploadBox title="Foto do perfil" image={profile.foto} onPress={() => pickImage('profile-photo')} onClear={() => setProfile((value) => ({ ...value, foto: null }))} />
        <Input value={profile.nick} onChangeText={(nick) => setProfile((value) => ({ ...value, nick }))} placeholder="Nick" />
        <Input value={profile.uid_jogo} onChangeText={(uid_jogo) => setProfile((value) => ({ ...value, uid_jogo }))} placeholder="ID de jogo / UID" keyboardType="numeric" />
        <View style={styles.row}>
          <Input value={profile.servidor} onChangeText={(servidor) => setProfile((value) => ({ ...value, servidor }))} placeholder="Servidor" style={styles.flex} />
          <Input value={profile.plataforma} onChangeText={(plataforma) => setProfile((value) => ({ ...value, plataforma }))} placeholder="Plataforma" style={styles.flex} />
        </View>
        <View style={styles.row}>
          <SelectField label="Funcao" value={profile.funcao} options={funcaoOptions} style={styles.flex} onPress={() => setSelect({ title: 'Funcao', options: funcaoOptions, value: profile.funcao, onChange: (funcao) => setProfile((value) => ({ ...value, funcao })) })} />
          <SelectField label="Cargo" value={profile.cargo} options={cargoOptions} style={styles.flex} onPress={() => setSelect({ title: 'Cargo', options: cargoOptions, value: profile.cargo, onChange: (cargo) => setProfile((value) => ({ ...value, cargo })) })} />
        </View>
        <Input value={profile.bio} onChangeText={(bio) => setProfile((value) => ({ ...value, bio }))} placeholder="Biografia" multiline style={styles.textAreaSmall} />
      </> : null}

      <Button label={saving ? 'Processando...' : kind === 'campeonato' ? champ.tipo_competicao === 'diario' ? `Criar ${diarioHorarios.length} horarios - ${money(taxaAtual)}` : `Criar e pagar ${money(taxaAtual)}` : 'Criar'} onPress={submit} />
    </Card>

    <Modal visible={Boolean(select)} transparent animationType="fade" onRequestClose={() => setSelect(null)}>
      <Pressable style={styles.overlay} onPress={() => setSelect(null)} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Body style={styles.sheetTitle}>{select?.title}</Body>
        <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
          {select?.options.length ? select.options.map((option) => {
            const active = option.value === select.value
            return <Pressable key={option.value} onPress={() => { select.onChange(option.value); setSelect(null) }} style={styles.option}>
              <Body style={[styles.optionText, active && { color: colors.primary }]}>{option.label}</Body>
              {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
            </Pressable>
          }) : <Tiny style={{ paddingVertical: 12 }}>{select?.empty || 'Sem opcoes'}</Tiny>}
        </ScrollView>
      </View>
    </Modal>
  </Screen>
}

function SelectField({ label, value, options, onPress, style, empty }: { label: string; value: string; options: Option[]; onPress: () => void; style?: any; empty?: string }) {
  const option = options.find((item) => item.value === value)
  return <Pressable onPress={onPress} style={[styles.selectField, style]}>
    <Tiny style={styles.selectLabel}>{label}</Tiny>
    <View style={styles.selectLine}>
      <Body numberOfLines={1} style={styles.selectValue}>{option?.label || empty || 'Selecionar'}</Body>
      <Ionicons name="chevron-down" size={18} color={colors.muted} />
    </View>
  </Pressable>
}

function UploadBox({ title, image, onPress, onClear, wide }: { title: string; image: UploadedImage | null; onPress: () => void; onClear: () => void; wide?: boolean }) {
  return <View style={styles.uploadWrap}>
    <Tiny style={styles.selectLabel}>{title}</Tiny>
    <Pressable onPress={onPress} style={[styles.uploadBox, wide && styles.uploadWide]}>
      {image?.uri ? <Image source={{ uri: image.uri }} style={styles.uploadImage} resizeMode="cover" /> : <View style={styles.uploadEmpty}>
        <Ionicons name="add-outline" size={26} color={colors.primary} />
        <Body style={styles.uploadTitle}>Adicionar imagem</Body>
        <Tiny>PNG ou JPG</Tiny>
      </View>}
    </Pressable>
    {image ? <Pressable onPress={onClear}><Tiny style={styles.removeText}>Remover imagem</Tiny></Pressable> : null}
  </View>
}

const styles = StyleSheet.create({
  storyComposer: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: 0, backgroundColor: '#000000' },
  storyToolbar: { height: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#000000' },
  storyToolsRight: { flexDirection: 'row', gap: 10 },
  storyToolButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111820' },
  storyPreview: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505' },
  storyPreviewImage: { width: '100%', height: '100%' },
  storyEmpty: { alignItems: 'center', gap: 9, padding: 30 },
  storyEmptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  storyEmptyText: { color: '#8C969E', textAlign: 'center' },
  storyBottom: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 16, gap: 12, backgroundColor: '#090E13' },
  storyCaptionBox: { minHeight: 54, maxHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 27, backgroundColor: '#1C2329' },
  storyCaptionInput: { flex: 1, maxHeight: 100, paddingVertical: 12, color: '#FFFFFF', fontSize: 16, letterSpacing: 0, textAlignVertical: 'center' },
  storyPublishRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  storyAudience: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 21, backgroundColor: '#151C22' },
  storyAudienceText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  storySend: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FACC15' },
  storySendDisabled: { opacity: 0.55 },
  diarioSection: { gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, backgroundColor: colors.panel2 },
  diarioHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  diarioTitle: { fontSize: 15, fontWeight: '900' },
  addHorarioButton: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 6, paddingHorizontal: 10, backgroundColor: colors.primary },
  addHorarioText: { color: colors.white, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  horarioCard: { gap: 8, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 7, padding: 9, backgroundColor: colors.card },
  horarioCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  horarioIndex: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  horarioIndexText: { fontWeight: '900' },
  removeHorario: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  removeHorarioDisabled: { opacity: 0.25 },
  addHorarioWide: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: colors.primary, borderRadius: 6 },
  addHorarioWideText: { color: colors.primary, fontWeight: '900' },
  card: { gap: 10 },
  formHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 },
  formTitle: { fontWeight: '900', fontSize: 15 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  textAreaSmall: { minHeight: 78, textAlignVertical: 'top' },
  feeBox: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, padding: 12, backgroundColor: colors.panel2 },
  blueLabel: { color: colors.primary, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  feeValue: { marginTop: 4, fontSize: 22, fontWeight: '900' },
  warnBox: { borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 10, backgroundColor: '#FFFBEB' },
  selectField: { minHeight: 52, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 10, backgroundColor: colors.card },
  selectLabel: { fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', color: colors.muted },
  selectLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  selectValue: { flex: 1, fontWeight: '800' },
  uploadWrap: { gap: 6 },
  uploadBox: { width: 130, height: 130, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.panel2 },
  uploadWide: { width: '100%', height: 120 },
  uploadImage: { width: '100%', height: '100%' },
  uploadEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  uploadTitle: { marginTop: 6, fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  removeText: { color: colors.danger, fontWeight: '800' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.35)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '72%', paddingTop: 10, paddingBottom: 24, paddingHorizontal: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.bg },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 99, backgroundColor: colors.border, marginBottom: 10 },
  sheetTitle: { fontWeight: '900', fontSize: 16, marginBottom: 6 },
  optionList: { maxHeight: 420 },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  optionText: { fontWeight: '800' }
})
