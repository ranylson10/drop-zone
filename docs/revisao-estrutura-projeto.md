# Revisao da estrutura do projeto

Gerado automaticamente a partir de `web/app`, `mobile/app` e componentes mobile. Use os caminhos e linhas para conferir os detalhes no codigo.

## Visao geral

- Web pages: 112
- API routes: 33
- Mobile screens/layouts: 25
- Arquivos com campos/formularios detectados: 120

## Paginas web

| Rota | Arquivo |
|---|---|
| `/` | `web/app/page.tsx` |
| `/admin` | `web/app/admin/page.tsx` |
| `/admin-evento/cadastro` | `web/app/admin-evento/cadastro/page.tsx` |
| `/admin/administradores` | `web/app/admin/administradores/page.tsx` |
| `/admin/antifraude` | `web/app/admin/antifraude/page.tsx` |
| `/admin/auditoria` | `web/app/admin/auditoria/page.tsx` |
| `/admin/configuracoes/pagamentos` | `web/app/admin/configuracoes/pagamentos/page.tsx` |
| `/admin/configuracoes/taxas` | `web/app/admin/configuracoes/taxas/page.tsx` |
| `/admin/denuncias` | `web/app/admin/denuncias/page.tsx` |
| `/admin/denuncias/:id` | `web/app/admin/denuncias/[id]/page.tsx` |
| `/admin/diagnostico` | `web/app/admin/diagnostico/page.tsx` |
| `/admin/financeiro/depositos` | `web/app/admin/financeiro/depositos/page.tsx` |
| `/admin/kyc` | `web/app/admin/kyc/page.tsx` |
| `/admin/moderacao` | `web/app/admin/moderacao/page.tsx` |
| `/admin/moderacao/:id` | `web/app/admin/moderacao/[id]/page.tsx` |
| `/admin/produtoras` | `web/app/admin/produtoras/page.tsx` |
| `/admin/usuarios` | `web/app/admin/usuarios/page.tsx` |
| `/apostados` | `web/app/apostados/page.tsx` |
| `/apostados/:id` | `web/app/apostados/[id]/page.tsx` |
| `/apostados/moderador` | `web/app/apostados/moderador/page.tsx` |
| `/auth/callback` | `web/app/auth/callback/page.tsx` |
| `/cadastro` | `web/app/cadastro/page.tsx` |
| `/calendario` | `web/app/calendario/page.tsx` |
| `/campeonatos` | `web/app/campeonatos/page.tsx` |
| `/campeonatos/:id` | `web/app/campeonatos/[id]/page.tsx` |
| `/campeonatos/:id/editar` | `web/app/campeonatos/[id]/editar/page.tsx` |
| `/campeonatos/:id/sorteador` | `web/app/campeonatos/[id]/sorteador/page.tsx` |
| `/campeonatos/4x4` | `web/app/campeonatos/4x4/page.tsx` |
| `/campeonatos/4x4/:id` | `web/app/campeonatos/4x4/[id]/page.tsx` |
| `/campeonatos/confrontos` | `web/app/campeonatos/confrontos/page.tsx` |
| `/campeonatos/copas` | `web/app/campeonatos/copas/page.tsx` |
| `/campeonatos/copas/:id` | `web/app/campeonatos/copas/[id]/page.tsx` |
| `/campeonatos/diarios` | `web/app/campeonatos/diarios/page.tsx` |
| `/campeonatos/diarios/:id` | `web/app/campeonatos/diarios/[id]/page.tsx` |
| `/campeonatos/diarios/criar` | `web/app/campeonatos/diarios/criar/page.tsx` |
| `/campeonatos/ligas` | `web/app/campeonatos/ligas/page.tsx` |
| `/campeonatos/ligas/:id` | `web/app/campeonatos/ligas/[id]/page.tsx` |
| `/campeonatos/nova` | `web/app/campeonatos/nova/page.tsx` |
| `/campeonatos/nova/4x4` | `web/app/campeonatos/nova/4x4/page.tsx` |
| `/campeonatos/nova/apostado` | `web/app/campeonatos/nova/apostado/page.tsx` |
| `/campeonatos/nova/confronto` | `web/app/campeonatos/nova/confronto/page.tsx` |
| `/campeonatos/nova/copa` | `web/app/campeonatos/nova/copa/page.tsx` |
| `/campeonatos/nova/diario` | `web/app/campeonatos/nova/diario/page.tsx` |
| `/campeonatos/nova/liga` | `web/app/campeonatos/nova/liga/page.tsx` |
| `/campeonatos/nova/xtreino` | `web/app/campeonatos/nova/xtreino/page.tsx` |
| `/campeonatos/nova/xtreino/:id` | `web/app/campeonatos/nova/xtreino/[id]/page.tsx` |
| `/campeonatos/xtreinos` | `web/app/campeonatos/xtreinos/page.tsx` |
| `/campeonatos/xtreinos/:id` | `web/app/campeonatos/xtreinos/[id]/page.tsx` |
| `/carteira` | `web/app/carteira/page.tsx` |
| `/carteira/comprovante/:id` | `web/app/carteira/comprovante/[id]/page.tsx` |
| `/carteira/deposito` | `web/app/carteira/deposito/page.tsx` |
| `/carteira/saque` | `web/app/carteira/saque/page.tsx` |
| `/chat` | `web/app/chat/page.tsx` |
| `/confirmar` | `web/app/confirmar/page.tsx` |
| `/confrontos` | `web/app/confrontos/page.tsx` |
| `/confrontos/:id` | `web/app/confrontos/[id]/page.tsx` |
| `/confrontos/admin` | `web/app/confrontos/admin/page.tsx` |
| `/confrontos/admin/:id` | `web/app/confrontos/admin/[id]/page.tsx` |
| `/confrontos/nova` | `web/app/confrontos/nova/page.tsx` |
| `/confrontos/perfil/:id` | `web/app/confrontos/perfil/[id]/page.tsx` |
| `/confrontos/ranking` | `web/app/confrontos/ranking/page.tsx` |
| `/denunciar` | `web/app/denunciar/page.tsx` |
| `/dev/card-preview` | `web/app/dev/card-preview/page.tsx` |
| `/dev/player-card` | `web/app/dev/player-card/page.tsx` |
| `/equipe` | `web/app/equipe/page.tsx` |
| `/equipe/:id` | `web/app/equipe/[id]/page.tsx` |
| `/equipe/:id/editar` | `web/app/equipe/[id]/editar/page.tsx` |
| `/equipe/convites` | `web/app/equipe/convites/page.tsx` |
| `/equipe/nova` | `web/app/equipe/nova/page.tsx` |
| `/escala/:campeonatoId` | `web/app/escala/[campeonatoId]/page.tsx` |
| `/escala/vaga/:campeonatoEquipeId` | `web/app/escala/vaga/[campeonatoEquipeId]/page.tsx` |
| `/eventos` | `web/app/eventos/page.tsx` |
| `/feed` | `web/app/feed/page.tsx` |
| `/inscricao/:token` | `web/app/inscricao/[token]/page.tsx` |
| `/jogadores` | `web/app/jogadores/page.tsx` |
| `/jogadores/:id` | `web/app/jogadores/[id]/page.tsx` |
| `/kyc/selfie` | `web/app/kyc/selfie/page.tsx` |
| `/lbff` | `web/app/lbff/page.tsx` |
| `/line/:id` | `web/app/line/[id]/page.tsx` |
| `/login` | `web/app/login/page.tsx` |
| `/manager` | `web/app/manager/page.tsx` |
| `/managers` | `web/app/managers/page.tsx` |
| `/mobile/:slug` | `web/app/mobile/[slug]/page.tsx` |
| `/moderadores` | `web/app/moderadores/page.tsx` |
| `/moderadores/online` | `web/app/moderadores/online/page.tsx` |
| `/p/:slug` | `web/app/p/[slug]/page.tsx` |
| `/perfil` | `web/app/perfil/page.tsx` |
| `/perfil/atuacao` | `web/app/perfil/atuacao/page.tsx` |
| `/perfil/pagamento` | `web/app/perfil/pagamento/page.tsx` |
| `/pontuador/:token` | `web/app/pontuador/[token]/page.tsx` |
| `/produtora` | `web/app/produtora/page.tsx` |
| `/produtora/:id` | `web/app/produtora/[id]/page.tsx` |
| `/produtora/:id/gestao` | `web/app/produtora/[id]/gestao/page.tsx` |
| `/produtora/config` | `web/app/produtora/config/page.tsx` |
| `/produtora/nova` | `web/app/produtora/nova/page.tsx` |
| `/ranking` | `web/app/ranking/page.tsx` |
| `/recuperar` | `web/app/recuperar/page.tsx` |
| `/stream` | `web/app/stream/page.tsx` |
| `/stream/control/:id` | `web/app/stream/control/[id]/page.tsx` |
| `/stream/controller` | `web/app/stream/controller/page.tsx` |
| `/stream/controller/panel/:producerKey` | `web/app/stream/controller/panel/[producerKey]/page.tsx` |
| `/stream/editor/:projectId` | `web/app/stream/editor/[projectId]/page.tsx` |
| `/stream/overlay/:key` | `web/app/stream/overlay/[key]/page.tsx` |
| `/stream/overlay/:key/:overlayType` | `web/app/stream/overlay/[key]/[overlayType]/page.tsx` |
| `/stream/overlay/:key/scoreboard` | `web/app/stream/overlay/[key]/scoreboard/page.tsx` |
| `/stream/pontuador` | `web/app/stream/pontuador/page.tsx` |
| `/stream/projects` | `web/app/stream/projects/page.tsx` |
| `/stream/render/:overlayId` | `web/app/stream/render/[overlayId]/page.tsx` |
| `/stream/studio/:key` | `web/app/stream/studio/[key]/page.tsx` |
| `/transparencia` | `web/app/transparencia/page.tsx` |
| `/transparencia/denuncia/:id` | `web/app/transparencia/denuncia/[id]/page.tsx` |
| `/transparencia/minhas` | `web/app/transparencia/minhas/page.tsx` |

## Rotas API backend

| Rota | Arquivo |
|---|---|
| `/api/admin/configuracoes/pagamentos` | `web/app/api/admin/configuracoes/pagamentos/route.ts` |
| `/api/auth/login` | `web/app/api/auth/login/route.ts` |
| `/api/auth/signup` | `web/app/api/auth/signup/route.ts` |
| `/api/campeonatos/diarios/:id` | `web/app/api/campeonatos/diarios/[id]/route.ts` |
| `/api/campeonatos/diarios/criar` | `web/app/api/campeonatos/diarios/criar/route.ts` |
| `/api/campeonatos/diarios/finalizar` | `web/app/api/campeonatos/diarios/finalizar/route.ts` |
| `/api/campeonatos/diarios/grupos` | `web/app/api/campeonatos/diarios/grupos/route.ts` |
| `/api/campeonatos/diarios/grupos/duplicar` | `web/app/api/campeonatos/diarios/grupos/duplicar/route.ts` |
| `/api/campeonatos/diarios/inscrever` | `web/app/api/campeonatos/diarios/inscrever/route.ts` |
| `/api/campeonatos/mvp-avulso` | `web/app/api/campeonatos/mvp-avulso/route.ts` |
| `/api/campeonatos/sumula/mvp` | `web/app/api/campeonatos/sumula/mvp/route.ts` |
| `/api/confrontos/entrar` | `web/app/api/confrontos/entrar/route.ts` |
| `/api/freefire/player` | `web/app/api/freefire/player/route.ts` |
| `/api/inscricao-equipe/detalhes/:token` | `web/app/api/inscricao-equipe/detalhes/[token]/route.ts` |
| `/api/inscricao-equipe/entrar` | `web/app/api/inscricao-equipe/entrar/route.ts` |
| `/api/inscricao-equipe/gerar` | `web/app/api/inscricao-equipe/gerar/route.ts` |
| `/api/kyc/enviar` | `web/app/api/kyc/enviar/route.ts` |
| `/api/mobile/supabase/query` | `web/app/api/mobile/supabase/query/route.ts` |
| `/api/mobile/supabase/storage` | `web/app/api/mobile/supabase/storage/route.ts` |
| `/api/pagamentos/pix/criar` | `web/app/api/pagamentos/pix/criar/route.ts` |
| `/api/pix/criar` | `web/app/api/pix/criar/route.ts` |
| `/api/pix/webhook` | `web/app/api/pix/webhook/route.ts` |
| `/api/produtoras/:id/convites` | `web/app/api/produtoras/[id]/convites/route.ts` |
| `/api/produtoras/:id/convites/:conviteId` | `web/app/api/produtoras/[id]/convites/[conviteId]/route.ts` |
| `/api/saques/solicitar` | `web/app/api/saques/solicitar/route.ts` |
| `/api/stream/controller/panel/:producerKey` | `web/app/api/stream/controller/panel/[producerKey]/route.ts` |
| `/api/stream/live-score` | `web/app/api/stream/live-score/route.ts` |
| `/api/stream/projects/:projectId/overlays` | `web/app/api/stream/projects/[projectId]/overlays/route.ts` |
| `/api/stream/projects/:projectId/overlays/:overlayId` | `web/app/api/stream/projects/[projectId]/overlays/[overlayId]/route.ts` |
| `/api/stream/publish-score` | `web/app/api/stream/publish-score/route.ts` |
| `/api/wallet/pagar` | `web/app/api/wallet/pagar/route.ts` |
| `/api/wallet/saldo` | `web/app/api/wallet/saldo/route.ts` |
| `/api/webhooks/mercadopago` | `web/app/api/webhooks/mercadopago/route.ts` |

## Telas mobile

| Rota/Tela | Arquivo |
|---|---|
| `/` | `mobile/app/index.tsx` |
| `/_layout` | `mobile/app/(tabs)/_layout.tsx` |
| `/_layout` | `mobile/app/_layout.tsx` |
| `/auth/_layout` | `mobile/app/(auth)/_layout.tsx` |
| `/auth/callback` | `mobile/app/auth/callback.tsx` |
| `/auth/criar-conta` | `mobile/app/(auth)/criar-conta.tsx` |
| `/auth/login` | `mobile/app/(auth)/login.tsx` |
| `/auth/recuperar` | `mobile/app/(auth)/recuperar.tsx` |
| `/calendario` | `mobile/app/(tabs)/calendario.tsx` |
| `/campeonato/:id` | `mobile/app/campeonato/[id].tsx` |
| `/campeonatos` | `mobile/app/(tabs)/campeonatos.tsx` |
| `/carteira` | `mobile/app/(tabs)/carteira.tsx` |
| `/chat` | `mobile/app/(tabs)/chat.tsx` |
| `/chat/:id` | `mobile/app/chat/[id].tsx` |
| `/criar/:tipo` | `mobile/app/criar/[tipo].tsx` |
| `/criar/produtora` | `mobile/app/criar/produtora.tsx` |
| `/equipe/:id` | `mobile/app/equipe/[id].tsx` |
| `/equipes` | `mobile/app/(tabs)/equipes.tsx` |
| `/feed` | `mobile/app/(tabs)/feed.tsx` |
| `/jogador/:id` | `mobile/app/jogador/[id].tsx` |
| `/jogadores` | `mobile/app/(tabs)/jogadores.tsx` |
| `/meu-perfil` | `mobile/app/meu-perfil.tsx` |
| `/notificacoes` | `mobile/app/notificacoes.tsx` |
| `/produtora/:id` | `mobile/app/produtora/[id].tsx` |
| `/produtoras` | `mobile/app/produtoras.tsx` |

## Formularios e campos detectados

### /auth/criar-conta

Arquivo: `mobile/app/(auth)/criar-conta.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 64 | `TextInput` | `{placeholder}` | `{idx === 1 ? 'email-address' : undefined}` | - | - | `{[name,email,password,confirm][idx]}` |

### /auth/login

Arquivo: `mobile/app/(auth)/login.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 66 | `TextInput` | Email | email-address | - | - | `{email}` |
| 67 | `TextInput` | Senha | text | - | - | `{password}` |

