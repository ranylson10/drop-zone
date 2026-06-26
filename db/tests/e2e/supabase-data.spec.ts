import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { env } from '../helpers/env';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  test.skip(!url || !key, 'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para testar vínculo com banco.');
  return createClient(url!, key!);
}

test.describe('diagnóstico dos dados do Supabase usados nas overlays', () => {
  test('fontes principais das overlays respondem para o campeonato', async ({}, testInfo) => {
    const supabase = getSupabase();
    const report: Record<string, unknown> = {};

    const classificacao = await supabase
      .from('classificacao_geral')
      .select('campeonato_id,equipe_id,nome,total_pontos,total_abates,booyahs,partidas')
      .eq('campeonato_id', env.campeonatoId)
      .limit(20);
    report.classificacao_geral = { error: classificacao.error?.message, count: classificacao.data?.length || 0, sample: classificacao.data?.slice(0, 3) };

    const resultadosJogos = await supabase
      .from('resultados_jogos')
      .select('campeonato_id,jogo_id,equipe_id,mapa,posicao,abates,total_pontos')
      .eq('campeonato_id', env.campeonatoId)
      .limit(20);
    report.resultados_jogos = { error: resultadosJogos.error?.message, count: resultadosJogos.data?.length || 0, sample: resultadosJogos.data?.slice(0, 3) };

    const resultadosMvp = await supabase
      .from('resultados_mvp')
      .select('campeonato_id,jogo_id,mapa,equipe_id,nick_snapshot,abates,dano,jogador_campeonato_id,jogador_avulso_id,perfil_jogo_id')
      .eq('campeonato_id', env.campeonatoId)
      .limit(20);
    report.resultados_mvp = { error: resultadosMvp.error?.message, count: resultadosMvp.data?.length || 0, sample: resultadosMvp.data?.slice(0, 3) };

    await testInfo.attach('supabase-overlay-data-report', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });

    expect(classificacao.error?.message || '').toBe('');
    expect(resultadosJogos.error?.message || '').toBe('');
    expect(resultadosMvp.error?.message || '').toBe('');

    if (env.strictDb) {
      expect(classificacao.data?.length || 0, 'classificacao_geral sem dados').toBeGreaterThan(0);
      expect(resultadosJogos.data?.length || 0, 'resultados_jogos sem dados').toBeGreaterThan(0);
      expect(resultadosMvp.data?.length || 0, 'resultados_mvp sem dados').toBeGreaterThan(0);
    }
  });
});
