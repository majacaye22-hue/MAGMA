-- ============================================================
-- MAGMA — Staging Seed Data
-- Run AFTER schema.sql, in the Supabase SQL Editor.
-- Creates fake users, profiles, posts, and one colectivo.
-- NOTE: auth.users rows must be created via Supabase Auth API or
-- the dashboard — you cannot INSERT directly into auth.users here.
-- Steps:
--   1. Run schema.sql
--   2. Sign up 2–3 users via /auth/register in your staging site
--      (or Supabase dashboard → Authentication → Add user)
--   3. Paste their UUIDs below and run this file
-- ============================================================

-- Replace these UUIDs with real auth.users IDs from your staging project
-- (Authentication → Users in the Supabase dashboard)
DO $$
DECLARE
  u1 uuid := 'REPLACE-WITH-USER-1-UUID';
  u2 uuid := 'REPLACE-WITH-USER-2-UUID';
  u3 uuid := 'REPLACE-WITH-USER-3-UUID';
  post1 uuid;
  post2 uuid;
  post3 uuid;
  col_id uuid;
BEGIN

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Skip if profiles already exist (register page inserts them)
INSERT INTO profiles (id, username, display_name, bio, location, disciplines, avatar_color, is_moderator)
VALUES
  (u1, 'lunamar', 'Luna Mar', 'Artista visual basada en Tepito. Colores y contradicciones.', 'Tepito, CDMX', ARRAY['fotografía', 'arte'], '#5DCAA5', true),
  (u2, 'ferxyz', 'Fernando XYZ', 'Músico y productor. Mezclo ruido con silencio.', 'Roma Norte, CDMX', ARRAY['música'], '#D85A30', false),
  (u3, 'ana_bautista', 'Ana Bautista', 'Diseñadora y zinemaker independiente.', 'Coyoacán, CDMX', ARRAY['arte', 'escrito'], '#7F77DD', false)
ON CONFLICT (id) DO NOTHING;

-- ── Posts ────────────────────────────────────────────────────────────────────
INSERT INTO posts (id, author_id, title, body, type, tags, upvotes)
VALUES
  (gen_random_uuid(), u1, 'Sin título #7', 'Plata sobre gelatina. Tepito, 2025.', 'fotografía', ARRAY['analogico', 'cdmx'], 12),
  (gen_random_uuid(), u2, 'Ruido blanco en Iztapalapa', null, 'música', ARRAY['ambient', 'experimental'], 8),
  (gen_random_uuid(), u3, 'Zine de campo', 'Notas desde el mercado. Primera edición limitada.', 'escrito', ARRAY['zine', 'impreso'], 5)
RETURNING id INTO post1;

-- Grab the inserted post IDs
SELECT id INTO post1 FROM posts WHERE author_id = u1 LIMIT 1;
SELECT id INTO post2 FROM posts WHERE author_id = u2 LIMIT 1;
SELECT id INTO post3 FROM posts WHERE author_id = u3 LIMIT 1;

-- ── Colectivo ────────────────────────────────────────────────────────────────
INSERT INTO colectivos (id, name, slug, description, avatar_color, is_private, created_by)
VALUES (gen_random_uuid(), 'Frente Visual CDMX', 'frente-visual-cdmx', 'Colectivo de artistas visuales en la ciudad.', '#D85A30', false, u1)
RETURNING id INTO col_id;

SELECT id INTO col_id FROM colectivos WHERE slug = 'frente-visual-cdmx' LIMIT 1;

INSERT INTO colectivo_members (colectivo_id, user_id, role) VALUES
  (col_id, u1, 'admin'),
  (col_id, u2, 'member')
ON CONFLICT DO NOTHING;

INSERT INTO colectivo_posts (colectivo_id, post_id, added_by) VALUES
  (col_id, post1, u1)
ON CONFLICT DO NOTHING;

-- ── Radio settings ────────────────────────────────────────────────────────────
INSERT INTO radio_settings (is_live, stream_url)
SELECT false, null
WHERE NOT EXISTS (SELECT 1 FROM radio_settings);

END $$;
