<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Product direction

Magma is CDMX-only by design for now — don't generalize the data model or
UI for multi-city until there's a real reason to (the long-term vision is
expansion to other cities, but building for that now is premature).

The end goal is a physical social club in CDMX, not just a website. The
CDMX geofence (middleware.ts + GeoBanner.tsx) is a soft warning only —
informational banner, no blocked actions. That's intentional: IP-based
geolocation is trivially spoofed by VPN, so it's not worth hardening into
an actual access gate.

The real gate, when it's built, will be presence-based: attendees at
curated live events get single-use codes, redeemed on the site to unlock
extra access (tiering unclear yet — could be a "verified member" flag, a
private colectivo, a gated feed). This stays additive, not mandatory, until
there's a solid base audience — making it required to post/participate
before that point creates a cold-start problem (can't get verified without
an event, can't justify an event without users).
