'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Eye, EyeOff, Loader2, Save, ShieldCheck, WalletCards } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AdminTabs from '../../components/AdminTabs'

type Provider = 'mercadopago' | 'paypal'
type ProviderStatus = {
  provider: Provider
  enabled: boolean
  environment: 'sandbox' | 'production'
  public_config: Record<string, string>
  configured_secrets: string[]
}

type FormState = {
  enabled: boolean
  environment: 'sandbox' | 'production'
  publicKey: string
  accessToken: string
  webhookUrl: string
  webhookSecret: string
  clientId: string
  clientSecret: string
  webhookId: string
  currency: string
}

const emptyForm: FormState = {
  enabled: false,
  environment: 'sandbox',
  publicKey: '',
  accessToken: '',
  webhookUrl: '',
  webhookSecret: '',
  clientId: '',
  clientSecret: '',
  webhookId: '',
  currency: 'BRL',
}

export default function PagamentosAdminPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(true)
  const [saving, setSaving] = useState<Provider | null>(null)
  const [status, setStatus] = useState<Record<Provider, ProviderStatus | null>>({ mercadopago: null, paypal: null })
  const [forms, setForms] = useState<Record<Provider, FormState>>({ mercadopago: { ...emptyForm }, paypal: { ...emptyForm } })
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function authHeaders() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/configuracoes/pagamentos', { headers: await authHeaders() })
      const payload = await response.json()
      if (response.status === 403) {
        setAuthorized(false)
        return
      }
      if (!response.ok) throw new Error(payload.error || 'Erro ao carregar configurações.')
      setAuthorized(true)

      const nextStatus: Record<Provider, ProviderStatus | null> = { mercadopago: null, paypal: null }
      const nextForms: Record<Provider, FormState> = { mercadopago: { ...emptyForm }, paypal: { ...emptyForm } }

      for (const item of (payload.providers || []) as ProviderStatus[]) {
        nextStatus[item.provider] = item
        nextForms[item.provider] = {
          ...emptyForm,
          enabled: item.enabled,
          environment: item.environment,
          publicKey: item.public_config?.public_key || '',
          webhookUrl: item.public_config?.webhook_url || '',
          clientId: item.public_config?.client_id || '',
          webhookId: item.public_config?.webhook_id || '',
          currency: item.public_config?.currency || 'BRL',
        }
      }

      setStatus(nextStatus)
      setForms(nextForms)
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar configurações.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function update(provider: Provider, field: keyof FormState, value: string | boolean) {
    setForms((current) => ({ ...current, [provider]: { ...current[provider], [field]: value } }))
  }

  async function save(provider: Provider) {
    setSaving(provider)
    setError('')
    setSuccess('')
    const form = forms[provider]

    const publicConfig = provider === 'mercadopago'
      ? { public_key: form.publicKey.trim(), webhook_url: form.webhookUrl.trim() }
      : { client_id: form.clientId.trim(), webhook_id: form.webhookId.trim(), currency: form.currency.trim().toUpperCase() || 'BRL' }

    const secrets = provider === 'mercadopago'
      ? { access_token: form.accessToken.trim(), webhook_secret: form.webhookSecret.trim() }
      : { client_secret: form.clientSecret.trim() }

    try {
      const response = await fetch('/api/admin/configuracoes/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ provider, enabled: form.enabled, environment: form.environment, publicConfig, secrets }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Erro ao salvar configuração.')
      setSuccess(`${provider === 'mercadopago' ? 'Mercado Pago' : 'PayPal'} configurado com segurança.`)
      await load()
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar configuração.')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7]"><Loader2 className="animate-spin text-[#2563eb]" size={40} /></div>
  }

  if (!authorized) {
    return <div className="min-h-screen bg-[#f7f7f7] p-6"><div className="mx-auto max-w-3xl border border-red-200 bg-white p-8 text-center"><ShieldCheck className="mx-auto text-red-500" size={42} /><h1 className="mt-4 text-xl font-semibold uppercase text-[#142340]">Acesso restrito</h1><p className="mt-2 text-sm text-zinc-500">Entre com uma conta administradora ativa para configurar os gateways de pagamento.</p></div></div>
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-[1200px] space-y-6 p-4 md:p-6">
        <header className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">Configuração financeira</p>
            <h1 className="mt-2 text-2xl font-semibold uppercase text-[#142340] md:text-3xl">Gateways de pagamento</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">Conecte as credenciais usadas pelo PIX e PayPal. Segredos são criptografados no Supabase Vault e nunca retornam ao navegador.</p>
          </div>
          <AdminTabs />
        </header>

        {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {success && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{success}</div>}

        <div className="grid gap-5 lg:grid-cols-2">
          <ProviderCard
            provider="mercadopago"
            title="Mercado Pago PIX"
            description="Criação de cobranças PIX e confirmação automática pelo webhook."
            icon={<WalletCards size={22} />}
            form={forms.mercadopago}
            status={status.mercadopago}
            visible={visible}
            saving={saving === 'mercadopago'}
            onVisible={(key) => setVisible((current) => ({ ...current, [key]: !current[key] }))}
            onUpdate={(field, value) => update('mercadopago', field, value)}
            onSave={() => save('mercadopago')}
          />
          <ProviderCard
            provider="paypal"
            title="PayPal"
            description="Credenciais REST para pagamentos em sandbox ou produção."
            icon={<CreditCard size={22} />}
            form={forms.paypal}
            status={status.paypal}
            visible={visible}
            saving={saving === 'paypal'}
            onVisible={(key) => setVisible((current) => ({ ...current, [key]: !current[key] }))}
            onUpdate={(field, value) => update('paypal', field, value)}
            onSave={() => save('paypal')}
          />
        </div>
      </div>
    </div>
  )
}

function ProviderCard({
  provider, title, description, icon, form, status, visible, saving, onVisible, onUpdate, onSave,
}: {
  provider: Provider
  title: string
  description: string
  icon: React.ReactNode
  form: FormState
  status: ProviderStatus | null
  visible: Record<string, boolean>
  saving: boolean
  onVisible: (key: string) => void
  onUpdate: (field: keyof FormState, value: string | boolean) => void
  onSave: () => void
}) {
  const secretConfigured = (key: string) => status?.configured_secrets?.includes(key)
  return (
    <section className="border border-zinc-200 bg-white">
      <div className="flex items-start gap-3 border-b border-zinc-200 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-blue-100 bg-blue-50 text-[#2563eb]">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold uppercase text-[#142340]">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
        </div>
        <button type="button" onClick={() => onUpdate('enabled', !form.enabled)} className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] ${form.enabled ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}`}>
          {form.enabled ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      <div className="space-y-4 p-5">
        <Field label="Ambiente">
          <select value={form.environment} onChange={(e) => onUpdate('environment', e.target.value)} className="h-11 w-full border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#2563eb]">
            <option value="sandbox">Sandbox / testes</option>
            <option value="production">Produção</option>
          </select>
        </Field>

        {provider === 'mercadopago' ? <>
          <Field label="Access Token" configured={secretConfigured('access_token')}>
            <SecretInput id="mp-token" value={form.accessToken} visible={visible['mp-token']} placeholder={secretConfigured('access_token') ? 'Configurado - preencha apenas para substituir' : 'APP_USR-...'} onVisible={onVisible} onChange={(value) => onUpdate('accessToken', value)} />
          </Field>
          <Field label="Public Key"><TextInput value={form.publicKey} onChange={(value) => onUpdate('publicKey', value)} placeholder="APP_USR-..." /></Field>
          <Field label="URL do webhook"><TextInput value={form.webhookUrl} onChange={(value) => onUpdate('webhookUrl', value)} placeholder="https://seusite.com/api/webhooks/mercadopago" /></Field>
          <Field label="Segredo do webhook" configured={secretConfigured('webhook_secret')}>
            <SecretInput id="mp-webhook" value={form.webhookSecret} visible={visible['mp-webhook']} placeholder={secretConfigured('webhook_secret') ? 'Configurado - preencha apenas para substituir' : 'Assinatura secreta'} onVisible={onVisible} onChange={(value) => onUpdate('webhookSecret', value)} />
          </Field>
        </> : <>
          <Field label="Client ID"><TextInput value={form.clientId} onChange={(value) => onUpdate('clientId', value)} placeholder="Client ID do aplicativo PayPal" /></Field>
          <Field label="Client Secret" configured={secretConfigured('client_secret')}>
            <SecretInput id="paypal-secret" value={form.clientSecret} visible={visible['paypal-secret']} placeholder={secretConfigured('client_secret') ? 'Configurado - preencha apenas para substituir' : 'Client Secret'} onVisible={onVisible} onChange={(value) => onUpdate('clientSecret', value)} />
          </Field>
          <Field label="Webhook ID"><TextInput value={form.webhookId} onChange={(value) => onUpdate('webhookId', value)} placeholder="ID do webhook PayPal" /></Field>
          <Field label="Moeda"><TextInput value={form.currency} onChange={(value) => onUpdate('currency', value)} placeholder="BRL" /></Field>
        </>}

        <div className="flex items-center gap-2 border border-blue-100 bg-blue-50 p-3 text-xs font-semibold text-blue-700">
          <ShieldCheck size={16} /> Credenciais secretas protegidas pelo Supabase Vault.
        </div>
        <button type="button" disabled={saving} onClick={onSave} className="inline-flex h-11 w-full items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white disabled:opacity-60">
          {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Salvar configuração
        </button>
      </div>
    </section>
  )
}

function Field({ label, configured, children }: { label: string; configured?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500"><span>{label}</span>{configured ? <span className="text-emerald-600">Configurado</span> : null}</span>{children}</label>
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 w-full border border-zinc-200 px-3 text-sm outline-none focus:border-[#2563eb]" />
}

function SecretInput({ id, value, visible, placeholder, onVisible, onChange }: { id: string; value: string; visible?: boolean; placeholder: string; onVisible: (id: string) => void; onChange: (value: string) => void }) {
  return <div className="flex"><input type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 min-w-0 flex-1 border border-r-0 border-zinc-200 px-3 text-sm outline-none focus:border-[#2563eb]" /><button type="button" onClick={() => onVisible(id)} className="flex h-11 w-11 items-center justify-center border border-zinc-200 text-zinc-500">{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
}
