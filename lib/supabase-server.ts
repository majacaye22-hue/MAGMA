import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-only client — import this only in server components and Route Handlers.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://avmztbdgyyrqccizmzsh.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bXp0YmRneXlycWNjaXptenNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjcyNjQsImV4cCI6MjA5MTI0MzI2NH0.ELsHIm9fCTa1hGcW_GQdI_hhcwYu3VkwPTaxfilidl8',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
