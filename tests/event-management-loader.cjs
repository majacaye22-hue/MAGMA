const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
module.exports = function load(enabled = false) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/event-management.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, process: { env: { NEXT_PUBLIC_EVENT_MANAGEMENT_ENABLED: String(enabled) } } });
  return exports;
};
