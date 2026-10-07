# Core journey verification — 2026-09-22

Implementation changes are not evidence of a successful live journey. Use a dedicated test account and an agreed non-production dataset. Do not delete existing user data.

## Configuration gates

- Confirm Supabase requires email confirmation and has working SMTP.
- Allowlist the actual login redirect URL for confirmation emails.
- Configure distributed/edge signup limits; the route's in-memory limit is only supplemental.
- Verify deployed RLS for comments, collections, collection_posts, event_attendances, post_projects and colectivo_posts using owner and non-owner accounts.

## Live acceptance tests (pending)

- Signup: valid account receives email, cannot sign in before confirmation, can sign in after confirmation. Resend delivery failures are visible. Existing accounts remain accessible.
- Save: add/remove a post in a collection; reload both post and collection; confirm persisted state. Deny a write and confirm no false success. Double-click must not create duplicate requests.
- Comments: create, immediately edit, immediately delete, then reload. Failed writes retain text/content and display an error. Non-owner cannot edit/delete.
- Publish: image, music, video, writing and event. Confirm author profile and individual page. Force project/colectivo attachment failure: existing post link remains available and publish cannot duplicate it.
- Profile: failed collections/projects/agenda reads show an error and retry works.
- Attendance: toggle, reload, verify agenda; failed initial read does not masquerade as not attending.
- Check keyboard and mobile layouts, menu positions, empty states and browser console on all above routes.

No live test data has been created by the implementation work.
