# Integração no frontend

## Não usar mais

Evite:
- update direto em `wallet_saldo`
- `incrementar_saldo`
- `decrementar_saldo`
- `fn_apostados_pagar_confronto_finalizado`

## Usar

- `lealt_apostado_reter_saldo`
- `lealt_apostado_finalizar_com_escrow`
- `lealt_apostado_reembolsar_confronto`
- `lealt_apostado_resumo_escrow`

## Onde trocar

- Página de entrar no apostado
- Matchmaking/fila
- Tela do moderador
- Tela de resultado do confronto
- Painel financeiro/admin
