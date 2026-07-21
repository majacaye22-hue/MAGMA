import { createBrowserClient } from '@supabase/ssr'

declare global { var _supabaseClient: ReturnType<typeof createBrowserClient> | undefined }

export function getSupabaseClient() {
  if (!globalThis._supabaseClient) {
    globalThis._supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return globalThis._supabaseClient
}
