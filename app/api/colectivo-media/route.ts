import { createClient } from '@/lib/supabase-server';
import { createClient as serviceClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' };
  const path = request.nextUrl.searchParams.get('path') ?? '';
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]+$/i.test(path)) return new Response(null, { status: 404, headers });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 401, headers });
  const { data: member, error } = await db.rpc('is_colectivo_member', { cid: path.split('/')[0] });
  if (error) return new Response(null, { status: 404, headers });
  if (member !== true) {
    const { data: profile } = await db.from('profiles').select('is_moderator').eq('id', user.id).single();
    if (profile?.is_moderator !== true) return new Response(null, { status: 404, headers });
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return new Response(null, { status: 503, headers });
  const admin = serviceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
  const { data, error: storageError } = await admin.storage.from('colectivo-media').download(path);
  if (storageError || !data) return new Response(null, { status: 404, headers });
  return new Response(data, { headers: { ...headers, 'Content-Type': data.type || 'application/octet-stream' } });
}
