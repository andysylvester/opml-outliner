// Shared test harness for the OPML outliner.
// Loads the real outliner.html in jsdom so tests exercise the actual app code
// (parse/export/inspector/commands), not a reimplementation.
//
// Note on internal state: the app declares `root`, `focusedId`, etc. with `let`
// at script scope, so they are NOT window properties. Tests set up and read that
// state via win.eval(...), which runs in the app's own global scope. Functions
// (declared with `function`) ARE reachable as win.<name>.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const OUTLINER_PATH = path.join(__dirname, '..', 'outliner.html');

// Load outliner.html into a fresh jsdom window.
//   opts.fetch      -> function used for window.fetch (default: rejects, i.e. offline)
//   opts.beforeParse -> extra window setup hook
function loadOutliner(opts = {}) {
  const html = fs.readFileSync(OUTLINER_PATH, 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    virtualConsole: vc,
    url: 'http://localhost/outliner.html',
    beforeParse(w) {
      w.fetch = opts.fetch || (() => Promise.reject(new Error('no network in tests')));
      w.URL.createObjectURL = () => 'blob:test';   // exportOPML uses this
      if (opts.beforeParse) opts.beforeParse(w);
    },
  });
  return { dom, win: dom.window, doc: dom.window.document, errors };
}

// Minimal assertion collector. check(name, cond) logs a tick/cross; check.done()
// prints the summary and exits non-zero on any failure (so the runner sees it).
function makeChecker() {
  const state = { pass: 0, fail: 0 };
  function check(name, cond) {
    if (cond) { state.pass++; console.log('  ✓ ' + name); }
    else { state.fail++; console.log('  ✗ ' + name); }
  }
  check.state = state;
  check.done = function () {
    console.log(`\n${state.fail === 0 ? 'PASS' : 'FAIL'}: ${state.pass} passed, ${state.fail} failed`);
    process.exit(state.fail === 0 ? 0 : 1);
  };
  return check;
}

// DOM event helpers bound to a given window.
function events(win) {
  const fire = (type, el) => el.dispatchEvent(new win.Event(type, { bubbles: true }));
  return {
    input:  el => fire('input', el),
    change: el => fire('change', el),
    click:  el => fire('click', el),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));

module.exports = { loadOutliner, makeChecker, events, tick, OUTLINER_PATH };
