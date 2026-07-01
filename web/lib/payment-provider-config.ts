import { supabaseAdmin } from '@/lib/supabase-admin'

type RuntimeConfig = {
  provider: 'mercadopago' | 'paypal'
  enabled: boolean
  environment: 'sandbox' | 'production'
  public_config: Record<string, string>
  secrets: Record<string, string>
}

async function getRuntimeConfig(provider: RuntimeConfig['provider']) {
  const { data, error } = await supabaseAdmin.rpc('payment_provider_runtime', {
    p_provider: provider,
  })

  if (error) {
    console.warn(`Configuração ${provider} indisponível no banco:`, error.message)
    return null
  }

  return (data || null) as RuntimeConfig | null
}

export async function getMercadoPagoConfig() {
  const saved = await getRuntimeConfig('mercadopago')
  return {
    enabled: saved ? saved.enabled : Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
    environment: saved?.environment || 'production',
    accessToken: saved?.secrets?.access_token || process.env.MERCADOPAGO_ACCESS_TOKEN || '',
    webhookSecret: saved?.secrets?.webhook_secret || process.env.MERCADOPAGO_WEBHOOK_SECRET || '',
    webhookUrl: saved?.public_config?.webhook_url || process.env.MERCADOPAGO_WEBHOOK_URL || '',
    publicKey: saved?.public_config?.public_key || '',
  }
}

export async function getPaypalConfig() {
  const saved = await getRuntimeConfig('paypal')
  return {
    enabled: Boolean(saved?.enabled),
    environment: saved?.environment || 'sandbox',
    clientId: saved?.public_config?.client_id || '',
    clientSecret: saved?.secrets?.client_secret || '',
    webhookId: saved?.public_config?.webhook_id || '',
    currency: saved?.public_config?.currency || 'BRL',
  }
}
