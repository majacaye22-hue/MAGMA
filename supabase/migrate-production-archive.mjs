#!/usr/bin/env node
/**
 * Copy Magma's published archive into staging without changing production.
 *
 * Defaults to a read-only dry run. Apply only after reviewing the summary:
 *   node supabase/migrate-production-archive.mjs --apply
 *
 * The migration preserves post IDs and copies source storage objects used by
 * posts and profiles. It creates staging-only auth identities when necessary,
 * so production passwords and sessions are never copied.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const SKIP_MEDIA = process.argv.includes("--skip-media");
const PROFILE_COLUMNS = ["username", "display_name", "bio", "location", "disciplines", "avatar_url", "avatar_color", "is_moderator", "created_at"];
const POST_COLUMNS = [
  "id", "title", "body", "content", "type", "media_url", "media_type", "media_base64", "cover_url", "tags", "upvotes", "created_at",
  "event_date", "venue", "address", "is_free", "price", "open_collab", "collab_description",
];

function pick(record, columns) {
  return Object.fromEntries(columns.filter((column) => column in record).map((column) => [column, record[column]]));
}

function readEnv(filename) {
  const values = {};
  for (const line of readFileSync(filename, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, name, raw] = match;
    values[name] = raw.replace(/^['"]|['"]$/g, "");
  }
  return values;
}

function requireConfig(name, values) {
  const url = values.NEXT_PUBLIC_SUPABASE_URL;
  const key = values.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(`${name} is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.`);
  return { url, key };
}

async function getAllRows(client, table) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client.from(table).select("*").order("created_at", { ascending: true }).range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not read ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function getAllUsers(client) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not read auth users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

function storageReference(url, sourceOrigin) {
  if (!url || !url.startsWith(sourceOrigin)) return null;
  const match = new URL(url).pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  return match ? { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) } : null;
}

async function ensureBucket(target, knownBuckets, bucket) {
  if (knownBuckets.has(bucket)) return;
  const { error } = await target.storage.createBucket(bucket, { public: true });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Could not create storage bucket ${bucket}: ${error.message}`);
  }
  knownBuckets.add(bucket);
}

async function copyMediaUrl({ source, target, sourceOrigin, targetOrigin, knownBuckets, url, cache }) {
  if (!url || cache.has(url)) return cache.get(url) ?? url;
  const ref = storageReference(url, sourceOrigin);
  if (!ref) {
    cache.set(url, url);
    return url;
  }

  await ensureBucket(target, knownBuckets, ref.bucket);
  const { data, error } = await source.storage.from(ref.bucket).download(ref.path);
  if (error || !data) throw new Error(`Could not download ${ref.bucket}/${ref.path}: ${error?.message ?? "no data"}`);

  const { error: uploadError } = await target.storage.from(ref.bucket).upload(ref.path, data, {
    upsert: true,
    contentType: data.type || undefined,
  });
  if (uploadError) throw new Error(`Could not upload ${ref.bucket}/${ref.path}: ${uploadError.message}`);

  const targetUrl = target.storage.from(ref.bucket).getPublicUrl(ref.path).data.publicUrl;
  // Explicitly make the target URL depend on the configured target project.
  if (!targetUrl.startsWith(targetOrigin)) throw new Error("Target storage returned an unexpected public URL.");
  cache.set(url, targetUrl);
  return targetUrl;
}

const productionEnv = requireConfig(".env.production.local", readEnv(".env.production.local"));
const stagingEnv = requireConfig(".env.local", readEnv(".env.local"));
const source = createClient(productionEnv.url, productionEnv.key, { auth: { autoRefreshToken: false, persistSession: false } });
const target = createClient(stagingEnv.url, stagingEnv.key, { auth: { autoRefreshToken: false, persistSession: false } });
const sourceOrigin = new URL(productionEnv.url).origin;
const targetOrigin = new URL(stagingEnv.url).origin;

if (sourceOrigin === targetOrigin) throw new Error("Production and staging point to the same Supabase project. Refusing to run.");

console.log(`Archive migration: ${sourceOrigin.replace("https://", "")} → ${targetOrigin.replace("https://", "")}`);
console.log(APPLY ? "Mode: APPLY (staging will be changed)" : "Mode: DRY RUN (nothing will be changed)");

const [sourceProfiles, sourcePosts, sourceUsers, targetProfiles, targetUsers, targetBuckets] = await Promise.all([
  getAllRows(source, "profiles"),
  getAllRows(source, "posts"),
  getAllUsers(source),
  getAllRows(target, "profiles"),
  getAllUsers(target),
  target.storage.listBuckets(),
]);
if (targetBuckets.error) throw new Error(`Could not list staging storage buckets: ${targetBuckets.error.message}`);

const sourceUsersById = new Map(sourceUsers.map((user) => [user.id, user]));
const targetUsersByEmail = new Map(targetUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]));
const targetProfilesByUsername = new Map(targetProfiles.map((profile) => [profile.username.toLowerCase(), profile]));
const sourceProfileIds = new Set(sourceProfiles.map((profile) => profile.id));
const missingAuthors = sourcePosts.filter((post) => post.author_id && !sourceProfileIds.has(post.author_id));
if (missingAuthors.length) throw new Error(`${missingAuthors.length} posts refer to a missing production profile. Refusing to create orphaned posts.`);

console.log(`Found ${sourceProfiles.length} production profiles and ${sourcePosts.length} production posts.`);
console.log(`Staging currently has ${targetProfiles.length} profiles and ${targetUsers.length} auth users.`);
if (!APPLY) {
  console.log("Dry run complete. Review this summary, then run with --apply to copy the archive.");
  process.exit(0);
}

const profileIdMap = new Map();
const mediaCache = new Map();
const knownBuckets = new Set(targetBuckets.data.map((bucket) => bucket.id));

for (const profile of sourceProfiles) {
  const sourceUser = sourceUsersById.get(profile.id);
  const email = sourceUser?.email?.toLowerCase() ?? `archival-${profile.id}@migration.invalid`;
  const usernameConflict = targetProfilesByUsername.get(profile.username.toLowerCase());
  let targetUser = targetUsersByEmail.get(email);

  if (usernameConflict && !targetUser && usernameConflict.id !== profile.id) {
    throw new Error(`Staging username @${profile.username} belongs to a different account. Resolve this conflict before applying.`);
  }
  if (!targetUser) {
    const { data, error } = await target.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { imported_from_production: true },
    });
    if (error || !data.user) throw new Error(`Could not create staging identity for @${profile.username}: ${error?.message ?? "unknown error"}`);
    targetUser = data.user;
    targetUsersByEmail.set(email, targetUser);
  }

  const avatarUrl = SKIP_MEDIA ? profile.avatar_url : await copyMediaUrl({
    source, target, sourceOrigin, targetOrigin, knownBuckets, url: profile.avatar_url, cache: mediaCache,
  });
  const { error } = await target.from("profiles").upsert({ ...pick(profile, PROFILE_COLUMNS), id: targetUser.id, avatar_url: avatarUrl });
  if (error) throw new Error(`Could not copy profile @${profile.username}: ${error.message}`);
  profileIdMap.set(profile.id, targetUser.id);
}

for (const post of sourcePosts) {
  const mediaUrl = SKIP_MEDIA ? post.media_url : await copyMediaUrl({
    source, target, sourceOrigin, targetOrigin, knownBuckets, url: post.media_url, cache: mediaCache,
  });
  const coverUrl = SKIP_MEDIA ? post.cover_url : await copyMediaUrl({
    source, target, sourceOrigin, targetOrigin, knownBuckets, url: post.cover_url, cache: mediaCache,
  });
  const { error } = await target.from("posts").upsert({
    ...pick(post, POST_COLUMNS),
    author_id: post.author_id ? profileIdMap.get(post.author_id) : null,
    media_url: mediaUrl,
    cover_url: coverUrl,
  });
  if (error) throw new Error(`Could not copy post ${post.id}: ${error.message}`);
}

console.log(`Copied ${sourceProfiles.length} profiles, ${sourcePosts.length} posts, and ${mediaCache.size} storage-backed media URLs into staging.`);
