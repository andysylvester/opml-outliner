// Milestone 1, Steps 1-3: round-trip a real opml.org subscription list example
// through the actual parse+export and assert nothing is lost.
const fs = require('fs');
const path = require('path');
const { loadOutliner, makeChecker } = require('./harness');
const { win } = loadOutliner();
const check = makeChecker();

const raw = fs.readFileSync(path.join(__dirname, 'fixtures', 'subscriptionList.opml'), 'utf8');
const xmlIn = new win.DOMParser().parseFromString(raw, 'text/xml');

function collect(el, out) {
  if (el.tagName && el.tagName.toLowerCase() === 'outline') {
    const attrs = {};
    for (const a of el.attributes) if (a.name !== 'text') attrs[a.name] = a.value;
    out.push({ text: el.getAttribute('text') || '', attrs });
  }
  for (const c of el.children) collect(c, out);
  return out;
}

const bodyIn = xmlIn.querySelector('body');
const nodes = Array.from(bodyIn.children).map(win.parseOPMLNode);
const exported = nodes.map(n => win.nodeToOPML(n, 4)).join('\n');
const xmlOut = new win.DOMParser().parseFromString(`<opml version="2.0"><body>\n${exported}\n</body></opml>`, 'text/xml');

const before = collect(bodyIn, []);
const after  = collect(xmlOut.querySelector('body'), []);

check('no XML parse error on real file', !xmlIn.querySelector('parsererror'));
check('exported output re-parses cleanly', !xmlOut.querySelector('parsererror'));
check(`node count preserved (${before.length})`, before.length === after.length);

let ok = true;
for (let i = 0; i < before.length; i++) {
  const b = before[i], a = after[i] || { text: '(missing)', attrs: {} };
  if (b.text !== a.text) { ok = false; console.log(`    text @${i}: "${b.text}" -> "${a.text}"`); }
  const bk = Object.keys(b.attrs).sort().join(','), ak = Object.keys(a.attrs).sort().join(',');
  if (bk !== ak) { ok = false; console.log(`    keys @${i}: [${bk}] -> [${ak}]`); }
  for (const k of Object.keys(b.attrs)) if (b.attrs[k] !== a.attrs[k]) { ok = false; console.log(`    val @${i} ${k}`); }
}
check('every real feed node preserved losslessly', ok);

const feedCount = after.filter(n => n.attrs.type === 'rss').length;
check(`found rss feed nodes (${feedCount})`, feedCount > 0);
check('all rss nodes have required xmlUrl', after.filter(n => n.attrs.type === 'rss').every(n => 'xmlUrl' in n.attrs));

check.done();
