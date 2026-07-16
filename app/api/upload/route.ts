import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const MAX_SIZE = 15 * 1024 * 1024 // 15 MB

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/mp4',
  'video/mp4', 'video/quicktime', 'video/webm',
])

const isDev = process.env.NODE_ENV !== 'production'

export async function POST(request: NextRequest) {
  // Auth check — must have a valid session cookie
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[api/upload] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'server misconfiguration: missing service key' }, { status: 500 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  )

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (err) {
    if (isDev) console.error('[api/upload] failed to parse formData:', err)
    return NextResponse.json({ error: 'failed to parse upload — file may be too large' }, { status: 413 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'no file' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'file too large — max 15 MB' }, { status: 413 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'file type not allowed' }, { status: 415 })
  }

  if (isDev) console.log('[api/upload]', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)} MB`)

  const fileExt = file.name.split('.').pop() ?? 'bin'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

  let buffer: Buffer
  try {
    const bytes = await file.arrayBuffer()
    buffer = Buffer.from(bytes)
  } catch (err) {
    if (isDev) console.error('[api/upload] failed to read file bytes:', err)
    return NextResponse.json({ error: 'failed to read file' }, { status: 500 })
  }

  const { error: storageError } = await supabase.storage
    .from('media')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (storageError) {
    console.error('[api/upload] storage error:', storageError)
    return NextResponse.json({ error: `storage error: ${storageError.message}` }, { status: 500 })
  }

  const { data } = supabase.storage.from('media').getPublicUrl(fileName)

  return NextResponse.json({ url: data.publicUrl })
}
