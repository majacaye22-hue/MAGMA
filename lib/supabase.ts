import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://avmztbdgyyrqccizmzsh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bXp0YmRneXlycWNjaXptenNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjcyNjQsImV4cCI6MjA5MTI0MzI2NH0.ELsHIm9fCTa1hGcW_GQdI_hhcwYu3VkwPTaxfilidl8'

declare global { var _supabaseClient: ReturnType<typeof createBrowserClient> | undefined }

export function getSupabaseClient() {
  if (!globalThis._supabaseClient) {
    globalThis._supabaseClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return globalThis._supabaseClient
}
