# Colectivo chats

Apply `colectivo_chat.sql` after `colectivo_approval.sql`. It does not require the invitation migration; approved memberships and future invitation-created memberships use the same membership trigger.

Applied to staging `jbzkdzcaqmxsmmyrlwif`. `test_colectivo_chat.sql` passed there with all fixtures rolled back. Production was not changed.

Chats appear automatically in `/mensajes`, under colectivos, with group names and previews. `/mensajes?colectivo=<uuid>` opens the thread. The colectivo page links there. Foreground polling every five seconds provides updates; this implementation does not require Realtime publication. It does not send push/email/bell notifications. Muting hides unread indicators, not the chat.

Security:
- Server-owned `chat_joined_at` records the latest membership. INSERT triggers ignore client-provided history/read/mute values. Existing authenticated UPDATE permissions cover `role` only.
- Message SELECT RLS requires a current membership and a message timestamp at/after its history boundary. The inbox RPC uses the same boundary, including previews/unread checks.
- Sends go through an authenticated RPC that locks the collective and current membership, assigns the sender/time on the server, and supports retry via a client-generated UUID.
- Deleting membership removes access; a replacement membership starts fresh. Already downloaded messages cannot be retroactively erased, but the UI clears its thread on the next membership refresh.
- Groups are shared spaces: direct-message blocking does not filter group messages. The UI states that all current members can participate.

Rollback tests cover pending/outsider denial, earlier-message and preview privacy, forbidden direct writes/history backdating, sends, deduplicated retry, unread/read/mute, removal and rejoin. TypeScript and targeted ESLint also pass. Browser account-level send/receive and mobile visual checks still need a signed-in session.
