# Event reflection photos

Apply `event_note_photos.sql` after `event_notes` exists. This adds `image_path`, owner-path validation, and a private `event-notes` bucket (JPEG/PNG/WebP, 8 MB). Do not use the public media bucket for these photos.

Notes remain private by default. Public means visible to authenticated Magma members. Profile → Agenda (and Todo) displays reflections under “lo que me llevo”. Photos pass through `/api/event-note-image`, using the caller's session and no-store headers, with both note and Storage RLS checks. Already downloaded images cannot be recalled.

Staging migration applied 2026-09-22; production migration not applied. Test with an owner and a second account: private text/photo visible only to owner; public visible to the second account; switching private denies subsequent photo requests; replacement/removal updates the note. Image replacement removes the old object after the new note is committed. A failed cleanup may leave a private orphan for later storage housekeeping.

UI requires a non-empty reflection with an optional photo. Upload failure retains the draft. A failed save attempts cleanup of its newly uploaded photo. Verify live uploads, privacy transitions, and mobile layout before launch.
