// Milestone 1, Steps 1-3: lossless import -> export round-trip.
const { loadOutliner, makeChecker } = require('./harness');
const { win } = loadOutliner();
const check = makeChecker();

check('parseOPMLNode is defined', typeof win.parseOPMLNode === 'function');
check('nodeToOPML is defined',    typeof win.nodeToOPML === 'function');

// A realistic OPML doc: rss feed with all attrs, nested category, include, link,
// and an unknown custom attribute that must survive.
const sample = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Round-trip sample</title></head>
  <body>
    <outline text="News" myCustomAttr="keep-me">
      <outline text="Scripting News" type="rss" xmlUrl="http://scripting.com/rss.xml" htmlUrl="http://scripting.com/" description="Dave&#39;s blog &amp; more" language="en-us" title="Scripting News" version="RSS"/>
      <outline text="Daring Fireball" type="rss" xmlUrl="https://daringfireball.net/feeds/main"/>
    </outline>
    <outline text="A friend's list" type="include" url="http://example.com/list.opml"/>
    <outline text="Homepage" type="link" url="http://example.com/"/>
  </body>
</opml>`;

function collect(el, out) {
  if (el.tagName && el.tagName.toLowerCase() === 'outline') {
    const attrs = {};
    for (const a of el.attributes) if (a.name !== 'text') attrs[a.name] = a.value;
    out.push({ text: el.getAttribute('text') || '', attrs });
  }
  for (const c of el.children) collect(c, out);
  return out;
}

const xmlIn = new win.DOMParser().parseFromString(sample, 'text/xml');
check('sample parsed without XML error', !xmlIn.querySelector('parsererror'));

const bodyIn = xmlIn.querySelector('body');
const nodes = Array.from(bodyIn.children).map(win.parseOPMLNode);
const exported = nodes.map(n => win.nodeToOPML(n, 4)).join('\n');

const wrapped = `<opml version="2.0"><body>\n${exported}\n</body></opml>`;
const xmlOut = new win.DOMParser().parseFromString(wrapped, 'text/xml');
check('exported output re-parses without XML error', !xmlOut.querySelector('parsererror'));

const before = collect(bodyIn, []);
const after  = collect(xmlOut.querySelector('body'), []);
check('same node count after round-trip', before.length === after.length);

let allMatch = true;
for (let i = 0; i < before.length; i++) {
  const b = before[i], a = after[i] || { text: '(missing)', attrs: {} };
  if (b.text !== a.text) { allMatch = false; console.log(`    text mismatch @${i}: "${b.text}" -> "${a.text}"`); }
  const bk = Object.keys(b.attrs).sort(), ak = Object.keys(a.attrs).sort();
  if (bk.join(',') !== ak.join(',')) { allMatch = false; console.log(`    attr keys mismatch @${i}: [${bk}] -> [${ak}]`); }
  for (const k of bk) if (b.attrs[k] !== a.attrs[k]) { allMatch = false; console.log(`    value mismatch @${i} ${k}`); }
}
check('every node text + attribute preserved losslessly', allMatch);

const feed = after.find(n => n.text === 'Scripting News');
check('rss feed has type="rss"', feed && feed.attrs.type === 'rss');
check('rss feed has xmlUrl',     feed && feed.attrs.xmlUrl === 'http://scripting.com/rss.xml');
check('rss feed kept all 6 optional/req attrs', feed && ['type','xmlUrl','htmlUrl','description','language','title','version'].every(k => k in feed.attrs));
const inc = after.find(n => n.text === "A friend's list");
check('include node has type + url', inc && inc.attrs.type === 'include' && inc.attrs.url === 'http://example.com/list.opml');
const custom = after.find(n => n.text === 'News');
check('unknown custom attribute preserved', custom && custom.attrs.myCustomAttr === 'keep-me');
check('text emitted first in output', /^\s*<outline text="Scripting News" type="rss" xmlUrl=/.test(
  exported.split('\n').find(l => l.includes('Scripting News')) || ''));

check.done();
