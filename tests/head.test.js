// Every <head> element survives import -> export and save -> reload, including
// ones the app doesn't manage (ownerId, docs, custom/namespaced, comments).
const { loadOutliner, makeChecker } = require('./harness');
const { win } = loadOutliner();
const check = makeChecker();

check('readExtraHead is defined', typeof win.readExtraHead === 'function');
check('buildOPML is defined',     typeof win.buildOPML === 'function');

const sample = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0" xmlns:my="http://example.com/ns">
  <head>
    <title>Head sample</title>
    <dateCreated>Mon, 01 Jun 2026 12:00:00 GMT</dateCreated>
    <ownerName>Andy</ownerName>
    <ownerId>http://example.com/andy</ownerId>
    <docs>http://opml.org/spec2.opml</docs>
    <windowTop>61</windowTop>
    <!-- keep this comment -->
    <my:custom flag="yes">Tom &amp; Jerry <b>nested</b></my:custom>
    <expansionState>1</expansionState>
  </head>
  <body>
    <outline text="One"><outline text="Child"/></outline>
  </body>
</opml>`;

function headOf(text) {
  const xml = new win.DOMParser().parseFromString(text, 'text/xml');
  return { xml, head: xml.querySelector('head') };
}

const file = new win.File([sample], 'head.opml', { type: 'text/xml' });
win.handleOPMLFile({ target: { files: [file], value: '' } });

setTimeout(() => {
  const extra = win.eval('meta.extraHead');
  check('import captured 5 unmanaged head items', Array.isArray(extra) && extra.length === 5);
  check('managed fields not duplicated into extraHead', !extra.some(s => /<(title|ownerName|dateCreated|expansionState)\b/.test(s)));

  const out = win.buildOPML('Head sample');
  const { xml, head } = headOf(out);
  check('exported OPML parses without XML error', !xml.querySelector('parsererror'));

  const text = tag => { const el = head.querySelector(tag); return el ? el.textContent : null; };
  check('title exported',       text('title') === 'Head sample');
  check('ownerName exported',   text('ownerName') === 'Andy');
  check('ownerId preserved',    text('ownerId') === 'http://example.com/andy');
  check('docs preserved',       text('docs') === 'http://opml.org/spec2.opml');
  check('windowTop preserved',  text('windowTop') === '61');
  check('comment preserved',    Array.from(head.childNodes).some(n => n.nodeType === 8 && n.data.trim() === 'keep this comment'));

  const custom = head.getElementsByTagNameNS('http://example.com/ns', 'custom')[0];
  check('namespaced element preserved',   !!custom);
  check('its attribute preserved',        custom && custom.getAttribute('flag') === 'yes');
  check('its escaped text + child kept',  custom && custom.textContent === 'Tom & Jerry nested' && custom.querySelector('b'));

  const count = tag => head.getElementsByTagName(tag).length;
  check('no duplicate title/expansionState', count('title') === 1 && count('expansionState') === 1);

  // Persist to localStorage and reload into a cleared meta.
  win.saveState();
  win.eval('meta.extraHead = []');
  check('loadState succeeds', !!win.loadState());
  check('extraHead restored from localStorage', win.eval('meta.extraHead.length') === 5);
  check('reloaded export still has ownerId', headOf(win.buildOPML('x')).head.querySelector('ownerId') !== null);

  check.done();
}, 50);
