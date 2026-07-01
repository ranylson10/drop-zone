# Esquema do Projeto para Revisao

Este documento descreve o sistema em linguagem normal, separado por areas do produto. A ideia e facilitar a revisao de telas, formularios, permissoes e regras que precisam ser ajustadas.

## Estrutura Geral

O projeto agora esta dividido em tres partes principais.

Backend/API:
Fica dentro de `web/app/api`. E responsavel por login via API, cadastro via API, pagamentos, carteira, webhooks, inscricoes, rotas mobile e integracoes com Supabase.

Site Web:
Fica dentro de `web/app`. Contem o site completo, painel administrativo, paginas de campeonato, equipes, perfil, carteira, stream, transparencia e cadastro.

App Mobile:
Fica dentro de `mobile/app`. Contem as telas mobile de login, cadastro, feed, campeonatos, equipes, calendario, chat, carteira, perfil, produtora e criacao.

## Paginas de Autenticacao

Pagina de login web:
Caminho: `/login`

Serve para o usuario entrar na conta.

Campos principais:
- E-mail.
- Senha.

Acoes:
- Entrar.
- Ir para cadastro.
- Ir para recuperacao de senha.

Pagina de cadastro web:
Caminho: `/cadastro`

Serve para criar uma nova conta.

Campos principais:
- Nome de usuario ou nick.
- E-mail.
- Senha.
- Confirmar senha.

Acoes:
- Criar conta.
- Redirecionar para confirmacao de e-mail/codigo.

Pagina de confirmacao:
Caminho: `/confirmar`

Serve para confirmar cadastro ou codigo enviado.

Campos esperados:
- Codigo de confirmacao, quando usado.
- Dados vindos da URL, como e-mail e username.

Pagina de recuperar senha:
Caminho: `/recuperar`

Serve para solicitar recuperacao de senha.

Campos principais:
- E-mail.

Mobile login:
Caminho: `mobile/app/(auth)/login.tsx`

Campos principais:
- E-mail.
- Senha.

Acoes:
- Entrar com e-mail e senha.
- Entrar com login social.
- Ir para recuperar senha.
- Ir para criar conta.

Mobile criar conta:
Caminho: `mobile/app/(auth)/criar-conta.tsx`

Campos principais:
- Nome.
- E-mail.
- Senha.
- Confirmar senha.

Acoes:
- Criar conta.
- Criar conta com login social.

Mobile recuperar senha:
Caminho: `mobile/app/(auth)/recuperar.tsx`

Campos principais:
- E-mail.

## Paginas de Feed e Social

Pagina de feed web:
Caminho: `/feed`

Serve como area inicial/social do usuario.

Recursos principais:
- Lista de posts/stories.
- Comentarios.
- Curtidas.
- Reposts.
- Cards automaticos de campeonatos, partidas e rankings.

Campos encontrados:
- Campo de comentario.
- Campo de legenda para story/post.
- Busca ou filtros internos, dependendo da aba.

Feed mobile:
Caminho: `mobile/app/(tabs)/feed.tsx`

Recursos principais:
- Stories.
- Curtidas.
- Comentarios.
- Reposts.
- Cards automaticos.

Campos principais:
- Comentario do story.
- Legenda de post/story.

## Paginas de Campeonatos

Pagina de listagem de campeonatos web:
Caminho: `/campeonatos`

Serve para listar campeonatos disponiveis.

Campos/filtros principais:
- Busca por campeonato.
- Filtros por tipo ou categoria, quando disponiveis.

Paginas de categorias de campeonatos:
Caminhos:
- `/campeonatos/diarios`
- `/campeonatos/copas`
- `/campeonatos/ligas`
- `/campeonatos/4x4`
- `/campeonatos/confrontos`
- `/campeonatos/xtreinos`

Servem para separar campeonatos por tipo.

Pagina de detalhe do campeonato web:
Caminho: `/campeonatos/:id`

Serve para visualizar e gerenciar um campeonato.

Areas principais:
- Informacoes do campeonato.
- Equipes inscritas.
- Jogadores.
- Grupos.
- Fases.
- Jogos.
- Pontuacao.
- Sumula.
- MVP.
- Sorteador de mapas.
- Watch party.

