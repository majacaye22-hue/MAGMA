import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { PostCard, type Post } from './card-art';

export async function CreditedWorks({ profileId, userId }: { profileId: string; userId: string }) {
  const supabase = await createClient();
  const { data: credits, error } = await supabase.from('collaborations').select('post_id')
    .eq('user_id', profileId).not('accepted_at', 'is', null).not('post_id', 'is', null);
  if (error) return <p role="alert">no se pudieron cargar las obras en colaboración.</p>;
  if (!credits?.length) return null;
  // Never expand a private post's audience through a public-facing profile.
  const { data, error: postsError } = await supabase.from('posts').select('*,profiles!posts_author_id_fkey(username,display_name)')
    .in('id', credits.map(credit => credit.post_id)).is('audience_colectivo_id', null).order('created_at', { ascending: false });
  if (postsError) return <p role="alert">no se pudieron cargar las obras en colaboración.</p>;
  if (!data?.length) return null;
  return <section className="mx-auto max-w-4xl space-y-4 px-6 pb-12" aria-label="obras en colaboración">
    <h2 className="text-xl">obras en colaboración</h2>
    <p className="text-sm">créditos aceptados · cada publicación conserva su autor original.</p>
    {(data as Post[]).map((post, index) => <article key={post.id} className="rounded border border-white/20 p-4">
      {post.profiles && <Link className="mb-3 inline-block text-sm underline" href={`/profile/${post.profiles.username}`}>publicado por @{post.profiles.username}</Link>}
      <PostCard post={post} index={index} total={data.length} currentUserId={userId} stream editorialSize="archive" fitMedia />
    </article>)}
  </section>;
}
