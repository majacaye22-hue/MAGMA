# Photo carousels

Apply `post_carousel.sql` to staging before testing publishing/editing photo posts.
This adds nullable `posts.image_urls` (ordered 1–3 URLs). The first URL must
match `media_url`, keeping existing previews compatible. Only `arte` and
`fotografía` may store galleries. Existing posts are unchanged; existing
post RLS/ownership and moderation continue to apply.

Applied to staging (`jbzkdzcaqmxsmmyrlwif`) on 2026-09-24. Verified
`image_urls` exists as an array column and requested the PostgREST schema reload.
Production has not been changed.

October 24: the application now accepts 10 images. Apply
`post_carousel_ten_images.sql` after the original migration to expand the database
constraint from 3 to 10. Applied to staging (`jbzkdzcaqmxsmmyrlwif`) on October 24,
2026; verified the saved constraint uses `cardinality(image_urls) <= 10` and
preserves the existing type, cover, and nonempty-URL checks. Production is unchanged.

Manual staging checks after applying the follow-up:
- Publish 1, 3, and 10 photos; confirm order after reload in feed and detail.
- Reorder/remove photos in the editor and save; check the cover changes too.
- Confirm 11 photos, unsupported formats, and files over 15 MB are rejected.
- Test touch swipe and compact white arrows, including first/last boundaries.
- Confirm clicking an arrow does not open the post; tapping the photo does.
- Confirm event posters, music, video, and old single-photo posts are unchanged.
- Check network: additional photos are requested only when navigated to.

HEIC/HEIF uploads are converted to JPEG (quality 0.9) by `/api/upload` before
storage; existing JPEG/PNG/GIF/WebP files remain unchanged. Input and converted
output are limited to 15 MB. Conversion uses the primary still image, not Live
Photo motion. A browser without HEIC preview support shows a conversion note.
Real HEIC conversion and malformed-input rejection were checked locally; an
actual iPhone end-to-end upload remains a manual check. General resizing and
client-side compression are not implemented. Conversion currently runs in the
request process; worker isolation/concurrency limits should precede heavy traffic.
If an upload batch fails, no post is inserted; already uploaded files may remain
in storage, as with the existing upload flow. No existing media is deleted.
