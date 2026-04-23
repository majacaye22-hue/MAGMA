import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Uses the service role key so RLS doesn't block reading auth.users email.
export async function POST(request: NextRequest) {
  const { username } = await request.json()

  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'missing username' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Find the user ID from profiles (case-insensitive)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username.trim())
    .single()

  console.log('[lookup-username] profile lookup:', { username, profile, profileError })

  if (profileError || !profile) {
    return NextResponse.json({ error: 'usuario no encontrado' }, { status: 404 })
  }

  // Get email from auth.users using the service role client
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(
    (profile as { id: string }).id
  )

  console.log('[lookup-username] auth user lookup:', { user: user?.email, userError })

  if (userError || !user?.email) {
    return NextResponse.json({ error: 'usuario no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ email: user.email })
}
