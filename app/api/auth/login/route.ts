import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limiter: 10 attempts per IP per 15 minutes.
// Resets on server restart — fine for a small deployment.
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

// Same message for every auth failure — no username/email enumeration.
const AUTH_ERROR = 'email o contraseña incorrectos'

export async function POST(request: NextRequest) {
  if (!checkRateLimit(getIP(request))) {
    return NextResponse.json({ error: 'demasiados intentos, intenta más tarde' }, { status: 429 })
  }

  let body: { emailOrUsername?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  }

  const { emailOrUsername, password } = body
  if (typeof emailOrUsername !== 'string' || typeof password !== 'string' || !emailOrUsername || !password) {
    return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
  }

  let email = emailOrUsername.trim()

  // Resolve username → email entirely server-side; email is never sent to the client.
  if (!email.includes('@')) {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: profile } = await service
      .from('profiles')
      .select('id')
      .ilike('username', email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }

    const { data: { user } } = await service.auth.admin.getUserById(
      (profile as { id: string }).id
    )

    if (!user?.email) {
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    }

    email = user.email
  }

  // Sign in via the cookie-based client so the session cookie lands on the response.
  // We can't use lib/supabase-server.ts createClient() here because it binds cookies()
  // to the incoming request store; we need setAll to write to the outgoing response.
  const cookieStore = await cookies()
  const response = NextResponse.json({ ok: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
  }

  return response
}
