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
