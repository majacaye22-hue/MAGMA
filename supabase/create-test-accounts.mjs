// Staging only. No emails, elevated roles, or password changes to existing users.
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter(line => line.trim() && !line.trim().startsWith('#') && line.includes('='))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; }));
const expected = 'https://jbzkdzcaqmxsmmyrlwif.supabase.co';
if (env.NEXT_PUBLIC_SUPABASE_URL !== expected) throw new Error('Refusing: not the approved staging project.');
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const db = createClient(expected, env.SUPABASE_SERVICE_ROLE_KEY, options);
const accounts = [
  ['magma_prueba01', 'Prueba 01 · fotografía'],
  ['magma_prueba02', 'Prueba 02 · música'],
  ['magma_prueba03', 'Prueba 03 · letras'],
  ['magma_prueba04', 'Prueba 04 · arte'],
  ['magma_prueba05', 'Prueba 05 · proyectos'],
].map(([username, name]) => ({ username, name, email: `${username}@example.test` }));
const { data: owner, error: ownerError } = await db.from('profiles').select('id,username').eq('username', 'cctv').single();
if (ownerError || !owner) throw new Error('Could not resolve @cctv on staging.');
const { data: collisions, error: collisionError } = await db.from('profiles').select('username').in('username', accounts.map(a => a.username));
if (collisionError || collisions.length) throw new Error('Cannot proceed: username collision or preflight failure. No existing accounts changed.');
const { error: circleError } = await db.from('profile_circle').select('member_id').eq('owner_id', owner.id).limit(1);
if (circleError) throw new Error('Circle preflight failed.');
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ environment: 'staging', owner: owner.username, accounts: accounts.map(a => a.username), ready: true }));
  process.exit(0);
}
for (const account of accounts) {
  const password = `Mg!${randomBytes(15).toString('base64url')}7a`;
  const { data, error } = await db.auth.admin.createUser({ email: account.email, password, email_confirm: true,
    user_metadata: { test_account: true, purpose: 'Magma staging testing' } });
  if (error || !data.user) throw new Error(`Creation failed for ${account.username}: ${error?.message}`);
  // Print immediately so credentials remain recoverable if a later step fails.
  console.log(JSON.stringify({ type: 'account', username: account.username, email: account.email, password, id: data.user.id }));
  const { error: profileError } = await db.from('profiles').insert({ id: data.user.id, username: account.username,
    display_name: account.name, bio: 'Cuenta de prueba de Magma. No representa a una persona real.', location: 'Ciudad de México', is_moderator: false });
  if (profileError) throw new Error(`Profile failed for ${account.username}: ${profileError.message}`);
  const { error: addError } = await db.from('profile_circle').insert({ owner_id: owner.id, member_id: data.user.id });
  if (addError) throw new Error(`Circle addition failed for ${account.username}: ${addError.message}`);
  const client = createClient(expected, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
  const { data: session, error: loginError } = await client.auth.signInWithPassword({ email: account.email, password });
  if (loginError || session.user?.id !== data.user.id) throw new Error(`Login verification failed for ${account.username}`);
  await client.auth.signOut();
  const { data: member, error: verifyError } = await db.from('profile_circle').select('member_id').eq('owner_id', owner.id).eq('member_id', data.user.id).single();
  if (verifyError || !member) throw new Error(`Circle verification failed for ${account.username}`);
  console.log(JSON.stringify({ type: 'verified', username: account.username, login: true, in_cctv_circle: true }));
}
