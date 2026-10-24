# Confirmation email

In staging: Authentication → Emails → Templates → Confirm sign up.

- Subject: `confirma tu correo · magma`
- Body: paste the complete contents of `confirm-signup.html`. No hosted images or URL replacements are required.
- Preserve both `{{ .ConfirmationURL }}` variables exactly; do not replace them with the website URL.
- Save, then test with a fresh confirmation email. Previously sent emails do not change.

This template uses Magma red (`#E12120`), obsidian and white, matching `app/globals.css`. White button text and white underlined fallback links maintain readable contrast. Inline styles, tables, system fonts and live-text branding keep the message usable when images are blocked. It does not load tracking pixels or remote fonts. Branding alone does not guarantee inbox placement. Production installation is a separate step after staging testing.

The legacy PNG assets and `render-assets.cjs` are not used by this template.

On 2026-10-20, the same red/white palette was saved to the existing live-text confirmation template in **magma-staging** (`jbzkdzcaqmxsmmyrlwif`), preserving its copy, subject and both confirmation links. Resent signup confirmations use this template too. Production was not changed. Dashboard preview checked; the user subsequently confirmed the staging test passed. No push is authorized yet.

The login page verifies the access token returned by the current confirmation flow with Supabase Auth before showing confirmation, and removes the token fragment from the address bar. Ordinary login visits do not show a confirmation message. Expired/invalid links show recovery guidance instead.

## Password recovery staging checkpoint — October 22

The staging reset-password template was separately updated in the dashboard to Magma red (`#E12120`), white button text and white fallback links. Existing copy, subject and both `{{ .ConfirmationURL }}` variables were preserved. Saved state and preview were verified; production was unchanged. Previously delivered emails retain their original styling.

The hosted recovery failure was traced to URL Configuration: Site URL was `http://localhost:3001`, and the allowlist contained only `http://localhost:3000/**` and `http://localhost:3001/**`. The hosted staging reset destination was missing, causing fallback to localhost.

After explicit approval on October 22, staging Site URL was saved as `https://magma-git-codex-magma-preview-magma22.vercel.app/auth/login`. That exact login URL and `https://magma-git-codex-magma-preview-magma22.vercel.app/auth/reset-password` were added to the allowlist. Both localhost entries were preserved; the dashboard confirmed four saved URLs. Production was unchanged. A fresh-email end-to-end test and revocation of the exposed recovery session remain pending. Do not reuse exposed recovery tokens or record them in source files.
