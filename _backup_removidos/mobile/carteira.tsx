import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '@/components/Screen'
import { SiteHeader } from '@/components/SiteHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { Card } from '@/components/Card'
import { Body, Subtitle, Tiny } from '@/components/AppText'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabase'
import { colors } from '@/theme/colors'

type WalletBalance = {
  saldo?: number | string | null
  saldo_retido?: number | string | null
}

type WalletTransaction = {
  id: string
  tipo?: string | null
  descricao?: string | null
  valor?: number | string | null
  status?: string | null
  created_at?: string | null
  referencia_tipo?: string | null
  referencia_id?: string | null
  payload?: any
}

type WalletAction = 'deposito' | 'saque' | 'pix' | null

type PixData = {
  nome?: string | null
  cpf?: string | null
  chave_pix?: string | null
  tipo_chave?: string | null
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function toNumber(value: unknown) {
  const number = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(number) ? number : 0
}

function money(value: unknown) {
  return brl.format(toNumber(value))
}

function dateLabel(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

function receiptId(tx: WalletTransaction) {
  const raw = String(tx.id || '').replace(/-/g, '').slice(0, 10).toUpperCase()
  return raw ? `DZ-${raw}` : 'DZ-COMPROVANTE'
}

function longDateLabel(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date)
}

function isCredit(tx: WalletTransaction) {
  const tipo = String(tx.tipo || tx.descricao || '').toLowerCase()
  return tipo.includes('entrada') || tipo.includes('deposito') || tipo.includes('credito') || toNumber(tx.valor) > 0
}

export default function Carteira() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [balance, setBalance] = useState<WalletBalance>({})
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [pixData, setPixData] = useState<PixData>({})
  const [action, setAction] = useState<WalletAction>(null)
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null)
  const [valor, setValor] = useState('')
  const [tipoChave, setTipoChave] = useState('pix')
  const [chavePix, setChavePix] = useState('')

  const loadWallet = useCallback(async () => {
    setLoading(true)
    if (!supabase) {
      setNeedsLogin(true)
      setLoading(false)
      return
    }

    const client = supabase
    const { data: auth } = await client.auth.getUser()
    const user = auth.user

    if (!user) {
      setNeedsLogin(true)
      setBalance({})
      setTransactions([])
      setLoading(false)
      return
    }

    setNeedsLogin(false)
    await client.rpc('lealt_garantir_wallet', { p_user_id: user.id })

    const [{ data: saldo }, { data: extrato }, { data: pagamento }] = await Promise.all([
      client.from('wallet_saldo').select('saldo, saldo_retido').eq('user_id', user.id).maybeSingle(),
      client.from('wallet_transacoes').select('id,tipo,descricao,valor,status,created_at,referencia_tipo,referencia_id,payload').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      client.from('usuarios_pagamento').select('nome, cpf, chave_pix, tipo_chave').eq('user_id', user.id).maybeSingle()
    ])

    setBalance((saldo || {}) as WalletBalance)
    setTransactions((extrato || []) as WalletTransaction[])
    setPixData((pagamento || {}) as PixData)
    setChavePix(String((pagamento as PixData | null)?.chave_pix || ''))
    setTipoChave(String((pagamento as PixData | null)?.tipo_chave || 'pix'))
    setLoading(false)
  }, [])

  useEffect(() => {
    loadWallet()
  }, [loadWallet])

  const totals = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      const value = Math.abs(toNumber(tx.valor))
      if (isCredit(tx)) acc.in += value
      else acc.out += value
      return acc
    }, { in: 0, out: 0 })
  }, [transactions])

  async function requireUser() {
    if (!supabase) return null
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      router.push('/(auth)/login' as any)
      return null
    }
    return data.user
  }

  async function submitAction() {
    const user = await requireUser()
    if (!user || !supabase) return

    setSaving(true)
    try {
      if (action === 'pix') {
        if (!chavePix.trim()) throw new Error('Informe sua chave Pix.')
        const payload = { user_id: user.id, chave_pix: chavePix.trim(), tipo_chave: tipoChave.trim() || 'pix', updated_at: new Date().toISOString() }
        const { error } = await supabase.from('usuarios_pagamento').upsert(payload as any, { onConflict: 'user_id' })
        if (error) throw error
        Alert.alert('Pix atualizado', 'Sua chave Pix foi salva na tabela usuarios_pagamento.')
      }

      if (action === 'saque') {
        const value = toNumber(valor)
        if (value <= 0) throw new Error('Informe um valor válido.')
        if (!pixData?.chave_pix && !chavePix.trim()) throw new Error('Cadastre sua chave Pix antes do saque.')
        if (value > toNumber(balance.saldo)) throw new Error('Saldo insuficiente para esse saque.')
        const { error } = await supabase.from('pagamentos_saques').insert({ user_id: user.id, valor: value, status: 'solicitado' } as any)
        if (error) throw error
        Alert.alert('Saque solicitado', 'A solicitação foi registrada em pagamentos_saques.')
      }

      if (action === 'deposito') {
        const value = toNumber(valor)
        if (value < 1) throw new Error('Informe um valor de pelo menos R$ 1,00.')
        const { error } = await supabase.from('wallet_depositos_pix').insert({ user_id: user.id, valor: value, status: 'pendente', provider: 'mercadopago', external_reference: `wallet-${user.id}-${Date.now()}` } as any)
        if (error) throw error
        Alert.alert('Depósito Pix criado', 'Registro criado em wallet_depositos_pix. O QR Code e o copia-e-cola precisam ser preenchidos pela Edge Function do gateway.')
      }

      setAction(null)
      setValor('')
      await loadWallet()
    } catch (error: any) {
      Alert.alert('Não foi possível concluir', error?.message || 'Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function openAction(next: WalletAction) {
    if (needsLogin) {
      router.push('/(auth)/login' as any)
      return
    }
    setAction(next)
  }

  return <Screen>
    <SiteHeader eyebrow="FINANCEIRO" title="Carteira" logo="R$" subtitle="Saldo, entradas, saidas e historico financeiro." />

    <Card style={styles.bankCard}>
      <View style={styles.bankTop}>
        <View>
          <Tiny style={styles.onDark}>Saldo disponivel</Tiny>
          <Body style={styles.money}>{money(balance.saldo)}</Body>
        </View>
        <Pressable onPress={loadWallet} style={styles.refresh}>
          {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="refresh-outline" size={18} color={colors.white} />}
        </Pressable>
      </View>
      <View style={styles.bankBottom}>
        <View>
          <Tiny style={styles.onDark}>Retido</Tiny>
          <Body style={styles.onDarkValue}>{money(balance.saldo_retido)}</Body>
        </View>
        <Body style={styles.cardBrand}>DROP ZONE PAY</Body>
      </View>
    </Card>

    {needsLogin ? <Card style={styles.notice}>
      <Body style={styles.noticeTitle}>Entre na sua conta para ver a carteira real.</Body>
      <Subtitle>O saldo e o extrato ficam protegidos pelo login do Supabase.</Subtitle>
    </Card> : null}

    <View style={styles.actions}>
      <Pressable onPress={() => openAction('deposito')} style={styles.actionBtn}><Ionicons name="add-circle-outline" size={18} color={colors.primary} /><Body style={styles.actionText}>Depositar</Body></Pressable>
      <Pressable onPress={() => openAction('saque')} style={styles.actionBtn}><Ionicons name="cash-outline" size={18} color={colors.primary} /><Body style={styles.actionText}>Sacar</Body></Pressable>
      <Pressable onPress={() => openAction('pix')} style={styles.actionBtn}><Ionicons name="qr-code-outline" size={18} color={colors.primary} /><Body style={styles.actionText}>Pix</Body></Pressable>
    </View>

    <View style={styles.summary}>
      <Card style={styles.summaryCard}><Tiny>Entradas</Tiny><Body style={styles.summaryValue}>{money(totals.in)}</Body></Card>
      <Card style={styles.summaryCard}><Tiny>Saidas</Tiny><Body style={styles.summaryValue}>{money(totals.out)}</Body></Card>
    </View>

    <SectionHeader title="Extrato recente" action="filtrar" />
    {loading && !transactions.length ? <ActivityIndicator color={colors.primary} /> : null}
    {!loading && !transactions.length ? <Card><Subtitle>Nenhuma movimentacao encontrada.</Subtitle></Card> : null}
    {transactions.map((tx) => {
      const credit = isCredit(tx)
      return <Pressable key={tx.id} onPress={() => setSelectedTx(tx)}>
        <Card style={styles.tx}>
          <View style={[styles.txIcon, credit ? styles.creditIcon : styles.debitIcon]}>
            <Ionicons name={credit ? 'arrow-down-outline' : 'arrow-up-outline'} size={17} color={credit ? colors.success : colors.danger} />
          </View>
          <View style={styles.txBody}>
            <Body style={styles.txTitle}>{tx.descricao || tx.tipo || 'Movimentacao'}</Body>
            <Subtitle>{[tx.status, dateLabel(tx.created_at)].filter(Boolean).join(' - ')}</Subtitle>
          </View>
          <Body style={[styles.txValue, credit ? styles.credit : styles.debit]}>{credit ? '+' : '-'} {money(Math.abs(toNumber(tx.valor)))}</Body>
        </Card>
      </Pressable>
    })}

    <Modal visible={Boolean(selectedTx)} transparent animationType="fade" onRequestClose={() => setSelectedTx(null)}>
      <View style={styles.modalWrap}>
        <Pressable style={styles.overlay} onPress={() => setSelectedTx(null)} />
        <Card style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <View style={styles.receiptLogo}>
              <Body style={styles.receiptLogoText}>DZ</Body>
            </View>
            <View style={{ flex: 1 }}>
              <Body style={styles.receiptBrand}>DROP ZONE PAY</Body>
              <Subtitle>Comprovante de pagamento</Subtitle>
            </View>
          </View>

          {selectedTx ? <>
            <View style={styles.receiptAmountBox}>
              <Tiny>VALOR</Tiny>
              <Body style={[styles.receiptAmount, isCredit(selectedTx) ? styles.credit : styles.debit]}>
                {isCredit(selectedTx) ? '+' : '-'} {money(Math.abs(toNumber(selectedTx.valor)))}
              </Body>
              <Subtitle>{String(selectedTx.status || 'processado').toUpperCase()}</Subtitle>
            </View>

            <View style={styles.receiptRows}>
              <View style={styles.receiptRow}><Tiny>Descrição</Tiny><Body style={styles.receiptText}>{selectedTx.descricao || selectedTx.tipo || 'Movimentação'}</Body></View>
              <View style={styles.receiptRow}><Tiny>Data e hora</Tiny><Body style={styles.receiptText}>{longDateLabel(selectedTx.created_at)}</Body></View>
              <View style={styles.receiptRow}><Tiny>Comprovante</Tiny><Body style={styles.receiptText}>{String(selectedTx.payload?.txid || receiptId(selectedTx))}</Body></View>
              <View style={styles.receiptRow}><Tiny>Referência</Tiny><Body style={styles.receiptText}>{[selectedTx.referencia_tipo, selectedTx.referencia_id].filter(Boolean).join(' • ') || '-'}</Body></View>
              <View style={styles.receiptRow}><Tiny>Transação</Tiny><Body style={styles.receiptText}>{selectedTx.id}</Body></View>
            </View>
          </> : null}

          <Button label="Fechar comprovante" onPress={() => setSelectedTx(null)} />
        </Card>
      </View>
    </Modal>

    <Modal visible={Boolean(action)} transparent animationType="fade" onRequestClose={() => setAction(null)}>
      <View style={styles.modalWrap}>
        <Pressable style={styles.overlay} onPress={() => setAction(null)} />
        <Card style={styles.modalCard}>
          <Body style={styles.modalTitle}>{action === 'deposito' ? 'Depositar via Pix' : action === 'saque' ? 'Solicitar saque' : 'Chave Pix'}</Body>
          {action === 'deposito' || action === 'saque' ? <Input keyboardType="numeric" value={valor} onChangeText={setValor} placeholder="Valor em R$" /> : null}
          {action === 'pix' ? <>
            <Input value={tipoChave} onChangeText={setTipoChave} placeholder="Tipo da chave: pix, cpf, email, telefone" />
            <Input value={chavePix} onChangeText={setChavePix} placeholder="Chave Pix" />
          </> : null}
          <Button label={saving ? 'Salvando...' : 'Confirmar'} onPress={submitAction} disabled={saving} />
          <Button label="Cancelar" variant="ghost" onPress={() => setAction(null)} />
        </Card>
      </View>
    </Modal>
  </Screen>
}

const styles = StyleSheet.create({
  bankCard: { borderRadius: 8, padding: 14, gap: 22, backgroundColor: colors.text, borderColor: colors.text },
  bankTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bankBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  onDark: { color: '#CBD5E1' },
  onDarkValue: { color: colors.white, fontWeight: '700' },
  money: { color: colors.white, fontSize: 31, lineHeight: 36, fontWeight: '800' },
  refresh: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 6 },
  cardBrand: { color: colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  notice: { borderColor: colors.warning },
  noticeTitle: { fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 6 },
  actionText: { fontSize: 12, fontWeight: '700' },
  summary: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, gap: 2 },
  summaryValue: { fontWeight: '800' },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  txIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  creditIcon: { backgroundColor: '#DCFCE7' },
  debitIcon: { backgroundColor: '#FEE2E2' },
  txBody: { flex: 1 },
  txTitle: { fontWeight: '800' },
  txValue: { fontWeight: '800' },
  credit: { color: colors.success },
  debit: { color: colors.danger },
  receiptCard: { gap: 12, borderColor: colors.primary, padding: 14 },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 },
  receiptLogo: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  receiptLogoText: { color: colors.white, fontWeight: '900', letterSpacing: 1 },
  receiptBrand: { fontWeight: '900', letterSpacing: 1 },
  receiptAmountBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.background },
  receiptAmount: { fontSize: 27, lineHeight: 33, fontWeight: '900' },
  receiptRows: { gap: 8 },
  receiptRow: { gap: 2, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  receiptText: { fontWeight: '700', fontSize: 12 },
    modalWrap: { flex: 1, justifyContent: 'center', padding: 18 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  modalCard: { gap: 10, borderColor: colors.primary },
  modalTitle: { fontWeight: '900', textTransform: 'uppercase' }
})
