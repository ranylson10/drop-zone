type AnyRow = Record<string, any>

const first = (row: AnyRow, keys: string[], fallback: any = '') => {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return fallback
}

const money = (value: any) => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'string' && value.includes('R$')) return value
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  return `R$ ${number.toFixed(2).replace('.', ',')}`
}

export function normalizeChampionship(row: AnyRow) {
  const vagas = first(row, ['vagas', 'limite_equipes', 'max_equipes', 'slots'])
  const formato = first(row, ['formato', 'grupo', 'fase', 'tipo_campeonato', 'tipo'])
  const valor = money(first(row, ['valor', 'valor_vaga', 'preco', 'taxa_inscricao']))
  return {
    ...row,
    id: first(row, ['id', 'uuid', 'slug', 'nome']),
    nome: first(row, ['nome', 'titulo', 'name'], 'Campeonato'),
    sigla: first(row, ['sigla', 'tag', 'codigo']),
    status: first(row, ['status', 'situacao', 'estado'], 'ativo'),
    valor,
    meta: [vagas ? `${vagas} vagas` : '', valor, formato].filter(Boolean).join(' • '),
    logo_url: first(row, ['logo_url', 'logo', 'imagem_logo', 'logo_path', 'imagem_url']),
    banner_url: first(row, ['banner_url', 'capa_url', 'imagem_capa', 'cover_url', 'imagem_url'])
  }
}

export function normalizeTeam(row: AnyRow) {
  const lines = first(row, ['lines_count', 'linhas_count', 'qtd_lines', 'lines'])
  const players = first(row, ['players_count', 'jogadores_count', 'qtd_jogadores', 'jogadores'])
  return {
    ...row,
    id: first(row, ['id', 'uuid', 'slug', 'nome']),
    nome: first(row, ['nome', 'name', 'titulo'], 'Equipe'),
    sigla: first(row, ['sigla', 'tag', 'codigo']),
    tag: first(row, ['tag', 'sigla', 'codigo']),
    status: first(row, ['status', 'situacao', 'estado'], 'ativa'),
    meta: [lines ? `${lines} lines` : '', players ? `${players} jogadores` : '', first(row, ['line', 'line_principal', 'categoria'])].filter(Boolean).join(' • '),
    logo_url: first(row, ['logo_url', 'avatar_url', 'imagem_logo', 'logo', 'imagem_url']),
    banner_url: first(row, ['banner_url', 'capa_url', 'cover_url', 'imagem_capa'])
  }
}

export function normalizePlayer(row: AnyRow) {
  const kills = first(row, ['kills', 'abates', 'kills_semana'])
  const equipe = row?.equipes || row?.equipe || null
  const equipeNome = first(equipe || {}, ['nome', 'name', 'tag']) || first(row, ['equipe', 'equipe_nome', 'team_name'])
  return {
    ...row,
    id: first(row, ['id', 'uuid', 'slug', 'user_id', 'nick']),
    nick: first(row, ['nick', 'nickname', 'nome_jogo', 'nome', 'username'], 'Jogador'),
    sigla: first(row, ['sigla', 'tag']),
    funcao: first(row, ['funcao', 'role', 'posicao'], 'Função'),
    status: first(row, ['status', 'situacao'], 'perfil'),
    equipe: equipeNome,
    meta: [equipeNome, first(row, ['funcao', 'role', 'posicao']), kills ? `${kills} kills` : ''].filter(Boolean).join(' • '),
    foto_url: first(row, ['foto_capa', 'foto_url', 'avatar_url', 'imagem_url', 'photo_url'])
  }
}

export function normalizePost(row: AnyRow) {
  return {
    ...row,
    id: first(row, ['id', 'uuid', 'slug']),
    autor: first(row, ['autor', 'autor_nome', 'author_name', 'perfil_nome', 'nome', 'autor_tipo'], 'Drop Zone'),
    logo: first(row, ['logo', 'sigla', 'tag'], 'DZ'),
    titulo: first(row, ['titulo', 'title'], 'Publicacao'),
    texto: first(row, ['texto', 'conteudo', 'content', 'descricao', 'body']),
    likes: first(row, ['likes', 'curtidas_count', 'curtidas'], 0),
    comentarios: first(row, ['comentarios_count', 'comentarios'], 0),
    logo_url: first(row, ['logo_url', 'avatar_url', 'author_avatar']),
    image_url: first(row, ['image_url', 'imagem_url', 'foto_url', 'midia_url', 'media_url'])
  }
}

export function normalizeConversation(row: AnyRow) {
  return {
    ...row,
    id: first(row, ['id', 'uuid', 'slug']),
    nome: first(row, ['nome', 'titulo', 'name'], 'Conversa'),
    logo: first(row, ['logo', 'sigla', 'tag'], 'DZ'),
    ultima: first(row, ['ultima', 'ultima_mensagem', 'last_message', 'mensagem'], 'Sem mensagens ainda'),
    hora: first(row, ['hora', 'updated_at', 'created_at'], ''),
    unread: Number(first(row, ['unread', 'nao_lidas', 'unread_count'], 0)),
    logo_url: first(row, ['logo_url', 'avatar_url', 'imagem_url'])
  }
}

export function normalizeCalendar(row: AnyRow) {
  return {
    ...row,
    id: first(row, ['id', 'uuid', 'slug']),
    titulo: first(row, ['titulo', 'nome', 'campeonato_nome', 'title'], 'Evento'),
    horario: first(row, ['horario', 'data_hora', 'data_inicio', 'starts_at', 'created_at'], 'Agendado'),
    meta: [first(row, ['rodada', 'fase', 'grupo']), first(row, ['mapas', 'descricao', 'status'])].filter(Boolean).join(' • '),
    logo: first(row, ['logo', 'sigla', 'tag'], 'DZ'),
    logo_url: first(row, ['logo_url', 'imagem_url', 'campeonato_logo'])
  }
}

export function normalizeWallet(row: AnyRow) {
  const valor = money(first(row, ['valor', 'amount', 'preco']))
  return {
    ...row,
    id: first(row, ['id', 'uuid', 'slug']),
    titulo: first(row, ['titulo', 'tipo', 'descricao', 'description'], 'Movimentação'),
    valor,
    meta: first(row, ['meta', 'status', 'created_at', 'data'], '')
  }
}