Campos principais encontrados nas areas de gestao:
- Nome da fase.
- Tipo da fase.
- Nome do grupo.
- Quantidade de slots.
- Quantidade de quedas.
- Horario de inicio.
- Valor de inscricao.
- Premiacao.
- Selecionar equipe.
- Selecionar grupo.
- Data do jogo.
- Hora do jogo.
- Melhor de / MD.
- Posicao.
- Abates.
- Total de pontos.
- Jogador MVP.
- Nick de jogador avulso.
- UID de jogador.
- Funcao.
- Foto/avatar.

Pagina editar campeonato:
Caminho: `/campeonatos/:id/editar`

Serve para alterar dados do campeonato existente.

Campos esperados:
- Nome.
- Descricao/regras.
- Data de inicio.
- Tipo de competicao.
- Modalidade.
- Vagas.
- Valor de vaga.
- Premiacao.
- Banner/logo.
- Configuracoes de inscricao.

Pagina criar campeonato web:
Caminho: `/campeonatos/nova`

Serve como entrada para criar campeonatos.

Subpaginas de criacao:
- `/campeonatos/nova/diario`
- `/campeonatos/nova/copa`
- `/campeonatos/nova/liga`
- `/campeonatos/nova/4x4`
- `/campeonatos/nova/confronto`
- `/campeonatos/nova/apostado`
- `/campeonatos/nova/xtreino`

Campos comuns de criacao:
- Produtora.
- Logo do campeonato.
- Banner do campeonato.
- Nome.
- Edicao.
- Data de inicio.
- Tipo de campeonato.
- Plataforma.
- Categoria.
- Servidor/regiao.
- Modo de jogo.
- Vagas.
- Valor por vaga.
- Premiacao.
- Pontos por abate.
- Quantidade de quedas.
- Equipes por jogo.
- Rodadas.
- Criterio de desempate.
- Sistema de pontos.
- WhatsApp de suporte.
- Forma de pagamento da taxa.

Campos especificos de campeonato diario:
- Horario.
- Nome do horario.
- Vagas por horario.
- Quedas por horario.
- Valor da vaga por horario.
- Premiacao por horario.

Campeonatos mobile:
Caminho: `mobile/app/(tabs)/campeonatos.tsx`

Serve para listar campeonatos no app.

Campos/filtros:
- Buscar campeonato, produtora ou servidor.
- Premio minimo.
- Premio maximo.
- Inscricao ate determinado valor.

Detalhe do campeonato mobile:
Caminho: `mobile/app/campeonato/[id].tsx`

Serve para ver e gerenciar campeonato pelo app.

Campos principais:
- Nick do jogador avulso.
- ID do jogo.
- ID de perfil existente.
- Nome da fase.
- Nome do grupo.
- Quantidade de slots.
- Horario de inicio.
- Status do grupo.
- Abates.
- Upload de avatar.
- Importacao de arquivo de resultados.

## Paginas de Equipes

Pagina de equipes web:
Caminho: `/equipe`

Serve para listar equipes e lines.

Campos/filtros:
- Buscar equipe.
- Buscar line.
- Buscar por tipo ou tag, dependendo da aba.

Pagina criar equipe web:
Caminho: `/equipe/nova`

Serve para criar uma equipe.

Campos esperados:
- Nome da equipe.
- Tag.
- Logo.
- Capa.
- Cidade.
- Estado.
- Pais.
- Data de fundacao.
- Descricao.

Pagina detalhe da equipe web:
Caminho: `/equipe/:id`

Areas principais:
- Agenda.
- Campeonatos.
- Jogadores.
- Lideres.
- Lines.
- Convites.

Campos encontrados:
- Buscar jogador/perfil por nick.
- Mensagem opcional para convite.
- Selecionar lider.
- Nome da line.
- Upload de logo da line.
- Tipo da line.
- Visibilidade.
- Plataforma.
- Selecionar jogador para slot.
- Funcao na line.

Pagina editar equipe:
Caminho: `/equipe/:id/editar`

Campos esperados:
- Nome.
- Tag.
- Logo.
- Capa.
- Dados de localizacao.
- Descricao.

