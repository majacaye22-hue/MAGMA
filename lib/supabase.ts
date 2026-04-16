import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://avmztbdgyyrqccizmzsh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bXp0YmRneXlycWNjaXptenNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjcyNjQsImV4cCI6MjA5MTI0MzI2NH0.ELsHIm9fCTa1hGcW_GQdI_hhcwYu3VkwPTaxfilidl8'

declare global { var _supabaseClient: ReturnType<typeof createClient> | undefined }

// Simple mutex: queues concurrent auth operations instead of running them in
// parallel (which causes refresh-token rotation conflicts) or deadlocking
// (which happened with navigator.locks under Turbopack hot-reload).
function makeLock() {
  let queue = Promise.resolve();
  return (_name: string, _timeout: number, fn: () => Promise<unknown>) => {
    const next = queue.then(() => fn());
    queue = next.then(() => {}, () => {});
    return next;
  };
}

export function getSupabaseClient() {
  if (!globalThis._supabaseClient) {
    globalThis._supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: makeLock(),
      },
    })
  }
  return globalThis._supabaseClient
}
