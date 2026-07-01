/**
 * Tipagem para as estatísticas individuais de cada jogador.
 */
export interface JogadorEstatistica {
  nome: string;
  id_game: string;
  kills: number;
}

/**
 * Estrutura da equipe após o processamento do arquivo MatchResult.txt.
 */
export interface EquipeProcessada {
  nome_equipe: string;
  posicao: number;
  abates_total: number;
  jogadores: JogadorEstatistica[];
}

/**
 * Processa o conteúdo do arquivo MatchResult.txt gerado pelo SPEC.
 * Extrai Rank, KillScore e abates individuais por jogador.
 */
export function parseMatchResult(text: string): EquipeProcessada[] {
  if (!text) return [];

  const linhas = text.split('\n');
  const resultados: EquipeProcessada[] = [];
  let equipeAtual: EquipeProcessada | null = null;

  linhas.forEach(linha => {
    const linhaLimpa = linha.trim();
    if (!linhaLimpa) return;

    // 1. Detecta o cabeçalho da Equipe (TeamName, Rank, KillScore)
    const teamMatch = linhaLimpa.match(/TeamName:\s*(.*?)\s*Rank:\s*(\d+)\s*KillScore:\s*(\d+)/i);
    
    if (teamMatch) {
      if (equipeAtual) resultados.push(equipeAtual);

      equipeAtual = {
        nome_equipe: teamMatch[1].trim(),
        posicao: parseInt(teamMatch[2], 10),
        abates_total: parseInt(teamMatch[3], 10),
        jogadores: []
      };
      return;
    }

    // 2. Detecta os jogadores vinculados à equipe acima (NAME, ID, KILL)
    const playerMatch = linhaLimpa.match(/NAME:\s*(.*?)\s*ID:\s*(\d+)\s*KILL:\s*(\d+)/i);
    
    if (playerMatch && equipeAtual) {
      equipeAtual.jogadores.push({
        nome: playerMatch[1].trim(),
        id_game: playerMatch[2],
        kills: parseInt(playerMatch[3], 10)
      });
    }
  });

  if (equipeAtual) resultados.push(equipeAtual);

  // Retorna a classificação da partida ordenada do 1º ao último
  return resultados.sort((a, b) => a.posicao - b.posicao);
}

/**
 * Calcula os pontos totais de uma equipe em uma queda específica.
 */
export function calcularPontosQueda(
  posicao: number, 
  abates: number, 
  tabelaPontos: Record<number, number>, 
  pontosPorKill: number = 1
) {
  const ptsPosicao = tabelaPontos[posicao] ?? 0;
  const ptsAbates = (abates || 0) * pontosPorKill;
  
  return {
    ptsPosicao,
    ptsAbates,
    total: ptsPosicao + ptsAbates
  };
}