Equipes mobile:
Caminho: `mobile/app/(tabs)/equipes.tsx`

Serve para listar equipes e lines.

Campos/filtros:
- Buscar equipe ou tag.
- Buscar line.

Detalhe de equipe mobile:
Caminho: `mobile/app/equipe/[id].tsx`

Campos principais:
- Nome da nova line.
- Upload de logo.
- Selecionar line para aplicar em vaga.
- Selecionar jogadores.

Componente mobile de roster:
Caminho: `mobile/src/components/TeamRosterManager.tsx`

Campos principais:
- Pesquisar perfil de jogo por nick.
- Buscar line por nome.
- Nome da line.
- Upload de logo da line.

## Paginas de Jogadores e Perfil Gamer

Pagina de jogadores web:
Caminho: `/jogadores`

Serve para listar jogadores.

Campos/filtros:
- Buscar jogador.
- Filtros por perfil, quando disponiveis.

Pagina detalhe do jogador:
Caminho: `/jogadores/:id`

Serve para ver perfil competitivo do jogador.

Acoes:
- Convidar para equipe.
- Abrir chat.

Campos envolvidos:
- Selecionar equipe para convite.
- Mensagem opcional.

Perfil web:
Caminho: `/perfil`

Serve para o usuario editar e visualizar seu perfil.

Campos principais:
- Foto/avatar.
- Capa.
- Nome de exibicao.
- Username.
- Localidade.
- Cidade.
- Estado.
- Pais.
- Biografia gamer.

Aba gamer do perfil:
Caminho aproximado: `web/app/perfil/tabs/TabGamer.tsx`

Campos principais:
- Nick.
- UID do jogo.
- Plataforma.
- Funcao.
- Cargo.
- Servidor.
- Foto do perfil gamer.
- Zoom da foto.
- Posicao X/Y da foto.
- Buscar equipe para pedido.
- Mensagem opcional.

Atuacao profissional:
Caminho: `/perfil/atuacao`

Serve para configurar atuacao como caster, narrador, streamer ou funcao parecida.

Campos principais:
- Buscar funcao.
- Titulo profissional.
- Valor base.
- Bio/experiencia.
- Setup.
- Contato preferencial.
- Dia da semana.
- Hora inicio.
- Hora fim.

Mobile meu perfil:
Caminho: `mobile/app/meu-perfil.tsx`

Serve para visualizar dados do usuario, perfis de jogo, equipes, lines, produtoras e campeonatos criados.

Mobile jogadores:
Caminho: `mobile/app/(tabs)/jogadores.tsx`

Campos/filtros:
- Buscar nick.
- Buscar nos meus perfis.

Criar perfil gamer no mobile:
Caminho: `mobile/app/criar/[tipo].tsx`

Campos principais:
- Foto do perfil.
- Nick.
- ID de jogo / UID.
- Servidor.
- Plataforma.
- Funcao.
- Cargo.
- Biografia.

## Paginas de Produtoras

Pagina de produtoras web:
Caminho: `/produtora`

Serve para listar produtoras.

Campos/filtros:
- Filtrar por nome.
- Filtrar por slug.
- Filtrar por ID.

Pagina criar produtora web:
Caminho: `/produtora/nova`

Campos esperados:
- Nome.
- Slug.
- Logo.
- Descricao.
- WhatsApp suporte.
- Instagram.
- Discord.

Pagina detalhe da produtora:
Caminho: `/produtora/:id`

Areas principais:
- Dados da produtora.
- Campeonatos.
- Membros.
- Convites.

Campos principais:
- Buscar usuario por nome ou username.
- Mensagem opcional para convite.
- Selecionar permissao/cargo.

Gestao da produtora:
Caminho: `/produtora/:id/gestao`

Campos principais:
- Buscar membro.
- Mensagem de convite.
- Definir lideres.
- Vincular lider a campeonatos.

Config da produtora:
Caminho: `/produtora/config`

Campos esperados:
- Dados publicos.
- Configuracoes de contato.
- Preferencias operacionais.

