Projeto preservado com o layout atual e ajustes mínimos na base para começar a usar o Supabase novo.

O que foi ajustado no código:
- lib/supabase.ts agora aceita as variáveis novas e antigas
- app/page.tsx redireciona para /feed
- login cria/garante o profile base no banco novo
- cadastro cria a conta e garante o profile base no banco novo
- PerfilContext agora usa as tabelas novas: profiles, perfis_jogo, equipes.criado_por, produtoras.dono_id
- troca de contexto não recarrega a página inteira
- adicionado .env.example
- adicionado db/003_legacy_compatibility_layer.sql para reduzir o impacto do schema novo no projeto antigo

IMPORTANTE:
- Este patch não reescreve o projeto inteiro. Ele prepara a base para a migração sem desmontar o layout.
- Muitas telas antigas ainda consultam campos/tabelas legadas. Por isso foi criada a camada de compatibilidade SQL.
- O próximo passo ideal é aplicar o SQL 003 no Supabase novo e depois testar: login, cadastro, feed, perfil, equipe e produtora.
