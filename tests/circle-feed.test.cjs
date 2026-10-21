const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const helpers = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/circle-feed.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: helpers, URLSearchParams });

test("circle selection survives dates and pagination without changing the public feed", () => {
  for (const path of ["/", "/?pagina=2", "/?vista=hoy", "/?vista=archivo&fecha=2026-09-28"]) {
    assert.equal(helpers.feedHref(path, false), path);
    const url = new URL(helpers.feedHref(path, true), "https://example.test");
    assert.equal(url.searchParams.get("feed"), "circulo");
    for (const [key, value] of new URL(path, url.origin).searchParams) assert.equal(url.searchParams.get(key), value);
  }
});

test("circle feed uses both inner joins and the authenticated owner's id before pagination", () => {
  const calls = [];
  const q = {};
  for (const method of ["select", "neq", "eq", "is", "order"]) q[method] = (...args) => { calls.push([method, ...args]); return q; };
  const db = { from: table => { assert.equal(table, "posts"); return q; } };
  helpers.postsForFeed(db, "viewer-id");
  assert.match(calls[0][1], /profiles!posts_author_id_fkey!inner/);
  assert.match(calls[0][1], /profile_circle!profile_circle_member_id_fkey!inner/);
  assert.ok(calls.some(c => c[0] === "is" && c[1] === "audience_colectivo_id" && c[2] === null));
  assert.ok(calls.some(c => c[0] === "eq" && c[1] === "profiles.profile_circle.owner_id" && c[2] === "viewer-id"));
  assert.ok(calls.some(c => c[0] === "neq" && c[1] === "type" && c[2] === "evento"));
  assert.deepEqual(calls.filter(c => c[0] === "order").map(c => c[1]), ["created_at", "id"]);
  calls.length = 0;
  helpers.postsForFeed(db);
  assert.ok(!calls.some(c => c[0] === "eq"));
  assert.ok(!calls[0][1].includes("profile_circle"));
  assert.ok(calls.some(c => c[0] === "is" && c[1] === "audience_colectivo_id" && c[2] === null));
});
