import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('[api/upload] request received')

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[api/upload] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'server misconfiguration: missing service key' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  )

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (err) {
    console.error('[api/upload] failed to parse formData:', err)
    return NextResponse.json({ error: 'failed to parse upload — file may be too large' }, { status: 413 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    console.error('[api/upload] no file in formData')
    return NextResponse.json({ error: 'no file' }, { status: 400 })
  }

  console.log('[api/upload] file received:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)} MB`)

  const fileExt = file.name.split('.').pop() ?? 'bin'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

  let buffer: Buffer
  try {
    const bytes = await file.arrayBuffer()
    buffer = Buffer.from(bytes)
  } catch (err) {
    console.error('[api/upload] failed to read file bytes:', err)
    return NextResponse.json({ error: 'failed to read file' }, { status: 500 })
  }

  console.log('[api/upload] uploading to storage bucket "media", path:', fileName)

  const { error: storageError } = await supabase.storage
    .from('media')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (storageError) {
    console.error('[api/upload] storage upload error:', storageError)
    return NextResponse.json({ error: `storage error: ${storageError.message}` }, { status: 500 })
  }

  console.log('[api/upload] storage upload succeeded')

  const { data } = supabase.storage.from('media').getPublicUrl(fileName)
  console.log('[api/upload] public url:', data.publicUrl)

  return NextResponse.json({ url: data.publicUrl })
}
