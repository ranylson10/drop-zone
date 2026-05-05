# LEALT - Escrow completo dos apostados + taxa automática do site

## O que cria

- `lealt_taxas_operacionais`: configura taxa dos apostados.
- `lealt_apostados_escrow`: guarda valor retido por usuário/confronto/lado.
- `lealt_site_receitas`: registra a receita do site.
- Funções seguras para reter, reembolsar, finalizar e consultar resumo.

## Fluxo

1. Usuário deposita saldo via Pix.
2. Ao entrar no apostado, chama `lealt_apostado_reter_saldo`.
3. O valor sai de `saldo` e vai para `saldo_retido`.
4. Ao finalizar, chama `lealt_apostado_finalizar_com_escrow`.
5. O sistema calcula taxa do site, paga vencedor e registra receita.
6. Se cancelar, chama `lealt_apostado_reembolsar_confronto`.

## Exemplo

Aposta 1x1:
- Lado A: R$ 5
- Lado B: R$ 5
- Total: R$ 10
- Taxa 10%: R$ 1
- Prêmio vencedor: R$ 9

## RPCs para frontend

Entrar:

```ts
await supabase.rpc('lealt_apostado_reter_saldo', {
  p_confronto_id: confrontoId,
  p_user_id: user.id,
  p_lado: 'a',
  p_valor: 5
})
```

Finalizar:

```ts
await supabase.rpc('lealt_apostado_finalizar_com_escrow', {
  p_confronto_id: confrontoId,
  p_vencedor_lado: 'a',
  p_rake_percent: null
})
```

Reembolsar:

```ts
await supabase.rpc('lealt_apostado_reembolsar_confronto', {
  p_confronto_id: confrontoId,
  p_motivo: 'Cancelado pela moderação'
})
```

Resumo:

```ts
await supabase.rpc('lealt_apostado_resumo_escrow', {
  p_confronto_id: confrontoId
})
```

## Segurança

- Usuário comum só retém saldo dele mesmo.
- Só admin/moderador do confronto finaliza/reembolsa.
- Antifraude bloqueia antes da retenção/finalização.
- Tudo gera auditoria.
- Frontend não altera `wallet_saldo` direto.

## Observação

Apostados envolvendo dinheiro real podem depender de regras legais e regulatórias. Valide isso antes de operar publicamente.
