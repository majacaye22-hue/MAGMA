import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isHeic } from '@/lib/photo-format'
import convert from 'heic-convert'
import { PROFILE_OFFERINGS_ENABLED } from '@/lib/profile-offerings'
import { portfolioPdfError } from '@/lib/portfolio-pdf'

export const runtime = 'nodejs'

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
    return NextResponse.json({ error: 'debes iniciar sesión para subir archivos.' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[api/upload] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'no pudimos preparar la carga. inténtalo más tarde.' }, { status: 500 })
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
    return NextResponse.json({ error: 'no pudimos leer el archivo. revisa que no supere los 15 MB.' }, { status: 413 })
  }

  const file = formData.get('file')
  const colectivoId = formData.get('colectivo_id')
  if (colectivoId) {
    if (typeof colectivoId !== 'string' || !/^[0-9a-f-]{36}$/i.test(colectivoId)) return NextResponse.json({ error: 'colectivo inválido' }, { status: 400 })
    const { data: member, error } = await authClient.rpc('is_colectivo_member', { cid: colectivoId })
    if (error || member !== true) return NextResponse.json({ error: 'necesitas ser miembro del colectivo' }, { status: 403 })
  }
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'elige un archivo para subir.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'el archivo no puede pesar más de 15 MB.' }, { status: 413 })
  }

  const heic = isHeic(file)
  const portfolioPdf = formData.get('purpose') === 'portfolio-pdf' && PROFILE_OFFERINGS_ENABLED && !colectivoId
  if (portfolioPdf && portfolioPdfError(file)) return NextResponse.json({ error: portfolioPdfError(file) }, { status: 415 })
  if (!portfolioPdf && !heic && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'este formato no es compatible.' }, { status: 415 })
  }

  if (isDev) console.log('[api/upload]', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)} MB`)

  const fileExt = portfolioPdf ? 'pdf' : heic ? 'jpg' : file.name.split('.').pop() ?? 'bin'
  const fileName = `${colectivoId ? `${colectivoId}/` : ''}${crypto.randomUUID()}.${fileExt.replace(/[^a-z0-9]/gi, '')}`

  let buffer: Buffer
  try {
    const bytes = await file.arrayBuffer()
    buffer = Buffer.from(bytes)
  } catch (err) {
    if (isDev) console.error('[api/upload] failed to read file bytes:', err)
    return NextResponse.json({ error: 'no pudimos leer el archivo. vuelve a intentarlo.' }, { status: 500 })
  }

  if (portfolioPdf && buffer.subarray(0, 5).toString('ascii') !== '%PDF-') return NextResponse.json({ error: 'el archivo no es un PDF válido.' }, { status: 415 })

  if (heic) {
    try {
      buffer = Buffer.from(await convert({ buffer, format: 'JPEG', quality: 0.9 }))
    } catch {
      return NextResponse.json({ error: 'no pudimos convertir esta foto. intenta exportarla como JPG y vuelve a subirla.' }, { status: 415 })
    }
    if (buffer.length > MAX_SIZE) return NextResponse.json({ error: 'la foto convertida supera los 15 MB. elige una versión más pequeña.' }, { status: 413 })
  }

  const { error: storageError } = await supabase.storage
    .from(colectivoId ? 'colectivo-media' : 'media')
    .upload(fileName, buffer, {
      contentType: heic ? 'image/jpeg' : file.type,
      upsert: false,
    })

  if (storageError) {
    console.error('[api/upload] storage error:', storageError)
    return NextResponse.json({ error: 'no pudimos guardar el archivo. vuelve a intentarlo.' }, { status: 500 })
  }

  if (colectivoId) return NextResponse.json({ url: `/api/colectivo-media?path=${encodeURIComponent(fileName)}` })
  const { data } = supabase.storage.from('media').getPublicUrl(fileName)

  return NextResponse.json({ url: data.publicUrl })
}
