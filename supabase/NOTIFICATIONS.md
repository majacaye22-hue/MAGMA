# In-app notifications

Post mentions: `post_mentions.sql` applied to magma-staging on 2026-10-02. Approved, visible posts notify matching accounts once per post; self-mentions and blocked pairs are excluded. Drafts never write posts. The bell links directly to the post. `test_post_mentions.sql` passed in a rolled-back staging transaction (delivery, duplicates, self exclusion, pending/hidden visibility, recipient isolation). Production migration remains pending.

Applied to magma-staging on 2026-09-22. Production is unchanged.

Apply `in_app_notifications.sql` once after the comments, messaging, blocking, and moderation tables exist. For a new database created from `schema.sql`, apply this migration afterward as well.

New comments notify the post author and previous visible commenters, excluding the actor and blocked pairs. Comments are flat: conversation notifications do not imply a direct threaded reply. Direct messages notify the other participant. No historical backfill, email, or push delivery.

The bell shows 30 recent entries and an exact unread count, polls every 30 seconds while visible, and refreshes on focus/open. Clicking marks the notification read before navigating. Mark-all applies to all accessible unread entries, not just the displayed 30. Merely opening a conversation separately does not clear bell notifications.

RLS restricts inbox reads to the recipient and checks blocking and target visibility. Only `read_at` can be updated by clients. Database triggers create entries; foreign-key cascades clean up deleted targets. No message/comment text is copied into notifications.

## Verification

`test_notifications.sql` passed on staging: comment and message delivery, no self-notifications, other-account isolation, recipient read updates, protected-column denial, and comment-deletion cleanup. Tests run in a rolled-back transaction; no test activity remains.

TypeScript and targeted component lint pass. Manual desktop/mobile layout and two-browser end-to-end navigation still need a live check: add a new comment from another account, open the bell, follow it, refresh, and confirm the unread count remains cleared. Also verify blocked users and hidden posts do not appear in the bell.
