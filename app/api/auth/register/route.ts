import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { COMMUNITY_AGREEMENTS, ONBOARDING_PRIVACY, ONBOARDING_QUESTIONS, ONBOARDING_VERSION, validateOnboarding } from '@/lib/onboarding'

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
  let body: { email?: unknown; password?: unknown; username?: unknown; displayName?: unknown; location?: unknown; onboarding?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'solicitud inválida' }, { status: 400 })
  const { email, password, username, displayName, location } = body
  const onboarding = validateOnboarding(body.onboarding)
  if (!onboarding) return NextResponse.json({ error: 'responde las dos preguntas (máximo 1500 caracteres cada una) y acepta los acuerdos actuales antes de unirte' }, { status: 400 })

  // Fail before creating an Auth account if the private storage migration is missing.
  const { error: storageError } = await db.from('member_onboarding').select('user_id').limit(0)
  if (storageError) return NextResponse.json({ error: 'el registro no está disponible por ahora; inténtalo más tarde' }, { status: 503 })

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
    // Only the server can set app_metadata; clients cannot forge this marker.
    app_metadata: { magma_onboarding_version: ONBOARDING_VERSION },
  })

  if (createErr || !user) {
    return NextResponse.json({ error: createErr?.message ?? 'error al crear usuario' }, { status: 400 })
  }

  // The profile and answers commit atomically, before confirmation delivery.
  const { error: profileErr } = await db.rpc('register_member_profile', {
    p_id: user.id,
    p_username: username.trim().toLowerCase(),
    p_display_name: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null,
    p_location: typeof location === 'string' && location.trim() ? location.trim() : null,
    p_motivation: onboarding.motivation,
    p_contribution: onboarding.contribution,
    p_version: ONBOARDING_VERSION,
    p_snapshot: { questions: ONBOARDING_QUESTIONS, agreements: COMMUNITY_AGREEMENTS, privacy: ONBOARDING_PRIVACY },
  })

  if (profileErr) {
    // Roll back the auth user so the signup can be retried cleanly
    const { error: cleanupError } = await db.auth.admin.deleteUser(user.id)
    return NextResponse.json({ error: cleanupError ? 'no se pudo completar el registro; contacta a Magma antes de reintentar' : 'no se pudo guardar el registro; intenta con otro nombre de usuario o reintenta más tarde' }, { status: 400 })
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