### /auth/recuperar

Arquivo: `mobile/app/(auth)/recuperar.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 31 | `TextInput` | Email | email-address | - | - | `{email}` |

### /calendario

Arquivo: `mobile/app/(tabs)/calendario.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 562 | `Input` | Campeonato, equipe ou jogador | text | - | - | `{query}` |
| 588 | `Input` | Nome da tarefa | text | - | - | `{title}` |
| 589 | `Input` | Descricao completa | text | - | - | `{description}` |
| 619 | `TextInput` | Outra duração em minutos | numeric | - | - | `{duration}` |

### /campeonatos

Arquivo: `mobile/app/(tabs)/campeonatos.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 183 | `Input` | Buscar campeonato, produtora, servidor... | text | - | - | `{busca}` |
| 190 | `Input` | Prêmio mín. | numeric | - | - | `{premioMin}` |
| 191 | `Input` | Prêmio máx. | numeric | - | - | `{premioMax}` |
| 192 | `Input` | Inscrição até | numeric | - | - | `{inscricaoMax}` |

### /carteira

Arquivo: `mobile/app/(tabs)/carteira.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 298 | `Input` | Valor em R$ | numeric | - | - | `{valor}` |
| 300 | `Input` | Tipo da chave: pix, cpf, email, telefone | text | - | - | `{tipoChave}` |
| 301 | `Input` | Chave Pix | text | - | - | `{chavePix}` |

### /chat

Arquivo: `mobile/app/(tabs)/chat.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 126 | `TextInput` | Pesquisar conversas | text | - | - | `{search}` |

### /feed

Arquivo: `mobile/app/(tabs)/feed.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1802 | `Input` | Comentar story... | text | - | - | `{commentText}` |
| 1922 | `Input` | Adicione ou edite a legenda... | text | - | - | `{repostCaption}` |

### /campeonato/:id

Arquivo: `mobile/app/campeonato/[id].tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1147 | `TextInput` | `{playerForm.nick}` | text | - | - | `{playerForm.nick}` |
| 1148 | `TextInput` | `{playerForm.uid_jogo}` | text | - | - | `{playerForm.uid_jogo}` |
| 1161 | `TextInput` | `{playerForm.perfil_jogo_id}` | text | - | - | `{playerForm.perfil_jogo_id}` |
| 1228 | `TextInput` | Nome da fase | text | - | - | `{phaseName}` |
| 1240 | `TextInput` | `{groupForm.nome}` | text | - | - | `{groupForm.nome}` |
| 1241 | `TextInput` | `{groupForm.qtd_slots}` | text | - | - | `{groupForm.qtd_slots}` |
| 1242 | `TextInput` | `{groupForm.horario_inicio}` | text | - | - | `{groupForm.horario_inicio}` |
| 1243 | `TextInput` | `{groupForm.status}` | text | - | - | `{groupForm.status}` |
| 1367 | `TextInput` | `{values.abates}` | numeric | - | - | `{values.abates}` |

### /chat/:id

Arquivo: `mobile/app/chat/[id].tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 209 | `TextInput` | Mensagem | text | - | - | `{texto}` |

### /criar/:tipo

Arquivo: `mobile/app/criar/[tipo].tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 519 | `TextInput` | `{post.conteudo}` | text | - | - | `{post.conteudo}` |
| 564 | `SelectField` | Produtora | select | - | `{produtoraOptions}` | `{champ.produtora_id}` |
| 565 | `UploadBox` | Logo do campeonato | text | - | - | - |
| 566 | `UploadBox` | Banner do campeonato | text | - | - | - |
| 567 | `Input` | `{champ.nome}` | text | - | - | `{champ.nome}` |
| 569 | `Input` | `{champ.edicao}` | text | - | - | `{champ.edicao}` |
| 570 | `Input` | `{champ.data_inicio}` | text | - | - | `{champ.data_inicio}` |
| 572 | `SelectField` | Tipo de campeonato | select | - | `{tipoOptions}` | `{champ.tipo_competicao}` |
| 594 | `Input` | `{horario.nome}` | text | - | - | `{horario.nome}` |
| 600 | `Input` | `{horario.horario_inicio}` | text | - | - | `{horario.horario_inicio}` |
| 607 | `Input` | `{horario.qtd_slots}` | text | - | - | `{horario.qtd_slots}` |
| 616 | `Input` | `{horario.qtd_quedas}` | text | - | - | `{horario.qtd_quedas}` |
| 623 | `Input` | `{horario.valor_inscricao}` | text | - | - | `{horario.valor_inscricao}` |
| 631 | `Input` | `{horario.premiacao}` | text | - | - | `{horario.premiacao}` |
| 644 | `SelectField` | Plataforma | select | - | `{plataformaOptions}` | `{champ.plataforma}` |
| 645 | `SelectField` | Categoria | select | - | `{categoriaOptions}` | `{champ.categoria}` |
| 647 | `SelectField` | Servidor | select | - | `{servidorOptions}` | `{champ.regiao}` |
| 648 | `SelectField` | Modo de jogo | select | - | `{modoOptions}` | `{champ.modo_jogo}` |
| 650 | `Input` | `{champ.vagas}` | text | - | - | `{champ.vagas}` |
| 651 | `Input` | `{champ.valor_vaga}` | text | - | - | `{champ.valor_vaga}` |
| 654 | `Input` | `{champ.valor_premiacao}` | text | - | - | `{champ.valor_premiacao}` |
| 655 | `Input` | `{champ.pontos_por_abate}` | text | - | - | `{champ.pontos_por_abate}` |
| 656 | `Input` | `{champ.pontos_por_abate}` | text | - | - | `{champ.pontos_por_abate}` |
| 658 | `Input` | `{champ.quantidade_quedas}` | text | - | - | `{champ.quantidade_quedas}` |
| 659 | `Input` | `{champ.equipes_por_jogo}` | text | - | - | `{champ.equipes_por_jogo}` |
| 661 | `Input` | `{champ.quantidade_rodadas}` | text | - | - | `{champ.quantidade_rodadas}` |
| 662 | `SelectField` | Criterio de desempate | select | - | `{desempateOptions}` | `{champ.criterio_desempate}` |
| 663 | `SelectField` | Sistema de pontos | select | - | `{sistemaOptions}` | `{champ.sistema_pontos_tipo}` |
| 664 | `Input` | `{champ.whatsapp_suporte}` | text | - | - | `{champ.whatsapp_suporte}` |
| 665 | `SelectField` | Pagamento da taxa | select | - | `{pagamentoOptions}` | `{champ.forma_pagamento}` |
| 671 | `UploadBox` | Logo da equipe | text | - | - | - |
| 672 | `UploadBox` | Capa da equipe | text | - | - | - |
| 673 | `Input` | `{team.nome}` | text | - | - | `{team.nome}` |
| 675 | `Input` | `{team.tag}` | text | - | - | `{team.tag}` |
| 676 | `Input` | `{team.data_fundacao}` | text | - | - | `{team.data_fundacao}` |
| 679 | `Input` | `{team.cidade}` | text | - | - | `{team.cidade}` |
| 680 | `Input` | `{team.estado}` | text | - | - | `{team.estado}` |
| 682 | `Input` | `{team.pais}` | text | - | - | `{team.pais}` |
| 683 | `Input` | `{team.descricao}` | text | - | - | `{team.descricao}` |
| 687 | `UploadBox` | Foto do perfil | text | - | - | - |
| 688 | `Input` | `{profile.nick}` | text | - | - | `{profile.nick}` |
| 689 | `Input` | `{profile.uid_jogo}` | text | - | - | `{profile.uid_jogo}` |
| 691 | `Input` | `{profile.servidor}` | text | - | - | `{profile.servidor}` |
| 692 | `Input` | `{profile.plataforma}` | text | - | - | `{profile.plataforma}` |
| 695 | `SelectField` | Funcao | select | - | `{funcaoOptions}` | `{profile.funcao}` |
| 696 | `SelectField` | Cargo | select | - | `{cargoOptions}` | `{profile.cargo}` |
| 698 | `Input` | `{profile.bio}` | text | - | - | `{profile.bio}` |

### /criar/produtora

Arquivo: `mobile/app/criar/produtora.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 204 | `Input` | `{form.nome}` | text | - | - | `{form.nome}` |
| 209 | `Input` | `{form.whatsapp_suporte}` | text | - | - | `{form.whatsapp_suporte}` |
| 213 | `Input` | `{form.instagram_url}` | text | - | - | `{form.instagram_url}` |
| 218 | `Input` | `{form.discord_url}` | text | - | - | `{form.discord_url}` |
| 221 | `Input` | `{form.descricao}` | text | - | - | `{form.descricao}` |

### /equipe/:id

Arquivo: `mobile/app/equipe/[id].tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1356 | `TextInput` | Nome da nova line | text | - | - | `{newLineName}` |

### /produtora/:id

Arquivo: `mobile/app/produtora/[id].tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 574 | `Input` | Buscar usuário por nome ou username | text | - | - | `{buscaUsuario}` |
| 579 | `Input` | Mensagem opcional | text | - | - | `{mensagem}` |

### /produtoras

Arquivo: `mobile/app/produtoras.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 72 | `Input` | Buscar produtora, slug ou descrição | text | - | - | `{busca}` |

### (componente compartilhado)

Arquivo: `mobile/src/components/Input.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 6 | `TextInput` | TextInput | text | - | - | - |

### (componente compartilhado)

Arquivo: `mobile/src/components/SearchBar.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 9 | `TextInput` | `{placeholder}` | text | - | - | - |

### (componente compartilhado)

Arquivo: `mobile/src/components/TeamRosterManager.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 305 | `TextInput` | Pesquisar perfil de jogo por nick | text | - | - | `{search}` |
| 350 | `TextInput` | Buscar line por nome | text | - | - | `{lineSearch}` |
| 371 | `TextInput` | Nome da line | text | - | - | `{lineName}` |

### /admin-evento/cadastro

Arquivo: `web/app/admin-evento/cadastro/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 294 | `input` | `{nomeExibicao}` | text | - | - | `{nomeExibicao}` |
| 306 | `textarea` | `{descricao}` | textarea | - | - | `{descricao}` |

### /admin/administradores/client-page.tsx

Arquivo: `web/app/admin/administradores/client-page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 373 | `input` | `{busca}` | text | - | - | `{busca}` |
| 521 | `input` | `{taxas[item.id] ?? ''}` | text | - | - | `{taxas[item.id] ?? ''}` |

### /admin/auditoria

Arquivo: `web/app/admin/auditoria/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 56 | `input` | `{busca}` | text | - | - | `{busca}` |
| 57 | `select` | `{risco}` | select | - | - | `{risco}` |

### /admin/configuracoes/pagamentos

Arquivo: `web/app/admin/configuracoes/pagamentos/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 223 | `Field` | Ambiente | text | - | - | - |
| 224 | `select` | `{form.environment}` | select | - | - | `{form.environment}` |
| 231 | `Field` | Access Token | text | - | - | - |
| 234 | `Field` | Public Key | text | - | - | - |
| 234 | `TextInput` | `{form.publicKey}` | text | - | - | `{form.publicKey}` |
| 235 | `Field` | URL do webhook | text | - | - | - |
| 235 | `TextInput` | `{form.webhookUrl}` | text | - | - | `{form.webhookUrl}` |
| 236 | `Field` | Segredo do webhook | text | - | - | - |
| 240 | `Field` | Client ID | text | - | - | - |
| 240 | `TextInput` | `{form.clientId}` | text | - | - | `{form.clientId}` |
| 241 | `Field` | Client Secret | text | - | - | - |
| 244 | `Field` | Webhook ID | text | - | - | - |
| 244 | `TextInput` | `{form.webhookId}` | text | - | - | `{form.webhookId}` |
| 245 | `Field` | Moeda | text | - | - | - |
| 245 | `TextInput` | `{form.currency}` | text | - | - | `{form.currency}` |
| 264 | `input` | `{value}` | text | - | - | `{value}` |
| 268 | `input` | `{value}` | `{visible ? 'text' : 'password'}` | - | - | `{value}` |

### /admin/configuracoes/taxas

Arquivo: `web/app/admin/configuracoes/taxas/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 206 | `input` | `{valores[item.tipo] ?? '0'}` | number | - | - | `{valores[item.tipo] ?? '0'}` |

### /admin/denuncias/:id

Arquivo: `web/app/admin/denuncias/[id]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 158 | `textarea` | `{resposta}` | textarea | - | - | `{resposta}` |
| 160 | `input` | `{interno}` | checkbox | - | - | `{interno}` |
| 179 | `select` | `{novoStatus}` | select | - | - | `{novoStatus}` |
| 182 | `textarea` | `{resumoResolucao}` | textarea | - | - | `{resumoResolucao}` |

### /admin/denuncias

Arquivo: `web/app/admin/denuncias/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 159 | `input` | `{mensagem}` | text | - | - | `{mensagem}` |

### /admin/financeiro/depositos

Arquivo: `web/app/admin/financeiro/depositos/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 46 | `select` | `{filtro}` | select | - | - | `{filtro}` |

### /admin/moderacao/:id

Arquivo: `web/app/admin/moderacao/[id]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 69 | `input` | `{mensagem}` | text | - | - | `{mensagem}` |
| 75 | `input` | `{prova}` | text | - | - | `{prova}` |

### /admin/moderacao/client-page.tsx

Arquivo: `web/app/admin/moderacao/client-page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 335 | `input` | `{busca}` | text | - | - | `{busca}` |

### /admin/produtoras/client-page.tsx

Arquivo: `web/app/admin/produtoras/client-page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 324 | `input` | `{busca}` | text | - | - | `{busca}` |
| 385 | `input` | `{taxas[item.id] ?? '0'}` | number | - | - | `{taxas[item.id] ?? '0'}` |

### /admin/usuarios

Arquivo: `web/app/admin/usuarios/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 66 | `input` | `{busca}` | text | - | - | `{busca}` |

### /apostados/components/LobbyChat.tsx

Arquivo: `web/app/apostados/components/LobbyChat.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 227 | `input` | `{texto}` | text | - | - | `{texto}` |

### /apostados/moderador

Arquivo: `web/app/apostados/moderador/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 551 | `input` | `{abates[j.perfil_jogo_id] \|\| 0}` | number | - | - | `{abates[j.perfil_jogo_id] \|\| 0}` |
| 601 | `input` | `{correcao.partidasA}` | number | - | - | `{correcao.partidasA}` |
| 604 | `input` | `{correcao.partidasB}` | number | - | - | `{correcao.partidasB}` |
| 607 | `input` | `{correcao.roundsA}` | number | - | - | `{correcao.roundsA}` |
| 610 | `input` | `{correcao.roundsB}` | number | - | - | `{correcao.roundsB}` |
| 649 | `input` | `{abates[j.perfil_jogo_id] \|\| 0}` | number | - | - | `{abates[j.perfil_jogo_id] \|\| 0}` |

### /apostados

Arquivo: `web/app/apostados/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1188 | `input` | `{lineupNome}` | text | - | - | `{lineupNome}` |
| 1215 | `input` | `{buscaPerfil}` | text | - | - | `{buscaPerfil}` |

### /cadastro

Arquivo: `web/app/cadastro/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 36 | `input` | input | text | - | - | - |
| 160 | `Field` | Nome de usuário | text | - | - | `{username}` |
| 161 | `Field` | E-mail | email | - | - | `{email}` |
| 162 | `Field` | Senha | password | - | - | `{password}` |
| 163 | `Field` | Confirmar senha | password | - | - | `{confirmPassword}` |

### /calendario