Produtoras mobile:
Caminhos:
- `mobile/app/produtoras.tsx`
- `mobile/app/produtora/[id].tsx`
- `mobile/app/criar/produtora.tsx`

Campos principais:
- Buscar produtora, slug ou descricao.
- Buscar usuario por nome ou username.
- Mensagem opcional.
- Nome da produtora.
- Logo.
- WhatsApp suporte.
- Instagram URL.
- Discord URL.
- Descricao.

## Paginas de Carteira, Pagamentos e KYC

Carteira web:
Caminho: `/carteira`

Serve para saldo, dados de pagamento, KYC e movimentacoes.

Campos principais:
- Nome completo.
- CPF.
- Telefone.
- Maioridade.
- Aceite de termos.
- Tipo de documento.
- Numero do documento.
- Orgao emissor.
- UF.
- Chave Pix.
- Tipo de chave Pix.

Deposito:
Caminho: `/carteira/deposito`

Campos principais:
- Valor do deposito.

Saque:
Caminho: `/carteira/saque`

Campos principais:
- Valor do saque.
- Chave Pix.
- Tipo de chave Pix.

Comprovante:
Caminho: `/carteira/comprovante/:id`

Serve para visualizar comprovante/transacao.

Perfil pagamento:
Caminho: `/perfil/pagamento`

Campos principais:
- Nome completo.
- CPF.
- Telefone.
- Data de nascimento.
- Chave Pix.
- Tipo de chave Pix.
- Tipo de documento.
- Numero do documento.
- Orgao emissor.
- UF.
- Dados de endereco/documento, quando exigidos.
- Confirmacao de maioridade.
- Aceite dos termos.

KYC selfie:
Caminho: `/kyc/selfie`

Serve para envio/verificacao de selfie.

Campos/acoes:
- Captura ou envio de selfie.
- Confirmacao de identidade.

Carteira mobile:
Caminho: `mobile/app/(tabs)/carteira.tsx`

Campos principais:
- Valor em R$.
- Tipo da chave Pix.
- Chave Pix.

Acoes:
- Depositar.
- Solicitar saque.
- Salvar dados Pix.

## Paginas de Calendario e Agenda

Calendario web:
Caminho: `/calendario`

Serve para ver jogos, tarefas e eventos.

Campos principais:
- Buscar jogo ou fase.
- Titulo da tarefa.
- Tipo da tarefa/evento.
- Descricao opcional.
- Data.
- Hora.
- Duracao.
- Responsavel, quando disponivel.

Calendario mobile:
Caminho: `mobile/app/(tabs)/calendario.tsx`

Campos principais:
- Buscar campeonato, equipe ou jogador.
- Nome da tarefa.
- Descricao completa.
- Duracao em minutos.

## Paginas de Chat

Chat web:
Caminho: `/chat`

Campos principais:
- Buscar perfil ou conversa.
- Mensagem.

Chat global:
Componente: `web/app/components/ChatGlobal.tsx`

Campos principais:
- Digite uma mensagem.

Chat mobile:
Caminhos:
- `mobile/app/(tabs)/chat.tsx`
- `mobile/app/chat/[id].tsx`

Campos principais:
- Pesquisar conversas.
- Mensagem.

## Paginas de Confrontos e Apostados

Confrontos web:
Caminhos:
- `/confrontos`
- `/confrontos/nova`
- `/confrontos/:id`
- `/confrontos/admin`
- `/confrontos/admin/:id`
- `/confrontos/ranking`
- `/confrontos/perfil/:id`

Campos principais:
- Nome da fase.
- Tipo da fase.
- Selecionar equipe 1.
- Selecionar equipe 2.
- Data.
- Hora.
- Melhor de / MD.
- Rounds equipe A.
- Rounds equipe B.
- Abates por jogador.

Apostados:
Caminhos:
- `/apostados`
- `/apostados/:id`
- `/apostados/moderador`

Campos principais:
- Nome/lobby.
- Buscar nick, UID ou equipe.
- Abates por jogador.
- Correcao de partidas equipe A.
- Correcao de partidas equipe B.
- Rounds equipe A.
- Rounds equipe B.

## Paginas de Transparencia e Denuncias

