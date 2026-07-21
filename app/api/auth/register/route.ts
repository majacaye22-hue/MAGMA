import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
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

  // Create auth user server-side — auto-confirmed, no email verification needed
  const { data: { user }, error: createErr } = await db.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
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

  // Generate a one-time sign-in token so the client doesn't need to call
  // signInWithPassword (which can fail if the email provider isn't fully configured)
  const { data: linkData } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: email.trim(),
  })

  return NextResponse.json({
    ok: true,
    token_hash: linkData?.properties?.hashed_token ?? null,
  })
}