Arquivo: `web/app/calendario/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 827 | `input` | `{busca}` | text | - | - | `{busca}` |
| 837 | `select` | `{mesAtivo}` | select | - | - | `{mesAtivo}` |
| 1017 | `input` | `{novaTarefa.titulo}` | text | - | - | `{novaTarefa.titulo}` |
| 1024 | `input` | `{novaTarefa.data_evento}` | date | - | - | `{novaTarefa.data_evento}` |
| 1030 | `select` | `{novaTarefa.horario}` | select | - | - | `{novaTarefa.horario}` |
| 1038 | `textarea` | `{novaTarefa.descricao}` | textarea | - | - | `{novaTarefa.descricao}` |
| 1048 | `input` | `{novaTarefa.cor}` | color | - | - | `{novaTarefa.cor}` |
| 1054 | `input` | `{novaTarefa.cor}` | text | - | - | `{novaTarefa.cor}` |
| 1064 | `input` | `{novaTarefa.texto}` | color | - | - | `{novaTarefa.texto}` |
| 1070 | `input` | `{novaTarefa.texto}` | text | - | - | `{novaTarefa.texto}` |
| 1353 | `input` | `{value}` | color | - | - | `{value}` |
| 1359 | `input` | `{value}` | text | - | - | `{value}` |

### /campeonatos/:id/components/AbaInformacoes.tsx

Arquivo: `web/app/campeonatos/[id]/components/AbaInformacoes.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 218 | `input` | `{pontos[i] \|\| 0}` | number | - | - | `{pontos[i] \|\| 0}` |
| 241 | `select` | `{c.id}` | select | - | - | `{c.id}` |
| 283 | `input` | `{premio.pos}` | text | - | - | `{premio.pos}` |
| 290 | `input` | `{premio.val}` | text | - | - | `{premio.val}` |
| 424 | `select` | `{valorBoolParaOpcao(value, options)}` | select | - | - | `{valorBoolParaOpcao(value, options)}` |
| 437 | `input` | input | `{type}` | - | - | - |

### /campeonatos/:id/components/AbaJogadores.tsx