Transparencia:
Caminho: `/transparencia`

Serve para ver denuncias publicas e abrir nova denuncia.

Campos principais:
- Busca por campeonato.
- Tipo do alvo.
- Nome ou ID do alvo.
- Categoria.
- Prioridade.
- Titulo/resumo curto.
- Descricao detalhada.
- Anexos/provas.
- Exibir publicamente.
- Ocultar nome no publico.

Minhas denuncias:
Caminho: `/transparencia/minhas`

Serve para listar denuncias feitas pelo usuario.

Detalhe da denuncia:
Caminho: `/transparencia/denuncia/:id`

Serve para acompanhar uma denuncia.

Denunciar:
Caminho: `/denunciar`

Campos principais:
- Tipo do alvo.
- ID do alvo.
- Categoria.
- Prioridade.
- Titulo.
- Descricao.
- Publica.
- Anonima para publico.

Admin denuncias:
Caminhos:
- `/admin/denuncias`
- `/admin/denuncias/:id`

Campos/acoes:
- Filtros.
- Analise.
- Moderacao.
- Resposta.

## Paginas Administrativas

Admin geral:
Caminho: `/admin`

Serve como painel inicial.

Usuarios:
Caminho: `/admin/usuarios`

Campos/filtros:
- Buscar usuario por nome, e-mail ou ID.

Acoes:
- Bloquear.
- Desbloquear.

Administradores:
Caminho: `/admin/administradores`

Campos esperados:
- Buscar usuario.
- Definir perfil administrativo.
- Ativar/desativar permissao.

Produtoras admin:
Caminho: `/admin/produtoras`

Campos/filtros:
- Buscar por nome.
- Buscar por slug.
- Buscar por dono.
- Buscar por ID.

Moderacao:
Caminhos:
- `/admin/moderacao`
- `/admin/moderacao/:id`

Campos principais:
- Buscar por titulo, descricao, tipo, origem ou usuario.
- Mensagem da moderacao.
- Prova/evidencia.

Configuracoes de pagamento:
Caminho: `/admin/configuracoes/pagamentos`

Campos esperados:
- Credenciais de provedor.
- Tokens.
- Chaves publicas/privadas.
- Status de integracao.

Configuracoes de taxas:
Caminho: `/admin/configuracoes/taxas`

Campos esperados:
- Tipo de taxa.
- Valor.
- Status ativo/inativo.
- Ordem.

Financeiro depositos:
Caminho: `/admin/financeiro/depositos`

Serve para revisar depositos.

KYC admin:
Caminho: `/admin/kyc`

Serve para revisar documentos e validacoes.

Auditoria:
Caminho: `/admin/auditoria`

Serve para revisar logs e acoes.

Antifraude:
Caminho: `/admin/antifraude`

Serve para revisar suspeitas, bloqueios e scores.

Diagnostico:
Caminho: `/admin/diagnostico`

Serve para testes e verificacoes internas.

## Paginas de Stream e Overlays

Stream:
Caminho: `/stream`

Serve como entrada para recursos de transmissao.

Projetos de stream:
Caminho: `/stream/projects`

Serve para listar projetos.

Editor de stream:
Caminho: `/stream/editor/:projectId`

Serve para configurar overlays.

Campos principais:
- Upload de imagens.
- Imagem de arte.
- Background de mapa.
- Background de faixa de nome.
- Background de estatisticas.
- Imagem de countdown.
- Logo do campeonato.
- Habilitar/desabilitar marca.
- Texto da marca.
- Cores.
- Tamanho.
- Posicao.
- Colunas visiveis.
- Animacao de entrada.
- Linha destaque.
- Configuracoes de tabela.

Controle de stream:
Caminho: `/stream/controller`

Campos principais:
- Host OBS.
- Porta OBS.
- Senha OBS WebSocket.
- Chave do projeto.
- Nome para aparecer no painel.

Painel do controlador:
Caminho: `/stream/controller/panel/:producerKey`

Serve para controlar overlays com uma chave.

Outras rotas de stream:
- `/stream/control/:id`
- `/stream/render/:overlayId`
- `/stream/studio/:key`
- `/stream/overlay/:key`
- `/stream/overlay/:key/:overlayType`
- `/stream/overlay/:key/scoreboard`
- `/stream/pontuador`

