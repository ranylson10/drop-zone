const img = 'https://images.unsplash.com'

export const mock = {
  campeonatos: [
    { id: '1', nome: 'Copa RedBlue', sigla: 'CRB', tipo: 'Copa', status: 'Aberto', valor: 'R$ 30', meta: '48 vagas • Free Fire • Grupo A', fase: 'Fase 1', grupos: 'A, B, C, D', quedas: '3 quedas', logo_url: `${img}/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=240&q=80`, banner_url: `${img}/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80` },
    { id: '2', nome: 'Xtreino Drop Zone', sigla: 'XDZ', tipo: 'Xtreino', status: 'Hoje', valor: 'R$ 10', meta: '12 equipes • sala competitiva', fase: 'Sala diária', grupos: 'Único', quedas: '3 quedas', logo_url: `${img}/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=240&q=80`, banner_url: `${img}/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=900&q=80` },
    { id: '3', nome: 'Liga Aloe', sigla: 'LA', tipo: 'Liga', status: 'Ao vivo', valor: 'Premiação', meta: 'Classificatória • Grupo A', fase: 'Classificatória', grupos: 'Grupo A', quedas: '12 quedas', logo_url: `${img}/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=240&q=80`, banner_url: `${img}/photo-1616588589676-62b3bd4ff6d2?auto=format&fit=crop&w=900&q=80` },
    { id: '4', nome: 'Confronto K11', sigla: 'K11', tipo: 'Confronto', status: 'Em breve', valor: 'R$ 20', meta: 'Mata-mata • 2 grupos', fase: 'Chaves', grupos: 'A e B', quedas: '4 quedas', logo_url: `${img}/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=240&q=80`, banner_url: `${img}/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80` }
  ],
  equipes: [
    { id: '1', nome: 'ALOE', sigla: 'ALOE', tag: 'ALOE', status: 'Ativa', meta: '3 lines • 18 jogadores', dono: 'Ranilson', line: 'ALOE ACADEMY', logo_url: `${img}/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=240&q=80`, banner_url: `${img}/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=900&q=80` },
    { id: '2', nome: 'TB COPAREDBLUE', sigla: 'TBC', tag: 'TBC', status: 'Competindo', meta: 'Line principal completa', dono: 'Organizador', line: 'Principal', logo_url: `${img}/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=240&q=80`, banner_url: `${img}/photo-1511882150382-421056c89033?auto=format&fit=crop&w=900&q=80` },
    { id: '3', nome: 'Drop Academy', sigla: 'DZA', tag: 'DZA', status: 'Recrutando', meta: 'Aceitando convites', dono: 'Drop Zone', line: 'Base', logo_url: `${img}/photo-1563207153-f403bf289096?auto=format&fit=crop&w=240&q=80`, banner_url: `${img}/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80` },
    { id: '4', nome: 'Fênix Mobile', sigla: 'FM', tag: 'FNX', status: 'Ativa', meta: '2 lines • 9 jogadores', dono: 'Capitão', line: 'Fênix A', logo_url: `${img}/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=240&q=80`, banner_url: `${img}/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=900&q=80` }
  ],
  jogadores: [
    { id: '1', nick: 'blackxl', sigla: 'BX', funcao: 'Rush', status: 'Disponível', meta: 'Free Fire • 28 kills na semana', servidor: 'BR', equipe: 'Sem equipe', foto_url: `${img}/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80` },
    { id: '2', nick: 'SIXgg', sigla: 'SX', funcao: 'Suporte', status: 'Em equipe', meta: 'Free Fire • MVP recente', servidor: 'BR', equipe: 'ALOE', foto_url: `${img}/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=240&q=80` },
    { id: '3', nick: 'PlayerOne', sigla: 'PO', funcao: 'IGL', status: 'Aberto', meta: 'Belém/PA • Mobile', servidor: 'BR', equipe: 'Drop Academy', foto_url: `${img}/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80` },
    { id: '4', nick: 'RUSH7', sigla: 'R7', funcao: 'Rush', status: 'Treino', meta: 'Free Fire • 14 abates', servidor: 'BR', equipe: 'Fênix Mobile', foto_url: `${img}/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80` }
  ],
  eventos: [
    { id: '1', titulo: 'Copa RedBlue - Grupo A', horario: 'Hoje • 20:00', meta: '3 quedas • Bermuda, Purgatório, Kalahari', logo: 'CRB', logo_url: `${img}/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=240&q=80` },
    { id: '2', titulo: 'Fechamento de inscrições', horario: 'Amanhã • 18:00', meta: 'Último dia para pagamento da vaga', logo: 'DZ', logo_url: `${img}/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=240&q=80` },
    { id: '3', titulo: 'Final semanal', horario: 'Domingo • 21:00', meta: 'Transmissão com overlays Drop Zone', logo: 'LA', logo_url: `${img}/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=240&q=80` }
  ],
  posts: [
    { id: '1', autor: 'Drop Zone', logo: 'DZ', titulo: 'Nova temporada aberta', texto: 'Inscrições liberadas para campeonatos, equipes e jogadores.', likes: 128, logo_url: `${img}/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=240&q=80`, image_url: `${img}/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80` },
    { id: '2', autor: 'Liga Aloe', logo: 'LA', titulo: 'Tabela atualizada', texto: 'Classificação geral e MVP disponíveis no feed competitivo.', likes: 86, logo_url: `${img}/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=240&q=80`, image_url: `${img}/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=900&q=80` },
    { id: '3', autor: 'ALOE', logo: 'ALOE', titulo: 'Recrutamento aberto', texto: 'Line academy com seletiva para rush e suporte.', likes: 45, logo_url: `${img}/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=240&q=80`, image_url: `${img}/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80` }
  ],
  conversas: [
    { id: '1', nome: 'Organizador Copa RedBlue', logo: 'CRB', logo_url: `${img}/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=240&q=80`, ultima: 'Sua inscrição foi recebida.', hora: '12:40', unread: 2 },
    { id: '2', nome: 'Equipe ALOE', logo: 'ALOE', logo_url: `${img}/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=240&q=80`, ultima: 'Convite enviado para a line principal.', hora: '10:15', unread: 1 },
    { id: '3', nome: 'Suporte Drop Zone', logo: 'DZ', logo_url: `${img}/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=240&q=80`, ultima: 'Como podemos ajudar?', hora: 'Ontem', unread: 0 }
  ],
  carteira: [
    { id: '1', titulo: 'Saldo disponível', valor: 'R$ 0,00', meta: 'Carteira em modo visual' },
    { id: '2', titulo: 'Vaga pendente', valor: 'R$ 30,00', meta: 'Copa RedBlue aguardando confirmação' },
    { id: '3', titulo: 'Histórico', valor: '0', meta: 'PIX, PayPal e saldo interno entrarão aqui' }
  ]
}
