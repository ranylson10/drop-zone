import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Sua chave da API do YouTube
const YOUTUBE_API_KEY = "AIzaSyCztzxECgybEw0ppduszBPnkB6KOUA-_mM"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { data: watchParties } = await supabase
      .from('campeonato_watch_parties')
      .select('id, url_live')

    for (const party of watchParties || []) {
      const videoId = party.url_live.split('v=')[1]?.split('&')[0] || party.url_live.split('/').pop();

      if (videoId) {
        // Adicionei 'snippet' no part para saber se a live acabou
        const ytResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`)
        const ytData = await ytResponse.json()

        if (ytData.items?.[0]) {
          const item = ytData.items[0];
          
          // Dados que você já tinha
          const viewers = parseInt(item.liveStreamingDetails?.concurrentViewers || "0")
          const likes = parseInt(item.statistics?.likeCount || "0")
          
          // NOVOS DADOS: Total de visualizações e se ainda está ao vivo
          const totalViews = parseInt(item.statistics?.viewCount || "0")
          const isLive = item.snippet?.liveBroadcastContent === 'live'

          // Atualiza o banco incluindo as novas colunas
          await supabase
            .from('campeonato_watch_parties')
            .update({ 
              viewers_manual: isLive ? viewers : 0, 
              likes_atual: likes,
              views_totais: totalViews, // Agora o banco vai receber o número total
              is_live: isLive           // Agora o banco vai saber se encerrou
            })
            .eq('id', party.id)
        }
      }
    }
    return new Response(JSON.stringify({ done: true }), { headers: { "Content-Type": "application/json" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})