delete from public.story_curtidas older
using public.story_curtidas newer
where older.story_id = newer.story_id
  and older.user_id = newer.user_id
  and older.id < newer.id;

delete from public.story_visualizacoes older
using public.story_visualizacoes newer
where older.story_id = newer.story_id
  and older.user_id = newer.user_id
  and older.user_id is not null
  and older.id < newer.id;

create unique index if not exists story_curtidas_story_user_key
  on public.story_curtidas (story_id, user_id);

create unique index if not exists story_visualizacoes_story_user_key
  on public.story_visualizacoes (story_id, user_id);
