// lib/campeonatoService.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function handleUpdatePremiacao(id: string, novoValor: number) {
  try {
    console.log("Tentando atualizar ID:", id, "para:", novoValor);

    if (!id) {
      alert("Erro: ID do campeonato não encontrado no componente.");
      return null;
    }

    // Nomes das colunas verificados na sua image_1e7dd8.png
    const { data, error } = await supabase
      .from('campeonatos') 
      .update({ 
        valor_premiacao: novoValor 
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error("Erro Supabase:", error.message);
      alert("Erro no banco: " + error.message);
      return null;
    }

    if (!data || data.length === 0) {
      // Esse é o erro que apareceu no seu print image_1e7659.png
      console.error("Registro não encontrado para o ID enviado.");
      alert("O banco não encontrou o registro para atualizar. Verifique se o ID está correto.");
      return null;
    }

    alert("Premiação atualizada com sucesso!");
    return data[0];

  } catch (err) {
    console.error("Erro inesperado:", err);
    return null;
  }
}