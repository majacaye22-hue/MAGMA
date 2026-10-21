import { notFound, redirect } from 'next/navigation';
import { QUESTIONS_ENABLED } from '@/lib/community-questions';
import { QuestionComposer } from '@/app/components/QuestionComposer';
import { createClient } from '@/lib/supabase-server';

export default async function AskPage() {
  if (!QUESTIONS_ENABLED) notFound();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/auth/login');
  return <main className="mx-auto max-w-2xl px-6 py-10"><QuestionComposer /></main>;
}
