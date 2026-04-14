'use client'
import { createBrowserClient } from '@supabase/ssr'

// Singleton — one client instance for the entire app.
// Multiple instances fight over the auth token lock, causing
// "Lock was released because another request stole it" errors.
let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient(): ReturnType<typeof createBrowserClient> {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client!
}

// Convenience alias so existing code can migrate incrementally.
// Do not use in new code — call getSupabaseClient() directly.
export const supabase = getSupabaseClient()
