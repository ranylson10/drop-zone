import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '')

const directSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })
  : null

export const supabase: SupabaseClient | null = directSupabase
  ? (apiBaseUrl ? createApiBackedSupabase(directSupabase) : directSupabase)
  : null

function createApiBackedSupabase(client: SupabaseClient) {
  return {
    ...client,
    auth: client.auth,
    channel: client.channel.bind(client),
    removeChannel: client.removeChannel.bind(client),
    from: (table: string) => new ApiQueryBuilder(client, 'table', table),
    rpc: (name: string, args?: any, options?: any) =>
      new ApiQueryBuilder(client, 'rpc', name, undefined, args, options),
    storage: {
      from: (bucket: string) => new ApiStorageBucket(client, bucket),
    },
  } as any
}

class ApiQueryBuilder {
  private action?: string
  private args?: any
  private values?: any
  private options?: any
  private modifiers: Array<{ method: string; args: any[] }> = []

  constructor(
    private client: SupabaseClient,
    private kind: 'table' | 'rpc',
    private target: string,
    action?: string,
    args?: any,
    options?: any
  ) {
    this.action = action
    this.args = args
    this.options = options
  }

  select(columns = '*', options?: any) {
    if (!this.action) {
      this.action = 'select'
      this.args = { columns }
      this.options = options
    } else {
      this.modifiers.push({ method: 'select', args: [columns, options].filter((value) => value !== undefined) })
    }
    return this
  }

  insert(values: any, options?: any) {
    this.action = 'insert'
    this.values = values
    this.options = options
    return this
  }

  update(values: any, options?: any) {
    this.action = 'update'
    this.values = values
    this.options = options
    return this
  }

  delete(options?: any) {
    this.action = 'delete'
    this.options = options
    return this
  }

  upsert(values: any, options?: any) {
    this.action = 'upsert'
    this.values = values
    this.options = options
    return this
  }

  eq(column: string, value: any) { return this.add('eq', column, value) }
  neq(column: string, value: any) { return this.add('neq', column, value) }
  in(column: string, values: any[]) { return this.add('in', column, values) }
  is(column: string, value: any) { return this.add('is', column, value) }
  ilike(column: string, value: any) { return this.add('ilike', column, value) }
  or(filters: string, options?: any) { return this.addDefined('or', filters, options) }
  gte(column: string, value: any) { return this.add('gte', column, value) }
  lte(column: string, value: any) { return this.add('lte', column, value) }
  gt(column: string, value: any) { return this.add('gt', column, value) }
  lt(column: string, value: any) { return this.add('lt', column, value) }
  not(column: string, operator: string, value: any) { return this.add('not', column, operator, value) }
  order(column: string, options?: any) { return this.addDefined('order', column, options) }
  limit(count: number, options?: any) { return this.addDefined('limit', count, options) }
  range(from: number, to: number, options?: any) { return this.addDefined('range', from, to, options) }
  single() { return this.addDefined('single') }
  maybeSingle() { return this.addDefined('maybeSingle') }

  then(resolve: any, reject: any) {
    return this.execute().then(resolve, reject)
  }

  catch(reject: any) {
    return this.execute().catch(reject)
  }

  finally(onFinally: any) {
    return this.execute().finally(onFinally)
  }

  private add(method: string, ...args: any[]) {
    this.modifiers.push({ method, args })
    return this
  }

  private addDefined(method: string, ...args: any[]) {
    this.modifiers.push({ method, args: args.filter((value) => value !== undefined) })
    return this
  }

  private async execute() {
    const { data } = await this.client.auth.getSession()
    const token = data.session?.access_token
    const response = await fetch(`${apiBaseUrl}/api/mobile/supabase/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        kind: this.kind,
        target: this.target,
        action: this.action,
        args: this.args,
        values: this.values,
        options: this.options,
        modifiers: this.modifiers,
      }),
    })
    const result = await response.json().catch(() => ({ error: 'Resposta invalida do backend.' }))

    if (!response.ok) {
      return { data: null, error: { message: result?.error || `Erro HTTP ${response.status}` } }
    }

    return result
  }
}

class ApiStorageBucket {
  constructor(private client: SupabaseClient, private bucket: string) {}

  async upload(path: string, fileBody: any, options?: any) {
    const { data } = await this.client.auth.getSession()
    const token = data.session?.access_token
    const response = await fetch(`${apiBaseUrl}/api/mobile/supabase/storage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        bucket: this.bucket,
        action: 'upload',
        path,
        data: arrayBufferToBase64(fileBody),
        options,
      }),
    })
    const result = await response.json().catch(() => ({ error: 'Resposta invalida do backend.' }))

    if (!response.ok) {
      return { data: null, error: { message: result?.error || `Erro HTTP ${response.status}` } }
    }

    return result
  }

  getPublicUrl(path: string) {
    if (supabaseUrl) {
      return {
        data: {
          publicUrl: `${supabaseUrl}/storage/v1/object/public/${this.bucket}/${path.replace(/^\/+/, '')}`,
        },
      }
    }

    return { data: { publicUrl: path } }
  }
}

function arrayBufferToBase64(input: any) {
  const bytes = input instanceof Uint8Array
    ? input
    : input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : input?.buffer instanceof ArrayBuffer
        ? new Uint8Array(input.buffer)
        : new Uint8Array()

  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}
