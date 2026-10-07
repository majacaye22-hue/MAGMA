import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Best-effort per-process guard; configure distributed limits at the edge before launch.
const attempts = new Map<string, { count: number; until: number }>()

export async function POST(req: NextRequest) {
  const now = Date.now()
  for (const [key, value] of attempts) if (value.until < now) attempts.delete(key)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const attempt = attempts.get(ip) ?? { count: 0, until: now + 15 * 60_000 }
  if (attempt.count >= 5) return NextResponse.json({ error: 'demasiados intentos; espera 15 minutos' }, { status: 429 })
  attempt.count++
  attempts.set(ip, attempt)
  let body: { email?: unknown; password?: unknown; username?: unknown; displayName?: unknown; location?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  }

  const { email, password, username, displayName, location } = body

  if (
    typeof email !== 'string' || !email ||
    typeof password !== 'string' || !password ||
    typeof username !== 'string' || !username
  ) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 || password.length < 8 || password.length > 128 || !/^[a-z0-9_]{3,30}$/.test(username.trim().toLowerCase())) {
    return NextResponse.json({ error: 'usa un email válido, contraseña de 8–128 caracteres y usuario de 3–30 letras, números o guiones bajos' }, { status: 400 })
  }

  // Never verify ownership or return a sign-in token before email confirmation.
  const { data: { user }, error: createErr } = await db.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: false,
  })

  if (createErr || !user) {
    return NextResponse.json({ error: createErr?.message ?? 'error al crear usuario' }, { status: 400 })
  }

  // Create profile row
  const { error: profileErr } = await db.from('profiles').insert({
    id: user.id,
    username: username.trim().toLowerCase(),
    display_name: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null,
    location: typeof location === 'string' && location.trim() ? location.trim() : null,
  })

  if (profileErr) {
    // Roll back the auth user so the signup can be retried cleanly
    await db.auth.admin.deleteUser(user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 400 })
  }

  const { error: deliveryError } = await db.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: `${req.nextUrl.origin}/auth/login` },
  })

  return NextResponse.json({
    ok: true,
    requires_confirmation: true,
    delivery_failed: Boolean(deliveryError),
  })
}