Arquivo: `web/app/campeonatos/[id]/components/AbaJogadores.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1091 | `select` | `{filtroGrupo}` | select | - | - | `{filtroGrupo}` |
| 1105 | `select` | `{filtroOrigem}` | select | - | - | `{filtroOrigem}` |
| 1488 | `input` | `{termoBuscaPerfil}` | text | - | - | `{termoBuscaPerfil}` |
| 1555 | `input` | `{novoNick}` | text | - | - | `{novoNick}` |
| 1562 | `input` | `{novoGameId}` | text | - | - | `{novoGameId}` |
| 1569 | `select` | `{novaFuncao}` | select | - | - | `{novaFuncao}` |
| 1590 | `input` | input | file / image/* | - | - | - |
| 1683 | `input` | `{buscaTroca}` | text | - | - | `{buscaTroca}` |

### /campeonatos/:id/components/FormRegistroManual.tsx

Arquivo: `web/app/campeonatos/[id]/components/FormRegistroManual.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 203 | `input` | input | file / image/* | - | - | - |
| 224 | `input` | `{nome}` | text | sim | - | `{nome}` |
| 238 | `input` | `{gameId}` | text | sim | - | `{gameId}` |
| 252 | `select` | `{funcao}` | select | - | - | `{funcao}` |
| 268 | `select` | `{equipeSelecionada}` | select | sim | - | `{equipeSelecionada}` |

### /campeonatos/:id/components/GerenciarEquipes.tsx

Arquivo: `web/app/campeonatos/[id]/components/GerenciarEquipes.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 844 | `input` | `{busca}` | text | - | - | `{busca}` |
| 856 | `select` | `{tipoFiltro}` | select | - | - | `{tipoFiltro}` |
| 1294 | `select` | `{statusNovaVaga}` | select | - | - | `{statusNovaVaga}` |
| 1310 | `input` | `{dataAgendamento}` | date | - | - | `{dataAgendamento}` |
| 1323 | `input` | `{observacaoAgendamento}` | text | - | - | `{observacaoAgendamento}` |
| 1343 | `input` | `{buscaEquipeApp}` | text | - | - | `{buscaEquipeApp}` |
| 1416 | `input` | `{nomeAvulsa}` | text | - | - | `{nomeAvulsa}` |
| 1428 | `input` | `{tagAvulsa}` | text | - | - | `{tagAvulsa}` |
| 1449 | `input` | input | file / image/* | - | - | - |
| 1559 | `input` | `{buscaTroca}` | text | - | - | `{buscaTroca}` |

### /campeonatos/:id/components/GerenciarGrupos.tsx

Arquivo: `web/app/campeonatos/[id]/components/GerenciarGrupos.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 2543 | `input` | `{nomeFase}` | text | - | - | `{nomeFase}` |
| 2597 | `select` | `{faseSelecionadaParaGrupo}` | select | - | - | `{faseSelecionadaParaGrupo}` |
| 2616 | `select` | `{extrairLetraGrupo(nomeGrupo)}` | select | - | - | `{extrairLetraGrupo(nomeGrupo)}` |
| 2642 | `input` | `{quantidadeEquipesGrupo}` | text | - | - | `{quantidadeEquipesGrupo}` |
| 2657 | `input` | `{quantidadeQuedasGrupo}` | text | - | - | `{quantidadeQuedasGrupo}` |
| 2677 | `input` | `{classificamGrupo}` | text | - | - | `{classificamGrupo}` |
| 2690 | `input` | `{dataJogoGrupo}` | text | - | - | `{dataJogoGrupo}` |
| 2702 | `input` | `{horaJogoGrupo}` | text | - | - | `{horaJogoGrupo}` |
| 2714 | `input` | `{intervaloGrupo}` | text | - | - | `{intervaloGrupo}` |
| 2724 | `input` | `{killDobroUltimaQuedaGrupo}` | checkbox | - | - | `{killDobroUltimaQuedaGrupo}` |
| 2760 | `select` | `{mapasGrupoSelecionados[index] \|\| ""}` | select | - | - | `{mapasGrupoSelecionados[index] \|\| ""}` |
| 2825 | `input` | `{buscaEquipe}` | text | - | - | `{buscaEquipe}` |
| 2976 | `input` | `{aceitaQualquerGrupo}` | checkbox | - | - | `{aceitaQualquerGrupo}` |
| 2989 | `select` | `{grupoDesejadoTroca}` | select | - | - | `{grupoDesejadoTroca}` |
| 3008 | `textarea` | `{observacaoTroca}` | textarea | - | - | `{observacaoTroca}` |

### /campeonatos/:id/components/GerenciarJogos.tsx

Arquivo: `web/app/campeonatos/[id]/components/GerenciarJogos.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 905 | `input` | `{form.nome_bloco}` | text | - | - | `{form.nome_bloco}` |
| 936 | `input` | `{form.data_jogo}` | date | - | - | `{form.data_jogo}` |
| 949 | `input` | `{form.hora_jogo}` | time | - | - | `{form.hora_jogo}` |
| 962 | `input` | `{form.duracao_estimada_min}` | number | - | - | `{form.duracao_estimada_min}` |
| 981 | `input` | `{form.quantidade_partidas}` | number | - | - | `{form.quantidade_partidas}` |
| 997 | `input` | `{Boolean(form.killDobroUltimaQueda)}` | checkbox | - | - | `{Boolean(form.killDobroUltimaQueda)}` |
| 1092 | `select` | `{mapa}` | select | - | - | `{mapa}` |
| 1118 | `textarea` | `{form.observacoes}` | textarea | - | - | `{form.observacoes}` |
| 1137 | `select` | `{faseAtivaId}` | select | - | - | `{faseAtivaId}` |
| 1195 | `input` | `{selecionado}` | checkbox | - | - | `{selecionado}` |

### /campeonatos/:id/components/GerenciarPontuacao.tsx

Arquivo: `web/app/campeonatos/[id]/components/GerenciarPontuacao.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 86 | `input` | `{qtdEquipes}` | number | - | - | `{qtdEquipes}` |
| 98 | `input` | `{pontosAbate}` | number | - | - | `{pontosAbate}` |
| 138 | `input` | `{ponto}` | number | - | - | `{ponto}` |

### /campeonatos/:id/components/GerenciarWatchParty.tsx

Arquivo: `web/app/campeonatos/[id]/components/GerenciarWatchParty.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 125 | `input` | `{nomeCanal}` | text | - | - | `{nomeCanal}` |
| 128 | `input` | `{urlLive}` | text | - | - | `{urlLive}` |

### /campeonatos/:id/components/MVPTable.tsx

Arquivo: `web/app/campeonatos/[id]/components/MVPTable.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 930 | `input` | `{editingNick[item.key] ?? item.nome}` | text | - | - | `{editingNick[item.key] ?? item.nome}` |

### /campeonatos/:id/components/PointsTable.tsx

Arquivo: `web/app/campeonatos/[id]/components/PointsTable.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 572 | `select` | `{filtroTipo}` | select | - | - | `{filtroTipo}` |
| 585 | `select` | `{faseSelecionada}` | select | - | - | `{faseSelecionada}` |
| 600 | `select` | `{grupoSelecionado}` | select | - | - | `{grupoSelecionado}` |
| 615 | `select` | `{mapaSelecionado}` | select | - | - | `{mapaSelecionado}` |
| 630 | `select` | `{jogoSelecionado}` | select | - | - | `{jogoSelecionado}` |

### /campeonatos/:id/components/RegrasCampeonato.tsx

Arquivo: `web/app/campeonatos/[id]/components/RegrasCampeonato.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1224 | `input` | `{blocoForm.titulo}` | text | - | - | `{blocoForm.titulo}` |
| 1242 | `input` | `{blocoForm.slug}` | text | - | - | `{blocoForm.slug}` |
| 1256 | `textarea` | `{blocoForm.descricao}` | textarea | - | - | `{blocoForm.descricao}` |
| 1289 | `input` | `{blocoForm.aberto_por_padrao}` | checkbox | - | - | `{blocoForm.aberto_por_padrao}` |
| 1303 | `input` | `{blocoForm.ativo}` | checkbox | - | - | `{blocoForm.ativo}` |
| 1469 | `input` | `{itemForm.titulo}` | text | - | - | `{itemForm.titulo}` |
| 1487 | `input` | `{itemForm.slug}` | text | - | - | `{itemForm.slug}` |
| 1504 | `select` | `{itemForm.tipo}` | select | - | - | `{itemForm.tipo}` |
| 1526 | `select` | `{itemForm.chave_dinamica}` | select | - | - | `{itemForm.chave_dinamica}` |
| 1549 | `textarea` | `{itemForm.conteudo}` | textarea | - | - | `{itemForm.conteudo}` |
| 1568 | `textarea` | `{itemForm.observacao}` | textarea | - | - | `{itemForm.observacao}` |
| 1584 | `input` | `{itemForm.destaque}` | checkbox | - | - | `{itemForm.destaque}` |
| 1598 | `input` | `{itemForm.ativo}` | checkbox | - | - | `{itemForm.ativo}` |

### /campeonatos/:id/components/SeletorPerfil.tsx

Arquivo: `web/app/campeonatos/[id]/components/SeletorPerfil.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 171 | `input` | input | file / image/* | - | - | - |

### /campeonatos/:id/components/SumulaPartida.tsx

Arquivo: `web/app/campeonatos/[id]/components/SumulaPartida.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 221 | `select` | `{vinculo \|\| ''}` | select | - | - | `{vinculo \|\| ''}` |
| 265 | `input` | `{res.rank}` | number | - | - | `{res.rank}` |
| 275 | `input` | `{res.abates}` | number | - | - | `{res.abates}` |
| 2771 | `input` | input | file / .log,.txt,text/plain | - | - | - |
| 2962 | `input` | `{item.nickAtual}` | text | - | - | `{item.nickAtual}` |
| 2991 | `input` | `{item.abates}` | number | - | - | `{item.abates}` |

### /campeonatos/:id/components/TabelaCampeonato.tsx

Arquivo: `web/app/campeonatos/[id]/components/TabelaCampeonato.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 621 | `select` | `{filtroFase}` | select | - | - | `{filtroFase}` |
| 637 | `select` | `{filtroGrupo}` | select | - | - | `{filtroGrupo}` |
| 650 | `select` | `{filtroMapa}` | select | - | - | `{filtroMapa}` |
| 663 | `select` | `{filtroJogo}` | select | - | - | `{filtroJogo}` |

### /campeonatos/:id/components/TableEditor.tsx

Arquivo: `web/app/campeonatos/[id]/components/TableEditor.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 355 | `input` | `{settings.row_bg_image_opacity}` | range | - | - | `{settings.row_bg_image_opacity}` |
| 361 | `input` | `{settings.row_height}` | range | - | - | `{settings.row_height}` |
| 373 | `input` | `{settings.border_width}` | range | - | - | `{settings.border_width}` |
| 382 | `select` | `{settings.default_tab}` | select | - | - | `{settings.default_tab}` |
| 469 | `input` | `{value}` | color | - | - | `{value}` |
| 470 | `input` | `{value}` | text | - | - | `{value}` |
| 480 | `input` | `{Number(value \|\| 0)}` | number | - | - | `{Number(value \|\| 0)}` |
| 528 | `input` | `{safeColor}` | color | - | - | `{safeColor}` |
| 534 | `input` | herdar | text | - | - | `{value \|\| ''}` |

### /campeonatos/:id/editar

Arquivo: `web/app/campeonatos/[id]/editar/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 318 | `input` | `{contato.nome}` | text | - | - | `{contato.nome}` |
| 328 | `input` | `{contato.numero}` | text | - | - | `{contato.numero}` |
| 356 | `input` | `{form.nome}` | text | - | - | `{form.nome}` |
| 365 | `select` | `{form.status}` | select | - | - | `{form.status}` |
| 378 | `input` | `{form.vagas}` | number | - | - | `{form.vagas}` |
| 388 | `input` | `{form.valor_vaga}` | number | - | - | `{form.valor_vaga}` |
| 399 | `input` | `{form.valor_premiacao}` | number | - | - | `{form.valor_premiacao}` |
| 410 | `input` | `{form.data_inicio}` | datetime-local | - | - | `{form.data_inicio}` |
| 420 | `input` | `{form.data_fim}` | datetime-local | - | - | `{form.data_fim}` |
| 430 | `input` | `{form.data_abertura_inscricoes}` | datetime-local | - | - | `{form.data_abertura_inscricoes}` |
| 440 | `input` | `{form.data_encerramento_inscricoes}` | datetime-local | - | - | `{form.data_encerramento_inscricoes}` |
| 451 | `input` | `{form.whatsapp_suporte}` | text | - | - | `{form.whatsapp_suporte}` |
| 461 | `textarea` | `{form.descricao}` | textarea | - | - | `{form.descricao}` |

### /campeonatos/:id

Arquivo: `web/app/campeonatos/[id]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1733 | `input` | `{senhaCompra}` | password | - | - | `{senhaCompra}` |
| 1838 | `select` | `{equipeCompraId}` | select | - | - | `{equipeCompraId}` |
| 2212 | `input` | `{linkMobile}` | text | - | - | `{linkMobile}` |
| 2349 | `input` | `{contato.nome}` | text | - | - | `{contato.nome}` |
| 2362 | `input` | `{contato.numero}` | text | - | - | `{contato.numero}` |
| 2453 | `input` | input | file / image/* | - | - | - |
| 2480 | `input` | `{local}` | number | - | - | `{local}` |
| 2500 | `input` | `{local}` | text | - | - | `{local}` |
| 2519 | `textarea` | `{placeholder}` | textarea | - | - | `{local}` |
| 2555 | `input` | `{local}` | datetime-local | - | - | `{local}` |
| 2568 | `select` | `{value ?? ''}` | select | - | - | `{value ?? ''}` |
| 2965 | `select` | `{statusAtual.value}` | select | - | - | `{statusAtual.value}` |
| 2981 | `select` | `{statusAtual.value}` | select | - | - | `{statusAtual.value}` |
| 3018 | `input` | `{tempValue \|\| ''}` | text | - | - | `{tempValue \|\| ''}` |

### /campeonatos/:id/sorteador/client-page.tsx

Arquivo: `web/app/campeonatos/[id]/sorteador/client-page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 259 | `input` | `{subtitulo}` | text | - | - | `{subtitulo}` |
| 267 | `input` | `{qtdQuedasManual}` | number | - | - | `{qtdQuedasManual}` |

### /campeonatos/diarios/:id

Arquivo: `web/app/campeonatos/diarios/[id]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1918 | `select` | `{quedaAtiva \|\| quedaSelecionada?.id \|\| ''}` | select | - | - | `{quedaAtiva \|\| quedaSelecionada?.id \|\| ''}` |
| 2046 | `input` | `{mensagemChat}` | text | - | - | `{mensagemChat}` |
| 2197 | `select` | `{equipeSelecionadaId}` | select | - | - | `{equipeSelecionadaId}` |
| 2210 | `select` | `{lineSelecionadaId}` | select | - | - | `{lineSelecionadaId}` |

### /campeonatos/diarios

Arquivo: `web/app/campeonatos/diarios/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1880 | `select` | `{quedaAtiva \|\| quedaSelecionada?.id \|\| ''}` | select | - | - | `{quedaAtiva \|\| quedaSelecionada?.id \|\| ''}` |
| 2008 | `input` | `{mensagemChat}` | text | - | - | `{mensagemChat}` |
| 2126 | `select` | `{equipeSelecionadaId}` | select | - | - | `{equipeSelecionadaId}` |
| 2139 | `select` | `{lineSelecionadaId}` | select | - | - | `{lineSelecionadaId}` |

### /campeonatos/nova/components/FormConfiguracoes.tsx

Arquivo: `web/app/campeonatos/nova/components/FormConfiguracoes.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 97 | `select` | `{displayValue}` | select | - | - | `{displayValue}` |
| 108 | `input` | input | `{type}` | - | - | - |

### /campeonatos/nova/components/FormCriacaoTipo.tsx

Arquivo: `web/app/campeonatos/nova/components/FormCriacaoTipo.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1161 | `input` | input | file / image/* | - | - | - |
| 1224 | `input` | input | file / image/* | - | - | - |
| 1288 | `input` | `{form.nome}` | text | - | - | `{form.nome}` |
| 1299 | `input` | `{form.edicao}` | text | - | - | `{form.edicao}` |
| 1324 | `textarea` | `{form.descricao}` | textarea | - | - | `{form.descricao}` |
| 1337 | `input` | `{form.data_abertura_inscricoes}` | datetime-local | - | - | `{form.data_abertura_inscricoes}` |
| 1349 | `input` | `{form.data_encerramento_inscricoes}` | datetime-local | - | - | `{form.data_encerramento_inscricoes}` |
| 1361 | `select` | `{form.plataforma}` | select | - | - | `{form.plataforma}` |
| 1376 | `select` | `{form.categoria}` | select | - | - | `{form.categoria}` |
| 1442 | `select` | `{form.xtreino_modo}` | select | - | - | `{form.xtreino_modo}` |
| 1457 | `select` | `{form.xtreino_regra}` | select | - | - | `{form.xtreino_regra}` |
| 1473 | `select` | `{form.xtreino_tipo_inscricao}` | select | - | - | `{form.xtreino_tipo_inscricao}` |
| 1487 | `select` | `{form.xtreino_tem_premiacao}` | select | - | - | `{form.xtreino_tem_premiacao}` |
| 1503 | `input` | `{form.valor_vaga}` | number | - | - | `{form.valor_vaga}` |
| 1515 | `input` | `{form.valor_premiacao}` | number | - | - | `{form.valor_premiacao}` |
| 1530 | `input` | `{form.valor_vaga}` | number | - | - | `{form.valor_vaga}` |
| 1544 | `input` | `{form.valor_premiacao}` | number | - | - | `{form.valor_premiacao}` |
| 1571 | `input` | `{contato.nome}` | text | - | - | `{contato.nome}` |
| 1586 | `input` | `{contato.numero}` | text | - | - | `{contato.numero}` |
| 1637 | `select` | `{form.tipo_premiacao}` | select | - | - | `{form.tipo_premiacao}` |
| 1647 | `select` | `{form.premiacao_garantida ? 'sim' : 'nao'}` | select | - | - | `{form.premiacao_garantida ? 'sim' : 'nao'}` |
| 1655 | `select` | `{form.forma_pagamento}` | select | - | - | `{form.forma_pagamento}` |
| 1665 | `select` | `{form.forma_pagamento_premiacao}` | select | - | - | `{form.forma_pagamento_premiacao}` |
| 1674 | `input` | `{form.prazo_pagamento_premiacao}` | text | - | - | `{form.prazo_pagamento_premiacao}` |
| 1679 | `select` | `{form.checkin_obrigatorio ? 'sim' : 'nao'}` | select | - | - | `{form.checkin_obrigatorio ? 'sim' : 'nao'}` |
| 1688 | `input` | `{form.horario_checkin}` | time | - | - | `{form.horario_checkin}` |
| 1694 | `input` | `{form.jogadores_por_equipe}` | number | - | - | `{form.jogadores_por_equipe}` |
| 1699 | `input` | `{form.reservas_permitidos}` | number | - | - | `{form.reservas_permitidos}` |
| 1704 | `select` | `{form.substitutos_permitidos ? 'sim' : 'nao'}` | select | - | - | `{form.substitutos_permitidos ? 'sim' : 'nao'}` |
| 1712 | `input` | `{form.idade_minima}` | number | - | - | `{form.idade_minima}` |
| 1717 | `input` | `{form.nivel_minimo_conta}` | number | - | - | `{form.nivel_minimo_conta}` |
| 1722 | `select` | `{form.pro_players_proibidos ? 'sim' : 'nao'}` | select | - | - | `{form.pro_players_proibidos ? 'sim' : 'nao'}` |
| 1730 | `select` | `{form.troca_jogadores}` | select | - | - | `{form.troca_jogadores}` |
| 1740 | `input` | `{form.penalidade_wo}` | text | - | - | `{form.penalidade_wo}` |
| 1745 | `input` | `{form.limite_por_organizacao}` | number | - | - | `{form.limite_por_organizacao}` |
| 1750 | `input` | `{form.fuso_horario}` | text | - | - | `{form.fuso_horario}` |
| 1755 | `textarea` | `{form.guildas_restritas}` | textarea | - | - | `{form.guildas_restritas}` |
| 1778 | `select` | `{form.modo_confronto}` | select | - | - | `{form.modo_confronto}` |
| 1794 | `select` | `{form.estilo_confronto}` | select | - | - | `{form.estilo_confronto}` |
| 1808 | `select` | `{form.formato_evento}` | select | - | - | `{form.formato_evento}` |
| 1824 | `select` | `{form.melhor_de}` | select | - | - | `{form.melhor_de}` |
| 1839 | `input` | `{form.rounds_por_lado}` | number | - | - | `{form.rounds_por_lado}` |
| 1851 | `select` | `{form.troca_de_lado}` | select | - | - | `{form.troca_de_lado}` |
| 1865 | `select` | `{form.tem_prorrogacao}` | select | - | - | `{form.tem_prorrogacao}` |
| 1879 | `select` | `{form.admin_mode}` | select | - | - | `{form.admin_mode}` |
| 1893 | `select` | `{form.regra_wo}` | select | - | - | `{form.regra_wo}` |
| 1908 | `select` | `{form.tipo_mapa}` | select | - | - | `{form.tipo_mapa}` |
| 1923 | `select` | `{form.mapa_padrao}` | select | - | - | `{form.mapa_padrao}` |
| 1943 | `select` | `{form.usa_upper_lower}` | select | - | - | `{form.usa_upper_lower}` |
| 1957 | `select` | `{form.reset_final}` | select | - | - | `{form.reset_final}` |
| 1975 | `select` | `{form.ida_e_volta}` | select | - | - | `{form.ida_e_volta}` |
| 1989 | `input` | `{form.pontuacao_vitoria}` | number | - | - | `{form.pontuacao_vitoria}` |
| 2001 | `input` | `{form.pontuacao_derrota}` | number | - | - | `{form.pontuacao_derrota}` |
| 2017 | `input` | `{form.numero_grupos}` | number | - | - | `{form.numero_grupos}` |
| 2029 | `input` | `{form.classificados_por_grupo}` | number | - | - | `{form.classificados_por_grupo}` |
| 2073 | `input` | `{fase.nome}` | text | - | - | `{fase.nome}` |
| 2124 | `select` | `{extrairLetraGrupo(grupo.nome)}` | select | - | - | `{extrairLetraGrupo(grupo.nome)}` |
| 2144 | `input` | `{grupo.quantidade_equipes}` | number | - | - | `{grupo.quantidade_equipes}` |
| 2156 | `input` | `{grupo.numero_partidas}` | number | - | - | `{grupo.numero_partidas}` |
| 2168 | `input` | `{grupo.classificam}` | number | - | - | `{grupo.classificam}` |
| 2180 | `input` | `{grupo.dia_jogo}` | date | - | - | `{grupo.dia_jogo}` |
| 2192 | `input` | `{grupo.hora_jogo}` | time | - | - | `{grupo.hora_jogo}` |
| 2204 | `input` | `{grupo.intervalo_minutos}` | number | - | - | `{grupo.intervalo_minutos}` |
| 2217 | `select` | `{grupo.mapas[mapaIndex] \|\| 'BERMUDA'}` | select | - | - | `{grupo.mapas[mapaIndex] \|\| 'BERMUDA'}` |
| 2309 | `input` | `{cropAberto.zoom}` | range | - | - | `{cropAberto.zoom}` |
| 2324 | `input` | `{cropAberto.offsetX}` | range | - | - | `{cropAberto.offsetX}` |
| 2339 | `input` | `{cropAberto.offsetY}` | range | - | - | `{cropAberto.offsetY}` |

### /campeonatos

Arquivo: `web/app/campeonatos/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 677 | `input` | `{busca}` | text | - | - | `{busca}` |
| 687 | `select` | `{regiao}` | select | - | - | `{regiao}` |
| 698 | `select` | `{plataforma}` | select | - | - | `{plataforma}` |
| 709 | `select` | `{tipoCampeonato}` | select | - | - | `{tipoCampeonato}` |
| 721 | `select` | `{categoria}` | select | - | - | `{categoria}` |
| 732 | `input` | `{premioMin}` | number | - | - | `{premioMin}` |
| 741 | `input` | `{gratis}` | checkbox | - | - | `{gratis}` |

### /carteira/deposito

Arquivo: `web/app/carteira/deposito/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 264 | `input` | `{valor}` | number | - | - | `{valor}` |
| 305 | `textarea` | `{depositoAtual.qr_code \|\| ''}` | textarea | - | - | `{depositoAtual.qr_code \|\| ''}` |

### /carteira

Arquivo: `web/app/carteira/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 207 | `input` | `{value}` | `{type}` | - | - | `{value}` |
| 235 | `input` | input | file / `{accept}` | - | - | - |
| 752 | `InputCampo` | Nome completo | text | - | - | `{form.nome}` |
| 753 | `InputCampo` | CPF | text | - | - | `{form.cpf}` |
| 754 | `InputCampo` | Telefone | text | - | - | `{form.telefone}` |
| 755 | `InputCampo` | Data de nascimento | date | - | - | `{form.dataNascimento}` |
| 760 | `input` | `{form.maioridade}` | checkbox | - | - | `{form.maioridade}` |
| 764 | `input` | `{form.termos}` | checkbox | - | - | `{form.termos}` |
| 781 | `select` | `{form.tipoDocumento}` | select | - | - | `{form.tipoDocumento}` |
| 787 | `InputCampo` | Número do documento | text | - | - | `{form.numeroDocumento}` |
| 788 | `InputCampo` | Órgão emissor | text | - | - | `{form.orgaoEmissor}` |
| 789 | `InputCampo` | UF | text | - | - | `{form.ufDocumento}` |
| 790 | `InputCampo` | Data de emissão | date | - | - | `{form.dataEmissaoDocumento}` |
| 832 | `InputCampo` | Chave Pix | text | - | - | `{form.chavePix}` |
| 835 | `select` | `{form.tipoChave}` | select | - | - | `{form.tipoChave}` |
| 871 | `input` | `{valor}` | number | - | - | `{valor}` |
| 907 | `textarea` | `{depositoAtual.qr_code \|\| ''}` | textarea | - | - | `{depositoAtual.qr_code \|\| ''}` |

### /carteira/saque

Arquivo: `web/app/carteira/saque/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 343 | `input` | Digite o valor | text | - | - | `{valor}` |

### /components/AuthLinkCampeonato.tsx

Arquivo: `web/app/components/AuthLinkCampeonato.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 59 | `input` | input | text | - | - | - |
| 133 | `Field` | Nome | text | - | - | `{nome}` |
| 135 | `Field` | E-mail | email | - | - | `{email}` |
| 138 | `Field` | Codigo | text | - | - | `{codigo}` |
| 142 | `Field` | Senha | password | - | - | `{senha}` |
| 145 | `Field` | Confirmar senha | password | - | - | `{confirmarSenha}` |

### /components/AvaliacaoCampeonato.tsx

Arquivo: `web/app/components/AvaliacaoCampeonato.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 762 | `select` | `{origemSelecionada}` | select | - | - | `{origemSelecionada}` |
| 798 | `textarea` | `{comentario}` | textarea | - | - | `{comentario}` |
| 923 | `input` | `{respostaTexto}` | text | - | - | `{respostaTexto}` |

### /components/chat/ChatShell.tsx

Arquivo: `web/app/components/chat/ChatShell.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 660 | `input` | `{busca}` | text | - | - | `{busca}` |
| 900 | `input` | `{texto}` | text | - | - | `{texto}` |

### /components/ChatGlobal.tsx

Arquivo: `web/app/components/ChatGlobal.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 95 | `input` | `{novoTexto}` | text | - | - | `{novoTexto}` |

### /components/FormCriarCampeonato.tsx

Arquivo: `web/app/components/FormCriarCampeonato.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 278 | `input` | `{value}` | `{type}` | sim | - | `{value}` |
| 304 | `textarea` | `{value}` | textarea | - | - | `{value}` |
| 405 | `input` | input | file / image/* | - | - | - |
| 890 | `TextInput` | `{form.nome}` | text | sim | - | `{form.nome}` |
| 900 | `TextInput` | `{form.edicao}` | text | sim | - | `{form.edicao}` |
| 921 | `TextInput` | `{form.valor_premiacao}` | number | - | - | `{form.valor_premiacao}` |
| 931 | `TextInput` | `{form.valor_vaga}` | number | - | - | `{form.valor_vaga}` |
| 941 | `TextInput` | `{form.vagas}` | number | - | - | `{form.vagas}` |
| 951 | `UploadBox` | Logo do campeonato | text | - | - | - |
| 967 | `UploadBox` | Banner do campeonato | text | - | - | - |
| 1073 | `TextInput` | `{form.quedas_por_rodada}` | number | - | - | `{form.quedas_por_rodada}` |
| 1083 | `TextInput` | `{form.quantidade_rodadas}` | number | - | - | `{form.quantidade_rodadas}` |
| 1093 | `TextInput` | `{form.equipes_por_jogo}` | number | - | - | `{form.equipes_por_jogo}` |
| 1103 | `TextInput` | `{form.quantidade_quedas}` | number | - | - | `{form.quantidade_quedas}` |
| 1115 | `TextInput` | `{form.sistema_pontos_tipo}` | text | - | - | `{form.sistema_pontos_tipo}` |
| 1124 | `TextInput` | `{form.criterio_desempate}` | text | - | - | `{form.criterio_desempate}` |
| 1153 | `TextInput` | `{form.data_abertura_inscricoes}` | datetime-local | - | - | `{form.data_abertura_inscricoes}` |
| 1162 | `TextInput` | `{form.data_encerramento_inscricoes}` | datetime-local | - | - | `{form.data_encerramento_inscricoes}` |
| 1171 | `TextInput` | `{form.data_inicio}` | datetime-local | - | - | `{form.data_inicio}` |
| 1180 | `TextInput` | `{form.data_fim}` | datetime-local | - | - | `{form.data_fim}` |
| 1191 | `TextInput` | `{form.horario_inicio}` | time | - | - | `{form.horario_inicio}` |
| 1200 | `TextInput` | `{form.horario_checkin}` | time | - | - | `{form.horario_checkin}` |
| 1209 | `TextInput` | `{form.fuso_horario}` | text | - | - | `{form.fuso_horario}` |
| 1257 | `TextInput` | `{form.limite_por_organizacao}` | number | - | - | `{form.limite_por_organizacao}` |
| 1267 | `TextInput` | `{form.jogadores_por_equipe}` | number | - | - | `{form.jogadores_por_equipe}` |
| 1277 | `TextInput` | `{form.reservas_permitidos}` | number | - | - | `{form.reservas_permitidos}` |
| 1287 | `TextInput` | `{form.idade_minima}` | number | - | - | `{form.idade_minima}` |
| 1297 | `TextInput` | `{form.nivel_minimo_conta}` | number | - | - | `{form.nivel_minimo_conta}` |
| 1409 | `TextInput` | `{form.forma_pagamento_premiacao}` | text | - | - | `{form.forma_pagamento_premiacao}` |
| 1420 | `TextInput` | `{form.prazo_pagamento_premiacao}` | text | - | - | `{form.prazo_pagamento_premiacao}` |
| 1441 | `TextInput` | `{form.delay_transmissao}` | text | - | - | `{form.delay_transmissao}` |
| 1450 | `TextInput` | `{form.narradores}` | text | - | - | `{form.narradores}` |
| 1456 | `TextInput` | `{form.organizacao_nome}` | text | - | - | `{form.organizacao_nome}` |
| 1462 | `TextInput` | `{form.comissao_nome}` | text | - | - | `{form.comissao_nome}` |
| 1468 | `TextInput` | `{form.discord_url}` | text | - | - | `{form.discord_url}` |
| 1474 | `TextInput` | `{form.canal_oficial_url}` | text | - | - | `{form.canal_oficial_url}` |
| 1502 | `TextInput` | `{contato.nome}` | text | - | - | `{contato.nome}` |
| 1511 | `TextInput` | `{contato.numero}` | text | - | - | `{contato.numero}` |
| 1536 | `TextInput` | `{form.email_suporte}` | text | - | - | `{form.email_suporte}` |
| 1542 | `TextInput` | `{form.responsavel_nome}` | text | - | - | `{form.responsavel_nome}` |

### /components/FormCriarEquipe.tsx

Arquivo: `web/app/components/FormCriarEquipe.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 162 | `input` | input | file / image/* | - | - | - |
| 178 | `input` | input | file / image/* | - | - | - |
| 185 | `input` | `{nome}` | text | sim | - | `{nome}` |
| 186 | `input` | `{tag}` | text | - | - | `{tag}` |
| 187 | `input` | `{cidade}` | text | - | - | `{cidade}` |
| 188 | `input` | `{estado}` | text | - | - | `{estado}` |
| 189 | `input` | `{pais}` | text | - | - | `{pais}` |
| 190 | `input` | `{dataFundacao}` | date | - | - | `{dataFundacao}` |
| 191 | `textarea` | `{descricaoEquipe}` | textarea | - | - | `{descricaoEquipe}` |

### /components/FormCriarJogador.tsx

Arquivo: `web/app/components/FormCriarJogador.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 226 | `input` | input | file / image/* | - | - | - |
| 238 | `input` | NOME DE GUERRA | text | - | - | `{formData.nick}` |
| 252 | `input` | 87654321 | text | - | - | `{formData.id_jogo}` |
| 262 | `select` | `{formData.funcao}` | select | - | - | `{formData.funcao}` |
| 292 | `textarea` | Experiência em competitivos... | textarea | - | - | `{formData.bio}` |
| 322 | `input` | LINK-XXXXXX | text | - | - | `{tokenInput}` |

### /components/FormProdutora.tsx

Arquivo: `web/app/components/FormProdutora.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 333 | `input` | input | file / image/* | - | - | - |
| 371 | `input` | input | file / image/* | - | - | - |
| 384 | `input` | `{form.nome}` | text | - | - | `{form.nome}` |
| 403 | `input` | `{form.whatsapp_suporte \|\| ''}` | text | - | - | `{form.whatsapp_suporte \|\| ''}` |
| 415 | `input` | `{form.instagram_url \|\| ''}` | text | - | - | `{form.instagram_url \|\| ''}` |
| 427 | `input` | `{form.discord_url \|\| ''}` | text | - | - | `{form.discord_url \|\| ''}` |
| 442 | `textarea` | `{form.descricao}` | textarea | - | - | `{form.descricao}` |

### /components/ImageGalleryPicker.tsx

Arquivo: `web/app/components/ImageGalleryPicker.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 183 | `input` | input | file / image/* | - | - | - |

### /components/ModalAdicionarMembro.tsx

Arquivo: `web/app/components/ModalAdicionarMembro.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 106 | `input` | `{email}` | email | sim | - | `{email}` |

### /components/ServidorSelect.tsx

Arquivo: `web/app/components/ServidorSelect.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 31 | `select` | `{value}` | select | - | - | `{value}` |

### /components/stream/editor/SmartOverlayInspector.tsx

Arquivo: `web/app/components/stream/editor/SmartOverlayInspector.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 755 | `input` | `{enabled}` | checkbox | - | - | `{enabled}` |
| 764 | `input` | `{px}` | number | - | - | `{px}` |
| 795 | `input` | `{Boolean(value)}` | checkbox | - | - | `{Boolean(value)}` |
| 809 | `select` | `{String(value ?? '')}` | select | - | - | `{String(value ?? '')}` |
| 826 | `input` | input | file / image/* | - | - | - |
| 837 | `input` | `{String(value \|\| '')}` | text | - | - | `{String(value \|\| '')}` |
| 853 | `input` | `{String(value \|\| control.fallback \|\| '#ffffff').startsWith('#') ? String(value \|\| control.fallback) : '#ffffff'}` | color | - | - | `{String(value \|\| control.fallback \|\| '#ffffff').startsWith('#') ? String(value \|\| control.fallback) : '#ffffff'}` |
| 859 | `input` | `{String(value \|\| '')}` | text | - | - | `{String(value \|\| '')}` |
| 873 | `input` | `{String(value \|\| '')}` | text | - | - | `{String(value \|\| '')}` |
| 887 | `input` | `{Number.isFinite(numberValue) ? numberValue : 0}` | number | - | - | `{Number.isFinite(numberValue) ? numberValue : 0}` |

### /components/stream/overlays/mvp-geral/MvpGeralOverlayEditor.tsx

Arquivo: `web/app/components/stream/overlays/mvp-geral/MvpGeralOverlayEditor.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 154 | `input` | `{config.mvpGeral?.tableTitle \|\| ''}` | text | - | - | `{config.mvpGeral?.tableTitle \|\| ''}` |

### /confirmar/client-page.tsx

Arquivo: `web/app/confirmar/client-page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 237 | `input` | `{email}` | text | - | - | `{email}` |
| 252 | `input` | input | text | - | - | - |

### /confrontos/:id/components/GerenciarConfrontos.tsx

Arquivo: `web/app/confrontos/[id]/components/GerenciarConfrontos.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 737 | `input` | `{novaFase}` | text | - | - | `{novaFase}` |
| 738 | `select` | `{novoTipoFase}` | select | - | - | `{novoTipoFase}` |
| 792 | `select` | `{equipe1?.id \|\| ''}` | select | - | - | `{equipe1?.id \|\| ''}` |
| 802 | `select` | `{equipe2?.id \|\| ''}` | select | - | - | `{equipe2?.id \|\| ''}` |
| 808 | `input` | `{formatarDataInput(jogo)}` | date | - | - | `{formatarDataInput(jogo)}` |
| 809 | `input` | `{formatarHoraInput(jogo)}` | time | - | - | `{formatarHoraInput(jogo)}` |
| 810 | `select` | `{String(melhorDeTexto)}` | select | - | - | `{String(melhorDeTexto)}` |

### /confrontos/:id/components/GerenciarResultadosConfronto.tsx

Arquivo: `web/app/confrontos/[id]/components/GerenciarResultadosConfronto.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 620 | `select` | `{jogoSelecionadoId}` | select | - | - | `{jogoSelecionadoId}` |
| 701 | `input` | `{partidaAtual.roundsA}` | number | - | - | `{partidaAtual.roundsA}` |
| 717 | `input` | `{partidaAtual.roundsB}` | number | - | - | `{partidaAtual.roundsB}` |
| 751 | `input` | `{abatesJogadores[jogador.id]?.[partida.partida] ?? 0}` | number | - | - | `{abatesJogadores[jogador.id]?.[partida.partida] ?? 0}` |

### /confrontos/admin/:id

Arquivo: `web/app/confrontos/admin/[id]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 170 | `input` | `{roundsA}` | number | - | - | `{roundsA}` |
| 171 | `input` | `{roundsB}` | number | - | - | `{roundsB}` |
| 178 | `input` | `{abatesA}` | number | - | - | `{abatesA}` |
| 179 | `input` | `{abatesB}` | number | - | - | `{abatesB}` |

### /confrontos/ConfrontosPageClient.tsx

Arquivo: `web/app/confrontos/ConfrontosPageClient.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 430 | `input` | `{busca}` | text | - | - | `{busca}` |
| 693 | `select` | `{value}` | select | - | - | `{value}` |

### /confrontos/nova

Arquivo: `web/app/confrontos/nova/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 558 | `input` | `{titulo}` | text | - | - | `{titulo}` |
| 568 | `textarea` | `{descricao}` | textarea | - | - | `{descricao}` |
| 641 | `input` | `{valorPorLado}` | text | - | - | `{valorPorLado}` |
| 657 | `input` | `{dataPartida}` | datetime-local | - | - | `{dataPartida}` |
| 673 | `input` | `{prazoAceite}` | datetime-local | - | - | `{prazoAceite}` |
| 718 | `input` | `{usarMeuNickComoTime}` | checkbox | - | - | `{usarMeuNickComoTime}` |
| 737 | `input` | `{nomeTimeA}` | text | - | - | `{nomeTimeA}` |

### /denunciar/client-page.tsx

Arquivo: `web/app/denunciar/client-page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 101 | `select` | `{form.tipo_alvo}` | select | - | - | `{form.tipo_alvo}` |
| 106 | `input` | `{form.alvo_id}` | text | - | - | `{form.alvo_id}` |
| 112 | `select` | `{form.categoria}` | select | - | - | `{form.categoria}` |
| 117 | `select` | `{form.prioridade}` | select | - | - | `{form.prioridade}` |
| 127 | `input` | `{form.titulo}` | text | sim | - | `{form.titulo}` |
| 131 | `textarea` | `{form.descricao}` | textarea | sim | - | `{form.descricao}` |
| 135 | `input` | `{form.publica}` | checkbox | - | - | `{form.publica}` |
| 136 | `input` | `{form.anonima_para_publico}` | checkbox | - | - | `{form.anonima_para_publico}` |

### /dev/player-card

Arquivo: `web/app/dev/player-card/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 22 | `input` | `{name}` | text | - | - | `{name}` |

### /equipe/:id/components/AbaCampeonatos.tsx

Arquivo: `web/app/equipe/[id]/components/AbaCampeonatos.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1137 | `select` | `{lineSelecionadaId \|\| item.line_id \|\| ''}` | select | - | - | `{lineSelecionadaId \|\| item.line_id \|\| ''}` |
| 1449 | `select` | select | select | - | - | - |

### /equipe/:id/components/AbaJogadores.tsx

Arquivo: `web/app/equipe/[id]/components/AbaJogadores.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 606 | `select` | `{perfilTrocaPorLinha[jogador.row_id] \|\| ''}` | select | - | - | `{perfilTrocaPorLinha[jogador.row_id] \|\| ''}` |
| 662 | `input` | `{busca}` | text | - | - | `{busca}` |
| 670 | `input` | `{mensagemConvite}` | text | - | - | `{mensagemConvite}` |

### /equipe/:id/components/AbaLideres.tsx

Arquivo: `web/app/equipe/[id]/components/AbaLideres.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 300 | `input` | `{busca}` | text | - | - | `{busca}` |

### /equipe/:id/components/AbaLines.tsx

Arquivo: `web/app/equipe/[id]/components/AbaLines.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 578 | `input` | `{nome}` | text | - | - | `{nome}` |
| 585 | `input` | input | file / image/* | - | - | - |
| 588 | `select` | `{tipo}` | select | - | - | `{tipo}` |
| 591 | `select` | `{visibilidade}` | select | - | - | `{visibilidade}` |
| 594 | `select` | `{plataforma}` | select | - | - | `{plataforma}` |
| 769 | `select` | `{slot.perfil_jogo_id \|\| ""}` | select | - | - | `{slot.perfil_jogo_id \|\| ""}` |
| 776 | `input` | `{slot.funcao_line \|\| ""}` | text | - | - | `{slot.funcao_line \|\| ""}` |

### /equipe/:id/editar

Arquivo: `web/app/equipe/[id]/editar/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 245 | `input` | input | file / image/* | - | - | - |
| 253 | `input` | `{nome}` | text | sim | - | `{nome}` |
| 257 | `input` | `{tag}` | text | - | - | `{tag}` |
| 264 | `input` | `{cidade}` | text | - | - | `{cidade}` |
| 268 | `input` | `{estado}` | text | - | - | `{estado}` |
| 272 | `input` | `{pais}` | text | - | - | `{pais}` |
| 278 | `input` | `{dataFundacao}` | date | - | - | `{dataFundacao}` |
| 283 | `textarea` | `{descricao}` | textarea | - | - | `{descricao}` |
| 291 | `input` | input | file / image/* | - | - | - |

### /equipe

Arquivo: `web/app/equipe/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 786 | `input` | `{busca}` | text | - | - | `{busca}` |

### /escala/:campeonatoId

Arquivo: `web/app/escala/[campeonatoId]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 2506 | `input` | `{novaSenhaBeta}` | text | - | - | `{novaSenhaBeta}` |
| 2514 | `input` | `{confirmarNovaSenhaBeta}` | text | - | - | `{confirmarNovaSenhaBeta}` |
| 2838 | `select` | `{formPerfilBeta.servidor}` | select | - | - | `{formPerfilBeta.servidor}` |
| 2862 | `select` | `{formPerfilBeta.plataforma}` | select | - | - | `{formPerfilBeta.plataforma}` |
| 2877 | `select` | `{formPerfilBeta.funcao}` | select | - | - | `{formPerfilBeta.funcao}` |
| 2908 | `input` | input | file / image/* | - | - | - |
| 2977 | `select` | `{equipeSelecionadaId \|\| ""}` | select | - | - | `{equipeSelecionadaId \|\| ""}` |
| 3233 | `input` | `{formLine.nome}` | text | - | - | `{formLine.nome}` |
| 3251 | `input` | input | file / image/* | - | - | - |
| 3467 | `input` | `{linkGerado.url}` | text | - | - | `{linkGerado.url}` |
| 3487 | `select` | `{painelEquipeAtivo === "lideres" ? "lideres" : subJogadoresAtiva}` | select | - | - | `{painelEquipeAtivo === "lideres" ? "lideres" : subJogadoresAtiva}` |
| 3513 | `input` | `{buscaJogadorEquipe}` | text | - | - | `{buscaJogadorEquipe}` |
| 3666 | `input` | `{managerBusca}` | text | - | - | `{managerBusca}` |
| 4093 | `input` | `{buscaEquipeJogador}` | text | - | - | `{buscaEquipeJogador}` |
| 4099 | `input` | `{mensagemPedidoJogador}` | text | - | - | `{mensagemPedidoJogador}` |
| 4871 | `input` | `{busca}` | text | - | - | `{busca}` |
| 4925 | `textarea` | `{mensagem}` | textarea | - | - | `{mensagem}` |
| 5201 | `input` | `{value}` | text | - | - | `{value}` |

### /escala/vaga/:campeonatoEquipeId

Arquivo: `web/app/escala/vaga/[campeonatoEquipeId]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 830 | `input` | `{busca}` | text | - | - | `{busca}` |
| 837 | `textarea` | `{mensagem}` | textarea | - | - | `{mensagem}` |

### /feed/components/ComentariosModal.tsx

Arquivo: `web/app/feed/components/ComentariosModal.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 193 | `textarea` | `{novoComentario}` | textarea | - | - | `{novoComentario}` |

### /feed/components/RepostModal.tsx

Arquivo: `web/app/feed/components/RepostModal.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 221 | `textarea` | `{legenda}` | textarea | - | - | `{legenda}` |

### /feed

Arquivo: `web/app/feed/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1074 | `input` | input | file / image/* | - | - | - |
| 1076 | `textarea` | `{storyText}` | textarea | - | - | `{storyText}` |
| 1202 | `input` | `{commentText}` | text | - | - | `{commentText}` |

### /inscricao/:token

Arquivo: `web/app/inscricao/[token]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 364 | `select` | `{perfilSelecionadoId}` | select | - | - | `{perfilSelecionadoId}` |

### /jogadores/:id

Arquivo: `web/app/jogadores/[id]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 708 | `input` | `{buscaEquipe}` | text | - | - | `{buscaEquipe}` |
| 714 | `input` | `{mensagemPedido}` | text | - | - | `{mensagemPedido}` |

### /jogadores

Arquivo: `web/app/jogadores/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 545 | `input` | `{busca}` | text | - | - | `{busca}` |
| 553 | `select` | `{filtroPlataforma}` | select | - | - | `{filtroPlataforma}` |

### /kyc/selfie/client-page.tsx

Arquivo: `web/app/kyc/selfie/client-page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 391 | `input` | input | file / image/* | - | - | - |

### /lbff

Arquivo: `web/app/lbff/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1061 | `input` | `{busca}` | text | - | - | `{busca}` |
| 1674 | `Field` | Equipe | text | - | - | `{form.nome}` |
| 1679 | `Field` | Tag | text | - | - | `{form.tag}` |
| 1684 | `Field` | Grupo | text | - | - | `{form.grupo}` |
| 1689 | `Field` | Cor | text | - | - | `{form.cor}` |
| 1755 | `Field` | Jogador | text | - | - | `{form.jogador}` |
| 1760 | `Field` | ID de jogo | text | - | - | `{form.id_jogo}` |
| 1765 | `SelectField` | Equipe | select | - | - | `{form.equipe_id}` |
| 1772 | `Field` | Função | text | - | - | `{form.funcao}` |
| 1831 | `SelectField` | Selecionar equipe | select | - | - | `{form.id \|\| ""}` |
| 1842 | `Field` | Pontos | text | - | - | `{form.pontos}` |
| 1847 | `Field` | Booyah | text | - | - | `{form.booyah}` |
| 1852 | `Field` | Abates | text | - | - | `{form.abates}` |
| 1857 | `Field` | Quedas | text | - | - | `{form.quedas}` |
| 1897 | `SelectField` | Selecionar jogador | select | - | - | `{form.id \|\| ""}` |
| 1911 | `Field` | Quedas | text | - | - | `{form.quedas}` |
| 1916 | `Field` | Abates | text | - | - | `{form.abates}` |
| 1921 | `Field` | Dano | text | - | - | `{form.dano}` |
| 1926 | `Field` | Assistências | text | - | - | `{form.assists}` |
| 1931 | `Field` | MVP | text | - | - | `{form.mvp}` |
| 1936 | `Field` | Capas | text | - | - | `{form.capas}` |
| 1941 | `Field` | Derrubados | text | - | - | `{form.derrubados}` |
| 1946 | `Field` | Gelos | text | - | - | `{form.gelos}` |
| 1951 | `Field` | Gelos destruídos | text | - | - | `{form.gelos_destruidos}` |
| 1956 | `Field` | Reviveu | text | - | - | `{form.reviveu}` |
| 1961 | `Field` | Aliados revividos | text | - | - | `{form.aliados_revividos}` |
| 2302 | `input` | input | file / image/* | - | - | - |
| 2465 | `input` | `{value}` | range | - | - | `{value}` |
| 2494 | `input` | `{value}` | text | - | - | `{value}` |
| 2523 | `select` | `{value}` | select | - | - | `{value}` |
| 2619 | `input` | input | file / `{accept}` | - | - | - |

### /line/:id

Arquivo: `web/app/line/[id]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 407 | `input` | `{busca}` | text | - | - | `{busca}` |
| 1085 | `input` | `{form.nome}` | text | - | - | `{form.nome}` |
| 1120 | `input` | input | file / image/* | - | - | - |
| 1140 | `select` | `{form.tipo}` | select | - | - | `{form.tipo}` |
| 1156 | `select` | `{form.plataforma}` | select | - | - | `{form.plataforma}` |
| 1171 | `select` | `{form.visibilidade}` | select | - | - | `{form.visibilidade}` |
| 1184 | `select` | `{form.equipe_id}` | select | - | - | `{form.equipe_id}` |
| 1201 | `input` | `{form.coach_nome}` | text | - | - | `{form.coach_nome}` |
| 1211 | `input` | `{form.analista_nome}` | text | - | - | `{form.analista_nome}` |
| 1221 | `textarea` | `{form.descricao}` | textarea | - | - | `{form.descricao}` |
| 1230 | `input` | `{form.ativa}` | checkbox | - | - | `{form.ativa}` |
| 1271 | `input` | `{buscaPerfil}` | text | - | - | `{buscaPerfil}` |

### /login

Arquivo: `web/app/login/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 36 | `input` | input | text | - | - | - |
| 138 | `Field` | E-mail | email | - | - | `{email}` |
| 139 | `Field` | Senha | password | - | - | `{password}` |

### /manager

Arquivo: `web/app/manager/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 548 | `input` | `{busca}` | text | - | - | `{busca}` |

### /moderadores

Arquivo: `web/app/moderadores/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 551 | `input` | `{abates[j.perfil_jogo_id] \|\| 0}` | number | - | - | `{abates[j.perfil_jogo_id] \|\| 0}` |
| 601 | `input` | `{correcao.partidasA}` | number | - | - | `{correcao.partidasA}` |
| 604 | `input` | `{correcao.partidasB}` | number | - | - | `{correcao.partidasB}` |
| 607 | `input` | `{correcao.roundsA}` | number | - | - | `{correcao.roundsA}` |
| 610 | `input` | `{correcao.roundsB}` | number | - | - | `{correcao.roundsB}` |
| 649 | `input` | `{abates[j.perfil_jogo_id] \|\| 0}` | number | - | - | `{abates[j.perfil_jogo_id] \|\| 0}` |

### /perfil/atuacao

Arquivo: `web/app/perfil/atuacao/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 257 | `input` | `{busca}` | text | - | - | `{busca}` |
| 290 | `input` | `{stream.titulo \|\| ''}` | text | - | - | `{stream.titulo \|\| ''}` |
| 293 | `input` | `{stream.valor_base \|\| 0}` | number | - | - | `{stream.valor_base \|\| 0}` |
| 296 | `textarea` | `{stream.bio_stream \|\| ''}` | textarea | - | - | `{stream.bio_stream \|\| ''}` |
| 299 | `input` | `{stream.setup \|\| ''}` | text | - | - | `{stream.setup \|\| ''}` |
| 302 | `input` | `{stream.contato_preferencial \|\| ''}` | text | - | - | `{stream.contato_preferencial \|\| ''}` |
| 332 | `select` | `{novoHorario.dia_semana}` | select | - | - | `{novoHorario.dia_semana}` |
| 336 | `input` | `{novoHorario.hora_inicio}` | time | - | - | `{novoHorario.hora_inicio}` |
| 337 | `input` | `{novoHorario.hora_fim}` | time | - | - | `{novoHorario.hora_fim}` |

### /perfil/components/ModalEditarPerfil.tsx

Arquivo: `web/app/perfil/components/ModalEditarPerfil.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 129 | `input` | input | file / image/* | - | - | - |
| 160 | `input` | `{formData.nome}` | text | sim | - | `{formData.nome}` |
| 176 | `input` | `{formData.game_id}` | text | sim | - | `{formData.game_id}` |
| 189 | `select` | `{formData.funcao}` | select | - | - | `{formData.funcao}` |
| 208 | `textarea` | `{formData.bio}` | textarea | - | - | `{formData.bio}` |

### /perfil/pagamento

Arquivo: `web/app/perfil/pagamento/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 337 | `input` | Nome completo | text | - | - | `{nome}` |
| 343 | `input` | CPF | text | - | - | `{cpf}` |
| 349 | `input` | Telefone | text | - | - | `{telefone}` |
| 355 | `input` | `{dataNascimento}` | date | - | - | `{dataNascimento}` |
| 368 | `input` | Chave Pix | text | - | - | `{chave}` |
| 375 | `select` | `{tipo}` | select | - | - | `{tipo}` |
| 392 | `select` | `{tipoDocumento}` | select | - | - | `{tipoDocumento}` |
| 401 | `input` | Número do documento | text | - | - | `{numeroDocumento}` |
| 407 | `input` | Órgão emissor | text | - | - | `{orgaoEmissor}` |
| 413 | `input` | UF | text | - | - | `{ufDocumento}` |
| 420 | `input` | `{dataEmissaoDocumento}` | date | - | - | `{dataEmissaoDocumento}` |
| 433 | `input` | input | file / image/*,.pdf | - | - | - |
| 455 | `input` | input | file / image/*,.pdf | - | - | - |
| 475 | `input` | input | file / image/* | - | - | - |
| 539 | `input` | `{maioridade}` | checkbox | - | - | `{maioridade}` |
| 544 | `input` | `{termos}` | checkbox | - | - | `{termos}` |

### /perfil

Arquivo: `web/app/perfil/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 695 | `input` | input | file / image/* | - | - | - |
| 723 | `input` | input | file / image/* | - | - | - |
| 739 | `input` | `{nomeExibicao}` | text | - | - | `{nomeExibicao}` |
| 746 | `input` | `{username}` | text | - | - | `{username}` |
| 753 | `input` | `{dataNascimento}` | date | - | - | `{dataNascimento}` |
| 762 | `input` | `{localBusca}` | text | - | - | `{localBusca}` |
| 797 | `input` | `{cidade}` | text | - | - | `{cidade}` |
| 803 | `input` | `{estado}` | text | - | - | `{estado}` |
| 809 | `input` | `{pais}` | text | - | - | `{pais}` |
| 895 | `textarea` | `{bio}` | textarea | - | - | `{bio}` |

### /perfil/tabs/TabGamer.tsx

Arquivo: `web/app/perfil/tabs/TabGamer.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 1348 | `input` | `{buscaEquipe}` | text | - | - | `{buscaEquipe}` |
| 1349 | `input` | `{mensagemPedido}` | text | - | - | `{mensagemPedido}` |
| 1448 | `select` | `{formEdicao.plataforma}` | select | - | - | `{formEdicao.plataforma}` |
| 1472 | `input` | input | file / image/* | - | - | - |
| 1477 | `input` | `{fotoZoom}` | range | - | - | `{fotoZoom}` |
| 1481 | `input` | `{fotoPosX}` | range | - | - | `{fotoPosX}` |
| 1485 | `input` | `{fotoPosY}` | range | - | - | `{fotoPosY}` |
| 1539 | `input` | `{value}` | text | - | - | `{value}` |

### /produtora/:id/gestao

Arquivo: `web/app/produtora/[id]/gestao/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 355 | `input` | `{busca}` | text | - | - | `{busca}` |
| 396 | `textarea` | `{mensagem}` | textarea | - | - | `{mensagem}` |

### /produtora

Arquivo: `web/app/produtora/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 325 | `input` | Filtrar por nome, slug ou id... | text | - | - | `{busca}` |

### /ranking

Arquivo: `web/app/ranking/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 99 | `input` | `{busca}` | text | - | - | `{busca}` |

### /recuperar

Arquivo: `web/app/recuperar/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 36 | `input` | input | text | - | - | - |
| 131 | `Field` | E-mail da conta | email | - | - | `{email}` |
| 139 | `Field` | Código de 6 números | text | - | - | `{codigo}` |
| 148 | `Field` | Nova senha | password | - | - | `{senha}` |
| 149 | `Field` | Confirmar senha | password | - | - | `{confirmarSenha}` |

### /stream/control/:id

Arquivo: `web/app/stream/control/[id]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 234 | `select` | `{equipeSelecionadaId}` | select | - | - | `{equipeSelecionadaId}` |

### /stream/controller

Arquivo: `web/app/stream/controller/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 797 | `input` | `{obsHost}` | text | - | - | `{obsHost}` |
| 798 | `input` | `{obsPort}` | text | - | - | `{obsPort}` |
| 800 | `input` | `{obsPassword}` | text | - | - | `{obsPassword}` |
| 878 | `input` | `{projectKey}` | text | - | - | `{projectKey}` |
| 879 | `input` | `{projectLabel}` | text | - | - | `{projectLabel}` |

### /stream/controller/panel/:producerKey

Arquivo: `web/app/stream/controller/panel/[producerKey]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 237 | `select` | `{selectedProjectId}` | select | - | - | `{selectedProjectId}` |

### /stream/editor/:projectId

Arquivo: `web/app/stream/editor/[projectId]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 2081 | `EditorNumber` | X | text | - | - | `{Number(booyahsDiaConfig.artSideX ?? 80)}` |
| 2082 | `EditorNumber` | Y | text | - | - | `{Number(booyahsDiaConfig.artSideY ?? 160)}` |
| 2083 | `EditorNumber` | Largura | text | - | - | `{Number(booyahsDiaConfig.artSideW ?? 720)}` |
| 2084 | `EditorNumber` | Altura | text | - | - | `{Number(booyahsDiaConfig.artSideH ?? 620)}` |
| 2088 | `EditorNumber` | X | text | - | - | `{Number(booyahsDiaConfig.artX ?? 0)}` |
| 2089 | `EditorNumber` | Y | text | - | - | `{Number(booyahsDiaConfig.artY ?? 20)}` |
| 2090 | `EditorNumber` | Largura | text | - | - | `{Number(booyahsDiaConfig.artW ?? 1920)}` |
| 2091 | `EditorNumber` | Altura | text | - | - | `{Number(booyahsDiaConfig.artH ?? 260)}` |
| 2096 | `EditorNumber` | X | text | - | - | `{Number(booyahsDiaConfig.listX ?? 940)}` |
| 2097 | `EditorNumber` | Y | text | - | - | `{Number(booyahsDiaConfig.listY ?? 160)}` |
| 2098 | `EditorNumber` | Largura | text | - | - | `{Number(booyahsDiaConfig.listW ?? 820)}` |
| 2099 | `EditorNumber` | Altura | text | - | - | `{Number(booyahsDiaConfig.listH ?? 760)}` |
| 2103 | `EditorNumber` | X | text | - | - | `{Number(booyahsDiaConfig.x ?? 36)}` |
| 2104 | `EditorNumber` | Y | text | - | - | `{Number(booyahsDiaConfig.y ?? 360)}` |
| 2105 | `EditorNumber` | Area cards | text | - | - | `{Number(booyahsDiaConfig.containerWidth ?? 1840)}` |
| 2110 | `EditorNumber` | X | text | - | - | `{selectedCountdownConfig.x ?? selectedCountdownFallback.x}` |
| 2111 | `EditorNumber` | Y | text | - | - | `{selectedCountdownConfig.y ?? selectedCountdownFallback.y}` |
| 2112 | `EditorNumber` | Largura | text | - | - | `{selectedCountdownConfig.w ?? selectedCountdownFallback.w}` |
| 2113 | `EditorNumber` | Altura | text | - | - | `{selectedCountdownConfig.h ?? selectedCountdownFallback.h}` |
| 2114 | `EditorNumber` | Escala | text | - | - | `{selectedCountdownConfig.scale ?? selectedCountdownFallback.scale}` |
| 2115 | `EditorNumber` | Opacidade | text | - | - | `{selectedCountdownConfig.opacity ?? selectedCountdownFallback.opacity}` |
| 2119 | `EditorNumber` | X | text | - | - | `{selectedBooyahConfig.x ?? selectedBooyahFallback.x}` |
| 2120 | `EditorNumber` | Y | text | - | - | `{selectedBooyahConfig.y ?? selectedBooyahFallback.y}` |
| 2121 | `EditorNumber` | Largura | text | - | - | `{selectedBooyahConfig.w ?? selectedBooyahFallback.w}` |
| 2122 | `EditorNumber` | Altura | text | - | - | `{selectedBooyahConfig.h ?? selectedBooyahFallback.h}` |
| 2123 | `EditorNumber` | Escala | text | - | - | `{selectedBooyahConfig.scale ?? selectedBooyahFallback.scale}` |
| 2124 | `EditorNumber` | Opacidade | text | - | - | `{selectedBooyahConfig.opacity ?? selectedBooyahFallback.opacity}` |
| 2128 | `EditorNumber` | X | text | - | - | `{config.tabelaGeral?.infoImage?.x \|\| 0}` |
| 2129 | `EditorNumber` | Y | text | - | - | `{config.tabelaGeral?.infoImage?.y \|\| 0}` |
| 2130 | `EditorNumber` | Largura | text | - | - | `{config.tabelaGeral?.infoImage?.w \|\| 1920}` |
| 2131 | `EditorNumber` | Altura | text | - | - | `{config.tabelaGeral?.infoImage?.h \|\| 260}` |
| 2132 | `EditorNumber` | Opacidade | text | - | - | `{config.tabelaGeral?.infoImage?.opacity \|\| 100}` |
| 2137 | `EditorNumber` | X | text | - | - | `{config.mvpGeral?.photoX ?? 50}` |
| 2138 | `EditorNumber` | Y | text | - | - | `{config.mvpGeral?.photoY ?? 120}` |
| 2139 | `EditorNumber` | Largura | text | - | - | `{config.mvpGeral?.photoW ?? 600}` |
| 2140 | `EditorNumber` | Altura | text | - | - | `{config.mvpGeral?.photoH ?? 850}` |
| 2141 | `EditorNumber` | Opacidade | text | - | - | `{config.brand?.opacity \|\| 100}` |
| 2145 | `EditorNumber` | X | text | - | - | `{config.brand?.x \|\| 0}` |
| 2146 | `EditorNumber` | Y | text | - | - | `{config.brand?.y \|\| 0}` |
| 2147 | `EditorNumber` | Largura | text | - | - | `{config.brand?.w \|\| 0}` |
| 2148 | `EditorNumber` | Altura | text | - | - | `{config.brand?.h \|\| 0}` |
| 2149 | `EditorNumber` | Escala | text | - | - | `{config.brand?.scale \|\| 100}` |
| 2150 | `EditorNumber` | Opacidade | text | - | - | `{config.brand?.opacity \|\| 100}` |
| 2156 | `EditorNumber` | X | text | - | - | `{config.mvpGeral?.infoX ?? 50}` |
| 2157 | `EditorNumber` | Y | text | - | - | `{config.mvpGeral?.infoY ?? 842}` |
| 2158 | `EditorNumber` | Largura | text | - | - | `{config.mvpGeral?.infoW ?? 600}` |
| 2159 | `EditorNumber` | Altura | text | - | - | `{config.mvpGeral?.infoH ?? 128}` |
| 2160 | `EditorNumber` | Opacidade | text | - | - | `{config.brand?.textOpacity \|\| 100}` |
| 2164 | `EditorNumber` | X | text | - | - | `{config.brand?.textX \|\| 0}` |
| 2165 | `EditorNumber` | Y | text | - | - | `{config.brand?.textY \|\| 0}` |
| 2166 | `EditorNumber` | Largura | text | - | - | `{config.brand?.textW \|\| 0}` |
| 2167 | `EditorNumber` | Altura | text | - | - | `{config.brand?.textH \|\| 0}` |
| 2168 | `EditorNumber` | Escala | text | - | - | `{config.brand?.textScale \|\| 100}` |
| 2169 | `EditorNumber` | Opacidade | text | - | - | `{config.brand?.textOpacity \|\| 100}` |
| 2175 | `EditorNumber` | X | text | - | - | `{config.mvpGeral?.tableX ?? 730}` |
| 2176 | `EditorNumber` | Y | text | - | - | `{config.mvpGeral?.tableY ?? 260}` |
| 2177 | `EditorNumber` | Largura | text | - | - | `{config.mvpGeral?.tableW ?? 1140}` |
| 2178 | `EditorNumber` | Opacidade | text | - | - | `{config.layout.opacity \|\| 100}` |
| 2182 | `EditorNumber` | X | text | - | - | `{config.layout.x \|\| 0}` |
| 2183 | `EditorNumber` | Y | text | - | - | `{config.layout.y \|\| 0}` |
| 2184 | `EditorNumber` | Largura | text | - | - | `{config.layout.w \|\| 0}` |
| 2185 | `EditorNumber` | Escala | text | - | - | `{config.layout.scale \|\| 100}` |
| 2186 | `EditorNumber` | Opacidade | text | - | - | `{config.layout.opacity \|\| 100}` |
| 2202 | `input` | input | file / image/* | - | - | - |
| 2207 | `EditorSelect` | Ajuste da imagem | select | - | - | `{booyahsDiaConfig.artFit \|\| 'contain'}` |
| 2213 | `input` | input | file / image/* | - | - | - |
| 2220 | `input` | input | file / image/* | - | - | - |
| 2229 | `input` | input | file / image/* | - | - | - |
| 2245 | `EditorNumber` | Tempo em segundos | text | - | - | `{config.countdown?.seconds \|\| 900}` |
| 2252 | `EditorNumber` | Quantidade equipes | text | - | - | `{config.countdown?.maxEquipes \|\| 18}` |
| 2253 | `EditorNumber` | Colunas | text | - | - | `{config.countdown?.equipesBlock?.columns \|\| 3}` |
| 2255 | `input` | `{Boolean(config.countdown?.filtrarPorJogo)}` | checkbox | - | - | `{Boolean(config.countdown?.filtrarPorJogo)}` |
| 2270 | `input` | input | file / image/* | - | - | - |
| 2283 | `EditorNumber` | Delay entrada ms | text | - | - | `{selectedBooyahConfig.delay \|\| 2000}` |
| 2284 | `EditorSelect` | Ajuste logo | select | - | - | `{selectedBooyahConfig.fit \|\| 'contain'}` |
| 2285 | `EditorSelect` | Posicao logo | select | - | - | `{selectedBooyahConfig.position \|\| 'center center'}` |
| 2290 | `EditorNumber` | Delay entrada ms | text | - | - | `{selectedBooyahConfig.delay \|\| 2200}` |
| 2291 | `EditorSelect` | Alinhamento | select | - | - | `{selectedBooyahConfig.align \|\| 'left'}` |
| 2298 | `input` | `{config.tabelaGeral?.infoImage?.enabled !== false}` | checkbox | - | - | `{config.tabelaGeral?.infoImage?.enabled !== false}` |
| 2303 | `input` | input | file / image/* | - | - | - |
| 2305 | `EditorSelect` | Ajuste imagem | select | - | - | `{config.tabelaGeral?.infoImage?.fit \|\| 'contain'}` |
| 2318 | `input` | `{config.brand?.imageEnabled !== false}` | checkbox | - | - | `{config.brand?.imageEnabled !== false}` |
| 2331 | `input` | input | file / image/* | - | - | - |
| 2333 | `EditorSelect` | Ajuste imagem | select | - | - | `{isMvpGeralOverlay ? (config.mvpGeral?.photoFit \|\| config.brand?.objectFit \|\| 'cover') : (config.brand?.objectFit \|\| 'contain')}` |
| 2334 | `EditorSelect` | Posicao imagem | select | - | - | `{config.brand?.objectPosition \|\| 'center center'}` |
| 2347 | `input` | `{config.brand?.textEnabled !== false}` | checkbox | - | - | `{config.brand?.textEnabled !== false}` |
| 2388 | `EditorColor` | Cor destaque | text | - | - | `{booyahsDiaConfig.accent \|\| '#82a82b'}` |
| 2389 | `EditorColor` | Fundo | text | - | - | `{booyahsDiaConfig.background \|\| '#eef3e8'}` |
| 2392 | `EditorColor` | Cor fundo pontos | text | - | - | `{booyahsDiaConfig.statsBackground \|\| '#ffffff'}` |
| 2393 | `EditorColor` | Cor texto pontos | text | - | - | `{booyahsDiaConfig.statsText \|\| '#1f2937'}` |
| 2402 | `EditorSelect` | Alinhamento texto | select | - | - | `{selectedCountdownConfig.align \|\| 'center'}` |
| 2404 | `EditorSelect` | Borda | select | - | - | `{selectedCountdownConfig.border \|\| 'none'}` |
| 2405 | `EditorSelect` | Sombra | select | - | - | `{selectedCountdownConfig.shadow \|\| 'none'}` |
| 2406 | `EditorNumber` | Canto / raio | text | - | - | `{selectedCountdownConfig.radius \|\| 28}` |
| 2407 | `EditorColor` | Cor titulo | text | - | - | `{selectedCountdownConfig.titleColor \|\| '#ffffff'}` |
| 2408 | `EditorColor` | Cor relogio | text | - | - | `{selectedCountdownConfig.clockColor \|\| '#ffffff'}` |
| 2409 | `EditorColor` | Cor destaque | text | - | - | `{selectedCountdownConfig.accentColor \|\| '#f6c453'}` |
| 2410 | `EditorColor` | Cor info quedas | text | - | - | `{selectedCountdownConfig.infoColor \|\| 'rgba(255,255,255,0.8)'}` |
| 2416 | `EditorSelect` | Borda bloco | select | - | - | `{selectedCountdownConfig.border \|\| 'none'}` |
| 2417 | `EditorSelect` | Sombra bloco | select | - | - | `{selectedCountdownConfig.shadow \|\| 'none'}` |
| 2418 | `EditorNumber` | Canto bloco | text | - | - | `{selectedCountdownConfig.radius \|\| 24}` |
| 2419 | `EditorSelect` | Borda linha | select | - | - | `{selectedCountdownConfig.rowBorder \|\| 'none'}` |
| 2420 | `EditorColor` | Cor titulo | text | - | - | `{selectedCountdownConfig.titleColor \|\| '#ffffff'}` |
| 2422 | `EditorColor` | Texto linha mapa | text | - | - | `{selectedCountdownConfig.rowTextColor \|\| '#020617'}` |
| 2427 | `EditorSelect` | Grade no bloco | select | - | - | `{selectedCountdownConfig.gridAlign \|\| 'start'}` |
| 2428 | `EditorSelect` | Conteudo horizontal | select | - | - | `{selectedCountdownConfig.contentAlign \|\| 'center'}` |
| 2429 | `EditorSelect` | Conteudo vertical | select | - | - | `{selectedCountdownConfig.verticalAlign \|\| 'center'}` |
| 2430 | `EditorSelect` | Ajuste logo | select | - | - | `{selectedCountdownConfig.logoFit \|\| 'contain'}` |
| 2431 | `EditorSelect` | Posicao logo | select | - | - | `{selectedCountdownConfig.logoPosition \|\| 'center center'}` |
| 2432 | `EditorColor` | Cor titulo | text | - | - | `{selectedCountdownConfig.titleColor \|\| '#ffffff'}` |
| 2433 | `EditorColor` | Cor nome equipe | text | - | - | `{selectedCountdownConfig.textColor \|\| '#ffffff'}` |
| 2434 | `EditorColor` | Fundo logo | text | - | - | `{selectedCountdownConfig.logoBackground \|\| 'transparent'}` |
| 2436 | `EditorSelect` | Borda card | select | - | - | `{selectedCountdownConfig.cardStyle?.border \|\| 'none'}` |
| 2437 | `EditorSelect` | Sombra card | select | - | - | `{selectedCountdownConfig.cardStyle?.shadow \|\| 'none'}` |
| 2438 | `EditorNumber` | Canto card | text | - | - | `{selectedCountdownConfig.cardStyle?.radius \|\| 18}` |
| 2446 | `EditorColor` | Cor do BOOYAH | text | - | - | `{selectedBooyahConfig.color \|\| '#f6c453'}` |
| 2447 | `EditorColor` | Sombra do BOOYAH | text | - | - | `{selectedBooyahConfig.shadowColor \|\| 'rgba(0,0,0,0.35)'}` |
| 2448 | `EditorNumber` | Fonte BOOYAH | text | - | - | `{selectedBooyahConfig.fontSize \|\| 132}` |
| 2454 | `EditorSelect` | Borda da logo | select | - | - | `{selectedBooyahConfig.border \|\| 'none'}` |
| 2455 | `EditorNumber` | Canto da logo | text | - | - | `{selectedBooyahConfig.radius \|\| 0}` |
| 2460 | `EditorColor` | Cor do nome | text | - | - | `{selectedBooyahConfig.color \|\| '#ffffff'}` |
| 2461 | `EditorColor` | Sombra do nome | text | - | - | `{selectedBooyahConfig.shadowColor \|\| 'rgba(0,0,0,0.35)'}` |
| 2462 | `EditorNumber` | Fonte do nome | text | - | - | `{selectedBooyahConfig.fontSize \|\| 42}` |
| 2467 | `EditorSelect` | Ajuste imagem | select | - | - | `{isMvpGeralOverlay ? (config.mvpGeral?.photoFit \|\| config.brand?.objectFit \|\| 'cover') : (config.brand?.objectFit \|\| 'contain')}` |
| 2472 | `EditorColor` | Texto info MVP | text | - | - | `{config.theme?.text \|\| '#ffffff'}` |
| 2473 | `EditorColor` | Destaque info MVP | text | - | - | `{config.theme?.primary \|\| '#d8ab4f'}` |
| 2477 | `EditorColor` | Cor fonte | text | - | - | `{config.brand?.textColor \|\| '#ffffff'}` |
| 2478 | `EditorSelect` | Alinhamento | select | - | - | `{config.brand?.align \|\| 'left'}` |
| 2480 | `EditorNumber` | Fonte nome | text | - | - | `{config.brand?.nameSize \|\| 54}` |
| 2481 | `EditorNumber` | Fonte titulo | text | - | - | `{config.brand?.titleSize \|\| 24}` |
| 2482 | `EditorNumber` | Peso | text | - | - | `{config.brand?.fontWeight \|\| 900}` |
| 2484 | `input` | `{Boolean(config.brand?.italic)}` | checkbox | - | - | `{Boolean(config.brand?.italic)}` |
| 2511 | `EditorColor` | Cor principal | text | - | - | `{config.theme.primary}` |
| 2514 | `EditorColor` | Cor destaque | text | - | - | `{config.theme.accent}` |
| 2527 | `EditorSelect` | Coluna selecionada | select | - | - | `{selectedColumn}` |
| 2541 | `EditorSelect` | Coluna selecionada | select | - | - | `{selectedColumn}` |
| 2547 | `EditorColor` | Texto da coluna | text | - | - | `{config.columnStyles?.[selectedColumn]?.text \|\| ''}` |
| 2555 | `EditorNumber` | Linha destaque | text | - | - | `{selectedRow}` |
| 2564 | `EditorNumber` | Linha destaque | text | - | - | `{selectedRow}` |
| 2565 | `EditorColor` | Texto da linha | text | - | - | `{config.rowStyles?.[String(selectedRow)]?.text \|\| ''}` |
| 2572 | `EditorColor` | Texto das linhas | text | - | - | `{config.theme.text}` |
| 2575 | `EditorColor` | Texto do topo | text | - | - | `{config.theme.headerText}` |
| 2587 | `EditorSelect` | Tipo de transicao | select | - | - | `{config.animation?.transition \|\| config.animation?.enter \|\| 'fade'}` |
| 2594 | `EditorNumber` | Duracao ms | text | - | - | `{config.animation?.duration \|\| 650}` |
| 2595 | `EditorNumber` | Delay linha ms | text | - | - | `{config.animation?.lineDelay \|\| 70}` |
| 2598 | `input` | `{Boolean(config.animation?.lineByLine)}` | checkbox | - | - | `{Boolean(config.animation?.lineByLine)}` |
| 2617 | `EditorNumber` | Altura mapa | text | - | - | `{Number(booyahsDiaConfig.listRowHeight ?? 132)}` |
| 2618 | `EditorNumber` | Logo equipe | text | - | - | `{Number(booyahsDiaConfig.listLogoSize ?? 120)}` |
| 2619 | `EditorNumber` | Espaco | text | - | - | `{Number(booyahsDiaConfig.gap ?? 18)}` |
| 2624 | `input` | `{booyahsDiaConfig.autoFit !== false}` | checkbox | - | - | `{booyahsDiaConfig.autoFit !== false}` |
| 2627 | `EditorNumber` | Colunas | text | - | - | `{Number(booyahsDiaConfig.columns ?? 6)}` |
| 2628 | `EditorNumber` | Espaco | text | - | - | `{Number(booyahsDiaConfig.gap ?? 18)}` |
| 2629 | `EditorNumber` | Largura card | text | - | - | `{Number(booyahsDiaConfig.cardWidth ?? 292)}` |
| 2630 | `EditorNumber` | Altura card | text | - | - | `{Number(booyahsDiaConfig.cardHeight ?? 470)}` |
| 2631 | `EditorNumber` | Logo | text | - | - | `{Number(booyahsDiaConfig.logoSize ?? 150)}` |
| 2639 | `EditorNumber` | Top total | text | - | - | `{config.mvpGeral?.tableMaxRows ?? config.layout?.maxRows ?? 8}` |
| 2648 | `EditorNumber` | Altura linha | text | - | - | `{config.mvpGeral?.tableRowHeight ?? config.layout?.rowHeight ?? 86}` |
| 2649 | `EditorNumber` | Espaco linhas | text | - | - | `{config.mvpGeral?.tableGap ?? config.layout?.rowGap ?? 10}` |
| 2650 | `EditorNumber` | Fonte base | text | - | - | `{config.layout?.fontSize \|\| 30}` |
| 2651 | `EditorNumber` | Logo | text | - | - | `{config.layout?.logoSize \|\| 58}` |
| 2659 | `EditorNumber` | Padding | text | - | - | `{selectedCountdownConfig.padding \|\| 48}` |
| 2660 | `EditorNumber` | Raio | text | - | - | `{selectedCountdownConfig.radius \|\| 28}` |
| 2661 | `EditorNumber` | Fonte titulo | text | - | - | `{selectedCountdownConfig.titleSize \|\| 36}` |
| 2662 | `EditorNumber` | Fonte subtitulo | text | - | - | `{selectedCountdownConfig.subtitleSize \|\| 24}` |
| 2663 | `EditorNumber` | Fonte relogio | text | - | - | `{selectedCountdownConfig.clockSize \|\| 160}` |
| 2664 | `EditorNumber` | Fonte quedas | text | - | - | `{selectedCountdownConfig.infoSize \|\| 24}` |
| 2670 | `EditorNumber` | Colunas | text | - | - | `{selectedCountdownConfig.columns \|\| 3}` |
| 2671 | `EditorNumber` | Espaco colunas | text | - | - | `{getCountdownNumber(selectedCountdownConfig, 'columnGap', 20, 'gap')}` |
| 2672 | `EditorNumber` | Espaco linhas | text | - | - | `{getCountdownNumber(selectedCountdownConfig, 'rowGap', 20, 'gap')}` |
| 2673 | `EditorNumber` | Largura card | text | - | - | `{selectedCountdownConfig.cardWidth \|\| 190}` |
| 2674 | `EditorNumber` | Altura card | text | - | - | `{selectedCountdownConfig.cardHeight \|\| 150}` |
| 2675 | `EditorNumber` | Raio card | text | - | - | `{selectedCountdownConfig.cardStyle?.radius \|\| 18}` |
| 2676 | `EditorNumber` | Logo | text | - | - | `{selectedCountdownConfig.logoSize \|\| 80}` |
| 2677 | `EditorNumber` | Fonte equipe | text | - | - | `{selectedCountdownConfig.fontSize \|\| 18}` |
| 2678 | `EditorNumber` | Fonte titulo | text | - | - | `{selectedCountdownConfig.titleSize \|\| 30}` |
| 2679 | `EditorNumber` | Quantidade | text | - | - | `{config.countdown?.maxEquipes \|\| 18}` |
| 2685 | `EditorNumber` | Padding | text | - | - | `{selectedCountdownConfig.padding \|\| 32}` |
| 2686 | `EditorNumber` | Raio bloco | text | - | - | `{selectedCountdownConfig.radius \|\| 24}` |
| 2687 | `EditorNumber` | Altura linha | text | - | - | `{selectedCountdownConfig.rowHeight \|\| 62}` |
| 2688 | `EditorNumber` | Espaco linhas | text | - | - | `{getCountdownNumber(selectedCountdownConfig, 'rowGap', 12, 'gap')}` |
| 2689 | `EditorNumber` | Raio linha | text | - | - | `{selectedCountdownConfig.rowRadius \|\| 12}` |
| 2690 | `EditorNumber` | Fonte mapa | text | - | - | `{selectedCountdownConfig.fontSize \|\| 24}` |
| 2691 | `EditorNumber` | Fonte label | text | - | - | `{selectedCountdownConfig.labelSize \|\| 16}` |
| 2692 | `EditorNumber` | Fonte titulo | text | - | - | `{selectedCountdownConfig.titleSize \|\| 30}` |
| 2706 | `EditorNumber` | Limite linhas | text | - | - | `{config.layout.maxRows \|\| 12}` |
| 2707 | `EditorNumber` | Espaco blocos | text | - | - | `{config.layout.blockGap \|\| 36}` |
| 2708 | `EditorNumber` | Altura linha | text | - | - | `{config.layout.rowHeight \|\| 62}` |
| 2709 | `EditorNumber` | Altura topo | text | - | - | `{config.layout.headerHeight \|\| 72}` |
| 2710 | `EditorNumber` | Fonte | text | - | - | `{config.layout.fontSize \|\| 24}` |
| 2711 | `EditorNumber` | Logo | text | - | - | `{config.layout.logoSize \|\| 44}` |
| 2712 | `EditorNumber` | Espaco | text | - | - | `{config.layout.rowGap \|\| 5}` |
| 2720 | `input` | `{Boolean(config.columns[key])}` | checkbox | - | - | `{Boolean(config.columns[key])}` |
| 2731 | `EditorSelect` | Selecionar coluna | select | - | - | `{selectedColumn}` |
| 2758 | `input` | `{selectedColumnWidth}` | range | - | - | `{selectedColumnWidth}` |
| 2768 | `EditorNumber` | Valor | text | - | - | `{selectedColumnWidth}` |
| 2790 | `input` | `{config.brand?.enabled !== false}` | checkbox | - | - | `{config.brand?.enabled !== false}` |
| 2796 | `input` | input | file / image/* | - | - | - |
| 2807 | `EditorColor` | Cor texto superior | text | - | - | `{config.brand?.textColor \|\| '#ffffff'}` |
| 2810 | `EditorNumber` | Logo X | text | - | - | `{config.brand?.x \|\| 0}` |
| 2811 | `EditorNumber` | Logo Y | text | - | - | `{config.brand?.y \|\| 0}` |
| 2812 | `EditorNumber` | Logo largura | text | - | - | `{config.brand?.w \|\| 0}` |
| 2813 | `EditorNumber` | Logo altura | text | - | - | `{config.brand?.h \|\| 0}` |
| 2814 | `EditorNumber` | Escala logo | text | - | - | `{config.brand?.scale \|\| 100}` |
| 2815 | `EditorNumber` | Opacidade logo | text | - | - | `{config.brand?.opacity \|\| 100}` |
| 2816 | `EditorNumber` | Nome fonte | text | - | - | `{config.brand?.nameSize \|\| 54}` |
| 2817 | `EditorNumber` | Titulo fonte | text | - | - | `{config.brand?.titleSize \|\| 24}` |
| 2820 | `EditorSelect` | Ajuste imagem | select | - | - | `{config.brand?.objectFit \|\| 'contain'}` |
| 2821 | `EditorSelect` | Alinhamento texto | select | - | - | `{config.brand?.align \|\| 'left'}` |
| 2826 | `EditorColor` | Cor principal | text | - | - | `{config.theme.primary}` |
| 2827 | `EditorColor` | Cor destaque | text | - | - | `{config.theme.accent}` |
| 2828 | `EditorColor` | Cor fundo | text | - | - | `{config.theme.background}` |
| 2829 | `EditorColor` | Cor linha | text | - | - | `{config.theme.rowBackground}` |
| 2830 | `EditorColor` | Cor linha alternada | text | - | - | `{config.theme.rowAltBackground}` |
| 2831 | `EditorColor` | Cor texto | text | - | - | `{config.theme.text}` |
| 2832 | `EditorColor` | Cor cabecalho | text | - | - | `{config.theme.headerText}` |
| 2836 | `EditorNumber` | X | text | - | - | `{config.layout.x}` |
| 2837 | `EditorNumber` | Y | text | - | - | `{config.layout.y}` |
| 2838 | `EditorNumber` | Largura | text | - | - | `{config.layout.w}` |
| 2839 | `EditorNumber` | Escala tabela | text | - | - | `{config.layout.scale}` |
| 2840 | `EditorNumber` | Linhas | text | - | - | `{config.layout.maxRows}` |
| 2841 | `EditorNumber` | Blocos | text | - | - | `{config.layout.blockCount}` |
| 2842 | `EditorNumber` | Linhas/bloco | text | - | - | `{config.layout.rowsPerBlock}` |
| 2843 | `EditorNumber` | Espaco blocos | text | - | - | `{config.layout.blockGap}` |
| 2844 | `EditorNumber` | Altura linha | text | - | - | `{config.layout.rowHeight}` |
| 2845 | `EditorNumber` | Altura topo | text | - | - | `{config.layout.headerHeight}` |
| 2846 | `EditorNumber` | Fonte | text | - | - | `{config.layout.fontSize}` |
| 2847 | `EditorNumber` | Logo | text | - | - | `{config.layout.logoSize}` |
| 2848 | `EditorNumber` | Espaco | text | - | - | `{config.layout.rowGap}` |
| 2849 | `EditorNumber` | Raio | text | - | - | `{config.layout.radius}` |
| 2850 | `EditorNumber` | Opacidade | text | - | - | `{config.layout.opacity}` |
| 2853 | `EditorSelect` | Direcao dos blocos | select | - | - | `{config.layout.blockDirection \|\| 'horizontal'}` |
| 2860 | `input` | `{Boolean(config.columns[key])}` | checkbox | - | - | `{Boolean(config.columns[key])}` |
| 2869 | `select` | `{config.animation.enter \|\| 'slide'}` | select | - | - | `{config.animation.enter \|\| 'slide'}` |
| 2900 | `input` | `{value}` | text | - | - | `{value}` |
| 2910 | `input` | `{extractColor(value)}` | color | - | - | `{extractColor(value)}` |
| 2916 | `input` | #ffffff ou rgba(...) | text | - | - | `{value ?? ''}` |
| 2994 | `select` | `{mode}` | select | - | - | `{mode}` |
| 3013 | `EditorColor` | Cor solida | text | - | - | `{value \|\| '#ffffff'}` |
| 3018 | `EditorSelect` | Direcao | select | - | - | `{gradient.direction}` |
| 3024 | `EditorColor` | Cor inicial | text | - | - | `{gradient.start}` |
| 3025 | `EditorColor` | Cor final | text | - | - | `{gradient.end}` |
| 3033 | `input` | input | file / image/* | - | - | - |
| 3071 | `EditorColor` | Cor solida | text | - | - | `{value?.startsWith('linear-gradient') \|\| value?.startsWith('url(') ? '' : value}` |
| 3099 | `input` | input | file / image/* | - | - | - |
| 3115 | `input` | `{Number(value \|\| 0)}` | number | - | - | `{Number(value \|\| 0)}` |
| 3124 | `select` | `{value}` | select | - | - | `{value}` |

### /stream/pontuador

Arquivo: `web/app/stream/pontuador/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 77 | `input` | `{chave}` | text | - | - | `{chave}` |

### /stream/projects

Arquivo: `web/app/stream/projects/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 134 | `select` | `{campeonatoId}` | select | - | - | `{campeonatoId}` |
| 140 | `input` | `{nomeProjeto}` | text | - | - | `{nomeProjeto}` |

### /stream/studio/:key

Arquivo: `web/app/stream/studio/[key]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 293 | `select` | `{state.campeonato_equipe_a_id \|\| ''}` | select | - | - | `{state.campeonato_equipe_a_id \|\| ''}` |
| 303 | `select` | `{state.campeonato_equipe_b_id \|\| ''}` | select | - | - | `{state.campeonato_equipe_b_id \|\| ''}` |
| 333 | `input` | `{state.rodada \|\| ''}` | text | - | - | `{state.rodada \|\| ''}` |
| 338 | `select` | `{state.md \|\| 1}` | select | - | - | `{state.md \|\| 1}` |
| 348 | `select` | `{state.status}` | select | - | - | `{state.status}` |

### /transparencia/denuncia/:id

Arquivo: `web/app/transparencia/denuncia/[id]/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 435 | `textarea` | `{mensagem}` | textarea | - | - | `{mensagem}` |
| 452 | `input` | input | file | - | - | - |

### /transparencia

Arquivo: `web/app/transparencia/page.tsx`

| Linha | Componente | Campo/label/placeholder | Tipo | Obrigatorio | Opcoes/Fonte | Valor/estado |
|---:|---|---|---|---|---|---|
| 876 | `input` | O que você procura? Busque um campeonato pelo nome... | text | - | - | `{busca}` |
| 1700 | `select` | `{form.tipo_alvo}` | select | - | - | `{form.tipo_alvo}` |
| 1718 | `input` | `{buscaAlvo}` | text | - | - | `{buscaAlvo}` |
| 1775 | `select` | `{form.categoria}` | select | - | - | `{form.categoria}` |
| 1808 | `input` | `{form.titulo}` | text | - | - | `{form.titulo}` |
| 1820 | `textarea` | `{form.descricao}` | textarea | - | - | `{form.descricao}` |
| 1857 | `input` | input | file / image/*,video/*,.pdf,.txt,.doc,.docx | - | - | - |
| 1912 | `input` | `{form.publica}` | checkbox | - | - | `{form.publica}` |
| 1927 | `input` | `{form.anonima_para_publico}` | checkbox | - | - | `{form.anonima_para_publico}` |

