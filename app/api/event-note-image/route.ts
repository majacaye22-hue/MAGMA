import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 401, headers });
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 400, headers });
  const { data: note, error } = await db.from('event_notes').select('image_path,user_id,is_public').eq('id', id).maybeSingle();
  if (error || !note?.image_path || (note.user_id !== user.id && !note.is_public)) return new Response(null, { status: 404, headers });
  const { data, error: downloadError } = await db.storage.from('event-notes').download(note.image_path);
  if (downloadError || !data) return new Response(null, { status: 404, headers });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(data.type)) return new Response(null, { status: 415, headers });
  return new Response(data, { headers: { ...headers, 'Content-Type': data.type } });
}
