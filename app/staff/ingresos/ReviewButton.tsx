'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

export default function ReviewButton({ userId, reviewed }: { userId: string; reviewed: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function update() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { error } = await getSupabaseClient().rpc('review_member_onboarding', { p_user_id: userId, p_reviewed: !reviewed })
      if (error) throw error
      router.refresh()
    } catch { setError('No se pudo guardar la revisión. Inténtalo de nuevo.') }
    finally { setBusy(false) }
  }
  return <div><button type="button" disabled={busy} onClick={update} className="underline disabled:opacity-50">{busy ? 'guardando…' : reviewed ? 'marcar como no revisado' : 'marcar como revisado'}</button>{error && <p role="alert">{error}</p>}</div>
}
