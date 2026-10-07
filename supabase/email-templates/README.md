# Confirmation email

In staging: Authentication → Emails → Templates → Confirm sign up.

- Subject: `confirma tu correo · magma`
- First host `public/email/magma-wordmark.png` and `public/email/confirm-heading.png` on a publicly accessible HTTPS host (no authentication). Replace the two placeholder image URLs in the HTML with their actual public URLs. Localhost will not work for email recipients. Do not install the image template before replacing the placeholders.
- Body: paste the complete contents of `confirm-signup.html` after replacing the image URLs.
- Preserve both `{{ .ConfirmationURL }}` variables exactly; do not replace them with the website URL.
- Save, then test with a fresh confirmation email. Previously sent emails do not change.

This template uses inline styles, tables, and system fonts for email compatibility. The wordmark and heading are 2x PNGs rendered from the website's installed Geist Pixel Square font. Alt text and a live-text confirmation button keep the message usable when images are blocked. It does not load tracking pixels or remote fonts. Branding alone does not guarantee inbox placement. Production installation is a separate step after staging testing.

Regenerate assets with `node supabase/email-templates/render-assets.cjs` in an environment with Playwright and Chrome installed. Alternatively set `PLAYWRIGHT_MODULE` to an absolute Playwright module path. The script uses a temporary headless browser, not an existing user browser session.

The login page verifies the access token returned by the current confirmation flow with Supabase Auth before showing confirmation, and removes the token fragment from the address bar. Ordinary login visits do not show a confirmation message. Expired/invalid links show recovery guidance instead.
