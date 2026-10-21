const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
module.exports = function loadEventDetails(enabled = false) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/event-details.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, Date, Intl, URL, process: { env: { NEXT_PUBLIC_EVENT_DETAILS_ENABLED: String(enabled) } } });
  return exports;
};
