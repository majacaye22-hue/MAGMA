const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const helpers = {};
const media = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/event-media.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: media, require: () => ({}) });
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/event-preview.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: helpers, Intl, Date, require: name => name.endsWith('event-management') ? require('./event-management-loader.cjs')() : require('./event-details-loader.cjs')() });

test("event dates use CDMX at midnight boundaries and preview excludes large fields", () => {
  assert.equal(helpers.eventDay("2026-09-29T05:59:00Z"), "2026-09-28");
  assert.equal(helpers.eventDay("2026-09-29T06:00:00Z"), "2026-09-29");
  assert.ok(!/media_base64|content|profiles|\*/.test(helpers.EVENT_PREVIEW_COLUMNS));
  assert.ok(helpers.EVENT_PREVIEW_COLUMNS.split(",").includes("body")); // event text search
  for (const field of ["id", "event_date", "media_url", "media_type", "venue", "price"]) assert.ok(helpers.EVENT_PREVIEW_COLUMNS.split(",").includes(field));
});

test("event cards render immediately on the server with first-poster priority and lazy remaining images", () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/components/FlyerCard.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, Date, require(name) {
    if (name === "react/jsx-runtime") return require(name);
    if (name === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
    if (name === "./FeedImage") return { FeedImage: ({ mediaType, ...props }) => React.createElement("img", props) };
    if (name === "@/lib/event-preview") return helpers;
    if (name === "@/lib/event-media") return media;
    if (name === "@/lib/event-management") return require('./event-management-loader.cjs')();
    throw Error(name);
  } });
  const props = { post: { id: "event", title: "prueba", media_url: "/poster.jpg", event_date: "2026-09-29T18:00:00Z" }, now: Date.parse("2026-09-29T12:00:00Z") };
  const first = renderToStaticMarkup(React.createElement(exports.FlyerCard, { ...props, eager: true }));
  assert.match(first, /loading="eager"/);
  assert.match(first, /fetchPriority="high"/);
  assert.match(first, /aspect-ratio:3 \/ 4/);
  assert.match(first, /border-radius:0/);
  assert.doesNotMatch(first, /height:184px|border:1px solid #49463f|padding:10px/);
  assert.match(first, /ver evento/);
  assert.match(first, /flex h-full flex-col/);
  assert.match(first, /flex flex-1 flex-col/);
  assert.match(first, /mt-auto flex min-h-11/);
  assert.match(fs.readFileSync('app/eventos/EventosClient.tsx', 'utf8'), /grid-cols-1 items-stretch/);
  assert.match(first, /object-fit:cover/);
  assert.match(first, /object-position:center/);
  const rest = renderToStaticMarkup(React.createElement(exports.FlyerCard, props));
  assert.match(rest, /loading="lazy"/);
  assert.match(rest, /29 de septiembre/);
  const videoOnly = renderToStaticMarkup(React.createElement(exports.FlyerCard, { ...props, post: { ...props.post, media_url: '/event.mp4', media_type: 'video/mp4' } }));
  assert.match(videoOnly, /<video/);
  assert.doesNotMatch(videoOnly, /<img/);
  const withPoster = renderToStaticMarkup(React.createElement(exports.FlyerCard, { ...props, post: { ...props.post, media_url: '/event.mp4', media_type: 'video/mp4', cover_url: '/poster.jpg' } }));
  assert.match(withPoster, /src="\/poster.jpg"/);
});
