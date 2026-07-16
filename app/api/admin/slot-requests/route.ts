import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const OWNER_ID = 'd546124c-7d0a-4a2b-a668-0e6e491c439a'

const db = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  // Verify caller is the site owner via their session cookie.
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.id !== OWNER_ID) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { requestId?: unknown; action?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  }

  const { requestId, action } = body
  if (typeof requestId !== 'string' || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 })
  }

  // Fetch the request (service role bypasses RLS).
  const { data: slotReq, error: fetchErr } = await db
    .from('radio_slot_requests')
    .select('id, username, genre, user_id, status')
    .eq('id', requestId)
    .single()

  if (fetchErr || !slotReq) {
    return NextResponse.json({ error: 'request not found' }, { status: 404 })
  }

  const req_ = slotReq as {
    id: string
    username: string
    genre: string
    user_id: string | null
    status: string
  }

  if (req_.status !== 'pending') {
    return NextResponse.json({ error: 'already handled' }, { status: 409 })
  }

  if (action === 'approve') {
    const { error: djErr } = await db.from('djs').insert({
      user_id: req_.user_id ?? null,
      name: req_.username,
      genres: req_.genre,
      approved: true,
    })
    if (djErr) {
      return NextResponse.json({ error: djErr.message }, { status: 500 })
    }
  }

  const { data: updated, error: updateErr } = await db
    .from('radio_slot_requests')
    .update({ status: action === 'approve' ? 'approved' : 'rejected' })
    .eq('id', requestId)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ request: updated })
}
