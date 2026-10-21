# Community questions — local pilot

Not deployed or migrated remotely. Enable only after staging database/privacy acceptance.

## Workflow

`NEXT_PUBLIC_COMMUNITY_QUESTIONS_ENABLED=true` adds **pregunta** to the general “¿qué traes?” chooser and enables authenticated `/preguntar`. Project/colectivo-context uploads do not offer this public-question shortcut. It opens a dedicated text composer; leaving an unfinished upload asks for confirmation and closes its desktop dialog.

Questions are normal `posts` with `type='pregunta'`: they participate in Explorar pagination, date views, search, reporting and existing moderation. Replies are ordinary signed comments. Signed questions use the author's profile; anonymous ones have **NULL public author_id**, no profile link, and no owner identity in public post payloads. Anonymous questions do not appear in the author's profile or identity-based circle feed. They remain visible in unfiltered Explorar; format filters exclude them.

Question text: 1–280 characters; optional context: up to 2,000. Three publications per account per rolling 24 hours; account-scoped advisory locking serializes creation, including retries. A unique request token prevents duplicate publication after an uncertain response. Inputs/privacy lock after an attempt so retries cannot silently change the published identity mode. Deletion does not reset the quota. No draft persistence, media attachments, anonymity changes or editing in this pilot; own questions can be deleted with their replies. Anonymous authors receive reply notifications through the existing private notifications inbox.

## Privacy and moderation

- `question_owners` and `question_blocks` have RLS and no grants to ordinary API users, including read/joins. Narrow SECURITY DEFINER RPCs create, delete, check own ownership and block by post ID without returning another author's ID.
- Moderators can inspect ownership only through `question_author_for_moderation`, which writes `staff_activity`. Existing moderation report/hide/delete tooling applies; this identity RPC has no general-user UI. This is anonymity from other members, not from authorized moderation or the service operator.
- “ocultar preguntas de esta persona” hides that account's signed and anonymous questions without revealing the account. It is deliberately question-scoped, not a profile/chat block. `/preguntar` includes a reset for these hidden-question preferences; ordinary profile blocks remain unchanged. Existing bidirectional account blocks also filter questions.
- Replies are always signed, even when the question's author replies. The composer/detail explicitly warn about this. Posting self-identifying text can reveal identity; anonymity does not sanitize what a person chooses to write.
- Retain private request records after post deletion for retry protection and rate limiting. Account deletion removes its questions and private mapping. No ownership IDs are copied into post fields, media paths, tags, or responses.

## Rollout

1. Review/apply existing post moderation, owner-only moderation deletion, notifications, colectivo privacy and staff audit migrations first.
2. Apply `community_questions.sql` once to staging. Review function grants and private-table access there before enabling.
3. Enable the feature flag on the staging build and rebuild/restart. No env files have been changed by this implementation.
4. Test with author, unrelated reader and moderator: signed/anonymous publish, network retry, browser network payloads (including expanded joins), profile/circle exclusion, signed answers, notification privacy, reports, hide/restore, ownership audit, own deletion, quota after deletion, blocked accounts and reset.
5. Test “pregunta” navigation from both the desktop upload popup and mobile upload page; verify unsaved-work confirmation, modal closure, compact feed card and text detail.

## Local checks

`npm test`, `npx tsc --noEmit`, scoped ESLint.

`PGLITE_MODULE=/path/to/pglite/dist/index.js node tests/community-questions-db.mjs`

The SQL harness uses real baseline post/comment/report RLS and the moderation trigger; notification and staff tables are narrow fixtures. It verifies public payload anonymity, restricted mapping access, RPC ownership, signed replies, reports, private blocks, rate limits after deletion, retry deduplication, and audited moderation access. Hosted acceptance of the complete deployed migration stack remains required.