Campos principais:
- Selecionar equipe.
- Chaves de acesso.
- Botoes de cena/overlay.

## Paginas de Pontuador, Inscricao e Escala

Pontuador por token:
Caminho: `/pontuador/:token`

Serve para pontuador externo informar resultado.

Campos esperados:
- Mapa/queda.
- Equipe.
- Posicao.
- Abates.
- MVP.

Inscricao por token:
Caminho: `/inscricao/:token`

Serve para equipe entrar via link.

Campos esperados:
- Dados da equipe.
- Dados dos jogadores.
- Confirmacao de inscricao.

Escala:
Caminhos:
- `/escala/:campeonatoId`
- `/escala/vaga/:campeonatoEquipeId`

Serve para montar ou revisar escala de jogadores.

Campos esperados:
- Jogadores da equipe.
- Slots.
- Funcao.
- Confirmacao da line.

## Paginas Publicas e Extras

Home:
Caminho: `/`

Serve como entrada principal.

Ranking:
Caminho: `/ranking`

Campos/filtros:
- Buscar no ranking.

LBFF:
Caminho: `/lbff`

Serve para conteudo/ranking especifico.

Eventos:
Caminho: `/eventos`

Serve para listar eventos.

Managers:
Caminhos:
- `/manager`
- `/managers`

Serve para area de managers.

Moderadores:
Caminhos:
- `/moderadores`
- `/moderadores/online`

Serve para area de moderacao/operacao.

Perfil publico:
Caminhos:
- `/p/:slug`
- `/mobile/:slug`
- `/line/:id`

Servem para paginas publicas compartilhaveis.

## Rotas Backend Principais

Autenticacao:
- `POST /api/auth/login`
- `POST /api/auth/signup`

Mobile/Supabase proxy:
- `POST /api/mobile/supabase/query`
- `POST /api/mobile/supabase/storage`

Carteira:
- `/api/wallet/saldo`
- `/api/wallet/pagar`
- `/api/saques/solicitar`

Pagamentos:
- `/api/pagamentos/pix/criar`
- `/api/pix/criar`
- `/api/pix/webhook`
- `/api/webhooks/mercadopago`

Campeonatos:
- `/api/campeonatos/diarios/criar`
- `/api/campeonatos/diarios/inscrever`
- `/api/campeonatos/diarios/finalizar`
- `/api/campeonatos/diarios/grupos`
- `/api/campeonatos/diarios/grupos/duplicar`
- `/api/campeonatos/mvp-avulso`
- `/api/campeonatos/sumula/mvp`

Inscricao:
- `/api/inscricao-equipe/gerar`
- `/api/inscricao-equipe/entrar`
- `/api/inscricao-equipe/detalhes/:token`

Produtoras:
- `/api/produtoras/:id/convites`
- `/api/produtoras/:id/convites/:conviteId`

Stream:
- `/api/stream/publish-score`
- `/api/stream/live-score`
- `/api/stream/projects/:projectId/overlays`
- `/api/stream/projects/:projectId/overlays/:overlayId`
- `/api/stream/controller/panel/:producerKey`

Outras:
- `/api/freefire/player`
- `/api/kyc/enviar`
- `/api/confrontos/entrar`
- `/api/admin/configuracoes/pagamentos`

## Observacoes para Revisao

Pontos que merecem revisao manual:

- Campos obrigatorios que hoje nao aparecem claramente como obrigatorios.
- Padrao de nomes: campeonato, torneio, liga, copa, diario e confronto devem usar termos consistentes.
- Campos de data/hora precisam de mascara ou seletor melhor.
- Campos monetarios precisam de mascara em Real.
- UID/ID de jogo deve ter validacao por modalidade.
- Uploads precisam de limite de tamanho, tipo e feedback visual.
- Formularios de pagamento e KYC precisam deixar claro quais dados sao sensiveis.
- Areas administrativas devem confirmar permissoes antes de alterar dados criticos.
- Mobile e web devem pedir os mesmos campos para a mesma acao, quando fizer sentido.
