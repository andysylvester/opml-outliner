// Test runner: executes every *.test.js in this folder as its own process
// (so one suite's process.exit / jsdom globals can't affect another) and
// aggregates the results.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort();

if (!files.length) { console.error('No *.test.js files found in', dir); process.exit(1); }

let failed = 0;
const results = [];
for (const f of files) {
  console.log(`\n──────── ${f} ────────`);
  const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
  const ok = r.status === 0;
  if (!ok) failed++;
  results.push({ f, ok });
}

console.log('\n═══════ SUMMARY ═══════');
results.forEach(r => console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.f}`));
console.log(`\n${failed === 0 ? '✓ ALL SUITES PASSED' : '✗ ' + failed + ' SUITE(S) FAILED'} (${results.length} total)`);
process.exit(failed === 0 ? 0 : 1);
