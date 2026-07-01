import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

const allowedBuckets = new Set(['avatars', 'imagem_produtoras', 'team-logos'])

type StorageBody = {
  bucket: string
  action: 'upload' | 'getPublicUrl'
  path: string
  data?: string
  options?: {
    cacheControl?: string
    contentType?: string
    upsert?: boolean
  }
}

function getClient(authHeader: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase nao configurado no backend.')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: authHeader
      ? {
          headers: {
            Authorization: authHeader,
          },
        }
      : undefined,
  })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StorageBody

    if (!allowedBuckets.has(body.bucket)) {
      return NextResponse.json({ error: 'Bucket nao permitido.' }, { status: 403, headers: corsHeaders })
    }

    const storage = getClient(req.headers.get('authorization')).storage.from(body.bucket)

    if (body.action === 'getPublicUrl') {
      return NextResponse.json(storage.getPublicUrl(body.path), { headers: corsHeaders })
    }

    if (body.action === 'upload') {
      if (!body.data) {
        return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400, headers: corsHeaders })
      }

      const file = Buffer.from(body.data, 'base64')
      const result = await storage.upload(body.path, file, body.options)
      return NextResponse.json(result, { headers: corsHeaders })
    }

    return NextResponse.json({ error: 'Acao nao permitida.' }, { status: 400, headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro no storage.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
